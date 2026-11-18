'use client';

import { create } from 'zustand';
import type { ModelId } from '@/domain/types';

/**
 * Bridge between the DOM app and the WebGL scene.
 *
 * The 3D canvas runs in its own React reconciler, so it cannot read React
 * context from the app tree. This tiny module-level store carries the few
 * signals both sides need. It holds no user or market data.
 */
export type AppPhase = 'loading' | 'intro' | 'ready';

interface SceneState {
  phase: AppPhase;
  sceneReady: boolean;
  /** Incremented whenever the UI wants the hero coin to react. */
  pulse: number;
  /** What the hero stage presents: a model from the registry, or the brand coin when null. */
  stageModel: ModelId | null;
  setStageModel: (model: ModelId | null) => void;
  /** True while a sheet or dialog hides the scene, so it can stop rendering. */
  covered: boolean;
  setCovered: (covered: boolean) => void;
  /** True while the stage is waiting for a model to download. */
  stageLoading: boolean;
  setStageLoading: (loading: boolean) => void;
  markSceneReady: () => void;
  setPhase: (phase: AppPhase) => void;
  firePulse: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  phase: 'loading',
  sceneReady: false,
  pulse: 0,
  stageModel: null,
  setStageModel: (stageModel) => set({ stageModel }),
  covered: false,
  setCovered: (covered) => set({ covered }),
  stageLoading: false,
  setStageLoading: (stageLoading) => set({ stageLoading }),
  markSceneReady: () => set({ sceneReady: true }),
  setPhase: (phase) => set({ phase }),
  firePulse: () => set((state) => ({ pulse: state.pulse + 1 })),
}));

/**
 * Pointer input for the stage, written by the drag surface and consumed every frame by the
 * scene. It is a plain mutable object on purpose: routing 120 pointer events a second through
 * React state would re-render for nothing.
 */
export const stageInput = {
  /** Rotation to apply on the next frame, in radians. */
  yawDelta: 0,
  /** The product's current rotation, written by the scene so a leaving product keeps its pose. */
  yaw: 0,
  /** Extra tilt towards the camera, in radians. */
  pitch: 0,
  /** 1 is the default size. */
  zoom: 1,
  dragging: false,
};

export function resetStageInput(): void {
  stageInput.yawDelta = 0;
  stageInput.pitch = 0;
  stageInput.zoom = 1;
}
