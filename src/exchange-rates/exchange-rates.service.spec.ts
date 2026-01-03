import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from './exchange-rates.service';

jest.mock('axios');

describe('ExchangeRatesService', () => {
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    const makeConfig = (overrides?: Record<string, string | undefined>) => {
        const config: Record<string, string | undefined> = {
            OPENEXCHANGERATES_APP_ID: 'app-id',
            OPENEXCHANGERATES_API_URL: 'https://example.com/latest.json',
            ...overrides,
        };

        return {
            get: jest.fn((key: string) => config[key]),
        } as unknown as ConfigService;
    };

    const makePrisma = () => {
        return {
            exchangeRate: {
                upsert: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
        } as unknown as PrismaService;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('throws when OPENEXCHANGERATES_APP_ID is missing', () => {
        expect(
            () => new ExchangeRatesService(makePrisma(), makeConfig({ OPENEXCHANGERATES_APP_ID: undefined })),
        ).toThrow('OPENEXCHANGERATES_APP_ID environment variable is not defined');
    });

    it('throws when OPENEXCHANGERATES_API_URL is missing', () => {
        expect(
            () => new ExchangeRatesService(makePrisma(), makeConfig({ OPENEXCHANGERATES_API_URL: undefined })),
        ).toThrow('OPENEXCHANGERATES_API_URL environment variable is not defined');
    });

    it('convertAmount returns same amount when currencies match', async () => {
        const service = new ExchangeRatesService(makePrisma(), makeConfig());

        await expect(service.convertAmount(123.45, 'USD', 'USD')).resolves.toBe(
            123.45,
        );
    });

    it('convertAmount converts and rounds to 2 decimals (non-ETB)', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findUnique = jest
            .fn()
            .mockImplementation(async ({ where }: any) => {
                if (where.id === 'USD') return { id: 'USD', rate: 1 };
                if (where.id === 'EUR') return { id: 'EUR', rate: 0.91 };
                return null;
            });

        const service = new ExchangeRatesService(prisma, makeConfig());

        const result = await service.convertAmount(10, 'USD', 'EUR');
        expect(result).toBe(9.1);
    });

    it('convertAmount returns original amount when a rate is missing', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findUnique = jest.fn().mockResolvedValue(null);

        const service = new ExchangeRatesService(prisma, makeConfig());
        await expect(service.convertAmount(10, 'USD', 'EUR')).resolves.toBe(10);
    });

    it('convertAmount returns original amount when prisma throws', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findUnique = jest.fn().mockRejectedValue(new Error('db'));

        const service = new ExchangeRatesService(prisma, makeConfig());
        await expect(service.convertAmount(10, 'USD', 'EUR')).resolves.toBe(10);
    });

    it('convertAmount rounds ETB to whole numbers', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findUnique = jest
            .fn()
            .mockImplementation(async ({ where }: any) => {
                if (where.id === 'USD') return { id: 'USD', rate: 1 };
                if (where.id === 'ETB') return { id: 'ETB', rate: 56.6 };
                return null;
            });

        const service = new ExchangeRatesService(prisma, makeConfig());

        const result = await service.convertAmount(10, 'USD', 'ETB');
        expect(result).toBe(566);
    });

    it('updateExchangeRates upserts each returned rate', async () => {
        const prisma = makePrisma();
        const config = makeConfig();

        mockedAxios.get.mockResolvedValue({
            data: {
                base: 'USD',
                timestamp: 1700000000,
                rates: {
                    USD: 1,
                    EUR: 0.9,
                },
            },
        } as any);

        const service = new ExchangeRatesService(prisma, config);
        await service.updateExchangeRates();

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://example.com/latest.json?app_id=app-id',
        );

        expect(prisma.exchangeRate.upsert).toHaveBeenCalledTimes(2);
        expect(prisma.exchangeRate.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'USD' } }),
        );
        expect(prisma.exchangeRate.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'EUR' } }),
        );
    });

    it('updateExchangeRates swallows errors', async () => {
        const prisma = makePrisma();
        const config = makeConfig();

        mockedAxios.get.mockRejectedValue(new Error('network'));

        const service = new ExchangeRatesService(prisma, config);
        await expect(service.updateExchangeRates()).resolves.toBeUndefined();
    });

    it('onModuleInit triggers updateExchangeRates', async () => {
        const service = new ExchangeRatesService(makePrisma(), makeConfig());
        const spy = jest.spyOn(service, 'updateExchangeRates').mockResolvedValue();
        await service.onModuleInit();
        expect(spy).toHaveBeenCalled();
    });

    it('manualUpdate triggers update and returns message', async () => {
        const service = new ExchangeRatesService(makePrisma(), makeConfig());
        jest.spyOn(service, 'updateExchangeRates').mockResolvedValue();

        await expect(service.manualUpdate()).resolves.toEqual({
            message: 'Exchange rates update triggered',
        });
    });

    it('getExchangeRates returns prisma results and rethrows errors', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findMany = jest.fn().mockResolvedValue([{ id: 'USD' }]);
        const service = new ExchangeRatesService(prisma, makeConfig());

        await expect(service.getExchangeRates()).resolves.toEqual([{ id: 'USD' }]);

        prisma.exchangeRate.findMany = jest.fn().mockRejectedValue(new Error('db'));
        await expect(service.getExchangeRates()).rejects.toThrow('db');
    });

    it('getExchangeRate returns prisma result and rethrows errors', async () => {
        const prisma = makePrisma();
        prisma.exchangeRate.findUnique = jest.fn().mockResolvedValue({ id: 'USD' });
        const service = new ExchangeRatesService(prisma, makeConfig());

        await expect(service.getExchangeRate('USD')).resolves.toEqual({ id: 'USD' });

        prisma.exchangeRate.findUnique = jest.fn().mockRejectedValue(new Error('db'));
        await expect(service.getExchangeRate('USD')).rejects.toThrow('db');
    });
});
