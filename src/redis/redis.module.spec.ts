import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

describe('RedisModule', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('registers cache store and client using REDIS_URL', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        const previousRedisUrl = process.env.REDIS_URL;
        process.env.REDIS_URL = 'redis://example';

        const redisStore = jest.fn<Promise<any>, any[]>(async (_opts: any) => ({ store: 'redis' }));
        jest.doMock('cache-manager-redis-store', () => ({ redisStore }));

        let cacheRegisterArgs: any;
        jest.doMock('@nestjs/cache-manager', () => {
            class CacheModuleMock {
                static readonly __mock = true;

                static registerAsync(args: any) {
                    cacheRegisterArgs = args;
                    return { module: CacheModuleMock };
                }
            }

            return { CacheModule: CacheModuleMock };
        });

        const clientHandlers: Record<string, Function> = {};
        const redisClient = {
            on: jest.fn((event: string, cb: Function) => {
                clientHandlers[event] = cb;
                return redisClient;
            }),
            connect: jest.fn(async () => undefined),
        };
        const createClient = jest.fn<any, any[]>(() => redisClient);
        jest.doMock('@redis/client', () => ({ createClient }));

        const { RedisModule } = await import('./redis.module');

        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                }),
                RedisModule,
            ],
        }).compile();

        // Exercise CacheModule.registerAsync useFactory directly (mocked CacheModule does not execute it)
        expect(cacheRegisterArgs).toBeTruthy();
        await cacheRegisterArgs.useFactory(moduleRef.get(ConfigService));

        expect(redisStore).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'redis://example' }),
        );
        expect(createClient).toHaveBeenCalledWith({ url: 'redis://example' });

        // trigger connection error handler
        clientHandlers.error?.(new Error('boom'));

        expect(moduleRef.get('REDIS_CLIENT')).toBe(redisClient);

        if (previousRedisUrl === undefined) {
            delete process.env.REDIS_URL;
        } else {
            process.env.REDIS_URL = previousRedisUrl;
        }
        consoleError.mockRestore();
    });

    it('falls back to socket config and reconnectStrategy caps retries', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        const previousRedisUrl = process.env.REDIS_URL;
        delete process.env.REDIS_URL;

        const redisStore = jest.fn<Promise<any>, any[]>(async (_opts: any) => ({ store: 'redis' }));
        jest.doMock('cache-manager-redis-store', () => ({ redisStore }));

        let cacheRegisterArgs: any;
        jest.doMock('@nestjs/cache-manager', () => {
            class CacheModuleMock {
                static readonly __mock = true;

                static registerAsync(args: any) {
                    cacheRegisterArgs = args;
                    return { module: CacheModuleMock };
                }
            }

            return { CacheModule: CacheModuleMock };
        });

        const redisClient = {
            on: jest.fn(() => redisClient),
            connect: jest.fn(async () => {
                throw new Error('connect failed');
            }),
        };
        const createClient = jest.fn<any, any[]>(() => redisClient);
        jest.doMock('@redis/client', () => ({ createClient }));

        const { RedisModule } = await import('./redis.module');

        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                }),
                RedisModule,
            ],
        }).compile();

        expect(cacheRegisterArgs).toBeTruthy();
        await cacheRegisterArgs.useFactory(moduleRef.get(ConfigService));

        expect(redisStore).toHaveBeenCalled();
        const storeOptions = redisStore.mock.calls[0][0];
        const socketOptions = storeOptions.socket;

        expect(socketOptions.reconnectStrategy(1)).toBe(200);
        expect(socketOptions.reconnectStrategy(11)).toBeInstanceOf(Error);

        expect(
            consoleError.mock.calls.some(
                (call) => call[0] === 'Max reconnection attempts reached. Giving up.',
            ),
        ).toBe(true);

        expect(createClient).toHaveBeenCalled();
        const clientOptions = createClient.mock.calls[0][0];
        expect(clientOptions.socket.reconnectStrategy(11)).toBeInstanceOf(Error);

        // even if initial connect fails, module should still resolve a client
        expect(moduleRef.get('REDIS_CLIENT')).toBe(redisClient);

        if (previousRedisUrl !== undefined) {
            process.env.REDIS_URL = previousRedisUrl;
        }
        consoleError.mockRestore();
    });
});
