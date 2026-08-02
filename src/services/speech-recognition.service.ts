import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

import type { SpeechRecognitionResult, SupportedCountryCode } from './types';

const SPEECH_TIMEOUT_MS = 12_000;
export type VoiceDiagnostic = { name: string; timestamp: number; details?: Record<string, unknown> };
const diagnosticLogs: VoiceDiagnostic[] = [];
const diagnosticListeners = new Set<(logs: VoiceDiagnostic[]) => void>();

export function getVoiceDiagnosticLogs() { return [...diagnosticLogs]; }
export function clearVoiceDiagnosticLogs() { diagnosticLogs.length = 0; diagnosticListeners.forEach((listener) => listener([])); }
export function subscribeVoiceDiagnostics(listener: (logs: VoiceDiagnostic[]) => void) {
  diagnosticListeners.add(listener);
  listener(getVoiceDiagnosticLogs());
  return () => { diagnosticListeners.delete(listener); };
}
export function recordVoiceDiagnostic(name: string, details?: Record<string, unknown>) {
  diagnosticLogs.push({ name, timestamp: Date.now(), details });
  if (diagnosticLogs.length > 100) diagnosticLogs.splice(0, diagnosticLogs.length - 100);
  diagnosticListeners.forEach((listener) => listener(getVoiceDiagnosticLogs()));
}

/**
 * PriceGo 핵심 기능: 국가별 음성 금액 인식
 * VND, JPY, USD, CNY는 음성 언어와 금액 표현이 다르므로 통화별 locale을 유지한다.
 * 명시적 지시 없이 특정 통화 지원을 삭제하거나 단일 통화 구현으로 덮어쓰지 않는다.
 */
export const recognitionLocaleByCountry = {
  VN: 'vi-VN',
  JP: 'ja-JP',
  US: 'en-US',
  CN: 'zh-CN',
} as const;

export function getRecognitionLocale(countryCode: SupportedCountryCode) {
  return recognitionLocaleByCountry[countryCode];
}

export class SpeechRecognitionError extends Error {
  constructor(
    message: string,
    public readonly code: ExpoSpeechRecognitionErrorCode | 'permission-denied' | 'empty-result' | 'speech-timeout',
  ) {
    super(message);
    this.name = 'SpeechRecognitionError';
  }
}

export class SpeechRecognitionService {
  private activeSubscriptions: Array<{ remove: () => void }> = [];
  private activeCancel: (() => void) | null = null;
  private sessionCounter = 0;

  async recognize(countryCode: SupportedCountryCode): Promise<SpeechRecognitionResult> {
    // Do not abort an idle native recognizer before the first start request.
    // This preserves the previously working Android initialization sequence.
    if (this.activeSubscriptions.length) this.cancel();
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    recordVoiceDiagnostic('VOICE_02_PERMISSION', { permissionStatus: permission.status, currencyCode: countryCode });
    console.log('[VOICE_02_PERMISSION]', { permissionStatus: permission.status });
    console.log('[PRICEGO_SPEECH_PERMISSION]', { status: permission.status, canAskAgain: permission.canAskAgain });
    if (!permission.granted) throw new SpeechRecognitionError('마이크 권한이 필요합니다.', 'permission-denied');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      throw new SpeechRecognitionError('음성인식 서비스를 사용할 수 없습니다.', 'service-not-allowed');
    }

    const language = getRecognitionLocale(countryCode);
    recordVoiceDiagnostic('VOICE_03_LOCALE', { currencyCode: countryCode, locale: language });
    console.log('[VOICE_03_LOCALE]', { currencyCode: countryCode, locale: language });
    const sessionId = ++this.sessionCounter;
    const startedAt = Date.now();
    console.log('[PRICEGO_SPEECH_SESSION]', { sessionId, locale: language, currency: countryCode, startedAt });

