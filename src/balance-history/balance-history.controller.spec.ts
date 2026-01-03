import { BalanceHistoryController } from './balance-history.controller';
import { BalanceHistoryService } from './balance-history.service';

describe('BalanceHistoryController', () => {
    const makeController = (overrides?: Partial<BalanceHistoryService>) => {
        const balanceHistoryService: any = {
            getBalanceHistories: jest.fn(),
            getBalanceHistory: jest.fn(),
            ...overrides,
        };

        const controller = new BalanceHistoryController(
            balanceHistoryService as BalanceHistoryService,
        );

        return { controller, balanceHistoryService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getBalanceHistories delegates to service with req.user.id', async () => {
        const { controller, balanceHistoryService } = makeController();
        balanceHistoryService.getBalanceHistories.mockResolvedValue({
            data: [],
            page: 1,
            pageSize: 10,
            hasMore: false,
        });

        const res = await controller.getBalanceHistories(
            { user: { id: 'u1' } } as any,
            { page: 1, pageSize: 10 } as any,
        );

        expect(balanceHistoryService.getBalanceHistories).toHaveBeenCalledWith('u1', {
            page: 1,
            pageSize: 10,
        });
        expect(res).toEqual({ data: [], page: 1, pageSize: 10, hasMore: false });
    });

    it('getBalanceHistory delegates to service', async () => {
        const { controller, balanceHistoryService } = makeController();
        balanceHistoryService.getBalanceHistory.mockResolvedValue({ id: 'h1' });

        const res = await controller.getBalanceHistory(
            'h1',
            { user: { id: 'u1' } } as any,
        );

        expect(balanceHistoryService.getBalanceHistory).toHaveBeenCalledWith('h1', 'u1');
        expect(res).toEqual({ id: 'h1' });
    });
});
