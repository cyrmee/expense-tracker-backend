import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveAppSettingsCommand } from '../impl/remove-app-settings.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
@CommandHandler(RemoveAppSettingsCommand)
export class RemoveAppSettingsHandler
    implements ICommandHandler<RemoveAppSettingsCommand> {
    private readonly logger = new Logger(RemoveAppSettingsHandler.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(command: RemoveAppSettingsCommand) {
        const { userId } = command;

        // Check if settings exist for this user
        const settings = await this.prisma.appSettings.findUnique({
            where: { userId },
        });

        if (!settings) {
            this.logger.error(`App settings not found for user ${userId}`);
            throw new NotFoundException('App settings not found');
        }

        // Delete the settings
        return await this.prisma.appSettings.delete({
            where: { userId },
        });
    }
}