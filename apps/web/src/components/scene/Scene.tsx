'use client';

import { Environment, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { useSceneStore } from '@/store/scene-store';
import { Backdrop } from './Backdrop';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { preloadAllModels, Stage } from './Stage';
import { Street } from './Street';
import { CAMERA_FOV, CAMERA_START, DESKTOP_BREAKPOINT } from './constants';

/** Tells the preloader that the scene and its assets are on screen. */
function ReadySignal({ preload }: { preload: boolean }) {
  const frames = useRef(0);
  const markSceneReady = useSceneStore((state) => state.markSceneReady);

  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) markSceneReady();
    // Once the first picture is up, fetch the rest of the catalogue in the background.
    // Phones and data-saver connections fetch a model only when it is picked.
    if (frames.current === 120 && preload && !saveData()) preloadAllModels();
  });

  return null;
}

function saveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

export default function Scene() {
  const reducedMotion = usePrefersReducedMotion();
  const covered = useSceneStore((state) => state.covered);
  // Phones start on the light effect chain; desktops earn it only if the frame rate drops.
  const [compact] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);
  const [quality, setQuality] = useState<'high' | 'low'>(compact ? 'low' : 'high');
  // Full resolution up to 2x on desktops; phones are capped lower to hold their frame rate.
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, compact ? 1.5 : 2));

  return (
    <Canvas
      flat
      dpr={dpr}
      // Nothing moves behind a sheet or a dialog, so stop drawing while one is open.
      frameloop={covered ? 'never' : 'always'}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 1200, position: CAMERA_START.toArray() }}
      eventSource={document.body}
      eventPrefix="client"
    >
      <color attach="background" args={['#050608']} />
      {/* Haze swallows the far end of the boulevard. Custom shaders opt out of it. */}
      <fog attach="fog" args={['#2a1410', 45, 175]} />
      <PerformanceMonitor
        onDecline={() => {
          // First give up resolution; only if that is not enough, give up the effects too.
          setDpr((current) => {
            if (current > 1.25) return 1.25;
            setQuality('low');
            return 1;
          });
        }}
      />
      <CameraRig reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <Backdrop />
        <Street />
        {/* Studio lighting for reflections only (CC0, Poly Haven). It is never drawn as a background. */}
        <Environment files="/hdri/neon_photostudio_1k.hdr" environmentIntensity={0.95} />
        <Stage reducedMotion={reducedMotion} quality={quality} />
        <ReadySignal preload={!compact} />
      </Suspense>

      {/* Dusk: a warm rim from the sunset behind and a cool edge, then a soft key from the camera
          side so the product itself is clearly lit. */}
      <directionalLight position={[-6, 5, -8]} intensity={2.6} color="#ff9a6b" />
      <directionalLight position={[7, 3, -3]} intensity={1.4} color="#4ff2cf" />
      <directionalLight position={[-3, 6, 8]} intensity={2.1} color="#fff4e8" />
      <ambientLight intensity={0.25} />

      <Effects quality={quality} />
    </Canvas>
  );
}
