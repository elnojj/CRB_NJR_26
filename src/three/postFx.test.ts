import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { POST_FX, VignetteShader, bokehParams, resolvePostFxPlan } from './postFx';

describe('post-processing plan', () => {
  it('uses the approved depth-of-field and vignette numbers', () => {
    assert.deepEqual(POST_FX.depthOfField, { focalLength: 0.02, bokehScale: 2, height: 480 });
    assert.deepEqual(POST_FX.vignette, { offset: 0.1, darkness: 1.1 });
    assert.equal(VignetteShader.uniforms.offset.value, 0.1);
    assert.equal(VignetteShader.uniforms.darkness.value, 1.1);
  });

  it('runs depth of field only on desktop GPUs and the vignette on every GPU tier', () => {
    assert.deepEqual(resolvePostFxPlan({ tier: 'desktop' }, false), { depthOfField: true, vignette: true });
    assert.deepEqual(resolvePostFxPlan({ tier: 'tablet' }, false), { depthOfField: false, vignette: true });
    assert.deepEqual(resolvePostFxPlan({ tier: 'phone' }, false), { depthOfField: false, vignette: true });
    assert.deepEqual(resolvePostFxPlan({ tier: 'desktop' }, true), { depthOfField: false, vignette: false });
  });

  it('derives bokeh settings from the focus distance and keeps focus positive', () => {
    const p = bokehParams(66);
    assert.equal(p.focus, 66);
    assert.ok(p.aperture > 0 && p.aperture < 0.001);
    assert.ok(p.maxblur > 0 && p.maxblur <= 0.02);
    assert.equal(bokehParams(0).focus, 0.1);
  });
});
