import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { CryptoService } from '../common/crypto.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUserResponseDto,
  ChangePasswordDto,
  JwtAuthResponseDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { CreateAppSettingsCommand } from 'src/app-settings/commands';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppSettingsService))
    private readonly appSettingsService: AppSettingsService,
    private readonly mailService: MailService,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await argon2.verify(user.hash, pass))) {
      const { hash, ...result } = user;
      this.logger.log(`User authentication successful for email: ${email}`);
      return result;
    }
    this.logger.warn(`Failed authentication attempt for email: ${email}`);
    return null;
  }

  async register(userData: RegisterDto): Promise<AuthUserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: userData.email }],
      },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration attempt with existing email: ${userData.email}`,
      );
      throw new ForbiddenException('User with this email already exists');
    }

    this.logger.log(`Registering new user with email: ${userData.email}`);

    const hash = await argon2.hash(userData.password);
    const createdUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        hash,
        isVerified: false,
      },
    });

    // Create default app settings for the user with CreateAppSettingsCommand
    const createCommand = new CreateAppSettingsCommand();
    createCommand.userId = createdUser.id;
    await this.appSettingsService.create(createCommand);

    this.logger.log(`User registered successfully: ${createdUser.id}`);

    await this.requestEmailVerification(userData.email); // Send verification email

    // Return standardized user response
    const userResponse: AuthUserResponseDto = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      isVerified: createdUser.isVerified,
      isActive: createdUser.isActive,
    };

    return userResponse;
  }

  async requestEmailVerification(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        this.logger.warn(
          `Email verification failed - user not found: ${email}`,
        );
        throw new UnauthorizedException('User not found');
      }

      if (user.isVerified) {
        this.logger.warn(`Email already verified for user: ${email}`);
        throw new ForbiddenException('Email already verified');
      }

      // Generate a verification token
      const otp = await this.generateOtp(user.email);
      this.logger.log(`Generated otp for user: ${email}`);

      // Send verification email
      await this.mailService.sendOTP(email, otp);
      this.logger.log(`Verification email sent to: ${email}`);

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error; // Re-throw these specific exceptions
      }
      this.logger.error(
        `Failed to process email verification request: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to process email verification request',
      );
    }
  }

  async verifyEmailOtp(otp: string): Promise<JwtAuthResponseDto> {
    const verificationKey = `email_verification:${otp}`;
    const userId = await this.redisClient.get(verificationKey);

    if (!userId) {
      this.logger.warn(`Invalid or expired otp: ${otp}`);
      throw new UnauthorizedException('Invalid or expired otp');
    }

    try {
      // Mark user as verified
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
        },
      });

      // Delete the token from Redis
      await this.redisClient.del(verificationKey);

      this.logger.log(`Email verified successfully for user ID: ${userId}`);

      // Return user information with tokens
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };

      const accessToken = await this.generateAccessToken(payload);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  // Updated login method to use JWT with refresh tokens only
  async login(user: any): Promise<any> {
    this.logger.log(`User login: ${user.email} (${user.id})`);

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT payload for access token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };

    // Generate access token with short expiry
    const accessToken = await this.generateAccessToken(payload);

    // Generate refresh token with long expiry
    const refreshToken = await this.generateRefreshToken(user.id);

    // Return both tokens along with user data
    const userResponse: AuthUserResponseDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };

    return {
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  async logout(refreshToken?: string, userId?: string) {
    // Keep track of the user ID for complete invalidation
    let userIdFromToken: string | null = userId || null;

    // If refresh token is provided, extract user ID and JTI to invalidate specific token
    if (refreshToken) {
      try {
        // Extract userId and jti from the token directly
        const decoded = this.jwtService.decode(refreshToken) as {
          sub: string;
          jti?: string;
        };
        if (decoded?.sub) {
          userIdFromToken = decoded.sub;
          this.logger.log(
            `Extracted userId from refresh token: ${userIdFromToken}`,
          );

          // If we have a JTI, invalidate this specific refresh token
          if (decoded.jti) {
            const jtiKey = `refresh_jti:${userIdFromToken}:${decoded.jti}`;
            await this.redisClient.del(jtiKey);
            this.logger.log(
              `Specific refresh token invalidated for user ${userIdFromToken} with JTI ${decoded.jti}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing refresh token during logout: ${error.message}`,
        );
        // Continue with logout process even if token decoding fails
      }
    }

    // If we have the user ID, invalidate all tokens for this user
    if (userIdFromToken) {
      try {
        // Invalidate all access token JTIs for this user
        const jwtJtiKeys = await this.redisClient.keys(
          `jwt_jti:${userIdFromToken}:*`,
        );
        if (jwtJtiKeys && jwtJtiKeys.length > 0) {
          await this.redisClient.del(jwtJtiKeys);
          this.logger.log(
            `All access token JTIs (${jwtJtiKeys.length}) invalidated for user ${userIdFromToken}`,
          );
        }

        // Invalidate all refresh token JTIs for this user
        const refreshJtiKeys = await this.redisClient.keys(
          `refresh_jti:${userIdFromToken}:*`,
        );
        if (refreshJtiKeys && refreshJtiKeys.length > 0) {
          await this.redisClient.del(refreshJtiKeys);
          this.logger.log(
            `All refresh token JTIs (${refreshJtiKeys.length}) invalidated for user ${userIdFromToken}`,
          );
        }
      } catch (redisError) {
        this.logger.error(
          `Error invalidating tokens in Redis: ${redisError.message}`,
        );
      }
    } else {
      this.logger.warn(
        'Could not determine user ID for complete token invalidation',
      );
    }

    this.logger.log(
      `User logout completed${userIdFromToken ? ` for user: ${userIdFromToken}` : ''}`,
    );
    return { message: 'Logged out successfully' };
  }

  // Get user data by JWT token
  async getUserByToken(token: string): Promise<AuthUserResponseDto | null> {
    try {
      // Decode the token to get the userId
      const decoded = this.jwtService.decode(token) as { sub: string };
      if (!decoded || !decoded.sub) {
        return null;
      }

      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isVerified: user.isVerified,
      };
    } catch (error) {
      this.logger.error(`Error getting user by token: ${error.message}`);
      return null;
    }
  }

  // Validate refresh token and issue a new access token
  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      // Verify the refresh token directly
      const decoded = this.jwtService.verify(refreshToken) as {
        sub: string;
        type: string;
        jti?: string;
      };

      // Check if token is of type 'refresh' and has a JTI
      if (
        !decoded ||
        !decoded.sub ||
        decoded.type !== 'refresh' ||
        !decoded.jti
      ) {
        throw new UnauthorizedException(
          'Invalid refresh token format. Only refresh tokens are accepted.',
        );
      }

      const userId = decoded.sub;
      const jti = decoded.jti;

      // Check if the JTI exists in Redis
      const tokenKey = `refresh_jti:${userId}:${jti}`;
      const tokenData = await this.redisClient.get(tokenKey);

      if (!tokenData) {
        throw new UnauthorizedException('Refresh token not found or expired');
      }

      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate a new access token
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };
      const newAccessToken = await this.generateAccessToken(payload);

      // Delete the old refresh token JTI from Redis
      await this.redisClient.del(tokenKey);

      // Generate a new refresh token
      const newRefreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error refreshing access token: ${error.message}`);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.error(`Password change failed - invalid user: ${userId}`);
      throw new UnauthorizedException('Invalid user');
    }

    const passwordMatch = await argon2.verify(
      user.hash,
      changePasswordDto.currentPassword,
    );
    if (!passwordMatch) {
      this.logger.warn(
        `Password change failed - incorrect current password for user: ${userId}`,
      );
      throw new UnauthorizedException('Old password is incorrect');
    }

    this.logger.log(`Password changed successfully for user: ${userId}`);
    const newHash = await argon2.hash(changePasswordDto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hash: newHash },
    });
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Don't reveal if the email exists for security reasons
        return true;
      }

      // Use your CryptoService to generate the token
      const resetToken = await this.cryptoService.generateRandomToken();

      // Store token in Redis with 10 minute expiration (600 seconds)
      const resetKey = `password_reset:${resetToken}`;

      await this.redisClient.set(resetKey, user.id, { EX: 600 });

      // Send email with reset link
      await this.mailService.sendResetPasswordToken(email, resetToken);

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to process password reset request',
        error.stack,
      );
      return false;
    }
  }

  async validateResetToken(token: string): Promise<boolean> {
    try {
      const resetKey = `password_reset:${token}`;
      const userId = await this.redisClient.get(resetKey);

      return !!userId;
    } catch (error) {
      this.logger.error('Failed to validate reset token', error.stack);
      return false;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<boolean> {
    try {
      const resetKey = `password_reset:${dto.token}`;
      const userId = await this.redisClient.get(resetKey);

      if (!userId) {
        return false; // Token invalid or expired
      }

      // Hash the new password
      const hash = await argon2.hash(dto.password);

      // Update the user's password
      await this.prisma.user.update({
        where: { id: userId },
        data: { hash },
      });

      // Delete the used token
      await this.redisClient.del(resetKey);

      return true;
    } catch (error) {
      this.logger.error('Failed to reset password', error.stack);
      return false;
    }
  }

  async generateOtp(email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        this.logger.warn(`OTP generation failed - user not found: ${email}`);
        throw new UnauthorizedException('User not found');
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 10 minute expiration
      const otpKey = `email_verification:${otp}`;
      await this.redisClient.set(otpKey, user.id, { EX: 600 });

      // Send OTP via email
      await this.mailService.sendOTP(email, otp);

      return otp;
    } catch (error) {
      this.logger.error('Failed to generate OTP', error.stack);
      throw new InternalServerErrorException('Error generating OTP');
    }
  }

  async verifyOtp(otp: string): Promise<boolean> {
    try {
      const otpKey = `email_verification:${otp}`;
      const storedUserId = await this.redisClient.get(otpKey);

      if (!storedUserId || storedUserId !== otp) {
        return false;
      }

      // Delete the used OTP
      await this.redisClient.del(otpKey);

      return true;
    } catch (error) {
      this.logger.error('Failed to verify OTP', error.stack);
      return false;
    }
  }

  // Method to generate an access token with short expiry
  async generateAccessToken(payload: any): Promise<string> {
    const accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
    );
    if (!accessTokenExpiry) {
      throw new Error(
        'JWT_ACCESS_EXPIRATION environment variable is not defined',
      );
    }

    // Generate a unique JTI (JWT ID) for this token
    const jti = await this.cryptoService.generateRandomToken(24);

    // Add token type and JTI to payload for extra security
    const tokenPayload = {
      ...payload,
      type: 'access', // Explicitly mark as access token
      jti, // Add the JWT ID claim
    };

    const token = this.jwtService.sign(tokenPayload, {
      expiresIn: accessTokenExpiry,
    });

    // Store only the JTI in Redis for validation and revocation
    const expiryInSeconds = this.parseExpiryToSeconds(accessTokenExpiry);
    const userId = payload.sub;

    // Store JTI in Redis with the calculated expiry
    const tokenKey = `jwt_jti:${userId}:${jti}`;
    await this.redisClient
      .set(
        tokenKey,
        JSON.stringify({
          userId,
          createdAt: new Date().toISOString(),
        }),
        { EX: expiryInSeconds },
      )
      .catch((error: { message: string }) => {
        this.logger.error(
          `Error storing access token JTI in Redis: ${error.message}`,
        );
      });

    return token;
  }

  // Method to generate a refresh token with long expiry
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
    );
    if (!refreshTokenExpiry) {
      throw new Error(
        'JWT_REFRESH_EXPIRATION environment variable is not defined',
      );
    }

    // Generate a unique JTI for this token
    const jti = await this.cryptoService.generateRandomToken(24);

    // Generate a refresh token with minimal payload - user ID, token type and JTI
    const payload = {
      sub: userId,
      type: 'refresh', // Explicitly mark as refresh token
      jti, // Include the JWT ID
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpiry,
    });

    const expiryInSeconds = this.parseExpiryToSeconds(refreshTokenExpiry);

    // Store just the JTI in Redis for validation purposes
    const tokenKey = `refresh_jti:${userId}:${jti}`;
    await this.redisClient.set(
      tokenKey,
      JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
      }),
      { EX: expiryInSeconds },
    );

    // Return the token directly without encryption
    return token;
  }

  // Helper method to parse JWT expiry string to seconds
  private parseExpiryToSeconds(expiry: string): number {
    const defaultExpiry = 15 * 60; // Default 15 minutes in seconds

    if (!expiry) return defaultExpiry;

    try {
      // Parse formats like '15m', '2h', '1d'
      const unit = expiry.slice(-1);
      const value = parseInt(expiry.slice(0, -1), 10);

      if (isNaN(value)) return defaultExpiry;

      switch (unit) {
        case 's':
          return value;
        case 'm':
          return value * 60;
        case 'h':
          return value * 60 * 60;
        case 'd':
          return value * 24 * 60 * 60;
        default:
          return defaultExpiry;
      }
    } catch (error) {
      this.logger.error(`Error parsing token expiry: ${error.message}`);
      return defaultExpiry;
    }
  }
}
