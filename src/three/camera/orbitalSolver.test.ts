import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONTRACT_ORBITAL_SOLVER } from '../../design/systemContract.ts';
import {
  advanceSprings,
  applyBoundingSphereRepulsion,
  CONTRACT_SPRING,
  createSpringChannel,
  OrbitSpringRig,
} from './orbitalSolver.ts';

describe('orbital spring-damper solver (nojara.cerebro.system/2.0)', () => {
  it('uses the contract constants', () => {
    assert.equal(CONTRACT_SPRING.stiffnessK, 3.8);
    assert.equal(CONTRACT_SPRING.dampingFactor, 0.88);
    assert.equal(CONTRACT_SPRING.timeStep, 0.01667);
  });

  it('converges to the target with negligible overshoot', () => {
    const ch = createSpringChannel(0);
    let carry = 0;
    let peak = 0;
    for (let i = 0; i < 60 * 12; i++) {
      carry = advanceSprings([{ channel: ch, target: 1 }], 1 / 60, carry);
      peak = Math.max(peak, ch.value);
    }
    assert.ok(peak <= 1.01, `overshoot ${peak}`);
    assert.equal(ch.value, 1);
    assert.equal(ch.velocity, 0);
  });

  it('settles within 3 seconds', () => {
    const ch = createSpringChannel(0);
    let carry = 0;
    for (let i = 0; i < 60 * 3; i++) carry = advanceSprings([{ channel: ch, target: 1 }], 1 / 60, carry);
    assert.ok(Math.abs(ch.value - 1) < 0.02, `value ${ch.value}`);
  });

  it('is frame-rate independent within one fixed step', () => {
    const at = (fps: number) => {
      const ch = createSpringChannel(0);
      let carry = 0;
      for (let i = 0; i < fps * 2; i++) carry = advanceSprings([{ channel: ch, target: 1 }], 1 / fps, carry);
      return ch.value;
    };
    assert.ok(Math.abs(at(30) - at(120)) < 0.02);
  });

  it('clamps stalled frames', () => {
    const ch = createSpringChannel(0);
    advanceSprings([{ channel: ch, target: 1 }], 30, 0);
    assert.ok(ch.value < 1);
  });
});

describe('rendered orbit cadence', () => {
  const makePose = () => ({ azimuth: 0, polar: 1, radius: 20, targetAzimuth: 1, targetPolar: 1.3, targetRadius: 12 });

  it('moves on every display frame at 90 and 120 Hz after the initial physics step', () => {
    for (const fps of [90, 120]) {
      const rig = new OrbitSpringRig();
      const pose = makePose();
      const deltas: number[] = [];
      for (let i = 0; i < fps; i++) {
        const previous = pose.azimuth;
        rig.step(pose, 1 / fps);
        if (i > 3) deltas.push(pose.azimuth - previous);
      }
      assert.ok(deltas.every((d) => d > 0), `${fps} Hz held a camera frame`);
      for (let i = 1; i < deltas.length; i++) {
        assert.ok(deltas[i] / deltas[i - 1] < 1.7, `${fps} Hz doubled a camera step`);
      }
    }
  });

  it('keeps the same motion across 30, 60 and 120 Hz presentation', () => {
    const at = (fps: number) => {
      const rig = new OrbitSpringRig();
      const pose = makePose();
      for (let i = 0; i < fps * 2; i++) rig.step(pose, 1 / fps);
      return pose;
    };
    for (const fps of [30, 120]) {
      assert.ok(Math.abs(at(fps).azimuth - at(60).azimuth) < 1e-8);
      assert.ok(Math.abs(at(fps).radius - at(60).radius) < 1e-8);
    }
  });

  it('drops old momentum when a scripted pose hands control back', () => {
    const rig = new OrbitSpringRig();
    const pose = makePose();
    for (let i = 0; i < 40; i++) rig.step(pose, 1 / 120);
    pose.azimuth = pose.targetAzimuth = -0.8;
    pose.polar = pose.targetPolar = 0.7;
    pose.radius = pose.targetRadius = 30;
    for (let i = 0; i < 20; i++) {
      rig.step(pose, 1 / 120);
      assert.equal(pose.azimuth, -0.8);
      assert.equal(pose.polar, 0.7);
      assert.equal(pose.radius, 30);
    }
  });
});

describe('bounding-sphere repulsion', () => {
  const spheres = [{ id: 'hq', center: [0, 0, 0] as const, radius: 6.2 }];
  const base = {
    bufferUnits: CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.bufferUnits,
    damping: CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.damping,
    zoomScaleFloor: CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.zoomScaleFloor,
  };

  it('pushes the camera out of a non-focused sphere', () => {
    const p = { x: 3, y: 0, z: 0 };
    const moved = applyBoundingSphereRepulsion(p, spheres, { ...base, zoomScale: 1 });
    assert.ok(moved);
    assert.ok(Math.hypot(p.x, p.y, p.z) > 3);
  });

  it('is still active at the 20% zoom floor and off below it', () => {
    const atFloor = { x: 3, y: 0, z: 0 };
    assert.ok(applyBoundingSphereRepulsion(atFloor, spheres, { ...base, zoomScale: 0.2 }));
    const below = { x: 3, y: 0, z: 0 };
    assert.equal(applyBoundingSphereRepulsion(below, spheres, { ...base, zoomScale: 0.19 }), false);
  });

  it('leaves the focused sphere interior alone', () => {
    const p = { x: 3, y: 0, z: 0 };
    const moved = applyBoundingSphereRepulsion(p, spheres, { ...base, zoomScale: 1, exemptIds: new Set(['hq']) });
    assert.equal(moved, false);
    assert.equal(p.x, 3);
  });
});
