// player-hook.js — Runs in MAIN world to directly access Netflix & HTML5 video players
(function () {
  console.log('[WatchParty Hook] Injected into main execution world');

  let isProgrammaticAction = false;
  let lastReportedTime = 0;
  let lastReportedState = 'paused';

  function getNetflixPlayer() {
    try {
      const vp = window.netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
      if (!vp) return null;
      const ids = vp.getAllPlayerSessionIds();
      if (!ids || ids.length === 0) return null;
      return vp.getVideoPlayerBySessionId(ids[ids.length - 1]);
    } catch {
      return null;
    }
  }

  function getActiveVideoElement() {
    return document.querySelector('video');
  }

  function getCurrentTime() {
    const netflixPlayer = getNetflixPlayer();
    if (netflixPlayer && typeof netflixPlayer.getCurrentTime === 'function') {
      return Math.floor(netflixPlayer.getCurrentTime() / 1000);
    }
    const video = getActiveVideoElement();
    if (video && typeof video.currentTime === 'number') {
      return Math.floor(video.currentTime);
    }
    return 0;
  }

  function isVideoPlaying() {
    const netflixPlayer = getNetflixPlayer();
    if (netflixPlayer && typeof netflixPlayer.isPlaying === 'function') {
      return netflixPlayer.isPlaying();
    }
    const video = getActiveVideoElement();
    if (video) {
      return !video.paused && !video.ended && video.readyState > 2;
    }
    return false;
  }

  function broadcastLocalAction(action, time) {
    if (isProgrammaticAction) return;
    lastReportedState = action;
    lastReportedTime = time;
    window.postMessage(
      {
        source: 'wp-player-hook',
        action,
        time,
        timestamp: Date.now(),
      },
      '*'
    );
  }

  // Hook into HTML5 <video> elements
  function attachVideoListeners(video) {
    if (video._wpHooked) return;
    video._wpHooked = true;

    video.addEventListener('play', () => {
      broadcastLocalAction('play', Math.floor(video.currentTime));
    });

    video.addEventListener('pause', () => {
      broadcastLocalAction('pause', Math.floor(video.currentTime));
    });

    video.addEventListener('seeked', () => {
      broadcastLocalAction('seek', Math.floor(video.currentTime));
    });
  }

  // Observe DOM for newly inserted video tags (SPA transitions)
  const observer = new MutationObserver(() => {
    const video = getActiveVideoElement();
    if (video) attachVideoListeners(video);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Initial attach
  const initialVideo = getActiveVideoElement();
  if (initialVideo) attachVideoListeners(initialVideo);

  // Periodic fallback check for Netflix custom player state
  setInterval(() => {
    const np = getNetflixPlayer();
    if (!np) return;
    try {
      const playing = np.isPlaying();
      const time = Math.floor(np.getCurrentTime() / 1000);
      const state = playing ? 'play' : 'pause';

      if (state !== lastReportedState && !isProgrammaticAction) {
        broadcastLocalAction(state, time);
      }
    } catch {}
  }, 1000);

  // Handle incoming remote sync commands from WatchParty content script
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'wp-content-script') return;
    const { action, time } = event.data;

    isProgrammaticAction = true;
    setTimeout(() => {
      isProgrammaticAction = false;
    }, 1200);

    const netflixPlayer = getNetflixPlayer();
    const video = getActiveVideoElement();

    try {
      if (action === 'remote-play') {
        if (netflixPlayer) {
          if (typeof time === 'number' && Math.abs(getCurrentTime() - time) > 2) {
            netflixPlayer.seek(time * 1000);
          }
          netflixPlayer.play();
        } else if (video) {
          if (typeof time === 'number' && Math.abs(video.currentTime - time) > 2) {
            video.currentTime = time;
          }
          video.play().catch(() => {});
        }
      } else if (action === 'remote-pause') {
        if (netflixPlayer) {
          if (typeof time === 'number' && Math.abs(getCurrentTime() - time) > 2) {
            netflixPlayer.seek(time * 1000);
          }
          netflixPlayer.pause();
        } else if (video) {
          if (typeof time === 'number' && Math.abs(video.currentTime - time) > 2) {
            video.currentTime = time;
          }
          video.pause();
        }
      } else if (action === 'remote-seek') {
        if (typeof time === 'number') {
          if (netflixPlayer) {
            netflixPlayer.seek(time * 1000);
          } else if (video) {
            video.currentTime = time;
          }
        }
      }
    } catch (err) {
      console.warn('[WatchParty Hook] Remote action error:', err);
    }
  });
})();
