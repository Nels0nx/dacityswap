'use client';

import { ContactShadows, MeshReflectorMaterial, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { MODELS, MODEL_IDS, type ModelSpec } from '@/domain/models';
import type { ModelId } from '@/domain/types';
import { resetStageInput, stageInput, useSceneStore } from '@/store/scene-store';
import { Coin } from './Coin';
import { DESKTOP_BREAKPOINT, FLOAT_HEIGHT, STAGE_Z } from './constants';

/** Studio paint for untextured meshes: a metallic coat under glossy clearcoat. One per colour. */
const paints = new Map<string, THREE.MeshPhysicalMaterial>();
function studioPaint(colour = '#1a1d22'): THREE.MeshPhysicalMaterial {
  let material = paints.get(colour);
  if (!material) {
    material = new THREE.MeshPhysicalMaterial({
      color: colour,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.1,
    });
    paints.set(colour, material);
  }
  return material;
}

/**
 * Any model, normalised. It is turned to its best side first and measured afterwards, so
 * `size` and the point where it touches the ground both refer to the pose the buyer sees.
 */
export function Model({ spec }: { spec: ModelSpec }) {
  const gltf = useGLTF(spec.url);

  const { pivot, offset, scale } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (spec.finish === 'studio-paint') {
        node.material = studioPaint(spec.paint);
      } else if (
        spec.paint &&
        node.material instanceof THREE.MeshStandardMaterial &&
        node.material.name.startsWith('Paint 1')
      ) {
        // A colourway: the same car with its body paint swapped.
        const repainted = node.material.clone();
        repainted.color.set(spec.paint);
        node.material = repainted;
      }
    });
    const turned = new THREE.Group();
    turned.add(clone);
    turned.rotation.set(...spec.rotation);
    turned.updateMatrixWorld(true);

    // Measured from the vertices themselves: the boxes stored in a file can be stale or loose.
    const box = new THREE.Box3().setFromObject(turned, true);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    return {
      pivot: turned,
      // Centred on the turntable's axis; standing on the ground or centred on its own height.
      offset: new THREE.Vector3(
        -centre.x,
        spec.placement === 'ground' ? -box.min.y : -centre.y,
        -centre.z,
      ),
      scale: spec.size / Math.max(size.x, size.y, size.z),
    };
  }, [gltf, spec]);

  return (
    <group scale={scale}>
      <group position={offset}>
        <primitive object={pivot} />
      </group>
    </group>
  );
}

const ENTER_SECONDS = 1.05;
const LEAVE_SECONDS = 0.5;
const IDLE_SPIN = 0.12;
const RESUME_AFTER_SECONDS = 2.5;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

interface PresenterProps {
  id: ModelId | null;
  role: 'present' | 'leave';
  startYaw: number;
  compact: boolean;
  reducedMotion: boolean;
  onGone?: () => void;
}

/**
 * One object on stage, with its own entrance or exit.
 *
 * A car drives up the boulevard and brakes to a stop; when it is replaced it pulls out past
 * the camera. Smaller things drop in from above with a spin and sink away when they leave.
 * While it is the one being presented, dragging turns it and the wheel zooms it.
 */
function Presenter({ id, role, startYaw, compact, reducedMotion, onGone }: PresenterProps) {
  const pulse = useSceneStore((state) => state.pulse);
  const spec = id === null ? null : MODELS[id];
  const grounded = spec?.placement === 'ground';
  const mount = useRef<THREE.Group>(null);
  const table = useRef<THREE.Group>(null);
  const progress = useRef(reducedMotion ? 1 : 0);
  const yaw = useRef(startYaw);
  const targetYaw = useRef(startYaw);
  const idleFor = useRef(0);
  const zoom = useRef(1);
  const gone = useRef(false);

  // A completed purchase sends the product spinning.
  useEffect(() => {
    if (pulse > 0 && role === 'present') targetYaw.current += Math.PI * 4;
  }, [pulse, role]);

  // A phone screen is a tall sliver of the same picture, so everything is scaled to its width.
  const baseScale = compact ? (grounded ? 0.42 : spec ? 0.52 : 0.6) : spec ? 1 : 1.12;
  const height = grounded ? 0 : compact ? 1.0 : FLOAT_HEIGHT;
  // On a desktop the title card owns the left, so the product stands a little right of centre.
  const restX = compact ? 0 : 0.9;

  useFrame((state, delta) => {
    if (!mount.current || !table.current) return;
    const dt = Math.min(delta, 0.05);
    progress.current = Math.min(
      1,
      progress.current + dt / (role === 'present' ? ENTER_SECONDS : LEAVE_SECONDS),
    );
    const t = progress.current;

    let x = restX;
    let y = height;
    let z = STAGE_Z;
    let scale = baseScale;
    let brake = 0;

    if (role === 'present') {
      const arrived = easeOutCubic(t);
      if (grounded) {
        z = STAGE_Z - (1 - arrived) * 18; // drives up from the far end of the road
        brake = Math.sin(Math.PI * t) * 0.022 * (1 - t); // the nose dips as it stops
      } else {
        y = height + (1 - easeOutBack(t)) * 2.6; // drops in and settles
        scale = baseScale * (0.7 + 0.3 * arrived);
      }

      // Dragging sets a target; the product follows with a little weight.
      if (stageInput.dragging || stageInput.yawDelta !== 0) {
        targetYaw.current += stageInput.yawDelta;
        stageInput.yawDelta = 0;
        idleFor.current = 0;
      } else {
        idleFor.current += dt;
        if (idleFor.current > RESUME_AFTER_SECONDS && !reducedMotion) {
          targetYaw.current +=
            dt * (grounded ? IDLE_SPIN * 0.7 : spec ? IDLE_SPIN : IDLE_SPIN * 2.4);
        }
      }
      zoom.current = THREE.MathUtils.damp(zoom.current, stageInput.zoom, 8, dt);
      scale *= zoom.current;
      // Floating things arrive with a spin that unwinds as they settle.
      const flourish = grounded ? 0 : (1 - arrived) * Math.PI * 1.25;
      yaw.current = THREE.MathUtils.damp(yaw.current, targetYaw.current, 9, dt);
      table.current.rotation.y = yaw.current - flourish;
      stageInput.yaw = yaw.current;

      const rest = spec ? (grounded ? 0 : 0.1) : -state.pointer.y * 0.2;
      const limit = grounded ? 0.18 : 0.6;
      const tilt =
        rest + THREE.MathUtils.clamp(stageInput.pitch, grounded ? 0 : -limit, limit) + brake;
      mount.current.rotation.x = THREE.MathUtils.damp(mount.current.rotation.x, tilt, 6, dt);
      if (!grounded && !reducedMotion) y += Math.sin(state.clock.elapsedTime * 1.1) * 0.05;
    } else {
      const leaving = easeInCubic(t);
      if (grounded) {
        x = restX - leaving * 6; // pulls out to the left, past the camera
        z = STAGE_Z + leaving * 13;
      } else {
        y = height - leaving * 1.6;
        scale = baseScale * (1 - leaving);
      }
      table.current.rotation.y = yaw.current + leaving * (grounded ? -0.5 : 2.4);
      if (t >= 1 && !gone.current) {
        gone.current = true;
        onGone?.();
      }
    }

    mount.current.position.set(x, y, z);
    table.current.scale.setScalar(Math.max(0.0001, scale));
  });

  return (
    <group
      ref={mount}
      position={[
        restX,
        height,
        STAGE_Z - (grounded && !reducedMotion && role === 'present' ? 18 : 0),
      ]}
    >
      <group ref={table} rotation-y={startYaw}>
        <Suspense fallback={null}>{spec ? <Model spec={spec} /> : <Coin />}</Suspense>
      </group>
    </group>
  );
}

