import {
  Controller,
  Get,
  Param,
  Logger,
  NotFoundException,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRateDto } from './dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  async getAllExchangeRates(): Promise<ExchangeRateDto[]> {
    return await this.exchangeRatesService.getExchangeRates();
  }

  @Get(':code')
  async getExchangeRate(@Param('code') code: string): Promise<ExchangeRateDto> {
    const rate = await this.exchangeRatesService.getExchangeRate(code);
    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found for currency: ${code}`,
      );
    }
    return rate;
  }
}
