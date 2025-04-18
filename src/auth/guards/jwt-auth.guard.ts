import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Execute the parent's authentication logic
    const result = (await super.canActivate(context)) as boolean;

    // Get the request
    const request = context.switchToHttp().getRequest();

    // Check if user is active (this check is now available directly from the JWT payload)
    if (!request.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return result;
  }
}
