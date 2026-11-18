import { MODELS } from '@/domain/models';
import type { ModelId } from '@/domain/types';

/**
 * Starts downloading a model before it is needed, for example when a card is hovered.
 * The 3D library is imported lazily so it stays out of the interface bundle.
 */
export function preloadModel(model: ModelId): void {
  void import('@react-three/drei').then(({ useGLTF }) => useGLTF.preload(MODELS[model].url));
}
