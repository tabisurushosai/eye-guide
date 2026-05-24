import { getHostnameFromUrl, isAutoOnSite, updateAutoOnSites } from './core/autoOnSites';
import { formatInteger, formatPercent, formatPixels, formatUsdAmount, normalizeLocale } from './core/format';
import { MESSAGE_TYPES, type EyeGuideMessage } from './core/messages';
import { getInitialGuideState, type InitialGuideState } from './core/onboarding';
import { getPremiumAccess } from './core/premium';
import { mergeSettingsForStorage, type GuideMode, type Settings } from './core/settings';
import { chromeStorage } from './storage/chromeStorage';

// Localization
interface LocalizeElement {
  id: string;
  key: string;
  substitutions?: string[];
}

const uiLocale = normalizeLocale(chrome.i18n.getUILanguage());
const PREMIUM_PRICE_USD = 3;

const localize = () => {
  document.documentElement.lang = uiLocale;
  document.title = chrome.i18n.getMessage('extName');

  const elements: LocalizeElement[] = [
    { id: 'title', key: 'extName' },
    { id: 'subtitle', key: 'extDesc' },
    { id: 'onboarding-title', key: 'onboardingTitle' },
    { id: 'onboarding-body', key: 'onboardingBody' },
    { id: 'onboarding-route', key: 'onboardingRoute' },
    { id: 'onboarding-tip', key: 'onboardingTip' },
    { id: 'onboarding-action', key: 'onboardingAction' },
    { id: 'label-color', key: 'labelColor' },
    { id: 'label-thickness', key: 'labelThickness' },
    { id: 'label-opacity', key: 'labelOpacity' },
    { id: 'label-mode', key: 'labelMode' },
    { id: 'mode-horizontal', key: 'modeHorizontal' },
    { id: 'mode-underline', key: 'modeUnderline' },
    { id: 'mode-window', key: 'modeWindow' },
    { id: 'toggle-on', key: 'btnOn' },
    { id: 'toggle-off', key: 'btnOff' },
    { id: 'label-presets', key: 'labelPresets' },
    { id: 'label-auto-on', key: 'labelAutoOn' },
    { id: 'btn-upgrade', key: 'btnUpgrade', substitutions: [formatUsdAmount(PREMIUM_PRICE_USD, uiLocale)] }
  ];

  elements.forEach(({ id, key, substitutions }) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = chrome.i18n.getMessage(key, substitutions);
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.preset-btn[data-label-key]').forEach((button) => {
    const labelKey = button.dataset.labelKey;
    if (labelKey) {
      button.setAttribute('aria-label', chrome.i18n.getMessage(labelKey));
    }
  });
};

const STRIPE_URL = 'https://checkout.stripe.com/pay/eye-guide-premium';

type StatusTone = 'info' | 'success' | 'warning';

const INITIAL_ACTION_STATUS: Record<InitialGuideState['actionStatus'], { messageKey: string; tone: StatusTone }> = {
  ready: { messageKey: 'statusReady', tone: 'success' },
  firstUseEmpty: { messageKey: 'statusFirstUseEmpty', tone: 'info' }
};

const getElementById = <T extends HTMLElement>(id: string): T | null => {
  return document.getElementById(id) as T | null;
};

const getRequiredElementById = <T extends HTMLElement>(id: string): T => {
  return document.getElementById(id) as T;
};

const getActiveTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const setActionStatus = (messageKey: string, tone: StatusTone = 'info') => {
  const statusEl = getElementById('action-status');
  if (!statusEl) return;

  statusEl.textContent = chrome.i18n.getMessage(messageKey);
  statusEl.dataset.tone = tone;
  statusEl.toggleAttribute('aria-busy', messageKey === 'statusLoading');
};

const setOnboardingGuideVisible = (isVisible: boolean) => {
  const guideEl = getElementById('onboarding-guide');
  if (guideEl) {
    guideEl.hidden = !isVisible;
  }
};

