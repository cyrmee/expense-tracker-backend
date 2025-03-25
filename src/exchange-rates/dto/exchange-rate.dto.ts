export class ExchangeRateDto {
  id: string;
  rate: number;
  timestamp: Date;
  base: string;
  updatedAt: Date;
}

export class OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}
