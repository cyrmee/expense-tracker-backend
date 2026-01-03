import { NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
    const makeService = (overrides?: {
        prisma?: Partial<PrismaService>;
        currencyConverter?: Partial<CurrencyConverter>;
        aiService?: Partial<AiService>;
    }) => {
        const prisma: any = {
            expense: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
            ...overrides?.prisma,
        };

        const currencyConverter: any = {
            convertAmount: jest.fn(),
            ...overrides?.currencyConverter,
        };

        const aiService: any = {
            parseExpenseData: jest.fn(),
            ...overrides?.aiService,
        };

        const service = new ExpensesService(
            prisma as PrismaService,
            currencyConverter as CurrencyConverter,
            aiService as AiService,
        );

        return { service, prisma, currencyConverter, aiService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getExpense', () => {
        it('adds amountInPreferredCurrency when currencies differ', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.expense.findFirst.mockResolvedValue({
                id: 'e1',
                amount: 10,
                date: new Date('2025-01-01T00:00:00.000Z'),
                notes: 'note',
                categoryId: 'c1',
                moneySourceId: 'm1',
                createdAt: new Date('2025-01-01T00:00:00.000Z'),
                updatedAt: new Date('2025-01-02T00:00:00.000Z'),
                moneySource: { id: 'm1', currency: 'EUR' },
                category: { id: 'c1', name: 'Food' },
                user: { appSettings: { preferredCurrency: 'USD' } },
            });

            currencyConverter.convertAmount.mockResolvedValue(12.34);

            const dto = await service.getExpense('e1', 'u1');

            expect(currencyConverter.convertAmount).toHaveBeenCalledWith(
                10,
                'EUR',
                'USD',
            );
            expect(dto.amountInPreferredCurrency).toBe(12.34);
        });

        it('does not convert when currencies match', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.expense.findFirst.mockResolvedValue({
                id: 'e2',
                amount: 10,
                date: new Date('2025-01-01T00:00:00.000Z'),
                notes: 'note',
                categoryId: 'c1',
                moneySourceId: 'm1',
                createdAt: new Date('2025-01-01T00:00:00.000Z'),
                updatedAt: new Date('2025-01-02T00:00:00.000Z'),
                moneySource: { id: 'm1', currency: 'USD' },
                category: { id: 'c1', name: 'Food' },
                user: { appSettings: { preferredCurrency: 'USD' } },
            });

            const dto = await service.getExpense('e2', 'u1');

            expect(currencyConverter.convertAmount).not.toHaveBeenCalled();
            expect(dto.amountInPreferredCurrency).toBeUndefined();
        });

        it('throws NotFoundException when expense missing', async () => {
            const { service, prisma } = makeService();
            prisma.expense.findFirst.mockResolvedValue(null);

            await expect(service.getExpense('missing', 'u1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('sets amountInPreferredCurrency to undefined when conversion fails', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.expense.findFirst.mockResolvedValue({
                id: 'e3',
                amount: 10,
                date: new Date('2025-01-01T00:00:00.000Z'),
                notes: 'note',
                categoryId: 'c1',
                moneySourceId: 'm1',
                createdAt: new Date('2025-01-01T00:00:00.000Z'),
                updatedAt: new Date('2025-01-02T00:00:00.000Z'),
                moneySource: { id: 'm1', currency: 'EUR' },
                category: { id: 'c1', name: 'Food' },
                user: { appSettings: { preferredCurrency: 'USD' } },
            });

            currencyConverter.convertAmount.mockResolvedValue(null);

            const dto = await service.getExpense('e3', 'u1');
            expect(dto.amountInPreferredCurrency).toBeUndefined();
        });
    });

    describe('getExpenses', () => {
        it('applies search OR conditions and returns hasMore=true when extra item exists', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.expense.findMany.mockResolvedValue([
                {
                    id: 'e1',
                    amount: 10,
                    moneySource: { id: 'ms1', currency: 'EUR' },
                    category: { id: 'c1', name: 'Food' },
                    user: { appSettings: { preferredCurrency: 'USD' } },
                },
                {
                    id: 'e2',
                    amount: 20,
                    moneySource: { id: 'ms1', currency: 'EUR' },
                    category: { id: 'c1', name: 'Food' },
                    user: { appSettings: { preferredCurrency: 'USD' } },
                },
            ]);
            currencyConverter.convertAmount.mockResolvedValue(12);

            const res = await service.getExpenses('u1', {
                page: 1,
                pageSize: 1,
                search: 'foo',
                sortBy: undefined,
                sortOrder: undefined,
            } as any);

            expect(prisma.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 2,
                    skip: 0,
                    orderBy: { updatedAt: 'desc' },
                    where: expect.objectContaining({
                        OR: expect.any(Array),
                    }),
                }),
            );

            expect(res.hasMore).toBe(true);
            expect(res.data).toHaveLength(1);
            expect(res.data[0]).toEqual(expect.objectContaining({ id: 'e1' }));
        });

        it('returns hasMore=false when results are within page size and uses default preferred currency when missing', async () => {
            const { service, prisma, currencyConverter } = makeService();

            prisma.expense.findMany.mockResolvedValue([
                {
                    id: 'e1',
                    amount: 10,
                    moneySource: { id: 'ms1', currency: 'USD' },
                    category: { id: 'c1', name: 'Food' },
                    user: { appSettings: null },
                },
            ]);

            const res = await service.getExpenses('u1', {
                page: 2,
                pageSize: 5,
            } as any);

            expect(currencyConverter.convertAmount).not.toHaveBeenCalled();
            expect(res.hasMore).toBe(false);
            expect(res.page).toBe(2);
            expect(res.pageSize).toBe(5);
            expect(res.data).toHaveLength(1);
        });
    });

    describe('createFromText', () => {
        it('returns parsed result from AiService', async () => {
            const { service, aiService } = makeService();

            aiService.parseExpenseData.mockResolvedValue({
                amount: 1,
                date: new Date('2025-01-01T00:00:00.000Z'),
                categoryId: 'c1',
                moneySourceId: 'm1',
                notes: 'n',
            });

            await expect(service.createFromText('text', 'u1')).resolves.toEqual(
                expect.objectContaining({ amount: 1, categoryId: 'c1' }),
            );
        });

        it('wraps AiService errors as NotFoundException', async () => {
            const { service, aiService } = makeService();

            aiService.parseExpenseData.mockRejectedValue(new Error('boom'));

            await expect(service.createFromText('text', 'u1')).rejects.toMatchObject({
                name: 'NotFoundException',
                message: 'boom',
            });
        });
    });

    describe('bulkRemove', () => {
        it('increments balances grouped by money source and deletes expenses', async () => {
            const tx: any = {
                moneySource: { update: jest.fn() },
                expense: { deleteMany: jest.fn() },
            };

            const prisma: any = {
                expense: {
                    findMany: jest.fn().mockResolvedValue([
                        { id: 'e1', amount: 10, moneySource: { id: 'ms1' } },
                        { id: 'e2', amount: 5, moneySource: { id: 'ms1' } },
                        { id: 'e3', amount: 7, moneySource: { id: 'ms2' } },
                    ]),
                },
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });

            await service.bulkRemove(['e1', 'e2', 'e3'], 'u1');

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { increment: 15 } },
            });
            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms2' },
                data: { balance: { increment: 7 } },
            });

            expect(tx.expense.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['e1', 'e2', 'e3'] }, userId: 'u1' },
            });
        });

        it('throws when any expense is missing or not owned', async () => {
            const prisma: any = {
                expense: {
                    findMany: jest.fn().mockResolvedValue([{ id: 'e1', amount: 10 }]),
                },
                $transaction: jest.fn(),
            };

            const { service } = makeService({ prisma });

            await expect(service.bulkRemove(['e1', 'e2'], 'u1')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });
    });

    describe('create', () => {
        it('creates expense and decrements money source balance', async () => {
            const tx: any = {
                expense: {
                    create: jest.fn().mockResolvedValue({
                        amount: 25,
                        moneySourceId: 'ms1',
                        moneySource: { id: 'ms1', currency: 'USD' },
                        category: { id: 'c1' },
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                },
                moneySource: {
                    update: jest.fn(),
                },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });

            await service.create(
                {
                    amount: 25,
                    date: new Date('2025-01-01T00:00:00.000Z'),
                    notes: 'n',
                    categoryId: 'c1',
                    moneySourceId: 'ms1',
                } as any,
                'u1',
            );

            expect(tx.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        amount: 25,
                        category: { connect: { id: 'c1' } },
                        moneySource: { connect: { id: 'ms1' } },
                        user: { connect: { id: 'u1' } },
                    }),
                }),
            );

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { decrement: 25 } },
            });
        });
    });

    describe('update', () => {
        it('adjusts balance by amount difference when money source unchanged', async () => {
            const tx: any = {
                expense: {
                    update: jest.fn().mockResolvedValue({
                        id: 'e1',
                        amount: 15,
                        moneySource: { id: 'ms1' },
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                },
                moneySource: {
                    update: jest.fn(),
                },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });
            jest.spyOn(service, 'getExpense').mockResolvedValue({
                id: 'e1',
                amount: 10,
                moneySource: { id: 'ms1', currency: 'USD' },
            } as any);

            await service.update('e1', { amount: 15 } as any, 'u1');

            // Amount increased by 5 => decrement 5
            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { decrement: 5 } },
            });
        });

        it('restores old balance and deducts from new source when money source changes', async () => {
            const tx: any = {
                expense: {
                    update: jest.fn().mockResolvedValue({
                        id: 'e1',
                        amount: 20,
                        moneySource: { id: 'ms2' },
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                },
                moneySource: {
                    update: jest.fn(),
                },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });
            jest.spyOn(service, 'getExpense').mockResolvedValue({
                id: 'e1',
                amount: 10,
                moneySource: { id: 'ms1', currency: 'USD' },
            } as any);

            await service.update('e1', { moneySourceId: 'ms2', amount: 20 } as any, 'u1');

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { increment: 10 } },
            });

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms2' },
                data: { balance: { decrement: 20 } },
            });
        });

        it('increments balance by difference when new amount is lower', async () => {
            const tx: any = {
                expense: {
                    update: jest.fn().mockResolvedValue({
                        id: 'e1',
                        amount: 5,
                        moneySource: { id: 'ms1' },
                        user: { appSettings: { preferredCurrency: 'USD' } },
                    }),
                },
                moneySource: {
                    update: jest.fn(),
                },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });
            jest.spyOn(service, 'getExpense').mockResolvedValue({
                id: 'e1',
                amount: 10,
                moneySource: { id: 'ms1', currency: 'USD' },
            } as any);

            await service.update('e1', { amount: 5 } as any, 'u1');

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { increment: 5 } },
            });
        });
    });

    describe('remove', () => {
        it('restores money source balance and deletes expense', async () => {
            const tx: any = {
                moneySource: { update: jest.fn() },
                expense: { delete: jest.fn() },
            };

            const prisma: any = {
                $transaction: jest.fn(async (fn: any) => fn(tx)),
            };

            const { service } = makeService({ prisma });
            jest.spyOn(service, 'getExpense').mockResolvedValue({
                id: 'e1',
                amount: 10,
                moneySource: { id: 'ms1' },
            } as any);

            await service.remove('e1', 'u1');

            expect(tx.moneySource.update).toHaveBeenCalledWith({
                where: { id: 'ms1' },
                data: { balance: { increment: 10 } },
            });

            expect(tx.expense.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
        });
    });
});
