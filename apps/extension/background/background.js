// background.js — Service worker for WatchParty Companion Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[WatchParty Extension] Installed successfully');
});

// When user clicks extension icon in browser toolbar
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-sidebar' });
  } catch (err) {
    console.warn('[WatchParty Extension] Tab message error:', err);
  }
});
