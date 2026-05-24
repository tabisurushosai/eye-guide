import type { Settings } from '../core/settings';

export const STORAGE_KEYS = ['settings', 'autoOnSites', 'trial_start_ts', 'isPremium'] as const;

export type StorageKey = (typeof STORAGE_KEYS)[number];

export interface StorageValues {
  settings: Partial<Settings>;
  autoOnSites: string[];
  trial_start_ts: number;
  isPremium: boolean;
}

export type StorageSnapshot = Partial<StorageValues>;
export type StorageReadRequest = StorageKey | readonly StorageKey[];

export interface StorageAdapter {
  read(keys: StorageReadRequest): Promise<StorageSnapshot>;
  write(values: StorageSnapshot): Promise<void>;
}
