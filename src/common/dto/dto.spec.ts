import { CurrencyAmountBaseDto } from './currency-amount.base.dto';
import { PaginatedRequestDto, QueryBuilder, SortOrder } from './paginated-request.dto';

describe('Common DTO helpers', () => {
    describe('CurrencyAmountBaseDto', () => {
        class TestDto extends CurrencyAmountBaseDto {
            constructor(
                private readonly currency: string,
                private readonly amount: number,
            ) {
                super();
            }

            getCurrency(): string {
                return this.currency;
            }

            getAmount(): number {
                return this.amount;
            }
        }

        it('returns undefined when converter or preferred currency missing', async () => {
            const dto = new TestDto('USD', 10);
            await expect(dto.getAmountInPreferredCurrency()).resolves.toBeUndefined();

            dto.setUserPreferredCurrency('ETB');
            await expect(dto.getAmountInPreferredCurrency()).resolves.toBeUndefined();

            dto.setCurrencyConverter({ convertAmount: jest.fn() } as any);
            dto.setUserPreferredCurrency(undefined as any);
            await expect(dto.getAmountInPreferredCurrency()).resolves.toBeUndefined();
        });

        it('returns undefined when already in preferred currency', async () => {
            const dto = new TestDto('USD', 10)
                .setCurrencyConverter({ convertAmount: jest.fn() } as any)
                .setUserPreferredCurrency('USD');

            await expect(dto.getAmountInPreferredCurrency()).resolves.toBeUndefined();
        });

        it('returns undefined when conversion yields null/0 and number when successful', async () => {
            const convertAmount = jest
                .fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(12.5);

            const dto = new TestDto('USD', 10)
                .setCurrencyConverter({ convertAmount } as any)
                .setUserPreferredCurrency('ETB');

            await expect(dto.getAmountInPreferredCurrency()).resolves.toBeUndefined();
            await expect(dto.getAmountInPreferredCurrency()).resolves.toBe(12.5);
        });
    });

    describe('QueryBuilder', () => {
        it('builds where condition with all optional filters', () => {
            const dto = new PaginatedRequestDto<any>();
            dto.page = 2;
            dto.pageSize = 20;
            dto.sortOrder = SortOrder.ASC;
            dto.filterField = 'type';
            dto.filterValue = 'expense';
            dto.rangeField = 'amount';
            dto.minValue = 10;
            dto.maxValue = 50;
            dto.multiValueField = 'categoryId';
            dto.multiValues = ['c1', 'c2'];
            dto.dateField = 'createdAt';
            dto.startDate = '2025-01-01';
            dto.endDate = '2025-01-31';

            const where = QueryBuilder.buildWhereCondition(dto, 'u1');

            expect(where).toEqual(
                expect.objectContaining({
                    userId: 'u1',
                    type: 'expense',
                    amount: { gte: 10, lte: 50 },
                    categoryId: { in: ['c1', 'c2'] },
                    createdAt: {
                        gte: new Date('2025-01-01'),
                        lte: new Date('2025-01-31'),
                    },
                }),
            );
        });

        it('builds where condition with minimal inputs', () => {
            const dto = new PaginatedRequestDto<any>();
            dto.filterField = 'name';
            dto.filterValue = undefined;

            expect(QueryBuilder.buildWhereCondition(dto)).toEqual({});
            expect(QueryBuilder.buildWhereCondition(dto, 'u1')).toEqual({ userId: 'u1' });
        });
    });
});
