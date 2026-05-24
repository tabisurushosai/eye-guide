import type { StorageAdapter, StorageReadRequest, StorageSnapshot } from './types';

const toChromeStorageKeys = (keys: StorageReadRequest): string | string[] => {
  return typeof keys === 'string' ? keys : [...keys];
};

export const chromeStorage: StorageAdapter = {
  async read(keys) {
    return chrome.storage.local.get(toChromeStorageKeys(keys)) as Promise<StorageSnapshot>;
  },
  async write(values) {
    await chrome.storage.local.set(values);
  }
};
