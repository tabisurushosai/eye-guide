import type { Settings } from './settings';

export type InitialGuideState = {
  showOnboardingGuide: boolean;
  actionStatus: 'ready' | 'firstUseEmpty';
};

export const getInitialGuideState = (settings?: Partial<Settings>): InitialGuideState => {
  const showOnboardingGuide = settings === undefined;

  return {
    showOnboardingGuide,
    actionStatus: showOnboardingGuide ? 'firstUseEmpty' : 'ready'
  };
};
