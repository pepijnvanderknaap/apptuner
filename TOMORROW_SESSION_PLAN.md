# Tomorrow's Session Plan: Restore Working Mobile App

## What We Discovered Today

### The Core Problem
The "working version" from commit **10b399a** (January 12, 2026) **does NOT include the iOS native project**. The commit only contains:
- JavaScript source files (App.tsx, QRCodeScanner.tsx, etc.)
- Configuration files (package.json, babel.config.js, etc.)
- **NO ios/ folder**
- **NO android/ folder**

### Why Current Setup Fails
1. Current `mobile/ios/` folder was built with React Native 0.74.5
2. We restored JavaScript source from commit 10b399a (expects React Native 0.72.0)
3. Pod install downgraded native dependencies to 0.72.17
4. But the iOS project configuration still has mismatches
5. Result: "AppTunerMobile has not been registered" error

### What We Have
- ✅ JavaScript source code from working version (commit 10b399a)
- ✅ Package.json with correct dependencies (React Native 0.72.0)
- ✅ CocoaPods successfully installed with 0.72.17 pods
- ❌ iOS project configuration (ios/ folder) from DIFFERENT version
- ❌ No backup of the original working iOS project

## Option 1: Find Original iOS Build (IF IT EXISTS)

### Where to Look
1. **Time Machine backups** (if enabled):
   - Look for `/Users/pepijnvanderknaap/Documents/apptuner/mobile/ios/` from ~January 12-15, 2026
   - Look for backups from when hot reload was working

2. **iPhone device backup**:
   - The compiled app might still be on the iPhone
   - Check if we can extract the app bundle

3. **Derived Data**:
   - Check `~/Library/Developer/Xcode/DerivedData/` for old builds
   - Look for AppTuner-* folders from mid-January

4. **Other backup locations**:
   - Desktop backups
   - Cloud storage (iCloud, Dropbox, etc.)
   - External drives

### If We Find the iOS Project
1. Copy the entire `mobile/ios/` folder to replace current one
2. Run `pod install` in `mobile/ios/`
3. Clean build in Xcode
4. Build and run
5. Test QR scanning and hot reload

## Option 2: Create Fresh iOS Project (FALLBACK)

If we can't find the original, we need to:

### Step 1: Initialize Fresh React Native Project
```bash
# Create temporary new RN 0.72 project
npx react-native@0.72.0 init AppTunerTemp --version 0.72.0

# Copy ONLY the ios/ folder from temp project
cp -r AppTunerTemp/ios/ mobile/ios-fresh/
```

### Step 2: Configure iOS Project
1. Update bundle identifier in Xcode
2. Add camera permissions to Info.plist
3. Configure app name and display name
4. Disable Flipper (causes issues)

### Step 3: Install Native Dependencies
```bash
cd mobile
npm install  # Already done
cd ios
pod install
```

### Step 4: Configure Native Modules
The JavaScript code uses:
- `react-native-qrcode-scanner` (needs camera permissions)
- `react-native-vision-camera` (needs camera permissions and setup)

Need to:
1. Add camera permission strings to Info.plist
2. Configure vision-camera in Podfile if needed
3. Verify native module linking

## Backup Status

### mobile-backup-1768320239/
- **Date:** January 13, 2026 17:03
- **Contents:** JavaScript files only, no ios/ folder
- **Not useful** for iOS project restoration

## Tomorrow's Action Plan

### Morning Session
1. **Check Time Machine** (if available)
   - Look for apptuner/mobile/ios/ from January 12-15
   - Restore if found

2. **Check Xcode DerivedData**
   - `~/Library/Developer/Xcode/DerivedData/`
   - Look for AppTuner builds from mid-January

3. **Check iPhone**
   - Is the working app still installed?
   - Can we keep it running and just fix the source mismatch?

### If Original Not Found
Switch to **Option 2: Create Fresh iOS Project**
- Follow Step 1-4 above
- Budget 2-3 hours for setup and configuration
- Test incrementally at each step

## Critical Files Needed for iOS Project

The ios/ folder should contain:
- `AppTuner.xcodeproj/` - Xcode project configuration
- `AppTuner.xcworkspace/` - CocoaPods workspace
- `Podfile` - CocoaPods dependencies
- `AppTuner/` folder with:
  - `AppDelegate.h` and `AppDelegate.m`
  - `Info.plist` with camera permissions
  - `main.m`
  - Images.xcassets/

## Success Criteria
- App builds without errors in Xcode
- App launches on iPhone without crashes
- QR code scanner appears and functions
- Can scan desktop QR code and connect to relay
- Hot reload works (already working in test-app)

## Notes for Tomorrow
- Be patient - iOS project setup can be finicky
- Test after each step instead of doing everything at once
- If stuck, consider simpler approach: just make current ios/ work with 0.72.0
- The JavaScript hot reload code IS working (proven in test-app)
- Problem is ONLY the iOS native project setup
