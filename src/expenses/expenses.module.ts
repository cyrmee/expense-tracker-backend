import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CurrencyConverter } from '../common/utils';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AuthModule, AiModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, CurrencyConverter],
  exports: [ExpensesService],
})
export class ExpensesModule {}
