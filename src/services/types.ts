export type SupportedCountryCode = 'US' | 'JP' | 'CN' | 'VN';

export type CurrencyCode = 'USD' | 'JPY' | 'CNY' | 'VND' | 'KRW';

export interface CountryOption {
  code: SupportedCountryCode;
  name: string;
  flag: string;
  currency: CurrencyCode;
  language: string;
  rateToKrw: number;
  exampleAmount: number;
}

export interface RecognitionResult {
  recognizedText: string;
  parsedAmount: number;
  currency: CurrencyCode;
  confidence: number;
  needsConfirmation: boolean;
}

export interface PriceParseResult {
  amount: number;
  displayText: string;
}

export interface ExchangeRateSnapshot {
  currency: CurrencyCode;
  rateToKrw: number;
  updatedAt: string;
  source: 'cached' | 'mock';
}

export interface AppSettings {
  selectedCountryCode: SupportedCountryCode;
  selectedCurrency: CurrencyCode;
  offlineFirst: boolean;
  autoUpdate: boolean;
  vibrationOn: boolean;
  largeResultText: boolean;
}
