import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, AuthUserResponseDto, ChangePasswordDto } from './dto';
import { AppSettingsService } from '../app-settings/app-settings.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppSettingsService))
    private readonly appSettingsService: AppSettingsService,
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
      },
    });

    // Create default app settings for the user
    await this.appSettingsService.create(createdUser.id);

    // Return standardized user response
    const userResponse: AuthUserResponseDto = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      isActive: true,
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

    // Store simple session data
    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
      }),
      { EX: sessionExpiry },
    ); // Expire based on session expiry setting

    // Return standardized user response
    const userResponse: AuthUserResponseDto = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return userResponse;
  }

  async logout(sessionId: string) {
    await this.redisClient.del(`session:${sessionId}`);
    return { message: 'Logged out successfully' };
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

    console.log(
      `Session ${sessionId} refreshed at ${new Date().toISOString()}`,
    );

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
}
