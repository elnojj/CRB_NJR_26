/**
 * Nested project-world contract (R05 / L03).
 * Parent sphere stays intact; inner object may assemble inside a threshold.
 * Procedural geometry is labelled reconstruction — never invents missing assets.
 */
import { PROJECTS_DATA } from './sourceData';
import {
  assetRefIdsFromSlots,
  primaryPosterForWorld,
  resolveProjectWorldMediaSlots,
  type ProjectWorldMediaSlot,
} from './projectWorldMedia';

export type { ProjectWorldMediaSlot };

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
  /** L13 — verified media slots (or explicit unavailable). */
  mediaSlots: ProjectWorldMediaSlot[];
  /** Poster for unavailable/ice plate when a verified still or showreel poster exists. */
  worldPoster: string | null;
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
  /** Register SAMPLE flag — never promoted to verified by media binding alone. */
  programmeIsSample: boolean;
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
  mediaSlots: [
    {
      id: 'istanba-sourced-slot',
      catalogId: null,
      kind: 'none',
      role: 'unavailable',
      url: null,
      poster: null,
      aspect: 'unknown',
      projection: 'flat',
      provenance: 'register-unavailable',
      playable: false,
      rights: 'unavailable',
      note: 'No cleared media bound. Show explicit unavailable state.',
    },
  ],
  worldPoster: null,
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
  programmeIsSample: false,
};

export const PROJECT_WORLD_MANIFESTS: Record<string, ProjectWorldManifest> = {
  [ISTANBA_MOULD_PROOF.id]: ISTANBA_MOULD_PROOF,
};

function objectPartsFromSlots(slots: ProjectWorldMediaSlot[]): ProjectWorldObjectPart[] {
  const parts: ProjectWorldObjectPart[] = slots.map((slot) => {
    if (slot.role === 'unavailable') {
      return {
        id: slot.id,
        label: 'Media unavailable',
        kind: 'placeholder' as const,
        rights: 'unavailable' as const,
        sourceNote: slot.note,
      };
    }
    return {
      id: slot.id,
      label: slot.id,
      kind: 'sourced_media' as const,
      rights: slot.rights,
      sourceNote: `${slot.provenance} · ${slot.note}`,
    };
  });
  parts.unshift({
    id: 'entry-node',
    label: 'Entry node',
    kind: 'placeholder',
    rights: slots.some((s) => s.playable) ? 'restricted' : 'unavailable',
    sourceNote: slots.some((s) => s.playable)
      ? 'Entry node with verified media slots; nested WebGL world remains unavailable until a cleared dimension exists.'
      : 'Scoped visual system pending verified assets for this project.',
  });
  return parts;
}

/**
 * Build a project-world manifest from a source project record.
 * Binds only verified catalog / public-brand / attached stills — never invents playable media.
 * Nested worldType stays `unavailable` until a cleared playable dimension exists (projectWorldRule).
 */
export function manifestFromProjectRecord(project: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isSample?: boolean;
}): ProjectWorldManifest {
  const isSample = Boolean(project.isSample);
  const mediaSlots = resolveProjectWorldMediaSlots({
    id: project.id,
    isSample,
  });
  const assetRefs = assetRefIdsFromSlots(mediaSlots);
  const worldPoster = primaryPosterForWorld(mediaSlots);
  const hasPlayable = mediaSlots.some((s) => s.playable && s.url);
  const playableVideo = mediaSlots.some(
    (s) => s.playable && s.kind === 'video' && s.url
  );

  const provenanceParts = [
    'Generated from project register.',
    isSample ? 'Programme flagged SAMPLE — not marked verified.' : 'Programme from verified register set.',
    hasPlayable
      ? `Bound ${assetRefs.length} verified media slot(s); nested world stays unavailable plate until a cleared dimension ships.`
      : 'No invented playable media — unavailable plate only.',
  ];

  return {
    id: `world-${project.id}`,
    projectId: project.id,
    entryNodeId: `entry-${project.id}`,
    // Still unavailable nested WebGL world even when tube/inspection media exists.
    worldType: 'unavailable',
    themeId: 'default-app',
    parentSphere: 'master',
    parentProjectId: project.id,
    titleEn: project.name,
    titleAr: project.code || project.id,
    rightsState: isSample ? 'restricted' : hasPlayable ? 'restricted' : 'unavailable',
    assetRefs,
    mediaSlots,
    worldPoster,
    provenance: provenanceParts.join(' '),
    interactionSteps: playableVideo
      ? ['entry', 'media_inspection', 'exit']
      : ['entry', 'exit'],
    exitRoute: 'return-master',
    fallback: 'unavailable-plate',
    chapters: [
      {
        id: 'entry',
        titleEn: 'Enter project world',
        titleAr: 'دخول عالم المشروع',
        copyEn: project.description || `Enter ${project.name}.`,
        copyAr: project.name,
        mediaSlotId: mediaSlots[0]?.id,
      },
      ...(playableVideo
        ? [
            {
              id: 'media_inspection',
              titleEn: 'Inspect verified media',
              titleAr: 'فحص الوسائط الموثّقة',
              copyEn: 'Inspect catalog-bound media. Sample programmes stay labelled SAMPLE.',
              copyAr: 'فحص الوسائط المربوطة بالكتالوج.',
              mediaSlotId: mediaSlots.find((s) => s.kind === 'video')?.id,
            },
          ]
        : []),
      {
        id: 'exit',
        titleEn: 'Return to master',
        titleAr: 'العودة للعالم الرئيسي',
        copyEn: 'Return restores the master-sphere pose and selection.',
        copyAr: 'العودة تستعيد وضع الكرة الرئيسية.',
      },
    ],
    objectParts: objectPartsFromSlots(mediaSlots),
    entryPose: { azimuth: 0.2, polar: 1.35, radius: 8.5, focalMm: 35 },
    returnPose: { azimuth: 0.12, polar: 1.42, radius: 19.0, focalMm: 35 },
    notes: [
      'Generated from source project register — not a fabricated world.',
      'Do not invent footage or rights claims for this portal.',
      ...(isSample
        ? ['Programme is SAMPLE in the register — media binding does not clear sample status.']
        : []),
      ...(worldPoster
        ? [`World poster bound: ${worldPoster}`]
        : ['No verified poster — ice / unavailable caption plate.']),
    ],
    programmeIsSample: isSample,
  };
}

export function getProjectWorldManifest(id: string): ProjectWorldManifest | null {
  if (PROJECT_WORLD_MANIFESTS[id]) return PROJECT_WORLD_MANIFESTS[id];
  const projectId = id.startsWith('world-') ? id.slice('world-'.length) : id;
  const fromSource = PROJECTS_DATA.find((p) => p.id === projectId);
  if (fromSource) {
    return manifestFromProjectRecord({
      id: fromSource.id,
      name: fromSource.name,
      code: fromSource.code,
      description: fromSource.description,
      isSample: fromSource.isSample,
    });
  }
  if (id.startsWith('world-')) {
    return manifestFromProjectRecord({ id: projectId, name: projectId, isSample: false });
  }
  return null;
}

/** All source-derived project worlds with catalog-bound media slots (or truthful unavailable). */
export function listSourceProjectWorldManifests(): ProjectWorldManifest[] {
  return PROJECTS_DATA.map((p) =>
    manifestFromProjectRecord({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      isSample: p.isSample,
    })
  );
}

export const PROJECT_WORLD_STATE_ORDER: ProjectWorldInteractionState[] = [
  'parent_sphere',
  'project_focus',
  'threshold_flight',
  'project_world',
  'media_inspection',
  'return_flight',
];
