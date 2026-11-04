const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaults = config.resolver.blockList;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const generatedDirectory = directory => {
  const pattern = path.resolve(__dirname, directory).split(path.sep).map(escape).join('[/\\\\]');
  return new RegExp(`^${pattern}(?:[/\\\\]|$)`);
};

// QA profiles, exported previews and compiled tests are not app modules. Watching
// these outputs also invalidates the development SSR registry while it is running.
config.resolver.blockList = [
  ...(Array.isArray(defaults) ? defaults : defaults ? [defaults] : []),
  ...['.expo/validation', '.expo/tests', '.expo/preview'].map(generatedDirectory),
];

module.exports = config;
