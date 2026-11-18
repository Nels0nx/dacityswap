#!/usr/bin/env node
/**
 * Builds the DacitySwap Telegram packs from the same 3D models the site uses:
 * one video-sticker pack and one custom-emoji pack, with the coin in several finishes
 * and every product in the catalogue on a turntable.
 *
 *   pnpm dev                                        # the app must be running
 *   node scripts/telegram-pack.mjs                  # render and encode into out/telegram
 *   TELEGRAM_OWNER_ID=<user id> node scripts/telegram-pack.mjs --publish
 *
 * --publish creates both packs through your bot, or continues them if they already exist, and
 * posts their links to your channel. Add --fresh to delete the packs and start again.
 * The bot token and the channel id are read from ~/.config/telegram and are never printed
 * or stored in this repository.
 *
 * Telegram limits: VP9 WEBM with alpha, no audio, at most 3 s and 30 fps;
 * sticker 512 px and 256 KB; custom emoji exactly 100x100 and 64 KB.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out/telegram');
const BASE = process.env.RENDER_BASE_URL ?? 'http://localhost:3000';
const FRAMES = 60;
const FPS = 20;

const EMOJI = {
  hypercar: '🏎',
  'concept-coupe': '🚗',
  'covered-car': '🚙',
  'service-pistol': '🔫',
  'bolt-rifle': '🎯',
  katana: '⚔️',
  machete: '🔪',
  knife: '🗡',
  hatchet: '🪓',
  'baseball-bat': '⚾',
  crowbar: '🔧',
  sledgehammer: '🔨',
  'stick-grenade': '💣',
  'cyber-blade': '⚡',
  cannon: '💥',
  drill: '🛠',
  'bolt-cutters': '✂️',
  laptop: '💻',
  'circuit-board': '🔌',
  'security-camera': '📹',
  'radio-scanner': '📡',
  binoculars: '🔭',
  'ammo-box': '📦',
  'propane-tank': '🔥',
  'cash-stack': '💵',
  suitcase: '💼',
  'treasure-chest': '💰',
  'cash-register': '🧾',
  chronograph: '⌚',
  sunglasses: '🕶',
  sneaker: '👟',
  'gas-mask': '😷',
  medkit: '🩹',
  lighter: '🚬',
  cigarettes: '🚬',
  boombox: '📻',
  'cassette-player': '📼',
  'game-console': '🎮',
  gamepad: '🕹',
  'spray-cans': '🎨',
  'shark-statue': '🦈',
  jerrycan: '⛽',
  payphone: '☎️',
  megaphone: '📣',
  'fire-hydrant': '🚒',
  gnome: '🍀',
  supercar: '🏎',
  superbike: '🏍',
  'cash-bag': '👜',
  'gator-figure': '🐊',
  'gorilla-figure': '🦍',
  'hypercar-crimson': '🚘',
  'apex-coupe': '🏁',
  'apex-coupe-teal': '🚙',
  'concept-coupe-pearl': '🚗',
  'concept-coupe-graphite': '🚗',
};

function modelIds() {
  const source = readFileSync(join(ROOT, 'apps/web/src/domain/models.ts'), 'utf8');
  return [...source.matchAll(/^  '?([a-z0-9-]+)'?: (?:model|car)\(/gm)].map((match) => match[1]);
}

/** Every sticker in the pack, coin first. `pose(t)` returns turns about the vertical and horizontal axes. */
function items() {
  const spin = (t) => [t * 0.5, 0]; // both faces match, so half a turn loops
  const flip = (t) => [0.04, t * 0.5];
  const coins = [
    { id: 'coin', query: 'asset=coin', emoji: '🪙', pose: spin },
    { id: 'coin-flip', query: 'asset=coin', emoji: '🪙', pose: flip },
    { id: 'coin-black-gold', query: 'asset=coin&finish=black-gold', emoji: '🤑', pose: spin },
    { id: 'coin-gold', query: 'asset=coin&finish=gold', emoji: '🏆', pose: spin },
    { id: 'coin-gold-flip', query: 'asset=coin&finish=gold', emoji: '💸', pose: flip },
  ];
  const products = modelIds().map((id) => ({
    id,
    query: `asset=${id}&fit=spin`,
    emoji: EMOJI[id] ?? '🎮',
    pose: (t) => [t, 0],
  }));
  return [...coins, ...products];
}

