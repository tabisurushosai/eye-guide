export type SupportedLocale = 'ja' | 'en';

export const normalizeLocale = (language?: string): SupportedLocale => {
  const primaryLanguage = language?.toLowerCase().split('-')[0];
  return primaryLanguage === 'en' ? 'en' : 'ja';
};

export const formatInteger = (value: number, locale: SupportedLocale): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0
  }).format(value);

export const formatPixels = (value: number, locale: SupportedLocale): string =>
  `${formatInteger(value, locale)} px`;

export const formatPercent = (value: number, locale: SupportedLocale): string =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0
  }).format(value);
