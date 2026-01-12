# Apptuner - Testing Guide

Complete guide for testing the entire Apptuner system end-to-end.

---

## Prerequisites

Before testing, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Rust & Cargo installed (for desktop app)
- ✅ React Native development environment
- ✅ iOS: Xcode 14+ or Android: Android Studio
- ✅ Cloudflare account (free tier OK)

---

## Testing Phases

We'll test each component individually, then the complete end-to-end flow.

---

## Phase 1: Test Desktop App

### 1.1 Install Dependencies

```bash
cd /Users/pepijnvanderknaap/Desktop/apptuner
npm install
```

### 1.2 Build Frontend

```bash
npm run build
```

Expected output:
```
✓ built in 800ms
dist/index.html
dist/assets/index.css
dist/assets/index.js
```

### 1.3 Run Desktop App

```bash
npm run tauri dev
```

Expected:
- Desktop window opens (480×640)
- DevTools open automatically
- "No project selected" empty state visible

### 1.4 Test Folder Selection

1. Click "Click to select project folder"
2. Navigate to `/tmp/test-rn-app`
3. Select folder

Expected:
- Shows "test-rn-app" folder name
- Shows full path
- QR code appears
- Status: "Waiting for device..."

**Console should show:**
```
Bundling project at /tmp/test-rn-app
Bundle complete: X.XX KB
Started watching: /tmp/test-rn-app
```

### 1.5 Test File Watching

1. Open `/tmp/test-rn-app/App.tsx` in editor
2. Change text from "Hello from Apptuner!" to "Testing!"
3. Save file

**Console should show:**
```
File changed: ["/tmp/test-rn-app/App.tsx"]
Bundling project at /tmp/test-rn-app
Bundle complete: X.XX KB
Bundle update sent to mobile
```

✅ **Desktop app is working!**

---

## Phase 2: Test Cloudflare Relay

### 2.1 Install Relay Dependencies

```bash
cd relay
npm install
```

### 2.2 Start Local Relay

```bash
npm run dev
```

Expected output:
```
⛅️ wrangler 3.x.x
------------------
Ready on http://localhost:8787
```

### 2.3 Test Health Endpoint

Open new terminal:

```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "apptuner-relay",
  "version": "0.1.0",
  "timestamp": 1704067200000
}
```

### 2.4 Test WebSocket Connection

