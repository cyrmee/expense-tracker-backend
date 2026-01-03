import { NotFoundException } from '@nestjs/common';
import { CryptoService } from '../common/crypto.service';
import { CreateAppSettingsHandler } from './commands/handlers/create-app-settings.handler';
import { RemoveAppSettingsHandler } from './commands/handlers/remove-app-settings.handler';
import { UpdateAppSettingsHandler } from './commands/handlers/update-app-settings.handler';
import { CreateAppSettingsCommand } from './commands/impl/create-app-settings.command';
import { RemoveAppSettingsCommand } from './commands/impl/remove-app-settings.command';
import { UpdateAppSettingsCommand } from './commands/impl/update-app-settings.command';
import { GetAppSettingsHandler } from './queries/handlers/get-app-settings.handler';
import { GetGeminiApiKeyHandler } from './queries/handlers/get-gemini-api-key.handler';
import { GetAppSettingsQuery } from './queries/impl/get-app-settings.query';
import { GetGeminiApiKeyQuery } from './queries/impl/get-gemini-api-key.query';

describe('AppSettings CQRS', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('commands/queries constructors', () => {
        it('CreateAppSettingsCommand assigns optional args', () => {
            const cmd = new CreateAppSettingsCommand('u1', 'USD', false, 'dark');
            expect(cmd.userId).toBe('u1');
            expect(cmd.preferredCurrency).toBe('USD');
            expect(cmd.hideAmounts).toBe(false);
            expect(cmd.themePreference).toBe('dark');
        });

        it('UpdateAppSettingsCommand assigns optional args', () => {
            const cmd = new UpdateAppSettingsCommand('u1', 'USD', false, 'dark', 'k', true);
            expect(cmd.userId).toBe('u1');
            expect(cmd.preferredCurrency).toBe('USD');
            expect(cmd.hideAmounts).toBe(false);
            expect(cmd.themePreference).toBe('dark');
            expect(cmd.geminiApiKey).toBe('k');
            expect(cmd.onboarded).toBe(true);
        });

        it('RemoveAppSettingsCommand assigns optional userId', () => {
            const cmd = new RemoveAppSettingsCommand('u1');
            expect(cmd.userId).toBe('u1');
        });

        it('queries store userId', () => {
            expect(new GetAppSettingsQuery('u1').userId).toBe('u1');
            expect(new GetGeminiApiKeyQuery('u1').userId).toBe('u1');
        });
    });

    it('CreateAppSettingsHandler creates only when missing (with defaults)', async () => {
        const prisma: any = {
            appSettings: {
                findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x' }),
                create: jest.fn(),
            },
        };

        const handler = new CreateAppSettingsHandler(prisma);

        await handler.execute(new CreateAppSettingsCommand('u1'));
        expect(prisma.appSettings.create).toHaveBeenCalled();

        await handler.execute(new CreateAppSettingsCommand('u1'));
        // second call should short-circuit
        expect(prisma.appSettings.create).toHaveBeenCalledTimes(1);
    });

    it('RemoveAppSettingsHandler throws when missing and deletes when present', async () => {
        const prisma: any = {
            appSettings: {
                findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x' }),
                delete: jest.fn().mockResolvedValue({ ok: true }),
            },
        };

        const handler = new RemoveAppSettingsHandler(prisma);
        await expect(handler.execute(new RemoveAppSettingsCommand('u1'))).rejects.toBeInstanceOf(
            NotFoundException,
        );

        await expect(handler.execute(new RemoveAppSettingsCommand('u1'))).resolves.toEqual({ ok: true });
        expect(prisma.appSettings.delete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('UpdateAppSettingsHandler creates defaults when missing (encrypts key) and updates when present', async () => {
        const prisma: any = {
            appSettings: {
                findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x' }),
                create: jest.fn(),
                update: jest.fn(),
            },
        };
        const cryptoService: any = {
            encrypt: jest.fn(async (t: string) => `enc:${t}`),
        } as Partial<CryptoService>;

        const handler = new UpdateAppSettingsHandler(prisma, cryptoService);

        await handler.execute(new UpdateAppSettingsCommand('u1', undefined, undefined, undefined, 'k', undefined));
        expect(prisma.appSettings.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ geminiApiKey: 'enc:k' }),
            }),
        );

        // update existing settings with changes
        await handler.execute(new UpdateAppSettingsCommand('u1', 'USD', false, 'dark', '', true));
        expect(prisma.appSettings.update).toHaveBeenCalledWith({
            where: { userId: 'u1' },
            data: expect.objectContaining({ preferredCurrency: 'USD', hideAmounts: false, themePreference: 'dark', geminiApiKey: null, onboarded: true }),
        });

        // update existing settings with no changes (should not call update)
        prisma.appSettings.update.mockClear();
        await handler.execute(new UpdateAppSettingsCommand('u1'));
        expect(prisma.appSettings.update).not.toHaveBeenCalled();
    });

    it('GetAppSettingsHandler returns null when missing and settings when present', async () => {
        const prisma: any = {
            appSettings: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x' }) },
        };
        const handler = new GetAppSettingsHandler(prisma);

        await expect(handler.execute(new GetAppSettingsQuery('u1'))).resolves.toBeNull();
        await expect(handler.execute(new GetAppSettingsQuery('u1'))).resolves.toEqual({ id: 'x' });
    });

    it('GetGeminiApiKeyHandler returns null for missing/empty, decrypts when set, and swallows errors', async () => {
        const prisma: any = {
            appSettings: {
                findUnique: jest
                    .fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({ geminiApiKey: null })
                    .mockResolvedValueOnce({ geminiApiKey: 'enc' })
                    .mockRejectedValueOnce(new Error('db')),
            },
        };
        const cryptoService: any = { decrypt: jest.fn().mockResolvedValue('plain') };
        const handler = new GetGeminiApiKeyHandler(prisma, cryptoService);

        await expect(handler.execute(new GetGeminiApiKeyQuery('u1'))).resolves.toBeNull();
        await expect(handler.execute(new GetGeminiApiKeyQuery('u1'))).resolves.toBeNull();
        await expect(handler.execute(new GetGeminiApiKeyQuery('u1'))).resolves.toBe('plain');
        await expect(handler.execute(new GetGeminiApiKeyQuery('u1'))).resolves.toBeNull();
    });
});
