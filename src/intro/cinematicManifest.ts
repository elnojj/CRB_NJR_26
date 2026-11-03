/**
 * Cinematic intro media manifest — provenance, delivery checks, clearance.
 * Root-relative URLs resolve against the deployment origin (e.g. cerebro-core.vercel.app).
 * Missing assets are explicit gaps — never silently substituted.
 */

import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';

export type DeliveryCheck =
  | 'HTTP_206_VIDEO_MP4_RANGE_CORS'
  | 'HTTP_200_IMAGE'
  | 'VIDEO_FILE_PRESENT_IN_SUPPLIED_REPOSITORY_PUBLIC_URL_NOT_VERIFIED'
  | 'MISSING_PUBLIC_URL_404'
  | 'NOT_RETESTED';

export type PublicationClearance =
  | 'VERIFY_EXISTING_APPROVAL'
  | 'BLOCKED_UNTIL_ASSET'
  | 'NEEDS_CONFIRMED_PORTRAIT_AND_BIO';

export type CinematicMediaAsset = {
  id: string;
  title: string;
  projectId: string | null;
  src: string | null;
  poster: string | null;
  usage: string;
  deliveryCheck: DeliveryCheck;
  posterDeliveryCheck: DeliveryCheck;
  publicationClearance: PublicationClearance;
  evidenceLimit?: string;
  /** When true, the beat must show a gap card — do not play unrelated footage. */
  blocked: boolean;
};

export const CINEMATIC_BRAND = {
  id: 'nojara-logo-white',
  localUrl: PUBLIC_BRAND_MEDIA.logoWhite.url,
  sourceUrl: PUBLIC_BRAND_MEDIA.logoWhite.sourceUrl,
  sourceDimensions: {
    width: PUBLIC_BRAND_MEDIA.logoWhite.width,
    height: PUBLIC_BRAND_MEDIA.logoWhite.height,
  },
  preserveAspectRatio: true,
  recreateAsText: false,
  markAr: 'نُچارة',
} as const;

/** Attributable media for the 180s film. Verified 2026-11-03 against production host. */
export const CINEMATIC_MEDIA: CinematicMediaAsset[] = [
  {
    id: 'med-nojara-showreel-2023',
    title: 'NOJARA Studios — 2023 Showreel',
    projectId: null,
    src: PUBLIC_BRAND_MEDIA.showreel2023.url,
    poster: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
    usage: 'studio-reel',
    deliveryCheck: 'HTTP_206_VIDEO_MP4_RANGE_CORS',
    posterDeliveryCheck: 'NOT_RETESTED',
    publicationClearance: 'VERIFY_EXISTING_APPROVAL',
    blocked: false,
  },
  {
    id: 'med-nojara-laliga',
    title: 'NOJARA × LaLiga — Film',
    projectId: null,
    src: PUBLIC_BRAND_MEDIA.laligaFilm.url,
    poster: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    usage: 'attributable-laliga-work',
    deliveryCheck: 'HTTP_206_VIDEO_MP4_RANGE_CORS',
    posterDeliveryCheck: 'NOT_RETESTED',
    publicationClearance: 'VERIFY_EXISTING_APPROVAL',
    blocked: false,
  },
  {
    id: 'med-el-batron',
    title: 'El Batron — Showreel',
    projectId: 'EL-BATRON',
    src: PUBLIC_BRAND_MEDIA.elBatron.url,
    poster: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
    usage: 'el-batron-archive',
    deliveryCheck: 'HTTP_206_VIDEO_MP4_RANGE_CORS',
    posterDeliveryCheck: 'NOT_RETESTED',
    publicationClearance: 'VERIFY_EXISTING_APPROVAL',
    blocked: false,
  },
  {
    id: 'tarek',
    title: 'Traverse Talks — founder archive',
    projectId: null,
    src: '/assets/media/tarek.mp4',
    poster: '/assets/media/tarek.jpg',
    usage: 'founder',
    deliveryCheck: 'MISSING_PUBLIC_URL_404',
    posterDeliveryCheck: 'MISSING_PUBLIC_URL_404',
    publicationClearance: 'BLOCKED_UNTIL_ASSET',
    evidenceLimit:
      'Local /assets/media/tarek.mp4 is absent on the deployed host (HTTP 404). Do not substitute showreel or LaLiga footage.',
    blocked: true,
  },
  {
    id: 'young-human',
    title: 'Young & Human — archived brand animation',
    projectId: 'YAH',
    src: '/assets/media/young-human.mp4',
    poster: '/assets/media/young-human.jpg',
    usage: 'archived-brand-animation',
    deliveryCheck: 'MISSING_PUBLIC_URL_404',
    posterDeliveryCheck: 'MISSING_PUBLIC_URL_404',
    publicationClearance: 'BLOCKED_UNTIL_ASSET',
    evidenceLimit:
      'Local /assets/media/young-human.mp4 is absent on the deployed host (HTTP 404). Does not independently prove a Cairo Tower activation or programme outcomes. Do not substitute showreel footage.',
    blocked: true,
  },
];

export const CINEMATIC_PEOPLE_GAPS = [
  {
    id: 'shweekar',
    name: 'Shweekar Ahmed',
    portrait: null,
    status: 'NEEDS_CONFIRMED_PORTRAIT_AND_BIO' as const,
    expectedPath: null,
    note: 'About Us beat 1 — confirmed portrait not in public media folder.',
  },
  {
    id: 'khaled',
    name: 'Khaled Al-Shaalan',
    portrait: null,
    status: 'NEEDS_CONFIRMED_PORTRAIT_AND_BIO' as const,
    expectedPath: null,
    note: 'About Us beat 2 — confirmed portrait not in public media folder. Private project data stays permission-gated.',
  },
  {
    id: 'tarek',
    name: 'Tarek Nojara',
    portrait: '/media/about-tarek-afrima.jpg',
    status: 'NEEDS_CONFIRMED_PORTRAIT_AND_BIO' as const,
    expectedPath: '/media/about-tarek-afrima.jpg',
    note: 'About Us beat 3 — owner-supplied AFRIMA plate + BTS reel missing on deploy host; do not substitute showreel as portrait.',
  },
] as const;

export const CINEMATIC_EXCLUSIONS = {
  gondwana: 'Removed from the presentation journey per owner correction.',
  istambaSpelling: 'Preserve إصطمبة as the supplied project name — never Istanbul.',
  falseAttribution: [
    'Do not present LaLiga footage as Abu Hamdan (MHE) or BSocial work.',
    'Do not present general showreel footage as Museum of Almost footage.',
    'Do not describe Tarek’s Traverse Talks clip as GQ footage.',
    'Do not assign launch stills or anonymous avatars as Shweekar or Khaled portraits.',
  ],
} as const;

export function cinematicMediaById(id: string): CinematicMediaAsset | undefined {
  return CINEMATIC_MEDIA.find((m) => m.id === id);
}
