import type { CurrencyCode, PriceParseOutcome, PriceParseResult } from './types';

type CurrencyParser = { parse(text: string): PriceParseResult | null };

const KOREAN_DIGITS: Record<string, number> = {
  영: 0, 공: 0, 일: 1, 한: 1, 이: 2, 두: 2, 삼: 3, 세: 3, 사: 4, 네: 4,
  오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
};

const ASIAN_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 两: 2, 貳: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9,
};

const ENGLISH_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

export class PriceParserService {
  parse(text: string, currency: CurrencyCode): PriceParseResult | null {
    const outcome = this.parseDetailed(text, currency);
    return outcome.success ? outcome.result : null;
  }

  parseDetailed(text: string, currency: CurrencyCode): PriceParseOutcome {
    const normalized = normalizeText(text);
    if (!normalized) return { success: false, reason: 'PRICE_NOT_FOUND' };
    if (!hasCurrencyMarker(normalized, currency)) {
      return { success: false, reason: 'CURRENCY_NOT_FOUND' };
    }

    const parsed = this.getParser(currency).parse(normalized);
    return parsed
      ? { success: true, result: parsed }
      : { success: false, reason: 'PRICE_NOT_FOUND' };
  }

  private getParser(currency: CurrencyCode): CurrencyParser {
    switch (currency) {
      case 'USD': return new EnglishPriceParser();
      case 'JPY': return new JapanesePriceParser();
      case 'CNY': return new ChinesePriceParser();
      case 'VND': return new VietnamesePriceParser();
      default: return new NumericPriceParser();
    }
  }
}

class NumericPriceParser implements CurrencyParser {
  parse(text: string): PriceParseResult | null {
    const amount = parseNumeric(text);
    return amount === null ? null : result(amount);
  }
}

class VietnamesePriceParser implements CurrencyParser {
  parse(text: string): PriceParseResult | null {
    const koreanMan = text.match(/(\d+(?:\.\d+)?|[영공일한이두삼세사네오육칠팔구십백천]+)\s*만/);
    if (koreanMan) {
      const parsedBase = Number.isFinite(Number(koreanMan[1])) ? Number(koreanMan[1]) : parseKoreanNumber(koreanMan[1]);
      if (parsedBase !== null && parsedBase > 0) return result(parsedBase * 10_000);
    }

    const match = text.match(/(\d+(?:\.\d+)?)\s*(nghìn|ngàn|triệu)/i);
    if (match) {
      const multiplier = match[2].toLowerCase() === 'triệu' ? 1_000_000 : 1_000;
      return result(Number(match[1]) * multiplier);
    }
    const koreanAmount = parseKoreanNumber(text);
    if (koreanAmount !== null) return result(koreanAmount);
    return new NumericPriceParser().parse(text);
  }
}

class JapanesePriceParser implements CurrencyParser {
  parse(text: string): PriceParseResult | null {
    const koreanAmount = parseKoreanNumber(text);
    if (koreanAmount !== null) return result(koreanAmount);
    const numeric = parseNumeric(text);
    if (numeric !== null) return result(numeric);
    return parseAsianNumber(text, ASIAN_DIGITS, ['十', '百', '千', '万']);
  }
}

class ChinesePriceParser implements CurrencyParser {
  parse(text: string): PriceParseResult | null {
    const numeric = parseNumeric(text);
    if (numeric !== null) return result(numeric);
    return parseAsianNumber(text, ASIAN_DIGITS, ['十', '百', '千', '万']);
  }
}

class EnglishPriceParser implements CurrencyParser {
  parse(text: string): PriceParseResult | null {
    const numeric = parseNumeric(text);
    if (numeric !== null) return result(numeric);

    const tokens = text
      .replace(/[-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token && token !== 'and' && !['dollars', 'dollar', 'bucks', 'buck', 'usd'].includes(token));
    let total = 0;
    let current = 0;
    let found = false;

    for (const token of tokens) {
      if (ENGLISH_NUMBERS[token] !== undefined) {
        current += ENGLISH_NUMBERS[token];
        found = true;
      } else if (token === 'hundred') {
        current = (current || 1) * 100;
        found = true;
      } else if (token === 'thousand') {
        total += (current || 1) * 1_000;
        current = 0;
        found = true;
      } else if (token === 'million') {
        total += (current || 1) * 1_000_000;
        current = 0;
        found = true;
      }
    }

    return found ? result(total + current) : null;
  }
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[，,]/g, '').replace(/\s+/g, ' ').trim();
}

function hasCurrencyMarker(text: string, currency: CurrencyCode) {
  switch (currency) {
    case 'VND': return /동|동화|vnd|đồng|nghìn|ngàn|triệu/.test(text);
    case 'JPY': return /엔|엔화|円|jpy|yen/.test(text);
    case 'CNY': return /위안|위엔|元|cny|yuan/.test(text);
    case 'USD': return /달러|불|\$|usd|dollar|bucks?/.test(text);
    case 'KRW': return /원|krw|won/.test(text);
  }
}

function parseNumeric(text: string): number | null {
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : null;
}

function parseKoreanNumber(text: string): number | null {
  const relevant = [...text].filter((char) => KOREAN_DIGITS[char] !== undefined || ['십', '백', '천', '만'].includes(char));
  if (relevant.length === 0) return null;

  let total = 0;
  let section = 0;
  let current = 0;
  for (const char of relevant) {
    if (KOREAN_DIGITS[char] !== undefined) {
      current = KOREAN_DIGITS[char];
    } else if (char === '십') {
      section += (current || 1) * 10;
      current = 0;
    } else if (char === '백') {
      section += (current || 1) * 100;
      current = 0;
    } else if (char === '천') {
      section += (current || 1) * 1_000;
      current = 0;
    } else if (char === '만') {
      total += (section + current || 1) * 10_000;
      section = 0;
      current = 0;
    }
  }

  const amount = total + section + current;
  return amount > 0 ? amount : null;
}

function parseAsianNumber(text: string, digits: Record<string, number>, units: string[]): PriceParseResult | null {
  const relevant = [...text].filter((char) => digits[char] !== undefined || units.includes(char));
  if (relevant.length === 0) return null;

  let total = 0;
  let section = 0;
  let current = 0;
  for (const char of relevant) {
    if (digits[char] !== undefined) {
      current = digits[char];
    } else if (char === '十') {
      section += (current || 1) * 10;
      current = 0;
    } else if (char === '百') {
      section += (current || 1) * 100;
      current = 0;
    } else if (char === '千') {
      section += (current || 1) * 1_000;
      current = 0;
    } else if (char === '万') {
      total += (section + current || 1) * 10_000;
      section = 0;
      current = 0;
    }
  }

  const amount = total + section + current;
  return amount > 0 ? result(amount) : null;
}

function result(amount: number): PriceParseResult {
  return { amount, displayText: String(amount) };
}
