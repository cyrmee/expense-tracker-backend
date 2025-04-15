import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Ensure we validate token expiry
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'fallback_secret_do_not_use_in_production',
    });
  }

  async validate(payload: any) {
    // Check if token is of type 'access'
    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type. Access denied.');
    }

    // The token is verified by Passport and we've checked the token type
    // Return the user data that will be attached to the request object
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isActive: payload.isActive,
      isVerified: payload.isVerified,
    };
  }
}
