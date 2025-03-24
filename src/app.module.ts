import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AppConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import * as passport from 'passport';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    AppConfigModule,
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
