'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { Coin, useCoinGeometry, useCoinMaterials } from '@/components/scene/Coin';
import { Model } from '@/components/scene/Stage';
import { MODELS } from '@/domain/models';
import { mulberry32 } from '@/lib/rng';
import {
  COIN_PITCH,
  CoinTowers,
  DuskGrade,
  DuskLight,
  DuskLights,
  DuskSky,
  GiantCoin,
  Halo,
  LightTrail,
  PalmRows,
  Skyline,
  WetGround,
  type Tower,
} from './DuskWorld';
import { DUSK } from './dusk';

/**
 * Studio light for the coin on its own. A front-on disc mirrors whatever is behind the camera,
 * and its brushed face smears a light that stands off to one side into two wedges, the way a
 * machined dial does. `dusk` adds coloured cards, so polished edges pick up the palette.
 */
function CoinStudio({ side = false, dusk = false }: { side?: boolean; dusk?: boolean }) {
  return (
    <>
      <Environment resolution={1024} frames={1}>
        <color attach="background" args={['#08080c']} />
        {/* A wall of soft light behind the camera, so no polished surface ever mirrors black. */}
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#ffffff"
          position={[0, 0, 16]}
          scale={[40, 40, 1]}
          target={[0, 0, 0]}
        />
        {/* The card the flat faces mirror: bright up and to the left, falling away below. */}
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#fff8f0"
          position={[-3.2, 3.2, 14]}
          scale={[7, 7, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={8}
          color="#fff6ea"
          position={[-10, 10, 7]}
          scale={[8, 8, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color="#ffe3f1"
          position={[11, -7, 6]}
          scale={[5, 12, 1]}
          target={[0, 0, 0]}
        />
        {side && (
          <Lightformer
            form="rect"
            intensity={3.4}
            color="#ffffff"
            position={[16, 2, 5]}
            scale={[14, 22, 1]}
            target={[0, 0, 0]}
          />
        )}
        {dusk && (
          <>
            <Lightformer
              form="rect"
              intensity={7}
              color={DUSK.amber}
              position={[-16, -3, -6]}
              scale={[10, 16, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={7}
              color={DUSK.magenta}
              position={[16, 5, -8]}
              scale={[10, 18, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={5}
              color={DUSK.violet}
              position={[0, 16, -4]}
              scale={[30, 8, 1]}
              target={[0, 0, 0]}
            />
          </>
        )}
      </Environment>
      <directionalLight position={[-5, 6, 7]} intensity={2.4} color="#ffffff" />
      <directionalLight position={[6, -3, 6]} intensity={0.8} color="#ffd6ea" />
    </>
  );
}

/** The ticker: the coin exactly face-on, filling the frame, on nothing. */
export function TickerScene() {
  return (
    <>
      <CoinStudio />
      <group scale={3.32}>
        <Coin finish="sunset" glow={1.6} />
      </group>
    </>
  );
}

/** The same coin turned a little, to show that it is an object and not a badge. */
export function CoinHeroScene() {
  return (
    <>
      <CoinStudio side />
      <group rotation={[-0.2, 0.62, 0.06]} scale={2.9}>
        <Coin finish="sunset" glow={1.6} />
      </group>
    </>
  );
}

/** A car on the boulevard, turned by `yaw` from its catalogue pose. */
function Car({ x, z, yaw, size = 3.9 }: { x: number; z: number; yaw: number; size?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Model spec={{ ...MODELS.hypercar, size, rotation: [0, yaw, 0] }} />
    </group>
  );
}

const TAIL: readonly [number, number, number] = [5, 0.22, 0.2];
const HEAD: readonly [number, number, number] = [2.6, 2.2, 1.8];

/** A coin the size of a stadium going down at the end of the boulevard. */
export function BoulevardScene() {
  return (
    <>
      <fogExp2 attach="fog" args={['#170c26', 0.0036]} />
      <DuskSky stretch={2.5} spread={8} />
      <DuskLight spread={5} />
      <DuskLights />
      <GiantCoin radius={21.5} position={[0, -170]} glow={3.2} halo={0.3} />
      <Skyline clear={30} />
      <PalmRows from={-26} to={-180} />
      <WetGround />
      <Car x={3.5} z={-18} yaw={-Math.PI / 2 - 0.2} />
      {[2.8, 4.2].map((x) => (
        <LightTrail key={x} x={x} from={-16.2} to={22} colour={TAIL} />
      ))}
      {[-4.2, -2.8].map((x) => (
        <LightTrail key={x} x={x} y={0.5} from={-6} to={-175} colour={HEAD} />
      ))}
      <DuskGrade />
    </>
  );
}

/** The coin fallen out of the sky and stuck in the road, with a car pulled up beside it. */
export function MonolithScene() {
  return (
    <>
      <fogExp2 attach="fog" args={['#170c26', 0.0034]} />
      <DuskSky stretch={1.5} spread={5} />
      <DuskLight spread={4} panel={3} />
      <DuskLights back={3.6} fill={1.2} />
      <GiantCoin
        radius={11}
        position={[7.5, -30]}
        sink={0.3}
        glow={2.4}
        halo={0.22}
        rotation={[-0.2, -0.55, 0.14]}
      />
      <Skyline tallest={96} centres={[-520, 60]} />
      <PalmRows from={-46} to={-200} offset={15} />
      <WetGround markings={false} />
      <Car x={-3.2} z={-12} yaw={0.5} />
      <DuskGrade />
    </>
  );
}

/** Da City: a skyline whose towers are stacks of coins, standing in still water. */
export function CityScene() {
  const towers = useMemo(() => {
    const random = mulberry32(2_611);
    const built: Tower[] = [];
    for (let x = -360; x < 360; x += 11 + random() * 13) {
      // Two downtowns, either side of the middle, and low-rise between and beyond them.
      const downtown = Math.max(
        Math.exp(-(((x + 120) / 85) ** 2)),
        0.8 * Math.exp(-(((x - 150) / 70) ** 2)),
      );
      const radius = 6 + random() * 5.5;
      const height = 8 + random() * 14 + downtown * (26 + random() * 62);
      built.push({
        x,
        z: -300 - random() * 240,
        radius,
        count: Math.round(height / (COIN_PITCH * radius)),
      });
    }
    return built;
  }, []);
  // A few coins hang in the air above the tallest stacks, as if still being dealt.
  const loose = useMemo(() => {
    const random = mulberry32(88);
    return [...towers]
      .sort((a, b) => b.count * b.radius - a.count * a.radius)
      .slice(0, 6)
      .map((tower) => ({
        position: [
          tower.x + (random() - 0.5) * 4,
          tower.count * COIN_PITCH * tower.radius + tower.radius * (0.7 + random() * 1.5),
          tower.z,
        ] as const,
        rotation: [-0.9 + random() * 0.8, random() * 1.4 - 0.7, random() * 0.6 - 0.3] as const,
        radius: tower.radius,
      }));
  }, [towers]);

  return (
    <>
      <fogExp2 attach="fog" args={['#1a0d2a', 0.0011]} />
      <DuskSky stretch={2} spread={3.5} />
      <DuskLight spread={3} panel={3.2} />
      <DuskLights back={3.2} fill={1.6} />
      <CoinTowers towers={towers} turn={Math.PI / 2} />
      {loose.map((coin) => (
        <group
          key={coin.position[0]}
          position={[...coin.position]}
          rotation={[...coin.rotation]}
          scale={coin.radius}
        >
          <Coin finish="sunset" glow={2} />
        </group>
      ))}
      <WetGround kind="mirror" strength={3.4} />
      <DuskGrade bloom={0.3} />
    </>
  );
}

/** Coins falling through the last light over the bay, one of them close and sharp. */
export function SkyfallScene() {
  const coins = useMemo(() => {
    const random = mulberry32(5_150);
    return Array.from({ length: 30 }, (_, index) => {
      // Laid along a loose diagonal, so they read as one stream and not as confetti.
      const t = index / 29;
      return {
        position: [
          -30 + t * 44 + (random() - 0.5) * 16,
          22 - t * 15 + (random() - 0.5) * 9,
          -70 + t * 62 + (random() - 0.5) * 14,
        ] as const,
        rotation: [random() * 6.28, random() * 6.28, random() * 6.28] as const,
        scale: 1 + random() * 1.5,
      };
    });
  }, []);

  return (
    <>
      <fogExp2 attach="fog" args={['#1a0d2a', 0.0016]} />
      <DuskSky stretch={0.9} spread={2.6} clouds={0.75} />
      <DuskLight spread={2.4} panel={3.4} />
      <DuskLights back={3.2} fill={1.6} />
      <Skyline tallest={70} centres={[-300, 520]} />
      {coins.map((coin) => (
        <group
          key={coin.position[0]}
          position={[...coin.position]}
          rotation={[...coin.rotation]}
          scale={coin.scale}
        >
          <Coin finish="sunset" glow={1.8} />
        </group>
      ))}
      <group position={[7.4, 8.6, 4]} rotation={[-0.12, -0.5, 0.1]} scale={3.5}>
        <Coin finish="sunset" glow={2} />
      </group>
      <WetGround kind="mirror" strength={3.2} />
      <DuskGrade bloom={0.32} focus={[25, 9]} bokeh={5} />
    </>
  );
}

/** A dark studio with the dusk coming in from the back, for the pieces that are about the object. */
function Studio({ glow = 0.5, floor }: { glow?: number; floor?: number }) {
  return (
    <>
      <color attach="background" args={['#040407']} />
      <Halo
        position={[-10, 2, -16]}
        size={38}
        gain={glow}
        inner={DUSK.magenta}
        outer={DUSK.indigo}
      />
      <Halo
        position={[13, -1, -18]}
        size={30}
        gain={glow * 0.7}
        inner={DUSK.violet}
        outer={DUSK.indigo}
      />
      {floor !== undefined && <WetGround kind="mirror" y={floor} strength={2.2} />}
    </>
  );
}

/** The coin taken apart along its axis, the way a technical drawing would show it. */
export function ExplodedScene() {
  const geometry = useCoinGeometry();
  const material = useCoinMaterials('sunset', 1.8);
  const axis = useMemo(() => new THREE.Color(1.2, 1, 1.3), []);
  const GAP = 1.2;

  return (
    <>
      <Studio floor={-1.72} />
      <CoinStudio side dusk />
      <ambientLight intensity={0.5} />
      <group position={[0.5, 0.42, 0]} rotation={[0.05, -1.0, 0]} scale={1.86}>
        <mesh geometry={geometry.mark} material={material.mark} position-z={GAP * 2 + 0.05} />
        <mesh geometry={geometry.inlay} material={material.inlay} position-z={GAP} />
        <mesh geometry={geometry.disc} material={material.face} />
        <group position-z={-GAP}>
          <mesh geometry={geometry.rim} material={material.rim} />
          <mesh geometry={geometry.edge} material={material.edge} />
        </group>
        <mesh
          geometry={geometry.mark}
          material={material.mark}
          rotation-y={Math.PI}
          position-z={-GAP * 2 - 0.05}
        />
        {/* The axis everything was pulled apart along. */}
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.0028, 0.0028, GAP * 7, 6]} />
          <meshBasicMaterial color={axis} toneMapped={false} transparent opacity={0.4} />
        </mesh>
      </group>
      <DuskGrade bloom={0.3} vignette={0.6} />
    </>
  );
}

/** So close that the coin stops being a coin: reeding, brushing and the edge of the mark. */
export function MacroScene() {
  return (
    <>
      <Studio glow={0.6} />
      <CoinStudio side dusk />
      <group position={[2.4, -1.5, 0]} rotation={[-1.08, 0.1, 0.5]} scale={6.4}>
        <Coin finish="sunset" glow={1.8} />
      </group>
      <DuskGrade bloom={0.3} vignette={0.6} focus={[14.6, 2.6]} bokeh={4} />
    </>
  );
}
