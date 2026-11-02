/**
 * MAT_LIQUID_GLASS_SHELL — single authority for every containment sphere shell.
 * Source: public/design-system/material-registry.json + design_tokens.json materials.liquidGlass
 * Do not invent alternate transmission / IOR / thickness recipes per sphere.
 */
import * as THREE from 'three';

export const MAT_LIQUID_GLASS_SHELL_ID = 'MAT_LIQUID_GLASS_SHELL' as const;

/** Locked parameters from material-registry.json (scene-scale thickness 2.8). */
export const MAT_LIQUID_GLASS_SHELL = {
  id: MAT_LIQUID_GLASS_SHELL_ID,
  color: '#0A1218',
  transmission: 0.96,
  roughness: 0.04,
  metalness: 0,
  ior: 1.52,
  thickness: 2.8,
  clearcoat: 0.9,
  clearcoatRoughness: 0.06,
  attenuationColor: '#101D27',
  attenuationDistance: 3.4,
  specularColor: '#B4DDFF',
  transparent: true,
} as const;

export type LiquidGlassShellOptions = {
  /** Software WebGL / no-transmission fallback. */
  softwareGl?: boolean;
  /** Front shell vs interior back faces of the same recipe. */
  side?: THREE.Side;
  /**
   * Back-face shells keep the same transmission recipe; only attenuation deepens
   * slightly so the shell still reads as one fluid volume.
   */
  face?: 'front' | 'back';
};

export function createMatLiquidGlassShell(
  options: LiquidGlassShellOptions = {}
): THREE.MeshPhysicalMaterial {
  const softwareGl = Boolean(options.softwareGl);
  const face = options.face ?? 'front';
  const side = options.side ?? (face === 'back' ? THREE.BackSide : THREE.FrontSide);
  const attenuation =
    face === 'back'
      ? new THREE.Color(0x05090e)
      : new THREE.Color(MAT_LIQUID_GLASS_SHELL.attenuationColor);

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MAT_LIQUID_GLASS_SHELL.color),
    metalness: MAT_LIQUID_GLASS_SHELL.metalness,
    roughness: MAT_LIQUID_GLASS_SHELL.roughness,
    ior: MAT_LIQUID_GLASS_SHELL.ior,
    transmission: softwareGl ? 0 : MAT_LIQUID_GLASS_SHELL.transmission,
    thickness: MAT_LIQUID_GLASS_SHELL.thickness,
    attenuationColor: attenuation,
    attenuationDistance: MAT_LIQUID_GLASS_SHELL.attenuationDistance,
    clearcoat: MAT_LIQUID_GLASS_SHELL.clearcoat,
    clearcoatRoughness: MAT_LIQUID_GLASS_SHELL.clearcoatRoughness,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(MAT_LIQUID_GLASS_SHELL.specularColor),
    transparent: true,
    // Registry has no separate opacity — fluid look comes from transmission.
    // Software GL needs a translucent fallback when transmission is unavailable.
    opacity: softwareGl ? (face === 'back' ? 0.16 : 0.28) : 1,
    side,
    depthWrite: false,
  });
}
