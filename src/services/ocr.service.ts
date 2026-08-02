import { recognizeText } from 'expo-ocr-kit';

export type OcrAmountResult = { amount: number; rawText: string };

/** OCR is intentionally isolated from currency conversion so existing voice/manual flows remain unchanged. */
export async function recognizePriceFromImage(uri: string): Promise<OcrAmountResult> {
  const result = await recognizeText(uri);
  const amount = extractVndAmount(result.text);
  if (amount === null) throw new Error('AMOUNT_NOT_FOUND');
  return { amount, rawText: result.text };
}

export function extractVndAmount(text: string): number | null {
  const candidates = [...text.matchAll(/(\d[\d.,\s]*)(?:\s*(?:đ|₫|vnd|dong|동))?/gi)]
    .map((match) => normalizeOcrNumber(match[1]))
    .filter((value): value is number => value !== null && value > 0);
  return candidates.length ? Math.max(...candidates) : null;
}

function normalizeOcrNumber(value: string): number | null {
  const compact = value.replace(/\s/g, '');
  if (!compact) return null;
  const separators = (compact.match(/[.,]/g) ?? []).length;
  const normalized = separators > 0 && /[.,]\d{3}(?:[.,]|$)/.test(compact)
    ? compact.replace(/[.,]/g, '')
    : compact.replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}
