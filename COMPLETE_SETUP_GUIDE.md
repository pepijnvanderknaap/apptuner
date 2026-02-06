# AppTuner - Complete Setup Guide

This guide will get AppTuner running end-to-end on your machine.

## ⚠️ Important: Maintenance Reality

**Before you start**, understand that AppTuner requires ongoing maintenance:
- React Native updates frequently (every 2-3 months)
- iOS and Xcode updates require testing
- Dependencies need regular updates
- Expect to spend 2-4 hours/month on maintenance

**This is normal for React Native tooling** - even Expo faces these challenges.

---

## Prerequisites

### Required Software
- **macOS** (for iOS development)
- **Node.js 18+** - `node --version`
- **Rust & Cargo** - For Tauri desktop app
- **Xcode** - For iOS builds (optional for desktop-only testing)
- **Wrangler** - For Cloudflare Workers deployment

### Accounts Needed
- **Cloudflare account** (free tier works)
- **Apple Developer account** (optional, for device testing)

---

## Part 1: Install Rust (Required for Desktop App)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the prompts (choose default installation)

# Reload your shell
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

---

## Part 2: Setup Desktop App

```bash
cd /Users/pepijnvanderknaap/Documents/apptuner

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# This should open the desktop app window
```

**Expected behavior:**
- Window opens with AppTuner UI
- You can select a React Native project folder
- QR code is generated
- WebSocket connection attempts to connect

---

## Part 3: Setup Relay Server

The relay server connects desktop ↔ mobile via WebSocket.

```bash
cd relay

# Install dependencies
npm install

# Test locally
npm run dev

# This starts local Wrangler dev server on http://localhost:8787
```

### Deploy to Cloudflare (Production)

```bash
# Login to Cloudflare
npx wrangler login

# Deploy
npm run deploy

# Note the URL - you'll need it for the apps
# Example: https://apptuner-relay.your-subdomain.workers.dev
```

**Update the relay URL in:**
1. Desktop app: `src/services/connection.ts`
2. Mobile app: `src/config.ts`

---

## Part 4: Setup Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Fix React Native version issues (if needed)
# The commit has some version mismatches - update package.json:
# "@react-native/babel-preset": "^0.72.0" → "^0.73.0" (or latest)

# Start Expo
npm start

# Or for specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
```

**On your phone:**
1. Install Expo Go app from App Store
2. Scan the QR code from terminal
3. App opens on your phone

---

## Part 5: Test End-to-End Flow

### Step 1: Start Relay Server
```bash
cd relay
npm run dev
# Keep this running
```

### Step 2: Start Desktop App
```bash
cd /Users/pepijnvanderknaap/Documents/apptuner
npm run tauri dev
# Keep this running
```

### Step 3: Start Mobile App
```bash
cd mobile
npm start
# Scan QR code on your phone
```

### Step 4: Test Hot Reload

1. **Desktop**: Select a React Native project folder
2. **Desktop**: QR code is displayed
3. **Mobile**: Scan QR code with AppTuner mobile app
4. **Mobile**: Apps connect via relay server
5. **Desktop**: Make a change to your React Native code
6. **Mobile**: See instant hot reload!

---

## Part 6: Build for Production

### Desktop App

```bash
cd /Users/pepijnvanderknaap/Documents/apptuner
npm run tauri build

# macOS .app and .dmg will be in:
# src-tauri/target/release/bundle/
```

### Mobile App

For production, you'll need to create a standalone build (not using Expo Go):

```bash
cd mobile

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

**Note:** This requires an Expo Application Services (EAS) account.

---

## Troubleshooting

### Desktop App Won't Start
```bash
# Check Rust is installed
cargo --version

# Reinstall dependencies
rm -rf node_modules
npm install

# Check for Tauri errors
npm run tauri dev
```

### Mobile App Dependency Errors
```bash
# Clear cache
rm -rf node_modules
npm install

# Try updating React Native version in package.json
# Match versions with current React Native version
```

### Relay Server Issues
```bash
# Check Wrangler is installed
npx wrangler --version

# Test locally first
npm run dev

# Check Cloudflare dashboard for deployment status
```

### WebSocket Connection Fails
1. Check relay server is running
2. Verify URL in desktop/mobile config
3. Check CORS settings in relay server
4. Test with `wscat` or similar WebSocket tool

---

## Project Structure

```
apptuner/
├── src/              # Desktop app (React + Vite)
├── src-tauri/        # Desktop backend (Rust + Tauri)
├── mobile/           # Mobile app (React Native + Expo)
├── relay/            # Relay server (Cloudflare Workers)
└── cli/              # CLI for custom viewer generation
```

---

## Development Workflow

### Daily Development
1. Start relay: `cd relay && npm run dev`
2. Start desktop: `npm run tauri dev`
3. Start mobile: `cd mobile && npm start`

### Testing Changes
- Desktop changes hot reload automatically
- Mobile changes require Expo reload (shake device → reload)
- Relay changes require restart

---

## Maintenance Schedule

### Monthly Tasks
- Update npm dependencies
- Test with latest React Native version
- Check for Tauri updates
- Review Cloudflare Workers changes

### Quarterly Tasks
- Update React Native to latest stable
- Test with latest iOS version
- Update Rust dependencies
- Review and update documentation

### When iOS Updates
- Test immediately after iOS update
- Check React Native compatibility
- Update Xcode if needed
- Test on real devices

---

## Deployment Checklist

Before creating a demo video:

- [ ] Desktop app builds successfully
- [ ] Mobile app works on real device
- [ ] Relay server is deployed and stable
- [ ] End-to-end hot reload works consistently
- [ ] Error messages are user-friendly
- [ ] Loading states look polished
- [ ] QR code is clearly visible
- [ ] Connection is reliable

---

## Next Steps

1. **Test current setup** - Follow this guide
2. **Fix any bugs** - Document issues you find
3. **Polish UI** - Make it look professional
4. **Create demo app** - Build something impressive
5. **Build landing page** - Show off the tool
6. **Record demo video** - Show it working

---

## Support & Resources

- React Native docs: https://reactnative.dev
- Tauri docs: https://tauri.app
- Expo docs: https://docs.expo.dev
- Cloudflare Workers: https://developers.cloudflare.com/workers

---

**Built with care by Pepijn van der Knaap**