/**
 * The wet road under the stage, as a real mirror: it reflects the product, the palms and the
 * sky, blurred the way damp asphalt does. Its edges fade out so it melts into the road shader.
 */
function WetRoad({ x }: { x: number }) {
  const fade = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(128, 128, 20, 128, 128, 128);
      gradient.addColorStop(0, '#d8d8d8');
      gradient.addColorStop(0.55, '#8a8a8a');
      gradient.addColorStop(1, '#000000');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.006, STAGE_Z - 2]} renderOrder={1}>
      <planeGeometry args={[30, 34]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={0.85}
        blur={[260, 70]}
        mixBlur={0.85}
        mixStrength={1.9}
        mixContrast={1.05}
        depthScale={0.5}
        minDepthThreshold={0.5}
        maxDepthThreshold={1.3}
        roughness={0.62}
        metalness={0.55}
        color="#0a0a0c"
        alphaMap={fade}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * The hero stage. It presents the selected product, or the brand coin.
 *
 * When a new product is chosen, the current one stays in place until the next has loaded
 * (the deferred value), then leaves while the new one arrives, so the stage is never empty.
 */
export function Stage({
  reducedMotion,
  quality,
}: {
  reducedMotion: boolean;
  quality: 'high' | 'low';
}) {
  const target = useSceneStore((state) => state.stageModel);
  const setStageLoading = useSceneStore((state) => state.setStageLoading);
  const compact = useThree((state) => state.size.width < DESKTOP_BREAKPOINT);

  const shown = useDeferredValue(target);
  useEffect(() => {
    setStageLoading(shown !== target);
  }, [shown, target, setStageLoading]);

  // Remember what was on stage, so it can make its exit while the next thing arrives.
  const [current, setCurrent] = useState(shown);
  const [leaving, setLeaving] = useState<{ id: ModelId | null; yaw: number } | null>(null);
  if (current !== shown) {
    setLeaving(reducedMotion ? null : { id: current, yaw: stageInput.yaw });
    setCurrent(shown);
    resetStageInput();
  }

  const restX = compact ? 0 : 0.9;

  return (
    <>
      <Presenter
        key={`in:${current ?? 'coin'}`}
        id={current}
        role="present"
        startYaw={0}
        compact={compact}
        reducedMotion={reducedMotion}
      />
      {leaving && (
        <Presenter
          key={`out:${leaving.id ?? 'coin'}`}
          id={leaving.id}
          role="leave"
          startYaw={leaving.yaw}
          compact={compact}
          reducedMotion={reducedMotion}
          onGone={() => setLeaving(null)}
        />
      )}
      {/* Desktops with headroom get a real reflection; everything else keeps the shadow alone. */}
      {quality === 'high' && !compact && <WetRoad x={restX} />}
      {/* A soft shadow on the wet street: tight under a parked car, wide under a hovering object. */}
      <ContactShadows
        position={[restX, 0.012, STAGE_Z]}
        scale={[16, 44]}
        far={4.5}
        blur={2.4}
        opacity={0.78}
        resolution={quality === 'high' ? 1024 : 256}
        renderOrder={2}
        color="#000000"
      />
    </>
  );
}

/** Fetch every model once the page is idle. They total about 25 MB, so switching is instant. */
export function preloadAllModels(): void {
  for (const id of MODEL_IDS) useGLTF.preload(MODELS[id].url);
}
