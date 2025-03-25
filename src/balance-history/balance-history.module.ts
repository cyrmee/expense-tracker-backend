import { Module } from '@nestjs/common';
import { BalanceHistoryController } from './balance-history.controller';
import { BalanceHistoryService } from './balance-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BalanceHistoryController],
  providers: [BalanceHistoryService],
  exports: [BalanceHistoryService],
})
export class BalanceHistoryModule {}
