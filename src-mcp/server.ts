
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  SDK_LIBRARIES,
  SDK_VERSION,
  RN_VERSION,
  REACT_VERSION,
  EXPLICITLY_EXCLUDED,
  PROJECT_STRUCTURE,
  formatSdkManifest,
  formatLibraryDoc,
} from './sdk-manifest.js';

const server = new McpServer({
  name: 'apptuner-mcp',
  version: '1.0.0',
});

// ─── RESOURCES ───────────────────────────────────────────────────────────────

// Full SDK manifest — the AI reads this to get context on the entire SDK
server.registerResource(
  'sdk-manifest',
  'apptuner://sdk/manifest',
  {
    title: 'AppTuner SDK 2.0 Library Manifest',
    description: 'Complete list of all native modules available in the AppTuner runtime, with versions and import patterns',
    mimeType: 'text/markdown',
  },
  async () => ({
    contents: [{
      uri: 'apptuner://sdk/manifest',
      text: formatSdkManifest(),
    }],
  })
);

// Per-library docs
server.registerResource(
  'library-docs',
  new ResourceTemplate('apptuner://sdk/library/{name}', {
    list: async () => ({
      resources: SDK_LIBRARIES.map(lib => ({
        uri: `apptuner://sdk/library/${encodeURIComponent(lib.name)}`,
        name: lib.name,
        description: lib.description,
        mimeType: 'text/markdown',
      })),
    }),
  }),
  {
    title: 'SDK Library Documentation',
    description: 'Detailed docs, import patterns and usage examples for a specific library',
    mimeType: 'text/markdown',
  },
  async (uri, { name }) => {
    const lib = SDK_LIBRARIES.find(l => l.name === decodeURIComponent(String(name)));
    if (!lib) {
      return {
        contents: [{
          uri: uri.href,
          text: `Library '${name}' not found in AppTuner SDK ${SDK_VERSION}.`,
        }],
      };
    }
    return { contents: [{ uri: uri.href, text: formatLibraryDoc(lib) }] };
  }
);

// Project structure guide
server.registerResource(
  'project-structure',
  'apptuner://sdk/project-structure',
  {
    title: 'AppTuner Project Structure',
    description: 'Required file structure and index.js pattern for AppTuner apps',
    mimeType: 'text/markdown',
  },
  async () => ({
    contents: [{ uri: 'apptuner://sdk/project-structure', text: PROJECT_STRUCTURE }],
  })
);

// ─── TOOLS ────────────────────────────────────────────────────────────────────

// Primary tool — call at session start to get full SDK context
server.registerTool(
  'get_sdk_info',
  {
    title: 'Get AppTuner SDK Information',
    description:
      'Returns complete information about AppTuner SDK 2.0: all available native libraries, ' +
      'exact versions, required project structure, and what is NOT supported. ' +
      'Call this at the start of any AppTuner development session.',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{
      type: 'text' as const,
      text: [
        formatSdkManifest(),
        '\n---\n',
        `## Runtime Versions\n- React Native: ${RN_VERSION}\n- React: ${REACT_VERSION}\n- SDK: ${SDK_VERSION}`,
      ].join('\n'),
    }],
  })
);

