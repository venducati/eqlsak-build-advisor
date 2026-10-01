'use strict';

const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const kitsRoot = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
if (!process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH && existsSync(kitsRoot)) {
  const versions = readdirSync(kitsRoot).sort().reverse();
  const kit = versions.map(version => join(kitsRoot, version, 'x64')).find(folder => existsSync(join(folder, 'makeappx.exe')));
  if (kit) {
    process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH = kit;
    console.log(`Using the installed Microsoft Windows SDK packaging tools: ${kit}`);
  }
}

const result = spawnSync(process.execPath, [join(__dirname, 'node_modules', 'electron-builder', 'cli.js'), '--win', 'appx', '--x64', '--publish', 'never'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
