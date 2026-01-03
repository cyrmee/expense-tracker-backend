import { UserInsightsController } from './user-insights.controller';

describe('UserInsightsController', () => {
    it('delegates spending comparison to service', async () => {
        const userInsightsService: any = {
            compareSpendingPatterns: jest.fn().mockResolvedValue({ ok: true }),
        };

        const controller = new UserInsightsController(userInsightsService);

        await expect(controller.compareSpendingPatterns({ user: { id: 'u1' } } as any)).resolves.toEqual({
            ok: true,
        });
        expect(userInsightsService.compareSpendingPatterns).toHaveBeenCalledWith('u1');
    });
});
