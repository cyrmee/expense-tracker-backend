import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AuthModule } from '../auth/auth.module';
import { BenchmarkingController } from './benchmarking.controller';
import { BenchmarkingService } from './benchmarking.service';

@Module({
  imports: [PrismaModule, ExchangeRatesModule, AuthModule],
  controllers: [BenchmarkingController],
  providers: [BenchmarkingService],
})
export class BenchmarkingModule {}
