import { Module } from '@nestjs/common';
import { MoneySourcesService } from './money-sources.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MoneySourcesController } from './money-sources.controller';
import { AuthModule } from '../auth/auth.module';
import { CurrencyConverter } from '../common/utils';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MoneySourcesController],
  providers: [MoneySourcesService, CurrencyConverter],
  exports: [MoneySourcesService],
})
export class MoneySourcesModule {}
