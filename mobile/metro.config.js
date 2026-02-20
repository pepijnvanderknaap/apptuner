const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
  // Explicitly limit watch to only the mobile directory to prevent Metro
  // from scanning the parent apptuner project's node_modules
  watchFolders: [path.resolve(__dirname)],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
