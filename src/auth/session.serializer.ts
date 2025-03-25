import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: any, done: Function) {
    if (!user) {
      return done(new Error('No user provided for serialization'), undefined);
    }
    if (!user.id) {
      return done(new Error('Invalid user object'), undefined);
    }
    done(null, user.id);
  }

  async deserializeUser(payload: any, done: Function) {
    if (!payload) {
      return done(
        new Error('No payload provided for deserialization'),
        undefined,
      );
    }
    // We only need the user ID here as we'll use the session ID
    // from the cookie to get the complete user from Redis
    done(null, payload);
  }
}
