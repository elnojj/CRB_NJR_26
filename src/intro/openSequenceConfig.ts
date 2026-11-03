/**
 * Live WebGL open-sequence config — timing, camera path, and story beats.
 * Duration and beat holds are configurable; 25 content themes are inventory, not a locked 90s edit.
 */

import * as THREE from 'three';
import { hermite, clamp, smoother } from './bridge';
import { SPHERE_NETWORK, sphereNetworkCentroid } from '../three/sphereNetwork';

export type OpenSequenceLang = 'en' | 'ar';

export type OpenSequencePersonId = 'shweekar' | 'khaled' | 'tarek' | null;

export type OpenSequenceBeat = {
  id: string;
  /** Inclusive start in seconds (scaled by duration factor). */
  startSec: number;
  /** Exclusive end in seconds (editorial base clock). */
  endSec: number;
  headlineEn: string;
  headlineAr: string;
  supportEn?: string;
  supportAr?: string;
  narrationEn: string;
  narrationAr: string;
  /** Sphere look target for this beat (network id or null = constellation). */
  lookSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us' | 'centroid' | null;
  person: OpenSequencePersonId;
  /** Media catalog id — null shows graceful gap, never unrelated substitute. */
  mediaId: string | null;
  creditEn?: string;
  creditAr?: string;
  gapEn?: string;
  gapAr?: string;
  /** Business-pitch role after About Us. */
  arc?: 'challenge' | 'response' | 'evidence' | 'action' | 'about' | 'hook';
};

/** Editorial base duration (seconds). Override via ?openDuration= or OPEN_SEQUENCE_DURATION_SEC. */
export const OPEN_SEQUENCE_BASE_DURATION_SEC = 72;

/** First-attention window — hook must land before this. */
export const OPEN_SEQUENCE_HOOK_WINDOW_SEC = 10;

export const OPEN_SEQUENCE_FPS = 60;

export type OpenSequenceTimingConfig = {
  durationSec: number;
  reducedMotion: boolean;
  hookWindowSec: number;
};

export function resolveOpenSequenceTiming(
  search: string | undefined,
  reducedMotion: boolean
): OpenSequenceTimingConfig {
  const params = new URLSearchParams(search || '');
  const raw = Number(params.get('openDuration') || params.get('openSec') || '');
  let durationSec = Number.isFinite(raw) && raw >= 24 ? raw : OPEN_SEQUENCE_BASE_DURATION_SEC;
  if (reducedMotion) durationSec = Math.min(durationSec, 36);
  return {
    durationSec,
    reducedMotion,
    hookWindowSec: Math.min(OPEN_SEQUENCE_HOOK_WINDOW_SEC, durationSec * 0.2),
  };
}

/**
 * Editorial beats on the base 72s clock. Scaled proportionally to configured duration.
 * Order locked for About Us: Shweekar → Khaled → Tarek after the wide reveal.
 */
