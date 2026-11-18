#!/usr/bin/env node
/**
 * Downloads the untextured preview meshes of the most recent Meshy text-to-3D tasks.
 * Useful when a refine (texturing) task could not run, for example when credits ran out.
 *
 *   node scripts/meshy-fetch-previews.mjs hypercar:hypercar street-block:cul-de-sac
 *
 * Each argument is <output-slug>:<text that the task's prompt contains>.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public/models');
const keyFile = join(homedir(), '.config/meshy/api_key');
const key = (
  process.env.MESHY_API_KEY ?? (existsSync(keyFile) ? readFileSync(keyFile, 'utf8') : '')
).trim();
if (!key) throw new Error('Set MESHY_API_KEY or create ~/.config/meshy/api_key');

const response = await fetch(`${API}?page_size=20&sort_by=-created_at`, {
  headers: { Authorization: `Bearer ${key}` },
});
if (!response.ok)
  throw new Error(`Meshy ${response.status}: ${(await response.text()).slice(0, 200)}`);
const tasks = await response.json();

mkdirSync(OUT, { recursive: true });
for (const argument of process.argv.slice(2)) {
  const [slug, needle] = argument.split(':');
  const task = tasks.find(
    (candidate) =>
      candidate.status === 'SUCCEEDED' &&
      candidate.model_urls?.glb &&
      (candidate.prompt ?? '').toLowerCase().includes(needle.toLowerCase()),
  );
  if (!task) {
    console.error(`[${slug}] no finished task whose prompt contains "${needle}"`);
    continue;
  }
  const glb = await fetch(task.model_urls.glb);
  const bytes = Buffer.from(await glb.arrayBuffer());
  writeFileSync(join(OUT, `${slug}.glb`), bytes);
  console.log(`[${slug}] ${task.mode ?? 'task'} mesh saved, ${(bytes.length / 1e6).toFixed(1)} MB`);
}
