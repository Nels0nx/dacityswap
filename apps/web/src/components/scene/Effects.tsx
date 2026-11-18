'use client';

import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/**
 * A clean grade: eight-sample antialiasing, a little bloom on real highlights such as the
 * street lamps, filmic tone mapping and a light vignette. No grain: it reads as noise on a
 * product shot.
 */
export function Effects({ quality }: { quality: 'high' | 'low' }) {
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={2}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={8}>
      <Bloom
        mipmapBlur
        intensity={0.34}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.14}
        radius={0.72}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.58} />
    </EffectComposer>
  );
}
