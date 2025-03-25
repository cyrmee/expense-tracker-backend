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
  Patch,
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
  LoginDto,
  ChangePasswordDto,
} from './dto';

@ApiTags('auth')
@ApiCookieAuth()
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    return await this.authService.register(registerDto);
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

  @UseGuards(LogoutGuard)
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

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Refresh user session' })
  @ApiResponse({ status: 200, description: 'Session refreshed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshSession(@Request() req) {
    if (!req.sessionID) {
      throw new UnauthorizedException('No active session');
    }
    return await this.authService.refreshSession(req.sessionID);
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
  @Patch('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.authService.getUserFromSession(req.sessionID);
    if (!user) {
      throw new UnauthorizedException('No active session');
    }
    return await this.authService.changePassword(user.id, changePasswordDto);
  }
}
