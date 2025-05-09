import { Module, forwardRef } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { CqrsModule } from '@nestjs/cqrs';

// Import handlers using barrel files
import * as CommandHandlers from './commands/handlers';
import * as QueryHandlers from './queries/handlers';

// Define command and query handlers
const CommandHandlersArray = [
  CommandHandlers.CreateAppSettingsHandler,
  CommandHandlers.UpdateAppSettingsHandler,
  CommandHandlers.RemoveAppSettingsHandler,
];

const QueryHandlersArray = [
  QueryHandlers.GetAppSettingsHandler,
  QueryHandlers.GetGeminiApiKeyHandler,
];

@Module({
  imports: [
    PrismaModule, 
    forwardRef(() => AuthModule), 
    CommonModule,
    CqrsModule,
  ],
  controllers: [AppSettingsController],
  providers: [
    AppSettingsService, // Keep the service as a facade for other modules
    ...CommandHandlersArray,
    ...QueryHandlersArray,
  ],
  exports: [AppSettingsService], // Continue exporting the service for dependent modules
})
export class AppSettingsModule {}
