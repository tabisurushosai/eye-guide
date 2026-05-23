export const TRIAL_DAYS = 7;

const DAY_MS = 1000 * 60 * 60 * 24;

export interface PremiumAccess {
  trialStart: number;
  isPremium: boolean;
  remainingDays: number;
  isTrialActive: boolean;
  hasAccess: boolean;
  shouldStoreTrialStart: boolean;
}

export const getPremiumAccess = (
  storedTrialStart: unknown,
  storedIsPremium: unknown,
  now = Date.now()
): PremiumAccess => {
  const shouldStoreTrialStart = !storedTrialStart;
  const trialStart = shouldStoreTrialStart ? now : Number(storedTrialStart);
  const isPremium = storedIsPremium === true;
  const daysPassed = Math.floor((now - trialStart) / DAY_MS);
  const remainingDays = Math.max(0, TRIAL_DAYS - daysPassed);
  const isTrialActive = remainingDays > 0;

  return {
    trialStart,
    isPremium,
    remainingDays,
    isTrialActive,
    hasAccess: isPremium || isTrialActive,
    shouldStoreTrialStart
  };
};
