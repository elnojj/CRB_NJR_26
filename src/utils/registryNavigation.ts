import { ENVIRONMENTS, matchKeywordTarget, type NodeDef } from '../data/environmentRegistry';
import type { WorkspaceAction } from './actionDispatcher';

/**
 * Turns a typed or spoken phrase that names a registry node ("Show me El Batron") into the ordered
 * workspace actions that fly the single camera there. Typing and voice share this one planner, so the
 * two input paths cannot disagree about where a phrase leads.
 */

export interface RegistryNavigationPlan {
  node: NodeDef;
  actions: WorkspaceAction[];
  captionEn: string;
}

const NAVIGATION_VERB = /\b(show|open|take|go|fly|bring|navigate|play|see|view|who|where|visit|take me)\b/i;
const LEAVE_TO_SPECIFIC_INTENT = /\b(task|tasks|raci|insight|insights|brief|briefing|gmail|calendar|drive|schedule|risk|budget)\b/i;

export function planRegistryNavigation(text: string): RegistryNavigationPlan | null {
  if (LEAVE_TO_SPECIFIC_INTENT.test(text)) return null;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 4 && !NAVIGATION_VERB.test(text)) return null;
  const node = matchKeywordTarget(text);
  if (!node) return null;
  const env = ENVIRONMENTS[node.envId];
  const actions: WorkspaceAction[] = [];
  let captionEn = node.titleEn;

  switch (node.kind) {
    case 'project': {
      const projectId = node.legacyIds?.[0];
      if (!projectId) {
        actions.push({ type: 'switch_sphere', sphere: env.sphereId });
        captionEn = `${node.titleEn} · ${node.honestStateEn ?? env.titleEn}`;
        break;
      }
      actions.push({ type: 'focus_project', projectId });
      if (node.honestStateEn) {
        captionEn = `${node.titleEn} · ${node.honestStateEn}`;
      } else {
        actions.push({ type: 'project_media_tube', action: 'open', projectId });
        captionEn = `${node.titleEn} · media tube`;
      }
      break;
    }
    case 'media-shell':
      if (node.nodeId === 'laliga') {
        actions.push({ type: 'media_control', action: 'select', reelId: 'med-laliga' });
      } else {
        actions.push({ type: 'switch_sphere', sphere: env.sphereId });
      }
      break;
    case 'agent':
      actions.push({ type: 'switch_sphere', sphere: env.sphereId });
      captionEn = `NASA · ${node.titleEn}${node.status === 'proposed' ? ' · PROPOSED' : ''} · no runtime connection`;
      break;
    case 'person':
    case 'story':
    case 'studio':
    case 'pillar':
    case 'stage':
    case 'register':
    case 'files':
      actions.push({ type: 'switch_sphere', sphere: env.sphereId });
      captionEn = node.honestStateEn ? `${node.titleEn} · ${node.honestStateEn}` : `${node.titleEn} · ${env.titleEn}`;
      break;
    default: {
      const unhandled: never = node.kind;
      return unhandled;
    }
  }
  return { node, actions, captionEn };
}

/** Registry routing wins only over generic parses; specific intents (a named tab, a transport verb) keep their own path. */
export function registryPlanShouldOverride(parsed: WorkspaceAction | null): boolean {
  if (!parsed) return true;
  if (parsed.type === 'focus_project') return parsed.tab === undefined;
  if (parsed.type === 'media_control') return parsed.action === 'select';
  return false;
}
