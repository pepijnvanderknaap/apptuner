/**
 * Custom Metro transformer that externalizes React and React Native
 * This prevents Metro from bundling these dependencies
 */

const upstreamTransformer = require('@react-native/metro-babel-transformer');

module.exports.transform = async ({ src, filename, options }) => {
  // First, do the standard Babel transformation
  const result = await upstreamTransformer.transform({ src, filename, options });

  // Don't modify node_modules or metro runtime
  if (filename.includes('node_modules') || filename.includes('metro-runtime')) {
    return result;
  }

  // Rewrite imports of React and React Native to use globals
  let code = result.code;

  // Pattern 1: import React from 'react'
  // Replace with: const React = global.React
  code = code.replace(
    /import\s+React\s+from\s+['"]react['"]/g,
    "const React = global.React"
  );

  // Pattern 2: import { something } from 'react'
  // Replace with: const { something } = global.React
  code = code.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/g,
    "const {$1} = global.React"
  );

  // Pattern 3: import * as React from 'react'
  // Replace with: const React = global.React
  code = code.replace(
    /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/g,
    "const React = global.React"
  );

  // Pattern 4: import { View, Text, ... } from 'react-native'
  // Replace with: const { View, Text, ... } = global.ReactNative
  code = code.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"]/g,
    "const {$1} = global.ReactNative"
  );

  // Pattern 5: import * as ReactNative from 'react-native'
  code = code.replace(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]react-native['"]/g,
    "const $1 = global.ReactNative"
  );

  // Pattern 6: import ReactNative from 'react-native'
  code = code.replace(
    /import\s+(\w+)\s+from\s+['"]react-native['"]/g,
    "const $1 = global.ReactNative"
  );

  // Also handle require() calls
  code = code.replace(
    /require\s*\(\s*['"]react['"]\s*\)/g,
    "global.React"
  );

  code = code.replace(
    /require\s*\(\s*['"]react-native['"]\s*\)/g,
    "global.ReactNative"
  );

  return {
    ...result,
    code,
  };
};
