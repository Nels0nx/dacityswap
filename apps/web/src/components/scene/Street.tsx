'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '@/lib/rng';

/**
 * The boulevard: real geometry between the camera and the photograph. Two rows of palms and
 * street lamps run to the vanishing point, which gives the scene depth and parallax that a
 * flat backdrop cannot. Everything here is generated; there are no models to download.
 */

/** One palm as a single position/normal geometry: a tapered trunk and a crown of drooping fronds. */
export function buildPalm(seed: number, height: number, lean: number): THREE.BufferGeometry {
  const random = mulberry32(seed);
  const vertices: number[] = [];
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.2, 0),
    new THREE.Vector3(lean * 0.2, height * 0.35, 0),
    new THREE.Vector3(lean * 0.65, height * 0.72, 0),
    new THREE.Vector3(lean, height, 0),
  ]);
  const rings = 14;
  const sides = 6;
  const ring = (index: number) => {
    const t = index / rings;
    const centre = curve.getPoint(t);
    const radius = THREE.MathUtils.lerp(0.26, 0.12, t);
    return Array.from({ length: sides }, (_, side) => {
      const angle = (side / sides) * Math.PI * 2;
      return new THREE.Vector3(
        centre.x + Math.cos(angle) * radius,
        centre.y,
        centre.z + Math.sin(angle) * radius,
      );
    });
  };
  for (let index = 0; index < rings; index++) {
    const lower = ring(index);
    const upper = ring(index + 1);
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      triangle(lower[side]!, lower[next]!, upper[side]!);
      triangle(lower[next]!, upper[next]!, upper[side]!);
    }
  }

  const crown = curve.getPoint(1);
  const up = new THREE.Vector3(0, 1, 0);
  const fronds = 13;
  for (let frond = 0; frond < fronds; frond++) {
    const azimuth = (frond / fronds) * Math.PI * 2 + random() * 0.4;
    const out = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    const side = new THREE.Vector3(-Math.sin(azimuth), 0, Math.cos(azimuth));
    const length = 3.1 + random() * 1.3;
    const lift = 0.15 + random() * 0.75;
    const droop = 0.85 + random() * 0.55;
    const rib = (t: number) =>
      crown
        .clone()
        .addScaledVector(out, length * t)
        .addScaledVector(up, length * (lift * t - droop * t * t));

    const segments = 16;
    for (let segment = 0; segment < segments; segment++) {
      const a = rib(segment / segments);
      const b = rib((segment + 1) / segments);
      const t = segment / segments;
      const thickness = 0.04 * (1 - t) + 0.01;
      triangle(
        a.clone().addScaledVector(up, thickness),
        b,
        a.clone().addScaledVector(up, -thickness),
      );

      const tangent = b.clone().sub(a).normalize();
      const leaf = length * 0.36 * Math.sin(Math.PI * (0.1 + 0.86 * t)) + 0.05;
      const root = tangent.clone().multiplyScalar(length * 0.036);
      for (const direction of [-1, 1]) {
        const tip = a
          .clone()
          .addScaledVector(tangent, leaf * 0.42)
          .addScaledVector(side, direction * leaf * 0.72)
          .addScaledVector(up, -leaf * 0.58);
        triangle(a.clone().sub(root), a.clone().add(root), tip);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

interface PalmPlacement {
  x: number;
  z: number;
  variant: number;
  scale: number;
  turn: number;
  phase: number;
}

const ROAD_HALF_WIDTH = 10.5;
const LAMP_OFFSET = 8.6;

function layoutPalms(): PalmPlacement[] {
  const random = mulberry32(9_401);
  const palms: PalmPlacement[] = [];
  for (const side of [-1, 1]) {
    for (let z = -9; z > -150; z -= 11 + random() * 7) {
      palms.push({
        x: side * (ROAD_HALF_WIDTH + random() * 3.5),
        z,
        variant: Math.floor(random() * 3),
        scale: 0.85 + random() * 0.4,
        turn: random() * Math.PI * 2,
        phase: random() * 10,
      });
    }
  }
  return palms;
}

export function Street() {
  const variants = useMemo(
    () => [buildPalm(11, 10.5, 1.4), buildPalm(23, 12.5, -1.1), buildPalm(37, 9.2, 0.7)],
    [],
  );
  const palms = useMemo(() => layoutPalms(), []);
  const lamps = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        side: index % 2 === 0 ? -1 : 1,
        z: -10 - index * 14,
      })),
    [],
  );
  const group = useRef<THREE.Group>(null);
  // HDR colour so the bulbs bloom like sodium lamps.
  const bulb = useMemo(() => new THREE.Color(3.2, 2.1, 1.0), []);

  // A slow sea breeze: each palm rocks a degree or so, out of step with its neighbours.
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    group.current?.children.forEach((palm, index) => {
      const phase = palms[index]?.phase ?? 0;
      palm.rotation.z = Math.sin(time * 0.55 + phase) * 0.018;
      palm.rotation.x = Math.cos(time * 0.4 + phase * 1.7) * 0.012;
    });
  });

  return (
    <>
      <group ref={group}>
        {palms.map((palm) => (
          <mesh
            key={`${palm.x}:${palm.z}`}
            geometry={variants[palm.variant]}
            position={[palm.x, 0, palm.z]}
            rotation-y={palm.turn}
            scale={palm.scale}
          >
            <meshStandardMaterial
              color="#0d0907"
              roughness={0.95}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {lamps.map((lamp) => (
        <group key={lamp.z} position={[lamp.side * LAMP_OFFSET, 0, lamp.z]}>
          <mesh position={[0, 3.6, 0]}>
            <cylinderGeometry args={[0.05, 0.09, 7.2, 8]} />
            <meshStandardMaterial color="#0c0c0e" roughness={0.6} metalness={0.6} />
          </mesh>
          <mesh position={[-lamp.side * 0.7, 7.15, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.035, 0.035, 1.4, 6]} />
            <meshStandardMaterial color="#0c0c0e" roughness={0.6} metalness={0.6} />
          </mesh>
          <mesh position={[-lamp.side * 1.35, 7.05, 0]}>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshBasicMaterial color={bulb} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
