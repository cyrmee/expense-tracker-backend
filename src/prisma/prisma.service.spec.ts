describe('PrismaService', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('constructs PrismaClient with PrismaPg adapter and connects/disconnects', async () => {
        process.env.DATABASE_URL = 'postgres://example';

        const PrismaPg = jest.fn().mockImplementation(() => ({ kind: 'adapter' }));
        jest.doMock('@prisma/adapter-pg', () => ({ PrismaPg }));

        const connect = jest.fn().mockResolvedValue(undefined);
        const disconnect = jest.fn().mockResolvedValue(undefined);

        class PrismaClientMock {
            $connect = connect;
            $disconnect = disconnect;
        }

        jest.doMock('../generated/prisma/client', () => ({ PrismaClient: PrismaClientMock }));

        const { PrismaService } = await import('./prisma.service');

        const service = new PrismaService();

        expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgres://example' });

        await service.onModuleInit();
        expect(connect).toHaveBeenCalled();

        await service.onModuleDestroy();
        expect(disconnect).toHaveBeenCalled();
    });
});
