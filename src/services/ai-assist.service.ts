import type { CurrencyCode } from './types';
export interface AiCurrencyContext { text: string; candidates: CurrencyCode[]; }
export interface AiAssistService { suggestCurrency(context: AiCurrencyContext): Promise<CurrencyCode | null>; }
/** v1 keeps AI optional; providers can implement this contract in v2. */
export class NoopAiAssistService implements AiAssistService { async suggestCurrency(_context: AiCurrencyContext): Promise<CurrencyCode | null> { return null; } }
