import type { CurrencyCode, PriceParseOutcome, PriceParseResult } from './types';

const units: Record<string, number> = { 십: 10, 백: 100, 천: 1_000, 만: 10_000, 억: 100_000_000 };
const digits: Record<string, number> = { 영: 0, 공: 0, 일: 1, 한: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const english: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export class PriceParserService {
  parse(text: string, currency: CurrencyCode) { const r = this.parseDetailed(text, currency); return r.success ? r.result : null; }
  parseDetailed(text: string, currency: CurrencyCode): PriceParseOutcome {
    const value = text.toLowerCase().replace(/[,₫$]/g, '').replace(/\s+/g, ' ').trim();
    if (!value) return { success: false, reason: 'PRICE_NOT_FOUND' };
    if (!new RegExp(currencyMarker(currency), 'i').test(value)) return { success: false, reason: 'CURRENCY_NOT_FOUND' };
    const amount = currency === 'USD' ? parseEnglish(value) : parseAmount(value);
    return amount && amount > 0 ? { success: true, result: result(amount) } : { success: false, reason: 'PRICE_NOT_FOUND' };
  }
}

function currencyMarker(c: CurrencyCode) {
  return ({ VND: '동|đồng|dong|vnd|nghìn|nghin|triệu|trieu', JPY: '엔|円|jpy|yen|\u00a5', CNY: '위안|元|cny|yuan|\u00a5', USD: '달러|dollar|bucks?|usd|\$', KRW: '원|krw|won' } as Record<CurrencyCode, string>)[c];
}

function parseAmount(text: string): number | null {
  const numeric = text.match(/\d+(?:\.\d+)?/);
  const korean = parseKorean(text);
  const vietnamese = text.match(/(\d+(?:\.\d+)?)\s*(nghìn|nghin|triệu|trieu)/i);
  if (vietnamese) return Number(vietnamese[1]) * (/tri/i.test(vietnamese[2]) ? 1_000_000 : 1_000);
  return korean ?? (numeric ? Number(numeric[0]) : null);
}

function parseKorean(text: string): number | null {
  const chars = [...text].filter(c => digits[c] !== undefined || units[c] !== undefined);
  if (!chars.some(c => units[c] !== undefined)) return null;
  let total = 0, section = 0, current = 0;
  for (const c of chars) {
    if (digits[c] !== undefined) current = digits[c];
    else if (units[c] === 10 || units[c] === 100 || units[c] === 1_000) { section += (current || 1) * units[c]; current = 0; }
    else if (units[c] === 10_000 || units[c] === 100_000_000) { total += (section + current || 1) * units[c]; section = 0; current = 0; }
  }
  return total + section + current;
}

function parseEnglish(text: string): number | null {
  const numeric = text.match(/\d+(?:\.\d+)?/); if (numeric) return Number(numeric[0]);
  let total = 0, current = 0, found = false;
  for (const token of text.replace(/-/g, ' ').split(/\s+/)) {
    if (english[token] !== undefined) { current += english[token]; found = true; }
    else if (token === 'hundred') { current = (current || 1) * 100; found = true; }
    else if (token === 'thousand' || token === 'million') { total += (current || 1) * (token === 'thousand' ? 1_000 : 1_000_000); current = 0; found = true; }
  }
  return found ? total + current : null;
}
function result(amount: number): PriceParseResult { return { amount, displayText: String(amount) }; }
