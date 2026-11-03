import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPlanGraph,
  layoutPlanGraph,
  selectIndexedRegisterRecordCount,
  selectOpenRegisterWorkCount,
  selectProjectsByHealth,
} from './projectPlanModel.ts';

describe('projectPlanModel', () => {
  it('builds a BSOCIAL graph with distinct workstreams and people kinds', () => {
    const graph = buildPlanGraph('BSOCIAL');
    assert.equal(graph.project.id, 'BSOCIAL');
    assert.ok(graph.nodes.some((n) => n.kind === 'project'));
    assert.ok(graph.nodes.filter((n) => n.kind === 'workstream').length >= 2);
    assert.ok(graph.nodes.some((n) => n.kind === 'person' || n.kind === 'agent'));
    assert.ok(graph.edges.every((e) => graph.nodes.some((n) => n.id === e.from)));
  });

  it('keeps open-register-work (61) distinct from indexed register rows', () => {
    const open = selectOpenRegisterWorkCount();
    const indexed = selectIndexedRegisterRecordCount();
    assert.equal(open.count, 61);
    assert.ok(indexed.count > 0);
    assert.notEqual(open.count, indexed.count);
    assert.match(open.definition, /openTaskCount/);
  });

  it('layouts phone graphs without leaving the stage', () => {
    const graph = buildPlanGraph('SEVEN');
    const laid = layoutPlanGraph(graph, {
      width: 390,
      height: 520,
      expandedWorkstreamId: null,
      phone: true,
    });
    for (const n of laid) {
      assert.ok(n.x >= 36 && n.x <= 390 - 36, `${n.id} x=${n.x}`);
      assert.ok(n.y >= 36 && n.y <= 520 - 36, `${n.id} y=${n.y}`);
    }
  });

  it('filters attention projects for dashboard cards', () => {
    const attention = selectProjectsByHealth('attention');
    assert.ok(attention.every((p) => p.health === 'At risk' || p.health === 'Blocked'));
  });
});
