import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { OpenExchangeRatesResponse } from './dto';

@Injectable()
export class ExchangeRatesService implements OnModuleInit {
  private readonly apiUrl: string;
  private readonly appId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appId = this.configService.get<string>('OPENEXCHANGERATES_APP_ID');
    if (!appId) {
      throw new Error(
        'OPENEXCHANGERATES_APP_ID environment variable is not defined',
      );
    }
    this.appId = appId;

    const apiUrl = this.configService.get<string>('OPENEXCHANGERATES_API_URL');
    if (!apiUrl) {
      throw new Error(
        'OPENEXCHANGERATES_API_URL environment variable is not defined',
      );
    }
    this.apiUrl = apiUrl;
  }

  async onModuleInit() {
    await this.updateExchangeRates();
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async updateExchangeRates() {
    try {
      const response = await axios.get<OpenExchangeRatesResponse>(
        `${this.apiUrl}?app_id=${this.appId}`,
      );

      const data = response.data;
      const rates = data.rates;
      const timestamp = new Date(data.timestamp * 1000);
      const base = data.base;

      // Process all rates and update database
      for (const [currency, rate] of Object.entries(rates)) {
        await this.prisma.exchangeRate.upsert({
          where: { id: currency },
          update: {
            rate,
            timestamp,
            base,
          },
          create: {
            id: currency,
            rate,
            timestamp,
            base,
          },
        });
      }
    } catch (error) {
      // Error handled silently
    }
  }
  async getExchangeRates() {
    try {
      return await this.prisma.exchangeRate.findMany();
    } catch (error) {
      throw error;
    }
  }
  async getExchangeRate(currencyCode: string) {
    try {
      return await this.prisma.exchangeRate.findUnique({
        where: { id: currencyCode },
      });
    } catch (error) {
      throw error;
    }
  }

  // Method to manually trigger the exchange rates update
  async manualUpdate() {
    await this.updateExchangeRates();
    return { message: 'Exchange rates update triggered' };
  }

  /**
   * Converts an amount from one currency to another using the latest exchange rates
   * @param amount The amount to convert
   * @param fromCurrency The source currency code
   * @param toCurrency The target currency code
   * @returns The converted amount, rounded to 2 decimal places (except for ETB which uses whole numbers)
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      // Get exchange rates for both currencies
      const fromRate = await this.prisma.exchangeRate.findUnique({
        where: { id: fromCurrency },
      });

      const toRate = await this.prisma.exchangeRate.findUnique({
        where: { id: toCurrency },
      });
      if (!fromRate || !toRate) {
        return amount; // Return original amount if we can't convert
      }

      // Convert to USD first (as base), then to target currency
      const amountInUSD = amount / fromRate.rate;
      const convertedAmount = amountInUSD * toRate.rate;

      // Round according to currency (ETB uses whole numbers, others use 2 decimal places)
      return toCurrency === 'ETB'
        ? Math.round(convertedAmount)
        : Math.round(convertedAmount * 100) / 100;
    } catch (error) {
      return amount; // Return original amount if conversion fails
    }
  }
}
