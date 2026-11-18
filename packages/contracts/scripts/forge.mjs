#!/usr/bin/env node
/**
 * Runs Foundry for this package, so `pnpm test` works the same for everyone.
 *
 *   node scripts/forge.mjs setup     # fetch forge-std at the pinned version
 *   node scripts/forge.mjs test      # any other argument list is passed to forge
 *   node scripts/forge.mjs abi       # write abi/DacityEscrow.json
 *
 * If Foundry is not installed it says how to get it and exits cleanly: the TypeScript packages
 * must stay testable without a Solidity toolchain. CI installs Foundry and runs the real thing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FORGE_STD = { url: 'https://github.com/foundry-rs/forge-std', tag: 'v1.9.7' };
const [command = 'test', ...rest] = process.argv.slice(2);

function findForge() {
  const local = join(homedir(), '.foundry', 'bin', 'forge');
  if (spawnSync('forge', ['--version'], { stdio: 'ignore' }).status === 0) return 'forge';
  return existsSync(local) ? local : null;
}

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit', ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

function setup() {
  if (existsSync(join(ROOT, 'lib/forge-std/src/Test.sol'))) return;
  mkdirSync(join(ROOT, 'lib'), { recursive: true });
  const args = ['clone', '--quiet', '--depth', '1', '--branch', FORGE_STD.tag];
  run('git', [...args, '-c', 'advice.detachedHead=false', FORGE_STD.url, 'lib/forge-std']);
}

if (command === 'setup') {
  setup();
  process.exit(0);
}

const forge = findForge();
if (!forge) {
  console.log(
    'Foundry is not installed, so the contract checks were skipped.\n' +
      'Install it from https://getfoundry.sh and run this again.',
  );
  process.exit(0);
}

setup();
if (command === 'abi') {
  const result = spawnSync(forge, ['inspect', 'DacityEscrow', 'abi', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  mkdirSync(join(ROOT, 'abi'), { recursive: true });
  const abi = JSON.stringify(JSON.parse(result.stdout), null, 2);
  writeFileSync(join(ROOT, 'abi/DacityEscrow.json'), `${abi}\n`);
  console.log('Wrote abi/DacityEscrow.json');
} else {
  run(forge, [command, ...rest]);
}
