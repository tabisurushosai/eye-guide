import type { Settings } from './settings';

export type InitialGuideState = {
  showOnboardingGuide: boolean;
  actionStatus: 'ready' | 'firstUseEmpty';
};

export const shouldShowOnboardingGuide = (settings?: Partial<Settings>): boolean => {
  return settings === undefined;
};

export const getInitialGuideState = (settings?: Partial<Settings>): InitialGuideState => {
  const showOnboardingGuide = shouldShowOnboardingGuide(settings);

  return {
    showOnboardingGuide,
    actionStatus: showOnboardingGuide ? 'firstUseEmpty' : 'ready'
  };
};
