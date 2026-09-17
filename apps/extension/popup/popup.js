// popup.js — Handles extension popup logic
document.addEventListener('DOMContentLoaded', () => {
  const roomInput = document.getElementById('room-input');
  const openSidebarBtn = document.getElementById('open-sidebar-btn');
  const openWebAppBtn = document.getElementById('open-web-app-btn');

  const WEB_APP_URL = 'https://watchparty-amber-psi.vercel.app';

  // Load stored room
  chrome.storage.local.get(['wp_current_room'], (res) => {
    if (res.wp_current_room) {
      roomInput.value = res.wp_current_room;
    }
  });

  openSidebarBtn.addEventListener('click', async () => {
    const roomId = (roomInput.value || 'cinema-party').trim();
    await chrome.storage.local.set({ wp_current_room: roomId, wp_sidebar_open: true });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'change-room', roomId });
      } catch (err) {
        // Content script might not be injected yet or non-streaming page
        alert('Please open Netflix, Prime Video, Hotstar, or Crunchyroll to use the WatchParty sidebar!');
      }
    }
    window.close();
  });

  openWebAppBtn.addEventListener('click', () => {
    const roomId = (roomInput.value || 'cinema-party').trim();
    chrome.tabs.create({ url: `${WEB_APP_URL}/room/${encodeURIComponent(roomId)}` });
    window.close();
  });
});
