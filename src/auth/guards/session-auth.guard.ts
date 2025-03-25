import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

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

    // Get user data
    const user = await this.authService.getUserFromSession(sessionId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check user status
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Attach the user to the request so it's available for controllers and other guards
    request.user = user;
    return true;
  }
}