const paths = (id) => ({
  frames: join(OUT, 'frames', id),
  sticker: join(OUT, 'stickers', `${id}.webm`),
  emoji: join(OUT, 'emoji', `${id}.webm`),
});

function encode(frames, output, limitBytes, filter) {
  // Raise the quantiser until the file fits Telegram's limit.
  for (let crf = 30; crf <= 62; crf += 4) {
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      String(FPS),
      '-i',
      join(frames, 'f_%03d.png'),
      ...(filter ? ['-vf', filter] : []),
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuva420p',
      '-crf',
      String(crf),
      '-b:v',
      '0',
      '-row-mt',
      '1',
      '-an',
      '-t',
      '3',
      output,
    ]);
    if (statSync(output).size <= limitBytes) return crf;
  }
  throw new Error(`Could not fit ${output} under ${limitBytes} bytes`);
}

async function render() {
  for (const dir of ['frames', 'stickers', 'emoji', 'tiles'])
    mkdirSync(join(OUT, dir), { recursive: true });
  // --only=a,b renders just those items and leaves the rest of the pack as it is.
  const only = process.argv
    .find((argument) => argument.startsWith('--only='))
    ?.slice(7)
    .split(',');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
  });
  const page = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1,
  });
  for (const item of items()) {
    if (only && !only.includes(item.id)) continue;
    const file = paths(item.id);
    rmSync(file.frames, { recursive: true, force: true });
    mkdirSync(file.frames, { recursive: true });

    await page.goto(`${BASE}/render?${item.query}`, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.waitForFunction(() => window.__renderReady === true, null, { timeout: 120_000 });
    await page.waitForTimeout(250);

    for (let index = 0; index < FRAMES; index++) {
      const [turn, flip] = item.pose(index / FRAMES);
      await page.evaluate(([a, b]) => window.__setPose?.(a, b), [turn, flip]);
      await page.waitForTimeout(40);
      await page.locator('canvas').screenshot({
        path: join(file.frames, `f_${String(index).padStart(3, '0')}.png`),
        omitBackground: true,
      });
    }

    encode(file.frames, file.sticker, 256 * 1024);
    // Scale in premultiplied alpha, or the edges pick up a dark fringe.
    encode(
      file.frames,
      file.emoji,
      64 * 1024,
      'premultiply=inplace=1,scale=100:100:flags=lanczos,unpremultiply=inplace=1',
    );
    await sharp(join(file.frames, 'f_004.png'))
      .resize(160, 160)
      .png()
      .toFile(join(OUT, 'tiles', `${item.id}.png`));
    rmSync(file.frames, { recursive: true, force: true });
    console.log(
      `${item.id}: sticker ${(statSync(file.sticker).size / 1024).toFixed(0)} KB, emoji ${(statSync(file.emoji).size / 1024).toFixed(0)} KB`,
    );
  }
  await browser.close();

  // A contact sheet of the whole pack, for the channel post. Items rendered by an older run
  // have no tile on disk; take theirs from the first frame of the finished sticker.
  const tiles = [];
  for (const item of items()) {
    const tile = join(OUT, 'tiles', `${item.id}.png`);
    if (!existsSync(tile) && existsSync(paths(item.id).sticker)) {
      execFileSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-c:v',
        'libvpx-vp9',
        '-i',
        paths(item.id).sticker,
        '-frames:v',
        '1',
        '-vf',
        'scale=160:160',
        tile,
      ]);
    }
    if (existsSync(tile)) tiles.push(readFileSync(tile));
  }
  const columns = 9;
  const rows = Math.ceil(tiles.length / columns);
  await sharp({
    create: {
      width: columns * 168 + 8,
      height: rows * 168 + 8,
      channels: 4,
      background: '#0b0c0f',
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: 8 + (index % columns) * 168,
        top: 8 + Math.floor(index / columns) * 168,
      })),
    )
    .png()
    .toFile(join(OUT, 'pack-preview.png'));
  writeFileSync(
    join(OUT, 'manifest.json'),
    JSON.stringify(
      items().map(({ id, emoji }) => ({ id, emoji })),
      null,
      2,
    ),
  );
}

