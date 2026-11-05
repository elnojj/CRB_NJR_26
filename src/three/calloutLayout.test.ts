import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { overlapsCallout, placeCallout, projectCalloutAnchor, selectCallout } from './calloutLayout';
import { SpatialLabelBillboardLayer } from './spatialLabelBillboards';

const camera = () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.updateMatrixWorld();
  return camera;
};

test('hover/focus priorities choose exactly one detailed target and idle nodes have no card', () => {
  const specs = [{ id: 'station' }, { id: 'focused', focused: true, priority: 2 }, { id: 'hovered', focused: true, priority: 3 }];
  assert.equal(selectCallout(specs)?.id, 'hovered');
  assert.equal(selectCallout([{ id: 'station' }]), null);
  assert.equal(selectCallout([{ id: 'b', focused: true }, { id: 'a', focused: true }])?.id, 'a');
});

test('near/far depth, camera direction and all frustum edges cull anchors', () => {
  const cam = camera(), view = { w: 800, h: 800 };
  assert.ok(projectCalloutAnchor(cam, new THREE.Vector3(0, 0, -10), view));
  for (const point of [[0, 0, 1], [0, 0, -0.05], [0, 0, -100], [100, 0, -10], [-100, 0, -10], [0, 100, -10], [0, -100, -10]]) {
    assert.equal(projectCalloutAnchor(cam, new THREE.Vector3(...point), view, { minDepth: 0.1, maxDepth: 80 }), null);
  }
});

test('another sphere and actual opaque geometry occlude, but the target, invisible hit proxies and glass do not', () => {
  const cam = camera(), anchor = new THREE.Vector3(0, 0, -10), viewport = { w: 800, h: 800 };
  const sphere = { id: 'host', center: [0, 0, -5] as const, radius: 1 };
  assert.equal(projectCalloutAnchor(cam, anchor, viewport, { spheres: [sphere] }), null);
  assert.ok(projectCalloutAnchor(cam, anchor, viewport, { spheres: [sphere], ownerSphereId: 'host' }));
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshBasicMaterial());
  obstacle.position.z = -5; obstacle.updateMatrixWorld();
  assert.equal(projectCalloutAnchor(cam, anchor, viewport, { occluders: [obstacle] }), null);
  assert.ok(projectCalloutAnchor(cam, anchor, viewport, { occluders: [obstacle], target: obstacle }));
  obstacle.visible = false;
  assert.ok(projectCalloutAnchor(cam, anchor, viewport, { occluders: [obstacle] }));
  obstacle.visible = true; obstacle.material.transparent = true; obstacle.material.opacity = 0;
  assert.ok(projectCalloutAnchor(cam, anchor, viewport, { occluders: [obstacle] }));
  obstacle.material.dispose(); obstacle.geometry.dispose();
});

test('actual card rectangles fit the five target viewports and flip away from reserved headline space', () => {
  for (const [w, h] of [[390, 844], [820, 1180], [1180, 820], [1440, 900], [2560, 1440]]) {
    const safe = { x: 16, y: 96, w: w - 32, h: h - 240 };
    const blocked = { x: w / 2 - 90, y: h / 2 - 70, w: 180, h: 140 };
    const card = placeCallout({ x: w / 2, y: h / 2 }, { w: 280, h: 140 }, safe, [blocked]);
    assert.ok(card, `${w}x${h}`);
    assert.ok(card.x >= safe.x && card.y >= safe.y && card.x + card.w <= safe.x + safe.w && card.y + card.h <= safe.y + safe.h);
    assert.equal(overlapsCallout(card, blocked), false);
  }
  assert.equal(placeCallout({ x: 5, y: 5 }, { w: 280, h: 140 }, { x: 0, y: 0, w: 200, h: 100 }), null);
});

test('billboard layer retires the old target, hides occluded cards and positions its one sprite inside the safe area', () => {
  const previous = globalThis.document;
  const context = new Proxy({ measureText: (text: string) => ({ width: text.length * 12 }) }, {
    get: (object, key) => key in object ? object[key as keyof typeof object] : () => undefined,
    set: (object, key, value) => Reflect.set(object, key, value),
  });
  globalThis.document = { createElement: () => ({ width: 512, height: 200, getContext: () => context }) } as unknown as Document;
  const layer = new SpatialLabelBillboardLayer(), cam = camera();
  const makeSpec = (id: string) => ({ id, label: id, sublabel: 'One detailed card', meta: '3 sources', colour: '#0050FF', worldPos: new THREE.Vector3(0, 0, -10), focused: true });
  const options = { viewport: { w: 800, h: 800 }, safeRect: { x: 20, y: 96, w: 760, h: 560 } };
  try {
    assert.ok(layer.sync([makeSpec('first'), makeSpec('secondary')], cam, options));
    assert.equal(layer.group.children.length, 1);
    const old = layer.group.children[0];
    assert.ok(layer.sync([makeSpec('next')], cam, options));
    assert.equal(layer.group.children.length, 1);
    assert.ok(!layer.group.children.includes(old));
    const projected = layer.group.children[0].position.clone().project(cam);
    const x = (projected.x + 1) * 400, y = (1 - projected.y) * 400;
    assert.ok(x - 140 >= 20 && x + 140 <= 780 && y > 96 && y < 656);
    for (const fov of [18, 50, 100]) {
      cam.fov = fov; cam.updateProjectionMatrix();
      for (const distance of [3, 10, 70]) {
        const spec = makeSpec('next'); spec.worldPos.z = -distance;
        assert.ok(layer.sync([spec], cam, options));
        const sprite = layer.group.children[0];
        const left = sprite.position.clone().add(new THREE.Vector3(-sprite.scale.x / 2, 0, 0)).project(cam);
        const right = sprite.position.clone().add(new THREE.Vector3(sprite.scale.x / 2, 0, 0)).project(cam);
        assert.ok(Math.abs((right.x - left.x) * 400 - 280) < 1e-6, 'card pixel width stays bounded through lens and zoom changes');
      }
    }
    assert.equal(layer.sync([makeSpec('next')], cam, { ...options, maxDepth: 5 }), null);
    assert.equal(layer.group.children[0].visible, false);
    layer.sync([], cam, options);
    assert.equal(layer.group.children.length, 0);
  } finally { layer.dispose(); globalThis.document = previous; }
});
