export type ProjectWorldManifest = {
  projectId: string;
  title: string;
  worldId: string;
  worldType?: string;
};

const MANIFESTS: Record<string, ProjectWorldManifest> = {};

export function getProjectWorldManifest(
  projectId: string
): ProjectWorldManifest | null {
  if (MANIFESTS[projectId]) return MANIFESTS[projectId];
  return {
    projectId,
    title: projectId,
    worldId: `world:${projectId}`,
    worldType: 'project',
  };
}