// Check if a specific package is available
server.registerTool(
  'check_import',
  {
    title: 'Check Package Availability in AppTuner SDK',
    description:
      'Check if a specific npm package is available in the AppTuner runtime before using it. ' +
      'Always call this before importing a native module to verify it is supported. ' +
      'Returns availability status, version, and usage example.',
    inputSchema: z.object({
      packageName: z.string().describe(
        'The npm package name to check, e.g. "react-native-maps", "expo-camera", "@notifee/react-native"'
      ),
    }),
  },
  async ({ packageName }) => {
    const lib = SDK_LIBRARIES.find(l => l.name === packageName);
    if (lib) {
      return {
        content: [{
          type: 'text' as const,
          text: `✅ AVAILABLE in AppTuner SDK ${SDK_VERSION}\n\n${formatLibraryDoc(lib)}`,
        }],
      };
    }

    const excluded = EXPLICITLY_EXCLUDED.find(e =>
      packageName.includes(e.name.replace('*', '')) || e.name.includes(packageName)
    );
    if (excluded) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ NOT AVAILABLE — ${excluded.reason}`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: [
          `❌ '${packageName}' is NOT in AppTuner SDK ${SDK_VERSION}.`,
          'Only these libraries are pre-installed:',
          SDK_LIBRARIES.map(l => `  - ${l.name} ${l.version}`).join('\n'),
          '\nDo not use this package — it will fail at runtime on the device.',
        ].join('\n'),
      }],
    };
  }
);

// Get detailed docs for one library
server.registerTool(
  'get_library_docs',
  {
    title: 'Get Library Documentation',
    description: 'Get detailed documentation, import patterns, and usage examples for a specific AppTuner SDK library.',
    inputSchema: z.object({
      libraryName: z.string().describe(
        'The exact library name, e.g. "@react-navigation/native", "react-native-maps", "@notifee/react-native"'
      ),
    }),
  },
  async ({ libraryName }) => {
    const lib = SDK_LIBRARIES.find(l => l.name === libraryName);
    if (!lib) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `'${libraryName}' not found in SDK ${SDK_VERSION}.`,
            'Available libraries:',
            SDK_LIBRARIES.map(l => `  - ${l.name}`).join('\n'),
          ].join('\n'),
        }],
      };
    }
    return { content: [{ type: 'text' as const, text: formatLibraryDoc(lib) }] };
  }
);

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

server.registerPrompt(
  'new_apptuner_project',
  {
    title: 'New AppTuner Project',
    description: 'Generate a complete scaffold for a new React Native app targeting AppTuner SDK 2.0',
    argsSchema: z.object({
      appName: z.string().describe('Name of the new app, e.g. "MyDeliveryApp"'),
      features: z.string().optional().describe(
        'Comma-separated features needed, e.g. "navigation, maps, camera, notifications"'
      ),
    }),
  },
  ({ appName, features }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: [
          `Create a new AppTuner app called "${appName}".`,
          features ? `It needs these features: ${features}.` : '',
          '',
          'AppTuner SDK rules:',
          `- React: ${REACT_VERSION}, React Native: ${RN_VERSION}`,
          '- Available native libraries: ' + SDK_LIBRARIES.map(l => l.name).join(', '),
          '- expo-* packages ARE supported — they are pre-installed in the AppTuner runtime shell',
          '- Do NOT include SDK libraries in package.json — they are pre-installed in the runtime',
          '',
          'Required index.js pattern:',
          '```javascript',
          "import { AppRegistry } from 'react-native';",
          "import App from './App';",
          'global.App = App;',
          `AppRegistry.registerComponent('${appName}', () => App);`,
          '```',
          '',
          'Create: index.js, App.tsx, package.json, metro.config.js, babel.config.js',
        ].filter(Boolean).join('\n'),
      },
    }],
  })
);

server.registerPrompt(
  'add_navigation',
  {
    title: 'Add Navigation to AppTuner App',
    description: 'Guide to adding @react-navigation correctly to an AppTuner project',
    argsSchema: z.object({
      navigationType: z.enum(['stack', 'tabs', 'mixed']).describe(
        'Type of navigation: stack (push/pop screens), tabs (bottom tab bar), mixed (tabs + stack inside)'
      ),
    }),
  },
  ({ navigationType }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: [
          `Add ${navigationType} navigation to this AppTuner app.`,
          '',
          'Available navigation libraries (all pre-installed in AppTuner SDK):',
          '- @react-navigation/native (NavigationContainer)',
          '- @react-navigation/native-stack (stack navigation)',
          '- @react-navigation/bottom-tabs (tab navigation)',
          '- react-native-screens, react-native-safe-area-context, react-native-gesture-handler (all included)',
          '',
          'Do NOT add these to package.json — they are pre-installed.',
          'Do NOT use @react-navigation/stack (JS version) — use native-stack.',
          '',
          navigationType === 'stack' ? 'Set up a native stack navigator with 2-3 example screens.' : '',
          navigationType === 'tabs' ? 'Set up a bottom tab navigator with 3 tabs (Home, Search, Profile).' : '',
          navigationType === 'mixed' ? 'Set up bottom tabs with a stack navigator inside the main tab.' : '',
        ].filter(Boolean).join('\n'),
      },
    }],
  })
);

// ─── CONNECT ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
