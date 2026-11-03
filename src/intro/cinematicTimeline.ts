/**
 * 180-second Cerebro cinematic timeline.
 * Editorial clock: 24 fps → 4,320 frames. Runtime samples via rAF playhead.
 * Intervals use [startFrame, endFrameExclusive).
 */

export const CINEMATIC_FPS = 24;
export const CINEMATIC_DURATION_SEC = 180;
export const CINEMATIC_TOTAL_FRAMES = CINEMATIC_FPS * CINEMATIC_DURATION_SEC; // 4320

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
  /** Media id from cinematicManifest — null = brand plate / system beat */
  mediaId: string | null;
  /** In-point into source video (seconds). */
  mediaInSec: number;
  creditEn?: string;
  creditAr?: string;
  /** When media is blocked, show this gap copy instead of unrelated footage. */
  gapEn?: string;
  gapAr?: string;
};

function f(sec: number): number {
  return Math.round(sec * CINEMATIC_FPS);
}

/** Proposed motion targets — reconcile with active motion tokens at integration. */
export const CINEMATIC_MOTION = {
  arrivalAndReframeMs: 1400,
  headlineRevealMs: 480,
  wordStaggerMs: 70,
  mediaExpansionMs: 800,
  mediaContractionMs: 640,
  minimumHeadlineHoldMs: 2400,
  cameraEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/**
 * Editorial sequence (new copy for implementation — not a claim every capability is shipped).
 * Gondwana omitted. Shweekar/Khaled omitted until portraits confirmed.
 */
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
    creditAr: 'نُچارة — شووريل ٢٠٢٣',
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
    creditEn: 'NOJARA Studios — 2023 Showreel',
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
    endFrameExclusive: f(25),
    headlineEn: 'THE WORK CAME FIRST.',
    headlineAr: 'العمل جاء أولاً.',
    supportEn: 'NOJARA Studios',
    supportAr: 'نُچارة',
    narrationEn:
      'NOJARA Studios connects culture, design, and production. The work starts with an idea. Delivery introduces everyone else.',
    narrationAr:
      'نُچارة تربط الثقافة والتصميم والإنتاج. العمل يبدأ بفكرة. التنفيذ يُدخل الجميع.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 52,
    creditEn: 'NOJARA Studios',
  },
  {
    id: 'founder',
    startFrame: f(25),
    endFrameExclusive: f(40),
    headlineEn: 'BUILT FROM THE FLOOR.',
    headlineAr: 'مبني من أرض الواقع.',
    supportEn: 'Tarek Nojara · Culture & Design Engineer',
    supportAr: 'طارق نُچارة · مهندس ثقافة وتصميم',
    narrationEn:
      'Founded by Tarek Nojara, a Culture and Design Engineer, the studio approaches creative work through the realities of making it happen.',
    narrationAr:
      'أسّسها طارق نُچارة، مهندس ثقافة وتصميم، ويقارب الاستوديو العمل الإبداعي من واقع التنفيذ.',
    mediaId: 'tarek',
    mediaInSec: 0,
    gapEn: 'Founder archive video not on this host yet (/assets/media/tarek.mp4). Sequence blocked — no substitute footage.',
    gapAr: 'أرشيف المؤسس غير متوفر على هذا المضيف بعد. التسلسل موقوف — بلا لقطات بديلة.',
  },
  {
    id: 'brief-reality',
    startFrame: f(40),
    endFrameExclusive: f(55),
    headlineEn: 'THE BRIEF MEETS REALITY.',
    headlineAr: 'الموجز يواجه الواقع.',
    narrationEn: 'People. Places. Timing. Production. A compelling idea still has to survive the real world.',
    narrationAr: 'الناس. الأماكن. التوقيت. الإنتاج. الفكرة القوية ما زالت تحتاج أن تصمد في العالم الحقيقي.',
    mediaId: 'med-nojara-laliga',
    mediaInSec: 12,
    creditEn: 'NOJARA × LaLiga — Film (attributable studio work)',
    creditAr: 'نُچارة × الدوري الإسباني',
  },
  {
    id: 'el-batron',
    startFrame: f(55),
    endFrameExclusive: f(70),
    headlineEn: 'TALENT NEEDS A WORLD.',
    headlineAr: 'الموهبة تحتاج عالماً.',
    narrationEn:
      'El Batron brings the focus to talent and music—where identity needs a world around it, not another folder.',
    narrationAr:
      'البطرون يضع الموهبة والموسيقى في المركز — حيث تحتاج الهوية عالماً حولها، لا مجلداً إضافياً.',
    mediaId: 'med-el-batron',
    mediaInSec: 8,
    creditEn: 'El Batron — Showreel',
    creditAr: 'البطرون — شووريل',
  },
  {
    id: 'yah',
    startFrame: f(70),
    endFrameExclusive: f(85),
    headlineEn: 'MAKE ROOM FOR PEOPLE.',
    headlineAr: 'افسحوا مكاناً للناس.',
    narrationEn:
      'Young & Human brings another perspective: people as participants in culture, not simply the audience.',
    narrationAr:
      'يونغ آند هيومن تقدّم منظوراً آخر: الناس مشاركون في الثقافة، لا جمهور فقط.',
    mediaId: 'young-human',
    mediaInSec: 0,
    gapEn:
      'Young & Human archive animation not on this host (/assets/media/young-human.mp4). Blocked — no showreel substitute. Does not prove event outcomes.',
    gapAr: 'أرشيف يونغ آند هيومن غير متوفر على هذا المضيف. التسلسل موقوف.',
  },
  {
    id: 'creativity-system',
    startFrame: f(85),
    endFrameExclusive: f(100),
    headlineEn: 'CREATIVITY NEEDS A SYSTEM.',
    headlineAr: 'الإبداع يحتاج نظاماً.',
    narrationEn:
      'Across the work, the same questions return. Who owns the next step? What changed? What is actually ready?',
    narrationAr:
      'عبر الأعمال تعود الأسئلة نفسها. من يملك الخطوة التالية؟ ماذا تغيّر؟ ما الجاهز فعلاً؟',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 90,
  },
  {
    id: 'this-is-cerebro',
    startFrame: f(100),
    endFrameExclusive: f(115),
    headlineEn: 'THIS IS CEREBRO.',
    headlineAr: 'هذا هو سيريبو.',
    supportEn: 'Projects · people · decisions · media',
    supportAr: 'مشاريع · أشخاص · قرارات · وسائط',
    narrationEn:
      "Cerebro is NOJARA's proprietary studio operating system: a shared space for projects, people, decisions, and media.",
    narrationAr:
      'سيريبو هو نظام تشغيل الاستوديو الخاص بنُچارة: مساحة مشتركة للمشاريع والأشخاص والقرارات والوسائط.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 110,
  },
  {
    id: 'open-work',
    startFrame: f(115),
    endFrameExclusive: f(130),
    headlineEn: 'OPEN THE ACTUAL WORK.',
    headlineAr: 'افتح العمل الفعلي.',
    narrationEn: 'Open a project. Follow the relationships. See the work behind the status.',
    narrationAr: 'افتح مشروعاً. تابع العلاقات. انظر إلى العمل خلف الحالة.',
    mediaId: 'med-el-batron',
    mediaInSec: 40,
    creditEn: 'Project entry · El Batron (attributable)',
  },
  {
    id: 'decisions',
    startFrame: f(130),
    endFrameExclusive: f(145),
    headlineEn: 'DECISIONS HAVE CONSEQUENCES.',
    headlineAr: 'للقرارات تبعات.',
    narrationEn:
      'The purpose is clarity: the decision, the person responsible, and what needs to happen next.',
    narrationAr: 'الغاية وضوح: القرار، والمسؤول، وما يجب أن يحدث بعد ذلك.',
    mediaId: 'med-nojara-laliga',
    mediaInSec: 60,
  },
  {
    id: 'ask-see-act',
    startFrame: f(145),
    endFrameExclusive: f(160),
    headlineEn: 'ASK. SEE. ACT.',
    headlineAr: 'اسأل. انظر. نفّذ.',
    supportEn: 'Assistant actions are explicit about what they know and can do.',
    supportAr: 'إجراءات المساعد واضحة فيما تعرفه وما تستطيع فعله.',
    narrationEn:
      'A conversational layer should help people find context and take supported actions. What it knows—and what it can do—must be explicit.',
    narrationAr:
      'الطبقة الحوارية تساعد على إيجاد السياق واتخاذ إجراءات مدعومة. ما تعرفه وما تستطيعه يجب أن يكون صريحاً.',
    mediaId: 'med-nojara-showreel-2023',
    mediaInSec: 120,
  },
  {
    id: 'enter',
    startFrame: f(160),
    endFrameExclusive: f(180),
    headlineEn: 'ENTER THE WORK.',
    headlineAr: 'ادخل إلى العمل.',
    supportEn: 'Culture · Design · Engineering',
    supportAr: 'ثقافة · تصميم · هندسة',
    narrationEn:
      'Culture gives the work meaning. Design gives it form. Engineering helps it function. Welcome to Cerebro.',
    narrationAr:
      'الثقافة تمنح العمل معناه. التصميم يمنحه شكله. الهندسة تساعده على الاشتغال. أهلاً بكم في سيريبو.',
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
