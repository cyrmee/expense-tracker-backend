import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppSettingsDto, UpdateAppSettingsDto } from './dto';
import { CreateAppSettingsDto } from './dto/create-app-settings.dto';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find app settings for a specific user
   */
  async getAppSettings(userId: string) {
    this.logger.log(`Retrieving app settings for user ${userId}`);

    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      this.logger.log(`No app settings found for user ${userId}`);
      return null;
    }

    return settings;
  }

  /**
   * Create app settings for a user
   */
  async create(userId: string, data?: CreateAppSettingsDto): Promise<void> {
    this.logger.log(`Creating app settings for user ${userId}`);

    if (!data) {
      // If no data initialize with default values
      data = {
        preferredCurrency: 'ETB',
        hideAmounts: true,
        themePreference: 'system',
      };
      this.logger.log(
        `No settings provided, using defaults: preferredCurrency=${data.preferredCurrency}, themePreference=${data.themePreference}`,
      );
    }

    // Check if settings already exist for this user
    const existingSettings = await this.getAppSettings(userId);
    if (existingSettings) return;

    // Create new settings with defaults
    const newSettings = await this.prisma.appSettings.create({
      data: {
        preferredCurrency: data?.preferredCurrency,
        hideAmounts: data?.hideAmounts !== undefined ? data.hideAmounts : false,
        themePreference: data?.themePreference || 'system',
        user: {
          connect: { id: userId },
        },
      },
    });

    this.logger.log(
      `App settings created for user ${userId}: preferredCurrency=${newSettings.preferredCurrency}, themePreference=${newSettings.themePreference}`,
    );

    return;
  }

  /**
   * Update app settings for a user
   */
  async update(data: UpdateAppSettingsDto, userId: string): Promise<void> {
    this.logger.log(`Updating app settings for user ${userId}`);

    // Ensure settings exist for the user
    const appSettings = await this.getAppSettings(userId);

    // If not found, create new settings with default values
    if (!appSettings) {
      this.logger.log(
        `No existing settings found for user ${userId}, creating new settings`,
      );
      await this.create(userId);
      return;
    }

    // Update existing settings
    await this.prisma.appSettings.update({
      where: { userId },
      data: {
        preferredCurrency:
          data.preferredCurrency || appSettings.preferredCurrency,
        hideAmounts:
          data.hideAmounts !== undefined
            ? data.hideAmounts
            : appSettings.hideAmounts,
        themePreference: data.themePreference || appSettings.themePreference,
      },
    });

    return;
  }

  /**
   * Delete app settings for a user
   */
  async remove(userId: string) {
    this.logger.log(`Attempting to remove app settings for user ${userId}`);

    const settings = await this.getAppSettings(userId);
    if (!settings) {
      this.logger.error(`App settings not found for user ${userId}`);
      throw new NotFoundException('App settings not found');
    }

    const deletedSettings = await this.prisma.appSettings.delete({
      where: { userId },
    });

    this.logger.log(`App settings successfully removed for user ${userId}`);

    return deletedSettings;
  }
}
