import {
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { MoneySourcesService } from './money-sources.service';

describe('MoneySourcesService', () => {
    const makeService = (overrides?: {
        prisma?: Partial<PrismaService>;
        currencyConverter?: Partial<CurrencyConverter>;
    }) => {
        const prisma: any = {
            moneySource: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
                updateMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            balanceHistory: {
                create: jest.fn(),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
            ...overrides?.prisma,
        };

        const currencyConverter: any = {
            convertAmount: jest.fn(),
            ...overrides?.currencyConverter,
        };

        const service = new MoneySourcesService(
            prisma as PrismaService,
            currencyConverter as CurrencyConverter,
        );

        return { service, prisma, currencyConverter };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('throws when budget is negative', async () => {
            const { service } = makeService();

            await expect(
                service.create(
                    {
                        name: 'Cash',
                        balance: 0,
                        currency: 'USD',
                        budget: -1,
                        isDefault: false,
                    } as any,
                    'u1',
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('unsets existing defaults when creating a new default source', async () => {
            const tx: any = {
                moneySource: {
                    updateMany: jest.fn(),
                    create: jest.fn().mockResolvedValue({
                        id: 'ms1',
                        balance: 100,
                        currency: 'USD',
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                },
                balanceHistory: { create: jest.fn() },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });

            await service.create(
                {
                    name: 'Cash',
                    balance: 100,
                    currency: 'USD',
                    isDefault: true,
                } as any,
                'u1',
            );

            expect(tx.moneySource.updateMany).toHaveBeenCalledWith({
                where: { userId: 'u1', isDefault: true },
                data: { isDefault: false },
            });

            expect(tx.balanceHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'u1',
                        moneySourceId: 'ms1',
                        balance: 100,
                        amount: 100,
                        currency: 'USD',
                    }),
                }),
            );
        });
    });

    describe('getMoneySource/getMoneySources', () => {
        it('getMoneySource converts balances when currencies differ', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.moneySource.findFirst.mockResolvedValue({
                id: 'ms1',
                name: 'Cash',
                balance: 100,
                budget: 200,
                currency: 'EUR',
                user: { appSettings: { preferredCurrency: 'USD' } },
                expenses: [],
                balanceHistories: [],
            });

            currencyConverter.convertAmount
                .mockResolvedValueOnce(110) // balance
                .mockResolvedValueOnce(220); // budget

            const dto = await service.getMoneySource('ms1', 'u1');
            expect(currencyConverter.convertAmount).toHaveBeenCalledWith(
                100,
                'EUR',
                'USD',
            );
            expect(currencyConverter.convertAmount).toHaveBeenCalledWith(
                200,
                'EUR',
                'USD',
            );
            expect(dto.balanceInPreferredCurrency).toBe(110);
            expect(dto.budgetInPreferredCurrency).toBe(220);
        });

        it('getMoneySource throws when missing', async () => {
            const { service, prisma } = makeService();
            prisma.moneySource.findFirst.mockResolvedValue(null);

            await expect(service.getMoneySource('ms1', 'u1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('getMoneySources applies search and hasMore logic', async () => {
            const { service, prisma } = makeService();
            prisma.moneySource.findMany.mockResolvedValue([
                {
                    id: 'ms1',
                    name: 'Cash',
                    balance: 1,
                    budget: 0,
                    currency: 'USD',
                    icon: 'x',
                    user: { appSettings: { preferredCurrency: 'USD' } },
                },
                {
                    id: 'ms2',
                    name: 'Bank',
                    balance: 1,
                    budget: 0,
                    currency: 'USD',
                    icon: 'y',
                    user: { appSettings: { preferredCurrency: 'USD' } },
                },
            ]);

            const res = await service.getMoneySources('u1', {
                page: 1,
                pageSize: 1,
                search: 'a',
            } as any);

            expect(prisma.moneySource.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 2,
                    where: expect.objectContaining({ OR: expect.any(Array) }),
                }),
            );
            expect(res.hasMore).toBe(true);
            expect(res.data).toHaveLength(1);
        });
    });

    describe('addFunds', () => {
        it('throws NotFoundException when money source missing', async () => {
            const tx: any = {
                moneySource: {
                    findFirst: jest.fn().mockResolvedValue(null),
                    update: jest.fn(),
                },
                balanceHistory: { create: jest.fn() },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });

            await expect(service.addFunds('ms1', 10, 'u1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('updates balance and creates balance history, returning reminderForBudget=false', async () => {
            const tx: any = {
                moneySource: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'ms1',
                        userId: 'u1',
                        balance: 100,
                        currency: 'USD',
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                    update: jest.fn(),
                },
                balanceHistory: { create: jest.fn() },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });

            const res = await service.addFunds('ms1', 25, 'u1');

            expect(tx.moneySource.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ms1' },
                    data: expect.objectContaining({ balance: 125, updatedAt: expect.any(Date) }),
                }),
            );

            expect(tx.balanceHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'u1',
                        moneySourceId: 'ms1',
                        balance: 125,
                        amount: 25,
                        currency: 'USD',
                    }),
                }),
            );

            expect(res).toEqual({ reminderForBudget: false });
        });
    });

    describe('update/remove', () => {
        it('update throws when id missing', async () => {
            const { service } = makeService();
            await expect(service.update('', {} as any, 'u1')).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('remove throws when getMoneySource fails', async () => {
            const { service } = makeService();
            jest
                .spyOn(service, 'getMoneySource')
                .mockRejectedValue(new NotFoundException('nope'));

            await expect(service.remove('ms1', 'u1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('remove deletes when found', async () => {
            const { service, prisma } = makeService();
            jest.spyOn(service, 'getMoneySource').mockResolvedValue({} as any);

            await service.remove('ms1', 'u1');
            expect(prisma.moneySource.delete).toHaveBeenCalledWith({ where: { id: 'ms1' } });
        });

        it('update unsets existing defaults when setting default and updates record', async () => {
            const tx: any = {
                moneySource: {
                    updateMany: jest.fn(),
                    update: jest.fn(),
                },
            };
            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };
            const { service } = makeService({ prisma });

            jest.spyOn(service, 'getMoneySource').mockResolvedValue({} as any);

            await service.update(
                'ms1',
                { name: 'N', isDefault: true } as any,
                'u1',
            );

            expect(tx.moneySource.updateMany).toHaveBeenCalledWith({
                where: { userId: 'u1', isDefault: true, id: { not: 'ms1' } },
                data: { isDefault: false },
            });
            expect(tx.moneySource.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'ms1' } }),
            );
        });
    });
});
