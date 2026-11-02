/**
 * Nested project-world contract (R05).
 * Parent sphere stays intact; inner object may assemble inside a threshold.
 * Procedural geometry is labelled reconstruction — never invents missing assets.
 */

export type ProjectWorldInteractionState =
  | 'parent_sphere'
  | 'project_focus'
  | 'threshold_flight'
  | 'project_world'
  | 'media_inspection'
  | 'return_flight';

export type ProjectWorldRightsState =
  | 'cleared'
  | 'restricted'
  | 'unavailable'
  | 'proposed_procedural';

export type ProjectWorldChapter = {
  id: string;
  titleEn: string;
  titleAr: string;
  frames?: [number, number];
  copyEn: string;
  copyAr: string;
  mediaSlotId?: string;
  proceduralOnly?: boolean;
};

export type ProjectWorldObjectPart = {
  id: string;
  label: string;
  kind: 'procedural' | 'sourced_media' | 'placeholder';
  rights: ProjectWorldRightsState;
  sourceNote: string;
};

export type ProjectWorldManifest = {
  id: string;
  parentSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us';
  parentProjectId: string | null;
  titleEn: string;
  titleAr: string;
  rightsState: ProjectWorldRightsState;
  chapters: ProjectWorldChapter[];
  objectParts: ProjectWorldObjectPart[];
  entryPose: {
    azimuth: number;
    polar: number;
    radius: number;
    focalMm: number;
  };
  returnPose: {
    azimuth: number;
    polar: number;
    radius: number;
    focalMm: number;
  };
  notes: string[];
};

/** Initial إصطمبة mould proof — procedural reconstruction only. */
export const ISTANBA_MOULD_PROOF: ProjectWorldManifest = {
  id: 'istanba-mould-proof',
  parentSphere: 'hq',
  parentProjectId: null,
  titleEn: 'Istanba mould proof (procedural)',
  titleAr: 'برهان قالب الإصطمبة (إجرائي)',
  rightsState: 'proposed_procedural',
  chapters: [
    {
      id: 'approach',
      titleEn: 'Approach',
      titleAr: 'اقتراب',
      copyEn: 'Approach the die threshold. Parent sphere remains intact.',
      copyAr: 'اقتراب من عتبة القالب. الكرة الأم تبقى سليمة.',
    },
    {
      id: 'die-opening',
      titleEn: 'Die opening',
      titleAr: 'فتح القالب',
      copyEn: 'Procedural die halves open. Labelled reconstruction — not ABINFER_MOULD.',
      copyAr: 'نصفا القالب الإجرائي ينفتحان. إعادة بناء معلّمة — ليست ABINFER_MOULD.',
      proceduralOnly: true,
    },
    {
      id: 'impression',
      titleEn: 'Impression inspection',
      titleAr: 'فحص الطبعة',
      copyEn: 'Inspect the impression cavity. No fabricated client footage.',
      copyAr: 'فحص تجويف الطبعة. بلا لقطات عميل مختلقة.',
      proceduralOnly: true,
    },
    {
      id: 'sourced-media-slot',
      titleEn: 'Sourced media slot',
      titleAr: 'خانة وسائط موثّقة',
      copyEn: 'Reserved for cleared media. Currently unavailable / rights-blocked.',
      copyAr: 'محجوزة لوسائط مُصرَّح بها. غير متاحة حالياً / محظورة حقوقياً.',
      mediaSlotId: 'istanba-sourced-slot',
    },
    {
      id: 'reassembly',
      titleEn: 'Reassembly',
      titleAr: 'إعادة التجميع',
      copyEn: 'Die closes. Inner object remains a reconstruction.',
      copyAr: 'يغلق القالب. الجسم الداخلي يبقى إعادة بناء.',
      proceduralOnly: true,
    },
    {
      id: 'return',
      titleEn: 'Return',
      titleAr: 'عودة',
      copyEn: 'Return restores exact parent project and camera context.',
      copyAr: 'العودة تستعيد مشروع الأب وسياق الكاميرا بدقة.',
    },
  ],
  objectParts: [
    {
      id: 'die-half-a',
      label: 'Die half A (procedural)',
      kind: 'procedural',
      rights: 'proposed_procedural',
      sourceNote: 'Generated mesh in-repo. Not the ABINFER_MOULD asset.',
    },
    {
      id: 'die-half-b',
      label: 'Die half B (procedural)',
      kind: 'procedural',
      rights: 'proposed_procedural',
      sourceNote: 'Generated mesh in-repo. Not the ABINFER_MOULD asset.',
    },
    {
      id: 'impression-cavity',
      label: 'Impression cavity',
      kind: 'procedural',
      rights: 'proposed_procedural',
      sourceNote: 'Procedural cavity for inspection choreography.',
    },
    {
      id: 'sourced-media-slot',
      label: 'Sourced media slot',
      kind: 'placeholder',
      rights: 'unavailable',
      sourceNote: 'No cleared media bound. Show explicit unavailable state.',
    },
  ],
  entryPose: { azimuth: 0.35, polar: 1.28, radius: 9.2, focalMm: 35 },
  returnPose: { azimuth: 0.12, polar: 1.42, radius: 19.0, focalMm: 35 },
  notes: [
    'Young & Human and Museum of Almost remain separately specified nested worlds.',
    'Do not use Tarek MHE fallback clip as Abu Hamdan production evidence.',
    'Do not claim ABINFER_MOULD exists in this repository.',
  ],
};

export const PROJECT_WORLD_MANIFESTS: Record<string, ProjectWorldManifest> = {
  [ISTANBA_MOULD_PROOF.id]: ISTANBA_MOULD_PROOF,
};

export function getProjectWorldManifest(id: string): ProjectWorldManifest | null {
  return PROJECT_WORLD_MANIFESTS[id] ?? null;
}

export const PROJECT_WORLD_STATE_ORDER: ProjectWorldInteractionState[] = [
  'parent_sphere',
  'project_focus',
  'threshold_flight',
  'project_world',
  'media_inspection',
  'return_flight',
];
