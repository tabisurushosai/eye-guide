import type { StorageAdapter, StorageKey, StorageReadKeys, StorageSnapshot, StorageWriteValues } from './types';

interface ChromeStorageArea {
  get(keys: string | string[]): Promise<unknown>;
  set(values: StorageWriteValues): Promise<void>;
}

const toChromeStorageKeys = <K extends StorageKey>(keys: StorageReadKeys<K>): string | string[] => {
  return typeof keys === 'string' ? keys : [...keys];
};

export const createChromeStorageAdapter = (storageArea: ChromeStorageArea): StorageAdapter => ({
  async read<K extends StorageKey>(keys: StorageReadKeys<K>): Promise<StorageSnapshot<K>> {
    return storageArea.get(toChromeStorageKeys(keys)) as Promise<StorageSnapshot<K>>;
  },
  async write<K extends StorageKey>(values: StorageWriteValues<K>) {
    await storageArea.set(values);
  }
});

export const chromeStorage = createChromeStorageAdapter(chrome.storage.local);
