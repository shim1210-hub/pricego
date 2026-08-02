import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

import type { SpeechRecognitionResult, SupportedCountryCode } from './types';

const SPEECH_TIMEOUT_MS = 12_000;

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
    this.cancel();
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    console.log('[PRICEGO_SPEECH_PERMISSION]', { status: permission.status, canAskAgain: permission.canAskAgain });
    if (!permission.granted) throw new SpeechRecognitionError('마이크 권한이 필요합니다.', 'permission-denied');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      throw new SpeechRecognitionError('음성인식 서비스를 사용할 수 없습니다.', 'service-not-allowed');
    }

    // Currency selection and speech language are independent. Korean is the
    // default input language for the current PriceGo flow (including VND).
    const language = ({ US: 'en-US', VN: 'ko-KR', JP: 'ja-JP', CN: 'zh-CN' } as const)[countryCode];
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
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const results = event.results.filter((item) => item.transcript?.trim());
          const result = results[0];
          if (!result) return;
          transcript = result.transcript;
          confidence = result.confidence;
          alternatives = results.map((item) => ({ transcript: item.transcript, confidence: item.confidence }));
          armTimeout();
          console.log(event.isFinal ? '[PRICEGO_SPEECH_FINAL]' : '[PRICEGO_SPEECH_PARTIAL]', { sessionId, results, elapsedMs: Date.now() - startedAt });
          if (!event.isFinal) return;
          hadFinal = true;
          finish(() => resolve({ recognizedText: transcript, confidence: confidence >= 0 ? confidence : 0, alternatives }));
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.log('[PRICEGO_SPEECH_ERROR]', { sessionId, code: event.error, message: event.message, elapsedMs: Date.now() - startedAt });
          finish(() => reject(new SpeechRecognitionError(event.message || '음성인식에 실패했습니다.', event.error)));
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          console.log('[PRICEGO_SPEECH_END]', { sessionId, hadPartial: Boolean(transcript), hadFinal, elapsedMs: Date.now() - startedAt });
          if (!transcript.trim()) finish(() => reject(new SpeechRecognitionError('음성이 감지되지 않았습니다.', 'empty-result')));
          else if (!hadFinal) finish(() => resolve({ recognizedText: transcript, confidence: confidence >= 0 ? confidence : 0, alternatives }));
        }),
      ];
      try {
        ExpoSpeechRecognitionModule.start({ lang: language, interimResults: true, maxAlternatives: 3 });
        armTimeout();
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
