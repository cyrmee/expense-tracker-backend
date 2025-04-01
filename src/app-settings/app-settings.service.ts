import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppSettingsDto } from './dto';

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
  async create(
    userId: string,
    data?: Omit<AppSettingsDto, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    this.logger.log(`Creating app settings for user ${userId}`);

    if (!data) {
      // If no data initialize with default values
      data = {
        preferredCurrency: 'ETB',
        hideAmounts: false,
        themePreference: 'system',
        userId: userId,
      };
      this.logger.log(
        `No settings provided, using defaults: preferredCurrency=${data.preferredCurrency}, themePreference=${data.themePreference}`,
      );
    }

    // Check if settings already exist for this user
    const existingSettings = await this.getAppSettings(userId);
    if (existingSettings) {
      this.logger.log(
        `Settings already exist for user ${userId}, returning existing settings`,
      );
      return existingSettings;
    }

    // Create new settings with defaults
    const newSettings = await this.prisma.appSettings.create({
      data: {
        preferredCurrency: data.preferredCurrency || 'ETB',
        hideAmounts: data.hideAmounts !== undefined ? data.hideAmounts : false,
        themePreference: data.themePreference || 'system',
        user: {
          connect: { id: userId },
        },
      },
    });

    this.logger.log(
      `App settings created for user ${userId}: preferredCurrency=${newSettings.preferredCurrency}, themePreference=${newSettings.themePreference}`,
    );

    return newSettings;
  }

  /**
   * Update app settings for a user
   */
  async update(
    data: Partial<AppSettingsDto>,
    userId: string,
  ): Promise<AppSettingsDto> {
    this.logger.log(`Updating app settings for user ${userId}`);

    // Ensure settings exist for the user
    let settings = await this.getAppSettings(userId);

    // If not found, create new settings with default values
    if (!settings) {
      this.logger.log(
        `No existing settings found for user ${userId}, creating new settings`,
      );
      settings = await this.create(userId);
      return settings;
    }

    // Update existing settings
    const updatedSettings = await this.prisma.appSettings.update({
      where: { userId },
      data: {
        ...data,
        // Explicitly exclude userId to prevent errors
        userId: undefined,
      },
    });

    this.logger.log(
      `App settings updated for user ${userId}: preferredCurrency=${updatedSettings.preferredCurrency}, themePreference=${updatedSettings.themePreference}`,
    );

    return updatedSettings;
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
