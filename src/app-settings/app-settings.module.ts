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
    AppSettingsService, 
    ...CommandHandlersArray,
    ...QueryHandlersArray,
  ],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
