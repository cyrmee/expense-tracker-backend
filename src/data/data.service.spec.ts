import { BadRequestException } from '@nestjs/common';
import { DataService } from './data.service';

describe('DataService', () => {
    const makeService = (overrides?: any) => {
        const prisma: any = {
            user: { findUnique: jest.fn(), update: jest.fn() },
            expense: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
            category: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
            moneySource: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
            balanceHistory: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
            appSettings: {
                findUnique: jest.fn(),
                update: jest.fn(),
                create: jest.fn(),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
            ...overrides,
        };

        return { service: new DataService(prisma), prisma };
    };

    beforeEach(() => jest.clearAllMocks());

    describe('exportData', () => {
        it('throws when user not found', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.exportData('u1')).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('returns exported data', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue({ email: 'e', name: 'n' });
            prisma.expense.findMany.mockResolvedValue([{ id: 'e1' }]);
            prisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'm1' }]);
            prisma.balanceHistory.findMany.mockResolvedValue([{ id: 'b1' }]);
            prisma.appSettings.findUnique.mockResolvedValue({ id: 'a1' });

            await expect(service.exportData('u1')).resolves.toEqual({
                user: { email: 'e', name: 'n' },
                expenses: [{ id: 'e1' }],
                categories: [{ id: 'c1' }],
                moneySources: [{ id: 'm1' }],
                balanceHistories: [{ id: 'b1' }],
                appSettings: { id: 'a1' },
            });
        });
    });

    describe('importData', () => {
        it('runs with empty payload (no-ops)', async () => {
            const { service, prisma } = makeService();
            await expect(service.importData('u1', {} as any)).resolves.toBeUndefined();
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('updates/creates app settings depending on existence and imports collections', async () => {
            const { service, prisma } = makeService();

            // existing settings => update
            prisma.appSettings.findUnique.mockResolvedValueOnce({ id: 'existing' });

            await service.importData('u1', {
                user: { email: 'e', name: 'n' },
                appSettings: { preferredCurrency: 'USD', hideAmounts: false, themePreference: 'dark' },
                moneySources: [{ id: 'ms1', name: 'Cash', balance: 1, currency: 'USD', icon: 'x', isDefault: true, budget: 0 }],
                categories: [
                    { id: 'c1', name: 'Food', icon: 'x', isDefault: false },
                    { id: 'default', name: 'Default', icon: 'd', isDefault: true },
                ],
                expenses: [{ id: 'e1', amount: 1, date: '2025-01-01T00:00:00.000Z', categoryId: 'c1', moneySourceId: 'ms1' }],
                balanceHistories: [{ id: 'b1', date: '2025-01-01T00:00:00.000Z', balance: 1, amount: 1, currency: 'USD', moneySourceId: 'ms1' }],
            } as any);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'u1' },
                data: { email: 'e', name: 'n' },
            });

            expect(prisma.appSettings.update).toHaveBeenCalled();
            expect(prisma.moneySource.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
            expect(prisma.moneySource.create).toHaveBeenCalled();

            expect(prisma.category.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'u1', isDefault: false },
            });
            // should not create default category
            expect(prisma.category.create).toHaveBeenCalledTimes(1);

            expect(prisma.expense.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
            expect(prisma.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ date: expect.any(Date) }),
                }),
            );

            expect(prisma.balanceHistory.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
            expect(prisma.balanceHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ date: expect.any(Date) }),
                }),
            );

            // now no settings => create
            prisma.appSettings.findUnique.mockResolvedValueOnce(null);
            await service.importData('u1', { appSettings: { preferredCurrency: 'ETB', hideAmounts: true, themePreference: 'light' } } as any);
            expect(prisma.appSettings.create).toHaveBeenCalled();
        });
    });
});
