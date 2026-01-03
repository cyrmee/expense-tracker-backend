import { AppSettingsController } from './app-settings.controller';
import { CreateAppSettingsCommand, RemoveAppSettingsCommand, UpdateAppSettingsCommand } from './commands/impl';

describe('AppSettingsController', () => {
    beforeEach(() => jest.clearAllMocks());

    it('getAppSettings returns existing settings', async () => {
        const appSettingsService: any = {
            getAppSettings: jest.fn().mockResolvedValue({ preferredCurrency: 'USD' }),
            create: jest.fn(),
        };

        const controller = new AppSettingsController(appSettingsService, {} as any, {} as any);

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

        const controller = new AppSettingsController(appSettingsService, {} as any, {} as any);

        await expect(controller.getAppSettings({ user: { id: 'u1' } } as any)).resolves.toEqual({
            preferredCurrency: 'ETB',
        });
        expect(appSettingsService.create).toHaveBeenCalledWith(expect.any(CreateAppSettingsCommand));
    });

    it('update sets userId and delegates', async () => {
        const appSettingsService: any = { update: jest.fn().mockResolvedValue(undefined) };
        const controller = new AppSettingsController(appSettingsService, {} as any, {} as any);

        const cmd = new UpdateAppSettingsCommand();
        await expect(controller.update(cmd, { user: { id: 'u1' } } as any)).resolves.toEqual({
            message: 'App settings updated successfully',
        });
        expect(cmd.userId).toBe('u1');
        expect(appSettingsService.update).toHaveBeenCalledWith(cmd);
    });

    it('remove resets settings', async () => {
        const appSettingsService: any = {
            remove: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockResolvedValue(undefined),
        };
        const controller = new AppSettingsController(appSettingsService, {} as any, {} as any);

        await expect(controller.remove({ user: { id: 'u1' } } as any)).resolves.toEqual({
            message: 'App settings reset successfully',
        });
        expect(appSettingsService.remove).toHaveBeenCalledWith(expect.any(RemoveAppSettingsCommand));
        expect(appSettingsService.create).toHaveBeenCalledWith(expect.any(CreateAppSettingsCommand));
    });
});
