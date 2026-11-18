import * as THREE from 'three';

/**
 * The dusk palette for brand and social renders: the sky over the bay in the last minutes
 * of light. The coin's `sunset` finish is anodised in the same colours.
 */
export const DUSK = {
  gold: '#ffdc93',
  amber: '#ff9d47',
  coral: '#ff6b5e',
  magenta: '#f4467f',
  violet: '#8b3bd8',
  indigo: '#2c1d7c',
  night: '#07061a',
} as const;

/** The same ramp as a CSS gradient, for type and hairlines. */
export const DUSK_CSS = `linear-gradient(100deg, ${DUSK.gold} 0%, ${DUSK.amber} 26%, ${DUSK.magenta} 62%, ${DUSK.violet} 100%)`;

const linear = (hex: string, gain = 1) => new THREE.Color(hex).multiplyScalar(gain);

export const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * The sky is a function of direction: an amber band on the horizon where the sun went down
 * (towards −Z), through magenta and violet, to night overhead and to either side. Thin cloud
 * lies across it, lit from underneath, and the first stars are out at the top.
 */
export const skyFragment = /* glsl */ `
  uniform vec3 uAmber;
  uniform vec3 uMagenta;
  uniform vec3 uViolet;
  uniform vec3 uIndigo;
  uniform vec3 uNight;
  uniform float uGain;
  uniform float uSpread;
  uniform float uStretch;
  uniform float uClouds;
  varying vec3 vDirection;

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
  float fbm(vec2 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 6; octave++) {
      sum += valueNoise(p) * amplitude;
      p = p * 2.03 + vec2(17.1, 9.2);
      amplitude *= 0.5;
    }
    return sum;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float height = abs(dir.y) * uStretch;
    // 1 looking at where the sun set, 0 at right angles to it.
    float toSun = max(dot(normalize(dir.xz + vec2(0.0, -1e-4)), vec2(0.0, -1.0)), 0.0);
    float near = pow(toSun, uSpread);
    float wide = pow(toSun, uSpread * 0.3);

    vec3 color = uNight;
    color = mix(color, uIndigo, smoothstep(0.7, 0.14, height) * mix(0.35, 1.0, wide));
    color = mix(color, uViolet, smoothstep(0.36, 0.06, height) * mix(0.12, 1.0, wide));
    color = mix(color, uMagenta, smoothstep(0.19, 0.02, height) * mix(0.03, 1.0, near));
    color = mix(color, uAmber, smoothstep(0.08, 0.0, height) * near);

    if (dir.y > 0.0) {
      // Cloud is drawn on a ceiling far overhead, so it flattens into streaks at the horizon.
      vec2 ceiling = dir.xz / (dir.y + 0.09);
      float cover = fbm(ceiling * vec2(0.22, 0.62) + vec2(4.0, 1.5));
      cover = smoothstep(0.5, 0.74, cover) * smoothstep(0.0, 0.035, dir.y);
      vec3 lit = mix(uIndigo * 0.55, mix(uMagenta, uAmber, 0.55) * 1.2, near);
      lit = mix(lit, uNight, smoothstep(0.12, 0.5, height));
      color = mix(color, lit, cover * uClouds);

      // Stars, only where the sky has gone dark.
      vec2 cell = dir.xz / (dir.y + 0.4) * 190.0;
      float star = step(0.9975, hash21(floor(cell))) * smoothstep(0.34, 0.9, height);
      color += vec3(0.75, 0.8, 1.0) * star * (1.0 - cover) * 0.5 * hash21(floor(cell) + 7.0);
    }

    // Below the horizon there is only the dark ground, kept faintly lit for reflections.
    color *= dir.y < 0.0 ? 0.16 : 1.0;
    gl_FragColor = vec4(color * uGain, 1.0);
  }
`;

export interface SkyOptions {
  gain?: number;
  /** How tightly the afterglow hugs the direction of the sun. */
  spread?: number;
  /** Squeezes the whole gradient towards the horizon, for long lenses that see little sky. */
  stretch?: number;
  clouds?: number;
}

export function skyUniforms({ gain = 1, spread = 2.6, stretch = 1, clouds = 0.6 }: SkyOptions) {
  return {
    uAmber: { value: linear(DUSK.amber, 1.5) },
    uMagenta: { value: linear(DUSK.magenta, 1.05) },
    uViolet: { value: linear(DUSK.violet, 0.62) },
    uIndigo: { value: linear(DUSK.indigo, 0.5) },
    uNight: { value: linear(DUSK.night, 0.75) },
    uGain: { value: gain },
    uSpread: { value: spread },
    uStretch: { value: stretch },
    uClouds: { value: clouds },
  };
}