Open browser console (http://localhost:8787):

```javascript
// Simulate desktop connection
const desktop = new WebSocket('ws://localhost:8787/desktop/test123');

desktop.onopen = () => console.log('Desktop connected');
desktop.onmessage = (e) => console.log('Desktop received:', JSON.parse(e.data));

// Simulate mobile connection (open in another tab)
const mobile = new WebSocket('ws://localhost:8787/mobile/test123');

mobile.onopen = () => console.log('Mobile connected');
mobile.onmessage = (e) => console.log('Mobile received:', JSON.parse(e.data));

// Desktop sends message
desktop.send(JSON.stringify({
  type: 'bundle_update',
  payload: { code: 'console.log("test")' }
}));
```

**Expected:**
- Desktop: Connected message
- Mobile: Connected message
- Mobile: Receives bundle_update
- Desktop: Receives mobile_connected

**Relay console should show:**
```
Desktop connected to session test123
Mobile connected to session test123
Message from desktop: bundle_update
```

✅ **Relay is working!**

---

## Phase 3: Test Mobile App

### 3.1 Install Mobile Dependencies

```bash
cd ../mobile
npm install
```

### 3.2 iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3.3 Run on iOS Simulator

```bash
npm run ios
```

Expected:
- iOS Simulator opens
- App launches
- QR scanner screen appears
- "Scan QR code to connect" text visible

### 3.4 Run on Android Emulator

```bash
npm run android
```

Expected:
- Android Emulator opens
- App launches
- QR scanner screen appears
- Camera permission prompt (grant it)

### 3.5 Test Without QR (Manual Connection)

Edit `mobile/src/App.tsx` temporarily:

```typescript
// Add test button
<TouchableOpacity
  style={styles.testButton}
  onPress={() => handleQRScan('apptuner://connect/test123')}>
  <Text>Test Connection</Text>
</TouchableOpacity>
```

Rebuild and tap "Test Connection"

Expected:
- Shows "Connecting to relay..."
- Shows "Connected"
- Status shows session: test123
- "Waiting for bundle..." appears

✅ **Mobile app is working!**

---

## Phase 4: End-to-End Test (Local)

Now test all components together locally.

### 4.1 Setup

**Terminal 1 - Relay:**
```bash
cd relay
npm run dev
```

**Terminal 2 - Desktop:**
```bash
cd ..
npm run tauri dev
```

**Terminal 3 - Mobile:**
```bash
cd mobile
npm run ios
# or npm run android
```

### 4.2 Complete Flow Test

**Step 1: Desktop - Select Project**
1. In desktop app, click folder picker
2. Select `/tmp/test-rn-app`
3. QR code appears

**Step 2: Mobile - Scan QR**
1. Point camera at desktop QR code
2. Or use test button with session ID from desktop

Expected:
- Desktop console: "Mobile connected"
- Mobile shows: "Connected"
- Mobile shows: "Waiting for bundle..."

**Step 3: Desktop - Initial Bundle**

Desktop should automatically send bundle.

Expected:
- Desktop console: "Bundle update sent"
- Mobile console: "Received bundle update"
- Mobile console: "Bundle executed successfully"
- Mobile shows: "Bundle loaded and running"

**Step 4: Test Live Updates**

1. Open `/tmp/test-rn-app/App.tsx`
2. Change title text
3. Save file

Expected (< 2 seconds):
- Desktop console: "File changed"
- Desktop console: "Bundling..."
- Desktop console: "Bundle update sent"
- Mobile console: "Received bundle update"
- Mobile: Text updates! ✨

✅ **End-to-end is working!**

---

## Phase 5: End-to-End Test (Production)

Test with deployed Cloudflare relay.

### 5.1 Deploy Relay

```bash
cd relay
npx wrangler login
npm run deploy
```

Note your relay URL:
```
https://apptuner-relay.{your-subdomain}.workers.dev
```

### 5.2 Update Desktop App

Edit `src/services/connection.ts`:

```typescript
const RELAY_URL = 'wss://apptuner-relay.{your-subdomain}.workers.dev';
await connection.connect(RELAY_URL);
```

Rebuild desktop app:
```bash
npm run build
npm run tauri dev
```

### 5.3 Update Mobile App

Edit `mobile/src/App.tsx`:

```typescript
const relayUrl = 'wss://apptuner-relay.{your-subdomain}.workers.dev';
```

Rebuild mobile app:
```bash
cd mobile
npm run ios  # or android
```

### 5.4 Test Production Flow

Follow same steps as Phase 4, but without local relay.

Expected:
- All same behavior
- Works over internet (not just local network)
- Lower latency (Cloudflare edge)

✅ **Production deployment working!**

---

## Troubleshooting

### Desktop App Issues

**Problem: "Cargo not found"**

Solution:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Problem: "File watcher not starting"**

Solution:
- Check console for errors
- Verify notify crate compiled
- Try removing `src-tauri/target/` and rebuilding

**Problem: "QR code not showing"**

Solution:
- Check bundle completed successfully
- Verify no bundler errors in console
- Check `/tmp/test-rn-app` exists and is valid

### Relay Issues

**Problem: "Connection refused"**

Solution:
- Verify relay is running: `curl http://localhost:8787/health`
- Check firewall isn't blocking port 8787
- Try different port in wrangler.toml

**Problem: "Deployment fails"**

Solution:
```bash
npx wrangler login
# Follow OAuth flow
npm run deploy
```

**Problem: "Durable Objects error"**

Solution:
- Ensure Durable Objects enabled in Cloudflare account
- Check wrangler.toml has correct bindings
- Try deleting and redeploying

### Mobile App Issues

**Problem: "Camera not working"**

Solution:
- iOS: Check Info.plist has NSCameraUsageDescription
- Android: Check AndroidManifest.xml has CAMERA permission
- Grant permission in Settings → Apptuner
- Restart app

**Problem: "Can't scan QR code"**

Solution:
- Increase QR code size on desktop
- Improve lighting
- Use test button with manual session ID
- Check QR format: `apptuner://connect/{sessionId}`

**Problem: "Connection fails"**

Solution:
- Check relay URL is correct
- Verify relay is accessible from phone
- Check network connectivity
- Try restarting relay

**Problem: "Bundle won't execute"**

Solution:
- Check console for JavaScript errors
- Verify React Native imports available
- Check bundle format in desktop console
- Look for syntax errors in source code

### End-to-End Issues

**Problem: "Mobile connects but no bundle"**

Solution:
- Check desktop bundler completed
- Verify desktop sent bundle (check console)
- Check relay forwarded message
- Look for errors in mobile console

**Problem: "File changes not updating"**

Solution:
- Verify file watcher started (desktop console)
- Check file is in watched extensions (.js, .jsx, .ts, .tsx)
- Make sure file isn't in node_modules
- Wait 300ms (debounce delay)

**Problem: "Updates slow (> 5 seconds)"**

Solution:
- Check network latency
- Verify relay is deployed (not local)
- Check bundle size isn't huge (> 1MB)
- Look for bundler performance issues

---

## Performance Benchmarks

Expected timings for optimal setup:

### Desktop App
- Folder selection: < 1 second
- Initial bundle: < 500ms
- File change detection: < 50ms
- Rebuild on change: < 500ms

### Relay
- Connection: < 100ms
- Message forwarding: < 10ms
- Latency: < 50ms

### Mobile App
- QR scan: < 1 second
- Connection: < 2 seconds
- Bundle execution: < 100ms
- UI update: < 50ms

### End-to-End
- Start to first bundle: < 5 seconds
- File change to mobile: < 2 seconds
- Total flow: **< 60 seconds** ✅

---

## Test Checklist

Use this checklist for complete testing:

### Desktop App
- [ ] App launches without errors
- [ ] Folder picker opens
- [ ] Invalid project shows error
- [ ] Valid project loads
- [ ] QR code displays
- [ ] Connection status updates
- [ ] File watcher starts
- [ ] File changes detected
- [ ] Auto-rebuild works
- [ ] Bundle sent to relay

### Relay
- [ ] Starts without errors
- [ ] Health endpoint responds
- [ ] Desktop can connect
- [ ] Mobile can connect
- [ ] Messages route correctly
- [ ] Both directions work
- [ ] Disconnection handled
- [ ] Reconnection works
- [ ] Logs show activity

### Mobile App
- [ ] App launches without errors
- [ ] QR scanner opens
- [ ] Camera permission granted
- [ ] QR code scans correctly
- [ ] Connection succeeds
- [ ] Bundle received
- [ ] Code executes
- [ ] UI updates
- [ ] Error overlay works
- [ ] Disconnect works

### End-to-End
- [ ] Complete flow < 60 seconds
- [ ] Initial bundle loads
- [ ] App displays correctly
- [ ] File changes update mobile
- [ ] Multiple updates work
- [ ] Reconnection recovers
- [ ] Error handling works
- [ ] Performance acceptable

---

## Success Criteria

Your Apptuner system is working correctly if:

✅ Desktop app can select and bundle React Native projects
✅ Relay forwards messages between desktop and mobile
✅ Mobile app can scan QR and connect to relay
✅ Mobile app executes received bundles
✅ File changes trigger automatic rebuilds
✅ Updates appear on mobile in < 2 seconds
✅ Complete flow takes < 60 seconds
✅ System recovers from disconnections

---

## Next Steps After Testing

Once all tests pass:

1. **Document Issues**: Note any problems found
2. **Performance Tune**: Optimize slow areas
3. **Production Build**: Build desktop and mobile for distribution
4. **User Testing**: Test with real React Native projects
5. **Phase 6**: Add hot reload and advanced features
6. **Phase 7**: Polish and optimize for production

---

## Getting Help

If you encounter issues:

1. Check console logs (all 3 terminals)
2. Review error messages
3. Consult component README files
4. Check PHASEx_COMPLETE.md docs
5. Verify all prerequisites installed

---

**Happy Testing!** 🚀

Remember: The goal is "test on phone in under a minute" - if it takes longer, something needs optimization!
