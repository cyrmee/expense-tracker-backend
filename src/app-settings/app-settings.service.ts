import { Injectable, NotFoundException } from '@nestjs/common';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAppSettingsDto } from './dto';

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async getAppSettings(userId: string) {
    return this.prisma.appSettings.findUnique({ where: { userId } });
  }

  async create(
    userId: string,
    data?: { preferredCurrency?: string; hideAmounts?: boolean; themePreference?: string },
  ): Promise<void> {
    await this.prisma.appSettings.upsert({
      where: { userId },
      create: {
        preferredCurrency: data?.preferredCurrency || 'ETB',
        hideAmounts: data?.hideAmounts !== undefined ? data.hideAmounts : true,
        themePreference: data?.themePreference || 'system',
        user: { connect: { id: userId } },
      },
      update: {}, // no-op: keep existing settings if they already exist
    });
  }

  async update(userId: string, data: UpdateAppSettingsDto): Promise<void> {
    const encryptedApiKey =
      data.geminiApiKey !== undefined
        ? data.geminiApiKey
          ? await this.cryptoService.encrypt(data.geminiApiKey)
          : null
        : undefined;

    const updateData: any = {};
    if (data.preferredCurrency !== undefined) updateData.preferredCurrency = data.preferredCurrency;
    if (data.hideAmounts !== undefined) updateData.hideAmounts = data.hideAmounts;
    if (data.themePreference !== undefined) updateData.themePreference = data.themePreference;
    if (data.onboarded !== undefined) updateData.onboarded = data.onboarded;
    if (encryptedApiKey !== undefined) updateData.geminiApiKey = encryptedApiKey;

    await this.prisma.appSettings.upsert({
      where: { userId },
      create: {
        preferredCurrency: data.preferredCurrency || 'ETB',
        hideAmounts: data.hideAmounts !== undefined ? data.hideAmounts : true,
        themePreference: data.themePreference || 'system',
        onboarded: data.onboarded !== undefined ? data.onboarded : false,
        geminiApiKey: encryptedApiKey !== undefined ? encryptedApiKey : null,
        user: { connect: { id: userId } },
      },
      update: updateData,
    });
  }

  async getGeminiApiKey(userId: string): Promise<string | null> {
    try {
      const settings = await this.prisma.appSettings.findUnique({
        where: { userId },
        select: { geminiApiKey: true },
      });

      if (!settings || !settings.geminiApiKey) return null;

      return await this.cryptoService.decrypt(settings.geminiApiKey);
    } catch {
      return null;
    }
  }

  async remove(userId: string): Promise<void> {
    const settings = await this.prisma.appSettings.findUnique({ where: { userId } });
    if (!settings) throw new NotFoundException('App settings not found');
    await this.prisma.appSettings.delete({ where: { userId } });
  }
}
