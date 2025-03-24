import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let request;
    if (context.getType<string>() === 'http') {
      request = context.switchToHttp().getRequest();
    }

    const sessionId = request?.sessionID;
    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    const sessionData = await this.authService.getSessionData(sessionId);
    if (!sessionData) {
      throw new UnauthorizedException('Invalid session');
    }

    // Get user data first so we can check actual 2FA status from database
    const user = await this.authService.getUserFromSession(sessionId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Always allow access to 2FA setup and verification routes
    if (
      request.path.startsWith('/auth/2fa/generate') ||
      request.path === '/auth/2fa/verify' ||
      request.path === '/auth/2fa/enable'
    ) {
      request.user = user;
      return true;
    }

    // Check if the user has 2FA enabled in the database but not verified in this session
    if (
      user.twoFactorEnabled &&
      sessionData.requires2FA &&
      !sessionData.verified2FA
    ) {
      throw new UnauthorizedException('2FA verification required');
    }

    // For all other routes, check user status
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Attach the user to the request so it's available for controllers and other guards
    request.user = user;

    return true;
  }
}
