import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
    const makeService = (overrides?: any) => {
        const prisma: any = {
            expense: { findMany: jest.fn() },
            moneySource: { findMany: jest.fn() },
            appSettings: { findUnique: jest.fn() },
            balanceHistory: { findMany: jest.fn() },
            ...overrides?.prisma,
        };

        const exchangeRatesService: any = {
            convertAmount: jest.fn(async (amount: number) => amount),
            ...overrides?.exchangeRatesService,
        };

        return { service: new DashboardService(prisma, exchangeRatesService), prisma, exchangeRatesService };
    };

    beforeEach(() => jest.clearAllMocks());

    it('getOverview converts amounts and computes utilization', async () => {
        const { service, prisma, exchangeRatesService } = makeService();
        prisma.expense.findMany.mockResolvedValue([
            { amount: 10, moneySource: { currency: 'USD' } },
            { amount: 5, moneySource: { currency: 'EUR' } },
        ]);
        prisma.moneySource.findMany.mockResolvedValue([
            { budget: 100, balance: 50, currency: 'USD' },
            { budget: 0, balance: 10, currency: 'EUR' },
        ]);
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        exchangeRatesService.convertAmount.mockImplementation(async (amount: number) => amount);

        const res = await service.getOverview('u1');
        expect(exchangeRatesService.convertAmount).toHaveBeenCalled();
        expect(res.totalExpenses).toBe(15);
        expect(res.totalBudget).toBe(100);
        expect(res.totalBalance).toBe(60);
        expect(res.budgetUtilization).toBeCloseTo(15);
    });

    it('getOverview returns utilization 0 when budget is 0', async () => {
        const { service, prisma } = makeService();
        prisma.expense.findMany.mockResolvedValue([{ amount: 10, moneySource: { currency: 'USD' } }]);
        prisma.moneySource.findMany.mockResolvedValue([{ budget: 0, balance: 0, currency: 'USD' }]);
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });

        const res = await service.getOverview('u1');
        expect(res.budgetUtilization).toBe(0);
    });

    it('getTrends groups by month and week', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });

        prisma.expense.findMany.mockResolvedValue([
            { amount: 10, date: new Date('2026-01-02T00:00:00Z'), moneySource: { currency: 'USD' } },
            { amount: 5, date: new Date('2026-01-08T00:00:00Z'), moneySource: { currency: 'USD' } },
        ]);

        const res = await service.getTrends('u1');
        expect(res.monthlyTrends).toHaveLength(1);
        expect(res.weeklyTrends.length).toBeGreaterThanOrEqual(1);
    });

    it('getExpenseComposition handles 0 total spending', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        prisma.expense.findMany.mockResolvedValue([]);

        const res = await service.getExpenseComposition('u1');
        expect(res.categoryBreakdown).toEqual([]);
    });

    it('getExpenseComposition calculates percentages', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        prisma.expense.findMany.mockResolvedValue([
            { amount: 10, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
            { amount: 10, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
            { amount: 10, category: { name: 'Rent' }, moneySource: { currency: 'USD' } },
        ]);

        const res = await service.getExpenseComposition('u1');
        const food = res.categoryBreakdown.find((c: any) => c.category === 'Food');
        expect(food).toBeDefined();
        expect(food!.percentage).toBeCloseTo((20 / 30) * 100);
    });

    it('getBudgetComparison computes remaining percentage with zero budget', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        prisma.moneySource.findMany.mockResolvedValue([
            { name: 'Cash', currency: 'USD', budget: 0, expenses: [{ amount: 10 }] },
        ]);

        const res = await service.getBudgetComparison('u1');
        expect(res.comparisons[0].remainingPercentage).toBe(0);
    });

    it('getExpensesOverview returns top categories and totals', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });

        prisma.expense.findMany
            .mockResolvedValueOnce([
                { amount: 10, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
                { amount: 5, category: { name: 'Food' }, moneySource: { currency: 'USD' } },
                { amount: 20, category: { name: 'Rent' }, moneySource: { currency: 'USD' } },
            ])
            .mockResolvedValueOnce([
                { amount: 100, category: { name: 'Rent' }, moneySource: { currency: 'USD' } },
            ]);

        const res = await service.getExpensesOverview('u1', 'this-month');
        expect(res.thisMonth.total).toBe(35);
        expect(res.yearToDate.total).toBe(100);
        expect(res.topCategories).toHaveLength(2);
    });

    it('getTotalBalance handles year-to-date comparison and calculates percentage change', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        prisma.moneySource.findMany.mockResolvedValue([
            { id: 'ms1', name: 'Cash', balance: 200, currency: 'USD' },
        ]);
        prisma.balanceHistory.findMany.mockResolvedValue([
            { moneySourceId: 'ms1', balance: 100, date: new Date('2025-12-01T00:00:00Z') },
        ]);

        const res = await service.getTotalBalance('u1', 'year-to-date');
        expect(res.totalBalance).toBe(200);
        expect(res.moneySources[0].percentageChange).toBe(100);
    });

    it('getTotalBalance returns 0 change when previous balance is 0 or missing', async () => {
        const { service, prisma } = makeService();
        prisma.appSettings.findUnique.mockResolvedValue({ preferredCurrency: 'USD' });
        prisma.moneySource.findMany.mockResolvedValue([
            { id: 'ms1', name: 'Cash', balance: 10, currency: 'USD' },
        ]);
        prisma.balanceHistory.findMany.mockResolvedValue([
            { moneySourceId: 'ms1', balance: 0, date: new Date('2025-12-01T00:00:00Z') },
        ]);

        const res = await service.getTotalBalance('u1');
        expect(res.moneySources[0].percentageChange).toBe(0);
    });
});
