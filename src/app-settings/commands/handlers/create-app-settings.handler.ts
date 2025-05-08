import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateAppSettingsCommand } from '../impl/create-app-settings.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@CommandHandler(CreateAppSettingsCommand)
export class CreateAppSettingsHandler
  implements ICommandHandler<CreateAppSettingsCommand, void> {
  private readonly logger = new Logger(CreateAppSettingsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateAppSettingsCommand): Promise<void> {
    const { userId, preferredCurrency, hideAmounts, themePreference } = command;

    // Use default values if properties are undefined
    const settingsData = {
      preferredCurrency: preferredCurrency || 'ETB',
      hideAmounts: hideAmounts !== undefined ? hideAmounts : true,
      themePreference: themePreference || 'system',
    };

    // Check if settings already exist for this user
    const existingSettings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    
    if (existingSettings) return;

    // Create new settings with defaults
    await this.prisma.appSettings.create({
      data: {
        ...settingsData,
        user: {
          connect: { id: userId },
        },
      },
    });

    this.logger.log(`Created app settings for user ${userId}`);
  }
}