export const OPEN_SEQUENCE_BEATS: OpenSequenceBeat[] = [
  {
    id: 'wide-reveal',
    startSec: 0,
    endSec: 8,
    headlineEn: 'WHAT HOLDS WORK TOGETHER?',
    headlineAr: 'ما الذي يجمع العمل؟',
    supportEn: 'HQ · CDE · Campaign OS · About Us',
    supportAr: 'HQ · CDE · نظام الحملات · من نحن',
    narrationEn: 'A living constellation of studio work.',
    narrationAr: 'كوكبة حيّة من عمل الاستوديو.',
    lookSphere: 'centroid',
    person: null,
    mediaId: null,
    arc: 'hook',
  },
  {
    id: 'about-shweekar',
    startSec: 8,
    endSec: 16,
    headlineEn: 'SHWEEKAR AHMED',
    headlineAr: 'شويكار أحمد',
    supportEn: 'PMO · Intake · Delivery discipline',
    supportAr: 'إدارة المشاريع · الاستقبال · انضباط التسليم',
    narrationEn: 'She keeps every programme moving.',
    narrationAr: 'تُبقي كل برنامج في حركة.',
    lookSphere: 'about-us',
    person: 'shweekar',
    mediaId: 'person-shweekar',
    gapEn: 'Approved portrait for Shweekar Ahmed is not in the public media folder yet.',
    gapAr: 'الصورة المعتمدة لشويكار أحمد غير متوفرة في مجلد الوسائط العام بعد.',
    arc: 'about',
  },
  {
    id: 'about-khaled',
    startSec: 16,
    endSec: 24,
    headlineEn: 'KHALED AL-SHAALAN',
    headlineAr: 'خالد الشعلان',
    supportEn: 'Partner programmes · Gulf bridge',
    supportAr: 'برامج الشركاء · جسر الخليج',
    narrationEn: 'He bridges partners across the Gulf.',
    narrationAr: 'يربط الشركاء عبر الخليج.',
    lookSphere: 'about-us',
    person: 'khaled',
    mediaId: 'person-khaled',
    gapEn: 'Approved portrait for Khaled Al-Shaalan is not in the public media folder yet.',
    gapAr: 'الصورة المعتمدة لخالد الشعلان غير متوفرة في مجلد الوسائط العام بعد.',
    arc: 'about',
  },
  {
    id: 'about-tarek',
    startSec: 24,
    endSec: 36,
    headlineEn: 'TAREK NOJARA',
    headlineAr: 'طارق نُچارة',
    supportEn: 'Founder · Culture & Design Engineer — 39',
    supportAr: 'المؤسس · مهندس الثقافة والتصميم — 39',
    narrationEn: 'Built from the work — sets, light and motion.',
    narrationAr: 'مبنيّ من العمل — مواقع وضوء وحركة.',
    lookSphere: 'about-us',
    person: 'tarek',
    mediaId: 'person-tarek',
    gapEn:
      'Approved Tarek portrait plate (/media/about-tarek-afrima.jpg) and BTS reel are missing from the deploy host — showing verified role copy only.',
    gapAr:
      'لوحة طارق المعتمدة ومشاهد خلف الكواليس غير متوفرة على المضيف — نعرض الدور الموثّق فقط.',
    creditEn: 'Founder & Culture and Design Engineer — never CEO',
    creditAr: 'المؤسس ومهندس الثقافة والتصميم — وليس الرئيس التنفيذي',
    arc: 'about',
  },
  {
    id: 'challenge',
    startSec: 36,
    endSec: 44,
    headlineEn: 'IDEAS NEED DELIVERY.',
    headlineAr: 'الأفكار تحتاج تنفيذاً.',
    supportEn: 'The business challenge',
    supportAr: 'تحدي الأعمال',
    narrationEn: 'A finished-looking idea is not finished work.',
    narrationAr: 'الفكرة التي تبدو مكتملة ليست عملاً مكتملاً.',
    lookSphere: 'hq',
    person: null,
    mediaId: 'med-nojara-showreel-2023',
    creditEn: 'NOJARA Studios — 2023 Showreel',
    arc: 'challenge',
  },
  {
    id: 'response',
    startSec: 44,
    endSec: 52,
    headlineEn: 'NOJARA RESPONDS WITH CEREBRO.',
    headlineAr: 'نُچارة ترد بسيريبو.',
    supportEn: 'Culture · Design · Engineering',
    supportAr: 'ثقافة · تصميم · هندسة',
    narrationEn: 'Projects, people and media on one spatial map.',
    narrationAr: 'مشاريع وأشخاص ووسائط على خريطة مكانية واحدة.',
    lookSphere: 'cde',
    person: null,
    mediaId: 'med-nojara-showreel-2023',
    arc: 'response',
  },
  {
    id: 'evidence',
    startSec: 52,
    endSec: 62,
    headlineEn: 'EVIDENCE FROM REAL WORK.',
    headlineAr: 'أدلة من عمل حقيقي.',
    supportEn: 'LaLiga · El Batron · SEVEN',
    supportAr: 'LaLiga · الباترون · SEVEN',
    narrationEn: 'Attributable films live inside the shells.',
    narrationAr: 'الأفلام المنسوبة تعيش داخل الأغلفة.',
    lookSphere: 'campaign-os',
    person: null,
    mediaId: 'med-nojara-laliga',
    creditEn: 'NOJARA × LaLiga — Film',
    arc: 'evidence',
  },
  {
    id: 'action',
    startSec: 62,
    endSec: 72,
    headlineEn: 'ENTER THE WORK.',
    headlineAr: 'ادخل إلى العمل.',
    supportEn: 'Stations · voice · gesture · register',
    supportAr: 'محطات · صوت · إيماءة · السجل',
    narrationEn: 'Open a station, call the room, move the work.',
    narrationAr: 'افتح محطة، نادِ الغرفة، وحرّك العمل.',
    lookSphere: 'hq',
    person: null,
    mediaId: 'med-el-batron',
    creditEn: 'El Batron — Showreel',
    arc: 'action',
  },
];

