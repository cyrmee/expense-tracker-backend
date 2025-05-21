import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AuthModule } from '../auth/auth.module';
import { UserInsightsController as UserInsightsController } from './user-insights.controller';
import { UserInsightsService as UserInsightsService } from './user-insights.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, ExchangeRatesModule, AuthModule, AiModule],
  controllers: [UserInsightsController],
  providers: [UserInsightsService],
})
export class UserInsightsModule {}
