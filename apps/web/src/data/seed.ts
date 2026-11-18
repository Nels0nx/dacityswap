/**
 * Demo seed data.
 *
 * Everything in this file is fabricated for the investor demo. It is generated
 * from a fixed seed so the server and the browser agree byte for byte.
 */
import type {
  CategoryId,
  GameId,
  IndexPoint,
  Listing,
  MarketStats,
  ModelId,
  Seller,
  TradeTick,
} from '@/domain/types';
import { mulberry32, pick } from '@/lib/rng';

const random = mulberry32(0xdac17);

/** The moment the demo dataset pretends to be captured at. */
export const SEED_EPOCH = Date.parse('2026-11-17T09:00:00Z');

const SELLERS: readonly Seller[] = [
  { handle: 'sunset_broker', rating: 4.9, trades: 3_412, verified: true },
  { handle: 'palmtrader', rating: 4.8, trades: 1_987, verified: true },
  { handle: 'night.owl', rating: 4.9, trades: 5_230, verified: true },
  { handle: 'chromeking', rating: 4.7, trades: 846, verified: true },
  { handle: 'portside', rating: 4.6, trades: 412, verified: false },
  { handle: 'flamingo.fx', rating: 5.0, trades: 2_208, verified: true },
  { handle: 'gulfstream', rating: 4.8, trades: 1_304, verified: true },
  { handle: 'tropic.arb', rating: 4.5, trades: 268, verified: false },
  { handle: 'keysrunner', rating: 4.9, trades: 4_071, verified: true },
  { handle: 'neonwolf', rating: 4.7, trades: 932, verified: true },
];

interface Product {
  readonly category: CategoryId;
  readonly model: ModelId;
  readonly title: string;
  readonly detail: string;
  readonly priceEur: number;
  readonly game: GameId;
  readonly stats: readonly [number, number, number, number];
}

const product = (
  category: CategoryId,
  model: ModelId,
  title: string,
  detail: string,
  priceEur: number,
  game: GameId,
  stats: readonly [number, number, number, number],
): Product => ({ category, model, title, detail, priceEur, game, stats });