export function scaleOpenSequenceTime(editorialSec: number, timing: OpenSequenceTimingConfig): number {
  const scale = timing.durationSec / OPEN_SEQUENCE_BASE_DURATION_SEC;
  return editorialSec * scale;
}

/** Beat start/end on the configured (scaled) clock, in seconds. */
export function beatWindowSec(
  beat: OpenSequenceBeat,
  timing: OpenSequenceTimingConfig
): { start: number; end: number } {
  return {
    start: scaleOpenSequenceTime(beat.startSec, timing),
    end: scaleOpenSequenceTime(beat.endSec, timing),
  };
}

export function beatAtOpenSequenceTime(
  tSec: number,
  timing: OpenSequenceTimingConfig
): OpenSequenceBeat {
  const editorial =
    (tSec / Math.max(0.001, timing.durationSec)) * OPEN_SEQUENCE_BASE_DURATION_SEC;
  for (const beat of OPEN_SEQUENCE_BEATS) {
    if (editorial >= beat.startSec && editorial < beat.endSec) return beat;
  }
  return OPEN_SEQUENCE_BEATS[OPEN_SEQUENCE_BEATS.length - 1];
}

type CameraKey = {
  frame: number;
  position: [number, number, number];
  target: [number, number, number];
  focalMm: number;
};

function sphereCenter(id: OpenSequenceBeat['lookSphere']): [number, number, number] {
  if (!id || id === 'centroid') {
    const c = sphereNetworkCentroid();
    return [c.x, c.y, c.z];
  }
  const node = SPHERE_NETWORK.find((s) => s.id === id);
  return node ? [...node.center] : [0, 0, 0];
}

/**
 * Build hermite camera keys for the live one-shot (60 fps frames on the configured duration).
 * Wide constellation → About Us people orbit → HQ/CDE/Campaign evidence → settle on HQ.
 */
