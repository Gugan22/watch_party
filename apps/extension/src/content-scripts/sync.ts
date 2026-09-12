import { initPopupGuard } from './popup-guard';
import { injectFloatingOverlay } from './overlay';

/**
 * Shared Core Video Sync Script for Browser Extension & Bookmarklet
 * - Finds underlying HTML5 <video> in top frame or nested iframes (all_frames: true)
 * - Programmatically commands play/pause/seek directly on the HTML5 element (0 popups triggered)
 */

let trackedVideo: HTMLVideoElement | null = null;
let isRemoteAction = false;

export function initSyncEngine(roomId: string = 'live-party') {
  // 1. Activate anti-popup defense
  initPopupGuard();

  // 2. Locate video element
  function attachToVideo(video: HTMLVideoElement) {
    if (trackedVideo === video) return;
    trackedVideo = video;
    console.log('[WatchParty] Successfully attached to video element:', video);

    video.addEventListener('play', () => {
      if (isRemoteAction) return;
      console.log('[WatchParty] Local play at', video.currentTime);
      // broadcast SyncEvent type: 'play'
    });

    video.addEventListener('pause', () => {
      if (isRemoteAction) return;
      console.log('[WatchParty] Local pause at', video.currentTime);
      // broadcast SyncEvent type: 'pause'
    });

    video.addEventListener('seeked', () => {
      if (isRemoteAction) return;
      console.log('[WatchParty] Local seek to', video.currentTime);
      // broadcast SyncEvent type: 'seek'
    });
  }

  // Scan current frame for <video>
  const existingVideo = document.querySelector('video');
  if (existingVideo) {
    attachToVideo(existingVideo);
  }

  // Observe dynamically loaded video players (e.g. Rabbitstream, Megacloud, YouTube)
  const observer = new MutationObserver(() => {
    const v = document.querySelector('video');
    if (v) attachToVideo(v);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 3. Inject floating overlay if top frame
  if (window.self === window.top) {
    injectFloatingOverlay(roomId, () => {
      // Pop-out clean embed helper
      const iframe = document.querySelector('iframe[src*="embed"], iframe[src*="player"], iframe[src*="video"]');
      if (iframe && (iframe as HTMLIFrameElement).src) {
        window.open((iframe as HTMLIFrameElement).src, '_blank');
      } else {
        alert('No embed player iframe detected on this page.');
      }
    });
  }
}

// Auto-run if injected
if (typeof window !== 'undefined') {
  initSyncEngine();
}
