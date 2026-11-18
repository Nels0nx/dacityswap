#!/usr/bin/env node
/**
 * Renders the brand and social images: the ticker coin, the profile banner and the post art.
 *
 *   pnpm dev                                   # the app must be running
 *   node scripts/render-social.mjs             # every piece
 *   node scripts/render-social.mjs banner      # only the ones named
 *
 * Each piece is a scene on the app's /render/social page, captured in the installed Chrome at
 * twice its nominal size. Output goes to out/social. Transparent pieces are scaled back down,
 * which doubles as supersampling.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.RENDER_BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.SOCIAL_OUT ?? join(ROOT, 'out/social');
const SCALE = Number(process.env.SOCIAL_SCALE ?? 2);

/** Piece names and sizes come from the registry, so a new piece needs no change here. */
function pieces() {
  const source = readFileSync(join(ROOT, 'apps/web/src/components/social/pieces.ts'), 'utf8');
  const found = [];
  const pattern =
    /^  '?([a-z0-9-]+)'?: \{\s*width: ([\d_]+),\s*height: ([\d_]+),(\s*transparent: true,)?/gm;
  for (const [, id, width, height, transparent] of source.matchAll(pattern)) {
    found.push({ id, width: Number(width), height: Number(height), transparent: !!transparent });
  }
  return found;
}

const wanted = process.argv.slice(2);
const todo = pieces().filter((piece) => wanted.length === 0 || wanted.includes(piece.id));
if (todo.length === 0) {
  console.error(`No piece matches ${wanted.join(', ')}.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
});

for (const piece of todo) {
  const page = await browser.newPage({
    viewport: { width: piece.width, height: piece.height },
    deviceScaleFactor: SCALE,
  });
  page.on('pageerror', (error) => console.error(`[${piece.id}] ${error.message}`));
  await page.goto(`${BASE}/render/social?piece=${piece.id}`, { waitUntil: 'load' });
  // Development builds overlay a framework badge; keep it out of the capture.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForFunction(() => window.__renderReady === true, null, { timeout: 180_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const png = await page.locator('#frame').screenshot({ omitBackground: piece.transparent });
  await page.close();

  const file = join(OUT, `${piece.id}.png`);
  const image = sharp(png);
  if (piece.transparent) image.resize({ width: piece.width, kernel: 'lanczos3' });
  const info = await image.png({ compressionLevel: 9 }).toFile(file);
  console.log(`${piece.id}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} kB`);
}

await browser.close();
