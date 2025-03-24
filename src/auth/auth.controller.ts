import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  UnauthorizedException,
  Res,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { LocalAuthGuard, SessionAuthGuard, LogoutGuard } from './guards';
import {
  RegisterDto,
  AuthUserResponseDto,
  RegisterPowerUsersDto,
  LoginDto,
  TwoFactorAuthSetupDto,
  TwoFactorAuthCodeDto,
} from './dto';

@ApiTags('auth')
@ApiCookieAuth()
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(SessionAuthGuard)
  @Post('register/power-users')
  @ApiOperation({ summary: 'Register power users (admin only)' })
  @ApiBody({ type: RegisterPowerUsersDto })
  @ApiResponse({
    status: 201,
    description: 'Power user successfully registered',
    type: AuthUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async registerPowerUser(
    @Body() registerPowerUsersDto: RegisterPowerUsersDto,
  ) {
    return this.authService.registerPowerUser(registerPowerUsersDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const user = req.user;

    // User authenticated successfully, create session
    const loginResponse = await this.authService.login(user, req.sessionID);

    return {
      ...loginResponse,
      sessionId: req.sessionID,
    };
  }

  @UseGuards(LogoutGuard) // Instead of SessionAuthGuard
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Request() req) {
    const sessionId = req.sessionID;
    // Destroy Redis session first
    await this.authService.logout(sessionId);

    // Then destroy Express session
    return new Promise<void>((resolve) => {
      req.logout(() => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
          resolve();
        });
        resolve();
      });
    });
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/generate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate two-factor authentication secret and QR code',
  })
  @ApiResponse({ status: 200, description: 'Successfully generated 2FA setup' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateTwoFactorAuth(@Request() req) {
    // Generate 2FA secret and QR code
    const { qrCodeDataURL, secret } =
      await this.authService.generateTwoFactorAuthenticationSecret(req.user);

    return {
      qrCodeDataURL,
      secret,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/enable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiBody({ type: TwoFactorAuthSetupDto })
  @ApiResponse({
    status: 200,
    description: 'Two-factor authentication enabled',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid code' })
  async enableTwoFactorAuth(
    @Request() req,
    @Body() body: TwoFactorAuthSetupDto,
  ) {
    // Check if code is valid before enabling 2FA
    return await this.authService.enableTwoFactorAuthentication(
      req.user.id,
      body.twoFactorCode,
      req.sessionID,
    );
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify two-factor authentication code' })
  @ApiBody({ type: TwoFactorAuthCodeDto })
  @ApiResponse({ status: 200, description: 'Code validated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid code' })
  async verifyTwoFactorAuth(
    @Body() body: TwoFactorAuthCodeDto,
    @Request() req,
  ) {
    if (!req.sessionID) {
      throw new UnauthorizedException('No active session');
    }

    const sessionData = await this.authService.getSessionData(req.sessionID);
    if (!sessionData) {
      throw new UnauthorizedException('No active session');
    }

    // Call the validation method directly from the service
    return this.authService.validateTwoFactorAuthenticationCode(
      req.sessionID,
      body.twoFactorCode,
    );
  }

  @Post('2fa/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a new two-factor code' })
  @ApiResponse({ status: 200, description: 'Code sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTwoFactorCode(@Request() req) {
    const sessionData = await this.authService.getUserFromSession(
      req.sessionID,
    );

    if (!sessionData) {
      throw new UnauthorizedException('No active session');
    }

    return await this.authService.sendTwoFactorCode(sessionData.id);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh user session' })
  @ApiResponse({ status: 200, description: 'Session refreshed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshSession(@Request() req) {
    if (!req.sessionID) {
      throw new UnauthorizedException('No active session');
    }

    return this.authService.refreshSession(req.sessionID);
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user information retrieved',
    type: AuthUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    const user = await this.authService.getUserFromSession(req.sessionID);
    if (!user) {
      throw new UnauthorizedException('No active session');
    }
    return user;
  }

  @UseGuards(SessionAuthGuard)
  @Get('admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin only route' })
  @ApiResponse({ status: 200, description: 'Admin area accessed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  adminRoute(@Request() req) {
    return {
      message: 'Admin area accessed successfully',
      user: req.user,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('moderator')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Moderator route (accessible by moderators and admins)',
  })
  @ApiResponse({ status: 200, description: 'Moderator area accessed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires moderator or admin role',
  })
  moderatorRoute(@Request() req) {
    return {
      message: 'Moderator area accessed successfully',
      user: req.user,
    };
  }
}
