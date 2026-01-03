import { NotFoundException } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

describe('ExchangeRatesController', () => {
    const makeController = (overrides?: Partial<ExchangeRatesService>) => {
        const exchangeRatesService: any = {
            getExchangeRates: jest.fn(),
            getExchangeRate: jest.fn(),
            ...overrides,
        };

        const controller = new ExchangeRatesController(
            exchangeRatesService as ExchangeRatesService,
        );

        return { controller, exchangeRatesService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getAllExchangeRates delegates to service', async () => {
        const { controller, exchangeRatesService } = makeController();
        exchangeRatesService.getExchangeRates.mockResolvedValue([{ id: 'USD' }]);

        const res = await controller.getAllExchangeRates();

        expect(exchangeRatesService.getExchangeRates).toHaveBeenCalled();
        expect(res).toEqual([{ id: 'USD' }]);
    });

    it('getExchangeRate throws when rate missing', async () => {
        const { controller, exchangeRatesService } = makeController();
        exchangeRatesService.getExchangeRate.mockResolvedValue(null);

        await expect(controller.getExchangeRate('USD')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('getExchangeRate returns rate when found', async () => {
        const { controller, exchangeRatesService } = makeController();
        exchangeRatesService.getExchangeRate.mockResolvedValue({ currency: 'USD' });

        await expect(controller.getExchangeRate('USD')).resolves.toEqual({
            currency: 'USD',
        });
    });
});
