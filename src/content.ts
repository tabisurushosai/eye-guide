import { hexToRgba } from './core/color';
import { isEyeGuideMessage, MESSAGE_TYPES } from './core/messages';
import { normalizeSettings, type Settings } from './core/settings';

const LINE_ID = 'eye-guide-line';
const KEYBOARD_MOVE_STEP_PX = 16;

let currentSettings: Settings = normalizeSettings();
let currentLineTop = Math.round(window.innerHeight / 2);

type EyeGuideWindow = Window & {
  eyeGuideInjected?: boolean;
  showLine?: typeof showLine;
  removeLine?: typeof removeLine;
  updateSettings?: typeof updateSettings;
};

const eyeGuideWindow = window as EyeGuideWindow;

const getClampedLineTop = (top: number) => {
  return Math.max(0, Math.min(window.innerHeight, top));
};

const setLineTop = (top: number) => {
  currentLineTop = getClampedLineTop(top);
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.style.top = `${currentLineTop}px`;
  }
};

const handleMouseMove = (e: MouseEvent) => {
  setLineTop(e.clientY);
};

const handleKeyboardMove = (e: KeyboardEvent) => {
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.isComposing) {
    return;
  }

  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
    return;
  }

  e.preventDefault();
  const direction = e.key === 'ArrowUp' ? -1 : 1;
  setLineTop(currentLineTop + direction * KEYBOARD_MOVE_STEP_PX);
};

const handleResize = () => {
  setLineTop(currentLineTop);
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
  lineElement.setAttribute('aria-hidden', 'true');

  document.body.appendChild(lineElement);
  setLineTop(currentLineTop);
  updateSettings({}); // Apply initial styles via updateSettings
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('keydown', handleKeyboardMove);
  window.addEventListener('resize', handleResize);
}

export function removeLine() {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.remove();
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('keydown', handleKeyboardMove);
  window.removeEventListener('resize', handleResize);
}

// Avoid duplicate listeners on multiple injections
if (!eyeGuideWindow.eyeGuideInjected) {
  eyeGuideWindow.eyeGuideInjected = true;
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isEyeGuideMessage(message)) {
      return;
    }

    if (message.type === MESSAGE_TYPES.updateSettings) {
      updateSettings(message.settings ?? {});
    } else if (message.type === MESSAGE_TYPES.showLine) {
      showLine();
    } else if (message.type === MESSAGE_TYPES.removeLine) {
      removeLine();
    }
  });
}

eyeGuideWindow.showLine = showLine;
eyeGuideWindow.removeLine = removeLine;
eyeGuideWindow.updateSettings = updateSettings;
