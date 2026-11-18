#!/usr/bin/env node
/**
 * Generates textured 3D models for featured listings with the Meshy text-to-3D API.
 *
 *   node scripts/meshy-generate.mjs                    # every model in MODELS
 *   node scripts/meshy-generate.mjs gold-pistol carbine # just these
 *   MESHY_PREVIEW_ONLY=1 node scripts/meshy-generate.mjs compact-pistol   # mesh only
 *
 * The key is read from MESHY_API_KEY or ~/.config/meshy/api_key and is never printed.
 * Each model costs Meshy credits (one preview task and one refine task).
 * Raw output lands in apps/web/public/models/raw; run `pnpm models:optimize` afterwards.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public/models/raw');

/** Prompts describe original, generic objects. Never name a game, brand or real product. */
const MODELS = {
  hypercar:
    'A sleek low black hypercar with sharp aerodynamic lines, glossy black paint, carbon fibre details, dark tinted windows, photorealistic, unbranded original design, product shot',
  'apex-coupe':
    'A low wide mid-engine supercar coupe with a long tail and large rear diffuser, pearl white paint, black wheels, photorealistic, unbranded original design, product shot',
  'night-roadster':
    'An open-top two-seat sports roadster with a short windscreen, deep metallic teal paint, tan leather interior, photorealistic, unbranded original design, product shot',
  'muscle-widebody':
    'A widebody modern muscle car with a hood scoop and wide rear tyres, matte dark grey paint, photorealistic, unbranded original design, product shot',
  'compact-pistol':
    'A compact semi-automatic pistol, matte black polymer frame and steel slide, clean product render, isolated game prop, unbranded original design, photorealistic',
  'gold-pistol':
    'A semi-automatic pistol plated in polished gold with engraved floral scrollwork and pearl grips, luxury game prop, unbranded original design, photorealistic',
  carbine:
    'A short tactical carbine rifle with a folding stock, rail handguard and red dot sight, matte black, isolated game prop, unbranded original design, photorealistic',
  'sport-yacht':
    'A sleek modern sport yacht, white hull with dark tinted glass and teak deck, photorealistic, unbranded original design, product shot',
  helicopter:
    'An executive light helicopter, glossy black with tinted windows and skid landing gear, photorealistic, unbranded original design, product shot',
  'street-block':
    'A miniature diorama of a Miami cul-de-sac street block at dusk, five pastel art deco houses with flat roofs around a circular road, palm trees, parked cars, street lamps, on a thick square base, highly detailed architectural scale model, photorealistic',
};

/** Set MESHY_PREVIEW_ONLY=1 to stop after the untextured mesh, which costs far fewer credits. */
const PREVIEW_ONLY = process.env.MESHY_PREVIEW_ONLY === '1';
/** Optional model override, for example an older, cheaper generation. */
const AI_MODEL = process.env.MESHY_AI_MODEL;

function apiKey() {
  if (process.env.MESHY_API_KEY) return process.env.MESHY_API_KEY.trim();
  const file = join(homedir(), '.config/meshy/api_key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  throw new Error('Set MESHY_API_KEY or create ~/.config/meshy/api_key');
}

const headers = { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(url, init) {
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`Meshy ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function waitFor(taskId, label) {
  for (;;) {
    const task = await call(`${API}/${taskId}`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELED' || task.status === 'EXPIRED') {
      throw new Error(`${label} ${task.status}: ${JSON.stringify(task.task_error ?? {})}`);
    }
    console.log(`${label}: ${task.status} ${task.progress ?? 0}%`);
    await sleep(8000);
  }
}

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

async function generate(slug, prompt) {
  console.log(`[${slug}] preview`);
  const preview = await call(API, {
    method: 'POST',
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      should_remesh: true,
      topology: 'triangle',
      target_polycount: 60000,
      ...(AI_MODEL ? { ai_model: AI_MODEL } : {}),
    }),
  });
  const mesh = await waitFor(preview.result, `[${slug}] preview`);

  // Keep the untextured mesh straight away, so a failed refine never wastes the preview.
  await download(mesh.model_urls.glb, join(OUT, `${slug}.preview.glb`));
  console.log(`[${slug}] preview mesh saved`);
  if (PREVIEW_ONLY) return;

  console.log(`[${slug}] refine`);
  const refine = await call(API, {
    method: 'POST',
    body: JSON.stringify({ mode: 'refine', preview_task_id: preview.result, enable_pbr: true }),
  });
  const done = await waitFor(refine.result, `[${slug}] refine`);
  await download(done.model_urls.glb, join(OUT, `${slug}.glb`));
  console.log(`[${slug}] textured model saved`);
}

const wanted = process.argv.slice(2);
const jobs = Object.entries(MODELS).filter(
  ([slug]) => wanted.length === 0 || wanted.includes(slug),
);
// One at a time: a low balance then fails on the first model instead of half-starting all of them.
const results = [];
for (const [slug, prompt] of jobs) {
  results.push(
    await generate(slug, prompt).then(
      () => ({ status: 'fulfilled' }),
      (reason) => ({ status: 'rejected', reason }),
    ),
  );
}
results.forEach((result, index) => {
  if (result.status === 'rejected')
    console.error(`[${jobs[index][0]}] FAILED: ${result.reason.message}`);
});
process.exit(results.some((result) => result.status === 'rejected') ? 1 : 0);
