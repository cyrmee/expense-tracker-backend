import { Module } from '@nestjs/common';
import { BalanceHistoryController } from './balance-history.controller';
import { BalanceHistoryService } from './balance-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CurrencyConverter } from '../common/utils';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BalanceHistoryController],
  providers: [BalanceHistoryService, CurrencyConverter],
  exports: [BalanceHistoryService],
})
export class BalanceHistoryModule {}
