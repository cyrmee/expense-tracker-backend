import { MoneySourcesController } from './money-sources.controller';
import { MoneySourcesService } from './money-sources.service';

describe('MoneySourcesController', () => {
  const makeController = (overrides?: Partial<MoneySourcesService>) => {
    const moneySourcesService: any = {
      getMoneySources: jest.fn(),
      getMoneySource: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      addFunds: jest.fn(),
      remove: jest.fn(),
      ...overrides,
    };

    const controller = new MoneySourcesController(
      moneySourcesService as MoneySourcesService,
    );

    return { controller, moneySourcesService };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMoneySources delegates to service with req.user.id', async () => {
    const { controller, moneySourcesService } = makeController();
    moneySourcesService.getMoneySources.mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 10,
      hasMore: false,
    });

    const res = await controller.getMoneySources(
      { user: { id: 'u1' } } as any,
      { page: 1, pageSize: 10 } as any,
    );

    expect(moneySourcesService.getMoneySources).toHaveBeenCalledWith('u1', {
      page: 1,
      pageSize: 10,
    });
    expect(res).toEqual({ data: [], page: 1, pageSize: 10, hasMore: false });
  });

  it('findOne delegates to service', async () => {
    const { controller, moneySourcesService } = makeController();
    moneySourcesService.getMoneySource.mockResolvedValue({ id: 'ms1' });

    const res = await controller.findOne('ms1', { user: { id: 'u1' } } as any);

    expect(moneySourcesService.getMoneySource).toHaveBeenCalledWith('ms1', 'u1');
    expect(res).toEqual({ id: 'ms1' });
  });

  it('create returns message', async () => {
    const { controller, moneySourcesService } = makeController();

    const res = await controller.create(
      { name: 'Cash' } as any,
      { user: { id: 'u1' } } as any,
    );

    expect(moneySourcesService.create).toHaveBeenCalledWith({ name: 'Cash' }, 'u1');
    expect(res).toEqual({ message: 'Money source created successfully' });
  });

  it('update returns message', async () => {
    const { controller, moneySourcesService } = makeController();

    const res = await controller.update(
      'ms1',
      { name: 'Card' } as any,
      { user: { id: 'u1' } } as any,
    );

    expect(moneySourcesService.update).toHaveBeenCalledWith('ms1', { name: 'Card' }, 'u1');
    expect(res).toEqual({ message: 'Money source updated successfully' });
  });

  it('addFunds returns message and reminderForBudget', async () => {
    const { controller, moneySourcesService } = makeController();
    moneySourcesService.addFunds.mockResolvedValue({ reminderForBudget: false });

    const res = await controller.addFunds(
      'ms1',
      { amount: 10 } as any,
      { user: { id: 'u1' } } as any,
    );

    expect(moneySourcesService.addFunds).toHaveBeenCalledWith('ms1', 10, 'u1');
    expect(res).toEqual({
      message: 'Funds added successfully',
      reminderForBudget: false,
    });
  });

  it('remove returns message', async () => {
    const { controller, moneySourcesService } = makeController();

    const res = await controller.remove('ms1', { user: { id: 'u1' } } as any);

    expect(moneySourcesService.remove).toHaveBeenCalledWith('ms1', 'u1');
    expect(res).toEqual({ message: 'Money source deleted successfully' });
  });
});
