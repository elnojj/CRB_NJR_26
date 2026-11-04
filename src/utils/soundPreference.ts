export const SOUND_STORAGE_KEY = 'cerebro.sound';

export type SoundPreference = 'on' | 'muted';

/** Sound starts on the first user gesture unless the visitor previously muted it. */
export function readSoundPreference(): SoundPreference {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'muted' ? 'muted' : 'on';
  } catch {
    return 'on';
  }
}

export function writeSoundPreference(pref: SoundPreference): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable (private mode); the choice applies to this session only */
  }
}
