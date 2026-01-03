import { NotFoundException } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

describe('ExpensesController', () => {
  const makeController = (overrides?: Partial<ExpensesService>) => {
    const expensesService: any = {
      getExpenses: jest.fn(),
      getExpense: jest.fn(),
      create: jest.fn(),
      createFromText: jest.fn(),
      update: jest.fn(),
      bulkRemove: jest.fn(),
      remove: jest.fn(),
      ...overrides,
    };

    const controller = new ExpensesController(expensesService as ExpensesService);
    return { controller, expensesService };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUserExpenses delegates to service with req.user.id', async () => {
    const { controller, expensesService } = makeController();
    expensesService.getExpenses.mockResolvedValue({ data: [], page: 1, pageSize: 10, hasMore: false });

    const res = await controller.getUserExpenses(
      { user: { id: 'u1' } } as any,
      { page: 1, pageSize: 10 } as any,
    );

    expect(expensesService.getExpenses).toHaveBeenCalledWith('u1', { page: 1, pageSize: 10 });
    expect(res).toEqual({ data: [], page: 1, pageSize: 10, hasMore: false });
  });

  it('getExpenseDetails delegates to service', async () => {
    const { controller, expensesService } = makeController();
    expensesService.getExpense.mockResolvedValue({ id: 'e1' });

    const res = await controller.getExpenseDetails('e1', { user: { id: 'u1' } } as any);

    expect(expensesService.getExpense).toHaveBeenCalledWith('e1', 'u1');
    expect(res).toEqual({ id: 'e1' });
  });

  it('create returns success message', async () => {
    const { controller, expensesService } = makeController();

    const res = await controller.create({ amount: 1 } as any, { user: { id: 'u1' } } as any);

    expect(expensesService.create).toHaveBeenCalled();
    expect(res).toEqual({ message: 'Expense created successfully' });
  });

  it('createFromText returns parsed expense', async () => {
    const { controller, expensesService } = makeController();
    expensesService.createFromText.mockResolvedValue({ amount: 10, categoryId: 'c1', moneySourceId: 'm1' });

    const res = await controller.createFromText(
      { text: 'lunch 10' } as any,
      { user: { id: 'u1' } } as any,
    );

    expect(expensesService.createFromText).toHaveBeenCalledWith('lunch 10', 'u1');
    expect(res).toEqual({ amount: 10, categoryId: 'c1', moneySourceId: 'm1' });
  });

  it('update throws NotFoundException when id missing', async () => {
    const { controller } = makeController();

    await expect(controller.update('', {} as any, { user: { id: 'u1' } } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update returns success message', async () => {
    const { controller, expensesService } = makeController();

    const res = await controller.update('e1', { notes: 'x' } as any, { user: { id: 'u1' } } as any);

    expect(expensesService.update).toHaveBeenCalledWith('e1', { notes: 'x' }, 'u1');
    expect(res).toEqual({ message: 'Expense updated successfully' });
  });

  it('bulkRemove returns success message', async () => {
    const { controller, expensesService } = makeController();

    const res = await controller.bulkRemove({ ids: ['e1', 'e2'] } as any, { user: { id: 'u1' } } as any);

    expect(expensesService.bulkRemove).toHaveBeenCalledWith(['e1', 'e2'], 'u1');
    expect(res).toEqual({ message: 'Expenses deleted successfully' });
  });

  it('remove returns success message', async () => {
    const { controller, expensesService } = makeController();

    const res = await controller.remove('e1', { user: { id: 'u1' } } as any);

    expect(expensesService.remove).toHaveBeenCalledWith('e1', 'u1');
    expect(res).toEqual({ message: 'Expense deleted successfully' });
  });
});
