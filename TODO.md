# Apptuner - Development Roadmap

## Phase 1: Desktop App Foundation ✅ COMPLETE

- [x] Tauri app setup with React + TypeScript
- [x] Apple-style design system (CSS)
- [x] Folder picker UI with drag region
- [x] Project validation (Rust backend)
- [x] QR code generation and display
- [x] WebSocket connection manager
- [x] Connection status indicator
- [x] Error handling and messages
- [x] Empty state design
- [x] TypeScript build working

**Result**: Beautiful desktop app that validates React Native projects and displays QR codes.

---

## Phase 2: Bundler Integration ✅ COMPLETE

### 2.1 esbuild Setup
- [x] Add esbuild dependency
- [x] Configure for React Native (JSX transform)
- [x] Handle node_modules resolution
- [x] Support for .js, .jsx, .ts, .tsx files
- [x] Asset handling (images, fonts)

### 2.2 Transform Pipeline
- [x] Entry point detection (App.js/tsx or index.js)
- [x] React Native polyfills
- [x] Environment variables
- [x] Source maps generation
- [x] No minification for development (easier debugging)

### 2.3 Integration
- [x] Update `src/services/bundler.ts` with real esbuild logic
- [x] Add error handling for bundle failures
- [x] Bundle wrapper with polyfills
- [x] Console interception for log streaming

**Files modified:**
- `package.json` - Added esbuild and plugins
- `src/services/bundler.ts` - Full esbuild implementation (~240 lines)

**Result**: ⭐ React Native code bundles in < 500ms with full JSX/TS support!

