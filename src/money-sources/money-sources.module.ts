import { Module } from '@nestjs/common';
import { MoneySourcesService } from './money-sources.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MoneySourcesController } from './money-sources.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MoneySourcesController],
  providers: [MoneySourcesService],
  exports: [MoneySourcesService],
})
export class MoneySourcesModule {}