const setPremiumStatus = (message: string, state: StatusTone = 'info', isBusy = false) => {
  const statusEl = getElementById('premium-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset.state = state;
  statusEl.toggleAttribute('aria-busy', isBusy);
};

const syncPresetSelection = (selectedColor: string) => {
  const normalizedSelectedColor = selectedColor.toLowerCase();

  document.querySelectorAll<HTMLButtonElement>('.preset-btn[data-color]').forEach((button) => {
    const presetColor = button.dataset.color?.toLowerCase();
    button.setAttribute('aria-pressed', String(presetColor === normalizedSelectedColor));
  });
};

const syncPresetSelectionFromInput = () => {
  const colorEl = getElementById<HTMLInputElement>('color');
  if (colorEl) {
    syncPresetSelection(colorEl.value);
  }
};

const updateRangeReadouts = () => {
  const thicknessEl = getElementById<HTMLInputElement>('thickness');
  const thicknessValueEl = getElementById('thickness-value');
  if (thicknessEl && thicknessValueEl) {
    const thicknessText = formatPixels(Number.parseInt(thicknessEl.value, 10), uiLocale);
    thicknessValueEl.textContent = thicknessText;
    thicknessEl.setAttribute('aria-valuetext', thicknessText);
  }

  const opacityEl = getElementById<HTMLInputElement>('opacity');
  const opacityValueEl = getElementById('opacity-value');
  if (opacityEl && opacityValueEl) {
    const opacityText = formatPercent(Number.parseFloat(opacityEl.value), uiLocale);
    opacityValueEl.textContent = opacityText;
    opacityEl.setAttribute('aria-valuetext', opacityText);
  }
};

const setPremiumControlsAccess = (hasAccess: boolean) => {
  const premiumContainers = [
    getElementById('presets-container'),
    getElementById('auto-on-container')
  ];

  premiumContainers.forEach((container) => {
    if (!container) return;

    container.classList.toggle('premium-lock', !hasAccess);
    container.setAttribute('aria-disabled', String(!hasAccess));
  });

  document.querySelectorAll<HTMLButtonElement>('#presets-container .preset-btn').forEach((button) => {
    button.disabled = !hasAccess;
  });

  const autoOnEl = getElementById<HTMLInputElement>('auto-on');
  if (autoOnEl) {
    autoOnEl.disabled = !hasAccess;
  }
};

const checkPremium = async () => {
  const data = await chromeStorage.read(['trial_start_ts', 'isPremium']);
  const premiumAccess = getPremiumAccess(data.trial_start_ts, data.isPremium);
  if (premiumAccess.shouldStoreTrialStart) {
    await chromeStorage.write({ trial_start_ts: premiumAccess.trialStart });
  }

  const upgradeContainer = getElementById<HTMLDivElement>('upgrade-container');
  
  if (premiumAccess.isPremium) {
    setPremiumStatus(chrome.i18n.getMessage('premiumStatus'), 'success');
    if (upgradeContainer) upgradeContainer.style.display = 'none';
  } else if (premiumAccess.isTrialActive) {
    const trialMessageKey = premiumAccess.remainingDays === 1 ? 'trialRemainingOne' : 'trialRemainingMany';
    setPremiumStatus(chrome.i18n.getMessage(trialMessageKey, [formatInteger(premiumAccess.remainingDays, uiLocale)]));
    if (upgradeContainer) upgradeContainer.style.display = 'block';
  } else {
    setPremiumStatus(chrome.i18n.getMessage('trialExpired'), 'warning');
    if (upgradeContainer) upgradeContainer.style.display = 'block';
  }

  setPremiumControlsAccess(premiumAccess.hasAccess);

  return premiumAccess.hasAccess;
};

document.addEventListener('DOMContentLoaded', async () => {
  localize();
  setPremiumStatus(chrome.i18n.getMessage('premiumStatusLoading'), 'info', true);
  setActionStatus('statusLoading');
  updateRangeReadouts();
  const initialGuideState = await loadInitialSettings();
  const hasAccess = await checkPremium();
  const actionStatus = INITIAL_ACTION_STATUS[initialGuideState.actionStatus];
  setActionStatus(actionStatus.messageKey, actionStatus.tone);

  // Auto ON logic
  const tab = await getActiveTab();
  if (tab?.url && hasAccess) {
    const hostname = getHostnameFromUrl(tab.url);
    const data = await chromeStorage.read('autoOnSites');
    if (isAutoOnSite(data.autoOnSites ?? [], hostname)) {
      const autoOnEl = getElementById<HTMLInputElement>('auto-on');
      if (autoOnEl) autoOnEl.checked = true;
      getElementById<HTMLButtonElement>('toggle-on')?.click();
    }
  }
});

const getSettings = (): Settings => {
  return {
    color: getRequiredElementById<HTMLInputElement>('color').value,
    thickness: Number.parseInt(getRequiredElementById<HTMLInputElement>('thickness').value, 10),
    opacity: Number.parseFloat(getRequiredElementById<HTMLInputElement>('opacity').value),
    mode: getRequiredElementById<HTMLSelectElement>('mode').value as GuideMode,
    autoOn: getRequiredElementById<HTMLInputElement>('auto-on').checked
  };
};

const saveSettings = async (): Promise<Settings> => {
  const settings = getSettings();
  const data = await chromeStorage.read('settings');
  await chromeStorage.write({ settings: mergeSettingsForStorage(data.settings, settings) });
  setOnboardingGuideVisible(false);

  // Handle autoOnSites
  const tab = await getActiveTab();
  if (tab?.url) {
    const hostname = getHostnameFromUrl(tab.url);
    if (hostname) {
      const storageData = await chromeStorage.read('autoOnSites');
      const autoOnSites = updateAutoOnSites(storageData.autoOnSites ?? [], hostname, settings.autoOn);
      await chromeStorage.write({ autoOnSites });
    }
  }

  return settings;
};

const updateContent = async (settings: Partial<Settings>) => {
  const tab = await getActiveTab();
  if (tab?.id) {
    try {
      const message: EyeGuideMessage = { type: MESSAGE_TYPES.updateSettings, settings };
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      // Content script might not be loaded yet
    }
  }
};

const loadInitialSettings = async () => {
  const data = await chromeStorage.read(['settings', 'autoOnSites']);
  const initialGuideState = getInitialGuideState(data.settings);
  setOnboardingGuideVisible(initialGuideState.showOnboardingGuide);

  if (data.settings) {
    const colorEl = getElementById<HTMLInputElement>('color');
    if (colorEl && data.settings.color) colorEl.value = data.settings.color;
    const thicknessEl = getElementById<HTMLInputElement>('thickness');
    if (thicknessEl && data.settings.thickness !== undefined) {
      thicknessEl.value = String(data.settings.thickness);
    }
    const opacityEl = getElementById<HTMLInputElement>('opacity');
    if (opacityEl && data.settings.opacity !== undefined) {
      opacityEl.value = String(data.settings.opacity);
    }
    if (data.settings.mode) {
      const modeEl = getElementById<HTMLSelectElement>('mode');
      if (modeEl) modeEl.value = data.settings.mode;
    }
  }
  updateRangeReadouts();
  syncPresetSelectionFromInput();
  
  const tab = await getActiveTab();
  if (tab?.url) {
    const hostname = getHostnameFromUrl(tab.url);
    const autoOnEl = getElementById<HTMLInputElement>('auto-on');
    if (autoOnEl) autoOnEl.checked = isAutoOnSite(data.autoOnSites ?? [], hostname);
  }

  return initialGuideState;
};

['color', 'thickness', 'opacity', 'mode', 'auto-on'].forEach(id => {
  getElementById(id)?.addEventListener('input', async () => {
    updateRangeReadouts();
    syncPresetSelectionFromInput();
    const settings = await saveSettings();
    await updateContent(settings);
  });
});

// Color presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const color = (e.currentTarget as HTMLButtonElement).dataset.color;
    if (color) {
      const colorInput = getElementById<HTMLInputElement>('color');
      if (colorInput) {
        colorInput.value = color;
        syncPresetSelection(color);
        const settings = await saveSettings();
        await updateContent(settings);
      }
    }
  });
});

