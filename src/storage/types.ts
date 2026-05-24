import type { Settings } from '../core/settings';

export const STORAGE_KEYS = {
  settings: 'settings',
  autoOnSites: 'autoOnSites',
  trialStartTs: 'trial_start_ts',
  isPremium: 'isPremium'
} as const;

export interface StorageValues {
  [STORAGE_KEYS.settings]: Partial<Settings>;
  [STORAGE_KEYS.autoOnSites]: string[];
  [STORAGE_KEYS.trialStartTs]: number;
  [STORAGE_KEYS.isPremium]: boolean;
}

export type StorageKey = keyof StorageValues;
export type StorageReadKeys<K extends StorageKey = StorageKey> = K | readonly K[];
export type StorageSnapshot<K extends StorageKey = StorageKey> = Partial<Pick<StorageValues, K>>;
export type StorageWriteValues = StorageSnapshot;

export interface StorageAdapter {
  read<K extends StorageKey>(keys: StorageReadKeys<K>): Promise<StorageSnapshot<K>>;
  write(values: StorageWriteValues): Promise<void>;
}
