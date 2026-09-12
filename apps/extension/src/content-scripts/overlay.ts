/**
 * Floating WatchParty Status Pill Overlay
 * Renders a clean tactile pill on the host streaming page so users can monitor sync status
 * and extract the clean video player without clicking deceptive site DOM elements.
 */

export function injectFloatingOverlay(roomId: string, onPopout?: () => void) {
  if (document.getElementById('watchparty-floating-pill')) return;

  const pill = document.createElement('div');
  pill.id = 'watchparty-floating-pill';
  pill.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    background: rgba(11, 13, 17, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    user-select: none;
    cursor: default;
  `;

  pill.innerHTML = `
    <span style="color: #34D399;">●</span>
    <span>WatchParty: ${roomId}</span>
    <button id="wp-popout-btn" style="
      background: #2563EB;
      color: #fff;
      border: none;
      border-radius: 9999px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 4px;
    ">Pop-out Player</button>
  `;

  document.documentElement.appendChild(pill);

  const popoutBtn = document.getElementById('wp-popout-btn');
  if (popoutBtn && onPopout) {
    popoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onPopout();
    });
  }
}
