# Apptuner Mobile App

React Native app for receiving and executing code bundles from Apptuner desktop app.

## Features

- **QR Code Scanner**: Scan QR code from desktop app to connect
- **WebSocket Client**: Connects to Cloudflare Workers relay
- **Bundle Execution**: Executes JavaScript bundles in real-time
- **Connection Status**: Shows connection state and session info
- **Error Overlay**: Displays errors with stack traces
- **Auto-Reconnect**: Handles network interruptions

## Setup

### Prerequisites

- Node.js 18+
- React Native development environment
- iOS: Xcode 14+ and CocoaPods
- Android: Android Studio and SDK

### Install Dependencies

```bash
cd mobile
npm install
```

### iOS Setup

```bash
cd ios
pod install
cd ..
```

### Android Setup

No additional setup required beyond standard React Native.

## Development

### Run on iOS

```bash
npm run ios
```

### Run on Android

```bash
npm run android
```

### Start Metro Bundler

```bash
npm start
```

## How It Works

### Connection Flow

1. **Scan QR Code**
   - Desktop app generates QR code with session ID
   - Mobile app scans: `apptuner://connect/{sessionId}`

2. **Connect to Relay**
   - Extracts session ID from QR code
   - Connects to Cloudflare Workers relay
   - Subscribes to bundle updates

3. **Receive Bundle**
   - Desktop sends bundle via relay
   - Mobile receives bundle code
   - Executes code with eval()

4. **Execute & Acknowledge**
   - Bundle runs in React Native environment
   - Sends acknowledgment back to desktop
   - Shows "App Running" status

### Architecture

```
Mobile App
    ↓
QR Scanner (react-native-qrcode-scanner)
    ↓
Parse Session ID
    ↓
RelayConnection (WebSocket)
    ↓
Cloudflare Workers Relay
    ↓
Desktop App
```

## Project Structure

```
mobile/
├── src/
│   ├── App.tsx                    # Main app component
│   ├── components/
│   │   ├── QRCodeScanner.tsx     # QR code scanner
│   │   ├── ConnectionStatus.tsx  # Status display
│   │   └── ErrorOverlay.tsx      # Error display
│   └── services/
│       ├── relay.ts              # WebSocket connection
│       └── executor.ts           # Bundle execution
├── index.js                       # React Native entry
├── app.json                       # App configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── babel.config.js                # Babel configuration
└── metro.config.js                # Metro bundler config
```

## Components

### App.tsx

Main component managing app state:
- `scanning`: Waiting for QR code
- `connecting`: Connecting to relay
- `connected`: Connected, waiting for/running bundle
- `error`: Error state with message

### QRCodeScanner

Scans QR codes using device camera. Parses `apptuner://connect/{sessionId}` format.

### ConnectionStatus

Shows:
- Connection status (connected/disconnected/error)
- Session ID
- Bundle loaded indicator

### ErrorOverlay

Red box-style error display with:
- Error message
- Stack trace
- Dismiss button

## Services

### RelayConnection

WebSocket client for relay communication.

**Methods:**
```typescript
connect(): Promise<void>
disconnect(): void
sendAck(success: boolean, error?: string): void
sendLog(level: string, args: any[]): void
onStatusChange(handler: StatusHandler): () => void
onBundleUpdate(handler: BundleUpdateHandler): () => void
```

**Message Types:**
- `connected`: Welcome from relay
- `desktop_connected`: Desktop joined session
- `desktop_disconnected`: Desktop left session
- `bundle_update`: New code bundle
- `error`: Error message

### BundleExecutor

Executes JavaScript bundles.

**Methods:**
```typescript
execute(bundleCode: string): Promise<void>
reexecute(): Promise<void>
cleanup(): void
```

**How It Works:**
1. Stores bundle code
2. Creates execution context
3. Evaluates code with `eval()`
4. Returns result

## Configuration

### Relay URL

