import { getHostnameFromUrl, isAutoOnSite, updateAutoOnSites } from './core/autoOnSites';
import { getPremiumAccess } from './core/premium';
import { mergeSettingsForStorage, type GuideMode, type Settings } from './core/settings';
import { chromeStorage } from './storage/chromeStorage';

// Localization
interface LocalizeElement {
  id: string;
  key: string;
}

const localize = () => {
  const elements: LocalizeElement[] = [
    { id: 'title', key: 'extName' },
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
    { id: 'btn-upgrade', key: 'btnUpgrade' }
  ];

  elements.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = chrome.i18n.getMessage(key);
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

const setActionStatus = (messageKey: string, tone: StatusTone = 'info') => {
  const statusEl = document.getElementById('action-status');
  if (!statusEl) return;

  statusEl.textContent = chrome.i18n.getMessage(messageKey);
  statusEl.dataset.tone = tone;
};

const setPremiumStatus = (message: string, state: StatusTone = 'info') => {
  const statusEl = document.getElementById('premium-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset.state = state;
};

const updateRangeReadouts = () => {
  const thicknessEl = document.getElementById('thickness') as HTMLInputElement | null;
  const thicknessValueEl = document.getElementById('thickness-value');
  if (thicknessEl && thicknessValueEl) {
    const thicknessText = `${thicknessEl.value}px`;
    thicknessValueEl.textContent = thicknessText;
    thicknessEl.setAttribute('aria-valuetext', thicknessText);
  }

  const opacityEl = document.getElementById('opacity') as HTMLInputElement | null;
  const opacityValueEl = document.getElementById('opacity-value');
  if (opacityEl && opacityValueEl) {
    const opacityText = `${Math.round(parseFloat(opacityEl.value) * 100)}%`;
    opacityValueEl.textContent = opacityText;
    opacityEl.setAttribute('aria-valuetext', opacityText);
  }
};

const setPremiumControlsAccess = (hasAccess: boolean) => {
  const premiumContainers = [
    document.getElementById('presets-container'),
    document.getElementById('auto-on-container')
  ];

  premiumContainers.forEach((container) => {
    if (!container) return;

    container.classList.toggle('premium-lock', !hasAccess);
    container.setAttribute('aria-disabled', String(!hasAccess));
  });

  document.querySelectorAll<HTMLButtonElement>('#presets-container .preset-btn').forEach((button) => {
    button.disabled = !hasAccess;
  });

  const autoOnEl = document.getElementById('auto-on') as HTMLInputElement | null;
  if (autoOnEl) {
    autoOnEl.disabled = !hasAccess;
  }
};

const checkPremium = async () => {
  const data = await chromeStorage.get(['trial_start_ts', 'isPremium']);
  const premiumAccess = getPremiumAccess(data.trial_start_ts, data.isPremium);
  if (premiumAccess.shouldStoreTrialStart) {
    await chromeStorage.set({ trial_start_ts: premiumAccess.trialStart });
  }

  const upgradeContainer = document.getElementById('upgrade-container');
  
  if (premiumAccess.isPremium) {
    setPremiumStatus(chrome.i18n.getMessage('premiumStatus'), 'success');
    if (upgradeContainer) upgradeContainer.style.display = 'none';
  } else if (premiumAccess.isTrialActive) {
    setPremiumStatus(chrome.i18n.getMessage('trialRemaining', [premiumAccess.remainingDays.toString()]));
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
  setActionStatus('statusLoading');
  updateRangeReadouts();
  await loadInitialSettings();
  const hasAccess = await checkPremium();
  setActionStatus('statusReady');

  // Auto ON logic
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && hasAccess) {
    const hostname = getHostnameFromUrl(tab.url);
    const data = await chromeStorage.get('autoOnSites');
    if (isAutoOnSite(data.autoOnSites ?? [], hostname)) {
      const autoOnEl = document.getElementById('auto-on') as HTMLInputElement | null;
      if (autoOnEl) autoOnEl.checked = true;
      document.getElementById('toggle-on')?.click();
    }
  }
});

const getSettings = (): Settings => {
  return {
    color: (document.getElementById('color') as HTMLInputElement).value,
    thickness: parseInt((document.getElementById('thickness') as HTMLInputElement).value),
    opacity: parseFloat((document.getElementById('opacity') as HTMLInputElement).value),
    mode: (document.getElementById('mode') as HTMLSelectElement).value as GuideMode,
    autoOn: (document.getElementById('auto-on') as HTMLInputElement).checked
  };
};

const saveSettings = async (): Promise<Settings> => {
  const settings = getSettings();
  const data = await chromeStorage.get('settings');
  await chromeStorage.set({ settings: mergeSettingsForStorage(data.settings, settings) });

  // Handle autoOnSites
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const hostname = getHostnameFromUrl(tab.url);
    if (hostname) {
      const storageData = await chromeStorage.get('autoOnSites');
      const autoOnSites = updateAutoOnSites(storageData.autoOnSites ?? [], hostname, settings.autoOn);
      await chromeStorage.set({ autoOnSites });
    }
  }

  return settings;
};

const updateContent = async (settings: Partial<Settings>) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
    } catch (e) {
      // Content script might not be loaded yet
    }
  }
};

const loadInitialSettings = async () => {
  const data = await chromeStorage.get(['settings', 'autoOnSites']);
  if (data.settings) {
    const colorEl = document.getElementById('color') as HTMLInputElement | null;
    if (colorEl && data.settings.color) colorEl.value = data.settings.color;
    const thicknessEl = document.getElementById('thickness') as HTMLInputElement | null;
    if (thicknessEl && data.settings.thickness !== undefined) {
      thicknessEl.value = String(data.settings.thickness);
    }
    const opacityEl = document.getElementById('opacity') as HTMLInputElement | null;
    if (opacityEl && data.settings.opacity !== undefined) {
      opacityEl.value = String(data.settings.opacity);
    }
    if (data.settings.mode) {
      const modeEl = document.getElementById('mode') as HTMLSelectElement | null;
      if (modeEl) modeEl.value = data.settings.mode;
    }
  }
  updateRangeReadouts();
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const hostname = getHostnameFromUrl(tab.url);
    const autoOnEl = document.getElementById('auto-on') as HTMLInputElement | null;
    if (autoOnEl) autoOnEl.checked = isAutoOnSite(data.autoOnSites ?? [], hostname);
  }
};

['color', 'thickness', 'opacity', 'mode', 'auto-on'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', async () => {
    updateRangeReadouts();
    const settings = await saveSettings();
    await updateContent(settings);
  });
});

// Color presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const color = (e.currentTarget as HTMLButtonElement).dataset.color;
    if (color) {
      const colorInput = document.getElementById('color') as HTMLInputElement | null;
      if (colorInput) {
        colorInput.value = color;
        const settings = await saveSettings();
        await updateContent(settings);
      }
    }
  });
});

document.getElementById('btn-upgrade')?.addEventListener('click', () => {
  chrome.tabs.create({ url: STRIPE_URL });
});

document.getElementById('toggle-on')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const settings = await saveSettings();
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) {
      // Might already be injected or restricted page
    }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LINE' });
      setActionStatus('statusLineShown', 'success');
    } catch (e) {
      setActionStatus('statusUnavailable', 'warning');
    }
  } else {
    setActionStatus('statusUnavailable', 'warning');
  }
});

document.getElementById('toggle-off')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_LINE' });
      setActionStatus('statusLineHidden', 'success');
    } catch (e) {
      setActionStatus('statusUnavailable', 'warning');
    }
  } else {
    setActionStatus('statusUnavailable', 'warning');
  }
});