getElementById<HTMLButtonElement>('btn-upgrade')?.addEventListener('click', () => {
  chrome.tabs.create({ url: STRIPE_URL });
});

getElementById<HTMLButtonElement>('toggle-on')?.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (tab?.id) {
    const settings = await saveSettings();
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch {
      // Might already be injected or restricted page
    }
    try {
      const updateMessage: EyeGuideMessage = { type: MESSAGE_TYPES.updateSettings, settings };
      const showMessage: EyeGuideMessage = { type: MESSAGE_TYPES.showLine };
      await chrome.tabs.sendMessage(tab.id, updateMessage);
      await chrome.tabs.sendMessage(tab.id, showMessage);
      setActionStatus('statusLineShown', 'success');
    } catch {
      setActionStatus('statusUnavailable', 'warning');
    }
  } else {
    setActionStatus('statusUnavailable', 'warning');
  }
});

getElementById<HTMLButtonElement>('toggle-off')?.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (tab?.id) {
    try {
      const message: EyeGuideMessage = { type: MESSAGE_TYPES.removeLine };
      await chrome.tabs.sendMessage(tab.id, message);
      setActionStatus('statusLineHidden', 'success');
    } catch {
      setActionStatus('statusUnavailable', 'warning');
    }
  } else {
    setActionStatus('statusUnavailable', 'warning');
  }
});
