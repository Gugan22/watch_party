// frame-cleaner.js — Runs inside framed streaming pages to clean UI and bridge playback with WatchParty
(function () {
  // Only execute when framed inside an iframe (e.g. inside WatchParty stage)
  if (window === window.top) return;

  console.log('[WatchParty Frame Cleaner] Active inside embedded streaming stage');

  function applyStageStyling() {
    if (document.body) {
      document.body.classList.add('wp-framed-stage');
    }
  }

  applyStageStyling();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStageStyling);
  }

  // Bidirectional communication between framed page and parent WatchParty window
  window.addEventListener('message', (event) => {
    if (!event.data) return;

    // 1. From local player hook (Netflix/Prime) -> Forward up to parent WatchParty room
    if (event.data.source === 'wp-player-hook') {
      try {
        window.parent.postMessage(
          {
            source: 'wp-embedded-frame',
            action: event.data.action,
            time: event.data.time,
          },
          '*'
        );
      } catch (err) {
        console.warn('[WatchParty Frame Cleaner] PostMessage to parent failed:', err);
      }
    }

    // 2. From parent WatchParty room -> Command local player hook
    if (event.data.source === 'wp-room-stage') {
      window.postMessage(
        {
          source: 'wp-content-script',
          action: `remote-${event.data.action}`,
          time: event.data.time,
        },
        '*'
      );
    }
  });
})();
