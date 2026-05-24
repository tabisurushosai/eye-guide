import type { StorageAdapter, StorageReadKeys, StorageSnapshot } from './types';

const toChromeStorageKeys = (keys: StorageReadKeys): string | string[] => {
  return typeof keys === 'string' ? keys : [...keys];
};

export const chromeStorage: StorageAdapter = {
  async read(keys): Promise<StorageSnapshot> {
    return chrome.storage.local.get(toChromeStorageKeys(keys)) as Promise<StorageSnapshot>;
  },
  async write(values) {
    await chrome.storage.local.set(values);
  }
};
