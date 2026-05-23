export const getHostnameFromUrl = (url?: string): string | null => {
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

export const isAutoOnSite = (autoOnSites: readonly string[], hostname: string | null): boolean => {
  return Boolean(hostname && autoOnSites.includes(hostname));
};

export const updateAutoOnSites = (
  autoOnSites: readonly string[],
  hostname: string | null,
  shouldEnable: boolean
): string[] => {
  if (!hostname) return [...autoOnSites];

  if (shouldEnable) {
    return autoOnSites.includes(hostname) ? [...autoOnSites] : [...autoOnSites, hostname];
  }

  return autoOnSites.filter((site) => site !== hostname);
};
