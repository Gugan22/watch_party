# WatchParty — Project History, Architecture & Decisions Context

This document captures the project history, design decisions, monorepo architecture, and key operational details established during development.

---

## 1. Project Overview & Architecture

WatchParty is a zero-budget, self-hosted, TypeScript PWA private watch-party monorepo built using `pnpm` workspace.

### Workspace Structure:
- `apps/web`: Next.js (App Router), Tailwind CSS, TypeScript, LiveKit WebRTC media/audio/video streaming, NextAuth (Google Provider), Capacitor config.
- `apps/extension`: Browser extensions for Chrome, Edge, and Firefox Android, plus an iOS Safari Bookmarklet fallback (`targets/bookmarklet/bookmarklet.js`). Manages video player iframe sync and handles popup/redirect guards on free video streaming sites (e.g. megacloud / rabbitstream).
- `packages/shared`: Shared WebSocket/WebRTC sync protocol (`sync-protocol.ts`), types (`types.ts`), and unit tests.
- `BUILD_APK.md`: Documentation for local Android APK builds via Bubblewrap CLI or Capacitor.
- `IOS_MACOS_GUIDE.md`: Documentation for iOS Safari standalone PWA setup, safe-area configuration, and Xcode Capacitor builds.

---

## 2. Key Architecture & Design Decisions

### A. Authentication & Room Management Rules
- **Host Auth:** Authenticated via Google OAuth (free tier setup via Google Cloud Console).
- **Guest Members:** Require **NO** authentication to join a party. They enter a unique Room ID directly.
- **Host Privileges:** Dynamic link creation (link validity configurable from 4 to 12 hours), kicking members, and remote mute/unmute of video/audio.

### B. UI / UX Design System
- Minimal, clean aesthetic with subtle depth.
- Supports light and dark modes natively (no neon accents).
- Dynamic video grid layouts inspired by Google Meet / Microsoft Teams, supporting tile pinning and collapsible chat drawer.
- Pre-Join Green Room (AV Check) to satisfy mobile browser autoplay/user-gesture requirements for WebAudio and WebRTC.

### C. Extension & Mobile Streaming Strategy
- Free streaming sites insert aggressive popups and nested cross-origin `iframe`s.
- Chrome/Edge extension runs with `"all_frames": true` to inspect and sync nested player frames.
- iOS Safari strictly blocks cross-origin iframe manipulation, so an interactive **Bookmarklet** (`🎬 WatchParty Sync`) extracts the clean embed URL into a dedicated tab.

---

## 3. Conversation History Log

| **Sept 10 - Sept 12, 2026** | `35199e07-22ca-437f-9c14-56a544fb2519` | • Initial specification & popup guard strategy.<br>• Generated `preview.html` UI design system.<br>• Implemented `pnpm` monorepo (`apps/web`, `apps/extension`, `packages/shared`).<br>• Integrated LiveKit WebRTC, wake lock, dynamic grid pinning.<br>• Added `BUILD_APK.md` & `IOS_MACOS_GUIDE.md`.<br>• Refined Google OAuth for Host & no-auth Room ID guest joining. |
| **Sept 12, 2026** | `11685b5c-08d8-4341-ad48-d4eab1afe1dd` | • Deployed monorepo to live Vercel production (`watchparty-amber-psi.vercel.app`).<br>• Consolidated single `.env` file for prod and local environments.<br>• Added Next.js Edge `middleware.ts` for automatic mobile device redirection to `/download`.<br>• Implemented direct live room joining on link click for desktop users.<br>• Added 1-tap browser bypass and standalone PWA detection on `/download`. |
