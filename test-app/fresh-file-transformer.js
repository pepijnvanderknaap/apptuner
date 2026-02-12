/**
 * Custom Metro transformer that bypasses Metro's cache
 * by reading files DIRECTLY from disk using fs.readFileSync
 */

const fs = require('fs');
const upstreamTransformer = require('@react-native/metro-babel-transformer');

module.exports.transform = async function({ src, filename, options }) {
  // CRITICAL: Ignore Metro's "src" parameter (which may be cached)
  // Read the ACTUAL file from disk RIGHT NOW
  let freshSrc;
  try {
    freshSrc = fs.readFileSync(filename, 'utf8');

    // Log when we detect a mismatch between Metro's cache and disk
    if (freshSrc !== src) {
      console.log(`[FreshTransformer] 🔥 CACHE MISMATCH detected in ${filename}`);
      console.log(`[FreshTransformer] Metro cached: ${src.substring(0, 100)}...`);
      console.log(`[FreshTransformer] Disk actual: ${freshSrc.substring(0, 100)}...`);
    }
  } catch (error) {
    // If we can't read from disk, fall back to Metro's cached version
    console.error(`[FreshTransformer] Failed to read ${filename} from disk:`, error.message);
    freshSrc = src;
  }

  // Now transform the FRESH source from disk
  return upstreamTransformer.transform({
    src: freshSrc,
    filename,
    options,
  });
};
