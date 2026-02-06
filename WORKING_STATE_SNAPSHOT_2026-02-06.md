# WORKING STATE SNAPSHOT - February 6, 2026

**Git Commit:** acd63f0
**Status:** ✅ FULLY FUNCTIONAL - End-to-end tested and verified
**Date:** February 6, 2026

---

## VERIFIED WORKING FLOW

1. **Start all services:**
   ```bash
   npm run start:all
   ```
   Services: Desktop (1420), Relay (8787), Mobile (Expo)

2. **Open desktop app:**
   - Navigate to http://localhost:1420
   - Wait for "Connected to relay server" in console

3. **Connect mobile device:**
   - Scan QR code with AppTuner mobile app
   - Wait for "Mobile device connected" message

4. **Send initial bundle:**
   - Click "Send Test Bundle" button
   - App should appear on phone: "AUTO-UPDATE SUCCESS! ✅🎉"
   - Verify counter button works (tap to increment)

5. **Enable auto-reload:**
   - Click "START" button
   - Console should show: "🚀 Auto-reload started"
   - Console should show: "📁 Watching: public/test-bundle.js"
   - Button should change to "STOP" and stay that way

6. **Test auto-update:**
   - Edit `/Users/pepijnvanderknaap/Documents/apptuner/public/test-bundle.js`
   - Change any text (e.g., the title)
   - Within 2-4 seconds, changes should appear on phone automatically
   - Console should show:
     - "📝 File changed: /test-bundle.js"
     - "📦 Bundling project..."
     - "📤 Sending bundle (2 KB)..."
     - "✅ Bundle sent successfully"

---

## CONFIGURATION

### BrowserApp.tsx Settings
```typescript
const [projectPath, setProjectPath] = useState<string>('public');

// In toggleAutoReload:
const projectManager = new ProjectManager({
  path: projectPath,
  name: 'Test Project',
  entryPoint: 'test-bundle.js',
});
```

### Key Details
- **Method:** Simple file reading via fetch()
- **NO Metro bundler** involved (that's for future work)
- **Watcher:** Browser-based polling every 2 seconds
- **Debounce:** 300ms for file changes
- **Bundle size:** ~2.5 KB
- **Connection:** WebSocket to Cloudflare Durable Objects relay

---

## CRITICAL FILES AND THEIR STATE

### 1. BrowserApp.tsx (lines 16-22, 136-175)
```typescript
const [projectPath, setProjectPath] = useState<string>('public');
const [autoReload, setAutoReload] = useState<boolean>(false);

const connectionRef = useRef<ConnectionManager | null>(null);
const projectManagerRef = useRef<ProjectManager | null>(null);
const isTogglingRef = useRef<boolean>(false); // ← CRITICAL FIX for double-toggle

const toggleAutoReload = async () => {
  // Prevent double-calls (double-click or React Strict Mode)
  if (isTogglingRef.current) {
    console.log('⚠️ Toggle already in progress, ignoring');
    return;
  }

  if (!connectionRef.current) {
    alert('Error: Not connected to relay');
    return;
  }

  isTogglingRef.current = true;

  try {
    if (autoReload) {
      // Stop auto-reload
      if (projectManagerRef.current) {
        projectManagerRef.current.stop();
        projectManagerRef.current = null;
      }
      setAutoReload(false);
      console.log('🛑 Auto-reload stopped');
    } else {
      // Start auto-reload
      const projectManager = new ProjectManager({
        path: projectPath,
        name: 'Test Project',
        entryPoint: 'test-bundle.js',
      });

      await projectManager.start(connectionRef.current);
      projectManagerRef.current = projectManager;
      setAutoReload(true);
      console.log('🚀 Auto-reload started');
    }
  } finally {
    isTogglingRef.current = false;
  }
};
```

### 2. project-manager.ts (lines 78-127)
```typescript
/**
 * Bundle the project and send to connected devices
 */
private async bundleAndSend(): Promise<void> {
  if (!this.connection) {
    console.error('No connection available');
    return;
  }

  try {
    console.log('📦 Bundling project...');

    // Read the bundle file directly
    const bundleCode = await this.readProjectEntry();

    if (bundleCode) {
      const sizeKB = Math.round(bundleCode.length / 1024);
      console.log(`📤 Sending bundle (${sizeKB} KB)...`);

      this.connection.sendBundleUpdate(bundleCode);

      console.log('✅ Bundle sent successfully');
    }
  } catch (error) {
    console.error('❌ Bundle error:', error);
  }
}

/**
 * Read the project entry point
 */
private async readProjectEntry(): Promise<string | null> {
  try {
    const entryPoint = this.config.entryPoint || 'App.tsx';
    let filePath = `/${this.config.path}/${entryPoint}`;

    // Remove 'public/' prefix since Vite serves public files at root
    if (filePath.startsWith('/public/')) {
      filePath = filePath.replace('/public/', '/');
    }

    // Add cache buster to ensure we get latest content
    const response = await fetch(filePath + '?t=' + Date.now());
    if (!response.ok) {
      throw new Error(`Failed to read ${filePath}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Failed to read project entry:', error);
    return null;
  }
}
```

### 3. watcher.ts (lines 66-110)
```typescript
/**
 * Start polling for file changes
 */
private startPolling(): void {
  // Poll every 2 seconds
  this.pollInterval = setInterval(() => {
    this.checkForChanges();
  }, 2000);

  // Do initial check
  this.checkForChanges();
}

/**
 * Check if file has changed
 */
