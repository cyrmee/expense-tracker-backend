import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateAppSettingsDto, UpdateAppSettingsDto } from './dto';

// Import commands and queries from index files
import {
  CreateAppSettingsCommand,
  UpdateAppSettingsCommand,
  RemoveAppSettingsCommand,
} from './commands/impl';
import {
  GetAppSettingsQuery,
  GetGeminiApiKeyQuery,
} from './queries/impl';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Find app settings for a specific user
   */
  async getAppSettings(userId: string) {
    return this.queryBus.execute(new GetAppSettingsQuery(userId));
  }

  /**
   * Create app settings for a user
   */
  async create(userId: string, data?: CreateAppSettingsDto): Promise<void> {
    // Extract properties if data is provided, otherwise use defaults from command constructor
    const preferredCurrency = data?.preferredCurrency;
    const hideAmounts = data?.hideAmounts;
    const themePreference = data?.themePreference;
    
    return this.commandBus.execute(
      new CreateAppSettingsCommand(userId, preferredCurrency, hideAmounts, themePreference)
    );
  }

  /**
   * Update app settings for a user
   */
  async update(data: UpdateAppSettingsDto, userId: string): Promise<void> {
    const { preferredCurrency, hideAmounts, themePreference, geminiApiKey } = data;
    
    return this.commandBus.execute(
      new UpdateAppSettingsCommand(
        userId,
        preferredCurrency,
        hideAmounts,
        themePreference,
        geminiApiKey
      )
    );
  }

  /**
   * Get user's Gemini API key (decrypted)
   * @returns The decrypted API key or null if not set
   */
  async getGeminiApiKey(userId: string): Promise<string | null> {
    return this.queryBus.execute(new GetGeminiApiKeyQuery(userId));
  }

  /**
   * Delete app settings for a user
   */
  async remove(userId: string) {
    return this.commandBus.execute(new RemoveAppSettingsCommand(userId));
  }
}
