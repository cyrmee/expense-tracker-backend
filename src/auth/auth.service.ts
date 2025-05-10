import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CreateAppSettingsCommand } from 'src/app-settings/commands';
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

@Injectable()
export class AuthService {
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
      return result;
    }
    return null;
  }

  async register(userData: RegisterDto): Promise<AuthUserResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: userData.email }],
      },
    });
    if (existingUser) {
      throw new ForbiddenException('User with this email already exists');
    }
    const hash = await argon2.hash(userData.password);
    const createdUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        hash,
        isVerified: false,
      },
    });
    const createCommand = new CreateAppSettingsCommand();
    createCommand.userId = createdUser.id;
    await this.appSettingsService.create(createCommand);
    await this.requestEmailVerification(userData.email);
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
        throw new UnauthorizedException('User not found');
      }
      if (user.isVerified) {
        throw new ForbiddenException('Email already verified');
      }
      const otp = await this.generateOtp(user.email);
      await this.mailService.sendOTP(email, otp);
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process email verification request',
      );
    }
  }

  async verifyEmailOtp(otp: string): Promise<JwtAuthResponseDto> {
    const verificationKey = `email_verification:${otp}`;
    const userId = await this.redisClient.get(verificationKey);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired otp');
    }
    try {
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
      await this.redisClient.del(verificationKey);
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
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  async login(user: any): Promise<any> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id);
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
    let userIdFromToken: string | null = userId || null;
    if (refreshToken) {
      try {
        const decoded = this.jwtService.decode(refreshToken) as {
          sub: string;
          jti?: string;
        };
        if (decoded?.sub) {
          userIdFromToken = decoded.sub;
          if (decoded.jti) {
            const jtiKey = `refresh_jti:${userIdFromToken}:${decoded.jti}`;
            await this.redisClient.del(jtiKey);
          }
        }
      } catch (error) {}
    }
    if (userIdFromToken) {
      try {
        const jwtJtiKeys = await this.redisClient.keys(
          `jwt_jti:${userIdFromToken}:*`,
        );
        if (jwtJtiKeys && jwtJtiKeys.length > 0) {
          await this.redisClient.del(jwtJtiKeys);
        }
        const refreshJtiKeys = await this.redisClient.keys(
          `refresh_jti:${userIdFromToken}:*`,
        );
        if (refreshJtiKeys && refreshJtiKeys.length > 0) {
          await this.redisClient.del(refreshJtiKeys);
        }
      } catch (redisError) {}
    }
    return { message: 'Logged out successfully' };
  }

  async getUserByToken(token: string): Promise<AuthUserResponseDto | null> {
    try {
      const decoded = this.jwtService.decode(token) as { sub: string };
      if (!decoded || !decoded.sub) {
        return null;
      }
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
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(refreshToken) as {
        sub: string;
        type: string;
        jti?: string;
      };
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
      const tokenKey = `refresh_jti:${userId}:${jti}`;
      const tokenData = await this.redisClient.get(tokenKey);
      if (!tokenData) {
        throw new UnauthorizedException('Refresh token not found or expired');
      }
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
      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };
      const newAccessToken = await this.generateAccessToken(payload);
      await this.redisClient.del(tokenKey);
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
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }
    const passwordMatch = await argon2.verify(
      user.hash,
      changePasswordDto.currentPassword,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Old password is incorrect');
    }
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
        return true;
      }
      const resetToken = await this.cryptoService.generateRandomToken();
      const resetKey = `password_reset:${resetToken}`;
      await this.redisClient.set(resetKey, user.id, { EX: 600 });
      await this.mailService.sendResetPasswordToken(email, resetToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateResetToken(token: string): Promise<boolean> {
    try {
      const resetKey = `password_reset:${token}`;
      const userId = await this.redisClient.get(resetKey);
      return !!userId;
    } catch (error) {
      return false;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<boolean> {
    try {
      const resetKey = `password_reset:${dto.token}`;
      const userId = await this.redisClient.get(resetKey);
      if (!userId) {
        return false;
      }
      const hash = await argon2.hash(dto.password);
      await this.prisma.user.update({
        where: { id: userId },
        data: { hash },
      });
      await this.redisClient.del(resetKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateOtp(email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpKey = `email_verification:${otp}`;
      await this.redisClient.set(otpKey, user.id, { EX: 600 });
      return otp;
    } catch (error) {
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
      await this.redisClient.del(otpKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateAccessToken(payload: any): Promise<string> {
    const accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
    );
    if (!accessTokenExpiry) {
      throw new Error(
        'JWT_ACCESS_EXPIRATION environment variable is not defined',
      );
    }
    const jti = await this.cryptoService.generateRandomToken(24);
    const tokenPayload = {
      ...payload,
      type: 'access',
      jti,
    };
    const token = this.jwtService.sign(tokenPayload, {
      expiresIn: accessTokenExpiry,
    });
    const expiryInSeconds = this.parseExpiryToSeconds(accessTokenExpiry);
    const userId = payload.sub;
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
      .catch(() => {});
    return token;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
    );
    if (!refreshTokenExpiry) {
      throw new Error(
        'JWT_REFRESH_EXPIRATION environment variable is not defined',
      );
    }
    const jti = await this.cryptoService.generateRandomToken(24);
    const payload = {
      sub: userId,
      type: 'refresh',
      jti,
    };
    const token = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpiry,
    });
    const expiryInSeconds = this.parseExpiryToSeconds(refreshTokenExpiry);
    const tokenKey = `refresh_jti:${userId}:${jti}`;
    await this.redisClient.set(
      tokenKey,
      JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
      }),
      { EX: expiryInSeconds },
    );
    return token;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const defaultExpiry = 15 * 60;
    if (!expiry) return defaultExpiry;
    try {
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
      return defaultExpiry;
    }
  }
}
