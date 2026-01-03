import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
    const makeController = () => {
        const dashboardService: any = {
            getOverview: jest.fn().mockResolvedValue({ o: 1 }),
            getTrends: jest.fn().mockResolvedValue({ t: 1 }),
            getExpenseComposition: jest.fn().mockResolvedValue({ c: 1 }),
            getBudgetComparison: jest.fn().mockResolvedValue({ b: 1 }),
            getExpensesOverview: jest.fn().mockResolvedValue({ e: 1 }),
            getTotalBalance: jest.fn().mockResolvedValue({ tb: 1 }),
        };
        return { controller: new DashboardController(dashboardService), dashboardService };
    };

    it('delegates to service methods', async () => {
        const { controller, dashboardService } = makeController();
        const req: any = { user: { id: 'u1' } };

        await expect(controller.getOverview(req)).resolves.toEqual({ o: 1 });
        await expect(controller.getTrends(req)).resolves.toEqual({ t: 1 });
        await expect(controller.getExpenseComposition(req)).resolves.toEqual({ c: 1 });
        await expect(controller.getBudgetComparison(req)).resolves.toEqual({ b: 1 });
        await expect(controller.getExpensesOverview('this-month', req)).resolves.toEqual({ e: 1 });
        await expect(controller.getTotalBalance('year-to-date', req)).resolves.toEqual({ tb: 1 });

        expect(dashboardService.getOverview).toHaveBeenCalledWith('u1');
        expect(dashboardService.getTrends).toHaveBeenCalledWith('u1');
        expect(dashboardService.getExpenseComposition).toHaveBeenCalledWith('u1');
        expect(dashboardService.getBudgetComparison).toHaveBeenCalledWith('u1');
        expect(dashboardService.getExpensesOverview).toHaveBeenCalledWith('u1', 'this-month');
        expect(dashboardService.getTotalBalance).toHaveBeenCalledWith('u1', 'year-to-date');
    });
});
