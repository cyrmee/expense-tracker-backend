import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateAppSettingsCommand } from '../impl/update-app-settings.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/crypto.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@CommandHandler(UpdateAppSettingsCommand)
export class UpdateAppSettingsHandler
  implements ICommandHandler<UpdateAppSettingsCommand, void> {
  private readonly logger = new Logger(UpdateAppSettingsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async execute(command: UpdateAppSettingsCommand): Promise<void> {
    const { userId, preferredCurrency, hideAmounts, themePreference, geminiApiKey } = command;

    // Ensure settings exist for the user
    const appSettings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });

    // If not found, create new settings with default values and exit
    if (!appSettings) {
      // Create default settings
      await this.prisma.appSettings.create({
        data: {
          preferredCurrency: preferredCurrency || 'ETB',
          hideAmounts: hideAmounts !== undefined ? hideAmounts : true,
          themePreference: themePreference || 'system',
          user: {
            connect: { id: userId },
          },
        },
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    // Only include properties that are defined in the command
    if (preferredCurrency !== undefined) {
      updateData.preferredCurrency = preferredCurrency;
    }
    
    if (hideAmounts !== undefined) {
      updateData.hideAmounts = hideAmounts;
    }
    
    if (themePreference !== undefined) {
      updateData.themePreference = themePreference;
    }

    // Handle Gemini API key if provided
    if (geminiApiKey !== undefined) {
      if (geminiApiKey) {
        // Encrypt the API key before storing
        updateData.geminiApiKey = await this.cryptoService.encrypt(geminiApiKey);
        this.logger.log(`Updated Gemini API key for user ${userId}`);
      } else {
        // If empty string or null, remove the API key
        updateData.geminiApiKey = null;
        this.logger.log(`Removed Gemini API key for user ${userId}`);
      }
    }

    // Update existing settings only if there are changes to make
    if (Object.keys(updateData).length > 0) {
      await this.prisma.appSettings.update({
        where: { userId },
        data: updateData,
      });
      
      this.logger.log(`Updated app settings for user ${userId}`);
    }
  }
}