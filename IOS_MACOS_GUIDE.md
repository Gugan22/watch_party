# WatchParty — iOS & macOS Setup and Compatibility Guide

WatchParty is fully optimized for Apple devices (iPhone, iPad, and Mac) with native safe-area support, standalone PWA integration, Screen Wake Lock, and Safari-compatible media synchronization.

---

## 1. iPhone & iPad (iOS / iPadOS)

### A. Installing as a Standalone Fullscreen PWA
1. Open the WatchParty URL (e.g. `https://your-watchparty.vercel.app`) in **Safari**.
2. Tap the **Share** button (box with an upward arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right.
5. WatchParty now appears on your home screen with the custom cinema visor icon.
   - **Full Standalone Display**: Launches without Safari's top search bar or bottom navigation dock.
   - **Safe-Area Insets**: Configured with `viewport-fit=cover` to respect the Dynamic Island and sensor notch.
   - **Screen Keep-Awake**: Integrated with `useWakeLock` (iOS 18.4+) to keep the screen active during movie playback.

### B. Streaming Site Sync on iOS Safari (Bookmarklet & Pop-Out)
iOS Safari enforces strict cross-origin restrictions that prevent standard extensions from modifying nested third-party `<iframe>`s on sites like `movies2watch.vc`.

**How to sync on iOS Safari:**
1. Open **`apps/extension/targets/bookmarklet/bookmarklet.js`**.
2. Copy the code into a bookmark titled `🎬 WatchParty Sync`.
3. When browsing any movie streaming site on iOS Safari, tap the bookmarklet.
4. It will prompt to **Pop-Out Clean Video Player**:
   - Extracts the clean embed URL (e.g. Rabbitstream/Megacloud) into a dedicated tab.
   - Completely removes the catalogue site's deceptive popups and redirect scripts.
   - Attaches the sync badge directly to the native iOS video player.

### C. iOS Autoplay & WebRTC Microphone/Camera
- iOS Safari strictly forbids programmatic playback of unmuted video without user interaction.
- The **Pre-Join Green Room (AV Check)** serves as the required user gesture: clicking **"Join Party Now"** unlocks the WebAudio context and WebRTC media streams smoothly without Safari blocking them.
- All video tiles feature `playsInline` to prevent iOS from forcing a native fullscreen takeover over the dynamic Meet/Teams layouts.

---

## 2. macOS (MacBook, iMac, Mac Mini)

### A. Desktop Safari / Chrome / Edge
- **Chrome / Edge / Brave**:
  1. Open `chrome://extensions`.
  2. Enable **Developer mode** (top right).
  3. Click **Load unpacked** and select `apps/extension/targets/chrome-edge`.
  4. The extension runs with `"all_frames": true`, injecting directly into video player iframes on Netflix, Prime, YouTube, and `movies2watch.vc` with zero popup triggers.
- **macOS Safari ("Add to Dock")**:
  - In Safari on macOS Sonoma or newer, click **File > Add to Dock** to install WatchParty as a dedicated macOS app.

---

## 3. Local Native iOS App Build (Xcode / Capacitor)

If you want to package a native iOS `.ipa` or run it on a physical iPhone via Xcode:

1. Install Capacitor inside `apps/web`:
   ```bash
   pnpm -C apps/web add @capacitor/core @capacitor/cli @capacitor/ios
   ```
2. Add the iOS platform:
   ```bash
   npx cap add ios
   ```
3. Open in Xcode:
   ```bash
   npx cap open ios
   ```
4. In Xcode:
   - Select your connected iPhone or a Simulator.
   - Ensure **Signing & Capabilities** has your Apple Developer Team selected.
   - Click **Run** (Cmd + R) to compile and install onto your iOS device.
