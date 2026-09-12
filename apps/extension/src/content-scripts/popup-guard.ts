/**
 * Anti-Popup & Redirect Defense Guard for Free Streaming Sites (e.g. movies2watch.vc, megacloud, rabbitstream)
 * Injected at document_start to neutralize aggressive ad scripts and deceptive click-hijacking overlays.
 */

export function initPopupGuard() {
  if (typeof window === 'undefined') return;

  // 1. Intercept rogue window.open calls
  const originalOpen = window.open;
  window.open = function (url?: string | URL, target?: string, features?: string) {
    console.warn('[WatchParty Popup Guard] Blocked programmatic popup window.open attempt:', url);
    return null;
  };

  // 2. Protect top-level navigation from rogue nested iframes
  try {
    if (window.top !== window.self) {
      // Prevent child iframe from redirecting the top-level parent window
      Object.defineProperty(window, 'top', {
        get: function () {
          return window.self;
        },
        configurable: false,
      });
    }
  } catch (e) {
    // Cross-origin restriction already prevents access
  }

  // 3. Remove transparent full-screen click-hijack layers dynamically
  const observer = new MutationObserver(() => {
    const deceptiveElements = document.querySelectorAll(
      'div[style*="z-index: 2147483647"], div[style*="z-index: 9999999"], .click-overlay, #hidden-overlay, .banner-overlay'
    );
    deceptiveElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (
        (style.position === 'fixed' || style.position === 'absolute') &&
        (style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)')
      ) {
        console.warn('[WatchParty Popup Guard] Removed deceptive click-hijack overlay:', el);
        el.remove();
      }
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
}
