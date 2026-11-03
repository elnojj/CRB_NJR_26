/**
 * 60-second Cerebro cinematic timeline (public entry).
 * Editorial clock: 24 fps → 1,440 frames. Runtime samples via rAF playhead.
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

/** Condensed 60s public journey. Gondwana omitted. Shweekar/Khaled omitted. */
export const CINEMATIC_BEATS: CinematicBeat[] = [
  {
    id: 'open-0',
    startFrame: f(0),
    endFrameExclusive: f(3),
    headlineEn: 'IDEAS NEED DELIVERY.',
    headlineAr: 'الأفكار تحتاج تنفيذاً.',
    narrationEn: 'An idea can look finished long before the work is.',
    narrationAr: 'الفكرة قد تبدو مكتملة قبل أن يكتمل العمل.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 4,
    creditEn: 'NOJARA Studios — 2023 Showreel',
  },
  {
    id: 'open-1',
    startFrame: f(3),
    endFrameExclusive: f(6),
    headlineEn: 'CULTURE. DESIGN. ENGINEERING.',
    headlineAr: 'ثقافة. تصميم. هندسة.',
    narrationEn: 'An idea can look finished long before the work is.',
    narrationAr: 'الفكرة قد تبدو مكتملة قبل أن يكتمل العمل.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 18,
  },
  {
    id: 'open-2',
    startFrame: f(6),
    endFrameExclusive: f(10),
    headlineEn: 'MEET THE OPERATING SYSTEM.',
    headlineAr: 'تعرّف على نظام التشغيل.',
    narrationEn: 'An idea can look finished long before the work is.',
    narrationAr: 'الفكرة قد تبدو مكتملة قبل أن يكتمل العمل.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 40,
  },
  {
    id: 'work-first',
    startFrame: f(10),
    endFrameExclusive: f(18),
    headlineEn: 'THE WORK CAME FIRST.',
    headlineAr: 'العمل جاء أولاً.',
    supportEn: 'NOJARA Studios',
    supportAr: 'نُچارة',
    narrationEn:
      'NOJARA Studios connects culture, design, and production. Delivery introduces everyone else.',
    narrationAr: 'نُچارة تربط الثقافة والتصميم والإنتاج.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 52,
  },
  {
    id: 'founder',
    startFrame: f(18),
    endFrameExclusive: f(26),
    headlineEn: 'BUILT FROM THE FLOOR.',
    headlineAr: 'مبني من أرض الواقع.',
    supportEn: 'Tarek Nojara · Culture & Design Engineer',
    supportAr: 'طارق نُچارة · مهندس ثقافة وتصميم',
    narrationEn:
      'Founded by Tarek Nojara, a Culture and Design Engineer, the studio approaches creative work through the realities of making it happen.',
    narrationAr: 'أسّسها طارق نُچارة، مهندس ثقافة وتصميم.',
    mediaId: 'tarek',
    mediaInSec: 0,
    gapEn: 'Founder archive will appear here once the approved file is on this host.',
    gapAr: 'سيظهر أرشيف المؤسس هنا عند توفر الملف المعتمد على هذا المضيف.',
  },
  {
    id: 'brief-reality',
    startFrame: f(26),
    endFrameExclusive: f(34),
    headlineEn: 'THE BRIEF MEETS REALITY.',
    headlineAr: 'الموجز يواجه الواقع.',
    narrationEn: 'People. Places. Timing. Production. A compelling idea still has to survive the real world.',
    narrationAr: 'الناس. الأماكن. التوقيت. الإنتاج.',
    mediaId: 'med-nojara-laliga',
    mediaInSec: 12,
    creditEn: 'NOJARA × LaLiga — Film',
  },
  {
    id: 'el-batron',
    startFrame: f(34),
    endFrameExclusive: f(42),
    headlineEn: 'TALENT NEEDS A WORLD.',
    headlineAr: 'الموهبة تحتاج عالماً.',
    narrationEn: 'El Batron brings the focus to talent and music—where identity needs a world around it.',
    narrationAr: 'البطرون يضع الموهبة والموسيقى في المركز.',
    mediaId: 'med-el-batron',
    mediaInSec: 8,
    creditEn: 'El Batron — Showreel',
  },
  {
    id: 'yah',
    startFrame: f(42),
    endFrameExclusive: f(48),
    headlineEn: 'MAKE ROOM FOR PEOPLE.',
    headlineAr: 'افسحوا مكاناً للناس.',
    narrationEn: 'Young & Human: people as participants in culture, not simply the audience.',
    narrationAr: 'يونغ آند هيومن: الناس مشاركون في الثقافة.',
    mediaId: 'young-human',
    mediaInSec: 0,
    gapEn: 'Young & Human archive will appear here once the approved file is on this host.',
    gapAr: 'سيظهر أرشيف يونغ آند هيومن هنا عند توفر الملف المعتمد.',
  },
  {
    id: 'this-is-cerebro',
    startFrame: f(48),
    endFrameExclusive: f(54),
    headlineEn: 'THIS IS CEREBRO.',
    headlineAr: 'هذا هو سيريبو.',
    supportEn: 'Projects · people · decisions · media',
    supportAr: 'مشاريع · أشخاص · قرارات · وسائط',
    narrationEn:
      "Cerebro is NOJARA's proprietary studio operating system: a shared space for projects, people, decisions, and media.",
    narrationAr: 'سيريبو هو نظام تشغيل الاستوديو الخاص بنُچارة.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 110,
  },
  {
    id: 'enter',
    startFrame: f(54),
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
