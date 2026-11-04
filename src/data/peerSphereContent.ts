/**
 * Interior node content for Campaign OS and About Us peer spheres.
 * Uses verified public-brand / About Us catalog only — no invented campaigns.
 */
import { ABOUT_US_BIOS } from './driveMediaCatalog';
import { PUBLIC_SHOWREELS } from './publicBrandMedia';
import { PROJECT_SHOTS } from './shotMediaCatalog';
import type { ConnectedSphereId } from '../three/sphereNetwork';

export type PeerSphereNodeSpec = {
  id: string;
  label: string;
  sublabel: string;
  colour: string;
  position: [number, number, number];
  nodeType: 'project' | 'station' | 'person' | 'media';
  /** Node this one is nested under; the parent must come earlier in its list. */
  parentId?: string;
};

/** Campaign OS — public showreels + activation-leaning register programmes. */
export const CAMPAIGN_OS_NODES: PeerSphereNodeSpec[] = [
  {
    id: 'camp-laliga',
    label: 'LaLiga Film',
    sublabel: PUBLIC_SHOWREELS[1]?.title || 'Campaign film',
    colour: '#65ACFF',
    position: [1.55, 1.35, 0.85],
    nodeType: 'media',
  },
  {
    id: 'camp-el-batron',
    label: 'EL-BATRON',
    sublabel: 'Showreel · public brand',
    colour: '#F2B66D',
    position: [-1.45, 1.25, 0.95],
    nodeType: 'project',
  },
  {
    id: 'camp-seven',
    label: 'SEVEN',
    sublabel: 'Destination participation',
    colour: '#3D8BFF',
    position: [0.15, 0.15, 1.85],
    nodeType: 'project',
  },
  {
    id: 'camp-nojara-showreel',
    label: 'NOJARA 2023',
    sublabel: PUBLIC_SHOWREELS[0]?.title || 'Studio showreel',
    colour: '#D4AF37',
    position: [0.05, -0.05, -1.75],
    nodeType: 'media',
  },
];

/** People nodes are disabled in About Us; only the studio bio stays in the scene. */
const DISABLED_ABOUT_BIO_IDS: ReadonlySet<string> = new Set(['shweekar-ahmed', 'khaled-al-shaalan', 'tarek-nojara']);
const ENABLED_ABOUT_BIOS = ABOUT_US_BIOS.filter((bio) => !DISABLED_ABOUT_BIO_IDS.has(bio.id));

const aboutBios: PeerSphereNodeSpec[] = ENABLED_ABOUT_BIOS.map((bio, idx) => {
  const angle = (idx / Math.max(ENABLED_ABOUT_BIOS.length, 1)) * Math.PI * 2;
  const r = 1.55;
  return {
    id: bio.id,
    label: bio.name,
    sublabel: bio.role,
    colour: idx === 0 ? '#D4AF37' : '#E6A2B4',
    position: [
      Math.cos(angle) * r,
      Math.sin(angle) * 0.55,
      Math.sin(angle) * r * 0.65,
    ] as [number, number, number],
    nodeType: 'person' as const,
  };
});

/** About Us — verified bios + gallery / crew pointers. */
export const ABOUT_US_NODES: PeerSphereNodeSpec[] = [
  ...aboutBios,
  {
    id: 'about-portfolio',
    label: 'Portfolio',
    sublabel: 'Showreels · projects · gallery',
    colour: '#F2B66D',
    position: [-0.15, 1.55, 0.45],
    nodeType: 'station',
  },
  {
    id: 'about-gallery',
    label: 'Gallery',
    sublabel: 'Hotspot plates · verified',
    colour: '#65ACFF',
    position: [-1.25, 0.8, 0.85],
    nodeType: 'media',
    parentId: 'about-portfolio',
  },
];

export const SPHERE_CAPTION: Record<ConnectedSphereId, string> = {
  hq: 'Cerebro HQ',
  cde: 'CDE Universe',
  'campaign-os': 'Campaign OS',
  'about-us': 'About Us',
};