export function buildOpenSequenceCameraKeys(timing: OpenSequenceTimingConfig): CameraKey[] {
  const totalFrames = Math.round(timing.durationSec * OPEN_SEQUENCE_FPS);
  const toFrame = (editorialSec: number) =>
    Math.round(scaleOpenSequenceTime(editorialSec, timing) * OPEN_SEQUENCE_FPS);

  const centroid = sphereCenter('centroid');
  const about = sphereCenter('about-us');
  const hq = sphereCenter('hq');
  const cde = sphereCenter('cde');
  const campaign = sphereCenter('campaign-os');

  const keys: CameraKey[] = [
    {
      frame: 0,
      position: [centroid[0] + 2, centroid[1] + 6.5, centroid[2] + 28],
      target: centroid,
      focalMm: 28,
    },
    {
      frame: toFrame(7.5),
      position: [centroid[0] - 4, centroid[1] + 4.2, centroid[2] + 22],
      target: centroid,
      focalMm: 32,
    },
    // Shweekar — approach About Us
    {
      frame: toFrame(10),
      position: [about[0] + 7.5, about[1] + 2.2, about[2] + 9],
      target: about,
      focalMm: 40,
    },
    // Khaled — orbit
    {
      frame: toFrame(18),
      position: [about[0] - 6.5, about[1] + 1.8, about[2] + 8],
      target: [about[0], about[1] + 0.4, about[2]],
      focalMm: 45,
    },
    // Tarek — push-in + slight rise (cinematic extravaganza without false BTS)
    {
      frame: toFrame(26),
      position: [about[0] + 1.2, about[1] + 0.6, about[2] + 7.2],
      target: [about[0], about[1] + 0.2, about[2]],
      focalMm: 55,
    },
    {
      frame: toFrame(34),
      position: [about[0] - 2.5, about[1] + 3.8, about[2] + 5.5],
      target: about,
      focalMm: 38,
    },
    // Challenge — HQ
    {
      frame: toFrame(40),
      position: [hq[0] + 9, hq[1] + 3, hq[2] + 14],
      target: hq,
      focalMm: 35,
    },
    // Response — CDE
    {
      frame: toFrame(48),
      position: [cde[0] - 8, cde[1] + 2.5, cde[2] + 11],
      target: cde,
      focalMm: 40,
    },
    // Evidence — Campaign OS
    {
      frame: toFrame(56),
      position: [campaign[0] + 6, campaign[1] + 2, campaign[2] + 10],
      target: campaign,
      focalMm: 42,
    },
    // Action — settle HQ ready for workspace handoff
    {
      frame: Math.max(toFrame(68), totalFrames - 2),
      position: [hq[0], hq[1] + 1.2, hq[2] + 16],
      target: hq,
      focalMm: 35,
    },
  ];

  return keys;
}

export function createOpenSequencePoseSampler(timing: OpenSequenceTimingConfig) {
  const keys = buildOpenSequenceCameraKeys(timing);
  const config = { motion: { cameraKeys: keys } };
  return (tSec: number) => {
    const t = clamp(tSec, 0, timing.durationSec);
    return {
      position: hermite(keys, t, 'position') as number[],
      target: hermite(keys, t, 'target') as number[],
      focalMm: hermite(keys, t, 'focalMm') as number,
      _smoother: smoother,
      _config: config,
    };
  };
}

/** People media slots — never invent portraits. */
export const OPEN_SEQUENCE_PEOPLE_MEDIA = {
  shweekar: {
    id: 'person-shweekar',
    nameEn: 'Shweekar Ahmed',
    nameAr: 'شويكار أحمد',
    roleEn: 'PMO · Intake · Delivery',
    roleAr: 'إدارة المشاريع · الاستقبال · التسليم',
    src: null as string | null,
    poster: null as string | null,
    blocked: true,
    gapEn: 'Confirmed portrait for Shweekar Ahmed is missing from the approved media folder.',
  },
  khaled: {
    id: 'person-khaled',
    nameEn: 'Khaled Al-Shaalan',
    nameAr: 'خالد الشعلان',
    roleEn: 'Partner programmes · Gulf bridge',
    roleAr: 'برامج الشركاء · جسر الخليج',
    src: null as string | null,
    poster: null as string | null,
    blocked: true,
    gapEn: 'Confirmed portrait for Khaled Al-Shaalan is missing from the approved media folder.',
  },
  tarek: {
    id: 'person-tarek',
    nameEn: 'Tarek Nojara',
    nameAr: 'طارق نُچارة',
    roleEn: 'Founder · Culture & Design Engineer',
    roleAr: 'المؤسس · مهندس الثقافة والتصميم',
    src: null as string | null,
    /** Owner-supplied plate when present on host; otherwise gap. */
    poster: '/media/about-tarek-afrima.jpg',
    blocked: true,
    gapEn:
      'Tarek AFRIMA plate and BTS reel are not on the deploy host — verified role only; showreel is not credited as his portrait.',
  },
} as const;

export function openSequenceMediaObjectFit(): 'cover' {
  return 'cover';
}

/** Soft look-at helper for debugging pose continuity (unused in production overlay). */
export function lookAtMatrix(position: number[], target: number[]): THREE.Matrix4 {
  const cam = new THREE.Object3D();
  cam.position.fromArray(position);
  cam.lookAt(new THREE.Vector3().fromArray(target));
  cam.updateMatrixWorld();
  return cam.matrixWorld.clone();
}
