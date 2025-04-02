import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import * as session from 'express-session';
import * as redis from 'connect-redis';
import { createClient } from '@redis/client';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get('REDIS_URL'),
          ttl: configService.get<number>(
            'SESSION_EXPIRY_SECONDS',
            60 * 60 * 24 * 3,
          ),
          // Fallback to socket config if REDIS_URL is not available
          ...(configService.get('REDIS_URL')
            ? {}
            : {
                socket: {
                  host: configService.get('REDIS_HOST', 'localhost'),
                  port: configService.get('REDIS_PORT', 6379),
                  reconnectStrategy: (retries: number) => {
                    if (retries > 10) {
                      console.error(
                        'Max reconnection attempts reached. Giving up.',
                      );
                      return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(2 ** retries * 100, 3000);
                  },
                },
                password: configService.get('REDIS_PASSWORD'),
              }),
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
        const redisClient = configService.get('REDIS_URL')
          ? createClient({
              url: configService.get('REDIS_URL'),
            })
          : createClient({
              socket: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                reconnectStrategy: (retries) => {
                  if (retries > 10) {
                    console.error(
                      'Max reconnection attempts reached. Giving up.',
                    );
                    return new Error('Max reconnection attempts reached');
                  }
                  return Math.min(2 ** retries * 100, 3000);
                },
              },
              password: configService.get('REDIS_PASSWORD'),
            });

        // Handle connection errors
        redisClient.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        // Log successful reconnection
        redisClient.on('reconnecting', () => {
          console.log('Attempting to reconnect to Redis...');
        });

        redisClient.on('ready', () => {});

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
    {
      provide: 'SESSION_MIDDLEWARE',
      useFactory: async (redisClient: any, configService: ConfigService) => {
        const store = new redis.RedisStore({
          client: redisClient,
        });

        return session({
          store,
          secret: configService.get('SESSION_SECRET')!,
          name: 'sessionId',
          resave: false,
          saveUninitialized: true,
          rolling: true,
          proxy: true,
          cookie: {
            httpOnly: true,
            secure:
              process.env.NODE_ENV === 'production' ||
              process.env.NODE_ENV === 'staging',
            sameSite: 'none',
            maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
            path: '/',
          },
        });
      },
      inject: ['REDIS_CLIENT', ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT', 'SESSION_MIDDLEWARE', CacheModule],
})
export class RedisModule {}
