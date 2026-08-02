import { DEFAULT_RECOGNITION_LOCALE, getRecognitionLocale } from './speech-recognition.service';
import { parseCnyAmount, parseJpyAmount, parseSpokenAmount, parseUsdAmount, parseVndAmount } from './price-parser.service';

// Regression cases for the four supported voice flows. Run with the project's test runner when configured.
const cases: Array<[number | null, number]> = [
  [parseVndAmount('30만 동'), 300_000], [parseVndAmount('300,000동'), 300_000],
  [parseJpyAmount('千円'), 1_000], [parseJpyAmount('五千円'), 5_000], [parseJpyAmount('천 엔'), 1_000],
  [parseUsdAmount('five dollars'), 5], [parseUsdAmount('twenty five dollars'), 25], [parseUsdAmount('12달러 50센트'), 12.5],
  [parseCnyAmount('十元'), 10], [parseCnyAmount('三百五十元'), 350], [parseCnyAmount('오십 위안'), 50],
  [parseSpokenAmount('10만 동', 'VND'), 100_000],
];

for (const [actual, expected] of cases) {
  if (actual !== expected) throw new Error(`voice parser regression: expected ${expected}, got ${actual}`);
}

for (const country of ['VN', 'JP', 'US', 'CN'] as const) {
  if (getRecognitionLocale(country) !== DEFAULT_RECOGNITION_LOCALE) throw new Error(`locale regression: ${country}`);
}