    return new Promise<SpeechRecognitionResult>((resolve, reject) => {
      let transcript = '';
      let confidence = -1;
      let alternatives: Array<{ transcript: string; confidence: number }> = [];
      let hadFinal = false;
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout>;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.removeSubscriptions();
        callback();
      };
      this.activeCancel = () => finish(() => reject(new SpeechRecognitionError('음성인식이 취소되었습니다.', 'aborted')));
      const timeout = () => {
        console.log('[PRICEGO_SPEECH_TIMEOUT]', { sessionId, hadPartial: Boolean(transcript.trim()), lastPartial: transcript, elapsedMs: Date.now() - startedAt });
        ExpoSpeechRecognitionModule.abort();
        finish(() => reject(new SpeechRecognitionError('음성 인식 시간이 초과되었습니다.', 'speech-timeout')));
      };
      const armTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(timeout, SPEECH_TIMEOUT_MS);
      };

      this.activeSubscriptions = [
        ExpoSpeechRecognitionModule.addListener('start', () => {
          console.log('[VOICE_05_SPEECH_STARTED]', { sessionId, locale: language });
          recordVoiceDiagnostic('VOICE_05_SPEECH_STARTED', { currencyCode: countryCode, locale: language });
        }),
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const results = event.results.filter((item) => item.transcript?.trim());
          const result = results[0];
          if (!result) return;
          transcript = result.transcript;
          console.log('[VOICE_06_RESULT]', { rawSpeechText: transcript, sessionId });
          recordVoiceDiagnostic('VOICE_06_RESULT', { currencyCode: countryCode, locale: language, rawSpeechText: transcript });
          confidence = result.confidence;
          alternatives = results.map((item) => ({ transcript: item.transcript, confidence: item.confidence }));
          armTimeout();
          console.log(event.isFinal ? '[PRICEGO_SPEECH_FINAL]' : '[PRICEGO_SPEECH_PARTIAL]', { sessionId, results, elapsedMs: Date.now() - startedAt });
          if (!event.isFinal) return;
          hadFinal = true;
          finish(() => resolve({ recognizedText: transcript, confidence: confidence >= 0 ? confidence : 0, alternatives }));
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.log('[VOICE_08_ERROR]', { code: event.error, message: event.message, sessionId });
          recordVoiceDiagnostic('VOICE_08_ERROR', { currencyCode: countryCode, locale: language, code: event.error, message: event.message });
          console.log('[PRICEGO_SPEECH_ERROR]', { sessionId, code: event.error, message: event.message, elapsedMs: Date.now() - startedAt });
          finish(() => reject(new SpeechRecognitionError(event.message || '음성인식에 실패했습니다.', event.error)));
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          console.log('[PRICEGO_SPEECH_END]', { sessionId, hadPartial: Boolean(transcript), hadFinal, elapsedMs: Date.now() - startedAt });
          if (!transcript.trim()) finish(() => reject(new SpeechRecognitionError('음성이 감지되지 않았습니다.', 'empty-result')));
          else if (!hadFinal) finish(() => resolve({ recognizedText: transcript, confidence: confidence >= 0 ? confidence : 0, alternatives }));
        }),
      ];
      armTimeout();
      try {
        console.log('[VOICE_04_START_REQUEST]', { locale: language });
        recordVoiceDiagnostic('VOICE_04_START_REQUEST', { currencyCode: countryCode, locale: language });
        ExpoSpeechRecognitionModule.start({ lang: language, interimResults: true, maxAlternatives: 3 });
        console.log('[PRICEGO_SPEECH_START]', { sessionId, nativeAvailable: true, permission: permission.status });
      } catch (error) {
        finish(() => reject(new SpeechRecognitionError(error instanceof Error ? error.message : '음성인식을 시작할 수 없습니다.', 'unknown')));
      }
    });
  }

  cancel() {
    this.activeCancel?.();
    this.activeCancel = null;
    if (this.activeSubscriptions.length) ExpoSpeechRecognitionModule.abort();
    this.removeSubscriptions();
  }

  private removeSubscriptions() {
    this.activeSubscriptions.forEach((subscription) => subscription.remove());
    this.activeSubscriptions = [];
  }
}
