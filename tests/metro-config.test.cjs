const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const config = require('../metro.config.js');
const root = path.resolve(__dirname, '..');
const patterns = config.resolver.blockList;
const blocked = file => patterns.some(pattern => pattern.test(file));

test('Metro excludes generated QA profiles, test builds and preview directories with either path separator', () => {
  for (const directory of ['.expo/validation', '.expo/tests', '.expo/preview']) {
    for (const file of [path.join(root, directory), path.join(root, directory, 'nested', 'module.js')]) {
      assert.equal(blocked(file), true, file);
      assert.equal(blocked(file.split(path.sep).join('/')), true, file);
    }
  }
});

test('application routes, native modules, assets and Expo runtime entries remain in the module graph', () => {
  for (const file of ['src/app/_layout.tsx', 'src/app/app-blocking.tsx', 'src/features/study/study-screen.tsx', 'node_modules/expo-router/entry.js', 'modules/study-blocking/index.ts', 'assets/images/icon.png', '.expo/.virtual-metro-entry.js', '.expo/static/render.js']) {
    assert.equal(blocked(path.join(root, file)), false, file);
  }
});

test('Metro exclusions respect directory/project boundaries and keep compatible default patterns', () => {
  for (const file of ['.expo/validation-source/entry.js', '.expo/tests-source/entry.js', '.expo/preview-source/entry.js', 'src/.expo/validation/entry.js']) assert.equal(blocked(path.join(root, file)), false, file);
  assert.equal(blocked(path.join(path.dirname(root), 'another-app', '.expo/validation/entry.js')), false);
  assert.equal(blocked(path.join(root, '.expo/types')), true);
  assert.equal(new Set(patterns.map(pattern => pattern.flags)).size, 1, 'Metro combines blockList patterns and requires matching flags');
});
