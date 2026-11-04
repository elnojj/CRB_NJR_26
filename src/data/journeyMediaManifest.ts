/**
 * One record per approved source in the Drive folder
 * https://drive.google.com/drive/folders/1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh
 *
 * Drive links are provenance only. `runtimeUrl` stays null until a file is served from storage the
 * browser can actually reach (same-origin /public copy or an authorised stream route). Nothing here
 * claims playback works: `playback` records what has been verified, which is nothing for remote files.
 */

export type MediaKind = 'video' | 'image';

export type MediaAccessTier = 'drive-restricted' | 'public-local';

export type MediaRightsStatus = 'unreviewed';

export type MediaPlaybackStatus =
  | 'unresolved'
  | 'local-file-present-unplayed';

export type MediaTimecode = { label: string; startSec: number; endSec: number };

export type JourneyMediaRecord = {
  assetId: string;
  owningNodeId: string | null;
  title: string;
  sourceUrl: string;
  driveFileId: string;
  originalFilename: string;
  runtimeUrl: string | null;
  mimeType: string;
  kind: MediaKind;
  posterUrl: string | null;
  accessTier: MediaAccessTier;
  rightsStatus: MediaRightsStatus;
  /** Excerpt ranges chosen after review. Empty means no excerpt has been reviewed yet. */
  timecodes: MediaTimecode[];
  sizeBytes: number;
  playback: MediaPlaybackStatus;
  attribution: string;
  note?: string;
};

export const SOURCE_FOLDER_URL = 'https://drive.google.com/drive/folders/1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh';

const driveUrl = (id: string): string => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;

type Seed = {
  assetId: string;
  owningNodeId: string | null;
  title: string;
  driveFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  attribution: string;
  runtimeUrl?: string;
  note?: string;
};

