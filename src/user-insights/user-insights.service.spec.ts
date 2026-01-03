import { UserInsightsService } from './user-insights.service';

describe('UserInsightsService', () => {
    const makeService = (overrides?: any) => {
        const prisma: any = {
            expense: {
                findMany: jest.fn(),
                groupBy: jest.fn(),
            },
            appSettings: {
                findUnique: jest.fn(),
            },
            ...overrides?.prisma,
        };

        const exchangeRatesService: any = {
            convertAmount: jest.fn(async (amount: number) => amount),
            ...overrides?.exchangeRatesService,
        };

        const aiService: any = {
            generateUserInsights: jest.fn(async () => 'insight'),
            ...overrides?.aiService,
        };

        return {
            service: new UserInsightsService(prisma, exchangeRatesService, aiService),
            prisma,
            exchangeRatesService,
            aiService,
        };
    };

    beforeEach(() => jest.clearAllMocks());

    it('returns early when not enough comparison users', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });

        prisma.expense.findMany.mockResolvedValueOnce([
            { amount: 10, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
        ]);

        prisma.expense.groupBy.mockResolvedValueOnce([{ userId: 'o1' }, { userId: 'o2' }]);

        const res = await service.compareSpendingPatterns('u1', 3);
        expect(res.categoryComparisons).toEqual([]);
        expect(res.comparisonUserCount).toBe(2);
        expect(res.currency).toBe('USD');
    });

    it('computes comparisons and caps extreme percentages, returning AI insights', async () => {
        const { service, prisma, exchangeRatesService, aiService } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });

        prisma.expense.groupBy.mockResolvedValueOnce([
            { userId: 'o1' },
            { userId: 'o2' },
            { userId: 'o3' },
        ]);

        // getUserExpensesByCategory: a large amount to trigger cap
        prisma.expense.findMany.mockResolvedValueOnce([
            { amount: 3000, category: { name: 'Food' }, moneySource: { currency: 'EUR' } },
        ]);

        // getOtherUsersExpensesByCategory
        prisma.expense.groupBy.mockResolvedValueOnce([
            { userId: 'o1' },
            { userId: 'o2' },
            { userId: 'o3' },
        ]);
        prisma.expense.findMany.mockResolvedValueOnce([
            { amount: 10, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
            { amount: 10, category: { name: 'Rent' }, moneySource: { currency: 'USD' } },
            { amount: 10, category: { name: 'Rent' }, moneySource: { currency: 'USD' } },
        ]);

        exchangeRatesService.convertAmount.mockImplementation(async (amount: number) => amount);

        const res = await service.compareSpendingPatterns('u1', 3);

        expect(exchangeRatesService.convertAmount).toHaveBeenCalled();
        expect(aiService.generateUserInsights).toHaveBeenCalled();
        // should be capped at 500
        expect(res.overallDifferencePercentage).toBeLessThanOrEqual(500);
        expect(res.insights).toBe('insight');
        expect(res.categoryComparisons.length).toBeGreaterThanOrEqual(1);
    });

    it('rethrows errors from prisma', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockRejectedValue(new Error('db'));
        await expect(service.compareSpendingPatterns('u1')).rejects.toThrow('db');
    });
});
