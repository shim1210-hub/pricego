import { LocalStorageService } from './storage';
import type { AppSettings, SupportedCountryCode } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  selectedCountryCode: 'VN',
  selectedCurrency: 'VND',
  offlineFirst: true,
  autoUpdate: true,
  vibrationOn: true,
  largeResultText: true,
};

const SETTINGS_KEY = 'pricego-settings';

export class AppSettingsService {
  private readonly storage = new LocalStorageService();

  async load(): Promise<AppSettings> {
    try {
      const stored = await this.storage.getItem(SETTINGS_KEY);
      if (!stored) {
        await this.save(DEFAULT_APP_SETTINGS);
        return DEFAULT_APP_SETTINGS;
      }

      const parsed: unknown = JSON.parse(stored);
      if (!this.isValid(parsed)) throw new Error('Invalid settings');
      return parsed;
    } catch {
      await this.save(DEFAULT_APP_SETTINGS);
      return DEFAULT_APP_SETTINGS;
    }
  }

  save(settings: AppSettings) {
    return this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  private isValid(value: unknown): value is AppSettings {
    if (!value || typeof value !== 'object') return false;
    const settings = value as Partial<AppSettings>;
    return (
      ['US', 'JP', 'CN', 'VN'].includes(settings.selectedCountryCode as SupportedCountryCode) &&
      typeof settings.selectedCurrency === 'string' &&
      typeof settings.offlineFirst === 'boolean' &&
      typeof settings.autoUpdate === 'boolean' &&
      typeof settings.vibrationOn === 'boolean' &&
      typeof settings.largeResultText === 'boolean'
    );
  }
}
