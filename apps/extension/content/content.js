// content.js — Injects WatchParty sidebar and bridges video player with WatchParty room
(function () {
  console.log('[WatchParty Extension] Content script loaded on:', window.location.hostname);

  const APP_URL = 'http://localhost:3000'; // Defaults to local dev or production URL
  const PRODUCTION_APP_URL = 'https://watchparty-amber-psi.vercel.app';

  // Detect whether dev server or production is reachable, or use default
  let baseAppUrl = PRODUCTION_APP_URL;

  let sidebarContainer = null;
  let toggleTab = null;
  let sidebarIframe = null;
  let currentRoomId = 'cinema-party';
  let isOpen = false;

  // 1. Detect room ID from URL hash (#watchparty=ROOM_ID)
  function detectRoomFromUrl() {
    const hash = window.location.hash;
    const match = hash.match(/watchparty=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }

  // 2. Initialize Extension on Page
  async function init() {
    // Check URL hash first
    const urlRoom = detectRoomFromUrl();
    if (urlRoom) {
      currentRoomId = urlRoom;
      await chrome.storage.local.set({ wp_current_room: currentRoomId, wp_sidebar_open: true });
      createSidebar(currentRoomId, true);
      return;
    }

    // Check stored state
    chrome.storage.local.get(['wp_current_room', 'wp_sidebar_open'], (res) => {
      if (res.wp_current_room) {
        currentRoomId = res.wp_current_room;
      }
      createSidebar(currentRoomId, Boolean(res.wp_sidebar_open));
    });
  }

  // 3. Create Injected DOM Elements
  function createSidebar(roomId, shouldOpen = false) {
    if (document.getElementById('watchparty-sidebar-container')) return;

    // Sidebar Container
    sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'watchparty-sidebar-container';
    sidebarContainer.className = shouldOpen ? '' : 'collapsed';

    // Sidebar Iframe running WatchParty in embedded sidebar mode
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.id = 'watchparty-sidebar-iframe';
    // Allow WebRTC Camera & Microphone in iframe
    sidebarIframe.allow = 'camera; microphone; autoplay; display-capture';
    sidebarIframe.src = `${baseAppUrl}/room/${encodeURIComponent(roomId)}?sidebar=true`;

    sidebarContainer.appendChild(sidebarIframe);
    document.body.appendChild(sidebarContainer);

    // Floating Toggle Tab
    toggleTab = document.createElement('div');
    toggleTab.id = 'watchparty-toggle-tab';
    toggleTab.className = shouldOpen ? '' : 'collapsed';
    toggleTab.innerHTML = `<span>🍿</span><span id="wp-tab-label">${shouldOpen ? 'Close Party' : 'WatchParty'}</span>`;

    toggleTab.addEventListener('click', () => {
      toggleSidebar();
    });

    document.body.appendChild(toggleTab);

    if (shouldOpen) {
      document.body.classList.add('watchparty-sidebar-open');
      isOpen = true;
    }
  }

  function toggleSidebar(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

    if (sidebarContainer) {
      sidebarContainer.classList.toggle('collapsed', !isOpen);
    }
    if (toggleTab) {
      toggleTab.classList.toggle('collapsed', !isOpen);
      const label = document.getElementById('wp-tab-label');
      if (label) {
        label.textContent = isOpen ? 'Close Party' : 'WatchParty';
      }
    }

    document.body.classList.toggle('watchparty-sidebar-open', isOpen);
    chrome.storage.local.set({ wp_sidebar_open: isOpen });
  }

  // 4. Bidirectional Message Passing Bridge
  window.addEventListener('message', (event) => {
    // A. Message from WatchParty Iframe -> Local Player Hook
    if (event.data && event.data.source === 'watchparty-sidebar') {
      const { action, time } = event.data;
      window.postMessage(
        {
          source: 'wp-content-script',
          action: `remote-${action}`,
          time,
        },
        '*'
      );
    }

    // B. Message from Local Player Hook -> WatchParty Iframe
    if (event.data && event.data.source === 'wp-player-hook') {
      const { action, time } = event.data;
      if (sidebarIframe && sidebarIframe.contentWindow) {
        sidebarIframe.contentWindow.postMessage(
          {
            source: 'watchparty-extension',
            action,
            time,
          },
          '*'
        );
      }
    }
  });

  // Listen for messages from extension popup or background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle-sidebar') {
      toggleSidebar();
      sendResponse({ success: true, isOpen });
    } else if (request.action === 'change-room') {
      currentRoomId = request.roomId;
      if (sidebarIframe) {
        sidebarIframe.src = `${baseAppUrl}/room/${encodeURIComponent(currentRoomId)}?sidebar=true`;
      }
      toggleSidebar(true);
      sendResponse({ success: true, roomId: currentRoomId });
    }
  });

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
