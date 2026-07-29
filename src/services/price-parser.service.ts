import type { CurrencyCode, PriceParseOutcome, PriceParseResult } from './types';

const smallKoreanUnits: Record<string, number> = { 십: 10, 백: 100, 천: 1_000 };
const largeKoreanUnits: Record<string, number> = { 만: 10_000, 억: 100_000_000 };
const koreanDigits: Record<string, number> = {
  영: 0, 공: 0, 일: 1, 한: 1, 이: 2, 삼: 3, 사: 4, 오: 5,
  육: 6, 칠: 7, 팔: 8, 구: 9,
};
const englishNumbers: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

export class PriceParserService {
  parse(text: string, currency: CurrencyCode) {
    const parsed = this.parseDetailed(text, currency);
    return parsed.success ? parsed.result : null;
  }

  parseDetailed(text: string, currency: CurrencyCode): PriceParseOutcome {
    const value = text.toLowerCase().replace(/[,₩￥¥元]/g, '').replace(/\s+/g, ' ').trim();
    if (!value) return { success: false, reason: 'PRICE_NOT_FOUND' };
    if (!new RegExp(currencyMarker(currency), 'i').test(value)) {
      return { success: false, reason: 'CURRENCY_NOT_FOUND' };
    }

    const amount = currency === 'USD' ? parseEnglish(value) : parseAmount(value);
    return amount && amount > 0
      ? { success: true, result: result(amount) }
      : { success: false, reason: 'PRICE_NOT_FOUND' };
  }
}

function currencyMarker(currency: CurrencyCode) {
  return ({
    VND: '동|đồng|dong|vnd|nghìn|nghin|triệu|trieu',
    JPY: '엔|円|jpy|yen|¥',
    CNY: '위안|元|cny|yuan|¥',
    USD: '달러|dollar|bucks?|usd|\\$',
    KRW: '원|krw|won',
  } as Record<CurrencyCode, string>)[currency];
}

function parseAmount(text: string): number | null {
  // Handle Korean numeric multipliers first. This is intentionally separate
  // from the plain-number fallback so "6만동" becomes 60,000, not 10,000.
  const korean = parseKorean(text);
  if (korean !== null) return korean;

  const vietnamese = text.match(/(\d+(?:\.\d+)?)\s*(nghìn|nghin|triệu|trieu)/i);
  if (vietnamese) return Number(vietnamese[1]) * (/tri/i.test(vietnamese[2]) ? 1_000_000 : 1_000);

  const numeric = text.match(/\d+(?:\.\d+)?/);
  return numeric ? Number(numeric[0]) : null;
}

function parseKorean(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  const hasKoreanUnit = [...compact].some((char) => smallKoreanUnits[char] || largeKoreanUnits[char]);
  if (!hasKoreanUnit) return null;

  let total = 0;
  let section = 0;
  let current = 0;

  const tokens = compact.match(/\d+(?:\.\d+)?|[영공일한이삼사오육칠팔구십백천만억]/g) ?? [];
  for (const token of tokens) {
    if (/^\d/.test(token)) {
      current = Number(token);
      continue;
    }

    if (koreanDigits[token] !== undefined) {
      current = koreanDigits[token];
      continue;
    }

    const smallUnit = smallKoreanUnits[token];
    if (smallUnit) {
      section += (current || 1) * smallUnit;
      current = 0;
      continue;
    }

    const largeUnit = largeKoreanUnits[token];
    if (largeUnit) {
      const group = section + current || 1;
      total += group * largeUnit;
      section = 0;
      current = 0;
    }
  }

  return total + section + current;
}

function parseEnglish(text: string): number | null {
  const numeric = text.match(/\d+(?:\.\d+)?/);
  if (numeric) return Number(numeric[0]);

  let total = 0;
  let current = 0;
  let found = false;
  for (const token of text.replace(/-/g, ' ').split(/\s+/)) {
    if (englishNumbers[token] !== undefined) {
      current += englishNumbers[token];
      found = true;
    } else if (token === 'hundred') {
      current = (current || 1) * 100;
      found = true;
    } else if (token === 'thousand' || token === 'million') {
      total += (current || 1) * (token === 'thousand' ? 1_000 : 1_000_000);
      current = 0;
      found = true;
    }
  }
  return found ? total + current : null;
}

function result(amount: number): PriceParseResult {
  return { amount, displayText: String(amount) };
}