async function publish() {
  const config = (name) => readFileSync(join(homedir(), '.config/telegram', name), 'utf8').trim();
  const token = config('bot_token');
  const channel = config('chat_channel');
  const owner = process.env.TELEGRAM_OWNER_ID;
  if (!owner)
    throw new Error('Set TELEGRAM_OWNER_ID to the Telegram user id that should own the packs.');

  const api = async (method, fields = {}, files = {}) => {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    for (const [key, path] of Object.entries(files)) {
      form.append(key, new Blob([readFileSync(path)]), path.split('/').pop());
    }
    // A call with no parameters must be a plain GET: an empty multipart body is rejected.
    const empty = Object.keys(fields).length + Object.keys(files).length === 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, empty ? undefined : { method: 'POST', body: form });
      let body;
      try {
        body = JSON.parse(await response.text());
      } catch {
        body = { ok: false, description: `HTTP ${response.status}, non-JSON response` };
      }
      // Telegram asks for a pause when stickers are added too quickly.
      const wait = body.parameters?.retry_after;
      if (!body.ok && wait) await new Promise((resolve) => setTimeout(resolve, (wait + 1) * 1000));
      else return body;
    }
    return { ok: false, description: 'still rate-limited after four attempts' };
  };

  const me = await api('getMe');
  if (!me.ok) throw new Error(`getMe failed: ${me.description}`);
  const bot = me.result.username;
  const all = items();
  const links = [];

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fresh = process.argv.includes('--fresh');
  // Which items each pack already holds. Kept on disk so later runs only add what is new.
  const ledger = join(OUT, 'published.json');
  const published = existsSync(ledger) ? JSON.parse(readFileSync(ledger, 'utf8')) : {};

  for (const [name, title, type, kind] of [
    [`dacity_coin_by_${bot}`, 'DacitySwap', 'regular', 'sticker'],
    [`dacity_coin_emoji_by_${bot}`, 'DacitySwap Emoji', 'custom_emoji', 'emoji'],
  ]) {
    const entry = (item) =>
      JSON.stringify({ sticker: 'attach://file', format: 'video', emoji_list: [item.emoji] });

    // Add only what the pack does not hold yet, so a run that was cut short, or a catalogue
    // that has grown, can simply be published again. Pass --fresh to delete it and start over.
    let existing = await api('getStickerSet', { name });
    if (existing.ok && fresh) {
      await api('deleteStickerSet', { name });
      await pause(5000);
      existing = { ok: false };
    }
    if (!existing.ok) published[name] = [];
    const held = new Set(published[name] ?? []);
    const record = (id) => {
      held.add(id);
      published[name] = [...held];
      writeFileSync(ledger, JSON.stringify(published, null, 2));
    };

    if (!existing.ok) {
      const first = all[0];
      const created = await api(
        'createNewStickerSet',
        { user_id: owner, name, title, sticker_type: type, stickers: `[${entry(first)}]` },
        { file: paths(first.id)[kind] },
      );
      if (!created.ok) {
        console.log(`pack failed (${name}): ${created.description}`);
        continue;
      }
      record(first.id);
      await pause(3000);
    }

    for (const item of all.filter((candidate) => !held.has(candidate.id))) {
      // A pack that has just changed is briefly reported as invalid; wait and try again.
      let result;
      for (let attempt = 0; attempt < 6; attempt++) {
        result = await api(
          'addStickerToSet',
          { user_id: owner, name, sticker: entry(item) },
          { file: paths(item.id)[kind] },
        );
        if (result.ok || !/STICKERSET_INVALID/.test(result.description ?? '')) break;
        await pause(4000);
      }
      if (result.ok) record(item.id);
      else console.log(`  could not add ${item.id}: ${result.description}`);
      await pause(900);
    }
    const have = held.size;
    const link = `https://t.me/add${type === 'regular' ? 'stickers' : 'emoji'}/${name}`;
    links.push(link);
    console.log(`pack ready: ${link} (${have} of ${all.length})`);
  }

  if (links.length > 0) {
    const caption = `DacitySwap packs\nStickers: ${links[0]}${links[1] ? `\nEmoji: ${links[1]}` : ''}`;
    const sent = await api(
      'sendPhoto',
      { chat_id: channel, caption },
      { photo: join(OUT, 'pack-preview.png') },
    );
    console.log(
      sent.ok
        ? 'posted the preview and links to the channel'
        : `channel post failed: ${sent.description}`,
    );
  }
}

if (process.argv.includes('--publish')) {
  if (!existsSync(join(OUT, 'manifest.json')))
    throw new Error('Nothing to publish. Run without --publish first.');
  await publish();
} else {
  await render();
}
