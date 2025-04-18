import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class LogoutGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // JWT-based auth doesn't need session checks
    // Just allow the logout request to proceed
    return true;
  }
}
