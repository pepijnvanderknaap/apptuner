const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Externalize React and React Native - they will be provided by the host app
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
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

module.exports = config;
