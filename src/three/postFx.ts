import * as THREE from 'three';
import type { DeviceProfile } from './deviceProfile';

/** Approved post-processing numbers. Bloom is banned (L10); only depth of field and a vignette run. */
export const POST_FX = {
  depthOfField: { focalLength: 0.02, bokehScale: 1, height: 480 },
  vignette: { offset: 0.1, darkness: 1.1 },
} as const;

/** Flat near-black scene ground shared by every WebGL canvas (clear colour, background and fog). */
export const SCENE_VOID_HEX = '#050505';

/** BokehPass works in world units; these scales convert the normalized focalLength/bokehScale values. */
const APERTURE_PER_FOCAL_LENGTH = 0.0125;
const MAX_BLUR_PER_BOKEH_SCALE = 0.005;

export interface PostFxPlan {
  depthOfField: boolean;
  vignette: boolean;
}

/**
 * Depth of field renders the scene a second time for depth, so only the desktop tier pays for it.
 * The vignette is a single full-screen pass and runs on every GPU tier.
 */
export function resolvePostFxPlan(profile: Pick<DeviceProfile, 'tier'>, softwareGl: boolean): PostFxPlan {
  if (softwareGl) return { depthOfField: false, vignette: false };
  return { depthOfField: profile.tier === 'desktop', vignette: true };
}

export interface BokehParams {
  focus: number;
  aperture: number;
  maxblur: number;
}

export function bokehParams(focusDistance: number): BokehParams {
  return {
    focus: Math.max(0.1, focusDistance),
    aperture: POST_FX.depthOfField.focalLength * APERTURE_PER_FOCAL_LENGTH,
    maxblur: POST_FX.depthOfField.bokehScale * MAX_BLUR_PER_BOKEH_SCALE,
  };
}

/** Same falloff as the non-Eskil vignette in postprocessing's VignetteEffect. */
export const VignetteShader = {
  name: 'VignetteShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: POST_FX.vignette.offset },
    darkness: { value: POST_FX.vignette.darkness },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= smoothstep(0.8, offset * 0.799, d * (darkness + offset));
      gl_FragColor = color;
    }
  `,
};
