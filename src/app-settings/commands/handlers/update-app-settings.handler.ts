import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CryptoService } from '../../../common/crypto.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateAppSettingsCommand } from '../impl/update-app-settings.command';

@Injectable()
@CommandHandler(UpdateAppSettingsCommand)
export class UpdateAppSettingsHandler
  implements ICommandHandler<UpdateAppSettingsCommand, void> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) { }

  async execute(command: UpdateAppSettingsCommand): Promise<void> {
    const {
      userId,
      preferredCurrency,
      hideAmounts,
      themePreference,
      geminiApiKey,
      onboarded
    } = command;

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
          onboarded: onboarded !== undefined ? onboarded : false,
          geminiApiKey: geminiApiKey
            ? await this.cryptoService.encrypt(geminiApiKey)
            : null,
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
    } // Handle Gemini API key if provided
    if (geminiApiKey !== undefined) {
      if (geminiApiKey) {
        // Encrypt the API key before storing
        updateData.geminiApiKey =
          await this.cryptoService.encrypt(geminiApiKey);
      } else {
        // If empty string or null, remove the API key
        updateData.geminiApiKey = null;
      }
    } // Update existing settings only if there are changes to make
    if (onboarded !== undefined) {
      updateData.onboarded = onboarded;
    }
    if (Object.keys(updateData).length > 0) {
      await this.prisma.appSettings.update({
        where: { userId },
        data: updateData,
      });
    }
  }
}
