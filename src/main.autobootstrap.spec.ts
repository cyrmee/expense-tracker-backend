describe('main auto bootstrap helpers', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('shouldAutoBootstrap returns false in test env', async () => {
        process.env.NODE_ENV = 'test';

        jest.doMock('./app.module', () => ({ AppModule: function AppModule() { } }));

        const { shouldAutoBootstrap } = await import('./main');
        expect(shouldAutoBootstrap()).toBe(false);
    });

    it('shouldAutoBootstrap returns false when imported normally', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('./app.module', () => ({ AppModule: function AppModule() { } }));

        const { shouldAutoBootstrap } = await import('./main');
        expect(shouldAutoBootstrap()).toBe(false);
    });

    it('autoBootstrap catches bootstrap errors', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('./app.module', () => ({ AppModule: function AppModule() { } }));
        jest.doMock('passport', () => {
            const noopMiddleware = () => undefined;
            const initialize = () => noopMiddleware;
            return { initialize };
        });

        const NestFactory = {
            create: jest.fn(async () => {
                throw new Error('boom');
            }),
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

        const common = await import('@nestjs/common');
        jest.spyOn(common.Logger.prototype as any, 'log').mockImplementation(() => { });
        const errorSpy = jest
            .spyOn(common.Logger.prototype as any, 'error')
            .mockImplementation(() => { });

        const { autoBootstrap } = await import('./main');

        await autoBootstrap();

        expect(errorSpy).toHaveBeenCalled();
    });

    it('shouldAutoBootstrap returns true when executed directly (parameterized)', async () => {
        process.env.NODE_ENV = 'development';
        jest.doMock('./app.module', () => ({ AppModule: function AppModule() { } }));

        const { shouldAutoBootstrap } = await import('./main');
        const moduleMarker = {};

        expect(shouldAutoBootstrap('development', moduleMarker, moduleMarker)).toBe(true);
    });

    it('maybeAutoBootstrap triggers autoBootstrap when direct-execution check passes', async () => {
        process.env.NODE_ENV = 'development';
        jest.doMock('./app.module', () => ({ AppModule: function AppModule() { } }));

        const mainModule = await import('./main');
        const runner = jest.fn(async () => undefined);
        const marker = {};

        mainModule.maybeAutoBootstrap('development', marker, marker, runner);
        expect(runner).toHaveBeenCalled();
    });
});
