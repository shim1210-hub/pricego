import { recognizeText } from 'expo-ocr-kit';
import type { CurrencyCode, SupportedCountryCode } from './types';

export type OcrAmountResult = { amount: number; rawText: string; currency: CurrencyCode; confidence: 'high' | 'low' };
export type OcrLogName = 'OCR_01_CAMERA'|'OCR_02_GALLERY'|'OCR_03_IMAGE'|'OCR_04_TEXT'|'OCR_05_CURRENCY'|'OCR_06_AMOUNT'|'OCR_07_RATE'|'OCR_08_RESULT'|'OCR_ERROR';
function log(name: OcrLogName, details: Record<string, unknown> = {}) { console.log(`[${name}]`, { timestamp: new Date().toISOString(), ...details }); }

/** OCR is isolated from voice parsing and exchange-rate calculation. */
export async function recognizePriceFromImage(uri: string, country: SupportedCountryCode = 'VN', source: 'camera'|'gallery' = 'gallery'): Promise<OcrAmountResult> {
  log(source === 'camera' ? 'OCR_01_CAMERA' : 'OCR_02_GALLERY', { uri });
  try {
    const result = await recognizeText(uri); log('OCR_03_IMAGE', { uri }); log('OCR_04_TEXT', { text: result.text });
    const explicit = currencyFromText(result.text); const currency = explicit ?? ({ VN:'VND', US:'USD', JP:'JPY', CN:'CNY' } as const)[country];
    log('OCR_05_CURRENCY', { currency }); const amount = extractAmount(result.text); if (amount === null) throw new Error('AMOUNT_NOT_FOUND');
    log('OCR_06_AMOUNT', { amount }); const output = { amount, rawText: result.text, currency, confidence: explicit ? 'high' as const : 'low' as const }; log('OCR_08_RESULT', output); return output;
  } catch (error) { log('OCR_ERROR', { error: error instanceof Error ? error.message : String(error) }); throw error; }
}
export function extractAmount(text: string): number | null { const values = [...text.matchAll(/\d[\d.,\s]*/g)].map((m) => normalize(m[0])).filter((n): n is number => n !== null && n > 0); return values.length ? Math.max(...values) : null; }
export const extractVndAmount = extractAmount;
function currencyFromText(text: string): CurrencyCode | null { if (/[₫đ]|\bVND\b|dong/i.test(text)) return 'VND'; if (/\$|\bUSD\b|dollar/i.test(text)) return 'USD'; if (/[￥¥]|\bJPY\b|yen/i.test(text)) return 'JPY'; if (/元|\bCNY\b|yuan/i.test(text)) return 'CNY'; return null; }
function normalize(value: string): number | null { const compact = value.replace(/\s/g, ''); if (!compact) return null; const normalized = /[.,]\d{3}(?:[.,]|$)/.test(compact) ? compact.replace(/[.,]/g, '') : compact.replace(',', '.'); const amount = Number(normalized); return Number.isFinite(amount) ? amount : null; }
