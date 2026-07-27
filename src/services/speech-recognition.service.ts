import { COUNTRY_BY_CODE } from './exchange-rate.service';
import type { RecognitionResult, SupportedCountryCode } from './types';

export class SpeechRecognitionService {
  async recognizeMock(countryCode: SupportedCountryCode): Promise<RecognitionResult> {
    const country = COUNTRY_BY_CODE[countryCode];
    const sampleText = this.getMockText(countryCode);
    const parsedAmount = this.getMockAmount(countryCode);

    return {
      recognizedText: sampleText,
      parsedAmount,
      currency: country.currency,
      confidence: 0.92,
      needsConfirmation: parsedAmount >= 300000 && countryCode === 'VN',
    };
  }

  private getMockText(countryCode: SupportedCountryCode) {
    switch (countryCode) {
      case 'VN':
        return 'ba trăm nghìn đồng';
      case 'JP':
        return 'さんびゃくえん';
      case 'CN':
        return '三百元';
      case 'US':
        return 'three hundred dollars';
      default:
        return 'three hundred dollars';
    }
  }

  private getMockAmount(countryCode: SupportedCountryCode) {
    switch (countryCode) {
      case 'VN':
        return 300000;
      case 'JP':
        return 3000;
      case 'CN':
        return 300;
      case 'US':
        return 300;
      default:
        return 300;
    }
  }
}