/** The catalogue. Every product is backed by a real 3D model. Order within a category is menu order. */
const PRODUCTS: readonly Product[] = [
  product(
    'vehicles',
    'supercar',
    'Supercar · V12',
    'Naturally aspirated, scissor doors, one owner',
    219,
    'gtao',
    [10, 10, 8, 8],
  ),
  product(
    'vehicles',
    'superbike',
    'Superbike · litre class',
    'Track fairing, quick-shifter, fresh tyres',
    89,
    'gtao',
    [9, 10, 7, 6],
  ),
  product(
    'vehicles',
    'hypercar',
    'Hypercar · Stage 3',
    'One of one. Fully tuned, insured, private hand-off',
    189,
    'gtao',
    [10, 9, 8, 8],
  ),
  product(
    'vehicles',
    'apex-coupe',
    'Apex coupe · pearl',
    'Widebody, long tail, track aero',
    159,
    'gtao',
    [9, 9, 9, 8],
  ),
  product(
    'vehicles',
    'concept-coupe',
    'Concept coupe · launch edition',
    'Mid-engine, carbon tub, numbered plate',
    129,
    'gtao',
    [9, 8, 8, 9],
  ),
  product(
    'vehicles',
    'hypercar-crimson',
    'Hypercar · crimson',
    'Stage 2 tune, candy paint',
    175,
    'fivem',
    [10, 8, 8, 8],
  ),
  product(
    'vehicles',
    'apex-coupe-teal',
    'Apex coupe · midnight teal',
    'Street tune, clean title',
    145,
    'fivem',
    [9, 8, 9, 8],
  ),
  product(
    'vehicles',
    'concept-coupe-pearl',
    'Concept coupe · pearl',
    'Touring pack, pearl coat',
    135,
    'gtao',
    [9, 8, 8, 9],
  ),
  product(
    'vehicles',
    'concept-coupe-graphite',
    'Concept coupe · graphite',
    'Stripped interior, slicks, roll cage',
    125,
    'fivem',
    [9, 9, 9, 9],
  ),
  product(
    'vehicles',
    'covered-car',
    'Barn find · covered classic',
    'Unrestored, sold as it stands, under its sheet',
    64,
    'fivem',
    [5, 4, 4, 5],
  ),

  product(
    'weapons',
    'service-pistol',
    'Service pistols · matched pair',
    'Two sidearms, spare magazines, one hand-off',
    14.9,
    'gtao',
    [5, 8, 4, 7],
  ),
  product(
    'weapons',
    'bolt-rifle',
    'Bolt-action rifle · 7.62',
    'Walnut stock, iron sights, sling',
    27.5,
    'gtao',
    [9, 3, 10, 9],
  ),
  product(
    'weapons',
    'katana',
    'Antique katana · ceremonial',
    'Lacquered scabbard, razor edge',
    38,
    'fivem',
    [8, 7, 2, 8],
  ),
  product(
    'weapons',
    'knife',
    'Combat knife · fixed blade',
    'Quiet, fast, fits every loadout',
    4.9,
    'gtao',
    [5, 9, 1, 7],
  ),
  product(
    'weapons',
    'machete',
    'Machete · field worn',
    'Carbon steel, wrapped grip',
    6.9,
    'gtao',
    [6, 7, 2, 6],
  ),
  product(
    'weapons',
    'hatchet',
    'Hatchet · camp',
    'Short handle, good for throwing',
    5.5,
    'fivem',
    [6, 6, 3, 5],
  ),
  product(
    'weapons',
    'baseball-bat',
    'Baseball bat · ash',
    'Regulation length, taped handle',
    3.9,
    'gtao',
    [4, 6, 2, 6],
  ),
  product(
    'weapons',
    'crowbar',
    'Crowbar · standard',
    'Forged steel. Opens most things',
    3.5,
    'fivem',
    [4, 5, 1, 5],
  ),
  product(
    'weapons',
    'sledgehammer',
    'Sledgehammer · heavy',
    'Hickory handle, 5 kg head',
    5.9,
    'gtao',
    [9, 2, 1, 4],
  ),
  product(
    'weapons',
    'stick-grenade',
    'Stick grenade · crate of five',
    'Throwable, timed fuse',
    9.5,
    'gtao',
    [10, 3, 5, 3],
  ),
  product(
    'weapons',
    'cyber-blade',
    'Cyber blade · legendary',
    'Energy edge, engraved guard',
    42.5,
    'fivem',
    [9, 8, 2, 8],
  ),
  product(
    'weapons',
    'cannon',
    'Field cannon · antique',
    'Yard ornament that still fires',
    74,
    'fivem',
    [10, 1, 7, 2],
  ),

  product(
    'heist',
    'drill',
    'Vault drill · heavy duty',
    'Carbide bits, two batteries',
    16.9,
    'gtao',
    [10, 2, 6, 8],
  ),
  product(
    'heist',
    'bolt-cutters',
    'Bolt cutters · 36 inch',
    'Through any padlock in one bite',
    7.5,
    'gtao',
    [8, 7, 8, 9],
  ),
  product(
    'heist',
    'laptop',
    'Hacking laptop · preloaded',
    'Bypass kit and keypad cracker installed',
    34,
    'gtao',
    [9, 9, 5, 4],
  ),
  product(
    'heist',
    'circuit-board',
    'Bypass board · keypad',
    'Single use, plugs into most panels',
    8.9,
    'fivem',
    [7, 10, 9, 2],
  ),
  product(
    'heist',
    'security-camera',
    'Camera loop kit',
    'Feeds a loop to one camera for ten minutes',
    11.5,
    'gtao',
    [8, 9, 6, 5],
  ),
  product(
    'heist',
    'radio-scanner',
    'Police scanner · vintage',
    'Hear the response before it arrives',
    13.9,
    'fivem',
    [8, 8, 4, 6],
  ),
  product(
    'heist',
    'binoculars',
    'Binoculars · scouting',
    'Mark guards and cameras from range',
    4.5,
    'gtao',
    [6, 9, 3, 8],
  ),
  product(
    'heist',
    'ammo-box',
    'Ammo box · mixed',
    'Refills every weapon you carry, once',
    6.9,
    'gtao',
    [9, 3, 7, 9],
  ),
  product(
    'heist',
    'propane-tank',
    'Propane tank · full',
    'A loud way through a wall',
    5.2,
    'fivem',
    [8, 1, 4, 6],
  ),
  product(
    'heist',
    'gas-mask',
    'Gas mask · vintage',
    'For the vault, and for the photos',
    8.9,
    'gtao',
    [7, 6, 5, 7],
  ),

  product(
    'cash',
    'cash-stack',
    '100M in-game cash',
    'The largest standard pack, single hand-off',
    289,
    'gtao',
    [8, 9, 7, 10],
  ),
  product(
    'cash',
    'cash-bag',
    'Duffel drop · 50M',
    'One bag, one hand-off, verified seller',
    199,
    'gtao',
    [7, 9, 8, 10],
  ),
  product(
    'cash',
    'suitcase',
    'Briefcase drop · 20M',
    'Two cases, hand-off in a private session',
    66,
    'gtao',
    [4, 8, 9, 9],
  ),
  product(
    'cash',
    'treasure-chest',
    'Vault stash · 250M',
    'Split across three hand-offs',
    649,
    'fivem',
    [10, 6, 4, 9],
  ),
  product(
    'cash',
    'cash-register',
    'Till money · 1M',
    'Starter pack, delivered in minutes',
    3.9,
    'gtao',
    [1, 9, 10, 8],
  ),

  product(
    'gear',
    'chronograph',
    'Chronograph · steel',
    'Wearable, tradeable between characters',
    24.9,
    'gtao',
    [9, 7, 9, 8],
  ),
  product(
    'gear',
    'sunglasses',
    'Aviator shades',
    'Wearable accessory, all characters',
    6.5,
    'gtao',
    [8, 4, 9, 7],
  ),
  product(
    'gear',
    'sneaker',
    'Runner · limited colourway',
    'Three colourways included',
    12.9,
    'fivem',
    [7, 8, 10, 7],
  ),
  product(
    'gear',
    'medkit',
    'Med kit · full',
    'Restores full health, five uses',
    4.2,
    'gtao',
    [3, 3, 10, 9],
  ),
  product(
    'gear',
    'lighter',
    'Lighter · brushed steel',
    'Pocket item, engraved lid',
    2.9,
    'fivem',
    [8, 6, 8, 4],
  ),
  product(
    'gear',
    'cigarettes',
    'Cigarettes · soft pack',
    'Pocket item for roleplay',
    1.5,
    'fivem',
    [5, 2, 9, 5],
  ),

  product(
    'collectibles',
    'boombox',
    'Boombox · 1989',
    'Apartment prop with working radio',
    9.9,
    'gtao',
    [6, 8, 7, 6],
  ),
  product(
    'collectibles',
    'cassette-player',
    'Cassette player · portable',
    'Plays every station you have found',
    7.5,
    'gtao',
    [7, 7, 8, 6],
  ),
  product(
    'collectibles',
    'game-console',
    'Game console · sealed',
    'Apartment prop, never opened',
    11.9,
    'gtao',
    [7, 10, 6, 7],
  ),
  product(
    'collectibles',
    'gamepad',
    'Gamepad · player two',
    'Pairs with any console prop',
    3.5,
    'fivem',
    [3, 8, 6, 3],
  ),
  product(
    'collectibles',
    'spray-cans',
    'Spray cans · full set',
    'Twelve colours for crew tags',
    4.5,
    'fivem',
    [3, 8, 7, 3],
  ),
  product(
    'collectibles',
    'payphone',
    'Payphone · street',
    'Yard prop. It rings sometimes',
    18.5,
    'gtao',
    [9, 6, 8, 8],
  ),
  product(
    'collectibles',
    'fire-hydrant',
    'Fire hydrant · red',
    'Garage prop, liberated from a kerb',
    6.9,
    'gtao',
    [6, 7, 5, 5],
  ),
  product(
    'collectibles',
    'megaphone',
    'Megaphone · crowd control',
    'Works, loudly',
    5.9,
    'fivem',
    [5, 7, 6, 4],
  ),
  product(
    'collectibles',
    'shark-statue',
    'Bronze shark · trophy',
    'Desk ornament, limited run of 500',
    21,
    'gtao',
    [9, 9, 5, 8],
  ),
  product(
    'collectibles',
    'gnome',
    'Garden gnome · lucky',
    'Hidden somewhere on the map, now yours',
    13,
    'gtao',
    [10, 8, 9, 9],
  ),
  product(
    'collectibles',
    'gator-figure',
    'Gator · action figure',
    'Hawaiian shirt, shades, display base',
    16.5,
    'gtao',
    [9, 10, 9, 8],
  ),
  product(
    'collectibles',
    'gorilla-figure',
    'Gold gorilla · action figure',
    'Tracksuit edition, numbered base',
    24,
    'fivem',
    [10, 10, 9, 9],
  ),
  product(
    'collectibles',
    'jerrycan',
    'Jerrycan · collector’s',
    'Garage prop, original paint',
    3.2,
    'fivem',
    [4, 6, 4, 3],
  ),
];

