import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppSettingsDto } from './dto';

@Injectable()
export class AppSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find app settings for a specific user
   */
  async findOneByUserId(userId: string) {
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
  async create(userId: string, data: Partial<AppSettingsDto>) {
    // Check if settings already exist for this user
    const existingSettings = await this.findOneByUserId(userId);
    if (existingSettings) {
      return existingSettings;
    }

    // Create new settings with defaults
    return this.prisma.appSettings.create({
      data: {
        preferredCurrency: data.preferredCurrency || 'ETB',
        hideAmounts: data.hideAmounts !== undefined ? data.hideAmounts : false,
        useCustomETBRate:
          data.useCustomETBRate !== undefined ? data.useCustomETBRate : false,
        customETBtoUSDRate: data.customETBtoUSDRate || 0.0076820991,
        customUSDtoETBRate: data.customUSDtoETBRate || 130.17,
        hasSeenWelcome:
          data.hasSeenWelcome !== undefined ? data.hasSeenWelcome : false,
        userName: data.userName || '',
        hasExistingData:
          data.hasExistingData !== undefined ? data.hasExistingData : false,
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
  async update(userId: string, data: Partial<AppSettingsDto>) {
    // Ensure settings exist for the user
    let settings = await this.findOneByUserId(userId);

    // If not found, create new settings
    if (!settings) {
      settings = await this.create(userId, data);
      return settings;
    }

    // Update existing settings
    return this.prisma.appSettings.update({
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
    const settings = await this.findOneByUserId(userId);
    if (!settings) {
      throw new NotFoundException('App settings not found');
    }

    return this.prisma.appSettings.delete({
      where: { userId },
    });
  }
}