See [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for details.

---

## Phase 3: File Watching System 🔜

### 3.1 Rust File Watcher
- [ ] Implement in `src-tauri/src/lib.rs` using notify crate
- [ ] Watch specified directories (ignore node_modules, etc.)
- [ ] Debounce file change events (300ms)
- [ ] Send events to frontend via Tauri events

### 3.2 Frontend Integration
- [ ] Listen to file change events
- [ ] Trigger rebundle on change
- [ ] Show "Building..." status
- [ ] Handle build errors

### 3.3 Optimization
- [ ] Incremental builds
- [ ] File extension filtering
- [ ] Ignore patterns (.git, dist, build, etc.)
- [ ] Performance monitoring

**Files to modify:**
- `src-tauri/src/lib.rs` - Add file watcher
- `src/services/bundler.ts` - Add rebuild logic
- `src/App.tsx` - Listen to file change events

**Expected outcome**: Automatic rebuilds when code changes are detected.

---

## Phase 4: Cloudflare Workers Relay 🔜

### 4.1 Worker Setup
- [ ] Create new Cloudflare Workers project
- [ ] Set up WebSocket handling
- [ ] Session management (connect desktop to mobile)
- [ ] Message routing between connections

### 4.2 Session Logic
- [ ] Generate unique session IDs (match desktop app)
- [ ] Desktop connection endpoint: `/desktop/{sessionId}`
- [ ] Mobile connection endpoint: `/mobile/{sessionId}`
- [ ] Heartbeat/keepalive
- [ ] Connection timeout handling

### 4.3 Message Protocol
```typescript
// Desktop → Mobile
{
  type: 'bundle_update',
  payload: { code: string, sourceMap?: string }
}

// Mobile → Desktop
{
  type: 'mobile_connected',
  payload: { deviceInfo: {...} }
}

// Bidirectional
{
  type: 'error',
  payload: { message: string }
}
```

### 4.4 Deployment
- [ ] Deploy to Cloudflare Workers
- [ ] Get production URL
- [ ] Update desktop app with production relay URL
- [ ] Add relay URL configuration option

**New files:**
- `relay/` - New directory for Cloudflare Worker
- `relay/src/index.ts` - Worker entry point
- `relay/wrangler.toml` - Cloudflare config

**Expected outcome**: Stable cloud-based relay for desktop ↔ mobile communication.

---

## Phase 5: React Native Mobile App 🔜

### 5.1 Project Setup
- [ ] Create React Native project (not Expo!)
- [ ] TypeScript configuration
- [ ] Navigation setup (if needed)
- [ ] Development environment setup

### 5.2 QR Scanner
- [ ] Add camera permissions
- [ ] QR code scanning library
- [ ] Parse `apptuner://connect/{sessionId}` URLs
- [ ] Validation and error handling

### 5.3 WebSocket Client
- [ ] Connect to Cloudflare relay
- [ ] Send device info on connect
- [ ] Receive bundle updates
- [ ] Handle disconnections

### 5.4 Code Execution
- [ ] Evaluate received bundle code
- [ ] React Native bridge setup
- [ ] Error boundary for code execution
- [ ] Console.log capture

### 5.5 UI/UX
- [ ] Splash screen
- [ ] Scanning screen
- [ ] Connected status indicator
- [ ] Error overlay
- [ ] Disconnect button

**New files:**
- `mobile/` - New React Native project directory
- `mobile/src/App.tsx` - Main mobile app
- `mobile/src/Scanner.tsx` - QR scanner component
- `mobile/src/Runtime.tsx` - Code execution component

**Expected outcome**: Mobile app that scans QR, connects, and runs user's React Native code.

---

## Phase 6: Hot Reload & Polish ⏭️

### 6.1 Hot Reload
- [ ] Track component tree
- [ ] Preserve state during reload
- [ ] Fast refresh for React components
- [ ] Full reload for other changes

### 6.2 Error Handling
- [ ] Syntax error overlay (mobile)
- [ ] Runtime error overlay (mobile)
- [ ] Stack trace support
- [ ] Source map integration

### 6.3 Developer Tools
- [ ] Console log streaming (mobile → desktop)
- [ ] Network request inspection
- [ ] Performance metrics
- [ ] Memory usage monitoring

### 6.4 UI Polish
- [ ] Loading animations
- [ ] Toast notifications
- [ ] Advanced settings panel (hidden)
- [ ] Keyboard shortcuts
- [ ] Multiple device support

---

## Phase 7: Advanced Features ⏭️

### 7.1 Configuration
- [ ] `.apptuner.json` config file
- [ ] Custom entry points
- [ ] Bundler options
- [ ] Ignore patterns
- [ ] Transform plugins

### 7.2 Performance
- [ ] Bundle size analysis
- [ ] Caching strategy
- [ ] Differential updates (only changed modules)
- [ ] Compression

### 7.3 Debugging
- [ ] Source maps working end-to-end
- [ ] Breakpoint support
- [ ] Variable inspection
- [ ] Step debugging

### 7.4 Platforms
- [ ] iOS app bundle
- [ ] Android APK
- [ ] Windows desktop installer
- [ ] Linux AppImage

---

## Current Priority: Phase 3 - File Watching System

**Start here:**

1. Add notify crate to `src-tauri/Cargo.toml`

2. Implement file watcher in Rust (`src-tauri/src/lib.rs`):
   - Watch specified directory recursively
   - Filter file types (.js, .jsx, .ts, .tsx)
   - Ignore patterns (node_modules, .git, etc.)
   - Debounce events (300ms)

3. Create Tauri command to start/stop watching:
   ```rust
   #[tauri::command]
   fn start_file_watcher(path: String) -> Result<(), String>
   ```

4. Emit events to frontend when files change:
   ```rust
   app.emit_all("file_changed", payload)?;
   ```

5. Update frontend to listen and trigger rebundles:
   ```typescript
   await listen('file_changed', () => {
     bundler.bundle().then(sendToMobile);
   });
   ```

**Success criteria:**
- File changes detected within 300ms
- No false positives (ignore node_modules, etc.)
- Debouncing prevents rapid rebuilds
- Frontend receives events correctly

---

## Success Metrics

- **Speed**: From folder select to phone preview < 60 seconds
- **Reliability**: 99%+ successful connections
- **Simplicity**: 3 clicks maximum (select folder, scan QR, done)
- **Quality**: Apple-level UI polish

## Resources Needed

- [ ] Cloudflare Workers account (free tier OK)
- [ ] Apple Developer account (for iOS app)
- [ ] Google Play Developer account (for Android app)
- [ ] Test devices (iOS + Android)

---

**Last Updated**: Phase 1 Complete
**Next Milestone**: Working bundler with esbuild
**Target**: Test Phase 2 within 1 week
