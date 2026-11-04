import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MOTION_STORAGE_KEY, resolveReducedMotion } from './motionPreference.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe('motion preference', () => {
  it('defaults to full motion regardless of the OS setting', () => {
    assert.equal(resolveReducedMotion('', memoryStorage()), false);
    assert.equal(resolveReducedMotion('', null), false);
  });

  it('?motion=reduced opts in and is remembered', () => {
    const storage = memoryStorage();
    assert.equal(resolveReducedMotion('?motion=reduced', storage), true);
    assert.equal(storage.data.get(MOTION_STORAGE_KEY), 'reduced');
    assert.equal(resolveReducedMotion('', storage), true);
  });

  it('?motion=full clears a stored opt-in', () => {
    const storage = memoryStorage({ [MOTION_STORAGE_KEY]: 'reduced' });
    assert.equal(resolveReducedMotion('?motion=full', storage), false);
    assert.equal(resolveReducedMotion('', storage), false);
  });

  it('ignores junk values', () => {
    assert.equal(resolveReducedMotion('?motion=banana', memoryStorage()), false);
  });
});
