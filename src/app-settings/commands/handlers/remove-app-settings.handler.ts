import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { RemoveAppSettingsCommand } from '../impl/remove-app-settings.command';

@Injectable()
@CommandHandler(RemoveAppSettingsCommand)
export class RemoveAppSettingsHandler
  implements ICommandHandler<RemoveAppSettingsCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RemoveAppSettingsCommand) {
    const { userId } = command;

    // Check if settings exist for this user
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      throw new NotFoundException('App settings not found');
    }

    // Delete the settings
    return await this.prisma.appSettings.delete({
      where: { userId },
    });
  }
}
