import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './session.serializer';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { SessionAuthGuard } from './guards';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    PassportModule.register({
      session: true,
      defaultStrategy: 'local',
    }),
  ],
  providers: [AuthService, LocalStrategy, SessionSerializer, SessionAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
