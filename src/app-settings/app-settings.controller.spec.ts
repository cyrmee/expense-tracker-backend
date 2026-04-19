import { AppSettingsController } from './app-settings.controller';

describe('AppSettingsController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAppSettings returns existing settings', async () => {
    const appSettingsService: any = {
      getAppSettings: jest.fn().mockResolvedValue({ preferredCurrency: 'USD' }),
      create: jest.fn(),
    };

    const controller = new AppSettingsController(appSettingsService);

    await expect(controller.getAppSettings({ user: { id: 'u1' } } as any)).resolves.toEqual({
      preferredCurrency: 'USD',
    });
    expect(appSettingsService.create).not.toHaveBeenCalled();
  });

  it('getAppSettings creates defaults when missing', async () => {
    const appSettingsService: any = {
      getAppSettings: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ preferredCurrency: 'ETB' }),
      create: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new AppSettingsController(appSettingsService);

    await expect(controller.getAppSettings({ user: { id: 'u1' } } as any)).resolves.toEqual({
      preferredCurrency: 'ETB',
    });
    expect(appSettingsService.create).toHaveBeenCalledWith('u1');
  });

  it('update delegates to service with userId and dto', async () => {
    const appSettingsService: any = { update: jest.fn().mockResolvedValue(undefined) };
    const controller = new AppSettingsController(appSettingsService);

    const dto = { preferredCurrency: 'USD' };
    await expect(controller.update(dto as any, { user: { id: 'u1' } } as any)).resolves.toEqual({
      message: 'App settings updated successfully',
    });
    expect(appSettingsService.update).toHaveBeenCalledWith('u1', dto);
  });

  it('remove resets settings', async () => {
    const appSettingsService: any = {
      remove: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AppSettingsController(appSettingsService);

    await expect(controller.remove({ user: { id: 'u1' } } as any)).resolves.toEqual({
      message: 'App settings reset successfully',
    });
    expect(appSettingsService.remove).toHaveBeenCalledWith('u1');
    expect(appSettingsService.create).toHaveBeenCalledWith('u1');
  });
});
