import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import {
  CONTRACT_MEDIA_DECOUPLING,
  CONTRACT_ORBITAL_SOLVER,
  CONTRACT_SHELL_MATERIAL,
  CONTRACT_SPHERES,
  CONTRACT_VIEWPORTS,
  CONTRACT_INTERACTIVE,
} from './systemContract';
import { MAT_LIQUID_GLASS_SHELL } from '../materials/matLiquidGlassShell';
import { GUI_OPTICAL_SHELL_PRESET, GUI_TOUCH_TOKENS } from '../gui/guiTokens';
import { LG_V7_OPTICAL } from './liquidGlassV7';
import { SPHERE_NETWORK, createSharedOuterShellMaterial } from '../three/sphereNetwork';
import { computeGuiLayout } from '../gui/layoutEngine';
import { intersectionArea } from '../gui/CollisionManager';
import { CONTRACT_SPRING } from '../three/camera/orbitalSolver';

describe('nojara.cerebro.system/2.0 validation gates', () => {
  it('GATE-01: runtime solver constants equal the contract', () => {
    assert.equal(CONTRACT_ORBITAL_SOLVER.stiffnessK, 3.8);
    assert.equal(CONTRACT_ORBITAL_SOLVER.dampingFactor, 0.88);
    assert.equal(CONTRACT_ORBITAL_SOLVER.timeStep, 0.01667);
    assert.equal(CONTRACT_SPRING.stiffnessK, CONTRACT_ORBITAL_SOLVER.stiffnessK);
    assert.equal(CONTRACT_SPRING.dampingFactor, CONTRACT_ORBITAL_SOLVER.dampingFactor);
    assert.equal(CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.zoomScaleFloor, 0.2);
    assert.equal(CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.bufferUnits, 1.2);
    assert.equal(CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.damping, 0.92);
  });

  it('GATE-01: every shell recipe uses the locked MeshPhysicalMaterial values', () => {
    const recipes = [MAT_LIQUID_GLASS_SHELL, GUI_OPTICAL_SHELL_PRESET, LG_V7_OPTICAL] as const;
    for (const recipe of recipes) {
      assert.equal(recipe.transmission, CONTRACT_SHELL_MATERIAL.transmission);
      assert.equal(recipe.roughness, CONTRACT_SHELL_MATERIAL.roughness);
      assert.equal(recipe.ior, CONTRACT_SHELL_MATERIAL.ior);
    }
    const shell = createSharedOuterShellMaterial();
    assert.equal(shell.transmission, 0.92);
    assert.equal(shell.roughness, 0.05);
    assert.equal(shell.ior, 1.6);
    assert.equal(shell.clearcoat, 1.0);
    assert.equal(shell.clearcoatRoughness, 0.1);
    assert.equal(shell.envMapIntensity, 0.35);
  });

  it('GATE-01: sphere centers and radii equal the contract', () => {
    for (const contract of CONTRACT_SPHERES) {
      const runtime = SPHERE_NETWORK.find((s) => s.id === contract.id);
      if (contract.status === 'PROPOSED_NOT_IMPLEMENTED' && !runtime) continue;
      assert.ok(runtime, `missing sphere ${contract.id}`);
      assert.deepEqual(runtime.center, [...contract.center], contract.id);
      assert.equal(runtime.radius, contract.radius, contract.id);
    }
  });

  it('GATE-03: every transparent sphere shell has depthWrite false', () => {
    for (const softwareGl of [false, true]) {
      for (const face of ['front', 'back'] as const) {
        const shell = createSharedOuterShellMaterial({ softwareGl, face });
        assert.equal(shell.transparent, true);
        assert.equal(shell.depthWrite, false, `softwareGl=${softwareGl} face=${face}`);
      }
    }
    assert.equal(CONTRACT_SHELL_MATERIAL.depthWrite, false);
  });

  it('GATE-04: Sphere 01 HQ material has no map, so the galaxy interior stays visible', () => {
    assert.equal(CONTRACT_MEDIA_DECOUPLING.primarySphereMap, null);
    assert.equal(CONTRACT_MEDIA_DECOUPLING.galaxyParticleCount, 6400);
    const shell: THREE.MeshPhysicalMaterial = createSharedOuterShellMaterial();
    assert.equal(shell.map, null);
    const hq = SPHERE_NETWORK.find((s) => s.id === 'hq');
    assert.ok(hq);
    assert.deepEqual(hq.center, [0, 0, 0]);
  });

  it('GATE-04: 9:16 24fps contain reels are only declared for child sphere targets', () => {
    assert.equal(CONTRACT_MEDIA_DECOUPLING.childReel.aspectRatio, '9:16');
    assert.equal(CONTRACT_MEDIA_DECOUPLING.childReel.frameRateFps, 24);
    assert.equal(CONTRACT_MEDIA_DECOUPLING.childReel.objectFit, 'contain');
    assert.equal(CONTRACT_MEDIA_DECOUPLING.activeReelTargets.length, 5);
  });

  it('GATE-02: touch targets meet 44x44', () => {
    assert.ok(GUI_TOUCH_TOKENS.minTargetPx >= CONTRACT_INTERACTIVE.pill.minHitTargetPx);
  });

  for (const viewport of CONTRACT_VIEWPORTS) {
    it(`computeGuiLayout at ${viewport.width}x${viewport.height} keeps a valid sceneSafeRect with zero overlap`, () => {
      const layout = computeGuiLayout({
        width: viewport.width,
        height: viewport.height,
        openPanels: ['project-detail'],
      });
      assert.equal(layout.zeroOverlapPassed, true, viewport.name);
      assert.ok(layout.sceneSafeRect.w > 0 && layout.sceneSafeRect.h > 0, `${viewport.name} sceneSafeRect`);
      assert.ok(layout.sceneSafeRect.x >= 0 && layout.sceneSafeRect.y >= 0);
      assert.ok(layout.sceneSafeRect.x + layout.sceneSafeRect.w <= viewport.width);
      assert.ok(layout.sceneSafeRect.y + layout.sceneSafeRect.h <= viewport.height);
      for (const slot of layout.panelSlots) {
        assert.equal(intersectionArea(slot.rect, layout.voiceRect), 0, `${viewport.name} slot ${slot.slotId} vs voice`);
        assert.equal(intersectionArea(slot.rect, layout.sceneSafeRect), 0, `${viewport.name} slot ${slot.slotId} vs scene`);
      }
    });
  }
});