const SEEDS: Seed[] = [
  { assetId: 'med-noj-laliga-wal3ana', owningNodeId: 'hq__media__laliga', title: 'NOJ LaLiga Wal3ana', driveFileId: '1JuftO8KtXKGeEcEPCXDpDXmtiS5a9orQ', originalFilename: 'noj laliga wal3ana copy 2.mp4', mimeType: 'video/mp4', sizeBytes: 25301142, attribution: 'NOJARA × LaLiga (filename)' },
  { assetId: 'med-tn-afrima-awards', owningNodeId: 'about__tarek__story', title: 'All Africa Music Awards', driveFileId: '13doivicNrG4XoDlU3IPd6Ou4cSYKJPl9', originalFilename: 'TN_All africa music awards.MOV', mimeType: 'video/quicktime', sizeBytes: 184905266, attribution: 'Tarek Nojara at AFRIMA (filename)', note: 'QuickTime container: Safari-only decode until transcoded.' },
  { assetId: 'med-tn-gouna-film-festival', owningNodeId: 'about__tarek__story', title: 'Gouna Film Festival', driveFileId: '1v35MmuknjUKZjiEgAfdCmATDkveIiYbH', originalFilename: 'TN_Gouna film festival.613Z', mimeType: 'video/quicktime', sizeBytes: 9107866, attribution: 'Tarek Nojara at El Gouna Film Festival (filename)', note: 'Filename has no extension; container unverified.' },
  { assetId: 'med-tn-impact-list', owningNodeId: 'about__tarek__story', title: 'Impact List', driveFileId: '18E4nCk7NDxkGlOFakl5bD-gHeyus_8X-', originalFilename: 'TN_Impact list .612Z', mimeType: 'video/mp4', sizeBytes: 11781365, attribution: 'Tarek Nojara — Impact List (filename)', note: 'Filename has no extension; container unverified.' },
  { assetId: 'med-traverse-talks-disruption', owningNodeId: 'about__tarek__story', title: 'Traverse Talks — The Art of Disruption', driveFileId: '10wkMG1uToiOzivulOf6z_p929HfnHuS0', originalFilename: 'Traverse Talks | Tarek Nojara - The Art of Disruption copy.mp4', mimeType: 'video/mp4', sizeBytes: 16044256, attribution: 'Traverse Talks with Tarek Nojara' },
  { assetId: 'img-4090', owningNodeId: 'about__tarek__story', title: 'Still image IMG_4090', driveFileId: '1FtfXyyo9kvS-2zH9h1CwWZWDy3Ppd7BO', originalFilename: 'IMG_4090.PNG', mimeType: 'image/jpeg', sizeBytes: 978458, attribution: 'Unidentified still — subject and credit not stated in the source list', note: 'Drive reports image/jpeg for a .PNG filename.' },
  { assetId: 'med-riyadh-season-launch', owningNodeId: 'cde__production__saudi', title: 'Riyadh Season Launch Campaign', driveFileId: '1WOsaz0C-F9sTnWl_xQaSN1wt86I_jRoA', originalFilename: 'HH_Turki Alshaikh - Riyadh season launch campaign .mp4', mimeType: 'video/mp4', sizeBytes: 4794858, attribution: 'Riyadh Season launch campaign (filename)' },
  { assetId: 'med-saudi-clip-a', owningNodeId: 'cde__production__saudi', title: 'Saudi Clip A', driveFileId: '13MrYkDArE4-MdkNZeoj1SUqqWnjM-sE5', originalFilename: 'File - 2026-10-03T22:00:31.340Z', mimeType: 'video/mp4', sizeBytes: 32397553, attribution: 'Saudi-related work; project not identified in the source list' },
  { assetId: 'med-saudi-clip-b', owningNodeId: 'cde__production__saudi', title: 'Saudi Clip B', driveFileId: '19evlyB3HQTRsnu3MZjFqlGKYFsqfrEeO', originalFilename: 'File - 2026-10-03T22:00:31.340Z', mimeType: 'video/mp4', sizeBytes: 7029798, attribution: 'Saudi-related work; project not identified in the source list' },
  { assetId: 'med-saudi-clip-c', owningNodeId: 'cde__production__saudi', title: 'Saudi Clip C', driveFileId: '1gl17FrjVh2FUiz7YDbFNecf4XkYYLyPy', originalFilename: 'File - 2026-10-03T22:00:31.340Z', mimeType: 'video/mp4', sizeBytes: 3749746, attribution: 'Saudi-related work; project not identified in the source list' },
  { assetId: 'med-saudi-clip-d', owningNodeId: 'cde__production__saudi', title: 'Saudi Clip D', driveFileId: '1HBSstsLOYaPJwzhZidZcthrgUeoJaRS8', originalFilename: 'File - 2026-10-03T22:00:31.340Z', mimeType: 'video/mp4', sizeBytes: 3244015, attribution: 'Saudi-related work; project not identified in the source list' },
  { assetId: 'img-person-khalid', owningNodeId: 'about__people__khalid', title: 'Khalid Alshaalan portrait', driveFileId: '1Hod7c-5Zi53w8VSwwmvtcp2Dife_cGbf', originalFilename: 'unknown (reference link only)', mimeType: 'image/jpeg', sizeBytes: 0, attribution: 'Khalid Alshaalan (user-confirmed portrait reference)', note: 'Reference supplied for the opening sequence. Runtime image not yet ingested or validated.' },
  { assetId: 'img-person-shweekar', owningNodeId: 'about__people__shweekar', title: 'Shweekar Ahmed — approved photo', driveFileId: '15gAJwJvL1Yma0MCGQOJmej6zZRlViu9-', originalFilename: 'Shweekar Ahmed.jpg', mimeType: 'image/jpeg', sizeBytes: 285550, attribution: 'Shweekar Ahmed (user-supplied approved photo)' },
  { assetId: 'med-but-first-production', owningNodeId: 'cde__production__tech', title: 'But First, Production with Tarek Nojara', driveFileId: '1FNtBCltin3KBB5lPSSqXcLMkdXJTsUAX', originalFilename: 'But first, Production with Tarek Nojara - Episode copy 2.mp4', mimeType: 'video/mp4', sizeBytes: 8726702, attribution: 'But First, Production — episode with Tarek Nojara' },
  { assetId: 'img-tn-onfire', owningNodeId: 'about__tarek__story', title: 'TN_ONFIRE', driveFileId: '170WxTGtMYvmHVFAUhY-wXLEB6iKTUgbx', originalFilename: 'TN_ONFIRE.png', mimeType: 'image/png', sizeBytes: 3637814, attribution: 'Tarek Nojara (filename)' },
  { assetId: 'img-tn-production-set', owningNodeId: 'cde__production__tech', title: 'Production set', driveFileId: '1I_CSr4EL90X7IS2eLgtA9akd1MNS-xO0', originalFilename: '18_tarek_nojara_production_set_reinstated_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 3023571, attribution: 'Tarek Nojara on a production set' },
  { assetId: 'img-tn-el-gouna', owningNodeId: 'about__tarek__story', title: 'El Gouna photo', driveFileId: '1byVxL1kcSZ0IwQX9CXFmfzqG2ZLno0Gy', originalFilename: '17_tarek_nojara_el_gouna_film_festival_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 3031637, attribution: 'Tarek Nojara at El Gouna Film Festival' },
  { assetId: 'img-tn-entrepreneur-awards', owningNodeId: 'about__tarek__story', title: 'Entrepreneur Awards photo', driveFileId: '19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU', originalFilename: '16_tarek_nojara_egypt_entrepreneur_awards_finalist_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 808357, attribution: 'Tarek Nojara — Egypt Entrepreneur Awards finalist (not winner)', runtimeUrl: '/hotspot26/19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU.jpg', note: 'Byte size matches the same-origin copy in public/hotspot26.' },
  { assetId: 'img-tn-outdoor-production', owningNodeId: 'cde__production__tech', title: 'Outdoor production', driveFileId: '1ucm2Zc9YeiCH8M10gzEGc5F4vk2_vu8j', originalFilename: '15_tarek_nojara_outdoor_production_set_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 3550286, attribution: 'Tarek Nojara on an outdoor production set' },
  { assetId: 'img-tn-riyadh-season-bts', owningNodeId: 'cde__production__saudi', title: 'Riyadh Season BTS', driveFileId: '15vzqgrVAyTcjZ6Dyb8972d1KcnGF0HSW', originalFilename: '14_tarek_nojara_riyadh_season_spiderman_bts_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 2943060, attribution: 'Tarek Nojara — Riyadh Season behind the scenes', note: 'A celebrity or event image does not establish campaign credit.' },
  { assetId: 'img-tn-aircraft-portrait', owningNodeId: 'about__tarek__story', title: 'Aircraft portrait', driveFileId: '1PhOlqwW7zobuv9Xrj4TKqBl_OBo2wDB-', originalFilename: '13_tarek_nojara_mohamed_ramadan_aircraft_portrait_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 3015330, attribution: 'Tarek Nojara (filename names a second person; credit not established)' },
  { assetId: 'img-tn-wegz-bts', owningNodeId: 'cde__strategy__culture', title: 'Wegz campaign BTS', driveFileId: '1V1KMG0nS7u2U8YOVMv9DeOgz5jzDDyvw', originalFilename: '12_tarek_nojara_wegz_orange_campaign_bts_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 3283862, attribution: 'Behind the scenes (filename); campaign credit not established' },
  { assetId: 'img-tn-asser-yassin-bts', owningNodeId: 'cde__strategy__culture', title: 'Asser Yassin campaign BTS', driveFileId: '1RX8ndNmjGmYLGZO_HthERhw0I3N_lfXu', originalFilename: '11_tarek_nojara_asser_yassin_schweppes_gold_bts_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 2647755, attribution: 'Behind the scenes (filename); campaign credit not established' },
  { assetId: 'img-tn-afrima-summit', owningNodeId: 'cde__strategy__culture', title: 'AFRIMA summit photo', driveFileId: '1BBf1Jo1MZrztEIJj8ig0D5GQ_vyXi-Mq', originalFilename: '05_tarek_nojara_afrima_summit_2022_4k.jpg', mimeType: 'image/jpeg', sizeBytes: 2774112, attribution: 'Tarek Nojara at AFRIMA Summit 2022 (filename)' },
  { assetId: 'med-master-media-kit-reel', owningNodeId: 'hq__media__nojara', title: 'Master Media Kit Reel', driveFileId: '19dUAIdbULKjOCbigIt_vQXgFZn0jVoBu', originalFilename: 'NOJJ Media Kit Reel.MP4', mimeType: 'video/mp4', sizeBytes: 83695541, attribution: 'NOJARA media kit reel' },
  { assetId: 'med-nojara-showreel', owningNodeId: 'about__studio__showreel', title: 'NOJARA Showreel', driveFileId: '143QDgWYEcU9kI7F87XVMHr9WZuWl6HBe', originalFilename: '1- NJR Showreel.mp4', mimeType: 'video/mp4', sizeBytes: 354708630, attribution: 'NOJARA Studios showreel — portfolio overview, not a single campaign' },
  { assetId: 'med-el-batron-mp4', owningNodeId: 'hq__proj__bat', title: 'El Batron showreel (MP4)', driveFileId: '1xh0Dqv4yo-sUO7oSZbThIG0e1RDXLln8', originalFilename: 'Batron showreel.mp4', mimeType: 'video/mp4', sizeBytes: 178785924, attribution: 'El Batron' },
  { assetId: 'med-el-batron-mov', owningNodeId: 'hq__proj__bat', title: 'El Batron showreel (MOV)', driveFileId: '1WWWK8gL9_0y1VPbivuXy3uzUmS3XbBFZ', originalFilename: 'Batron showreel.mov', mimeType: 'video/quicktime', sizeBytes: 10104313, attribution: 'El Batron (separate file from the MP4)' },
  { assetId: 'med-njr-laliga-mov', owningNodeId: 'hq__media__laliga', title: 'NJR × LaLiga (May 18th)', driveFileId: '1VhaSuMQn5b6DahSftaQ9bTwH2fPrHoKx', originalFilename: '2-NJR X LaLiga (May 18th).mov', mimeType: 'video/quicktime', sizeBytes: 176410997, attribution: 'NJR × LaLiga (filename)' },
];

export const JOURNEY_MEDIA_MANIFEST: readonly JourneyMediaRecord[] = SEEDS.map((s) => ({
  assetId: s.assetId,
  owningNodeId: s.owningNodeId,
  title: s.title,
  sourceUrl: driveUrl(s.driveFileId),
  driveFileId: s.driveFileId,
  originalFilename: s.originalFilename,
  runtimeUrl: s.runtimeUrl ?? null,
  mimeType: s.mimeType,
  kind: s.mimeType.startsWith('video/') ? 'video' : 'image',
  posterUrl: null,
  accessTier: s.runtimeUrl ? 'public-local' : 'drive-restricted',
  rightsStatus: 'unreviewed',
  timecodes: [],
  sizeBytes: s.sizeBytes,
  playback: s.runtimeUrl ? 'local-file-present-unplayed' : 'unresolved',
  attribution: s.attribution,
  note: s.note,
}));

const BY_ID = new Map(JOURNEY_MEDIA_MANIFEST.map((r) => [r.assetId, r] as const));

export function getMediaRecord(assetId: string): JourneyMediaRecord | null {
  return BY_ID.get(assetId) ?? null;
}

export function mediaForNode(owningNodeId: string): JourneyMediaRecord[] {
  return JOURNEY_MEDIA_MANIFEST.filter((r) => r.owningNodeId === owningNodeId);
}

/** Explicit gaps: assets the brief names that no verified source file backs yet. */
export const MEDIA_GAPS: readonly { id: string; nodeId: string; reasonEn: string }[] = [
  { id: 'gap-yah-media', nodeId: 'hq__proj__yah', reasonEn: 'No verified YAH! (Young & Human) media in the approved folder.' },
  { id: 'gap-moa-media', nodeId: 'hq__proj__moa', reasonEn: 'No verified Mission Lotus / MOA media in the approved folder.' },
  { id: 'gap-bsocial-media', nodeId: 'hq__proj__bsocial', reasonEn: 'No verified BSOCIAL media in the approved folder.' },
  { id: 'gap-mhe-media', nodeId: 'hq__proj__mhe', reasonEn: 'No verified MHE media in the approved folder.' },
  { id: 'gap-ahr-media', nodeId: 'hq__proj__ahr', reasonEn: 'No verified AHR media in the approved folder.' },
];
