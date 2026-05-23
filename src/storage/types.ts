import type { Settings } from '../core/settings';

export interface StorageData {
  settings?: Partial<Settings>;
  autoOnSites?: string[];
  trial_start_ts?: number;
  isPremium?: boolean;
}

export type StorageKey = keyof StorageData;

export interface StorageAdapter {
  get(keys: StorageKey | StorageKey[]): Promise<StorageData>;
  set(values: StorageData): Promise<void>;
}
