import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAppSettingsQuery } from '../impl/get-app-settings.query';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@QueryHandler(GetAppSettingsQuery)
export class GetAppSettingsHandler implements IQueryHandler<GetAppSettingsQuery> {
  private readonly logger = new Logger(GetAppSettingsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAppSettingsQuery) {
    const { userId } = query;
    
    // Find app settings for the specified user
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });

    // If no settings found, return null (controller will handle creating default settings)
    if (!settings) {
      this.logger.log(`No settings found for user ${userId}`);
      return null;
    }

    return settings;
  }
}