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
  BadRequestException,
  InternalServerErrorException,
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
  RequestResetDto,
  ResetPasswordDto,
  ValidateResetTokenDto,
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

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if email exists' })
  async requestPasswordReset(@Body() dto: RequestResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return {
      message:
        'If your email exists in our system, you will receive a password reset link shortly',
    };
  }

  @Post('password-reset/validate')
  @ApiOperation({ summary: 'Validate reset token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    const isValid = await this.authService.validateResetToken(dto.token);
    return { valid: isValid };
  }

  @Post('password-reset/reset')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const success = await this.authService.resetPassword(dto);

    if (!success) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { message: 'Password has been reset successfully' };
  }

  @Post('email-verification/request')
  @ApiOperation({ summary: 'Request email verification' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Email already verified' })
  async requestEmailVerification(@Body() body: { email: string }) {
    await this.authService.requestEmailVerification(body.email);
    return {
      message: 'Verification email has been sent',
    };
  }

  @Post('email-verification/verify')
  @ApiOperation({ summary: 'Verify email with token and auto-login' })
  @ApiBody({
    schema: {
      properties: {
        otp: { type: 'string', example: '123456' },
      },
      required: ['otp'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified and user logged in',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { otp: string }, @Request() req) {
    try {
      const user = await this.authService.verifyEmailOtp(
        body.otp,
        req.sessionID,
      );

      return {
        ...user,
        verified: true,
        message: 'Email verified and logged in successfully',
        sessionId: req.sessionID,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify email');
    }
  }
}
