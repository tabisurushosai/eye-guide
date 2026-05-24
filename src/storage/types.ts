import type { Settings } from '../core/settings';

export interface StorageValues {
  settings: Partial<Settings>;
  autoOnSites: string[];
  trial_start_ts: number;
  isPremium: boolean;
}

export type StorageKey = keyof StorageValues;
export type StorageReadKeys = StorageKey | readonly StorageKey[];
export type StorageSnapshot = Partial<StorageValues>;
export type StorageWriteValues = StorageSnapshot;

export interface StorageAdapter {
  read(keys: StorageReadKeys): Promise<StorageSnapshot>;
  write(values: StorageWriteValues): Promise<void>;
}
