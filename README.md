# Apptuner

A simpler alternative to Expo for React Native testing. Write code anywhere, point Apptuner at your folder, and instantly preview on your phone.

## What is Apptuner?

Apptuner is a React Native app testing tool focused on speed and simplicity. It's NOT a code editor - just a testing tool that lets you preview your React Native apps on your phone in under a minute.

### Key Features

- **No code editor** - Use Claude, Cursor, VS Code, or any editor you prefer
- **Instant preview** - Point at your folder and see it on your phone
- **Cloud relay** - Stable connection via Cloudflare Workers (fixes Expo's WiFi issues)
- **Apple Inc-style design** - Minimal, clean, lots of whitespace
- **Simple by default** - Advanced features hidden for power users

## Tech Stack

- **Desktop app**: Tauri + React + Vite
- **Cloud relay**: Cloudflare Workers
- **Mobile app**: React Native (coming soon)
- **Bundler**: esbuild (integration in progress)

## Project Structure

```
apptuner/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # React entry point
│   ├── styles.css         # Apple-style design system
│   └── services/
│       ├── connection.ts  # WebSocket connection manager
│       └── bundler.ts     # Code bundling service
├── src-tauri/             # Tauri backend
│   └── src/
│       ├── lib.rs         # Rust backend with folder validation
│       └── main.rs        # Entry point
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Development

```bash
# Start the Vite dev server
npm run dev

# Start Tauri in development mode (opens the app)
npm run tauri dev

# Build the frontend
npm run build

# Type check
npm run type-check
```

## How It Works

1. **Select Project**: Click to select your React Native project folder
2. **Validation**: App validates the project has required files (package.json, App.js/tsx)
3. **Generate QR Code**: Creates a unique session ID and displays a QR code
4. **Connect**: Mobile app scans QR code and connects via Cloudflare Workers relay
5. **Live Updates**: File changes are bundled and sent to your phone instantly

## Current Status

### Completed ✅

- **Phase 1**: Desktop app UI with Apple-style design
- **Phase 1**: Folder selection and project validation
- **Phase 1**: QR code generation for mobile connection
- **Phase 1**: WebSocket connection manager
- **Phase 1**: Tauri backend commands
- **Phase 2**: ⭐ esbuild integration for React Native bundling
- **Phase 2**: ⭐ JSX/TypeScript transformation
- **Phase 2**: ⭐ Entry point auto-detection
- **Phase 2**: ⭐ React Native polyfills and runtime

### In Progress 🚧

- File watching system (Rust notify crate) - **Next up!**
- Cloudflare Workers relay server
- Mobile app (React Native)

### Coming Soon 📋

- Hot reload support
- Source map generation
- Error overlay
- Performance monitoring
- Advanced settings panel

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Desktop App    │         │ Cloudflare Edge  │         │   Mobile App    │
│  (Tauri+React)  │◄───────►│   (Workers)      │◄───────►│ (React Native)  │
│                 │  WSS    │                  │  WSS    │                 │
│  - Folder Pick  │         │  - Session Mgmt  │         │  - QR Scanner   │
│  - File Watch   │         │  - Message Relay │         │  - Code Exec    │
│  - Bundler      │         │  - Connection    │         │  - Hot Reload   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Design Philosophy

- **Minimal by default**: One-click folder selection, automatic QR code generation
- **Clean UI**: Apple Inc-inspired design with lots of whitespace
- **Fast**: Under a minute from start to testing on phone
- **Reliable**: Cloud relay fixes common WiFi/network issues
- **Focused**: NOT trying to be an IDE - just a testing tool

## Development Roadmap

1. **Phase 1**: Desktop app foundation ✅ **COMPLETE**
2. **Phase 2**: esbuild bundler integration ✅ **COMPLETE**
3. **Phase 3**: File watching system 🚧 **NEXT**
4. **Phase 4**: Cloudflare Workers relay
5. **Phase 5**: React Native mobile app
6. **Phase 6**: Hot reload and advanced features
7. **Phase 7**: Polish and optimization

## Contributing

This is currently in early development. Contributions welcome once we reach Phase 4.

## License

MIT

---

**Made with care** • v0.1.0
