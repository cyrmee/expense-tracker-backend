import { NotFoundException } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

describe('AppSettingsService', () => {
  const makePrisma = (overrides: any = {}) => ({
    appSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides,
    },
  });

  const makeCrypto = () => ({
    encrypt: jest.fn(async (v: string) => `enc:${v}`),
    decrypt: jest.fn(async (v: string) => v.replace('enc:', '')),
  });

  beforeEach(() => jest.clearAllMocks());

  it('getAppSettings returns result from prisma', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ id: 'x' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await expect(service.getAppSettings('u1')).resolves.toEqual({ id: 'x' });
  });

  it('create skips if settings already exist', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ id: 'x' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await service.create('u1');
    expect(prisma.appSettings.create).not.toHaveBeenCalled();
  });

  it('create creates with defaults when missing', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await service.create('u1');
    expect(prisma.appSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preferredCurrency: 'ETB', hideAmounts: true }),
      }),
    );
  });

  it('update creates defaults when settings missing', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
    const crypto = makeCrypto();
    const service = new AppSettingsService(prisma, crypto as any);
    await service.update('u1', { geminiApiKey: 'key' });
    expect(crypto.encrypt).toHaveBeenCalledWith('key');
    expect(prisma.appSettings.create).toHaveBeenCalled();
  });

  it('update patches existing settings', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ id: 'x' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await service.update('u1', { preferredCurrency: 'USD', hideAmounts: false });
    expect(prisma.appSettings.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: expect.objectContaining({ preferredCurrency: 'USD', hideAmounts: false }),
    });
  });

  it('update does nothing when no fields provided', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ id: 'x' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await service.update('u1', {});
    expect(prisma.appSettings.update).not.toHaveBeenCalled();
  });

  it('getGeminiApiKey returns null when not set', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ geminiApiKey: null }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await expect(service.getGeminiApiKey('u1')).resolves.toBeNull();
  });

  it('getGeminiApiKey decrypts and returns key', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ geminiApiKey: 'enc:secret' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await expect(service.getGeminiApiKey('u1')).resolves.toBe('secret');
  });

  it('getGeminiApiKey swallows errors', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error('db')) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await expect(service.getGeminiApiKey('u1')).resolves.toBeNull();
  });

  it('remove throws NotFoundException when settings missing', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await expect(service.remove('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove deletes settings when present', async () => {
    const prisma: any = makePrisma({ findUnique: jest.fn().mockResolvedValue({ id: 'x' }) });
    const service = new AppSettingsService(prisma, makeCrypto() as any);
    await service.remove('u1');
    expect(prisma.appSettings.delete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
