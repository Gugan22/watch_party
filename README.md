# 🍿 WatchParty — Zero-Persistence Private Cinema & OTT Sync

> A high-performance, zero-budget, private watch-party platform with real-time WebRTC audio/video mesh, ephemeral in-memory chat, and **Native OTT Playback Synchronization** (Netflix, Amazon Prime Video, Disney+ Hotstar, YouTube) that eliminates screen-sharing lag and DRM black screens.

**Live Production App:** [https://watchparty-amber-psi.vercel.app](https://watchparty-amber-psi.vercel.app)

---

## 🧹 Active Room Management & Reset URL

WatchParty enforces 100% ephemeral room storage. To clear all active rooms across the platform or start fresh:

### 1. One-Click Browser Reset
Simply click or open this URL in any browser:
- **Production Clear URL:** [https://watchparty-amber-psi.vercel.app/api/rooms/clear?action=clear](https://watchparty-amber-psi.vercel.app/api/rooms/clear?action=clear)
- **Local Dev Clear URL:** [http://localhost:3000/api/rooms/clear?action=clear](http://localhost:3000/api/rooms/clear?action=clear)

### 2. Inspect Active Rooms (GET)
To view the current active room count, active room IDs, and deployment status:
```bash
curl https://watchparty-amber-psi.vercel.app/api/rooms/clear
```
**Sample Response:**
```json
{
  "activeRooms": 1,
  "rooms": ["movie-night"],
  "clearUrl": "https://watchparty-amber-psi.vercel.app/api/rooms/clear?action=clear",
  "deployId": "wp-2468ad5-mu2d8k"
}
```

### 3. Clear Rooms via Terminal (POST)
```bash
# macOS / Linux / Git Bash
curl -X POST https://watchparty-amber-psi.vercel.app/api/rooms/clear

# Windows PowerShell
Invoke-RestMethod -Uri https://watchparty-amber-psi.vercel.app/api/rooms/clear -Method POST
```
**Sample Response:**
```json
{
  "success": true,
  "message": "All active rooms have been cleared (1 removed).",
  "clearedRooms": 1,
  "activeRooms": 0,
  "deployId": "wp-2468ad5-mu2d8k"
}
```

> **Automatic Fresh Slates on Every Deploy:** Each Vercel deployment automatically generates a unique `NEXT_PUBLIC_DEPLOY_ID`. If the deployment ID changes, all lingering rooms from previous versions are purged immediately.

---

## 🚀 Key Features

### 1. Native OTT Playback Synchronization (No Screen Share Lag)
Screen-sharing high-resolution video over WebRTC consumes massive bandwidth (5,000–10,000 kbps), overheats CPUs, causes severe frame stutter, and is blocked with a **black screen** by Widevine DRM on Netflix and Prime Video. 

WatchParty implements **Native OTT Playback Synchronization** (the proven architecture behind Teleparty / Netflix Party):
- **YouTube In-Room Player:** Streams directly via the YouTube IFrame API inside the room in native 1080p 60fps. Play, pause, and seek events are synchronized in real-time (< 100ms) with zero screen sharing.
- **Netflix / Prime Video / Disney+ Cinema Console:** Participants open the movie natively in their own accounts via a 1-click launch button. The host controls playback via a master room console with time scrubbers and skip buttons.
- **⏱️ 3-2-1 Countdown Sync:** Triggers an animated visual and audio countdown chime across all participants' screens, allowing perfect split-second synchronization for users on Smart TVs, tablets, or phones.
- **⚡ 1-Click Auto-Sync Bookmarklet:** A zero-install bookmarklet (`javascript:...`) that runs on any browser (Chrome, Edge, Safari, Firefox). Clicking it on Netflix/Prime hooks into the video element and auto-syncs play/pause/seek commands from the room.
- **🧩 Browser Extension:** Chrome & Edge unpacked extension in `apps/extension` with background script cross-tab messaging.

### 2. High-Performance Audio & Video Pipeline
- **Persistent Root Audio Sinks:** Audio playback elements are hoisted to the root level of the room page, ensuring participant voices **never cut out** when switching layouts or entering Theater mode.
- **Global Autoplay Unlocker:** Eliminates browser `NotAllowedError` autoplay blocks with a global document interaction listener that unlocks remote audio immediately.
- **Edge PiP / Translate Overlay Suppression:** Native Microsoft Edge floating overlays (`[⤹⤸ a あ]`) are suppressed from participant video tiles.

### 3. Dynamic Meeting Layouts
- **🎬 Theater Mode:** 100% full-width movie player with zero participant grid. Voice audio remains fully active in the background.
- **🎯 Spotlight Mode:** Prominent focal stage with participant strip. Clicking 📌 on any participant spotlights them, while the movie cleanly docks into the strip as an interactive thumbnail.
- **⊞ Grid Mode:** Equal-aspect video grid for group discussions and watch parties.
- **◫ Sidebar Mode:** Side-by-side cinema stage with vertical participant list.
- **Fullscreen Hover Auto-Hide:** In fullscreen mode, the top bar slides out of view and only appears smoothly when hovering within 36px of the top edge.

### 4. Meeting-App Style Direct Messaging (Zoom / Teams Style)
- **Inline Recipient Selector:** Easily toggle between `To: Everyone (In Meeting) 👥` and `To: [Participant] 🔒`.
- **Visual Privacy Badges:** Direct messages feature a distinct purple accent and a privacy guarantee indicator.
- **1-Click Reply:** Hovering over any message displays a `↩ Reply` button that automatically pre-selects the sender.
- **Zero Disk Persistence:** All chat messages, reactions, and direct whispers live strictly in-memory (RAM) and are completely wiped when the room closes.

### 5. Host Moderation & Guest Access
- **Host Auth:** Authenticated via Google OAuth.
- **Frictionless Guest Access:** Guests join via Room ID without needing to log in or create an account.
- **Room Controls:** Host can mute participants, kick users, configure room expiry (4 to 12 hours), and generate instant invite links with 1-click clipboard copy.

---

## 🏗️ Architecture & Monorepo Structure

```
watch_party/
├── apps/
│   ├── web/                        # Next.js 14 App Router, WebRTC Mesh, UI components
│   │   ├── app/
│   │   │   ├── api/rooms/          # Room endpoints (create, clear, token, kick)
│   │   │   ├── room/[roomId]/      # Main WatchParty cinema room stage
│   │   │   └── download/           # Mobile PWA installation and bypass page
│   │   ├── components/room/        # Modular room components
│   │   │   ├── MediaPlayerStage.tsx
│   │   │   ├── OttSyncModal.tsx    # Platform picker (Netflix, Prime, Disney+, YouTube)
│   │   │   ├── YouTubePlayerStage.tsx
│   │   │   ├── OttSynchronizerStage.tsx
│   │   │   ├── OttExtensionModal.tsx
│   │   │   ├── VideoTile.tsx
│   │   │   ├── FloatingDock.tsx
│   │   │   └── ChatDrawer.tsx
│   │   └── lib/
│   │       ├── webrtc-mesh.ts      # WebRTC Mesh Manager & HiveMQ MQTT signaling
│   │       └── room-store.ts       # In-memory ephemeral room registry
│   └── extension/                  # Browser extension & bookmarklet targets
│       ├── targets/
│       │   ├── bookmarklet/        # 1-click iOS Safari & desktop bookmarklet
│       │   └── chrome-edge/        # Chrome/Edge Manifest V3 extension
│       └── src/content-scripts/    # Video detection & cross-tab sync engine
├── packages/
│   └── shared/                     # Shared TypeScript types, sync protocol, and drift logic
├── BUILD_APK.md                    # Android Bubblewrap CLI & Capacitor APK instructions
├── IOS_MACOS_GUIDE.md              # iOS Safari PWA & Xcode deployment guide
└── pnpm-workspace.yaml
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- **Node.js:** v18.17+ or v20+
- **pnpm:** v9+ or v10+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Gugan22/watch_party.git
cd watch_party
pnpm install
```

### 2. Environment Configuration
Create an `.env` file inside `apps/web/`:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Run Development Server
```bash
pnpm --filter @watch-party/web dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build Monorepo for Production
```bash
# Build shared library, extension, and Next.js web application
pnpm -r run build
```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/rooms/clear` | `GET` | Returns active room count and status. Pass `?action=clear` to wipe all rooms. |
| `/api/rooms/clear` | `POST` | Purges all active rooms from in-memory store immediately. |
| `/api/rooms/create` | `POST` | Creates a new room with custom ID, name, and expiry (4–12 hours). |
| `/api/rooms/token` | `POST` | Generates a verified guest or host room access token. |
| `/api/rooms/kick` | `POST` | Host moderation endpoint to remove a disruptive participant. |

---

## 📱 Mobile & PWA Support
- **Android App:** Built via Bubblewrap or Capacitor. See [BUILD_APK.md](file:///c:/Users/Gugan/Desktop/learn/watch_party/BUILD_APK.md) for step-by-step instructions.
- **iOS Safari:** Standalone home screen PWA support with safe-area notch padding and wake lock. See [IOS_MACOS_GUIDE.md](file:///c:/Users/Gugan/Desktop/learn/watch_party/IOS_MACOS_GUIDE.md).

---

## 📄 License
Private project. All rights reserved.
