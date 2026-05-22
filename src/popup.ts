document.getElementById('toggle-on')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        (window as any).showLine?.();
      }
    });
  }
});

document.getElementById('toggle-off')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        (window as any).removeLine?.();
      }
    });
  }
});
