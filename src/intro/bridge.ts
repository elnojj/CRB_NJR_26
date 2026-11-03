/**
 * Cerebro Stellar intro bridge — deliberately spawns ZERO background media.
 * No video-wrap meshes, sphere wraps, or background media discs.
 * The shared ExperienceCanvas owns all WebGL media surfaces.
 */

export const INTRO_SPAWN_VIDEO_WRAPS = false;
export const INTRO_SPAWN_SPHERE_WRAPS = false;
export const INTRO_SPAWN_BACKGROUND_MEDIA_DISCS = false;

export type IntroMediaSpawn = never;

/** Called by intro overlays; must return an empty spawn list. */
export function spawnIntroBackgroundMedia(_scene?: unknown): IntroMediaSpawn[] {
  return [];
}

export function assertIntroBridgeClean(): void {
  if (INTRO_SPAWN_VIDEO_WRAPS || INTRO_SPAWN_SPHERE_WRAPS || INTRO_SPAWN_BACKGROUND_MEDIA_DISCS) {
    throw new Error('intro/bridge must not enable background media wraps');
  }
  if (spawnIntroBackgroundMedia().length !== 0) {
    throw new Error('intro/bridge must spawn zero media wraps');
  }
}
