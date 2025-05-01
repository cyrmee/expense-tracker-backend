import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret is not defined in the environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Ensure we validate token expiry
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // Check if token is of type 'access'
    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type. Access denied.');
    }

    // Check if the JTI exists in Redis - this is crucial for security
    // This allows for immediate token revocation and validates the token is still active
    const jtiKey = `jwt_jti:${payload.sub}:${payload.jti}`;
    const tokenData = await this.redisClient.get(jtiKey);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or revoked token');
    }

    // Only perform critical validation checks based on token payload
    // This avoids a database lookup for every authenticated request
    if (!payload.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!payload.isVerified) {
      throw new UnauthorizedException('User account is not verified');
    }

    // Return the user data from the token payload
    // The token already contains the essential user information
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isActive: payload.isActive,
      isVerified: payload.isVerified,
    };
  }
}
