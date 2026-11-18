'use client';

import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Coin, useCoinGeometry, useCoinMaterials } from '@/components/scene/Coin';
import { buildPalm } from '@/components/scene/Street';
import { mulberry32 } from '@/lib/rng';
import { DUSK, skyFragment, skyUniforms, skyVertex, type SkyOptions } from './dusk';

/** The sky dome. The same dome, smaller and brighter, also lights the metal in the scene. */
export function DuskSky({ radius = 2400, ...options }: SkyOptions & { radius?: number }) {
  const { gain, spread, stretch, clouds } = options;
  const uniforms = useMemo(
    () => skyUniforms({ gain, spread, stretch, clouds }),
    [gain, spread, stretch, clouds],
  );
  return (
    <mesh scale={radius} frustumCulled={false}>
      <sphereGeometry args={[1, 96, 64]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

/** Image-based light: the dusk sky plus two soft studio panels on the camera's side. */
export function DuskLight({
  intensity = 1,
  panel = 2.2,
  spread = 2.6,
}: {
  intensity?: number;
  /** Brightness of the studio panels. */
  panel?: number;
  spread?: number;
}) {
  return (
    <Environment resolution={512} frames={1} environmentIntensity={intensity}>
      <DuskSky gain={1.9} radius={60} spread={spread} clouds={0} />
      <Lightformer
        form="rect"
        intensity={panel}
        color="#fff1e4"
        position={[-14, 16, 22]}
        scale={[22, 12, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={panel * 0.4}
        color="#c9b8ff"
        position={[18, 6, 20]}
        scale={[8, 18, 1]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}

/**
 * Rain left standing on the asphalt, as two matching textures: how strongly each patch of road
 * reflects, and how sharply. Puddles are bright in the first and dark in the second.
 */
function usePuddles(repeat: number) {
  return useMemo(() => {
    const size = 512;
    const random = mulberry32(4_217);
    const blobs = Array.from({ length: 52 }, () => ({
      x: random() * size,
      y: random() * size,
      radius: 18 + random() * 78,
    }));

    const paint = (base: string, puddle: [number, number, number], grain: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        const [r, g, b] = puddle;
        for (const { x, y, radius } of blobs) {
          // Drawn nine times so the texture tiles without a seam.
          for (const dx of [-size, 0, size]) {
            for (const dy of [-size, 0, size]) {
              const blob = context.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
              blob.addColorStop(0, `rgba(${r},${g},${b},1)`);
              blob.addColorStop(0.55, `rgba(${r},${g},${b},0.85)`);
              blob.addColorStop(1, `rgba(${r},${g},${b},0)`);
              context.fillStyle = blob;
              context.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
            }
          }
        }
        // The aggregate in the asphalt: a speckle too fine to see as anything but texture.
        const speckle = mulberry32(99);
        for (let index = 0; index < 9_000; index++) {
          const shade = speckle() > 0.5 ? 255 : 0;
          context.fillStyle = `rgba(${shade},${shade},${shade},${grain * speckle()})`;
          context.fillRect(speckle() * size, speckle() * size, 1, 1);
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.anisotropy = 8;
      return texture;
    };

    return {
      strength: paint('#2e2e2e', [255, 255, 255], 0.1),
      roughness: paint('#ffffff', [26, 26, 26], 0.12),
    };
  }, [repeat]);
}

/**
 * Wet ground: a real planar reflection of everything standing on it. As a road it carries
 * puddles and lane markings; as a showroom floor or still water it is a clean dark mirror.
 * The surface shows only what it reflects, so its brightness is set by `strength` alone.
 */
export function WetGround({
  strength = 4,
  kind = 'road',
  y = 0,
  markings = true,
}: {
  strength?: number;
  kind?: 'road' | 'mirror';
  y?: number;
  markings?: boolean;
}) {
  const puddles = usePuddles(20);
  const dashes = useMemo(() => Array.from({ length: 34 }, (_, index) => 26 - index * 9), []);
  const road = kind === 'road';

  return (
    <group position-y={y}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -900]}>
        <planeGeometry args={[5000, 2400]} />
        <MeshReflectorMaterial
          resolution={2048}
          mirror={1}
          // The blur buffer's size: the lower a side, the further the reflection smears along
          // it. A wet surface smears towards the viewer far more than sideways.
          blur={road ? [1100, 240] : [1800, 620]}
          mixBlur={1}
          mixStrength={strength}
          mixContrast={1}
          depthScale={0}
          roughness={road ? 1 : 0.3}
          roughnessMap={road ? puddles.roughness : null}
          map={road ? puddles.strength : null}
          metalness={0}
          color="#ffffff"
          envMapIntensity={0}
          fog={false}
        />
      </mesh>

      {road && markings && (
        <group position-y={0.012}>
          {[-3.5, 3.5].flatMap((x) =>
            dashes.map((z) => (
              <mesh key={`${x}:${z}`} rotation-x={-Math.PI / 2} position={[x, 0, z]}>
                <planeGeometry args={[0.16, 3.4]} />
                <meshBasicMaterial color="#d9cfc0" transparent opacity={0.2} />
              </mesh>
            )),
          )}
          {[-7.7, 7.7].map((x) => (
            <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0, -130]}>
              <planeGeometry args={[0.18, 330]} />
              <meshBasicMaterial color="#d9cfc0" transparent opacity={0.14} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Rows of palms running to the vanishing point, as near-silhouettes against the sky. */
export function PalmRows({
  from = -4,
  to = -190,
  offset = 11.5,
  seed = 9_401,
  sides = [-1, 1],
  gap = 12,
}: {
  from?: number;
  to?: number;
  offset?: number;
  seed?: number;
  sides?: readonly number[];
  gap?: number;
}) {
  const variants = useMemo(
    () => [buildPalm(11, 10.5, 1.4), buildPalm(23, 12.5, -1.1), buildPalm(37, 9.2, 0.7)],
    [],
  );
  const palms = useMemo(() => {
    const random = mulberry32(seed);
    const placed: { x: number; z: number; variant: number; scale: number; turn: number }[] = [];
    for (const side of sides) {
      for (let z = from - random() * 6; z > to; z -= gap + random() * 8) {
        placed.push({
          x: side * (offset + random() * 4),
          z,
          variant: Math.floor(random() * 3),
          scale: 0.9 + random() * 0.45,
          turn: random() * Math.PI * 2,
        });
      }
    }
    return placed;
  }, [from, to, offset, seed, sides, gap]);

  return (
    <>
      {palms.map((palm) => (
        <mesh
          key={`${palm.x}:${palm.z}`}
          geometry={variants[palm.variant]}
          position={[palm.x, 0, palm.z]}
          rotation-y={palm.turn}
          scale={palm.scale}
        >
          <meshStandardMaterial
            color="#0a0610"
            roughness={0.85}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * A far city across the water: stepped towers thick with lit windows, clustered into a
 * downtown or two. It is kept low and hazy so that the coin dwarfs it.
 */
export function Skyline({
  z = -1150,
  span = 1500,
  clear = 0,
  seed = 77,
  tallest = 84,
  centres = [-420, 380],
}: {
  z?: number;
  span?: number;
  /** Half-width of a gap left open around x = 0. */
  clear?: number;
  seed?: number;
  tallest?: number;
  /** Where the downtowns are, along x. */
  centres?: readonly number[];
}) {
  const windows = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, 64, 128);
      const random = mulberry32(31);
      for (let row = 0; row < 32; row++) {
        for (let column = 0; column < 16; column++) {
          if (random() > 0.3) continue;
          context.fillStyle = random() > 0.3 ? '#ffc48a' : '#c4d9ff';
          context.globalAlpha = 0.3 + random() * 0.7;
          context.fillRect(column * 4 + 1, row * 4 + 1, 2, 2);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  const blocks = useMemo(() => {
    const random = mulberry32(seed);
    const built: {
      key: string;
      position: [number, number, number];
      size: [number, number, number];
      map: THREE.Texture;
      shade: string;
    }[] = [];
    const block = (x: number, depth: number, base: number, w: number, h: number, far: boolean) => {
      const map = windows.clone();
      map.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 17)));
      map.offset.set(Math.floor(random() * 16) / 16, Math.floor(random() * 32) / 32);
      map.needsUpdate = true;
      built.push({
        key: `${built.length}`,
        position: [x, base + h / 2, depth],
        size: [w, h, w * 0.8],
        map,
        // Haze: the further row is lighter, which separates the two against the sky.
        shade: far ? '#2a1238' : '#120a1e',
      });
    };

    for (const far of [true, false]) {
      for (let x = -span; x < span; x += 15 + random() * 24) {
        if (Math.abs(x) < clear) continue;
        const downtown = Math.max(
          ...centres.map((centre) => Math.exp(-(((x - centre) / 260) ** 2))),
        );
        const w = 15 + random() * 20;
        const h = 9 + random() ** 1.6 * tallest * (0.22 + 0.78 * downtown) * (far ? 1.15 : 1);
        const depth = z - (far ? 220 : 0) - random() * 120;
        block(x, depth, 0, w, h, far);
        // Tall towers step in once or twice on the way up and may carry a mast.
        if (h > tallest * 0.4 && random() > 0.35) {
          const step = h * (0.12 + random() * 0.2);
          block(x, depth, h, w * 0.62, step, far);
          if (random() > 0.5) block(x, depth, h + step, w * 0.07, step * 1.4, far);
        }
      }
    }
    return built;
  }, [windows, seed, span, clear, z, tallest, centres]);

  return (
    <>
      {blocks.map((item) => (
        <mesh key={item.key} position={item.position}>
          <boxGeometry args={item.size} />
          <meshBasicMaterial color={item.shade} fog={false} />
          {/* Windows are a second skin, so they glow without lighting the wall they are in. */}
          <mesh scale={1.002}>
            <boxGeometry args={item.size} />
            <meshBasicMaterial
              map={item.map}
              blending={THREE.AdditiveBlending}
              transparent
              depthWrite={false}
              toneMapped={false}
              fog={false}
            />
          </mesh>
        </mesh>
      ))}
    </>
  );
}

/** A long-exposure streak of lights down a lane, fading out towards one end. */
export function LightTrail({
  x,
  y = 0.58,
  from,
  to,
  colour,
  width = 0.016,
}: {
  x: number;
  y?: number;
  /** The end where the streak is brightest. */
  from: number;
  /** The end where it has faded to nothing. */
  to: number;
  /** Linear RGB above 1, so the streak blooms. */
  colour: readonly [number, number, number];
  width?: number;
}) {
  const fade = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      // The cylinder's V runs along its length: bright at the top, gone at the bottom.
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#6a6a6a');
      gradient.addColorStop(1, '#000000');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 4, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  const tint = useMemo(() => new THREE.Color(...colour), [colour]);
  const length = Math.abs(to - from);

  return (
    <mesh position={[x, y, (from + to) / 2]} rotation-x={from < to ? -Math.PI / 2 : Math.PI / 2}>
      <cylinderGeometry args={[width, width, length, 6, 1, true]} />
      <meshBasicMaterial
        color={tint}
        alphaMap={fade}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const haloFragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(max(1.0 - d, 0.0), 2.4);
    gl_FragColor = vec4(mix(uOuter, uInner, glow) * glow * uGain, 1.0);
  }
`;

/** A soft bloom of light in the air, behind whatever it is placed behind. */
export function Halo({
  position,
  size,
  gain = 0.4,
  inner = DUSK.amber,
  outer = DUSK.magenta,
}: {
  position: readonly [number, number, number];
  size: number;
  gain?: number;
  inner?: string;
  outer?: string;
}) {
  const uniforms = useMemo(
    () => ({
      uInner: { value: new THREE.Color(inner) },
      uOuter: { value: new THREE.Color(outer) },
      uGain: { value: gain },
    }),
    [gain, inner, outer],
  );
  return (
    <mesh position={[...position]} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={haloVertex}
        fragmentShader={haloFragment}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        fog={false}
      />
    </mesh>
  );
}

/** Keeps distance haze off an object that is meant to cut through it. */
const clearOfFog = (group: THREE.Group | null) => {
  group?.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const { material } = node;
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshBasicMaterial
    ) {
      material.fog = false;
    }
  });
};

/**
 * The coin as a monument: standing at the end of the boulevard, far larger than anything
 * around it, with the last light spilling out from behind.
 */
export function GiantCoin({
  radius,
  position,
  sink = 0.45,
  glow = 2.4,
  halo = 0.4,
  rotation = [0, 0, 0],
}: {
  radius: number;
  /** Where it meets the ground: x and z. */
  position: readonly [number, number];
  /** How much of its radius is below the ground. */
  sink?: number;
  glow?: number;
  halo?: number;
  rotation?: readonly [number, number, number];
}) {
  const [x, z] = position;
  const y = radius * (1 - sink);

  return (
    <>
      {halo > 0 && <Halo position={[x, y * 0.8, z - radius * 0.6]} size={radius * 5} gain={halo} />}
      <group ref={clearOfFog} position={[x, y, z]} rotation={[...rotation]} scale={radius}>
        <Coin finish="sunset" glow={glow} />
      </group>
    </>
  );
}

export interface Tower {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  /** Coins in the stack. */
  readonly count: number;
}

/** Thickness of one coin, rim to rim, for a coin of radius 1. */
export const COIN_PITCH = 0.156;

/**
 * Stacks of coins as buildings. Only the parts of a stacked coin that can be seen are drawn,
 * the reeded edge and the rim, and all of them in two draw calls.
 */
export function CoinTowers({
  towers,
  turn = 0,
  twist = 0,
  glow = 1.4,
}: {
  towers: readonly Tower[];
  /** Which way the stacks' gold side faces, in radians about the vertical. */
  turn?: number;
  /** Extra turn per coin, which winds the gradient round the stack. */
  twist?: number;
  glow?: number;
}) {
  const geometry = useCoinGeometry();
  const material = useCoinMaterials('sunset', glow);
  const edge = useRef<THREE.InstancedMesh>(null);
  const rim = useRef<THREE.InstancedMesh>(null);
  const total = towers.reduce((sum, tower) => sum + tower.count, 0);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const lay = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const spin = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let index = 0;
    for (const tower of towers) {
      const pitch = COIN_PITCH * tower.radius;
      for (let level = 0; level < tower.count; level++) {
        spin.setFromAxisAngle(up, turn + level * twist).multiply(lay);
        matrix.compose(
          new THREE.Vector3(tower.x, (level + 0.5) * pitch, tower.z),
          spin,
          new THREE.Vector3(tower.radius, tower.radius, tower.radius),
        );
        edge.current?.setMatrixAt(index, matrix);
        rim.current?.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    for (const mesh of [edge.current, rim.current]) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  }, [towers, turn, twist]);

  return (
    <>
      <instancedMesh
        ref={edge}
        args={[geometry.edge, material.edge, total]}
        frustumCulled={false}
      />
      <instancedMesh ref={rim} args={[geometry.rim, material.rim, total]} frustumCulled={false} />
    </>
  );
}

/** The lights every dusk scene shares: the afterglow from behind and a cool fill from the camera. */
export function DuskLights({ back = 3, fill = 0.9 }: { back?: number; fill?: number }) {
  return (
    <>
      <directionalLight position={[2, 9, -60]} intensity={back} color="#ff8e6a" />
      <directionalLight position={[-8, 10, 30]} intensity={fill} color="#f3e9ff" />
      <ambientLight intensity={0.12} color="#8a6cff" />
    </>
  );
}

/**
 * The grade: antialiasing, a little bloom, a tone curve that keeps the colours true and grain
 * fine enough to stop the sky banding. `focus` adds depth of field: the distance from the
 * camera that is sharp, and how deep the sharp zone is.
 */
export function DuskGrade({
  bloom = 0.4,
  vignette = 0.5,
  focus,
  bokeh = 3,
}: {
  bloom?: number;
  vignette?: number;
  focus?: readonly [distance: number, range: number];
  bokeh?: number;
}) {
  return (
    <EffectComposer multisampling={8}>
      {focus ? (
        <DepthOfField
          worldFocusDistance={focus[0]}
          worldFocusRange={focus[1]}
          bokehScale={bokeh}
          resolutionScale={1}
        />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        intensity={bloom}
        luminanceThreshold={0.88}
        luminanceSmoothing={0.2}
        radius={0.76}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.28} darkness={vignette} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.2} />
    </EffectComposer>
  );
}
