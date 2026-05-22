// Localization
const localize = () => {
  const elements = [
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
};

const STRIPE_URL = 'https://checkout.stripe.com/pay/eye-guide-premium';

const checkPremium = async () => {
  const data = await chrome.storage.local.get(['trial_start_ts', 'isPremium']);
  let trialStart = data.trial_start_ts;
  if (!trialStart) {
    trialStart = Date.now();
    await chrome.storage.local.set({ trial_start_ts: trialStart });
  }

  const isPremium = data.isPremium === true;
  const daysPassed = Math.floor((Date.now() - trialStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, 7 - daysPassed);
  const isTrialActive = remainingDays > 0;
  const hasAccess = isPremium || isTrialActive;

  const statusEl = document.getElementById('premium-status');
  const upgradeContainer = document.getElementById('upgrade-container');
  
  if (isPremium) {
    if (statusEl) statusEl.textContent = chrome.i18n.getMessage('premiumStatus');
    if (upgradeContainer) upgradeContainer.style.display = 'none';
  } else if (isTrialActive) {
    if (statusEl) statusEl.textContent = chrome.i18n.getMessage('trialRemaining', [remainingDays.toString()]);
    if (upgradeContainer) upgradeContainer.style.display = 'block';
  } else {
    if (statusEl) statusEl.textContent = chrome.i18n.getMessage('trialExpired');
    if (upgradeContainer) upgradeContainer.style.display = 'block';
  }

  // Lock/Unlock features
  const presets = document.getElementById('presets-container');
  const autoOn = document.getElementById('auto-on-container');
  if (hasAccess) {
    presets?.classList.remove('premium-lock');
    autoOn?.classList.remove('premium-lock');
  } else {
    presets?.classList.add('premium-lock');
    autoOn?.classList.add('premium-lock');
  }

  return hasAccess;
};

document.addEventListener('DOMContentLoaded', async () => {
  localize();
  const hasAccess = await checkPremium();

  // Auto ON logic
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && hasAccess) {
    const hostname = new URL(tab.url).hostname;
    const data = await chrome.storage.local.get('autoOnSites');
    const autoOnSites = data.autoOnSites || [];
    if (autoOnSites.includes(hostname)) {
      (document.getElementById('auto-on') as HTMLInputElement).checked = true;
      // Trigger ON if not already ON (we can't easily check if it's ON without messaging, 
      // but we can just call the ON logic)
      document.getElementById('toggle-on')?.click();
    }
  }
});

const getSettings = () => {
  return {
    color: (document.getElementById('color') as HTMLInputElement).value,
    thickness: parseInt((document.getElementById('thickness') as HTMLInputElement).value),
    opacity: parseFloat((document.getElementById('opacity') as HTMLInputElement).value),
    mode: (document.getElementById('mode') as HTMLSelectElement).value,
    autoOn: (document.getElementById('auto-on') as HTMLInputElement).checked
  };
};

const saveSettings = async () => {
  const settings = getSettings();
  const data = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...data.settings, ...settings } });

  // Handle autoOnSites
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const hostname = new URL(tab.url).hostname;
    const storageData = await chrome.storage.local.get('autoOnSites');
    let autoOnSites: string[] = storageData.autoOnSites || [];
    if (settings.autoOn) {
      if (!autoOnSites.includes(hostname)) autoOnSites.push(hostname);
    } else {
      autoOnSites = autoOnSites.filter(h => h !== hostname);
    }
    await chrome.storage.local.set({ autoOnSites });
  }

  return settings;
};

const updateContent = async (settings: any) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
  }
};

['color', 'thickness', 'opacity', 'mode', 'auto-on'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', async () => {
    const settings = await saveSettings();
    await updateContent(settings);
  });
});

// Color presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const color = (e.target as HTMLButtonElement).dataset.color;
    if (color) {
      (document.getElementById('color') as HTMLInputElement).value = color;
      const settings = await saveSettings();
      await updateContent(settings);
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
    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LINE' });
  }
});

document.getElementById('toggle-off')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_LINE' });
  }
});

// Load initial settings from storage
chrome.storage.local.get(['settings', 'autoOnSites'], async (data) => {
  if (data.settings) {
    (document.getElementById('color') as HTMLInputElement).value = data.settings.color;
    (document.getElementById('thickness') as HTMLInputElement).value = data.settings.thickness;
    (document.getElementById('opacity') as HTMLInputElement).value = data.settings.opacity;
    if (data.settings.mode) {
      (document.getElementById('mode') as HTMLSelectElement).value = data.settings.mode;
    }
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const hostname = new URL(tab.url).hostname;
    const autoOnSites = data.autoOnSites || [];
    (document.getElementById('auto-on') as HTMLInputElement).checked = autoOnSites.includes(hostname);
  }
});
