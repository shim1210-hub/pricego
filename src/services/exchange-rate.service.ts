import { LocalStorageService } from './storage';
import type { CountryOption, CurrencyCode, ExchangeRateSnapshot, SupportedCountryCode } from './types';

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'VN', name: '베트남', flag: '🇻🇳', currency: 'VND', language: '베트남어', rateToKrw: 0.054 },
  { code: 'JP', name: '일본', flag: '🇯🇵', currency: 'JPY', language: '일본어', rateToKrw: 9.2 },
  { code: 'CN', name: '중국', flag: '🇨🇳', currency: 'CNY', language: '중국어', rateToKrw: 186 },
  { code: 'US', name: '미국', flag: '🇺🇸', currency: 'USD', language: '영어', rateToKrw: 1350 },
];

export const COUNTRY_BY_CODE: Record<SupportedCountryCode, CountryOption> = COUNTRY_OPTIONS.reduce(
  (acc, country) => ({ ...acc, [country.code]: country }),
  {} as Record<SupportedCountryCode, CountryOption>,
);

const API_URL = 'https://api.frankfurter.dev/v2/rates?base=KRW&quotes=VND,JPY,CNY,USD';
const STORAGE_KEY = 'pricego-exchange-rates';
const currencies: CurrencyCode[] = ['VND', 'JPY', 'CNY', 'USD'];

type StoredRates = Record<CurrencyCode, ExchangeRateSnapshot>;
type ApiRate = { quote?: string; rate?: number; date?: string };

export class ExchangeRateService {
  private rates = new Map<CurrencyCode, ExchangeRateSnapshot>();
  private initializePromise: Promise<void> | null = null;
  private readonly storage = new LocalStorageService();

  async initialize(): Promise<void> {
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      await this.loadCachedRates();
      try {
        await this.refreshLiveRates();
      } catch {
        // Cached rates or fallback rates remain available when the network fails.
      }
    })();

    return this.initializePromise;
  }

  async refreshLiveRates(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(API_URL, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);

    const payload = await response.json() as ApiRate[];
    const rows = Array.isArray(payload) ? payload : [];
    const nextRates: StoredRates = {} as StoredRates;

    for (const row of rows) {
      if (!row.quote || typeof row.rate !== 'number' || row.rate <= 0 || !currencies.includes(row.quote as CurrencyCode)) continue;
      const currency = row.quote as CurrencyCode;
      nextRates[currency] = {
        currency,
        // The API returns foreign currency per 1 KRW; PriceGo needs KRW per 1 foreign unit.
        rateToKrw: 1 / row.rate,
        updatedAt: row.date ?? new Date().toISOString(),
        source: 'live',
      };
    }

    if (Object.keys(nextRates).length !== currencies.length) {
      throw new Error('Exchange rate response did not include all supported currencies.');
    }

    this.setRates(nextRates);
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(nextRates));
  }

  getRate(currency: CurrencyCode): ExchangeRateSnapshot {
    if (currency === 'KRW') {
      return { currency, rateToKrw: 1, updatedAt: new Date().toISOString(), source: 'live' };
    }

    return this.rates.get(currency) ?? this.getFallbackRate(currency);
  }

  calculateKrw(amount: number, currency: CurrencyCode) {
    return amount * this.getRate(currency).rateToKrw;
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

  private async loadCachedRates() {
    try {
      const stored = await this.storage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as StoredRates;
      for (const currency of currencies) {
        const snapshot = parsed[currency];
        if (snapshot && typeof snapshot.rateToKrw === 'number') {
          this.rates.set(currency, { ...snapshot, source: 'cached' });
        }
      }
    } catch {
      // Ignore corrupt cache and use fallback rates.
    }
  }

  private setRates(rates: StoredRates) {
    for (const currency of currencies) this.rates.set(currency, rates[currency]);
  }

  private getFallbackRate(currency: CurrencyCode): ExchangeRateSnapshot {
    const country = COUNTRY_OPTIONS.find((item) => item.currency === currency);
    return {
      currency,
      rateToKrw: country?.rateToKrw ?? 0,
      updatedAt: '기본 환율',
      source: 'fallback',
    };
  }
}

export const exchangeRateService = new ExchangeRateService();
