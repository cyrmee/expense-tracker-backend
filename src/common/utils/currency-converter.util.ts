import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CurrencyConverter {
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

    if (!fromRate || !toRate) return null;

    // Convert through USD (base currency)
    return (amount * toRate) / fromRate;
  }
}
