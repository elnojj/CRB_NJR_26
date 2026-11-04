import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HQ_NODE_LINKS, HQ_TOP_LEVEL_NODES, NASA_PANELS, PROJECTS_PANELS, hqOwnerOfPanel } from './hqNodeWiring.ts';
import { CEREBRO_STATIONS, HQ_PROJECTS_DATA } from './sourceData.ts';

describe('HQ wiring', () => {
  it('HQ stations are exactly Projects and NASA', () => {
    assert.deepEqual(CEREBRO_STATIONS.map((st) => st.id), [...HQ_TOP_LEVEL_NODES]);
    assert.equal(CEREBRO_STATIONS.find((st) => st.id === 'people')?.label, 'NASA');
  });

  it('SEVEN is the only HQ project and nests under Projects', () => {
    assert.deepEqual(HQ_PROJECTS_DATA.map((p) => p.id), ['SEVEN']);
  });

  it('Projects and NASA are linked', () => {
    assert.ok(HQ_NODE_LINKS.some((l) => l.a === 'projects' && l.b === 'people'));
  });

  it('every project-management surface belongs to Projects, none to NASA', () => {
    for (const id of ['projects', 'tasks', 'timeline', 'decisions', 'minutes', 'team-room', 'gmail']) {
      assert.equal(hqOwnerOfPanel(id), 'projects', id);
    }
    for (const panel of NASA_PANELS) assert.equal(hqOwnerOfPanel(panel.panelId), 'people');
    const overlap = PROJECTS_PANELS.filter((p) => NASA_PANELS.some((n) => n.panelId === p.panelId));
    assert.equal(overlap.length, 0);
  });

  it('email states its real status', () => {
    assert.ok(PROJECTS_PANELS.find((p) => p.panelId === 'gmail')?.caveat);
  });
});
