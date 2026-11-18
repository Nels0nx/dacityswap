import type { EscrowRecord, PaymentMethod } from '@dacityswap/escrow-core';

export type GameId = 'gtao' | 'fivem' | 'gta6';
export type CategoryId = 'vehicles' | 'weapons' | 'heist' | 'cash' | 'gear' | 'collectibles';

/** Key into the model registry in `domain/models.ts`. */
export type ModelId =
  | 'supercar'
  | 'superbike'
  | 'hypercar'
  | 'hypercar-crimson'
  | 'apex-coupe'
  | 'apex-coupe-teal'
  | 'concept-coupe'
  | 'concept-coupe-pearl'
  | 'concept-coupe-graphite'
  | 'covered-car'
  | 'service-pistol'
  | 'bolt-rifle'
  | 'katana'
  | 'machete'
  | 'baseball-bat'
  | 'crowbar'
  | 'sledgehammer'
  | 'stick-grenade'
  | 'cyber-blade'
  | 'knife'
  | 'hatchet'
  | 'cannon'
  | 'drill'
  | 'bolt-cutters'
  | 'laptop'
  | 'circuit-board'
  | 'security-camera'
  | 'radio-scanner'
  | 'binoculars'
  | 'ammo-box'
  | 'propane-tank'
  | 'cash-stack'
  | 'cash-bag'
  | 'suitcase'
  | 'treasure-chest'
  | 'cash-register'
  | 'chronograph'
  | 'sunglasses'
  | 'sneaker'
  | 'gas-mask'
  | 'medkit'
  | 'lighter'
  | 'cigarettes'
  | 'boombox'
  | 'game-console'
  | 'spray-cans'
  | 'shark-statue'
  | 'jerrycan'
  | 'payphone'
  | 'megaphone'
  | 'fire-hydrant'
  | 'cassette-player'
  | 'gamepad'
  | 'gnome'
  | 'gator-figure'
  | 'gorilla-figure';

export interface Game {
  readonly id: GameId;
  readonly name: string;
  readonly status: 'live' | 'waitlist';
}

export interface Category {
  readonly id: CategoryId;
  readonly label: string;
}

export interface Seller {
  readonly handle: string;
  /** 0–5, one decimal. */
  readonly rating: number;
  readonly trades: number;
  readonly verified: boolean;
}

export interface Listing {
  readonly id: string;
  readonly game: GameId;
  readonly category: CategoryId;
  /** The 3D model that represents this product on stage and in thumbnails. */
  readonly model: ModelId;
  /** Four ratings from 0 to 10; their labels come from the category. Sample data. */
  readonly stats: readonly [number, number, number, number];
  readonly title: string;
  readonly detail: string;
  readonly unitPriceMinor: number;
  readonly currency: 'EUR';
  readonly seller: Seller;
  readonly deliveryMinutes: number;
  readonly stock: number;
  /** ISO-8601 */
  readonly createdAt: string;
  /** Published from this browser during the demo. */
  readonly mine?: boolean;
}

export interface Order {
  readonly id: string;
  readonly listingId: string;
  readonly title: string;
  readonly game: GameId;
  readonly category: CategoryId;
  readonly model: ModelId;
  readonly sellerHandle: string;
  readonly method: PaymentMethod;
  /** Human-readable payment rail, e.g. "Visa ···· 4242" or "USDC · Base". */
  readonly rail: string;
  readonly paymentRef: string;
  readonly escrow: EscrowRecord;
}

export interface IndexPoint {
  /** Hours before "now"; 0 is the latest point. */
  readonly hoursAgo: number;
  /** Price of 1M in-game cash, in euro cents. */
  readonly priceMinor: number;
}

export interface TradeTick {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly priceMinor: number;
  readonly rail: string;
}

export interface MarketStats {
  readonly volume24hMinor: number;
  readonly openEscrows: number;
  readonly medianDeliveryMinutes: number;
  readonly disputeRatePct: number;
}

export type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'fastest' | 'rating';
export type PanelTab = 'buy' | 'swap' | 'sell' | 'orders';
