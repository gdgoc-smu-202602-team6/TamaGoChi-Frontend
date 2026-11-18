#!/usr/bin/env node
// Publishes an EAS Update (OTA) to the channel of an eas.json build profile, with the same
// EXPO_PUBLIC_* values that profile's builds use. `eas update --environment` skips local .env
// files and only adds EAS server variables, so the build profile's `env` is injected here.
//
// Usage: npm run update:production -- "홈 화면 버튼 위치 수정"
//        npm run update:preview -- "테스트용 수정"
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [profileName, ...messageWords] = process.argv.slice(2);
const message = messageWords.join(' ').trim();

const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));
const profile = easConfig.build?.[profileName];

if (!profile?.channel) {
  const channels = Object.keys(easConfig.build ?? {}).filter((name) => easConfig.build[name].channel);
  console.error(`eas.json has no build profile "${profileName}" with a channel. Use one of: ${channels.join(', ')}`);
  process.exit(1);
}
if (!message) {
  console.error(`Add a message describing the change: npm run update:${profileName} -- "홈 화면 버튼 위치 수정"`);
  process.exit(1);
}

const easArgs = [
  'update',
  '--channel', profile.channel,
  '--environment', profile.environment ?? profileName,
  '--message', message,
];
const env = { ...process.env, ...profile.env };

// Run through npm's own CLI so arguments (spaces, Korean text, quotes) reach eas-cli intact on
// Windows, where spawning npx.cmd would need a shell that re-parses them.
const npmCli = process.env.npm_execpath;
let result;
if (npmCli && /npm-cli\.js$/.test(npmCli)) {
  result = spawnSync(process.execPath, [npmCli, 'exec', '--yes', '--', 'eas-cli@latest', ...easArgs], { stdio: 'inherit', env });
} else if (process.platform !== 'win32') {
  result = spawnSync('npx', ['--yes', 'eas-cli@latest', ...easArgs], { stdio: 'inherit', env });
} else {
  console.error(`Run this through npm: npm run update:${profileName} -- "message"`);
  process.exit(1);
}

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
