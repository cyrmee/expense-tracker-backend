import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AppConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MoneySourcesModule } from './money-sources/money-sources.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CategoriesModule } from './categories/categories.module';
import { BalanceHistoryModule } from './balance-history/balance-history.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { DataModule } from './data/data.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AiModule } from './ai/ai.module';
import { UserInsightsModule } from './user-insights/user-insights.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    MoneySourcesModule,
    ExpensesModule,
    CategoriesModule,
    BalanceHistoryModule,
    AppSettingsModule,
    DataModule,
    AppConfigModule,
    RedisModule,
    ExchangeRatesModule,
    DashboardModule,
    MailerModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
    AiModule,
    UserInsightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
