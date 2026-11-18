import type { ComponentType } from 'react';
import {
  BoulevardScene,
  CityScene,
  CoinHeroScene,
  ExplodedScene,
  MacroScene,
  MonolithScene,
  SkyfallScene,
  TickerScene,
} from './scenes';

export interface Lens {
  /** Vertical field of view of the finished frame, in degrees. */
  readonly fov: number;
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  /**
   * Where the point the camera aims at lands in the frame, as fractions from the top left.
   * Moving it shifts the picture like a view-camera lens, without tilting the verticals.
   */
  readonly principal?: readonly [number, number];
}

export interface Piece {
  /** Size in CSS pixels. The capture script multiplies it by its device scale factor. */
  readonly width: number;
  readonly height: number;
  /** Rendered on nothing, with an alpha channel, and without post-processing. */
  readonly transparent?: boolean;
  readonly lens: Lens;
  readonly Scene: ComponentType;
  readonly Overlay?: ComponentType;
}

const FACE_ON: Lens = { fov: 22, position: [0, 0, 18], target: [0, 0, 0] };
const STUDIO: Lens = { fov: 20, position: [0, 0, 16], target: [0, 0, 0] };

/**
 * Every brand and social image, by the name it is rendered and saved under.
 * Banners are 3:1 and carry no type: the lower left is where a profile picture sits.
 */
export const PIECES: Readonly<Record<string, Piece>> = {
  ticker: { width: 1024, height: 1024, transparent: true, lens: FACE_ON, Scene: TickerScene },
  'coin-hero': {
    width: 1024,
    height: 1024,
    transparent: true,
    lens: FACE_ON,
    Scene: CoinHeroScene,
  },
  'banner-boulevard': {
    width: 1500,
    height: 500,
    lens: { fov: 15, position: [0, 1.3, 34], target: [0, 1.3, -170], principal: [0.6, 0.7] },
    Scene: BoulevardScene,
  },
  'banner-monolith': {
    width: 1500,
    height: 500,
    lens: { fov: 24, position: [0, 0.8, 12], target: [0, 0.8, -60], principal: [0.5, 0.8] },
    Scene: MonolithScene,
  },
  'banner-city': {
    width: 1500,
    height: 500,
    lens: { fov: 17, position: [0, 3, 120], target: [0, 3, -400], principal: [0.5, 0.72] },
    Scene: CityScene,
  },
  'banner-exploded': { width: 1500, height: 500, lens: STUDIO, Scene: ExplodedScene },
  'banner-macro': { width: 1500, height: 500, lens: STUDIO, Scene: MacroScene },
  'banner-skyfall': {
    width: 1500,
    height: 500,
    lens: { fov: 26, position: [0, 9, 28], target: [0, 9, -200], principal: [0.5, 0.86] },
    Scene: SkyfallScene,
  },
};
