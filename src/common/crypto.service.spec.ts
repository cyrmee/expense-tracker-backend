import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
    const makeConfig = (overrides?: Record<string, string | undefined>) => {
        const config: Record<string, string | undefined> = {
            ENCRYPTION_ALGORITHM: 'aes-256-cbc',
            ENCRYPTION_IV: '1234567890abcdef', // 16 bytes
            ENCRYPTION_SECRET_KEY: 'super-secret-key',
            ENCRYPTION_SALT: 'super-secret-salt',
            ...overrides,
        };

        return {
            get: jest.fn((key: string) => config[key]),
        } as unknown as ConfigService;
    };

    it('throws if ENCRYPTION_ALGORITHM is missing', () => {
        const configService = makeConfig({ ENCRYPTION_ALGORITHM: undefined });

        expect(() => new CryptoService(configService)).toThrow(
            'Missing required environment variable: ENCRYPTION_ALGORITHM',
        );
    });

    it('throws if ENCRYPTION_IV is missing', () => {
        const configService = makeConfig({ ENCRYPTION_IV: undefined });

        expect(() => new CryptoService(configService)).toThrow(
            'Missing required environment variable: ENCRYPTION_IV',
        );
    });

    it('throws if ENCRYPTION_IV length is not 16 bytes', () => {
        const configService = makeConfig({ ENCRYPTION_IV: 'short' });

        expect(() => new CryptoService(configService)).toThrow(
            /Invalid ENCRYPTION_IV length: expected 16 bytes, got /,
        );
    });

    it('encrypt/decrypt roundtrip returns original plaintext', async () => {
        const configService = makeConfig();
        const cryptoService = new CryptoService(configService);

        const plaintext = 'hello world';
        const encrypted = await cryptoService.encrypt(plaintext);
        const decrypted = await cryptoService.decrypt(encrypted);

        expect(encrypted).not.toEqual(plaintext);
        expect(decrypted).toEqual(plaintext);
    });

    it('getKey caches the derived key', async () => {
        const cryptoService = new CryptoService(makeConfig());
        const key1 = await (cryptoService as any).getKey();
        const key2 = await (cryptoService as any).getKey();
        expect(key1).toBe(key2);
    });

    it('encrypt rejects when secret/salt missing', async () => {
        const cryptoService = new CryptoService(
            makeConfig({ ENCRYPTION_SECRET_KEY: undefined }),
        );
        await expect(cryptoService.encrypt('x')).rejects.toBeInstanceOf(Error);
    });

    it('generateRandomPassword returns 16 chars', async () => {
        const configService = makeConfig();
        const cryptoService = new CryptoService(configService);

        const password = await cryptoService.generateRandomPassword();

        expect(password).toHaveLength(16);
        expect(password).toMatch(/^[0-9a-f]+$/);
    });

    it('generateRandomToken/password rethrow on crypto errors', async () => {
        const cryptoService = new CryptoService(makeConfig());

        const spy = jest
            .spyOn(crypto, 'randomBytes')
            .mockImplementation(((size: any, cb: any) => {
                cb(new Error('boom'));
                return undefined as any;
            }) as any);

        await expect(cryptoService.generateRandomToken(4)).rejects.toThrow('boom');
        await expect(cryptoService.generateRandomPassword()).rejects.toThrow('boom');

        spy.mockRestore();
    });
});
