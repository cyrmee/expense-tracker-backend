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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
@UseGuards(SessionAuthGuard)
@ApiCookieAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class ExchangeRatesController {
  private readonly logger = new Logger(ExchangeRatesController.name);

  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  async getAllExchangeRates(): Promise<ExchangeRateDto[]> {
    this.logger.log('Fetching all exchange rates');
    return await this.exchangeRatesService.getExchangeRates();
  }

  @Get(':code')
  async getExchangeRate(@Param('code') code: string): Promise<ExchangeRateDto> {
    this.logger.log(`Fetching exchange rate for ${code}`);
    const rate = await this.exchangeRatesService.getExchangeRate(code);
    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found for currency: ${code}`,
      );
    }
    return rate;
  }

  // @Patch('update')
  // async triggerUpdate() {
  //   this.logger.log('Manual update triggered via API');
  //   return await this.exchangeRatesService.manualUpdate();
  // }
}
