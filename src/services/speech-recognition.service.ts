import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

import type { SpeechRecognitionResult, SupportedCountryCode } from './types';

export class SpeechRecognitionError extends Error {
  constructor(
    message: string,
    public readonly code: ExpoSpeechRecognitionErrorCode | 'permission-denied' | 'empty-result',
  ) {
    super(message);
    this.name = 'SpeechRecognitionError';
  }
}

export class SpeechRecognitionService {
  private activeSubscriptions: Array<{ remove: () => void }> = [];

  async recognize(countryCode: SupportedCountryCode): Promise<SpeechRecognitionResult> {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new SpeechRecognitionError('마이크 권한이 필요합니다.', 'permission-denied');
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      throw new SpeechRecognitionError('음성인식 서비스를 사용할 수 없습니다.', 'service-not-allowed');
    }

    const language = countryCode === 'US' ? 'en-US' : 'ko-KR';
    return new Promise<SpeechRecognitionResult>((resolve, reject) => {
      let transcript = '';
      let confidence = -1;
      let settled = false;

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        this.removeSubscriptions();
        callback();
      };

      this.activeSubscriptions = [
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const result = event.results[0];
          if (result?.transcript) {
            transcript = result.transcript;
            confidence = result.confidence;
          }
          if (event.isFinal) {
            if (!transcript.trim()) {
              finish(() => reject(new SpeechRecognitionError('음성이 감지되지 않았습니다.', 'empty-result')));
              return;
            }
            finish(() => resolve({
              recognizedText: transcript,
              confidence: confidence >= 0 ? confidence : 0,
            }));
          }
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          finish(() => reject(new SpeechRecognitionError(event.message || '음성인식에 실패했습니다.', event.error)));
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          if (!transcript) {
            finish(() => reject(new SpeechRecognitionError('음성이 감지되지 않았습니다.', 'empty-result')));
          }
        }),
      ];

      try {
        ExpoSpeechRecognitionModule.start({
          lang: language,
          interimResults: true,
          maxAlternatives: 3,
          contextualStrings: ['동', '만 동', '달러', '엔', '위안', 'VND', 'USD', 'JPY', 'CNY'],
        });
      } catch (error) {
        finish(() => reject(new SpeechRecognitionError(error instanceof Error ? error.message : '음성인식을 시작할 수 없습니다.', 'unknown')));
      }
    });
  }

  cancel() {
    ExpoSpeechRecognitionModule.abort();
    this.removeSubscriptions();
  }

  private removeSubscriptions() {
    this.activeSubscriptions.forEach((subscription) => subscription.remove());
    this.activeSubscriptions = [];
  }
}
