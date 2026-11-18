import type { CategoryId, ModelId } from './types';

/**
 * The model registry: every 3D asset a product can be shown with.
 *
 * To add one, put a compressed .glb in `public/models`, add an entry here, run
 * `pnpm assets:render` to produce its thumbnail and list its source in CREDITS.md. Models must
 * be original or licensed for this use; never add assets from a game or a game publisher.
 */
export interface ModelSpec {
  readonly url: string;
  /** Longest side on stage, in scene units. */
  readonly size: number;
  /** `ground` parks the model on the street; `float` hovers it at eye level. */
  readonly placement: 'ground' | 'float';
  /** `own` keeps the file's materials; `studio-paint` repaints an untextured mesh. */
  readonly finish: 'own' | 'studio-paint';
  /**
   * Body colour. For `studio-paint` it colours the whole mesh; for `own` it recolours the
   * materials the file names "Paint 1 …", which is how one car becomes several colourways.
   */
  readonly paint?: string;
  /** Euler angles in radians that turn the model to its best side. */
  readonly rotation: readonly [number, number, number];
}

interface ModelOptions {
  rotation?: readonly [number, number, number];
  placement?: ModelSpec['placement'];
  finish?: ModelSpec['finish'];
  paint?: string;
}

const model = (file: string, size: number, options: ModelOptions = {}): ModelSpec => ({
  url: `/models/${file}.glb`,
  size,
  placement: options.placement ?? 'float',
  finish: options.finish ?? 'own',
  paint: options.paint,
  rotation: options.rotation ?? [0, 0, 0],
});

const car = (file: string, yaw: number, options: ModelOptions = {}): ModelSpec =>
  model(file, 3.9, { rotation: [0, yaw, 0], placement: 'ground', ...options });

