import type { Settings } from '../core/settings';

export interface StorageValues {
  settings: Partial<Settings>;
  autoOnSites: string[];
  trial_start_ts: number;
  isPremium: boolean;
}

export type StorageKey = keyof StorageValues;
export type StorageSnapshot = Partial<StorageValues>;
export type StorageReadRequest = StorageKey | readonly StorageKey[];
export type StorageReadResult<Key extends StorageKey> = Pick<StorageSnapshot, Key>;

export interface StorageAdapter {
  read<Key extends StorageKey>(key: Key): Promise<StorageReadResult<Key>>;
  read<Key extends StorageKey>(keys: readonly Key[]): Promise<StorageReadResult<Key>>;
  write(values: StorageSnapshot): Promise<void>;
}
