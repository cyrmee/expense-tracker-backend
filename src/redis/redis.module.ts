import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@redis/client';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.getOrThrow<string>('REDIS_URL'),
          ttl: configService.get<number>(
            'TOKEN_EXPIRY_SECONDS',
            60 * 60 * 24 * 3,
          ),
          tls: process.env.NODE_ENV === 'production' ? {} : undefined,
        }),
      }),
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const redisClient = createClient({
          url: configService.getOrThrow<string>('REDIS_URL'),
        });

        // Handle connection errors
        redisClient.on('error', (err) => {
          console.error('Redis connection error:', err);
        }); // Handle reconnection
        redisClient.on('reconnecting', () => { });

        redisClient.on('ready', () => { });

        try {
          await redisClient.connect();
        } catch (err) {
          console.error('Failed to establish initial Redis connection:', err);
          // The reconnection strategy will handle retries
        }

        return redisClient;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT', CacheModule],
})
export class RedisModule { }
