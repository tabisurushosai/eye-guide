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
    { id: 'toggle-off', key: 'btnOff' }
  ];

  elements.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = chrome.i18n.getMessage(key);
    }
  });
};

document.addEventListener('DOMContentLoaded', localize);

const getSettings = () => {
  return {
    color: (document.getElementById('color') as HTMLInputElement).value,
    thickness: parseInt((document.getElementById('thickness') as HTMLInputElement).value),
    opacity: parseFloat((document.getElementById('opacity') as HTMLInputElement).value),
    mode: (document.getElementById('mode') as HTMLSelectElement).value
  };
};

const saveSettings = async () => {
  const settings = getSettings();
  await chrome.storage.local.set({ settings });
  return settings;
};

const updateContent = async (settings: any) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings });
  }
};

['color', 'thickness', 'opacity', 'mode'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', async () => {
    const settings = await saveSettings();
    await updateContent(settings);
  });
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
chrome.storage.local.get('settings', (data) => {
  if (data.settings) {
    (document.getElementById('color') as HTMLInputElement).value = data.settings.color;
    (document.getElementById('thickness') as HTMLInputElement).value = data.settings.thickness;
    (document.getElementById('opacity') as HTMLInputElement).value = data.settings.opacity;
    if (data.settings.mode) {
      (document.getElementById('mode') as HTMLSelectElement).value = data.settings.mode;
    }
  }
});
