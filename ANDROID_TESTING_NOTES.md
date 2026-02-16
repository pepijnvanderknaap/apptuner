# Android Testing Notes

## Status: Postponed (To Be Tested with Real Device)

**Date:** 2026-02-15

## What Was Done

### 1. Android Deep Linking Configuration ✅
Successfully configured Android deep linking for AppTuner:

**File:** `mobile/android/app/src/main/AndroidManifest.xml`
- Added intent filter for `apptuner://connect/{sessionId}` URL scheme
- Enables QR code scanning to open app directly (same as iOS)

**File:** `mobile/src/App.tsx`
- Added React Native `Linking` module
- Handles deep links when app is launched
- Handles deep links when app is already running

### 2. Android Emulator Attempt ❌
Attempted to set up Android emulator on Intel Mac but failed due to:

**First attempt:** API 36 (Android 15) - Too heavy, failed to connect within 5 minutes
**Second attempt:** API 33 (Android 13) - Download failed: "not enough space left on device"

**Mac Disk Space Issue:**
- Started with only 3.1GB free (99% full)
- After cleanup: 26GB free (29% full)

### 3. Android Studio Uninstalled ✅
Removed Android Studio and all components to free up disk space:
- Android Studio app
- Android SDK (~15GB)
- Android configuration files
- Gradle cache

## Next Steps for Android Testing

### When You Get a Real Android Device:

1. **Build Android App**
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```

2. **Install APK on Device**
   - Connect Android phone via USB
   - Enable Developer Mode on phone
   - Enable USB Debugging
   - Install APK: `adb install app/build/outputs/apk/release/app-release.apk`

3. **Test Deep Linking**
   - Scan QR code from desktop app
   - Verify deep link opens AppTuner app
   - Test connection to relay
   - Test bundle loading

4. **Test Features**
   - QR code scanning
   - Manual code entry
   - Bundle execution
   - Hot reload
   - Console logging
   - Error overlay
   - Auto-reconnect

## Configuration Already Complete

✅ AndroidManifest.xml has deep linking intent filter
✅ App.tsx handles Linking events
✅ Relay connection works cross-platform
✅ Bundle executor is platform-agnostic

**Android support is ready to test** - just needs a physical Android device!

---

## Disk Space Management

### How to Check Disk Space on Mac

**Command line:**
```bash
df -h /
```

**macOS GUI:**
1. Click Apple menu (top left)
2. Select "About This Mac"
3. Click "Storage" tab
4. View space usage by category

### What Was Cleaned Up (Feb 15, 2026)

| Item | Size | Notes |
|------|------|-------|
| Android SDK | ~15GB | Removed completely |
| Xcode DerivedData | ~7GB | Build cache, regenerates automatically |
| Installer DMGs | ~2GB | Android Studio, Discord, Chrome, etc. |
| **Total Freed** | **~24GB** | From 3.1GB to 26GB free |

### Regular Maintenance

**Clean Xcode cache:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**Clean npm cache:**
```bash
npm cache clean --force
```

**Find large node_modules:**
```bash
find ~/Documents -type d -name "node_modules" -exec du -sh {} \; | sort -hr
```

**Clean iOS simulators:**
```bash
xcrun simctl delete unavailable
```

### Storage Warnings

- **Green:** > 20GB free - Healthy
- **Yellow:** 10-20GB free - Monitor usage
- **Red:** < 10GB free - Clean up immediately

**Your current status:** ✅ Green (26GB free)

---

**Last Updated:** 2026-02-15
**Next Action:** Test Android with real device when available
