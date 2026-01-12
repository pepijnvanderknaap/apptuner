# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run the app in development mode
npm run tauri dev
```

This will:
1. Start the Vite dev server on `http://localhost:1420`
2. Launch the Tauri app window
3. Enable hot reload for React code
4. Open DevTools automatically in debug mode

## Project Components

### Frontend (React + TypeScript)

Located in `src/`:

- **App.tsx** - Main application component
  - Folder selection UI
  - QR code display
  - Connection status
  - Error handling

- **services/connection.ts** - WebSocket connection manager
  - Connects to Cloudflare Workers relay
  - Handles message sending/receiving
  - Auto-reconnection logic
  - Event-based status updates

- **services/bundler.ts** - Code bundling service
  - Bundles React Native code
  - File watching (TODO)
  - esbuild integration (TODO)

- **styles.css** - Apple-style design system
  - CSS variables for theming
  - Reusable components
  - Responsive layout utilities

### Backend (Rust + Tauri)

Located in `src-tauri/src/`:

- **lib.rs** - Tauri application setup
  - `validate_project` - Validates React Native project structure
  - `read_package_json` - Reads project metadata
  - Plugin initialization (dialog, fs)

### Configuration Files

- **tauri.conf.json** - Tauri app configuration
  - Window size: 480x640 (phone-like aspect ratio)
  - Minimum size: 400x500
  - Plugins: dialog, fs

- **vite.config.ts** - Vite bundler configuration
- **tsconfig.json** - TypeScript configuration

## Development Workflow

### Making UI Changes

1. Edit React components in `src/`
2. Changes hot reload automatically
3. Check DevTools console for errors

### Making Backend Changes

1. Edit Rust code in `src-tauri/src/`
2. Save file - Tauri will recompile
3. App window restarts with changes

### Adding New Tauri Commands

1. Add function in `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
fn my_command(param: String) -> Result<String, String> {
    Ok(param)
}
```

2. Register in `invoke_handler!`:
```rust
.invoke_handler(tauri::generate_handler![
    validate_project,
    read_package_json,
    my_command, // Add here
])
```

3. Call from React:
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('my_command', { param: 'value' });
```

## Building for Production

```bash
# Build frontend and backend
npm run tauri build
```

This creates:
- **macOS**: `.dmg` and `.app` in `src-tauri/target/release/bundle/`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.AppImage`, etc.

## Testing

### Manual Testing Checklist

- [ ] Folder selection dialog opens
- [ ] Invalid folders show error message
- [ ] Valid React Native project loads
- [ ] QR code displays
- [ ] Connection status updates
- [ ] "Change" button works
- [ ] Error messages display properly

### Project Validation Tests

Test with these folder structures:

✅ **Valid**:
```
my-app/
├── package.json
├── App.tsx
└── ...
```

❌ **Invalid** (no package.json):
```
my-app/
├── App.tsx
└── ...
```

❌ **Invalid** (no App entry):
```
my-app/
├── package.json
└── src/
    └── components/
```

## Debugging

### React DevTools

Automatically opens in development mode. Access via:
- Right-click → Inspect Element
- Or manually: `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)

### Rust Debugging

Add debug prints:
```rust
println!("Debug: {:?}", variable);
```

View in terminal where you ran `npm run tauri dev`.

### Common Issues

**Issue**: App window won't open
- Check if port 1420 is available
- Try `npm run dev` first to test Vite server

**Issue**: Tauri commands not found
- Check `invoke_handler` registration
- Verify command name matches (snake_case in Rust, camelCase in TypeScript)

**Issue**: Build fails
- Run `npm run build` first
- Check TypeScript errors: `npx tsc --noEmit`

## Code Style

- **React**: Functional components with hooks
- **TypeScript**: Strict mode enabled
- **Rust**: Follow clippy suggestions
- **CSS**: Use CSS variables from design system
- **Naming**:
  - React components: PascalCase
  - Functions: camelCase
  - Rust: snake_case
  - CSS classes: kebab-case with BEM

## Next Steps

Current TODOs marked in code:
- [ ] Implement esbuild bundling
- [ ] Add file watching with notify crate
- [ ] Create Cloudflare Workers relay
- [ ] Build React Native mobile app
- [ ] Add hot reload support

## Resources

- [Tauri Docs](https://tauri.app/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [esbuild Docs](https://esbuild.github.io/)
