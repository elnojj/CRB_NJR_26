/**
 * Camera journey config restored from the original open sequence: story beats on a 72 s editorial
 * clock plus the ten camera stops the spline passes through (wide reveal, About Us orbit,
 * HQ, CDE, Campaign OS, settle on HQ). Consumed by CameraDirector as a CatmullRomCurve3 tour.
 */

import { SPHERE_NETWORK, sphereNetworkCentroid } from '../sphereNetwork';

export type JourneyPersonId = 'shweekar' | 'khaled' | 'tarek' | null;

export type JourneyBeat = {
  id: string;
  startSec: number;
  endSec: number;
  headlineEn: string;
  headlineAr: string;
  supportEn?: string;
  supportAr?: string;
  narrationEn: string;
  narrationAr: string;
  lookSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us' | 'centroid' | null;
  person: JourneyPersonId;
  mediaId: string | null;
  creditEn?: string;
  creditAr?: string;
  gapEn?: string;
  gapAr?: string;
  arc?: 'challenge' | 'response' | 'evidence' | 'action' | 'about' | 'hook';
};

export const JOURNEY_BASE_DURATION_SEC = 72;

export type JourneyStop = {
  /** Seconds on the editorial clock. */
  atSec: number;
  position: [number, number, number];
  target: [number, number, number];
  focalMm: number;
};

export const JOURNEY_BEATS: JourneyBeat[] = [
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

function sphereCenter(id: JourneyBeat['lookSphere']): [number, number, number] {
  if (!id || id === 'centroid') {
    const c = sphereNetworkCentroid();
    return [c.x, c.y, c.z];
  }
  const node = SPHERE_NETWORK.find((s) => s.id === id);
  return node ? [...node.center] : [0, 0, 0];
}

export function buildJourneyStops(): JourneyStop[] {
  const centroid = sphereCenter('centroid');
  const about = sphereCenter('about-us');
  const hq = sphereCenter('hq');
  const cde = sphereCenter('cde');
  const campaign = sphereCenter('campaign-os');
  const base = JOURNEY_BASE_DURATION_SEC;
  return [
    { atSec: 0, position: [centroid[0] + 2, centroid[1] + 6.5, centroid[2] + 28], target: centroid, focalMm: 28 },
    { atSec: 7.5, position: [centroid[0] - 4, centroid[1] + 4.2, centroid[2] + 22], target: centroid, focalMm: 32 },
    { atSec: 10, position: [about[0] + 7.5, about[1] + 2.2, about[2] + 9], target: about, focalMm: 40 },
    { atSec: 18, position: [about[0] - 6.5, about[1] + 1.8, about[2] + 8], target: [about[0], about[1] + 0.4, about[2]], focalMm: 45 },
    { atSec: 26, position: [about[0] + 1.2, about[1] + 0.6, about[2] + 7.2], target: [about[0], about[1] + 0.2, about[2]], focalMm: 55 },
    { atSec: 34, position: [about[0] - 2.5, about[1] + 3.8, about[2] + 5.5], target: about, focalMm: 38 },
    { atSec: 40, position: [hq[0] + 9, hq[1] + 3, hq[2] + 14], target: hq, focalMm: 35 },
    { atSec: 48, position: [cde[0] - 8, cde[1] + 2.5, cde[2] + 11], target: cde, focalMm: 40 },
    { atSec: 56, position: [campaign[0] + 6, campaign[1] + 2, campaign[2] + 10], target: campaign, focalMm: 42 },
    { atSec: base - 4, position: [hq[0], hq[1] + 1.2, hq[2] + 16], target: hq, focalMm: 35 },
  ];
}

export function journeyBeatAt(editorialSec: number): { beat: JourneyBeat; index: number } {
  for (let i = 0; i < JOURNEY_BEATS.length; i += 1) {
    const beat = JOURNEY_BEATS[i];
    if (editorialSec >= beat.startSec && editorialSec < beat.endSec) return { beat, index: i };
  }
  const last = JOURNEY_BEATS.length - 1;
  return { beat: JOURNEY_BEATS[last], index: last };
}
