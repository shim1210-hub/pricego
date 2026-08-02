import type { CurrencyCode, PriceParseOutcome } from './types';

const KOREAN_DIGITS: Record<string, number> = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const KOREAN_SMALL_UNITS: Record<string, number> = { 십: 10, 백: 100, 천: 1_000 };
const KOREAN_LARGE_UNITS: Record<string, number> = { 만: 10_000, 억: 100_000_000 };
const ENGLISH_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

export class PriceParserService {
  parse(text: string, currency: CurrencyCode) {
    const parsed = this.parseDetailed(text, currency);
    return parsed.success ? parsed.result : null;
  }

  parseDetailed(text: string, currency: CurrencyCode): PriceParseOutcome {
    const value = text.toLowerCase().replace(/[，,]/g, '').replace(/\s+/g, ' ').trim();
    if (!value) return { success: false, reason: 'PRICE_NOT_FOUND' };
    const amount = parseSpokenAmount(value, currency);
    return amount !== null && Number.isFinite(amount) && amount > 0
      ? { success: true, result: { amount, displayText: String(amount) } }
      : { success: false, reason: 'PRICE_NOT_FOUND' };
  }
}

/** Selected currency determines the grammar; recognition text need not repeat its currency word. */
export function parseSpokenAmount(text: string, currency: CurrencyCode): number | null {
  const value = text.toLowerCase().trim();
  if (!value) return null;
  switch (currency) {
    case 'USD': return parseUsdAmount(value);
    case 'JPY': return parseJpyAmount(value);
    case 'CNY': return parseCnyAmount(value);
    case 'VND': return parseVndAmount(value);
    case 'KRW': return parseKorean(value) ?? parseNumeric(value);
  }
}

export function parseVndAmount(text: string): number | null {
  const vietnamese = text.match(/(\d+(?:\.\d+)?)\s*(triệu|trieu|nghìn|nghin)/i);
  if (vietnamese) return Number(vietnamese[1]) * (/tri/i.test(vietnamese[2]) ? 1_000_000 : 1_000);
  return parseKorean(text) ?? parseNumeric(text);
}

export function parseJpyAmount(text: string): number | null {
  return parseCjk(text) ?? parseNumeric(text);
}

export function parseCnyAmount(text: string): number | null {
  return parseCjk(text) ?? parseNumeric(text);
}

export function parseUsdAmount(text: string): number | null {
  const cents = text.match(/(?:dollars?|bucks?|\$)?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?)?\s*(?:and\s*)?(\d+)\s*cents?/i);
  if (cents) return Number(cents[1]) + Number(cents[2]) / 100;
  const numeric = parseNumeric(text);
  if (numeric !== null) return numeric;
  const compactPhrase = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/);
  if (compactPhrase) return ENGLISH_NUMBERS[compactPhrase[1]] + ENGLISH_NUMBERS[compactPhrase[2]] / 100;
  let total = 0; let current = 0; let found = false;
  for (const token of text.replace(/-/g, ' ').split(/\s+/)) {
    if (ENGLISH_NUMBERS[token] !== undefined) { current += ENGLISH_NUMBERS[token]; found = true; }
    else if (token === 'hundred') { current = (current || 1) * 100; found = true; }
    else if (token === 'thousand' || token === 'million') { total += (current || 1) * (token === 'thousand' ? 1_000 : 1_000_000); current = 0; found = true; }
  }
  return found ? total + current : null;
}

function parseNumeric(text: string): number | null {
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseKorean(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  if (![...compact].some((char) => KOREAN_SMALL_UNITS[char] || KOREAN_LARGE_UNITS[char])) return null;
  let total = 0; let section = 0; let current = 0;
  for (const token of compact.match(/\d+(?:\.\d+)?|[영공일이삼사오육칠팔구십백천만억]/g) ?? []) {
    if (/^\d/.test(token)) current = Number(token);
    else if (KOREAN_DIGITS[token] !== undefined) current = KOREAN_DIGITS[token];
    else if (KOREAN_SMALL_UNITS[token]) { section += (current || 1) * KOREAN_SMALL_UNITS[token]; current = 0; }
    else if (KOREAN_LARGE_UNITS[token]) { total += (section + current || 1) * KOREAN_LARGE_UNITS[token]; section = 0; current = 0; }
  }
  return total + section + current;
}

function parseCjk(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  if (!/[一二三四五六七八九十百千万萬億]/.test(compact)) return null;
  const digits: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let total = 0; let section = 0; let current = 0;
  for (const char of compact) {
    if (digits[char]) current = digits[char];
    else if ('十百千'.includes(char)) { section += (current || 1) * ({ 十: 10, 百: 100, 千: 1_000 } as Record<string, number>)[char]; current = 0; }
    else if ('万萬億'.includes(char)) { total += (section + current || 1) * (char === '億' ? 100_000_000 : 10_000); section = 0; current = 0; }
  }
  return total + section + current;
}
