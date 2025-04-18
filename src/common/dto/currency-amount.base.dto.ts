import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CurrencyConverter } from '../utils/currency-converter.util';

export abstract class CurrencyAmountBaseDto {
  protected currencyConverter?: CurrencyConverter;
  protected userPreferredCurrency?: string;

  setCurrencyConverter(converter: CurrencyConverter) {
    this.currencyConverter = converter;
    return this;
  }

  setUserPreferredCurrency(currency: string) {
    this.userPreferredCurrency = currency;
    return this;
  }

  abstract getCurrency(): string;

  abstract getAmount(): number;

  @ApiProperty({
    description: "Amount in user's preferred currency",
    example: 250.75,
    required: false,
  })
  @Expose({ groups: ['computed'] })
  async getAmountInPreferredCurrency(): Promise<number | undefined> {
    if (!this.currencyConverter || !this.userPreferredCurrency) {
      return undefined;
    }

    const sourceCurrency = this.getCurrency();
    if (sourceCurrency === this.userPreferredCurrency) {
      return undefined;
    }

    const convertedAmount = await this.currencyConverter.convertAmount(
      this.getAmount(),
      sourceCurrency,
      this.userPreferredCurrency,
    );

    return convertedAmount || undefined;
  }
}
