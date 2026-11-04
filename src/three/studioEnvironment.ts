import * as THREE from 'three';

/**
 * Neutral dark-space studio IBL configuration — eliminates real-world exterior
 * reflections (trees/facades) and harsh white room boxes while preserving subtle
 * depth and rim contour on all four liquid-glass spheres.
 */
export const NEUTRAL_STUDIO_ENV_CONFIG = {
  blurSigma: 0.12,
  environmentIntensity: 0.35,
  backgroundBlurriness: 0.8,
  skyZenithColor: 0x142632,
  horizonBandColor: 0x0d1822,
  nadirVoidColor: 0x05090e,
} as const;

export function applyNeutralStudioEnvironment(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer | null
): THREE.Texture | null {
  const sceneWithIntensity = scene as THREE.Scene & {
    environmentIntensity?: number;
    backgroundBlurriness?: number;
  };
  sceneWithIntensity.environmentIntensity = NEUTRAL_STUDIO_ENV_CONFIG.environmentIntensity;
  sceneWithIntensity.backgroundBlurriness = NEUTRAL_STUDIO_ENV_CONFIG.backgroundBlurriness;

  if (!renderer) return scene.environment;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();

  const studioEnvScene = new THREE.Scene();
  studioEnvScene.background = new THREE.Color(NEUTRAL_STUDIO_ENV_CONFIG.nadirVoidColor);

  const hemi = new THREE.HemisphereLight(
    NEUTRAL_STUDIO_ENV_CONFIG.skyZenithColor,
    NEUTRAL_STUDIO_ENV_CONFIG.nadirVoidColor,
    0.55
  );
  studioEnvScene.add(hemi);

  // Uniform dark-space studio dome with zero bright softboxes, rings, or exterior reflections
  const domeGeo = new THREE.SphereGeometry(24, 32, 24);
  const domeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(NEUTRAL_STUDIO_ENV_CONFIG.horizonBandColor),
    side: THREE.BackSide,
  });
  studioEnvScene.add(new THREE.Mesh(domeGeo, domeMat));

  const envRT = pmremGenerator.fromScene(
    studioEnvScene,
    NEUTRAL_STUDIO_ENV_CONFIG.blurSigma
  );
  const prevEnv = scene.environment;
  scene.environment = envRT.texture;

  domeGeo.dispose();
  domeMat.dispose();
  pmremGenerator.dispose();
  if (prevEnv && prevEnv !== envRT.texture) {
    prevEnv.dispose();
  }

  return envRT.texture;
}
