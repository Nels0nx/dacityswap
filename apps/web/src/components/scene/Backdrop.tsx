'use client';

import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ACCENT, CAMERA_FOV, CAMERA_REST, DESKTOP_BREAKPOINT, SIDE_WIDTH } from './constants';

/**
 * The sky and the far city: a photograph of Miami at dusk, standing at the far end of a wet
 * road that reflects it in real time. The photo is kept soft on purpose, the way
 * a lens focused on the stage would render the background.
 *
 * Photo: public domain (CC0), via rawpixel. See /CREDITS.md.
 */
const PHOTO = '/scene/miami-dusk.jpg';
const PHOTO_ASPECT = 3200 / 2134;
/** Where the ground meets the buildings in the photo, measured from its bottom edge (0–1). */
const WATERLINE = 0.24;
const PLANE_Z = -260;

const photoVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRADE_GLSL = /* glsl */ `
  uniform vec3 uAccent;

  // A 9-tap blur: background defocus, and it hides the limits of the source photo.
  vec3 soft(sampler2D map, vec2 uv, float radius) {
    vec2 r = vec2(radius, radius * 1.5);
    vec3 sum = texture2D(map, uv).rgb * 0.25;
    sum += (texture2D(map, uv + vec2(r.x, 0.0)).rgb + texture2D(map, uv - vec2(r.x, 0.0)).rgb
          + texture2D(map, uv + vec2(0.0, r.y)).rgb + texture2D(map, uv - vec2(0.0, r.y)).rgb) * 0.125;
    sum += (texture2D(map, uv + r).rgb + texture2D(map, uv - r).rgb
          + texture2D(map, uv + vec2(r.x, -r.y)).rgb + texture2D(map, uv + vec2(-r.x, r.y)).rgb) * 0.0625;
    return sum;
  }

  // One grade for the photo and for its reflection, so the two always match.
  vec3 grade(vec3 c) {
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(luma), c, 1.18);                 // a little more colour in the sky
    c = pow(max(c, 0.0), vec3(1.06)) * 1.62;      // deeper blacks, brighter dusk
    return c + uAccent * 0.006 * (1.0 - luma);    // the faintest cool lift in the shadows
  }
`;

const photoFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  ${GRADE_GLSL}

  void main() {
    vec3 color = grade(soft(uMap, vUv, 0.0011));
    // Let the frame fall off to black at the top and the sides.
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(1.0, 0.7, vUv.y);
    gl_FragColor = vec4(color * mix(0.3, 1.0, edge), 1.0);
  }
`;

const waterVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec4 uPlane; // centre x, centre y, width, height of the photo plane
  uniform float uPlaneZ;
  varying vec3 vWorld;
  ${GRADE_GLSL}

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 toCamera = cameraPosition - vWorld;
    float dist = length(toCamera);
    vec3 V = toCamera / dist;
    vec2 p = vWorld.xz;

    // A street after rain: shallow puddles lie like mirrors, the asphalt between them is duller.
    float puddle = smoothstep(0.38, 0.72, valueNoise(p * 0.11) * 0.7 + valueNoise(p * 0.37) * 0.3);
    float calm = smoothstep(6.0, 220.0, dist);
    vec2 ripple = vec2(
      sin(p.x * 1.7 + uTime * 0.6) * cos(p.y * 0.9 - uTime * 0.4),
      cos(p.y * 1.3 + uTime * 0.5) * sin(p.x * 1.1 + uTime * 0.3)
    );
    float roughness = mix(0.05, 0.012, puddle);
    vec3 N = normalize(vec3(ripple.x * roughness, 1.0, ripple.y * roughness * mix(2.4, 0.6, calm)));

    // Follow the reflected ray to the photo plane and sample the sky there.
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    float t = (uPlaneZ - vWorld.z) / min(R.z, -0.0001);
    vec3 hit = vWorld + R * t;
    vec2 uv = vec2((hit.x - uPlane.x) / uPlane.z + 0.5, (hit.y - uPlane.y) / uPlane.w + 0.5);
    vec3 reflection = grade(soft(uMap, clamp(uv, 0.004, 0.996), mix(0.008, 0.0035, puddle)));

    float fresnel = mix(0.16, 0.9, pow(1.0 - max(dot(N, V), 0.0), 3.0));
    vec3 asphalt = vec3(0.011, 0.011, 0.013) * (0.7 + 0.6 * hash21(floor(p * 28.0)));
    vec3 color = asphalt + reflection * fresnel * mix(0.34, 0.86, puddle);

    // Lane markings: dashed lines either side of the centre lane, solid lines at the kerbs.
    float lane = abs(p.x);
    float aa = 0.02 + dist * 0.0012;
    float dashed = (1.0 - smoothstep(0.08, 0.08 + aa, abs(lane - 3.4))) * step(fract(p.y / 9.0), 0.4);
    float kerb = 1.0 - smoothstep(0.1, 0.1 + aa, abs(lane - 7.6));
    float paint = max(dashed, kerb) * smoothstep(210.0, 30.0, dist) * (0.75 + 0.25 * hash21(floor(p * 9.0)));
    color = mix(color, vec3(0.34, 0.31, 0.25) + reflection * 0.25, paint * 0.5);

    // The road nearest the camera sinks into darkness.
    color *= mix(0.45, 1.0, smoothstep(2.0, 40.0, dist));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function Backdrop() {
  const map = useTexture(PHOTO, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  });
  const size = useThree((state) => state.size);

  // Size the photo so it always covers the frame, with room for parallax and the panel offset.
  const plane = useMemo(() => {
    const distance = CAMERA_REST.z - PLANE_Z;
    const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const visibleWidth = visibleHeight * (size.width / size.height);
    const desktop = size.width >= DESKTOP_BREAKPOINT;
    const shift = desktop ? (SIDE_WIDTH / 2 / size.width) * visibleWidth : 0;
    const width = Math.max(visibleWidth * 1.1 + shift, visibleHeight * 1.05 * PHOTO_ASPECT);
    const height = width / PHOTO_ASPECT;
    return { x: shift * 0.6, y: height * (0.5 - WATERLINE), width, height };
  }, [size.width, size.height]);

  const photoUniforms = useMemo(
    () => ({ uMap: { value: map }, uAccent: { value: ACCENT } }),
    [map],
  );
  const waterUniforms = useMemo(
    () => ({
      uMap: { value: map },
      uAccent: { value: ACCENT },
      uTime: { value: 0 },
      uPlane: { value: new THREE.Vector4() },
      uPlaneZ: { value: PLANE_Z },
    }),
    [map],
  );

  useFrame((state) => {
    waterUniforms.uTime.value = state.clock.elapsedTime;
    waterUniforms.uPlane.value.set(plane.x, plane.y, plane.width, plane.height);
  });

  return (
    <>
      <mesh
        position={[plane.x, plane.y, PLANE_Z]}
        scale={[plane.width, plane.height, 1]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={photoVertex}
          fragmentShader={photoFragment}
          uniforms={photoUniforms}
        />
      </mesh>

      <mesh
        rotation-x={-Math.PI / 2}
        position={[plane.x, 0, (PLANE_Z + 30) / 2]}
        frustumCulled={false}
      >
        <planeGeometry args={[plane.width * 1.3, 30 - PLANE_Z]} />
        <shaderMaterial
          vertexShader={waterVertex}
          fragmentShader={waterFragment}
          uniforms={waterUniforms}
        />
      </mesh>
    </>
  );
}
