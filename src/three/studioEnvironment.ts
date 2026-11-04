import * as THREE from 'three';

/**
 * Neutral dark-space studio IBL configuration — eliminates real-world exterior
 * reflections (trees/facades) and harsh white room boxes while preserving subtle
 * depth and rim contour on all four liquid-glass spheres.
 */
export const NEUTRAL_STUDIO_ENV_CONFIG = {
  blurSigma: 0.12,
  environmentIntensity: 0.75,
  backgroundBlurriness: 0.8,
  skyZenithColor: 0x2a3f9a,
  horizonBandColor: 0x101a45,
  nadirVoidColor: 0x04061a,
  accentPanelColor: 0x5cc8ff,
  warmPanelColor: 0xffd9a0,
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

  // Two small cool light cards give the glass crisp specular highlights to catch.
  const panelGeo = new THREE.PlaneGeometry(22, 7);
  const panelMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(NEUTRAL_STUDIO_ENV_CONFIG.accentPanelColor).multiplyScalar(1.15),
    side: THREE.DoubleSide,
  });
  const panelA = new THREE.Mesh(panelGeo, panelMat);
  panelA.position.set(-12, 11, 10);
  panelA.lookAt(0, 0, 0);
  const panelB = new THREE.Mesh(panelGeo, panelMat);
  panelB.position.set(13, -5, -12);
  panelB.lookAt(0, 0, 0);
  const warmMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(NEUTRAL_STUDIO_ENV_CONFIG.warmPanelColor).multiplyScalar(0.9),
    side: THREE.DoubleSide,
  });
  const panelC = new THREE.Mesh(panelGeo, warmMat);
  panelC.position.set(4, 14, -14);
  panelC.lookAt(0, 0, 0);
  studioEnvScene.add(panelA, panelB, panelC);

  const envRT = pmremGenerator.fromScene(
    studioEnvScene,
    NEUTRAL_STUDIO_ENV_CONFIG.blurSigma
  );
  const prevEnv = scene.environment;
  scene.environment = envRT.texture;

  domeGeo.dispose();
  panelGeo.dispose();
  panelMat.dispose();
  warmMat.dispose();
  domeMat.dispose();
  pmremGenerator.dispose();
  if (prevEnv && prevEnv !== envRT.texture) {
    prevEnv.dispose();
  }

  return envRT.texture;
}
