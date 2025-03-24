import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class LogoutGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Only check if the session exists at all, not if it's fully authenticated
    return !!request.session && !!request.session.id;
  }
}
