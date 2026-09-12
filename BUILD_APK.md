# Building the WatchParty Android APK Locally

You can build the Android APK locally using either of the following two standard approaches:

---

## Option 1: Fast APK Build via Bubblewrap (Google's Official TWA CLI)

Bubblewrap turns your PWA (`manifest.json`) directly into a native Android `.apk` without requiring heavy native Java/Kotlin code setup.

### Prerequisites
- Java JDK 17+ installed and on `PATH`
- Android Command Line Tools / SDK (or Android Studio)

### Steps
1. Install Bubblewrap CLI globally:
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Initialize the Android project from your web app manifest:
   ```bash
   # If building against your Vercel deployment:
   bubblewrap init --manifest=https://your-watchparty.vercel.app/manifest.json

   # Or if testing against local dev server:
   bubblewrap init --manifest=http://localhost:3000/manifest.json
   ```
3. Build the debug or signed release APK:
   ```bash
   bubblewrap build
   ```
4. The output `.apk` file will be generated in the current directory ready to install onto any Android phone (`adb install app-release-unsigned.apk` or direct transfer).

---

## Option 2: Building via Capacitor & Android Studio

If you want a full native Android project with custom WebRTC plugins or offline bundling:

1. Install Capacitor dependencies inside `apps/web`:
   ```bash
   pnpm -C apps/web add @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Add the Android platform:
   ```bash
   npx cap add android
   ```
3. Update configuration with your deployed Vercel URL in `apps/web/capacitor.config.json`:
   ```json
   {
     "appId": "com.watchparty.app",
     "appName": "WatchParty",
     "server": {
       "url": "https://your-watchparty.vercel.app"
     }
   }
   ```
4. Sync and open in Android Studio:
   ```bash
   npx cap sync
   npx cap open android
   ```
5. In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate your `.apk`.

---

## Option 3: Direct Chrome/Firefox PWA "Add to Home screen"

Since WatchParty is a full Progressive Web App with `manifest.json`, Web Audio API, and Screen Wake Lock:
- Open the URL in Chrome on Android.
- Tap **⋮ (Menu) > Install App** or **Add to Home screen**.
- It installs instantly with the custom brand icon, runs in standalone fullscreen without browser bars, and supports picture-in-picture.
