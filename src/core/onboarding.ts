import type { Settings } from './settings';

export const shouldShowOnboardingGuide = (settings?: Partial<Settings>): boolean => {
  return settings === undefined;
};
