import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { StrategyOptionsWithRequest } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(req: any, payload: any) {
    // Validate that the JWT token is in Redis (session storage)
    const isValid = await this.authService.validateJwtToken(
      req.headers.authorization?.split(' ')[1],
      payload.sub,
    );

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid token - not found in session storage',
      );
    }

    // Return the user data from the payload
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isActive: payload.isActive,
      isVerified: payload.isVerified,
    };
  }
}
