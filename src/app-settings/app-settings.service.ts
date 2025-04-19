import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppSettingsDto, UpdateAppSettingsDto } from './dto';
import { CryptoService } from '../common/crypto.service';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Find app settings for a specific user
   */
  async getAppSettings(userId: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return null;
    }

    return settings;
  }

  /**
   * Create app settings for a user
   */
  async create(userId: string, data?: CreateAppSettingsDto): Promise<void> {
    if (!data) {
      // If no data initialize with default values
      data = {
        preferredCurrency: 'ETB',
        hideAmounts: true,
        themePreference: 'system',
      };
    }

    // Check if settings already exist for this user
    const existingSettings = await this.getAppSettings(userId);
    if (existingSettings) return;

    // Create new settings with defaults
    await this.prisma.appSettings.create({
      data: {
        preferredCurrency: data?.preferredCurrency,
        hideAmounts: data?.hideAmounts !== undefined ? data.hideAmounts : false,
        themePreference: data?.themePreference || 'system',
        user: {
          connect: { id: userId },
        },
      },
    });

    return;
  }

  /**
   * Update app settings for a user
   */
  async update(data: UpdateAppSettingsDto, userId: string): Promise<void> {
    // Ensure settings exist for the user
    const appSettings = await this.getAppSettings(userId);

    // If not found, create new settings with default values
    if (!appSettings) {
      await this.create(userId);
      return;
    }

    // Prepare update data
    const updateData: any = {
      preferredCurrency: data.preferredCurrency || appSettings.preferredCurrency,
      hideAmounts: data.hideAmounts !== undefined ? data.hideAmounts : appSettings.hideAmounts,
      themePreference: data.themePreference || appSettings.themePreference,
    };

    // Handle Gemini API key if provided
    if (data.geminiApiKey !== undefined) {
      if (data.geminiApiKey) {
        // Encrypt the API key before storing
        updateData.geminiApiKey = await this.cryptoService.encrypt(data.geminiApiKey);
        this.logger.log(`Updated Gemini API key for user ${userId}`);
      } else {
        // If empty string or null, remove the API key
        updateData.geminiApiKey = null;
        this.logger.log(`Removed Gemini API key for user ${userId}`);
      }
    }

    // Update existing settings
    await this.prisma.appSettings.update({
      where: { userId },
      data: updateData,
    });

    return;
  }

  /**
   * Get user's Gemini API key (decrypted)
   * @returns The decrypted API key or null if not set
   */
  async getGeminiApiKey(userId: string): Promise<string | null> {
    try {
      const settings = await this.prisma.appSettings.findUnique({
        where: { userId },
        select: { geminiApiKey: true },
      });

      if (!settings || !settings.geminiApiKey) {
        return null;
      }

      return await this.cryptoService.decrypt(settings.geminiApiKey);
    } catch (error) {
      this.logger.error(`Failed to get Gemini API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete app settings for a user
   */
  async remove(userId: string) {
    const settings = await this.getAppSettings(userId);
    if (!settings) {
      this.logger.error(`App settings not found for user ${userId}`);
      throw new NotFoundException('App settings not found');
    }

    const deletedSettings = await this.prisma.appSettings.delete({
      where: { userId },
    });

    return deletedSettings;
  }
}
