# Apptuner - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
```bash
npm run tauri dev
```

This opens the desktop app with hot reload!

### 3. Try It Out
1. Click the folder picker button
2. Select any React Native project folder
3. See the QR code appear

---

## What You'll See

### Empty State (No Project)
```
┌────────────────────────┐
│      Apptuner          │
│  Test React Native...  │
│                        │
│     📁 (folder icon)   │
│  No project selected   │
│                        │
│  ┌──────────────────┐  │
│  │ Click to select  │  │
│  │ project folder   │  │
│  └──────────────────┘  │
│                        │
│   v0.1.0 • Made with   │
│        care            │
└────────────────────────┘
```

### With Valid Project Selected
```
┌────────────────────────┐
│      Apptuner          │
│  Test React Native...  │
│                        │
│  ┌──────────────────┐  │
│  │ 📁 my-app        │  │
│  │ /Users/.../my-app│  │
│  │         [Change] │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │                  │  │
│  │    [QR CODE]     │  │
│  │                  │  │
│  │ Scan with mobile │  │
│  └──────────────────┘  │
│                        │
│  ⚫ Waiting for device  │
└────────────────────────┘
```

---

## Testing With a React Native Project

### Option 1: Use Existing Project
Point Apptuner at any React Native project with:
- ✅ `package.json` file
- ✅ `App.tsx` or `App.js` file

### Option 2: Create Test Project
```bash
# In a separate folder
mkdir test-rn-app
cd test-rn-app

# Create package.json
cat > package.json << 'EOF'
{
  "name": "test-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0"
  }
}
EOF

# Create App.tsx
cat > App.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Apptuner!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
  },
});
EOF
```

Now select this folder in Apptuner!

---

## Expected Behavior

### ✅ Valid Project
- Shows project name and full path
- Displays QR code
- Status: "Waiting for device..." (yellow pulsing dot)
- "Change" button lets you pick a different folder

### ❌ Invalid Project
- Shows error message in red
- Explains what's missing:
  - "Missing package.json" if no package.json
  - "Missing App entry point" if no App.tsx/js
- No QR code displayed

---

## Development Workflow

### Making Changes

**Frontend (React):**
```bash
# Edit any file in src/
# Changes hot reload automatically
# Check browser DevTools for errors
```

**Backend (Rust):**
```bash
# Edit files in src-tauri/src/
# Save → app restarts with changes
# Check terminal for compilation errors
```

**Styles:**
```bash
# Edit src/styles.css
# Changes hot reload automatically
# Use CSS variables from design system
```

### Build for Production
```bash
npm run tauri build
```

Outputs:
- macOS: `.app` and `.dmg` in `src-tauri/target/release/bundle/`
- Windows: `.exe` and `.msi`
- Linux: `.deb`, `.AppImage`

---

## Troubleshooting

### "Command not found: tauri"
```bash
npm install
# Tauri CLI is in devDependencies
```

### "Port 1420 already in use"
```bash
# Kill the process using port 1420
lsof -ti:1420 | xargs kill -9
```

### "Rust not installed"
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Build Errors
```bash
# Check TypeScript
npx tsc --noEmit

# Clean build
rm -rf dist src-tauri/target
npm run build
```

### App Won't Open
```bash
# Test Vite dev server first
npm run dev
# Should open localhost:1420 in browser

# Then try Tauri
npm run tauri dev
```

---

## Next Steps

Once you've verified the desktop app works:

1. **Add esbuild bundler** (Phase 2)
   - Install: `npm install --save-dev esbuild`
   - Update `src/services/bundler.ts`
   - Test bundling a real React Native project

2. **Implement file watcher** (Phase 3)
   - Use `notify` crate in Rust backend
   - Trigger rebuilds on file changes
   - Add debouncing

3. **Deploy Cloudflare relay** (Phase 4)
   - Create Workers project
   - Set up WebSocket handling
   - Deploy to production

4. **Build mobile app** (Phase 5)
   - Create React Native project
   - Add QR scanner
   - Connect to relay
   - Execute bundled code

---

## Key Commands

```bash
# Development
npm run tauri dev        # Run full app with hot reload
npm run dev              # Run Vite server only

# Building
npm run build            # Build frontend
npm run tauri build      # Build complete app

# Type checking
npx tsc --noEmit        # Check for TypeScript errors

# Debugging
npm run tauri dev        # DevTools auto-open in debug mode
```

---

## Architecture At a Glance

```
┌─────────────┐
│ Desktop App │ ← You are here! ✅
│ (This app)  │
└─────────────┘
      ↓
┌─────────────┐
│   Bundler   │ ← Next: Add esbuild
│  (esbuild)  │
└─────────────┘
      ↓
┌─────────────┐
│ CF Relay    │ ← Phase 4
│ (Workers)   │
└─────────────┘
      ↓
┌─────────────┐
│ Mobile App  │ ← Phase 5
│ (RN)        │
└─────────────┘
```

---

## Design System

Using CSS variables in `src/styles.css`:

```css
/* Colors */
--accent: #007aff          /* Apple blue */
--success: #34c759         /* Green */
--error: #ff3b30           /* Red */

/* Spacing */
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px

/* Typography */
--font-size-base: 15px
--font-size-lg: 17px
--font-size-xl: 22px
```

All components use these variables for consistency!

---

## Help & Support

- **Documentation**: See [README.md](README.md)
- **Development**: See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Roadmap**: See [TODO.md](TODO.md)

---

**You're all set!** 🎉

Run `npm run tauri dev` and start building!
