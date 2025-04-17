import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  forwardRef,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import {
  RegisterDto,
  AuthUserResponseDto,
  ChangePasswordDto,
  ResetPasswordDto,
} from './dto';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { MailService } from '../mail/mail.service';
import { CryptoService } from '../common/crypto.service';
import { JwtService } from '@nestjs/jwt';

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

  // Get raw session data from Redis
  async getSessionData(sessionId: string) {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  }

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

    // Create default app settings for the user
    await this.appSettingsService.create(createdUser.id);

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

  async verifyEmailOtp(
    otp: string,
    sessionId: string,
  ): Promise<AuthUserResponseDto> {
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

      // Log the user in
      return await this.login(user, sessionId);
    } catch (error) {
      this.logger.error(
        `Failed to verify email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  // Updated login method to use JWT with refresh tokens
  async login(user: any, sessionId: string): Promise<any> {
    this.logger.log(`User login: ${user.email} (${user.id})`);

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionExpiry = this.configService.get<number>(
      'SESSION_EXPIRY_SECONDS',
      60 * 60 * 24 * 3,
    );

    // Create JWT payload for access token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isVerified: user.isVerified,
    };

    // Generate access token with short expiry
    const accessToken = this.generateAccessToken(payload);

    // Generate refresh token with long expiry
    const refreshToken = await this.generateRefreshToken(user.id);

    // For backward compatibility, still store session data
    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
      }),
      { EX: sessionExpiry },
    );

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
      sessionId, // For backward compatibility
    };
  }

  async logout(sessionId: string, refreshToken?: string, userId?: string) {
    // If refresh token is provided, invalidate it
    if (refreshToken && userId) {
      try {
        // First decrypt the refresh token
        const unencryptedToken = await this.cryptoService.decrypt(refreshToken);

        // Then invalidate the unencrypted token in Redis
        await this.redisClient.del(
          `refresh_token:${userId}:${unencryptedToken}`,
        );
        this.logger.log(`Refresh token invalidated for user ${userId}`);

        // Optionally, invalidate all refresh tokens for this user
        const refreshTokenKeys = await this.redisClient.keys(
          `refresh_token:${userId}:*`,
        );
        if (refreshTokenKeys && refreshTokenKeys.length > 0) {
          await this.redisClient.del(refreshTokenKeys);
          this.logger.log(`All refresh tokens invalidated for user ${userId}`);
        }
      } catch (error) {
        this.logger.error(
          `Error decrypting refresh token during logout: ${error.message}`,
        );
        // Continue with logout process even if token decryption fails
      }
    }

    // Get the session data to find userId
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);

      // Get all JWT access tokens for this user
      const jwtKeys = await this.redisClient.keys(
        `jwt_session:${session.userId}:*`,
      );

      // Delete all tokens
      if (jwtKeys && jwtKeys.length > 0) {
        await this.redisClient.del(jwtKeys);
      }
    }

    // Delete traditional session
    await this.redisClient.del(`session:${sessionId}`);

    this.logger.log(`User logout completed: Session ${sessionId}`);
    return { message: 'Logged out successfully' };
  }

  async validateJwtToken(token: string, userId: string): Promise<boolean> {
    if (!token || !userId) {
      return false;
    }

    try {
      // Check if the token exists in Redis
      const tokenKey = `jwt_session:${userId}:${token}`;
      const tokenData = await this.redisClient.get(tokenKey);

      return !!tokenData;
    } catch (error) {
      this.logger.error(`Error validating JWT token: ${error.message}`);
      return false;
    }
  }

  // Get user data by JWT token
  async getUserByToken(token: string): Promise<AuthUserResponseDto | null> {
    try {
      // Decode the token to get the userId
      const decoded = this.jwtService.decode(token) as { sub: string };
      if (!decoded || !decoded.sub) {
        return null;
      }

      // Check if token is valid in Redis
      const isValidToken = await this.validateJwtToken(token, decoded.sub);
      if (!isValidToken) {
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

  // Method to refresh JWT token
  async refreshJwtToken(oldToken: string): Promise<any> {
    try {
      // Verify the old token is still valid
      const decoded = this.jwtService.decode(oldToken) as { sub: string };
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      const isValid = await this.validateJwtToken(oldToken, decoded.sub);
      if (!isValid) {
        throw new UnauthorizedException('Token not found or expired');
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
        throw new UnauthorizedException('User not found');
      }

      // Delete the old token
      await this.redisClient.del(`jwt_session:${user.id}:${oldToken}`);

      // Generate a new token
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isVerified: user.isVerified,
      };
      const newToken = this.jwtService.sign(payload);

      // Store the new token
      const sessionExpiry = this.configService.get<number>(
        'SESSION_EXPIRY_SECONDS',
        60 * 60 * 24 * 3,
      );

      await this.redisClient.set(
        `jwt_session:${user.id}:${newToken}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          token: newToken,
          createdAt: new Date().toISOString(),
        }),
        { EX: sessionExpiry },
      );

      return {
        accessToken: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      this.logger.error(`Error refreshing JWT token: ${error.message}`);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  // Validate refresh token and issue a new access token
  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      // Decrypt the incoming refresh token
      let unencryptedToken: string;
      try {
        unencryptedToken = await this.cryptoService.decrypt(refreshToken);
        this.logger.debug('Successfully decrypted refresh token');
      } catch (decryptError) {
        this.logger.error(
          `Error decrypting refresh token: ${decryptError.message}`,
        );
        throw new UnauthorizedException('Invalid refresh token format');
      }

      // Verify the refresh token
      const decoded = this.jwtService.verify(unencryptedToken) as {
        sub: string;
        type: string;
      };

      // Check if token is of type 'refresh'
      if (!decoded || !decoded.sub || decoded.type !== 'refresh') {
        throw new UnauthorizedException(
          'Invalid refresh token. Only refresh tokens are accepted.',
        );
      }

      const userId = decoded.sub;

      // Check if the refresh token exists in Redis - using the decrypted token
      const tokenKey = `refresh_token:${userId}:${unencryptedToken}`;
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
        isActive: user.isActive,
        isVerified: user.isVerified,
      };
      const newAccessToken = this.generateAccessToken(payload);

      // Delete the old refresh token
      await this.redisClient.del(tokenKey);

      // Generate a new refresh token (will be encrypted)
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

  async getUserFromSession(
    sessionId: string,
  ): Promise<AuthUserResponseDto | null> {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!user) {
      return null;
    }

    const userResponse: AuthUserResponseDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
    };

    return userResponse;
  }

  async refreshSession(sessionId: string) {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      this.logger.warn(
        `Session refresh failed - invalid session: ${sessionId}`,
      );
      throw new UnauthorizedException('Invalid session');
    }

    // Extend the session TTL
    const sessionExpiry = this.configService.get<number>(
      'SESSION_EXPIRY_SECONDS',
      60 * 60 * 24 * 3,
    );

    await this.redisClient.set(`session:${sessionId}`, sessionData, {
      EX: sessionExpiry,
    });

    this.logger.log(`Session ${sessionId} refreshed successfully`);

    return {
      message: 'Session refreshed successfully',
    };
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
  generateAccessToken(payload: any): string {
    const accessTokenExpiry = this.configService.get<string>(
      'JWT_EXPIRATION',
      '15m',
    );
    this.logger.log(`Generating access token with expiry ${accessTokenExpiry}`);

    // Add token type to payload for extra security
    const tokenPayload = {
      ...payload,
      type: 'access', // Explicitly mark as access token
    };

    return this.jwtService.sign(tokenPayload, {
      expiresIn: accessTokenExpiry,
    });
  }

  // Method to generate a refresh token with long expiry
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshTokenExpiry = this.configService.get<number>(
      'JWT_REFRESH_EXPIRATION_SECONDS',
      60 * 60 * 24 * 7,
    ); // 7 days
    this.logger.log(
      `Generating refresh token for user ${userId} with expiry ${refreshTokenExpiry} seconds`,
    );

    // Generate a refresh token with minimal payload - just the user ID and token type
    const payload = {
      sub: userId,
      type: 'refresh', // Explicitly mark as refresh token
    };

    const unencryptedToken = this.jwtService.sign(payload, {
      expiresIn: `${refreshTokenExpiry}s`,
    });

    // Encrypt the token before storing and sending to client
    const encryptedToken = await this.cryptoService.encrypt(unencryptedToken);

    // Store the unencrypted token in Redis (for validation purposes)
    // We'll decrypt incoming tokens before validating them
    const tokenKey = `refresh_token:${userId}:${unencryptedToken}`;
    await this.redisClient.set(
      tokenKey,
      JSON.stringify({
        userId,
        refreshToken: unencryptedToken,
        createdAt: new Date().toISOString(),
      }),
      { EX: refreshTokenExpiry },
    );

    // Return the encrypted token to the client
    return encryptedToken;
  }
}
