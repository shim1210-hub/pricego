import type { CurrencyCode, PriceParseOutcome, PriceParseResult } from './types';

const KOREAN_DIGITS: Record<string, number> = {
  영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
};
const KOREAN_SMALL_UNITS: Record<string, number> = { 십: 10, 백: 100, 천: 1_000 };
const KOREAN_LARGE_UNITS: Record<string, number> = { 만: 10_000, 억: 100_000_000 };
const ENGLISH_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

export class PriceParserService {
  parse(text: string, currency: CurrencyCode) {
    const parsed = this.parseDetailed(text, currency);
    return parsed.success ? parsed.result : null;
  }

  parseDetailed(text: string, currency: CurrencyCode): PriceParseOutcome {
    const value = text.toLowerCase().replace(/[，,]/g, '').replace(/\s+/g, ' ').trim();
    if (!value) return { success: false, reason: 'PRICE_NOT_FOUND' };
    const hasCurrency = new RegExp(currencyMarker(currency), 'i').test(value);
    const hasUnit = new RegExp(amountUnitMarker(currency), 'i').test(value);
    if (!hasCurrency && !hasUnit) {
      return { success: false, reason: 'CURRENCY_NOT_FOUND' };
    }

    const amount = currency === 'USD' ? parseEnglish(value) : parseAmount(value);
    return amount !== null && amount > 0
      ? { success: true, result: result(amount) }
      : { success: false, reason: 'PRICE_NOT_FOUND' };
  }
}

function currencyMarker(currency: CurrencyCode) {
  return ({
    VND: '동|đồng|dong|vnd|nghìn|nghin|triệu|trieu',
    JPY: '엔|円|yen|jpy',
    CNY: '위안|위엔|元|人民币|yuan|cny',
    USD: '달러|dollar|bucks?|usd|\\$',
    KRW: '원|won|krw|₩',
  } as Record<CurrencyCode, string>)[currency];
}

function amountUnitMarker(currency: CurrencyCode) {
  return ({
    VND: 'triệu|trieu|nghìn|nghin|만|억',
    JPY: '一|二|三|四|五|六|七|八|九|十|百|千|万|億|thousand|million',
    CNY: '一|二|三|四|五|六|七|八|九|十|百|千|万|億',
    USD: 'thousand|million',
    KRW: '만|억',
  } as Record<CurrencyCode, string>)[currency];
}

function parseAmount(text: string): number | null {
  const korean = parseKorean(text);
  if (korean !== null) return korean;

  const vietnamese = text.match(/(\d+(?:\.\d+)?)\s*(triệu|trieu|nghìn|nghin)/i);
  if (vietnamese) return Number(vietnamese[1]) * (/tri/i.test(vietnamese[2]) ? 1_000_000 : 1_000);

  const cjk = parseCjk(text);
  if (cjk !== null) return cjk;
  const numeric = text.match(/\d+(?:\.\d+)?/);
  return numeric ? Number(numeric[0]) : null;
}

function parseKorean(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  if (![...compact].some((char) => KOREAN_SMALL_UNITS[char] || KOREAN_LARGE_UNITS[char])) return null;

  let total = 0;
  let section = 0;
  let current = 0;
  for (const token of compact.match(/\d+(?:\.\d+)?|[영공일이삼사오육칠팔구십백천만억]/g) ?? []) {
    if (/^\d/.test(token)) { current = Number(token); continue; }
    if (KOREAN_DIGITS[token] !== undefined) { current = KOREAN_DIGITS[token]; continue; }
    const small = KOREAN_SMALL_UNITS[token];
    if (small) { section += (current || 1) * small; current = 0; continue; }
    const large = KOREAN_LARGE_UNITS[token];
    if (large) {
      total += (section + current || 1) * large;
      section = 0;
      current = 0;
    }
  }
  return total + section + current;
}

function parseCjk(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  if (!/[一二三四五六七八九十百千万億万]/.test(compact)) return null;
  const digits: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let total = 0;
  let section = 0;
  let current = 0;
  for (const char of compact) {
    if (digits[char]) { current = digits[char]; continue; }
    if (char === '十' || char === '百' || char === '千') { section += (current || 1) * ({ 十: 10, 百: 100, 千: 1_000 } as Record<string, number>)[char]; current = 0; continue; }
    if (char === '万' || char === '萬' || char === '億') { total += (section + current || 1) * (char === '億' ? 100_000_000 : 10_000); section = 0; current = 0; }
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
    if (ENGLISH_NUMBERS[token] !== undefined) { current += ENGLISH_NUMBERS[token]; found = true; }
    else if (token === 'hundred') { current = (current || 1) * 100; found = true; }
    else if (token === 'thousand' || token === 'million') { total += (current || 1) * (token === 'thousand' ? 1_000 : 1_000_000); current = 0; found = true; }
  }
  return found ? total + current : null;
}

function result(amount: number): PriceParseResult {
  return { amount, displayText: String(amount) };
}
