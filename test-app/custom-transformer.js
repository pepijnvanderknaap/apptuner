const fs = require('fs');

module.exports.transform = function({ filename, options, src, plugins }) {
  // Force fresh file read - ignore src parameter completely
  const freshSrc = fs.readFileSync(filename, 'utf8');
  const basename = filename.split('/').pop();
  console.log(`[CustomTransformer] Fresh read ${basename}: ${freshSrc.length} bytes`);

  // Use default transformer with fresh source
  const upstreamTransformer = require('@react-native/metro-babel-transformer');
  return upstreamTransformer.transform({ filename, options, src: freshSrc, plugins });
};
