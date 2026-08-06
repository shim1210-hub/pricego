import { recognizeText } from 'expo-ocr-kit';
import type { CurrencyCode, SupportedCountryCode } from './types';

export type OcrItem = {
  amount: number;
  currency: CurrencyCode;
  menuName?: string;
  translatedMenuName?: string;
};

// The legacy fields remain available for callers that only render one result.
export type OcrAmountResult = OcrItem & {
  rawText: string;
  confidence: 'high' | 'low';
  items: OcrItem[];
};
export type OcrLogName = 'OCR_01_CAMERA'|'OCR_02_GALLERY'|'OCR_03_IMAGE'|'OCR_04_TEXT'|'OCR_05_CURRENCY'|'OCR_06_AMOUNT'|'OCR_07_RATE'|'OCR_08_RESULT'|'OCR_ERROR';
function log(name: OcrLogName, details: Record<string, unknown> = {}) { console.log(`[${name}]`, { timestamp: new Date().toISOString(), ...details }); }

export async function recognizePriceFromImage(uri: string, country: SupportedCountryCode = 'VN', source: 'camera'|'gallery' = 'gallery'): Promise<OcrAmountResult> {
  log(source === 'camera' ? 'OCR_01_CAMERA' : 'OCR_02_GALLERY', { uri });
  try {
    const result = await recognizeText(uri);
    log('OCR_03_IMAGE', { uri }); log('OCR_04_TEXT', { text: result.text });
    const currency = currencyFromText(result.text) ?? ({ VN:'VND', US:'USD', JP:'JPY', CN:'CNY' } as const)[country];
    const items = extractOcrItems(result.text, currency);
    if (!items.length) throw new Error('AMOUNT_NOT_FOUND');
    log('OCR_05_CURRENCY', { currency }); log('OCR_06_AMOUNT', { amounts: items.map((item) => item.amount) });
    const first = items[0];
    const output = { ...first, rawText: result.text, confidence: currencyFromText(result.text) ? 'high' as const : 'low' as const, items };
    log('OCR_08_RESULT', output); return output;
  } catch (error) { log('OCR_ERROR', { error: error instanceof Error ? error.message : String(error) }); throw error; }
}

export function extractOcrItems(text: string, fallbackCurrency: CurrencyCode = 'VND'): OcrItem[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items: OcrItem[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const amount = extractAmount(line);
    if (amount === null) continue;
    const currency = currencyFromText(line) ?? fallbackCurrency;
    const menuName = line.replace(/\d[\d.,\s]*/g, '').replace(/[$€¥￥₫]|\b(?:VND|USD|JPY|CNY|KRW|円|元|dong|dollar|yen|yuan)\b/gi, '').trim();
    const previous = lines[index - 1];
    const candidate = menuName || (previous && extractAmount(previous) === null ? previous : undefined);
    items.push({ amount, currency, ...(candidate ? { menuName: candidate, translatedMenuName: translateMenuName(candidate) } : {}) });
  }
  return items;
}

export function extractAmount(text: string): number | null {
  const values = [...text.matchAll(/\d[\d.,\s]*/g)].map((match) => normalize(match[0])).filter((value): value is number => value !== null && value > 0);
  return values.length ? Math.max(...values) : null;
}
export const extractVndAmount = extractAmount;

function currencyFromText(text: string): CurrencyCode | null {
  if (/₫|\bVND\b|dong/i.test(text)) return 'VND';
  if (/\$|\bUSD\b|dollar/i.test(text)) return 'USD';
  if (/¥|￥|円|\bJPY\b|yen/i.test(text)) return 'JPY';
  if (/元|￥|\bCNY\b|yuan/i.test(text)) return 'CNY';
  return null;
}
function translateMenuName(name: string): string {
  const translations: Record<string, string> = { 'Phở bò':'소고기 쌀국수', 'Pho bo':'소고기 쌀국수', 'Bún bò':'분보', 'Bun bo':'분보', 'ラーメン':'라멘', '宮保雞丁':'궁보계정', '宫保鸡丁':'궁보계정' };
  return translations[name] ?? name;
}
function normalize(value: string): number | null {
  const compact = value.replace(/\s/g, ''); if (!compact) return null;
  const normalized = /[.,]\d{3}(?:[.,]|$)/.test(compact) ? compact.replace(/[.,]/g, '') : compact.replace(',', '.');
  const amount = Number(normalized); return Number.isFinite(amount) ? amount : null;
}
