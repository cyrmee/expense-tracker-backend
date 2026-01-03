import { NotFoundException } from '@nestjs/common';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceHistoryService } from './balance-history.service';

describe('BalanceHistoryService', () => {
    const makeService = (overrides?: {
        prisma?: Partial<PrismaService>;
        currencyConverter?: Partial<CurrencyConverter>;
    }) => {
        const prisma: any = {
            balanceHistory: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
            },
            ...overrides?.prisma,
        };

        const currencyConverter: any = {
            convertAmount: jest.fn(),
            ...overrides?.currencyConverter,
        };

        const service = new BalanceHistoryService(
            prisma as PrismaService,
            currencyConverter as CurrencyConverter,
        );

        return { service, prisma, currencyConverter };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getBalanceHistory throws when record missing', async () => {
        const { service, prisma } = makeService();
        prisma.balanceHistory.findFirst.mockResolvedValue(null);

        await expect(service.getBalanceHistory('h1', 'u1')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('create converts balanceInPreferredCurrency when currency differs', async () => {
        const { service, prisma, currencyConverter } = makeService();

        prisma.balanceHistory.create.mockResolvedValue({
            id: 'h1',
            balance: 100,
            amount: 100,
            currency: 'EUR',
            date: new Date('2025-01-01T00:00:00.000Z'),
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            moneySource: { id: 'ms1' },
            user: { appSettings: { preferredCurrency: 'USD' } },
        });

        currencyConverter.convertAmount.mockResolvedValue(110);

        const dto = await service.create({
            userId: 'u1',
            moneySourceId: 'ms1',
            balance: 100,
            amount: 100,
            currency: 'EUR',
            date: new Date('2025-01-01T00:00:00.000Z') as any,
        } as any);

        expect(currencyConverter.convertAmount).toHaveBeenCalledWith(100, 'EUR', 'USD');
        expect(dto.balanceInPreferredCurrency).toBe(110);
    });

    it('getBalanceHistories sets hasMore and slices to pageSize', async () => {
        const { service, prisma } = makeService();

        prisma.balanceHistory.findMany.mockResolvedValue([
            {
                id: 'h1',
                balance: 1,
                currency: 'USD',
                user: { appSettings: { preferredCurrency: 'USD' } },
            },
            {
                id: 'h2',
                balance: 2,
                currency: 'USD',
                user: { appSettings: { preferredCurrency: 'USD' } },
            },
            {
                id: 'h3',
                balance: 3,
                currency: 'USD',
                user: { appSettings: { preferredCurrency: 'USD' } },
            },
        ]);

        const res = await service.getBalanceHistories('u1', {
            page: 1,
            pageSize: 2,
        } as any);

        expect(res.hasMore).toBe(true);
        expect(res.data).toHaveLength(2);
    });
});
