# apptuner-mcp

MCP (Model Context Protocol) server for [AppTuner](https://apptuner.io) — gives AI coding tools like Cursor, Windsurf, and Claude Code full knowledge of the AppTuner SDK 1.0, so they generate correct React Native code automatically.

## What it does

When connected, your AI coding tool will:
- Know exactly which native libraries are pre-installed in AppTuner (react-navigation, vision-camera, maps, etc.)
- Never suggest adding SDK libraries to `package.json` (they're pre-installed in the runtime)
- Generate correct import patterns for every SDK library
- Know the required `index.js` pattern for AppTuner apps
- Warn when a package (like Expo or Firebase native) is not supported

## Install

```bash
npm install -g apptuner-mcp
```

## Wire up to Claude Code

```bash
claude mcp add apptuner apptuner-mcp
```

## Wire up to Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "apptuner": {
      "command": "apptuner-mcp"
    }
  }
}
```

## Wire up to Windsurf

Add to your Windsurf MCP settings:

```json
{
  "mcpServers": {
    "apptuner": {
      "command": "apptuner-mcp"
    }
  }
}
```

## Available tools

| Tool | Description |
|---|---|
| `get_sdk_info` | Returns the full SDK manifest — all available libraries, versions, import patterns, project structure |
| `check_import` | Check if a specific npm package is available in AppTuner before importing it |
| `get_library_docs` | Get detailed docs and usage examples for a specific SDK library |

## Available resources

| Resource | URI |
|---|---|
| SDK Manifest | `apptuner://sdk/manifest` |
| Library docs | `apptuner://sdk/library/{name}` |
| Project structure | `apptuner://sdk/project-structure` |

## AppTuner SDK 1.0 — pre-installed libraries

- `@react-navigation/native` + `native-stack` + `bottom-tabs`
- `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`
- `@react-native-async-storage/async-storage` v3
- `react-native-vision-camera`
- `react-native-image-picker`
- `react-native-maps`
- `react-native-geolocation-service`
- `react-native-svg`
- `react-native-reanimated`
- `@notifee/react-native`

Runtime: React Native 0.81.6 / React 19.1.4

## More

- Website: https://apptuner.io
- CLI: `npm install -g apptuner`
- GitHub: https://github.com/pepijnvanderknaap/apptuner
