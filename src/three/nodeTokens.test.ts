import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tokenGlyphForMedia, tokenGlyphForNode, tokenInitials } from './nodeTokens.ts';

describe('nodeTokens', () => {
  it('derives two-letter initials from the first words', () => {
    assert.equal(tokenInitials('Station 18 Pilot Simulator'), 'S1');
    assert.equal(tokenInitials('El-Batron'), 'EB');
    assert.equal(tokenInitials('NOJARA'), 'NO');
  });

  it('falls back to a dot for an empty label', () => {
    assert.equal(tokenInitials('  '), '·');
    assert.equal(tokenInitials('***'), '·');
  });

  it('keeps non-latin letters', () => {
    assert.notEqual(tokenInitials('نُچارة'), '·');
  });

  it('gives each node type and media kind its own glyph', () => {
    const nodeGlyphs = (['core', 'station', 'dimension', 'subdomain', 'project'] as const).map(tokenGlyphForNode);
    assert.equal(new Set(nodeGlyphs).size, 5);
    const mediaGlyphs = (['image', 'video', 'pdf'] as const).map(tokenGlyphForMedia);
    assert.equal(new Set(mediaGlyphs).size, 3);
  });
});
