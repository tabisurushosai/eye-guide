import { getHostnameFromUrl, isAutoOnSite, updateAutoOnSites } from './core/autoOnSites';
import { formatDate, formatInteger, formatPercent, formatPixels, formatUsdAmount, normalizeLocale } from './core/format';
import { MESSAGE_TYPES, type EyeGuideMessage } from './core/messages';
import { getInitialGuideState, type InitialGuideState } from './core/onboarding';
import { getPremiumAccess } from './core/premium';
import { mergeSettingsForStorage, type GuideMode, type Settings } from './core/settings';
import { chromeStorage } from './storage/chromeStorage';
import { STORAGE_KEYS } from './storage/types';

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
    { id: 'onboarding-step-page-title', key: 'onboardingStepPageTitle' },
    { id: 'onboarding-step-page', key: 'onboardingStepPage' },
    { id: 'onboarding-step-on-title', key: 'onboardingStepOnTitle' },
    { id: 'onboarding-step-on', key: 'onboardingStepOn' },
    { id: 'onboarding-tip', key: 'onboardingTip' },
    { id: 'settings-title', key: 'settingsTitle' },
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
    { id: 'preset-help', key: 'presetKeyboardHelp' },
    { id: 'label-auto-on', key: 'labelAutoOn' },
    { id: 'action-controls-label', key: 'actionControlsLabel' },
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
type StatusDatasetKey = 'state' | 'tone';

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

const setStatusElement = (
  elementId: string,
  message: string,
  datasetKey: StatusDatasetKey,
  state: StatusTone,
  isBusy: boolean
): void => {
  const statusEl = getElementById(elementId);
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset[datasetKey] = state;
  statusEl.toggleAttribute('aria-busy', isBusy);
};

const setActionStatus = (messageKey: string, tone: StatusTone = 'info'): void => {
  setStatusElement('action-status', chrome.i18n.getMessage(messageKey), 'tone', tone, messageKey === 'statusLoading');
};

const setOnboardingGuideVisible = (isVisible: boolean): void => {
  const guideEl = getElementById('onboarding-guide');
  if (guideEl) {
    guideEl.hidden = !isVisible;
  }
};

const setPremiumStatus = (message: string, state: StatusTone = 'info', isBusy = false): void => {
  setStatusElement('premium-status', message, 'state', state, isBusy);
};

const syncPresetSelection = (selectedColor: string) => {
  const normalizedSelectedColor = selectedColor.toLowerCase();
  const presetButtons = getPresetButtons();
  const checkedIndex = presetButtons.findIndex((button) => {
    return button.dataset.color?.toLowerCase() === normalizedSelectedColor;
  });
  const tabbableIndex = checkedIndex >= 0 ? checkedIndex : 0;

  presetButtons.forEach((button, index) => {
    const presetColor = button.dataset.color?.toLowerCase();
    button.setAttribute('aria-checked', String(presetColor === normalizedSelectedColor));
    button.tabIndex = button.disabled ? -1 : (index === tabbableIndex ? 0 : -1);
  });
};

const getPresetButtons = () => {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.preset-btn[data-color]'));
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
  getElementById('preset-group')?.setAttribute('aria-disabled', String(!hasAccess));
  syncPresetSelectionFromInput();

  const autoOnEl = getElementById<HTMLInputElement>('auto-on');
  if (autoOnEl) {
    autoOnEl.disabled = !hasAccess;
  }
};

const checkPremium = async () => {
  const data = await chromeStorage.read([STORAGE_KEYS.trialStartTs, STORAGE_KEYS.isPremium]);
  const premiumAccess = getPremiumAccess(data.trial_start_ts, data.isPremium);
  if (premiumAccess.shouldStoreTrialStart) {
    await chromeStorage.write({ [STORAGE_KEYS.trialStartTs]: premiumAccess.trialStart });
  }

  const upgradeContainer = getElementById<HTMLDivElement>('upgrade-container');
  
  if (premiumAccess.isPremium) {
    setPremiumStatus(chrome.i18n.getMessage('premiumStatus'), 'success');
    if (upgradeContainer) upgradeContainer.style.display = 'none';
  } else if (premiumAccess.isTrialActive) {
    const trialMessageKey = premiumAccess.remainingDays === 1 ? 'trialRemainingOne' : 'trialRemainingMany';
    setPremiumStatus(chrome.i18n.getMessage(trialMessageKey, [
      formatInteger(premiumAccess.remainingDays, uiLocale),
      formatDate(premiumAccess.trialEnd, uiLocale)
    ]));
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
    const data = await chromeStorage.read(STORAGE_KEYS.autoOnSites);
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
  const data = await chromeStorage.read(STORAGE_KEYS.settings);
  await chromeStorage.write({ [STORAGE_KEYS.settings]: mergeSettingsForStorage(data.settings, settings) });
  setOnboardingGuideVisible(false);

  // Handle autoOnSites
  const tab = await getActiveTab();
  if (tab?.url) {
    const hostname = getHostnameFromUrl(tab.url);
    if (hostname) {
      const storageData = await chromeStorage.read(STORAGE_KEYS.autoOnSites);
      const autoOnSites = updateAutoOnSites(storageData.autoOnSites ?? [], hostname, settings.autoOn);
      await chromeStorage.write({ [STORAGE_KEYS.autoOnSites]: autoOnSites });
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
  const data = await chromeStorage.read([STORAGE_KEYS.settings, STORAGE_KEYS.autoOnSites]);
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

const selectPreset = async (button: HTMLButtonElement, shouldFocus = false) => {
  const color = button.dataset.color;
  if (!color || button.disabled) {
    return;
  }

  const colorInput = getElementById<HTMLInputElement>('color');
  if (colorInput) {
    colorInput.value = color;
    syncPresetSelection(color);
    if (shouldFocus) {
      button.focus();
    }
    const settings = await saveSettings();
    await updateContent(settings);
  }
};

const getNextPresetButton = (currentButton: HTMLButtonElement, key: string) => {
  const buttons = getPresetButtons().filter((button) => !button.disabled);
  const currentIndex = buttons.indexOf(currentButton);
  if (buttons.length === 0 || currentIndex === -1) {
    return null;
  }

  if (key === 'Home') {
    return buttons[0];
  }
  if (key === 'End') {
    return buttons[buttons.length - 1];
  }

  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  return buttons[(currentIndex + direction + buttons.length) % buttons.length];
};

// Color presets
getPresetButtons().forEach(btn => {
  btn.addEventListener('click', async (e) => {
    await selectPreset(e.currentTarget as HTMLButtonElement);
  });

  btn.addEventListener('keydown', async (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    const nextButton = getNextPresetButton(e.currentTarget as HTMLButtonElement, e.key);
    if (nextButton) {
      await selectPreset(nextButton, true);
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
