import { CurrencyConverter } from './currency-converter.util';

describe('CurrencyConverter', () => {
    it('getExchangeRate returns rate or null', async () => {
        const prisma: any = {
            exchangeRate: {
                findUnique: jest.fn().mockResolvedValueOnce({ rate: 1.23 }).mockResolvedValueOnce(null),
            },
        };

        const converter = new CurrencyConverter(prisma);
        await expect(converter.getExchangeRate('USD')).resolves.toBe(1.23);
        await expect(converter.getExchangeRate('EUR')).resolves.toBeNull();
    });

    it('convertAmount returns amount when currencies match', async () => {
        const converter = new CurrencyConverter({ exchangeRate: { findUnique: jest.fn() } } as any);
        await expect(converter.convertAmount(10, 'USD', 'USD')).resolves.toBe(10);
    });

    it('convertAmount returns null when a rate is missing', async () => {
        const prisma: any = {
            exchangeRate: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
        };
        const converter = new CurrencyConverter(prisma);
        await expect(converter.convertAmount(10, 'USD', 'EUR')).resolves.toBeNull();
    });

    it('convertAmount converts through USD base', async () => {
        const prisma: any = {
            exchangeRate: {
                findUnique: jest
                    .fn()
                    .mockImplementation(async ({ where }: any) => {
                        if (where.id === 'USD') return { rate: 1 };
                        if (where.id === 'EUR') return { rate: 2 };
                        return null;
                    }),
            },
        };
        const converter = new CurrencyConverter(prisma);
        await expect(converter.convertAmount(10, 'USD', 'EUR')).resolves.toBe(20);
        await expect(converter.convertAmount(10, 'EUR', 'USD')).resolves.toBe(5);
    });
});
