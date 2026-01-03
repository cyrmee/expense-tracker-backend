import { AppSettingsService } from './app-settings.service';
import {
    CreateAppSettingsCommand,
    RemoveAppSettingsCommand,
    UpdateAppSettingsCommand,
} from './commands/impl';

describe('AppSettingsService', () => {
    it('delegates to buses', async () => {
        const commandBus: any = { execute: jest.fn().mockResolvedValue(undefined) };
        const queryBus: any = { execute: jest.fn().mockResolvedValue({ ok: true }) };

        const service = new AppSettingsService(commandBus, queryBus);

        await expect(service.getAppSettings('u1')).resolves.toEqual({ ok: true });
        expect(queryBus.execute).toHaveBeenCalledWith(expect.any(Object));

        await expect(service.getGeminiApiKey('u1')).resolves.toEqual({ ok: true });

        await expect(service.create(new CreateAppSettingsCommand('u1'))).resolves.toBeUndefined();
        await expect(service.update(new UpdateAppSettingsCommand('u1'))).resolves.toBeUndefined();
        await expect(service.remove(new RemoveAppSettingsCommand('u1'))).resolves.toBeUndefined();

        expect(commandBus.execute).toHaveBeenCalledTimes(3);
    });
});
