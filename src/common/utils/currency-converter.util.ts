import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CurrencyConverter {
  private readonly logger = new Logger(CurrencyConverter.name);

  constructor(private readonly prisma: PrismaService) {}

  async getExchangeRate(currency: string): Promise<number | null> {
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { id: currency },
      select: {
        rate: true,
      },
    });
    return rate?.rate || null;
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = await this.getExchangeRate(fromCurrency);
    const toRate = await this.getExchangeRate(toCurrency);

    if (!fromRate || !toRate) {
      if (!fromRate) {
        this.logger.error(
          `Currency conversion failed - exchange rate not found for ${fromCurrency}`,
        );
      }
      if (!toRate) {
        this.logger.error(
          `Currency conversion failed - exchange rate not found for ${toCurrency}`,
        );
      }
      return null;
    }

    // Convert through USD (base currency)
    const convertedAmount = (amount * toRate) / fromRate;

    return convertedAmount;
  }
}
