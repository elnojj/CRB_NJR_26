import * as THREE from 'three';
import { PITCH_BEATS } from '../../data/pitchBeats';
import type { MediaPlaybackManager } from '../mediaPlayback';
import { BeatsTimelineContainer } from './BeatsTimelineContainer';
import type { BeatPlacement, BeatSlotFactories } from './beatTypes';
import { ENTER_AT } from './beatJourney';
import { pitchContentProvider, pitchRamp } from './pitchContent';
import { resolvePitchPlacement } from './pitchStageLayout';

export const PITCH_STAGE_NAME = 'PitchStage';

export interface PitchStageOptions {
  playback: MediaPlaybackManager;
  factories?: Partial<BeatSlotFactories>;
}

/**
 * The pitch's kinetic copy, honest media cards and structural metric labels, standing at each beat's
 * registry anchor inside the connected network. It adds no renderer, scene or camera of its own: the host
 * scene owns those, and this stage only contributes one group of content.
 */
export class PitchStage {
  readonly group = new THREE.Group();
  readonly beats: BeatsTimelineContainer;
  private activeIndex: number | null = null;

  constructor(options: PitchStageOptions) {
    this.group.name = PITCH_STAGE_NAME;
    const placements: BeatPlacement[] = PITCH_BEATS.map((beat, index) => {
      const placed = resolvePitchPlacement(beat);
      if (!placed) throw new Error(`Pitch beat ${beat.jId} target ${beat.targetId} has no anchor in the registry`);
      return {
        index,
        angleRad: 0,
        anchor: placed.anchor,
        yawRad: placed.yawRad,
        cameraPosition: placed.cameraPosition,
        cameraTarget: placed.anchor,
      };
    });
    this.beats = new BeatsTimelineContainer({
      playback: options.playback,
      placements,
      content: pitchContentProvider,
      factories: options.factories,
    });
    PITCH_BEATS.forEach((beat, index) => {
      const scale = resolvePitchPlacement(beat)?.contentScale ?? 1;
      const node = this.beats.nodes[index];
      node.group.scale.setScalar(scale);
      node.marker.object.visible = false;
    });
    this.group.add(this.beats.group);
  }

  getActiveIndex(): number | null {
    return this.activeIndex;
  }

  /** Reveal begins once the camera is most of the way into the beat, so copy never races the flight. */
  showBeat(index: number | null, reducedMotion: boolean): void {
    this.activeIndex = index;
    const beat = index === null ? null : PITCH_BEATS[index];
    const delay = beat && !reducedMotion ? pitchRamp(beat).travelSec * ENTER_AT : 0;
    this.beats.setActiveBeat(index, reducedMotion, delay);
  }

  update(dtSec: number, timeSec: number): void {
    this.beats.update(dtSec, timeSec);
  }

  dispose(): void {
    this.beats.dispose();
    this.group.removeFromParent();
  }
}
