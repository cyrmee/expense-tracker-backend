import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, RegisterPowerUsersDto, AuthUserResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
    private configService: ConfigService,
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
      return result;
    }
    return null;
  }

  async register(userData: RegisterDto): Promise<AuthUserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: userData.email }, { username: userData.username }],
      },
    });

    if (existingUser) {
      throw new ForbiddenException(
        'User with this email or username already exists',
      );
    }

    const hash = await argon2.hash(userData.password);
    const createdUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        name: userData.name,
        hash,
      },
    });

    // Return standardized user response
    const userResponse: AuthUserResponseDto = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      name: createdUser.name,
      twoFactorEnabled: createdUser.twoFactorEnabled,
      requires2FA: true,
    };

    return userResponse;
  }

  /**
   * Register a power user (admin or moderator) - only accessible to admins
   */
  async registerPowerUser(
    powerUserData: RegisterPowerUsersDto,
  ): Promise<AuthUserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: powerUserData.email },
          { username: powerUserData.username },
        ],
      },
    });

    if (existingUser) {
      throw new ForbiddenException(
        'User with this email or username already exists',
      );
    }

    // Hash the password
    const hash = await argon2.hash(powerUserData.password);

    // Create the power user with specified roles
    const createdUser = await this.prisma.user.create({
      data: {
        email: powerUserData.email,
        username: powerUserData.username,
        name: powerUserData.name,
        hash,
        isVerified: true,
      },
    });

    const userResponse: AuthUserResponseDto = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      name: createdUser.name,
      twoFactorEnabled: createdUser.twoFactorEnabled,
      requires2FA: true,
    };

    return userResponse;
  }

  async login(user: any, sessionId: string): Promise<AuthUserResponseDto> {
    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionExpiry = this.configService.get<number>(
      'SESSION_EXPIRY_SECONDS',
      60 * 60 * 24 * 3,
    );

    // Always set requires2FA to true, and verified2FA to false until verification
    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.userRoles,
        requires2FA: true,
        verified2FA: false,
        twoFactorEnabled: user.twoFactorEnabled || false,
      }),
      { EX: sessionExpiry },
    ); // Expire based on session expiry setting

    // Return standardized user response
    const userResponse: AuthUserResponseDto = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      requires2FA: true, // Always require 2FA
      twoFactorEnabled: user.twoFactorEnabled || false,
    };

    return userResponse;
  }

  async logout(sessionId: string) {
    await this.redisClient.del(`session:${sessionId}`);
    return { message: 'Logged out successfully' };
  }

  async generateTwoFactorAuthenticationSecret(user: User) {
    const secret = authenticator.generateSecret();
    const appName = this.configService.get('APP_NAME', 'ExpenseTrackerApp');
    const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);

    // Save the secret to the user record temporarily
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    // Generate QR code
    const qrCodeDataURL = await toDataURL(otpAuthUrl);

    return {
      secret,
      qrCodeDataURL,
    };
  }

  async enableTwoFactorAuthentication(
    userId: string,
    twoFactorCode: string,
    sessionId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication not set up');
    }

    const isCodeValid = authenticator.verify({
      token: twoFactorCode,
      secret: user.twoFactorSecret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    // Enable 2FA for the user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        // Generate a set of backup codes (simplified version)
        twoFactorBackupCodes: JSON.stringify(
          Array.from({ length: 5 }, () =>
            Math.random().toString(36).substring(2, 12).toUpperCase(),
          ),
        ),
      },
    });

    await this.validateTwoFactorAuthenticationCode(sessionId, twoFactorCode);

    return {
      message: 'Two-factor authentication enabled successfully',
    };
  }

  async validateTwoFactorAuthenticationCode(
    sessionId: string,
    twoFactorCode: string,
  ) {
    // Get session data
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = JSON.parse(sessionData);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication not set up');
    }

    const isCodeValid = authenticator.verify({
      token: twoFactorCode,
      secret: user.twoFactorSecret,
    });

    if (!isCodeValid) {
      // Check if the code is a backup code
      const backupCodes = user.twoFactorBackupCodes
        ? JSON.parse(user.twoFactorBackupCodes)
        : [];
      const isBackupCodeValid = backupCodes.includes(twoFactorCode);

      if (!isBackupCodeValid) {
        throw new UnauthorizedException('Invalid two-factor code');
      }

      // Remove the used backup code
      const updatedBackupCodes = backupCodes.filter(
        (code: string) => code !== twoFactorCode,
      );
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: JSON.stringify(updatedBackupCodes) },
      });
    }

    const sessionExpiry = this.configService.get<number>(
      'SESSION_EXPIRY_SECONDS',
      60 * 60 * 24 * 3,
    );

    // Update session to mark 2FA as verified
    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify({
        ...session,
        verified2FA: true,
      }),
      { EX: sessionExpiry },
    ); // Expire based on config value

    return {
      message: 'Two-factor authentication verified successfully',
    };
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
        username: true,
        name: true,
        twoFactorEnabled: true,
        isActive: true,
      },
    });

    if (!user) {
      return null;
    }

    const userResponse: AuthUserResponseDto = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
      requires2FA: session.requires2FA,
      verified2FA: session.verified2FA,
      isActive: user.isActive,
    };

    return userResponse;
  }

  async refreshSession(sessionId: string) {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = JSON.parse(sessionData);

    // Extend the session TTL
    const sessionExpiry = this.configService.get<number>(
      'SESSION_EXPIRY_SECONDS',
      60 * 60 * 24 * 3,
    );

    await this.redisClient.set(`session:${sessionId}`, sessionData, {
      EX: sessionExpiry,
    });

    console.log(
      `Session ${sessionId} refreshed at ${new Date().toISOString()}`,
    );

    return {
      message: 'Session refreshed successfully',
    };
  }

  async sendTwoFactorCode(userId: string) {
    // In a real application, this would send the code via SMS or email
    // For demo purposes, we'll just return a message
    return {
      message:
        "In a production app, a 2FA code would be sent to the user's phone or email",
    };
  }
}
