import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, LocalAuthGuard, LogoutGuard } from './guards';
import {
  AuthUserResponseDto,
  ChangePasswordDto,
  JwtAuthResponseDto,
  LoginDto,
  RegisterDto,
  RequestResetDto,
  ResetPasswordDto,
  ValidateResetTokenDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in and JWT token issued',
    type: JwtAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Request() req) {
    if (!req.user) throw new UnauthorizedException('Invalid credentials');

    // User authenticated successfully, create JWT token
    return await this.authService.login(req.user);
  }

  @UseGuards(LogoutGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate JWT tokens' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiBearerAuth()
  async logout(
    @Request() req,
    @Headers('authorization') auth: string,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = body?.refreshToken;
    const userId = req.user?.id;

    // Invalidate JWT tokens only
    return await this.authService.logout(refreshToken, userId);
  }

  @Post('refresh-access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    type: JwtAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshAccessToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user information retrieved',
    type: AuthUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(
      req.user.id,
      changePasswordDto,
    );
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.CREATED)
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate reset token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    const isValid = await this.authService.validateResetToken(dto.token);
    return { valid: isValid };
  }

  @Post('password-reset/reset')
  @HttpCode(HttpStatus.CREATED)
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
  @HttpCode(HttpStatus.CREATED)
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
  @HttpCode(HttpStatus.CREATED)
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
    type: JwtAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { otp: string }) {
    try {
      const user = await this.authService.verifyEmailOtp(body.otp);

      return {
        ...user,
        verified: true,
        message: 'Email verified and logged in successfully',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify email');
    }
  }
}
