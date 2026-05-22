const LINE_ID = 'eye-guide-line';

let currentSettings = {
  color: '#ffff00',
  thickness: 4,
  opacity: 0.5,
  mode: 'horizontal'
};

const handleMouseMove = (e: MouseEvent) => {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.style.top = `${e.clientY}px`;
  }
};

function hexToRgba(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function updateSettings(settings: Partial<typeof currentSettings>) {
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings);
  } else if (message.type === 'SHOW_LINE') {
    showLine();
  } else if (message.type === 'REMOVE_LINE') {
    removeLine();
  }
});

(window as any).showLine = showLine;
(window as any).removeLine = removeLine;
(window as any).updateSettings = updateSettings;
