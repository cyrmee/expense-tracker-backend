import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGeminiApiKeyQuery } from '../impl/get-gemini-api-key.query';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/crypto.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@QueryHandler(GetGeminiApiKeyQuery)
export class GetGeminiApiKeyHandler implements IQueryHandler<GetGeminiApiKeyQuery, string | null> {
  private readonly logger = new Logger(GetGeminiApiKeyHandler.name);

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
      this.logger.error(`Failed to get Gemini API key: ${error.message}`);
      return null;
    }
  }
}