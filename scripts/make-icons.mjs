#!/usr/bin/env node
/**
 * Builds every icon the browser asks for from one source, apps/web/brand/logo-mark.svg:
 *
 *   app/favicon.ico      16, 32 and 48 px, for browsers that ignore SVG and PNG icons
 *   app/icon.png         512 px, the standard icon
 *   app/apple-icon.png   180 px on a solid tile, for iOS home screens
 *
 *   node scripts/make-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'apps/web/src/app');
const source = readFileSync(join(ROOT, 'apps/web/brand/logo-mark.svg'));

const png = (size) => sharp(source, { density: 600 }).resize(size, size).png().toBuffer();

/** An .ico file is a small directory followed by the images; PNG data is allowed as-is. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const sizes = [16, 32, 48];
writeFileSync(
  join(APP, 'favicon.ico'),
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(size) })))),
);
writeFileSync(join(APP, 'icon.png'), await png(512));

// iOS draws its own rounded mask and shows transparency as black, so give it a solid tile.
const mark = await sharp(source, { density: 600 }).resize(148, 148).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: '#050608' } })
  .composite([{ input: mark, gravity: 'centre' }])
  .png()
  .toFile(join(APP, 'apple-icon.png'));

console.log('icons written: favicon.ico, icon.png, apple-icon.png');
