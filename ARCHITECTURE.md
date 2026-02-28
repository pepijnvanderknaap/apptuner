# AppTuner — Architecture Reference

**Last Updated:** 2026-02-28
**Status:** ✅ Core system functional + TestFlight live. Now expanding SDK.

---

## What AppTuner Is

AppTuner is a **direct Expo alternative**. A pre-built native shell with SDK modules compiled in,
a cloud relay for global bundle delivery, and a re-signing pipeline for instant App Store builds.

| AppTuner | Expo equivalent |
|---|---|
| AppTuner Mobile (the shell) | Expo Go |
| AppTuner SDK (modules compiled in) | Expo SDK |
| relay.apptuner.io | EAS Update |
| Re-sign shell (~30 seconds) | EAS Build (10-30 min on Mac farms) |

---

## System Overview

```
┌──────────────────────┐        ┌───────────────────────┐        ┌─────────────────────┐
│   Dev Machine (CLI)  │        │  Relay Server (VPS)   │        │   AppTuner Mobile   │
│                      │        │  relay.apptuner.io    │        │   (iOS / Android)   │
│  apptuner start      │  WSS   │                       │  WSS   │                     │
│  ├── Metro bundler   │◄──────►│  Node.js WebSocket    │◄──────►│  QR scanner         │
│  ├── File watcher    │        │  routes messages      │        │  eval() executor    │
│  └── CLI controller  │        │  between CLI ↔ mobile │        │  React renderer     │
└──────────────────────┘        └───────────────────────┘        └─────────────────────┘
```

---

## AppTuner SDK — Current State

### SDK 1.0 (confirmed working in TestFlight)

| Category | Library |
|----------|---------|
| Navigation | `@react-navigation/native` + `native-stack` + `bottom-tabs` + `screens` + `safe-area-context` + `gesture-handler` |
| Storage | `@react-native-async-storage/async-storage` v3 |
| Camera | `react-native-vision-camera` |
| Images | `react-native-image-picker` |
| Maps | `react-native-maps` |
| Location | `expo-location` |
| Graphics | `react-native-svg` |
| Animation | `react-native-reanimated` |
| Notifications | `@notifee/react-native` |

### SDK Expansion Strategy
Expo's native modules are **MIT licensed** — we compile them directly into the shell.
Target: ~20 additional modules to reach ~80% Expo parity.
See `todo.md` for the full list of modules to add.

### SDK Versioning
- `AppTuner SDK 1.0` = RN 0.81.6 + React 19.1.4 + above lib versions
- Apps declare `"apptunerSdk": "1.0"` in `.apptuner.json`
- SDK bump = rebuild mobile app + update templates (~2x/year)

---

## CLI Commands

| Command | Status | What it does |
|---------|--------|-------------|
| `apptuner start [path]` | ✅ Active | Start Metro + watcher, connect to relay, auto-reload on file changes |
| `apptuner stop` | ✅ Active | Kill all background services |
| `apptuner status` | ✅ Active | Show connection status |
| `apptuner check [path]` | 🗑️ Delete when convenient | Expo scanner — dead feature |
| `apptuner convert [path]` | 🗑️ Delete when convenient | Expo converter — dead feature |

---

## Re-signing Build Pipeline (to build)

The AppTuner shell is pre-compiled. A "build" for an end user is:
1. User uploads Apple certificate + provisioning profile
2. AppTuner injects their icon, app name, bundle ID into the shell
3. Re-signs with their certificate using `fastlane resign` or equivalent
4. Returns .ipa in ~30 seconds — ready for App Store Connect

No Mac farm. No cloud Xcode. Nearly zero cost per build.

---

## Data Flow: `apptuner start`

```
1. CLI validates project (checks package.json for react-native)
2. CLI reads/creates .apptuner.json with stable 6-char session ID
3. CLI spawns metro-server.cjs on dynamic port
4. CLI spawns watcher-server.cjs on dynamic port
5. CLI connects to wss://relay.apptuner.io/cli/{sessionId}
6. Watcher fires "watcher_ready" → CLI requests initial bundle from Metro
7. Metro bundles → CLI sends bundle to relay → relay forwards to mobile
8. File changes → watcher fires "file_changed" → CLI re-bundles → sends again
9. Mobile connects → relay notifies CLI → CLI sends fresh bundle to new device
```

---

## Critical Implementation Details

### Metro Bundler Server (`metro-bundle.cjs` + `metro-server.cjs`)
- **Bundle caching** — identical project + no file changes → cached bundle served instantly
- **Chunked transfer** — large bundles split into 20 chunks to avoid WebSocket limits
- **Bundle wrapper IIFE** — wraps Metro output with:
  - Host React redirect (prevents duplicate React instance)
  - `.env` file injection (`process.env.EXPO_PUBLIC_*` vars)
  - `__d` factory interceptor (AppRegistry capture, NativeEventEmitter patch)

### File Watcher (`watcher-server.cjs`)
Uses `chokidar`. Watches `.js`, `.jsx`, `.ts`, `.tsx`, `.json`.
Ignores: `node_modules`, `.expo`, `ios`, `android`, `dist`, `.git`.

### Relay Server (VPS at `relay.apptuner.io`)
Plain Node.js `ws` WebSocket server.
- CLI: `wss://relay.apptuner.io/cli/{sessionId}`
- Mobile: `wss://relay.apptuner.io/mobile/{sessionId}`
- Max message size: 50MB

### Bundle Execution (Mobile App — `executor.ts`)
- `eval()` in global context loads Metro bundle
- Clear `__r.c` cache before eval (hot reload)
- `__r(0)` called after eval (Metro entry point)
- AppRegistry intercept captures root component as `global.App`

### Session IDs
Stable 6-char ID in `.apptuner.json`. Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

---

## Project Structure

```
apptuner/
├── src-cli/                      # CLI source (TypeScript)
│   ├── cli.ts
│   └── commands/
│       ├── start.ts              # Main development server
│       ├── stop.ts
│       ├── status.ts
│       ├── check.ts              # DEPRECATED — delete when convenient
│       └── convert.ts            # DEPRECATED — delete when convenient
│
├── mobile/                       # AppTuner Mobile (RN 0.81.6 / React 19.1.4)
│   └── src/
│       ├── App.tsx               # QR scanner + bundle executor + recent projects
│       └── services/
│           ├── executor.ts       # eval() + Metro cache management
│           ├── relay.ts          # WebSocket relay client
│           └── storage.ts        # AsyncStorage for recent projects
│
├── metro-bundle.cjs              # Metro bundler + bundle wrapper logic
├── metro-server.cjs              # Metro WebSocket server
├── watcher-server.cjs            # File watcher WebSocket server
├── relay-server.js               # VPS relay (Node.js ws)
│
├── test-app/                     # Test bare RN project (ID: WSRB8H)
└── ARCHITECTURE.md               # This file
```

---

## Build & Deploy

```bash
# Build CLI
npm run build:cli        # esbuild → dist/cli.js

# Build dashboard
npm run build            # Vite → dist/

# Deploy dashboard + relay
git push                 # Coolify auto-deploys on push to main

# Run locally
npm run preview          # dashboard at localhost:4173
APPTUNER_DASHBOARD_URL=http://localhost:4173 node dist/cli.js start ./test-app
```
