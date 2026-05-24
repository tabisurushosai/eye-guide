import type { StorageAdapter, StorageKey, StorageReadRequest, StorageReadResult } from './types';

const toChromeStorageKeys = (keys: StorageReadRequest): string | string[] => {
  return typeof keys === 'string' ? keys : [...keys];
};

export const chromeStorage: StorageAdapter = {
  async read<Key extends StorageKey>(keys: Key | readonly Key[]): Promise<StorageReadResult<Key>> {
    return chrome.storage.local.get(toChromeStorageKeys(keys)) as Promise<StorageReadResult<Key>>;
  },
  async write(values) {
    await chrome.storage.local.set(values);
  }
};
