import type { CountryOption, CurrencyCode, ExchangeRateSnapshot, SupportedCountryCode } from './types';

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'VN', name: '베트남', flag: '🇻🇳', currency: 'VND', language: '베트남어', rateToKrw: 0.054, exampleAmount: 300000 },
  { code: 'JP', name: '일본', flag: '🇯🇵', currency: 'JPY', language: '일본어', rateToKrw: 9.2, exampleAmount: 3000 },
  { code: 'CN', name: '중국', flag: '🇨🇳', currency: 'CNY', language: '중국어', rateToKrw: 186, exampleAmount: 300 },
  { code: 'US', name: '미국', flag: '🇺🇸', currency: 'USD', language: '영어', rateToKrw: 1350, exampleAmount: 300 },
];

export const COUNTRY_BY_CODE: Record<SupportedCountryCode, CountryOption> = COUNTRY_OPTIONS.reduce(
  (acc, country) => ({ ...acc, [country.code]: country }),
  {} as Record<SupportedCountryCode, CountryOption>,
);

export class ExchangeRateService {
  getRate(currency: CurrencyCode): ExchangeRateSnapshot {
    const country = COUNTRY_OPTIONS.find((item) => item.currency === currency);
    const rateToKrw = country?.rateToKrw ?? 0.054;

    return {
      currency,
      rateToKrw,
      updatedAt: '2026.07.27 09:30',
      source: 'cached',
    };
  }

  calculateKrw(amount: number, currency: CurrencyCode) {
    const rate = this.getRate(currency).rateToKrw;
    return amount * rate;
  }

  formatAmount(amount: number) {
    return new Intl.NumberFormat('ko-KR').format(amount);
  }

  formatCurrency(amount: number, currency: CurrencyCode) {
    return `${this.formatAmount(amount)} ${currency}`;
  }

  formatKrw(amount: number) {
    return `약 ₩${this.formatAmount(Math.round(amount))}`;
  }
}
