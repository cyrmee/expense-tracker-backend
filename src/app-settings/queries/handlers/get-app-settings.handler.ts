import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetAppSettingsQuery } from '../impl/get-app-settings.query';

@Injectable()
@QueryHandler(GetAppSettingsQuery)
export class GetAppSettingsHandler
  implements IQueryHandler<GetAppSettingsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAppSettingsQuery) {
    const { userId } = query;

    // Find app settings for the specified user
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    }); // If no settings found, return null (controller will handle creating default settings)
    if (!settings) {
      return null;
    }

    return settings;
  }
}