private async checkForChanges(): Promise<void> {
  try {
    // For browser environment, we'll watch a specific file
    // Remove 'public/' prefix since Vite serves public files at root
    let filePath = `/${this.config.projectPath}`;
    if (filePath.startsWith('/public/')) {
      filePath = filePath.replace('/public/', '/');
    }
    const response = await fetch(filePath + '?t=' + Date.now()); // Cache bust

    if (!response.ok) {
      return;
    }

    const content = await response.text();

    if (this.lastContent === null) {
      // First read, just store it
      this.lastContent = content;
      return;
    }

    if (content !== this.lastContent) {
      console.log(`📝 File changed: ${filePath}`);
      this.lastContent = content;
      this.handleChange(filePath);
    }
  } catch (error) {
    // Silently fail - file might not exist yet
  }
}
```

### 4. executor.ts (mobile/src/services/executor.ts)
```typescript
/**
 * Execute a JavaScript bundle
 */
async execute(bundleCode: string): Promise<void> {
  try {
    console.log('[Executor] Executing bundle...');

    // Store for potential re-execution
    this.lastBundle = bundleCode;

    console.log('[Executor] Bundle code length:', bundleCode.length);

    // Create a function that executes the bundle with React and ReactNative in scope
    // The bundle should define a function called App and expose it
    const wrappedCode = `
      ${bundleCode}
      return App;
    `;

    // Use Function constructor with React and ReactNative as parameters
    // This makes them available in the bundle's scope
    const executorFn = new Function('React', 'ReactNative', wrappedCode);

    // Execute and get the App component
    const AppComponent = executorFn(React, ReactNative);

    // Store on global so the mobile app can access it
    (global as any).App = AppComponent;

    console.log('[Executor] Bundle executed successfully');
    console.log('[Executor] App component type:', typeof AppComponent);

  } catch (error) {
    console.error('[Executor] Execution error:', error);
    console.error('[Executor] Error type:', typeof error);
    console.error('[Executor] Error message:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
```

### 5. public/test-bundle.js (Current working bundle)
```javascript
// Simple React Native test bundle
// React and ReactNative are injected as function parameters
const { View, Text, StyleSheet, TouchableOpacity, ScrollView } = ReactNative;

function App() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    ScrollView,
    { style: styles.container, contentContainerStyle: styles.contentContainer },
    React.createElement(Text, { style: styles.title }, 'AUTO-UPDATE SUCCESS! ✅🎉'),
    React.createElement(
      Text,
      { style: styles.subtitle },
      'No refresh needed - it just works! 🔥'
    ),
    React.createElement(
      View,
      { style: styles.counterBox },
      React.createElement(Text, { style: styles.counterLabel }, 'Counter:'),
      React.createElement(Text, { style: styles.counterValue }, String(count))
    ),
    React.createElement(
      TouchableOpacity,
      {
        style: styles.button,
        onPress: () => setCount(count + 1)
      },
      React.createElement(Text, { style: styles.buttonText }, 'Tap me!')
    ),
    React.createElement(
      TouchableOpacity,
      {
        style: [styles.button, styles.resetButton],
        onPress: () => setCount(0)
      },
      React.createElement(Text, { style: styles.buttonText }, 'Reset')
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  counterBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  counterValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
    minWidth: 200,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// The executor will return this App component
console.log('Bundle code executed, App defined');
```

---

## WHAT IS NOT INCLUDED (Future Work)

This working state does NOT include:
- ❌ Metro bundler integration
- ❌ TypeScript/JSX compilation
- ❌ test-app/ project support
- ❌ Real-time file system watching (using polling instead)
- ❌ Multi-project support

This is intentional! The current setup is a stable baseline.

---

## TROUBLESHOOTING

### Issue: START button immediately reverts to STOP
**Cause:** Double-toggle from React Strict Mode or double-click
**Fix:** Added `isTogglingRef` guard (already in this snapshot)

### Issue: Changes not appearing on phone
**Check:**
1. Is STOP button showing? (auto-reload should be active)
2. Browser console shows "📝 File changed"?
3. Browser console shows "📤 Sending bundle"?
4. Mobile device still connected? (check connection status)

### Issue: WebSocket disconnects frequently
**Check:** Relay server logs for errors
**Common cause:** Session timeout after 45 minutes of inactivity

---

## HOW TO RESTORE THIS STATE

If you need to revert to this exact working state:

```bash
# Option 1: Reset to this commit
git reset --hard acd63f0

# Option 2: Checkout specific files from this commit
git checkout acd63f0 -- src/BrowserApp.tsx
git checkout acd63f0 -- src/services/project-manager.ts
git checkout acd63f0 -- mobile/src/services/executor.ts
git checkout acd63f0 -- public/test-bundle.js

# Then refresh browser and rebuild mobile app
```

---

## NEXT STEPS (When Ready)

When ready to proceed with Metro integration:

1. **Create a new branch** for Metro work
   ```bash
   git checkout -b feature/metro-integration
   ```

2. **Test Metro bundling independently** before integrating

3. **Add Metro fallback** - if Metro fails, fall back to this working approach

4. **Document Metro state** - create another snapshot when Metro works

---

## COMMIT HISTORY

- `10b399a` - Initial commit: Working MVP with end-to-end hot reload
- `fe21ef5` - Reverting from Metro to simple test-bundle.js approach
- `acd63f0` - **WORKING STATE: Auto-reload fully functional** ← YOU ARE HERE

---

**END OF SNAPSHOT**
