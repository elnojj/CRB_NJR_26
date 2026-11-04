import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeKeyboardInset } from './keyboardInset.ts';

describe('keyboard inset', () => {
  it('is 0 when the keyboard is closed, even with toolbar jitter', () => {
    assert.equal(computeKeyboardInset({ innerHeight: 800, viewportHeight: 800, offsetTop: 0 }), 0);
    assert.equal(computeKeyboardInset({ innerHeight: 800, viewportHeight: 760, offsetTop: 0 }), 0);
  });

  it('reports the hidden height when the keyboard is open', () => {
    assert.equal(computeKeyboardInset({ innerHeight: 800, viewportHeight: 500, offsetTop: 0 }), 300);
  });

  it('accounts for iOS panning the visual viewport', () => {
    assert.equal(computeKeyboardInset({ innerHeight: 800, viewportHeight: 500, offsetTop: 120 }), 180);
  });
});
