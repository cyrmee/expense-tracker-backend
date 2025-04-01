import { Global, Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './session.serializer';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { SessionAuthGuard } from './guards';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { MailModule } from '../mail/mail.module'; // Add this import
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    forwardRef(() => AppSettingsModule),
    MailModule,
    CommonModule,
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
