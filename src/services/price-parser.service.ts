import type { CurrencyCode, PriceParseResult } from './types';

export class PriceParserService {
  parse(text: string, currency: CurrencyCode): PriceParseResult | null {
    const normalized = text.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();

    if (!normalized) {
      return null;
    }

    const parser = this.getParser(currency);
    return parser.parse(normalized, currency);
  }

  private getParser(currency: CurrencyCode) {
    switch (currency) {
      case 'USD':
        return new EnglishPriceParser();
      case 'JPY':
        return new JapanesePriceParser();
      case 'CNY':
        return new ChinesePriceParser();
      case 'VND':
        return new VietnamesePriceParser();
      default:
        return new GenericPriceParser();
    }
  }
}

class GenericPriceParser {
  parse(text: string, _currency?: CurrencyCode): PriceParseResult | null {
    const digits = text.match(/\d+/g)?.join('');
    if (!digits) {
      return null;
    }

    return { amount: Number(digits), displayText: digits };
  }
}

class EnglishPriceParser extends GenericPriceParser {}
class JapanesePriceParser extends GenericPriceParser {}
class ChinesePriceParser extends GenericPriceParser {}
class VietnamesePriceParser extends GenericPriceParser {}
