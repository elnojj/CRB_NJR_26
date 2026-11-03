/**
 * Open-sequence cinematic timeline (public autoplay).
 * Editorial clock: 24 fps → 1,440 frames. Sphere/world cuts + Cerebro onboarding.
 */

export const CINEMATIC_FPS = 24;
export const CINEMATIC_DURATION_SEC = 60;
export const CINEMATIC_TOTAL_FRAMES = CINEMATIC_FPS * CINEMATIC_DURATION_SEC; // 1440

export type FilmLang = 'en' | 'ar';

export type CinematicBeat = {
  id: string;
  startFrame: number;
  endFrameExclusive: number;
  headlineEn: string;
  headlineAr: string;
  supportEn?: string;
  supportAr?: string;
  narrationEn: string;
  narrationAr: string;
  mediaId: string | null;
  mediaInSec: number;
  creditEn?: string;
  creditAr?: string;
  gapEn?: string;
  gapAr?: string;
};

function f(sec: number): number {
  return Math.round(sec * CINEMATIC_FPS);
}

export const CINEMATIC_MOTION = {
  arrivalAndReframeMs: 1400,
  headlineRevealMs: 480,
  wordStaggerMs: 70,
  mediaExpansionMs: 800,
  mediaContractionMs: 640,
  minimumHeadlineHoldMs: 2400,
  cameraEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** Autoplay open sequence: dual-sphere / world cuts + what Cerebro is. */
export const CINEMATIC_BEATS: CinematicBeat[] = [
  {
    id: 'open-0',
    startFrame: f(0),
    endFrameExclusive: f(6),
    headlineEn: 'IDEAS NEED DELIVERY.',
    headlineAr: 'الأفكار تحتاج تنفيذاً.',
    narrationEn: 'An idea can look finished long before the work is.',
    narrationAr: 'الفكرة قد تبدو مكتملة قبل أن يكتمل العمل.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 4,
    creditEn: 'NOJARA Studios — 2023 Showreel',
  },
  {
    id: 'spheres',
    startFrame: f(6),
    endFrameExclusive: f(16),
    headlineEn: 'TWO SPHERES. ONE STUDIO.',
    headlineAr: 'كرتان. استوديو واحد.',
    supportEn: 'HQ · CDE',
    supportAr: 'HQ · CDE',
    narrationEn:
      'Cerebro HQ holds the register, media, and crew. CDE opens culture, design, and engineering dimensions.',
    narrationAr: 'سيريبو HQ يحمل السجل والوسائط والفريق. وCDE يفتح أبعاد الثقافة والتصميم والهندسة.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 28,
  },
  {
    id: 'worlds',
    startFrame: f(16),
    endFrameExclusive: f(26),
    headlineEn: 'WORLDS YOU CAN ENTER.',
    headlineAr: 'عوالم يمكن دخولها.',
    supportEn: 'Campaign OS · About Us · Project portals',
    supportAr: 'Campaign OS · About Us · بوابات المشاريع',
    narrationEn:
      'Peer spheres and project portals keep live programmes in one continuous spatial map.',
    narrationAr: 'الكرات الشقيقة وبوابات المشاريع تبقي البرامج الحية على خريطة مكانية واحدة.',
    mediaId: 'med-nojara-laliga',
    mediaInSec: 12,
    creditEn: 'NOJARA × LaLiga — Film',
  },
  {
    id: 'stations',
    startFrame: f(26),
    endFrameExclusive: f(36),
    headlineEn: 'PROJECTS. PEOPLE. MEDIA. TASKS.',
    headlineAr: 'مشاريع. أشخاص. وسائط. مهام.',
    narrationEn:
      'Stations on the master sphere surface the register pulse — open work, crew RACI, showreels, and files.',
    narrationAr: 'محطات الكرة الرئيسية تعرض نبض السجل — العمل المفتوح والطاقم والعروض والملفات.',
    mediaId: 'med-el-batron',
    mediaInSec: 8,
    creditEn: 'El Batron — Showreel',
  },
  {
    id: 'this-is-cerebro',
    startFrame: f(36),
    endFrameExclusive: f(48),
    headlineEn: 'THIS IS CEREBRO.',
    headlineAr: 'هذا هو سيريبو.',
    supportEn: "NOJARA's studio operating system",
    supportAr: 'نظام تشغيل استوديو نُچارة',
    narrationEn:
      "Cerebro is NOJARA's proprietary studio OS: a shared space for projects, people, decisions, and media.",
    narrationAr: 'سيريبو هو نظام تشغيل الاستوديو الخاص بنُچارة: مساحة مشتركة للمشاريع والأشخاص والقرارات والوسائط.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 110,
  },
  {
    id: 'enter',
    startFrame: f(48),
    endFrameExclusive: f(60),
    headlineEn: 'ENTER THE WORK.',
    headlineAr: 'ادخل إلى العمل.',
    supportEn: 'Culture · Design · Engineering',
    supportAr: 'ثقافة · تصميم · هندسة',
    narrationEn: 'Welcome to Cerebro.',
    narrationAr: 'أهلاً بكم في سيريبو.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 4,
  },
];

export function beatAtFrame(frame: number): CinematicBeat {
  const clamped = Math.max(0, Math.min(CINEMATIC_TOTAL_FRAMES - 1, frame));
  for (const beat of CINEMATIC_BEATS) {
    if (clamped >= beat.startFrame && clamped < beat.endFrameExclusive) return beat;
  }
  return CINEMATIC_BEATS[CINEMATIC_BEATS.length - 1];
}

export function frameFromSeconds(sec: number): number {
  return Math.floor(sec * CINEMATIC_FPS);
}

export function secondsFromFrame(frame: number): number {
  return frame / CINEMATIC_FPS;
}
