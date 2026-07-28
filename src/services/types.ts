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

export interface SpeechRecognitionResult {
  recognizedText: string;
  confidence: number;
}

export interface PriceParseResult {
  amount: number;
  displayText: string;
}

export type PriceParseFailureReason = 'PRICE_NOT_FOUND' | 'CURRENCY_NOT_FOUND';

export type PriceParseOutcome =
  | { success: true; result: PriceParseResult }
  | { success: false; reason: PriceParseFailureReason };

export interface ExchangeRateSnapshot {
  currency: CurrencyCode;
  rateToKrw: number;
  updatedAt: string;
  source: 'live' | 'cached' | 'fallback';
}

export interface AppSettings {
  selectedCountryCode: SupportedCountryCode;
  selectedCurrency: CurrencyCode;
  vibrationOn: boolean;
  largeResultText: boolean;
}
