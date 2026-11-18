'use client';

import { Environment } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MODELS, type ModelSpec } from '@/domain/models';
import type { ModelId } from '@/domain/types';
import { Coin, type CoinFinish } from './Coin';
import { Model } from './Stage';

declare global {
  interface Window {
    /** Set by the page once the asset has drawn. Read by `scripts/render-assets.mjs`. */
    __renderReady?: boolean;
    /** Poses the asset for frame-by-frame capture: turns (0–1) about the vertical and horizontal axes. */
    __setPose?: (turn: number, flip?: number) => void;
  }
}

function Subject({
  asset,
  turn,
  finish,
  spinning,
}: {
  asset: string;
  turn: number;
  finish: CoinFinish;
  /** True when the capture will rotate the asset, so it must fit at every angle. */
  spinning: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const frames = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const viewport = useThree((state) => state.viewport);
  // `?file=/models/x.glb` previews a file that is not in the registry yet.
  const file = new URLSearchParams(window.location.search).get('file');
  const spec = useMemo<ModelSpec | null>(
    () =>
      file
        ? { url: file, size: 3, placement: 'float', finish: 'own', rotation: [0, 0.6, 0] }
        : asset in MODELS
          ? MODELS[asset as ModelId]
          : null,
    [file, asset],
  );

  useEffect(() => {
    window.__setPose = (value, flip = 0) => {
      if (group.current) group.current.rotation.set(flip * Math.PI * 2, value * Math.PI * 2, 0);
      invalidate();
    };
    return () => {
      delete window.__setPose;
    };
  }, [invalidate]);

  useFrame(() => {
    frames.current += 1;

    // Once the model is in the scene, scale and centre it so it fills the frame whatever its
    // proportions: a long car and a tall watch both end up the same visual size.
    if (frames.current === 3 && spec && fit.current) {
      const box = new THREE.Box3().setFromObject(fit.current, true);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      // For a turntable capture the widest the object ever gets is its diagonal on the ground.
      const width = spinning ? Math.hypot(size.x, size.z) : size.x;
      const scale = Math.min((viewport.width * 0.84) / width, (viewport.height * 0.8) / size.y);
      fit.current.scale.setScalar(scale);
      fit.current.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
    }

    if (frames.current === 7) window.__renderReady = true;
    if (frames.current < 9) invalidate();
  });

  return (
    <group ref={group} rotation-y={turn * Math.PI * 2}>
      <group ref={fit} scale={spec ? 1 : 1.62}>
        {spec ? <Model spec={spec} /> : <Coin finish={finish} />}
      </group>
    </group>
  );
}

function RenderCanvas() {
  // The capture needs an alpha channel, so the page behind the canvas must be empty.
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, []);

  const params = new URLSearchParams(window.location.search);
  const asset = params.get('asset') ?? 'coin';
  const turn = Number(params.get('turn') ?? '0');
  const finish = (params.get('finish') ?? 'titanium') as CoinFinish;
  const spinning = params.get('fit') === 'spin';

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent' }}>
      <Canvas
        frameloop="demand"
        dpr={1}
        gl={{
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        camera={{ fov: 26, position: [0, 0.35, 8.4], near: 0.1, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Suspense fallback={null}>
          <Environment files="/hdri/neon_photostudio_1k.hdr" environmentIntensity={0.75} />
          <Subject asset={asset} turn={turn} finish={finish} spinning={spinning} />
        </Suspense>
        <directionalLight position={[-5, 5, 6]} intensity={1.6} color="#ffffff" />
        <directionalLight position={[6, 3, -6]} intensity={1.8} color="#4ff2cf" />
      </Canvas>
    </div>
  );
}

// The page reads the query string and needs WebGL, so it only ever renders in the browser.
export const RenderStage = dynamic(() => Promise.resolve(RenderCanvas), { ssr: false });
