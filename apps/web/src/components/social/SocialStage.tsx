'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PIECES, type Lens } from './pieces';

/** Points the camera and, if the piece asks for it, shifts the picture off-centre. */
function aim(camera: THREE.PerspectiveCamera, width: number, height: number, lens: Lens) {
  const [px, py] = lens.principal ?? [0.5, 0.5];
  // The shift is done by rendering a window of a larger virtual frame centred on the target.
  const kx = 2 * Math.max(px, 1 - px);
  const ky = 2 * Math.max(py, 1 - py);
  const half = Math.tan(THREE.MathUtils.degToRad(lens.fov) / 2);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(ky * half));
  camera.aspect = (kx * width) / (ky * height);
  camera.near = 0.1;
  camera.far = 5000;
  camera.position.set(...lens.position);
  camera.lookAt(...lens.target);
  camera.setViewOffset(
    kx * width,
    ky * height,
    width * (kx / 2 - px),
    height * (ky / 2 - py),
    width,
    height,
  );
  camera.updateProjectionMatrix();
}

/** Tells the capture script the picture has settled: reflections and light probes need a few frames. */
function Ready() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 30) window.__renderReady = true;
  });
  return null;
}

function SocialCanvas() {
  const id = new URLSearchParams(window.location.search).get('piece') ?? 'banner';
  const piece = PIECES[id];
  const transparent = piece?.transparent === true;

  // A transparent capture needs an empty page behind the canvas.
  useEffect(() => {
    const background = transparent ? 'transparent' : '#050608';
    document.documentElement.style.background = background;
    document.body.style.background = background;
  }, [transparent]);

  if (!piece) {
    return <p className="p-6 font-mono text-sm">Unknown piece “{id}”.</p>;
  }
  const { Scene, Overlay } = piece;

  return (
    <div
      id="frame"
      style={{
        position: 'relative',
        width: piece.width,
        height: piece.height,
        overflow: 'hidden',
        background: transparent ? 'transparent' : '#050608',
      }}
    >
      <Canvas
        // With post-processing the grade owns the tone curve; without it the renderer does.
        flat={!transparent}
        dpr={window.devicePixelRatio}
        gl={{
          alpha: transparent,
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: transparent ? THREE.NeutralToneMapping : THREE.NoToneMapping,
        }}
        camera={{ manual: true }}
        onCreated={({ camera, size }) =>
          aim(camera as THREE.PerspectiveCamera, size.width, size.height, piece.lens)
        }
      >
        <Suspense fallback={null}>
          <Scene />
          <Ready />
        </Suspense>
      </Canvas>
      {Overlay && <Overlay />}
    </div>
  );
}

// The page reads the query string and needs WebGL, so it only ever renders in the browser.
export const SocialStage = dynamic(() => Promise.resolve(SocialCanvas), { ssr: false });
