import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [PrismaModule, AppSettingsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
