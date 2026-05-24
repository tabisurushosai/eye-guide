import type { Settings } from '../core/settings';

export const STORAGE_KEYS = {
  settings: 'settings',
  autoOnSites: 'autoOnSites',
  trialStartTs: 'trial_start_ts',
  isPremium: 'isPremium'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageValueMap {
  [STORAGE_KEYS.settings]: Partial<Settings>;
  [STORAGE_KEYS.autoOnSites]: string[];
  [STORAGE_KEYS.trialStartTs]: number;
  [STORAGE_KEYS.isPremium]: boolean;
}

export type StorageReadKeys<K extends StorageKey = StorageKey> = K | readonly K[];
export type StorageSnapshot<K extends StorageKey = StorageKey> = Partial<Pick<StorageValueMap, K>>;
export type StorageWriteValues<K extends StorageKey = StorageKey> = StorageSnapshot<K>;

export interface StorageAdapter {
  read<K extends StorageKey>(keys: StorageReadKeys<K>): Promise<StorageSnapshot<K>>;
  write<K extends StorageKey>(values: StorageWriteValues<K>): Promise<void>;
}
