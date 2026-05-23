import type { StorageAdapter, StorageData } from './types';

export const chromeStorage: StorageAdapter = {
  async get(keys) {
    return chrome.storage.local.get(keys) as Promise<StorageData>;
  },
  async set(values) {
    await chrome.storage.local.set(values);
  }
};
