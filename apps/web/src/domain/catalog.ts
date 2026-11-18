import type { Category, CategoryId, Game, GameId } from './types';

export const GAMES: readonly Game[] = [
  { id: 'gtao', name: 'GTA Online', status: 'live' },
  { id: 'fivem', name: 'FiveM RP', status: 'live' },
  { id: 'gta6', name: 'GTA VI', status: 'waitlist' },
];

export const CATEGORIES: readonly Category[] = [
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'heist', label: 'Heist' },
  { id: 'cash', label: 'Cash' },
  { id: 'gear', label: 'Gear' },
  { id: 'collectibles', label: 'Collectibles' },
];

const gamesById = new Map(GAMES.map((game) => [game.id, game]));
const categoriesById = new Map(CATEGORIES.map((category) => [category.id, category]));

export function gameName(id: GameId): string {
  return gamesById.get(id)?.name ?? id;
}

/** What the four ratings on a product mean, per category. */
export const STAT_LABELS: Readonly<Record<CategoryId, readonly [string, string, string, string]>> =
  {
    vehicles: ['Top speed', 'Acceleration', 'Braking', 'Traction'],
    weapons: ['Damage', 'Speed', 'Range', 'Accuracy'],
    heist: ['Utility', 'Stealth', 'Speed', 'Durability'],
    cash: ['Pack size', 'Demand', 'Delivery', 'Seller trust'],
    gear: ['Style', 'Rarity', 'Condition', 'Demand'],
    collectibles: ['Rarity', 'Condition', 'Demand', 'Resale'],
  };

export function categoryLabel(id: CategoryId): string {
  return categoriesById.get(id)?.label ?? id;
}
