const LINE_ID = 'eye-guide-line';

const handleMouseMove = (e: MouseEvent) => {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.style.top = `${e.clientY}px`;
  }
};

export function showLine() {
  if (document.getElementById(LINE_ID)) return;

  const lineElement = document.createElement('div');
  lineElement.id = LINE_ID;
  lineElement.style.position = 'fixed';
  lineElement.style.left = '0';
  lineElement.style.width = '100%';
  lineElement.style.height = '4px';
  lineElement.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
  lineElement.style.pointerEvents = 'none';
  lineElement.style.zIndex = '2147483647';
  lineElement.style.transform = 'translateY(-50%)';
  lineElement.style.top = '50%';

  document.body.appendChild(lineElement);
  document.addEventListener('mousemove', handleMouseMove);
}

export function removeLine() {
  const el = document.getElementById(LINE_ID);
  if (el) {
    el.remove();
  }
  document.removeEventListener('mousemove', handleMouseMove);
}

(window as any).showLine = showLine;
(window as any).removeLine = removeLine;
