'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { ACCENT } from './constants';

/**
 * The DacitySwap coin.
 *
 * Machined metal with a polished rim and mark, in four finishes. The mark is a "D" crossed by a
 * vertical stroke, the way currency symbols are. Everything is geometry: the brushed look
 * comes from real concentric grooves and the edge is really reeded, so it holds up at any size.
 */
export function useCoinGeometry() {
  return useMemo(() => {
    const v = (x: number, y: number) => new THREE.Vector2(x, y);
    const HALF = 0.05;

    // Face: concentric grooves from the centre out to the inlay channel.
    const front: THREE.Vector2[] = [v(0, HALF)];
    for (let r = 0.1; r < 0.73; r += 0.0125) {
      front.push(v(r, HALF), v(r + 0.00625, HALF - 0.0035));
    }
    front.push(v(0.745, HALF), v(0.762, 0.044), v(0.8, 0.044));
    const back = front.map((point) => v(point.x, -point.y)).reverse();
    const disc = new THREE.LatheGeometry([...front, ...back], 160);

    const inlay = new THREE.LatheGeometry(
      [v(0.762, 0.047), v(0.784, 0.047), v(0.784, -0.047), v(0.762, -0.047)],
      160,
    );

    const rim = new THREE.LatheGeometry(
      [
        v(0.8, 0.058),
        v(0.825, 0.078),
        v(0.955, 0.078),
        v(0.985, 0.058),
        v(0.985, -0.058),
        v(0.955, -0.078),
        v(0.825, -0.078),
        v(0.8, -0.058),
        v(0.8, 0.058),
      ],
      200,
    );

    // Reeded edge: alternate columns of a cylinder are pushed in and out.
    const edge = new THREE.CylinderGeometry(0.99, 0.99, 0.104, 360, 1, true);
    const position = edge.getAttribute('position');
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const column = Math.round((Math.atan2(z, x) / (Math.PI * 2)) * 360);
      const radius = 0.99 + (column % 2 === 0 ? 0.006 : -0.004);
      const length = Math.hypot(x, z);
      position.setX(index, (x / length) * radius);
      position.setZ(index, (z / length) * radius);
    }
    edge.computeVertexNormals();

    for (const geometry of [disc, inlay, rim, edge]) geometry.rotateX(Math.PI / 2);

    // The mark. A "D" carries its weight in the stem, so its outline is nudged right of the
    // geometric centre until its centroid sits on the coin's axis. The stroke runs through that axis.
    const DX = 0.045;
    const letter = new THREE.Shape();
    letter.moveTo(-0.36 + DX, -0.42);
    letter.lineTo(-0.06 + DX, -0.42);
    letter.absarc(-0.06 + DX, 0, 0.42, -Math.PI / 2, Math.PI / 2, false);
    letter.lineTo(-0.36 + DX, 0.42);
    letter.closePath();
    const counter = new THREE.Path();
    counter.moveTo(-0.17 + DX, -0.23);
    counter.lineTo(-0.06 + DX, -0.23);
    counter.absarc(-0.06 + DX, 0, 0.23, -Math.PI / 2, Math.PI / 2, false);
    counter.lineTo(-0.17 + DX, 0.23);
    counter.closePath();
    letter.holes.push(counter);

    const stroke = (fromY: number, toY: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.045, fromY);
      shape.lineTo(0.045, fromY);
      shape.lineTo(0.045, toY);
      shape.lineTo(-0.045, toY);
      shape.closePath();
      return shape;
    };

    const mark = new THREE.ExtrudeGeometry([letter, stroke(0.4, 0.56), stroke(-0.56, -0.4)], {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 48,
    });

    return { disc, inlay, rim, edge, mark };
  }, []);
}

export type CoinFinish = 'titanium' | 'black-gold' | 'gold' | 'sunset';

const FINISHES: Record<
  Exclude<CoinFinish, 'sunset'>,
  { face: string; metal: string; edge: string; mark: string }
> = {
  titanium: { face: '#15171b', metal: '#aeb5bf', edge: '#8d949e', mark: '#c4cad3' },
  'black-gold': { face: '#121214', metal: '#e0b25c', edge: '#b88d3f', mark: '#f0c56e' },
  gold: { face: '#b98d3c', metal: '#f0c56e', edge: '#c89a45', mark: '#ffe09a' },
};

/** Dusk over the bay, top to bottom: the colours the `sunset` finish is anodised in. */
export const DUSK_STOPS = ['#ffcf74', '#ff8b3d', '#f43d7c', '#a03be2', '#4a2fd0'] as const;

interface DuskOptions {
  /** How much of the colour the surface keeps: low for the deep face, high for polished parts. */
  gain: number;
  /** Mixes the ramp towards white, for parts that should read as bright metal. */
  lift?: number;
  /** Light the surface gives off in its own colour, so it stays rich where reflections are dark. */
  glow?: number;
}

