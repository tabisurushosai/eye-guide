import type { Settings } from './settings';

export const MESSAGE_TYPES = {
  updateSettings: 'UPDATE_SETTINGS',
  showLine: 'SHOW_LINE',
  removeLine: 'REMOVE_LINE'
} as const;

export type UpdateSettingsMessage = {
  type: typeof MESSAGE_TYPES.updateSettings;
  settings?: Partial<Settings> | null;
};

export type EyeGuideMessage =
  | UpdateSettingsMessage
  | { type: typeof MESSAGE_TYPES.showLine }
  | { type: typeof MESSAGE_TYPES.removeLine };

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isSettingsPayload = (value: unknown): value is Partial<Settings> | null | undefined => {
  return value === undefined || value === null || isRecord(value);
};

export const isEyeGuideMessage = (message: unknown): message is EyeGuideMessage => {
  if (!isRecord(message)) {
    return false;
  }

  switch (message.type) {
    case MESSAGE_TYPES.updateSettings:
      return isSettingsPayload(message.settings);
    case MESSAGE_TYPES.showLine:
    case MESSAGE_TYPES.removeLine:
      return true;
    default:
      return false;
  }
};
