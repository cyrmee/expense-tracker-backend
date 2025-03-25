import { Module } from '@nestjs/common';
import { ExpenseHistoryController } from './expense-history.controller';
import { ExpenseHistoryService } from './expense-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExpenseHistoryController],
  providers: [ExpenseHistoryService],
  exports: [ExpenseHistoryService],
})
export class ExpenseHistoryModule {}
