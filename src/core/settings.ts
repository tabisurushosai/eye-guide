export type GuideMode = 'horizontal' | 'underline' | 'window';

export interface Settings {
  color: string;
  thickness: number;
  opacity: number;
  mode: GuideMode;
  autoOn: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  color: '#ffff00',
  thickness: 4,
  opacity: 0.5,
  mode: 'horizontal',
  autoOn: false
};

export const normalizeSettings = (settings?: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...settings
});

export const mergeSettingsForStorage = (
  storedSettings: Partial<Settings> | undefined,
  settings: Settings
): Settings => ({
  ...(storedSettings ?? {}),
  ...settings
});
