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
  /** Contract fields — every world declares these explicitly. */
  projectId: string | null;
  entryNodeId: string;
  worldType: 'procedural-proof' | 'project-dimension' | 'unavailable';
  themeId: 'default-app' | 'film-sehly' | 'project-scoped';
  parentSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us' | 'master';
  parentProjectId: string | null;
  titleEn: string;
  titleAr: string;
  rightsState: ProjectWorldRightsState;
  assetRefs: string[];
  provenance: string;
  interactionSteps: string[];
  exitRoute: 'return-master' | 'return-parent-project';
  fallback: 'unavailable-plate' | 'master-world';
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
  projectId: null,
  entryNodeId: 'istanba-entry',
  worldType: 'procedural-proof',
  themeId: 'project-scoped',
  parentSphere: 'hq',
  parentProjectId: null,
  titleEn: 'Istanba mould proof (procedural)',
  titleAr: 'برهان قالب الإصطمبة (إجرائي)',
  rightsState: 'proposed_procedural',
  assetRefs: [],
  provenance: 'Procedural reconstruction in-repo; not ABINFER_MOULD.',
  interactionSteps: ['approach', 'die-opening', 'impression', 'sourced-media-slot', 'reassembly', 'return'],
  exitRoute: 'return-master',
  fallback: 'master-world',
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

/**
 * Build a minimal project-world manifest from a source project record.
 * Does not invent playable media — marks media as unavailable until bound.
 */
export function manifestFromProjectRecord(project: {
  id: string;
  name: string;
  code?: string;
  description?: string;
}): ProjectWorldManifest {
  return {
    id: `world-${project.id}`,
    projectId: project.id,
    entryNodeId: `entry-${project.id}`,
    worldType: 'unavailable',
    themeId: 'default-app',
    parentSphere: 'master',
    parentProjectId: project.id,
    titleEn: project.name,
    titleAr: project.code || project.id,
    rightsState: 'restricted',
    assetRefs: [],
    provenance: 'Generated from project register; no invented playable media.',
    interactionSteps: ['entry', 'exit'],
    exitRoute: 'return-master',
    fallback: 'unavailable-plate',
    chapters: [
      {
        id: 'entry',
        titleEn: 'Enter project world',
        titleAr: 'دخول عالم المشروع',
        copyEn: project.description || `Enter ${project.name}.`,
        copyAr: project.name,
      },
      {
        id: 'exit',
        titleEn: 'Return to master',
        titleAr: 'العودة للعالم الرئيسي',
        copyEn: 'Return restores the master-sphere pose and selection.',
        copyAr: 'العودة تستعيد وضع الكرة الرئيسية.',
      },
    ],
    objectParts: [
      {
        id: 'entry-node',
        label: 'Entry node',
        kind: 'placeholder',
        rights: 'unavailable',
        sourceNote: 'Scoped visual system pending verified assets for this project.',
      },
    ],
    entryPose: { azimuth: 0.2, polar: 1.35, radius: 8.5, focalMm: 35 },
    returnPose: { azimuth: 0.12, polar: 1.42, radius: 19.0, focalMm: 35 },
    notes: [
      'Generated from source project register — not a fabricated world.',
      'Do not invent footage or rights claims for this portal.',
    ],
  };
}

export function getProjectWorldManifest(id: string): ProjectWorldManifest | null {
  if (PROJECT_WORLD_MANIFESTS[id]) return PROJECT_WORLD_MANIFESTS[id];
  if (id.startsWith('world-')) {
    const projectId = id.slice('world-'.length);
    return manifestFromProjectRecord({ id: projectId, name: projectId });
  }
  return null;
}

export const PROJECT_WORLD_STATE_ORDER: ProjectWorldInteractionState[] = [
  'parent_sphere',
  'project_focus',
  'threshold_flight',
  'project_world',
  'media_inspection',
  'return_flight',
];