/**
 * Colours a material with the dusk ramp, running down the coin in its own space, so the
 * gradient is part of the metal and turns with it. The face, rim, edge and mark all share
 * one ramp and line up across their seams.
 */
function anodise<T extends THREE.Material>(material: T, { gain, lift = 0, glow = 0 }: DuskOptions) {
  const white = new THREE.Color('#ffffff');
  const stops = DUSK_STOPS.map((hex) => new THREE.Color(hex).lerp(white, lift));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uStops = { value: stops };
    shader.uniforms.uGain = { value: gain };
    shader.uniforms.uGlow = { value: glow };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDusk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDusk = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying float vDusk;
        uniform vec3 uStops[5];
        uniform float uGain;
        uniform float uGlow;
        vec3 duskRamp(float t) {
          // Straight segments: easing each one would leave a flat band at every stop.
          float x = clamp(t, 0.0, 1.0) * 4.0;
          vec3 c = mix(uStops[0], uStops[1], clamp(x, 0.0, 1.0));
          c = mix(c, uStops[2], clamp(x - 1.0, 0.0, 1.0));
          c = mix(c, uStops[3], clamp(x - 2.0, 0.0, 1.0));
          return mix(c, uStops[4], clamp(x - 3.0, 0.0, 1.0));
        }`,
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nvec3 dusk = duskRamp(0.5 - vDusk * 0.5);\ndiffuseColor.rgb *= dusk * uGain;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += dusk * uGlow;',
      );
  };
  material.customProgramCacheKey = () => 'dusk';
  return material;
}

function buildMaterials(finish: CoinFinish, glow: number) {
  const side = THREE.DoubleSide;

  if (finish === 'sunset') {
    return {
      face: anodise(
        // Brushed in circles: the highlight smears across the grooves, towards the centre,
        // and falls as the two wedges of light a machined dial has.
        new THREE.MeshPhysicalMaterial({
          metalness: 1,
          roughness: 0.3,
          anisotropy: 0.85,
          anisotropyRotation: Math.PI / 2,
          clearcoat: 0.15,
          clearcoatRoughness: 0.25,
          envMapIntensity: 1.5,
          side,
        }),
        { gain: 0.62, glow: 0.05 * glow },
      ),
      rim: anodise(
        new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.16, envMapIntensity: 1, side }),
        { gain: 1, lift: 0.1, glow: 0.07 * glow },
      ),
      edge: anodise(
        new THREE.MeshStandardMaterial({
          metalness: 1,
          roughness: 0.3,
          envMapIntensity: 0.9,
          side,
        }),
        { gain: 0.8, glow: 0.04 * glow },
      ),
      inlay: anodise(new THREE.MeshBasicMaterial({ toneMapped: false, side }), {
        gain: 0.9,
        lift: 0.15,
      }),
      mark: anodise(
        new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.14, envMapIntensity: 1.05 }),
        { gain: 1, lift: 0.6, glow: 0.09 * glow },
      ),
    };
  }

  const colours = FINISHES[finish];
  const inlay =
    finish === 'titanium'
      ? ACCENT.clone().multiplyScalar(0.5)
      : new THREE.Color('#ffd27a').multiplyScalar(0.55);
  return {
    face: new THREE.MeshPhysicalMaterial({
      color: colours.face,
      metalness: 1,
      roughness: finish === 'gold' ? 0.3 : 0.44,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.7,
      side,
    }),
    rim: new THREE.MeshStandardMaterial({
      color: colours.metal,
      metalness: 1,
      roughness: 0.2,
      envMapIntensity: 0.85,
      side,
    }),
    edge: new THREE.MeshStandardMaterial({
      color: colours.edge,
      metalness: 1,
      roughness: 0.3,
      envMapIntensity: 0.9,
      side,
    }),
    inlay: new THREE.MeshBasicMaterial({ color: inlay, toneMapped: false, side }),
    mark: new THREE.MeshStandardMaterial({
      color: colours.mark,
      metalness: 1,
      roughness: 0.17,
      envMapIntensity: 0.95,
    }),
  };
}

/** The coin's five materials. `glow` scales the light the `sunset` finish gives off. */
export function useCoinMaterials(finish: CoinFinish = 'titanium', glow = 1) {
  return useMemo(() => buildMaterials(finish, glow), [finish, glow]);
}

export function Coin({ finish = 'titanium', glow = 1 }: { finish?: CoinFinish; glow?: number }) {
  const geometry = useCoinGeometry();
  const material = useCoinMaterials(finish, glow);

  return (
    <>
      <mesh geometry={geometry.disc} material={material.face} />
      <mesh geometry={geometry.rim} material={material.rim} />
      <mesh geometry={geometry.edge} material={material.edge} />
      <mesh geometry={geometry.inlay} material={material.inlay} />
      {[0, Math.PI].map((turn) => (
        <mesh
          key={turn}
          geometry={geometry.mark}
          material={material.mark}
          rotation-y={turn}
          position-z={turn === 0 ? 0.05 : -0.05}
        />
      ))}
    </>
  );
}
