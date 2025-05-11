import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CryptoService } from '../../../common/crypto.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetGeminiApiKeyQuery } from '../impl/get-gemini-api-key.query';

@Injectable()
@QueryHandler(GetGeminiApiKeyQuery)
export class GetGeminiApiKeyHandler
  implements IQueryHandler<GetGeminiApiKeyQuery, string | null>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async execute(query: GetGeminiApiKeyQuery): Promise<string | null> {
    const { userId } = query;

    try {
      const settings = await this.prisma.appSettings.findUnique({
        where: { userId },
        select: { geminiApiKey: true },
      });

      if (!settings || !settings.geminiApiKey) {
        return null;
      }

      return await this.cryptoService.decrypt(settings.geminiApiKey);
    } catch (error) {
      return null;
    }
  }
}
