/**
 * WatchParty iOS Safari Bookmarklet
 * Format: javascript:(function(){...})()
 * Extracts clean video player embeds or syncs top-level HTML5 video on iOS Safari.
 */

(function () {
  const existingPill = document.getElementById('watchparty-ios-pill');
  if (existingPill) {
    existingPill.remove();
    return;
  }

  // 1. Check for nested embed iframes (e.g. movies2watch, rabbitstream, megacloud)
  const iframes = Array.from(
    document.querySelectorAll('iframe[src*="embed"], iframe[src*="player"], iframe[src*="video"], iframe[src*="cloud"]')
  );

  if (iframes.length > 0 && window.self === window.top) {
    const embedSrc = (iframes[0] as HTMLIFrameElement).src;
    const choice = confirm(
      '🎬 WatchParty iOS Pop-Out:\n\n' +
      'Found embedded player iframe. Open clean video player tab in Safari to bypass popups and enable native sync?'
    );
    if (choice && embedSrc) {
      window.location.href = embedSrc;
      return;
    }
  }

  // 2. Attach to direct video element
  const video = document.querySelector('video');
  if (!video) {
    alert('⚠️ No video element found in the active tab.');
    return;
  }

  // 3. Inject minimal iOS sync indicator
  const pill = document.createElement('div');
  pill.id = 'watchparty-ios-pill';
  pill.style.cssText =
    'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(11,13,17,0.95);color:#34D399;padding:8px 18px;border-radius:9999px;font-family:sans-serif;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);';
  pill.innerHTML = '● WatchParty Synced (' + Math.round(video.currentTime) + 's)';
  document.body.appendChild(pill);

  video.addEventListener('timeupdate', function () {
    pill.innerHTML = (video.paused ? '⏸️ ' : '▶️ ') + 'WatchParty (' + Math.round(video.currentTime) + 's)';
  });
})();