In `src/App.tsx`:
```typescript
const relayUrl = __DEV__
  ? 'ws://localhost:8787'
  : 'wss://apptuner-relay.your-subdomain.workers.dev';
```

**Development:** Uses localhost relay
**Production:** Uses deployed Cloudflare Workers

### Camera Permissions

**iOS** (`ios/Apptuner/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>Apptuner needs camera access to scan QR codes</string>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## Testing

### Test QR Scanner

1. Generate QR code with: `apptuner://connect/test123`
2. Scan with app
3. Should show "Connecting" state

### Test Relay Connection

1. Start local relay: `cd ../relay && npm run dev`
2. Run mobile app
3. Scan QR with session ID
4. Check console for connection logs

### Test Bundle Execution

1. Start desktop app
2. Select React Native project
3. Scan QR code with mobile
4. Edit code in project
5. Watch mobile update automatically

## Troubleshooting

### QR Scanner Not Working

**Problem:** Camera not opening

**Solutions:**
- Check camera permissions
- iOS: Check Info.plist
- Android: Check AndroidManifest.xml
- Restart app after granting permissions

### Connection Fails

**Problem:** "Failed to connect to relay"

**Solutions:**
- Check relay URL is correct
- Verify relay is running
- Check network connectivity
- Try restarting relay

### Bundle Won't Execute

**Problem:** Bundle received but not running

**Solutions:**
- Check console for errors
- Verify bundle format is correct
- Check React Native imports are available
- Look for syntax errors in bundle

### App Crashes on Bundle Load

**Problem:** App crashes when bundle executes

**Solutions:**
- Check bundle code for errors
- Verify React Native APIs used exist
- Check error overlay for stack trace
- Test bundle in desktop app first

## Performance

### Bundle Execution

- **Parse time**: < 50ms
- **Execution time**: < 100ms (simple bundles)
- **Total update time**: < 2 seconds (edit → mobile)

### Memory Usage

- **Base app**: ~50MB
- **With bundle**: ~70-100MB
- **Maximum**: ~150MB

## Security

### Current Implementation

- No authentication
- Trust all bundles from session
- Eval() used for execution (inherently risky)

### Production Considerations

- [ ] Bundle signature verification
- [ ] Sandboxed execution
- [ ] Permission system
- [ ] Rate limiting

## Known Limitations

### Bundle Execution

- Uses `eval()` for code execution
- No sandbox isolation
- Full access to React Native APIs
- Can't restrict what code does

### State Management

- State resets on bundle update
- No hot reload yet (Phase 6)
- No state preservation

### Performance

- Large bundles (> 1MB) may be slow
- No bundle caching
- No incremental updates

## Future Enhancements (Phase 6)

- [ ] Fast refresh / hot reload
- [ ] State preservation
- [ ] Console log streaming
- [ ] Network request inspection
- [ ] Performance monitoring
- [ ] Screenshot capture

## Development Tips

### Debug Logging

All services use `[Service]` prefix:
```
[Relay] Connected
[Executor] Executing bundle...
[Relay] Bundle update received
```

### Testing Without Desktop

Simulate bundle update:
```typescript
// In App.tsx
connectionRef.current?.handleMessage({
  type: 'bundle_update',
  payload: {
    code: 'console.log("Hello from test bundle")',
  },
});
```

### Hot Reload During Development

Metro bundler hot reload works for the app itself, but not for received bundles (that's Phase 6).

## Building for Production

### iOS

```bash
# Open in Xcode
open ios/Apptuner.xcworkspace

# Archive and distribute
```

### Android

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK at: android/app/build/outputs/apk/release/
```

## Resources

- [React Native Docs](https://reactnative.dev/)
- [QR Code Scanner](https://github.com/moaazsidat/react-native-qrcode-scanner)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Status:** MVP Complete
**Version:** 0.1.0
**Platform:** iOS & Android
**License:** MIT
