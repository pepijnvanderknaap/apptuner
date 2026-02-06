/**
 * Custom Metro Asset Plugin for AppTuner
 * Inlines small assets as base64 data URIs for offline bundling
 *
 * Metro expects a function that takes assetData and returns modified assetData
 */

const fs = require('fs');
const path = require('path');

const MAX_INLINE_SIZE = 10 * 1024; // 10KB - inline assets smaller than this

/**
 * Transform asset to include base64 data for small files
 */
module.exports = function assetPlugin(assetData) {
  const { files } = assetData;

  if (!files || files.length === 0) {
    return assetData;
  }

  // Get the first file (typically there's only one for each asset)
  const assetFile = files[0];
  const filePath = path.resolve(assetFile);

  try {
    const stats = fs.statSync(filePath);

    // Only inline small assets
    if (stats.size <= MAX_INLINE_SIZE) {
      const fileData = fs.readFileSync(filePath);
      const base64 = fileData.toString('base64');
      const mimeType = getMimeType(assetData.type);

      // Add base64 data URI to asset metadata
      assetData.uri = `data:${mimeType};base64,${base64}`;

      console.log(`[Asset Plugin] Inlined ${assetData.name}.${assetData.type} (${stats.size} bytes)`);
    } else {
      console.log(`[Asset Plugin] Asset too large to inline: ${assetData.name}.${assetData.type} (${stats.size} bytes)`);
    }
  } catch (error) {
    console.error(`[Asset Plugin] Failed to inline asset ${assetData.name}:`, error.message);
  }

  return assetData;
};

function getMimeType(extension) {
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