function buildListings(): Listing[] {
  return PRODUCTS.map((item, index) => ({
    id: `lst_${(index + 1).toString().padStart(3, '0')}`,
    game: item.game,
    category: item.category,
    model: item.model,
    stats: item.stats,
    title: item.title,
    detail: item.detail,
    unitPriceMinor: Math.round(item.priceEur * 100),
    currency: 'EUR',
    seller: SELLERS[(index * 3 + 5) % SELLERS.length]!,
    deliveryMinutes: pick(random, [5, 8, 10, 12, 15, 20, 30]),
    stock: index === 0 ? 1 : 2 + Math.floor(random() * 18),
    createdAt: new Date(SEED_EPOCH - Math.floor(random() * 36 * 3_600_000)).toISOString(),
  }));
}

function buildIndexSeries(): IndexPoint[] {
  const points: IndexPoint[] = [];
  let price = 362;
  for (let hoursAgo = 47; hoursAgo >= 0; hoursAgo--) {
    price += (random() - 0.44) * 9;
    price = Math.min(420, Math.max(340, price));
    points.push({ hoursAgo, priceMinor: Math.round(price) });
  }
  return points;
}

function buildTicker(listings: readonly Listing[]): TradeTick[] {
  const rails = ['Visa', 'USDC · Base', 'Mastercard', 'ETH', 'USDC · Base', 'SOL', 'BTC'];
  return Array.from({ length: 16 }, (_, index) => {
    const source = pick(random, listings);
    return {
      id: `tick_${index}`,
      handle: pick(random, SELLERS).handle,
      title: source.title,
      priceMinor: source.unitPriceMinor,
      rail: pick(random, rails),
    };
  });
}

export const seedListings: readonly Listing[] = buildListings();
export const seedIndexSeries: readonly IndexPoint[] = buildIndexSeries();
export const seedTicker: readonly TradeTick[] = buildTicker(seedListings);
export const seedStats: MarketStats = {
  volume24hMinor: 128_430_000,
  openEscrows: 4_812,
  medianDeliveryMinutes: 11,
  disputeRatePct: 0.4,
};
