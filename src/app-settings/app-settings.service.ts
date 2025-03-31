import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppSettingsDto } from './dto';

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

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
  async create(
    userId: string,
    data?: Omit<AppSettingsDto, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    if (!data) {
      // If no data initialize with default values
      data = {
        preferredCurrency: 'ETB',
        hideAmounts: false,
        themePreference: 'system',
        userId: userId,
      };
    }

    // Check if settings already exist for this user
    const existingSettings = await this.getAppSettings(userId);
    if (existingSettings) {
      return existingSettings;
    }

    // Create new settings with defaults
    return await this.prisma.appSettings.create({
      data: {
        preferredCurrency: data.preferredCurrency || 'ETB',
        hideAmounts: data.hideAmounts !== undefined ? data.hideAmounts : false,
        themePreference: data.themePreference || 'system',
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  /**
   * Update app settings for a user
   */
  async update(
    data: Partial<AppSettingsDto>,
    userId: string,
  ): Promise<AppSettingsDto> {
    // Ensure settings exist for the user
    let settings = await this.getAppSettings(userId);

    // If not found, create new settings with default values
    if (!settings) {
      settings = await this.create(userId);
      return settings;
    }

    // Update existing settings
    return await this.prisma.appSettings.update({
      where: { userId },
      data: {
        ...data,
        // Explicitly exclude userId to prevent errors
        userId: undefined,
      },
    });
  }

  /**
   * Delete app settings for a user
   */
  async remove(userId: string) {
    const settings = await this.getAppSettings(userId);
    if (!settings) {
      throw new NotFoundException('App settings not found');
    }

    return await this.prisma.appSettings.delete({
      where: { userId },
    });
  }
}
