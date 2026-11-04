import type { TeamRoomChannelId } from '../data/sourceData';

export type AudienceLevel = 'Owner only' | 'Partner or assistant present' | 'Public';
export type ProjectWorkspaceTab =
  | 'overview'
  | 'tasks'
  | 'decisions'
  | 'minutes'
  | 'files'
  | 'team';

export interface MinimisedChip {
  panelId: string;
  label: string;
  projectId?: string;
  subTab?: ProjectWorkspaceTab;
  scrollTop?: number;
  unsentDraft?: string;
  activeChannel?: TeamRoomChannelId;
}

export interface CustomTaskItem {
  id: string;
  title: string;
  projectCode: string;
  owner: string;
  createdAt: string;
  attachmentName?: string;
}

export interface MediaPlaybackState {
  playing: boolean;
  muted: boolean;
  currentTimeSec: number;
  durationSec: number;
}
