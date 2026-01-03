import type { INestApplication } from '@nestjs/common';

describe('main bootstrap', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('bootstrap configures app and listens', async () => {
        process.env.NODE_ENV = 'test';
        process.env.PORT = '';

        const appMock: Partial<INestApplication> & {
            use: jest.Mock;
            useGlobalPipes: jest.Mock;
            useGlobalFilters: jest.Mock;
            enableCors: jest.Mock;
            setGlobalPrefix: jest.Mock;
            set: jest.Mock;
            enableShutdownHooks: jest.Mock;
            listen: jest.Mock;
            getUrl: jest.Mock;
        } = {
            use: jest.fn(),
            useGlobalPipes: jest.fn(),
            useGlobalFilters: jest.fn(),
            enableCors: jest.fn(),
            setGlobalPrefix: jest.fn(),
            set: jest.fn(),
            enableShutdownHooks: jest.fn(),
            listen: jest.fn().mockResolvedValue(undefined),
            getUrl: jest.fn().mockResolvedValue('http://localhost:3000'),
        };

        const NestFactory = {
            create: jest.fn(async () => appMock),
        };

        jest.doMock('@nestjs/core', () => ({ NestFactory }));
        jest.doMock('@nestjs/swagger', () => {
            const noopDecorator = () => undefined;
            const decoratorFactory = () => noopDecorator;

            const moduleExports: any = {
                __esModule: true,
                SwaggerModule: {
                    createDocument: jest.fn(() => ({})),
                    setup: jest.fn(),
                },
                DocumentBuilder: jest.fn().mockImplementation(() => ({
                    setTitle: jest.fn().mockReturnThis(),
                    setDescription: jest.fn().mockReturnThis(),
                    setVersion: jest.fn().mockReturnThis(),
                    addTag: jest.fn().mockReturnThis(),
                    addBearerAuth: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnValue({}),
                })),
            };

            return new Proxy(moduleExports, {
                get(target, property) {
                    if (property in target) return target[property];
                    return decoratorFactory;
                },
            });
        });

        const { bootstrap } = await import('./main');

        await bootstrap();

        expect(NestFactory.create).toHaveBeenCalled();
        expect(appMock.set).toHaveBeenCalledWith('trust proxy', 1);
        expect(appMock.enableCors).toHaveBeenCalled();
        expect(appMock.useGlobalPipes).toHaveBeenCalled();
        expect(appMock.useGlobalFilters).toHaveBeenCalled();
        expect(appMock.enableShutdownHooks).toHaveBeenCalled();
        expect(appMock.listen).toHaveBeenCalled();
    });

    it('bootstrap uses PORT env var when provided', async () => {
        process.env.NODE_ENV = 'test';
        const previousPort = process.env.PORT;
        process.env.PORT = '3001';

        const appMock: any = {
            use: jest.fn(),
            useGlobalPipes: jest.fn(),
            useGlobalFilters: jest.fn(),
            enableCors: jest.fn(),
            setGlobalPrefix: jest.fn(),
            set: jest.fn(),
            enableShutdownHooks: jest.fn(),
            listen: jest.fn().mockResolvedValue(undefined),
        };

        const NestFactory = {
            create: jest.fn(async () => appMock),
        };

        jest.doMock('@nestjs/core', () => ({ NestFactory }));
        jest.doMock('@nestjs/swagger', () => {
            const noopDecorator = () => undefined;
            const decoratorFactory = () => noopDecorator;

            const moduleExports: any = {
                __esModule: true,
                SwaggerModule: {
                    createDocument: jest.fn(() => ({})),
                    setup: jest.fn(),
                },
                DocumentBuilder: jest.fn().mockImplementation(() => ({
                    setTitle: jest.fn().mockReturnThis(),
                    setDescription: jest.fn().mockReturnThis(),
                    setVersion: jest.fn().mockReturnThis(),
                    addTag: jest.fn().mockReturnThis(),
                    addBearerAuth: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnValue({}),
                })),
            };

            return new Proxy(moduleExports, {
                get(target, property) {
                    if (property in target) return target[property];
                    return decoratorFactory;
                },
            });
        });

        const { bootstrap } = await import('./main');
        await bootstrap();

        expect(appMock.listen).toHaveBeenCalledWith('3001');

        if (previousPort === undefined) {
            delete process.env.PORT;
        } else {
            process.env.PORT = previousPort;
        }
    });
});
