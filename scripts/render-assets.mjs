#!/usr/bin/env node
/**
 * Renders product thumbnails (and coin frames for stickers) from the real 3D models.
 *
 *   pnpm dev                                  # the app must be running
 *   node scripts/render-assets.mjs            # thumbnails for every model + the coin
 *   node scripts/render-assets.mjs frames coin 90 512 out/coin   # 90 turntable frames, 512 px
 *
 * It drives the app's own /render page in the installed Chrome, so a thumbnail is always
 * the same model, materials and lighting the buyer sees on stage.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.RENDER_BASE_URL ?? 'http://localhost:3000';
const [mode = 'thumbs', ...rest] = process.argv.slice(2);

/** Model ids come from the registry, so a new model is picked up without touching this file. */
export function modelIds() {
  const source = readFileSync(join(ROOT, 'apps/web/src/domain/models.ts'), 'utf8');
  return [...source.matchAll(/^  '?([a-z0-9-]+)'?: (?:model|car)\(/gm)].map((match) => match[1]);
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
});

async function open(asset, width, height, turn = 0) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/render?asset=${asset}&turn=${turn}`, { waitUntil: 'load' });
  // Development builds overlay a framework badge; keep it out of the capture.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForFunction(() => window.__renderReady === true, null, { timeout: 120_000 });
  await page.waitForTimeout(400);
  return page;
}

if (mode === 'thumbs') {
  const out = join(ROOT, 'apps/web/public/thumbs');
  mkdirSync(out, { recursive: true });
  for (const asset of [...modelIds(), 'coin']) {
    // The coin is shown face-on with a slight turn; products keep the angle from their spec.
    const page = await open(asset, asset === 'coin' ? 480 : 640, 480, asset === 'coin' ? 0.04 : 0);
    const png = await page.locator('canvas').screenshot({ omitBackground: true });
    await page.close();
    // WebP keeps the transparency at about a tenth of the PNG's size.
    await sharp(png)
      .resize({ height: 360 })
      .webp({ quality: 86, alphaQuality: 92 })
      .toFile(join(out, `${asset}.webp`));
    console.log(`thumb ${asset}`);
  }
} else if (mode === 'frames') {
  const [asset = 'coin', count = '90', size = '512', outDir = 'out/frames'] = rest;
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  const page = await open(asset, Number(size), Number(size));
  for (let index = 0; index < Number(count); index++) {
    // Both faces of the coin are identical, so half a turn loops seamlessly.
    await page.evaluate((turn) => window.__setPose?.(turn), (index / Number(count)) * 0.5);
    await page.waitForTimeout(60);
    await page.locator('canvas').screenshot({
      path: join(out, `f_${String(index).padStart(3, '0')}.png`),
      omitBackground: true,
    });
  }
  await page.close();
  console.log(`${count} frames of ${asset} in ${out}`);
} else {
  console.error(`Unknown mode "${mode}". Use "thumbs" or "frames".`);
  process.exitCode = 1;
}

await browser.close();