export const MODELS: Readonly<Record<ModelId, ModelSpec>> = {
  // Vehicles stand on the street. Colourways reuse a file with a different paint.
  supercar: car('supercar', 0.6),
  superbike: model('superbike', 2.5, { rotation: [0, 0.6, 0], placement: 'ground' }),
  hypercar: car('hypercar', -0.6, { finish: 'studio-paint', paint: '#1a1d22' }),
  'hypercar-crimson': car('hypercar', -0.6, { finish: 'studio-paint', paint: '#7d0f1c' }),
  'apex-coupe': car('apex-coupe', 0.65, { finish: 'studio-paint', paint: '#d8d5cd' }),
  'apex-coupe-teal': car('apex-coupe', 0.65, { finish: 'studio-paint', paint: '#0c5a54' }),
  'concept-coupe': car('concept-coupe', 0.7),
  'concept-coupe-pearl': car('concept-coupe', 0.7, { paint: '#e4e0d6' }),
  'concept-coupe-graphite': car('concept-coupe', 0.7, { paint: '#26292e' }),
  'covered-car': car('covered-car', 0.6),

  // Weapons. Long ones are laid on a diagonal so they fill the frame.
  'service-pistol': model('service-pistol', 2.6),
  'bolt-rifle': model('bolt-rifle', 4.0, { rotation: [0, 0, 0.12] }),
  katana: model('katana', 3.4, { rotation: [0, 0, -1.05] }),
  machete: model('machete', 3.0, { rotation: [0, 0, -1.05] }),
  knife: model('knife', 2.6, { rotation: [0, 0, -0.9] }),
  hatchet: model('hatchet', 2.8, { rotation: [0, 0, -0.5] }),
  'baseball-bat': model('baseball-bat', 3.2, { rotation: [0, 0, -1.0] }),
  crowbar: model('crowbar', 3.0, { rotation: [0, 0, -1.0] }),
  sledgehammer: model('sledgehammer', 3.2, { rotation: [0, 0, -0.9] }),
  'stick-grenade': model('stick-grenade', 2.5, { rotation: [0, 0, -0.7] }),
  'cyber-blade': model('cyber-blade', 3.6, { rotation: [0, 0.3, 0] }),
  cannon: model('cannon', 3.6, { rotation: [0, 0.7, 0], placement: 'ground' }),

  // Heist kit.
  drill: model('drill', 2.6, { rotation: [0, 0.5, 0] }),
  'bolt-cutters': model('bolt-cutters', 3.0, { rotation: [0, 0, -0.9] }),
  laptop: model('laptop', 2.6, { rotation: [0, 0.5, 0] }),
  'circuit-board': model('circuit-board', 2.6, { rotation: [0.5, 0.4, 0] }),
  'security-camera': model('security-camera', 2.5, { rotation: [0, 0.6, 0] }),
  'radio-scanner': model('radio-scanner', 2.7, { rotation: [0, 0.5, 0] }),
  binoculars: model('binoculars', 2.4, { rotation: [0, 0.5, 0] }),
  'ammo-box': model('ammo-box', 2.5, { rotation: [0, 0.6, 0] }),
  'propane-tank': model('propane-tank', 2.6, { rotation: [0, 0.4, 0] }),

  // Cash.
  'cash-stack': model('cash-stack', 2.4, { rotation: [0, 0.5, 0] }),
  'cash-bag': model('cash-bag', 2.9, { rotation: [0, 0.5, 0] }),
  suitcase: model('suitcase', 2.8, { rotation: [0, 0.5, 0] }),
  'treasure-chest': model('treasure-chest', 2.7, { rotation: [0, 0.5, 0] }),
  'cash-register': model('cash-register', 2.5, { rotation: [0, 0.6, 0] }),

  // Gear.
  chronograph: model('chronograph', 2.3, { rotation: [0.2, 0.35, 0] }),
  sunglasses: model('sunglasses', 2.8, { rotation: [0, 0.45, 0] }),
  sneaker: model('sneaker', 2.8, { rotation: [0, -0.7, 0] }),
  'gas-mask': model('gas-mask', 2.4, { rotation: [0, 0.4, 0] }),
  medkit: model('medkit', 2.4, { rotation: [0, 0.5, 0] }),
  lighter: model('lighter', 2.2, { rotation: [0, 0.5, 0] }),
  cigarettes: model('cigarettes', 2.2, { rotation: [0, 0.5, 0] }),

  // Collectibles.
  boombox: model('boombox', 2.5, { rotation: [0, 2.7, 0] }),
  'cassette-player': model('cassette-player', 2.5, { rotation: [0, 0.5, 0] }),
  'game-console': model('game-console', 2.6, { rotation: [0, 0.5, 0] }),
  gamepad: model('gamepad', 2.5, { rotation: [0.4, 0.4, 0] }),
  'spray-cans': model('spray-cans', 2.4, { rotation: [0, 0.4, 0] }),
  'shark-statue': model('shark-statue', 2.8, { rotation: [0, 0.6, 0] }),
  jerrycan: model('jerrycan', 2.3, { rotation: [0, 0.6, 0] }),
  payphone: model('payphone', 2.8, { rotation: [0, 0.5, 0], placement: 'ground' }),
  megaphone: model('megaphone', 2.5, { rotation: [0, 0.7, 0] }),
  'fire-hydrant': model('fire-hydrant', 2.2, { rotation: [0, 0.5, 0], placement: 'ground' }),
  gnome: model('gnome', 2.3, { rotation: [0, 0.4, 0] }),
  'gator-figure': model('gator-figure', 3.1, { rotation: [0, 0.3, 0] }),
  'gorilla-figure': model('gorilla-figure', 3.1, { rotation: [0, 0.3, 0] }),
};

export const MODEL_IDS = Object.keys(MODELS) as ModelId[];

export const thumbnailOf = (id: ModelId) => `/thumbs/${id}.webp`;

/** The model a new listing gets when the seller has not supplied one. */
export const DEFAULT_MODEL: Readonly<Record<CategoryId, ModelId>> = {
  vehicles: 'hypercar',
  weapons: 'service-pistol',
  heist: 'drill',
  cash: 'cash-stack',
  gear: 'chronograph',
  collectibles: 'boombox',
};
