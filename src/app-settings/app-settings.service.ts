import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

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
   * @param command - The command containing user ID and optional settings
   */
  async create(command: CreateAppSettingsCommand): Promise<void> {
    return this.commandBus.execute(command);
  }

  /**
   * Update app settings for a user
   * @param command - The command containing user ID and settings to update
   */
  async update(command: UpdateAppSettingsCommand): Promise<void> {
    return this.commandBus.execute(command);
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
   * @param command - The command containing the user ID whose settings should be removed
   */
  async remove(command: RemoveAppSettingsCommand) {
    return this.commandBus.execute(command);
  }
}
