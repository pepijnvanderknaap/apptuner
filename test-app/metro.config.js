const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Externalize React and React Native - they will be provided by the host app
config.resolver = {
  ...config.resolver,
  // CRITICAL FIX: Redirect 'invariant' package to our safe version
  extraNodeModules: {
    'invariant': path.resolve(__dirname, 'safe-invariant.js'),
  },
  // Add asset extensions - images, fonts, etc.
  assetExts: [
    ...(config.resolver.assetExts || []),
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
    'ttf', 'otf', 'woff', 'woff2',
  ],
  resolveRequest: (context, moduleName, platform) => {
    // CRITICAL: Intercept invariant package and use our safe version
    if (moduleName === 'invariant') {
      return {
        type: 'sourceFile',
        filePath: path.join(__dirname, 'safe-invariant.js'),
      };
    }
    // Return a module that references global React/ReactNative
    if (moduleName === 'react') {
      return {
        type: 'sourceFile',
        filePath: path.join(__dirname, 'react-external.js'),
      };
    }
    if (moduleName === 'react-native') {
      return {
        type: 'sourceFile',
        filePath: path.join(__dirname, 'react-native-external.js'),
      };
    }
    // Use default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Configure transformer to handle assets properly
config.transformer = {
  ...config.transformer,
  // Use our custom asset plugin to inline small assets as base64
  assetPlugins: [path.join(__dirname, 'metro-asset-plugin.js')],
  // Inline small images as base64
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
