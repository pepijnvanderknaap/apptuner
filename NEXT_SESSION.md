# Next Session - App Crash Issue

## Current Status

**App installs but crashes immediately on launch** - no error message, just closes instantly.

### What We've Confirmed:
✅ App builds successfully
✅ App installs on iPhone (device ID: 00008101-00140DA11EF9001E)
✅ Metro server is running on port 8081
✅ App CAN connect to Metro (we see `BUNDLE ./index.js` in Metro logs)
✅ Metro CAN generate bundles (curl test works)
✅ Removed all Expo dependencies
✅ Fixed module name to "AppTunerMobile"
✅ Hardcoded Metro URL: http://192.168.178.48:8081

### The Problem:
- App crashes after connecting to Metro but before/during bundle load
- No blue dot appears (app fully closes)
- No crash reports in ~/Library/Logs/DiagnosticReports/

### Files Modified Today:
1. `/mobile/ios/AppTuner/AppDelegate.swift` - Removed Expo, hardcoded Metro URL
2. `/mobile/package.json` - Removed Expo dependency
3. `/mobile/ios/Podfile` - Removed Expo autolinking
4. `/mobile/src/App.tsx` - Created simple "Hello World" test (backup at App.tsx.backup)

## Next Steps to Try

### Option 1: Check Device Logs (RECOMMENDED)
The crash is happening but we can't see the error. Need to:
1. Connect iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select iPhone → View Device Logs
4. Tap AppTuner app to crash it
5. Look for crash log with actual error message

### Option 2: Try Release Build
Create a standalone app that doesn't need Metro:
1. Fix the Xcode build script that's trying to run `export:embed`
2. Build in Release mode with bundled JavaScript
3. Install and test

The bundle already exists at `/mobile/ios/main.jsbundle` (936 KB)

### Option 3: Check VisionCamera Setup
The original app uses VisionCamera which might need additional configuration:
- Check Info.plist permissions
- Check if VisionCamera is causing the crash
- We already created a simple App.tsx without VisionCamera for testing

### Option 4: Use Xcode Debugger
Run the app from Xcode with debugger attached:
1. Open `/mobile/ios/AppTuner.xcworkspace` in Xcode
2. Select iPhone device from scheme selector
3. Click Run (Play button)
4. Watch console for errors

## Important Info

### Device:
- iPhone ID: `00008101-00140DA11EF9001E`
- iPhone Name: iPhone (3)
- Mac IP: 192.168.178.48

### Metro:
- Port: 8081
- Bundle URL: http://192.168.178.48:8081/index.bundle?platform=ios&dev=true&minify=false
- Status: Running and responding

### App State:
- White icon (no assets loaded)
- Crashes immediately on tap
- No error message shown
- Metro shows `BUNDLE ./index.js` when tapped (app IS connecting)

## Commands for Next Session

### View device logs:
```bash
# If idevicesyslog installed:
brew install libimobiledevice
idevicesyslog | grep -i apptuner

# Or use Xcode GUI
```

### Rebuild app:
```bash
cd /Users/pepijnvanderknaap/Documents/apptuner/mobile
npx react-native run-ios --device "iPhone (3)"
```

### Restore original App.tsx:
```bash
mv mobile/src/App.tsx.backup mobile/src/App.tsx
```

### Check Metro logs:
```bash
tail -f /tmp/metro.log
```

## Theory

The app is:
1. ✅ Launching native code
2. ✅ Connecting to Metro
3. ✅ Requesting bundle
4. ❌ Crashing during or after bundle load

Possible causes:
- JavaScript bundle has an error that crashes immediately
- Native module initialization failing (VisionCamera?)
- React Native bridge initialization failing
- Bundle timeout (Metro taking too long)

**Most likely**: Need to see actual crash logs to know the real error.
