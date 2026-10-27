/**
 * CEREBRO + CDE v1.28.0 — Procedural Web Audio Synthesizer Engine
 * Zero-dependency Web Audio API procedural soundscapes, technocrane flight foley,
 * crystalline glass node harmonics, and pentatonic hand piano.
 */

export const PENTATONIC_NOTES: readonly { name: string; freq: number }[] = [
  { name: 'C4', freq: 261.6 },
  { name: 'D4', freq: 293.7 },
  { name: 'E4', freq: 329.6 },
  { name: 'G4', freq: 392.0 },
  { name: 'A4', freq: 440.0 },
];

export class CerebroSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneMasterGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private droneStarted = false;
  private soundMuted = true;
  private voiceOrMediaActive = false;
  private unlocked = false;
  private lastHoverAt = 0;
  private lastWhooshAt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.soundMuted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);
        this.reverbConvolver = this.buildGlassReverbImpulse(this.ctx, 1.65, 3.2);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private buildGlassReverbImpulse(
    ctx: AudioContext,
    durationSeconds: number,
    decay: number
  ): ConvolverNode | null {
    try {
      const rate = ctx.sampleRate || 44100;
      const length = Math.max(1, Math.floor(rate * durationSeconds));
      const impulse = ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        // Subtle crystalline shimmer tail
        const mod = 1 + 0.25 * Math.sin((i / rate) * Math.PI * 2 * 14);
        left[i] = (Math.random() * 2 - 1) * env * mod * 0.35;
        right[i] = (Math.random() * 2 - 1) * env * mod * 0.35;
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;
      return convolver;
    } catch {
      return null;
    }
  }

  public unlock(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    if (!this.droneStarted && !this.soundMuted) {
      this.startAmbientDrone();
    }
    return true;
  }

  public isMuted(): boolean {
    return this.soundMuted;
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public setMuted(muted: boolean): void {
    this.soundMuted = muted;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
    if (!muted && this.unlocked && !this.droneStarted) {
      this.startAmbientDrone();
    }
  }

  public setVoiceOrMediaActive(active: boolean): void {
    this.voiceOrMediaActive = active;
    if (!this.ctx || !this.droneMasterGain) return;
    const now = this.ctx.currentTime;
    // Automatically duck ambient drone from 0.14 master gain to 0.03 when voice or media playback is active
    const targetGain = active ? 0.03 : 0.14;
    this.droneMasterGain.gain.cancelScheduledValues(now);
    this.droneMasterGain.gain.setTargetAtTime(targetGain, now, 0.18);
  }

  private startAmbientDrone(): void {
    if (this.droneStarted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    try {
      this.droneStarted = true;
      const now = ctx.currentTime;

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(this.voiceOrMediaActive ? 0.03 : 0.14, now + 1.8);
      this.droneMasterGain = droneGain;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(160, now);
      lowpass.Q.setValueAtTime(1.4, now);
      this.droneFilter = lowpass;

      // 1. Filtered Brown Noise Buffer (4-second seamless loop)
      const bufferLen = (ctx.sampleRate || 44100) * 4;
      const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate || 44100);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferLen; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 1.8;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.38;
      noiseSrc.connect(noiseGain);
      noiseGain.connect(lowpass);
      noiseSrc.start(now);

      // 2. 55Hz (A1) & 110Hz (A2) Harmonic Sub-Drone Oscillators
      const subOsc55 = ctx.createOscillator();
      subOsc55.type = 'sine';
      subOsc55.frequency.setValueAtTime(55.0, now);
      const sub55Gain = ctx.createGain();
      sub55Gain.gain.value = 0.48;
      subOsc55.connect(sub55Gain);
      sub55Gain.connect(lowpass);
      subOsc55.start(now);

      const harmOsc110 = ctx.createOscillator();
      harmOsc110.type = 'triangle';
      harmOsc110.frequency.setValueAtTime(110.0, now);
      const harm110Gain = ctx.createGain();
      harm110Gain.gain.value = 0.22;
      harmOsc110.connect(harm110Gain);
      harm110Gain.connect(lowpass);
      harmOsc110.start(now);

      lowpass.connect(droneGain);
      droneGain.connect(this.masterGain);
    } catch {
      this.droneStarted = false;
    }
  }

  /**
   * Modulates the Cerebral Ambient Drone lowpass cutoff (120Hz -> 240Hz)
   * on the locked 8.0-second sphere breathing cycle.
   */
  public updateBreathingModulation(elapsedSeconds: number, audioRms = 0): void {
    if (!this.ctx || !this.droneFilter || this.soundMuted) return;
    const breathPhase = 0.5 + 0.5 * Math.sin((elapsedSeconds * Math.PI * 2) / 8.0);
    const rmsBoost = Math.min(80, audioRms * 180);
    const cutoffHz = 120 + breathPhase * 120 + rmsBoost;
    this.droneFilter.frequency.setTargetAtTime(cutoffHz, this.ctx.currentTime, 0.06);
  }

  /**
   * Technocrane Flight Whoosh:
   * Stereo-panned bandpass filter sweep (180Hz -> 920Hz -> 220Hz) synchronized with camera spline velocity.
   */
  public triggerFlightWhoosh(durationMs = 950, panDirection = 0): void {
    if (this.soundMuted) return;
    const nowPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowPerf - this.lastWhooshAt < 140) return;
    this.lastWhooshAt = nowPerf;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const durSec = Math.max(0.28, Math.min(2.6, durationMs / 1000));
      const sampleRate = ctx.sampleRate || 44100;
      const frameCount = Math.floor(sampleRate * durSec);
      const noiseBuffer = ctx.createBuffer(1, frameCount, sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      let pink = 0;
      for (let i = 0; i < frameCount; i++) {
        const w = Math.random() * 2 - 1;
        pink = 0.92 * pink + 0.08 * w;
        channel[i] = pink * 1.4;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(2.6, now);
      bandpass.frequency.setValueAtTime(180, now);
      bandpass.frequency.exponentialRampToValueAtTime(920, now + durSec * 0.38);
      bandpass.frequency.exponentialRampToValueAtTime(220, now + durSec);

      const envGain = ctx.createGain();
      const peakGain = this.voiceOrMediaActive ? 0.045 : 0.13;
      envGain.gain.setValueAtTime(0.0001, now);
      envGain.gain.linearRampToValueAtTime(peakGain, now + durSec * 0.32);
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) {
        const startPan = Math.max(-0.85, Math.min(0.85, -panDirection * 0.55));
        const endPan = Math.max(-0.85, Math.min(0.85, panDirection * 0.65));
        panner.pan.setValueAtTime(startPan, now);
        panner.pan.linearRampToValueAtTime(endPan, now + durSec);
        noiseSrc.connect(bandpass);
        bandpass.connect(envGain);
        envGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        noiseSrc.connect(bandpass);
        bandpass.connect(envGain);
        envGain.connect(this.masterGain);
      }

      noiseSrc.start(now);
      noiseSrc.stop(now + durSec + 0.02);
    } catch {
      // ignore audio context anomalies
    }
  }

  /**
   * High-Q crystalline hover harmonic with stereo panning based on screen X coordinate (-1..1).
   */
  public playNodeHover(panX = 0): void {
    if (this.soundMuted) return;
    const nowPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowPerf - this.lastHoverAt < 65) return;
    this.lastHoverAt = nowPerf;

    this.playCrystallineHarmonic({
      baseFreq: 1318.5, // E6 crystalline rim
      overtoneFreq: 2637.0,
      durationSec: 0.11,
      peakGain: 0.045,
      panX,
    });
  }

  /**
   * Crystalline node selection chime with stereo panning.
   */
  public playNodeSelect(panX = 0): void {
    if (this.soundMuted) return;
    this.playCrystallineHarmonic({
      baseFreq: 880.0, // A5
      overtoneFreq: 1760.0, // A6
      durationSec: 0.28,
      peakGain: 0.095,
      panX,
    });
  }

  /**
   * Glass panel open/close foley.
   */
  public playPanelToggle(open: boolean, panX = -0.35): void {
    if (this.soundMuted) return;
    this.playCrystallineHarmonic({
      baseFreq: open ? 587.33 : 440.0,
      overtoneFreq: open ? 880.0 : 587.33,
      durationSec: 0.22,
      peakGain: 0.075,
      panX,
    });
  }

  /**
   * Two-tap confirmation tick (Step 1 = preview focus, Step 2 = open inspection panel).
   */
  public playTwoTapTick(step: 1 | 2, panX = 0): void {
    if (this.soundMuted) return;
    this.playCrystallineHarmonic({
      baseFreq: step === 1 ? 1046.5 : 1567.98, // C6 -> G6
      overtoneFreq: step === 1 ? 1567.98 : 2093.0,
      durationSec: step === 1 ? 0.12 : 0.24,
      peakGain: step === 1 ? 0.065 : 0.09,
      panX,
    });
  }

  /**
   * Pentatonic Hand Piano:
   * Synthesizes warm glass-marimba notes (C4=261.6Hz, D4=293.7Hz, E4=329.6Hz, G4=392.0Hz, A4=440.0Hz)
   * with reverb tail when fingertips are triggered in HandsOverlay.tsx.
   */
  public playFingertipNote(fingerIndex: number, panX = 0): { name: string; freq: number } {
    const safeIdx = Math.abs(Math.round(fingerIndex)) % PENTATONIC_NOTES.length;
    const note = PENTATONIC_NOTES[safeIdx];
    if (this.soundMuted) return note;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return note;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const oscFund = ctx.createOscillator();
      const oscHarm = ctx.createOscillator();
      oscFund.type = 'sine';
      oscHarm.type = 'triangle';

      // Glass-marimba fundamental + 4th harmonic overtone
      oscFund.frequency.setValueAtTime(note.freq, now);
      oscHarm.frequency.setValueAtTime(note.freq * 2.0, now);

      const fundGain = ctx.createGain();
      const harmGain = ctx.createGain();
      fundGain.gain.setValueAtTime(0.0001, now);
      fundGain.gain.linearRampToValueAtTime(0.14, now + 0.012);
      fundGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      harmGain.gain.setValueAtTime(0.0001, now);
      harmGain.gain.linearRampToValueAtTime(0.055, now + 0.008);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      const noteBus = ctx.createGain();
      noteBus.gain.value = 1.0;

      oscFund.connect(fundGain);
      oscHarm.connect(harmGain);
      fundGain.connect(noteBus);
      harmGain.connect(noteBus);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const clampedPan = Math.max(-0.9, Math.min(0.9, panX));
      if (panner) {
        panner.pan.setValueAtTime(clampedPan, now);
        noteBus.connect(panner);
        panner.connect(this.masterGain);
      } else {
        noteBus.connect(this.masterGain);
      }

      // Route to glass impulse reverb tail
      if (this.reverbConvolver) {
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.32;
        noteBus.connect(this.reverbConvolver);
        this.reverbConvolver.connect(wetGain);
        wetGain.connect(this.masterGain);
      }

      oscFund.start(now);
      oscHarm.start(now);
      oscFund.stop(now + 0.9);
      oscHarm.stop(now + 0.36);
    } catch {
      // ignore
    }

    return note;
  }

  private playCrystallineHarmonic(opts: {
    baseFreq: number;
    overtoneFreq: number;
    durationSec: number;
    peakGain: number;
    panX: number;
  }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(opts.baseFreq, now);
      osc2.frequency.setValueAtTime(opts.overtoneFreq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(opts.baseFreq * 1.25, now);
      filter.Q.setValueAtTime(4.5, now);

      const gain = ctx.createGain();
      const scaledPeak = this.voiceOrMediaActive ? opts.peakGain * 0.55 : opts.peakGain;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(scaledPeak, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.durationSec);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, opts.panX)), now);
        gain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        gain.connect(this.masterGain);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + opts.durationSec + 0.02);
      osc2.stop(now + opts.durationSec + 0.02);
    } catch {
      // ignore
    }
  }
}

export const soundEngine = new CerebroSoundEngine();
