import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { GUI_Z_LAYERS, guiZLayerCssVar } from './guiTokens';

const root = path.resolve(import.meta.dirname, '..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

describe('GUI_Z_LAYERS', () => {
  it('has a matching --z-* custom property with the same value for every layer', () => {
    const css = readFileSync(path.join(root, 'styles/cerebro.tokens.css'), 'utf8');
    const declared = new Map<string, number>();
    for (const m of css.matchAll(/^\s*(--z-[a-z0-9-]+):\s*(\d+);/gm)) declared.set(m[1], Number(m[2]));
    for (const [layer, value] of Object.entries(GUI_Z_LAYERS)) {
      const cssVar = guiZLayerCssVar(layer as keyof typeof GUI_Z_LAYERS);
      assert.equal(declared.get(cssVar), value, `${cssVar} should be ${value}`);
    }
    assert.equal(declared.size, Object.keys(GUI_Z_LAYERS).length, 'no CSS-only z layers');
  });

  it('every --z-* reference in source resolves to a declared layer', () => {
    const known = new Set(Object.keys(GUI_Z_LAYERS).map((k) => guiZLayerCssVar(k as keyof typeof GUI_Z_LAYERS)));
    for (const file of sourceFiles(root)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/z-\((--z-[a-z0-9-]+)\)|var\((--z-[a-z0-9-]+)\)/g)) {
        const name = m[1] ?? m[2];
        assert.ok(known.has(name), `${path.relative(root, file)} uses unknown ${name}`);
      }
    }
  });

  it('keeps app-level fixed layers on the scale (no numeric z-* utility on fixed elements)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(root).filter((f) => f.endsWith('.tsx'))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/\bfixed\b/.test(line) && /(?<![\w-])z-(\[\d+\]|\d+)(?![\w])/.test(line)) {
          offenders.push(`${path.relative(root, file)}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, []);
  });

  it('keeps app-level CSS z-index values on the scale (only 0-10 stays local to a component)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(root).filter((f) => f.endsWith('.css'))) {
      if (file.endsWith('cerebro.tokens.css')) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/z-index:\s*(-?\d+)/g)) {
          if (Number(m[1]) > 10) offenders.push(`${path.relative(root, file)}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, []);
  });
});
