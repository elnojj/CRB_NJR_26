import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifySurfaceHost, enforceSingleSurfaceHost } from './surfaceHost';

const context = {
  projectTab: 'tasks',
  scrollTopByPanel: { 'project-detail': 320, media: 12 },
  draftByPanel: { 'project-detail': 'Unsent note' },
};

describe('RULE-04 single-active surface', () => {
  it('routes every panel to the phone sheet on a phone', () => {
    assert.equal(classifySurfaceHost('cde-explorer', 'phone'), 'PhoneSheet');
    assert.equal(classifySurfaceHost('project-detail', 'phone'), 'PhoneSheet');
  });

  it('splits desktop panels between workspace panel and station inspector', () => {
    assert.equal(classifySurfaceHost('project-detail', 'desktop'), 'ProjectWorkspacePanel');
    assert.equal(classifySurfaceHost('story-journey', 'desktop'), 'StationInspector');
  });

  it('leaves a same-host panel set untouched', () => {
    const plan = enforceSingleSurfaceHost(['baghira', 'kinzo'], 'desktop', context);
    assert.deepEqual(plan.panels, ['baghira', 'kinzo']);
    assert.equal(plan.displaced.length, 0);
  });

  it('drops the displaced host and keeps its tab, scroll and draft', () => {
    const plan = enforceSingleSurfaceHost(['project-detail', 'media'], 'desktop', context);
    assert.equal(plan.activeHost, 'StationInspector');
    assert.deepEqual(plan.panels, ['media']);
    assert.equal(plan.displaced.length, 1);
    const [snapshot] = plan.displaced;
    assert.equal(snapshot.host, 'ProjectWorkspacePanel');
    assert.deepEqual(snapshot.panels, ['project-detail']);
    assert.equal(snapshot.projectTab, 'tasks');
    assert.equal(snapshot.scrollTopByPanel['project-detail'], 320);
    assert.equal(snapshot.draftByPanel['project-detail'], 'Unsent note');
  });

  it('is empty when nothing is open', () => {
    assert.deepEqual(enforceSingleSurfaceHost([], 'phone', context), { panels: [], activeHost: null, displaced: [] });
  });
});
