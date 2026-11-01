/**
 * Official NOJARA Public Brand Media Catalog (Master Brand Kit V31)
 *
 * Source Authority:
 * 1. NOJARA Master Brand Kit V31 & verified public Wix static media URLs.
 * 2. Original Arabic mark reads نُچارة (preserving diacritic and Persian-Arabic چ).
 * 3. Exact direct MP4 URLs consumed directly by HTML5 video elements without Drive sign-in.
 */

export const PUBLIC_BRAND_MEDIA = {
  logoWhite: {
    url: 'https://static.wixstatic.com/media/227dff_accb38bbc37b492f9b64ca3e12fbf63e~mv2.png',
    width: 2584,
    height: 644,
    provenance: 'existing NOJARA Wix site image; master-file identity unverified',
  },
  showreel2023: {
    id: 'med-nojara-showreel-2023',
    title: 'NOJARA Studios — 2023 Showreel',
    projectCode: 'NOJARA',
    kind: 'video' as const,
    url: 'https://video.wixstatic.com/video/227dff_5eb47ff9d6fc4753802d517fa87f3a43/720p/mp4/file.mp4',
    posterUrl: 'https://static.wixstatic.com/media/227dff_5eb47ff9d6fc4753802d517fa87f3a43f000.jpg',
    expectedDurationSec: 141.68,
  },
  laligaFilm: {
    id: 'med-nojara-laliga',
    title: 'NOJARA × LaLiga — Film',
    projectCode: 'NOJARA',
    kind: 'video' as const,
    url: 'https://video.wixstatic.com/video/227dff_8649ac6a450c471683cc3e72a2655a02/720p/mp4/file.mp4',
    desktop1080Url: 'https://video.wixstatic.com/video/227dff_8649ac6a450c471683cc3e72a2655a02/1080p/mp4/file.mp4',
    posterUrl: 'https://static.wixstatic.com/media/227dff_8649ac6a450c471683cc3e72a2655a02f000.jpg',
    expectedDurationSec: 205.84,
  },
  elBatron: {
    id: 'med-el-batron', // retain existing action-dispatch ID
    title: 'El Batron — Showreel',
    projectCode: 'EL-BATRON',
    kind: 'video' as const,
    url: 'https://video.wixstatic.com/video/227dff_620a67c30ded4fcfbd798648a3dacc6a/720p/mp4/file.mp4',
    posterUrl: 'https://static.wixstatic.com/media/227dff_620a67c30ded4fcfbd798648a3dacc6af000.jpg',
    expectedDurationSec: 138.44,
  },
} as const;

export const PUBLIC_SHOWREELS = [
  PUBLIC_BRAND_MEDIA.showreel2023,
  PUBLIC_BRAND_MEDIA.laligaFilm,
  PUBLIC_BRAND_MEDIA.elBatron,
] as const;

export type PublicShowreel = (typeof PUBLIC_SHOWREELS)[number];

export const publicShowreelById = new Map<string, PublicShowreel>(
  PUBLIC_SHOWREELS.map((item) => [item.id, item])
);
