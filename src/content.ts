import { hexToRgba } from './core/color';
import { normalizeSettings, type Settings } from './core/settings';

const LINE_ID = 'eye-guide-line';

let currentSettings: Settings = normalizeSettings();

type EyeGuideWindow = Window & {
  eyeGuideInjected?: boolean;
  showLine?: typeof showLine;
  removeLine?: typeof removeLine;
  updateSettings?: typeof updateSettings;
};

type EyeGuideMessage = {
  type?: unknown;
  settings?: Partial<Settings>;
};

const eyeGuideWindow = window as EyeGuideWindow;

const isEyeGuideMessage = (message: unknown): message is EyeGuideMessage => {
  return typeof message === 'object' && message !== null;
};

const handleMouseMove = (e: MouseEvent) => {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.style.top = `${e.clientY}px`;
  }
};

export function updateSettings(settings: Partial<Settings>) {
  currentSettings = { ...currentSettings, ...settings };
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.style.height = `${currentSettings.thickness}px`;
    el.style.backgroundColor = currentSettings.mode === 'window' ? 'transparent' : hexToRgba(currentSettings.color, currentSettings.opacity);
    el.style.boxShadow = currentSettings.mode === 'window' ? '0 0 0 100vmax rgba(0, 0, 0, 0.5)' : 'none';
    el.style.transform = currentSettings.mode === 'underline' ? 'none' : 'translateY(-50%)';
  }
}

export function showLine() {
  if (document.getElementById(LINE_ID)) {
    updateSettings({}); // Refresh style if already exists
    return;
  }

  const lineElement = document.createElement('div');
  lineElement.id = LINE_ID;
  lineElement.style.position = 'fixed';
  lineElement.style.left = '0';
  lineElement.style.width = '100%';
  lineElement.style.pointerEvents = 'none';
  lineElement.style.zIndex = '2147483647';
  lineElement.style.top = '50%';

  document.body.appendChild(lineElement);
  updateSettings({}); // Apply initial styles via updateSettings
  document.addEventListener('mousemove', handleMouseMove);
}

export function removeLine() {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.remove();
  }
  document.removeEventListener('mousemove', handleMouseMove);
}

// Avoid duplicate listeners on multiple injections
if (!eyeGuideWindow.eyeGuideInjected) {
  eyeGuideWindow.eyeGuideInjected = true;
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isEyeGuideMessage(message)) {
      return;
    }

    if (message.type === 'UPDATE_SETTINGS') {
      updateSettings(message.settings ?? {});
    } else if (message.type === 'SHOW_LINE') {
      showLine();
    } else if (message.type === 'REMOVE_LINE') {
      removeLine();
    }
  });
}

eyeGuideWindow.showLine = showLine;
eyeGuideWindow.removeLine = removeLine;
eyeGuideWindow.updateSettings = updateSettings;
