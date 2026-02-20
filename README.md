# AppTuner

**Instant hot reload for React Native** - See your changes in real-time on physical devices.

[![npm version](https://img.shields.io/npm/v/apptuner.svg)](https://www.npmjs.com/package/apptuner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is AppTuner?

AppTuner brings **instant hot reload** to React Native development. Edit your code, save the file, and see changes on your physical device in seconds - no manual refresh needed.

### Why AppTuner?

- ⚡ **Instant Updates** - Changes appear on your device automatically
- 📱 **Real Devices** - Test on actual iPhones and Android phones, not simulators
- 🌍 **Works Anywhere** - Cloud relay means it works on any WiFi network
- 🎯 **Zero Config** - Works with existing React Native projects
- 🚀 **Metro Integration** - Uses the official React Native bundler

## Installation

```bash
npm install -g apptuner
```

## Quick Start

1. **Install the mobile app** (coming soon to App Store & Play Store)

2. **Navigate to your React Native project:**
   ```bash
   cd your-react-native-project
   ```

3. **Start AppTuner:**
   ```bash
   apptuner start
   ```

4. **Scan the QR code** with the AppTuner mobile app

5. **Start coding!** Every save automatically updates your device ✨

## Commands

### `apptuner start`

Starts the AppTuner development server with hot reload enabled.

```bash
apptuner start
```

The CLI will:
- Start Metro bundler
- Start file watcher
- Connect to cloud relay
- Display a QR code
- Automatically bundle and send changes to your device

### `apptuner status`

Check connection status.

### `apptuner stop`

Stop all AppTuner services.

## How It Works

1. **File Watcher** detects when you save a file
2. **Metro Bundler** compiles your React Native code
3. **Cloud Relay** sends the bundle to your phone
4. **Mobile App** hot reloads with your changes

All automatic. No button presses. No manual refreshes.

## Requirements

- **Node.js** 18 or higher
- **React Native** project (0.70+)
- **AppTuner mobile app** (iOS/Android)

## Pricing

- **7-day free trial** - Full features, no credit card
- **$29/month** - Cancel anytime
- **$99/year** - Save $249/year
- **$199 lifetime** - Pay once, use forever

[Start your free trial →](https://apptuner.io)

## Support

- **Website:** [apptuner.io](https://apptuner.io)
- **Issues:** [github.com/pepijnvanderknaap/apptuner/issues](https://github.com/pepijnvanderknaap/apptuner/issues)
- **Email:** support@apptuner.io

## License

MIT © Pepijn van der Knaap
