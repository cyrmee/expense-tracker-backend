import { Module, forwardRef } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), CommonModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
