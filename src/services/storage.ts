import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class LocalStorageService {
  constructor(private storage: StorageLike = AsyncStorage) {}

  getItem(key: string) {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string) {
    return this.storage.setItem(key, value);
  }

  removeItem(key: string) {
    return this.storage.removeItem(key);
  }
}
