#!/usr/bin/env node
/**
 * Cerebro 39 / Sehly Master v2.0 — design lock contract (exactly 36 named assertions).
 * Static checks only — does not claim visual WebGL verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const results = [];

function check(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (err) {
    results.push({ id, status: 'FAIL', detail: String(err?.message || err) });
  }
}

function readJson(rel) {
  const full = path.join(root, rel);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function countTokenLeaves(tokensRoot) {
  const statuses = {
    locked: 0,
    source: 0,
    'reference-only': 0,
    extension: 0,
    deprecated: 0,
  };
  let total = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node.status === 'string' && Object.prototype.hasOwnProperty.call(statuses, node.status)) {
      const nestedStatusChild = Object.values(node).some(
        (v) =>
          (v && typeof v === 'object' && !Array.isArray(v) && typeof v.status === 'string') ||
          (Array.isArray(v) && v.some((x) => x && typeof x === 'object' && typeof x.status === 'string'))
      );
      if (!nestedStatusChild) {
        statuses[node.status] += 1;
        total += 1;
        return;
      }
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(tokensRoot);
  return { total, statuses };
}

const SOURCE_LOCK = '1f78a1295d4dd36a11320995c1e14bf17788ac25';

check('json.parse.docs_cerebro_config', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.schemaVersion, '2.0.0');
});

check('json.parse.public_cerebro_config', () => {
  const cfg = readJson('public/design-system/cerebro.config.json');
  assert.equal(cfg.schemaVersion, '2.0.0');
});

check('json.parse.design_tokens', () => {
  const tokens = readJson('public/design-system/design_tokens.json');
  assert.ok(tokens.colors);
  assert.equal(tokens.version, '2.0.0-cerebro39-master');
});

check('json.parse.material_registry', () => {
  const mat = readJson('public/design-system/material-registry.json');
  assert.ok(Array.isArray(mat.materials));
  assert.ok(mat.materials.length >= 4);
});

check('json.parse.component_registry', () => {
  const reg = readJson('public/design-system/component-registry.json');
  assert.ok(reg.single_ownership_authorities);
  assert.ok(Array.isArray(reg.sehly_master_phone_components));
});

check('json.parse.qa_matrix', () => {
  const qa = readJson('public/design-system/qa-matrix.json');
  assert.ok(Array.isArray(qa.source_authority_matrix));
  assert.ok(qa.verified_test_results);
});

check('mirror.docs_equals_public_cerebro_config', () => {
  const docs = readText('docs/design-system/config/cerebro.config.json');
  const pub = readText('public/design-system/cerebro.config.json');
  assert.equal(docs, pub);
});

check('sourceLock.matches_authority', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.sourceLock, SOURCE_LOCK);
});

check('summary.totalDeclaredLeaves_453', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.totalDeclaredLeaves, 453);
});

check('summary.locked_96', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.statusBreakdown.locked, 96);
});

check('summary.source_177', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.statusBreakdown.source, 177);
});

check('summary.reference_only_19', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.statusBreakdown['reference-only'], 19);
});

check('summary.extension_149', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.statusBreakdown.extension, 149);
});

check('summary.deprecated_12', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokenCountSummary.statusBreakdown.deprecated, 12);
});

check('actual.token_leaf_total_453', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.total, 453);
});

check('actual.token_leaf_locked_96', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.statuses.locked, 96);
});

check('actual.token_leaf_source_177', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.statuses.source, 177);
});

check('actual.token_leaf_reference_only_19', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.statuses['reference-only'], 19);
});

check('actual.token_leaf_extension_149', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.statuses.extension, 149);
});

check('actual.token_leaf_deprecated_12', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const counted = countTokenLeaves(cfg.tokens);
  assert.equal(counted.statuses.deprecated, 12);
});

check('fonts.locked_titles_sora', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.visualAuthority.lockedDecisions.fonts.titles, 'Sora');
  assert.equal(cfg.tokens.typography['families.display'].value, 'Sora');
  assert.equal(cfg.tokens.typography['families.display'].status, 'locked');
});

check('fonts.locked_body_inter', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.visualAuthority.lockedDecisions.fonts.body, 'Inter');
  assert.equal(cfg.tokens.typography['families.interface'].value, 'Inter');
  assert.equal(cfg.tokens.typography['families.interface'].status, 'locked');
});

check('fonts.locked_data_jetbrains_mono', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.visualAuthority.lockedDecisions.fonts.data, 'JetBrains Mono');
  assert.equal(cfg.tokens.typography['families.data'].value, 'JetBrains Mono');
  assert.equal(cfg.tokens.typography['families.data'].status, 'locked');
});

check('fonts.locked_arabic_noto_kufi', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.visualAuthority.lockedDecisions.fonts.arabic, 'Noto Kufi Arabic');
  assert.equal(cfg.tokens.typography['families.arabic'].value, 'Noto Kufi Arabic');
  assert.equal(cfg.tokens.typography['families.arabic'].status, 'locked');
});

check('fonts.css_locked_app_stacks', () => {
  const css = readText('src/styles/cerebro.tokens.css');
  assert.match(css, /--font-display:\s*['"]Sora['"]/);
  assert.match(css, /--font-sans:\s*['"]Inter['"]/);
  assert.match(css, /--font-mono:\s*['"]JetBrains Mono['"]/);
  assert.match(css, /--font-arabic:\s*['"]Noto Kufi Arabic['"]/);
  assert.match(css, /--font-film-display:/);
  assert.match(css, /Jaapokki/);
});

check('film_variant.jaapokki_scoped_reference', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  const film = cfg.visualAuthority.filmReferenceVariant;
  assert.equal(film.variantId, 'sehly-180s-film-reference');
  assert.equal(film.status, 'scoped-reference-pending-owner-decision');
  assert.match(film.displayFont, /Jaapokki/);
  assert.equal(film.selectiveBloomAllowedInFilmVariant, true);
});

check('palette.base_canvas_101D27', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokens.color['base.canvas'].value.toUpperCase(), '#101D27');
});

check('palette.base_deep_05090E', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokens.color['base.deep'].value.toUpperCase(), '#05090E');
});

check('palette.base_ice_B4DDFF', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokens.color['base.ice'].value.toUpperCase(), '#B4DDFF');
});

check('palette.base_cobalt_65ACFF', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokens.color['base.cobalt'].value.toUpperCase(), '#65ACFF');
});

check('palette.text_primary_F2F6F8', () => {
  const cfg = readJson('docs/design-system/config/cerebro.config.json');
  assert.equal(cfg.tokens.color['text.primary'].value.toUpperCase(), '#F2F6F8');
});

check('css.token_import_in_index', () => {
  const indexCss = readText('src/index.css');
  assert.match(indexCss, /@import\s+["']\.\/styles\/cerebro\.tokens\.css["']/);
  const tokensCss = readText('src/styles/cerebro.tokens.css');
  assert.match(tokensCss, /--c-canvas:\s*#101D27/i);
  assert.match(tokensCss, /--c-cobalt:\s*#65ACFF/i);
  assert.match(tokensCss, /--touch-min:\s*44px/);
});

check('components.panels_overlay_wires_v11', () => {
  const panels = readText('src/components/PanelsOverlay.tsx');
  assert.match(panels, /from ['"]\.\/WireframesV11Panels['"]/);
  assert.match(panels, /WireframesV11PanelContent/);
  const v11 = readText('src/components/WireframesV11Panels.tsx');
  assert.match(v11, /export const WireframesV11PanelContent/);
});

check('components.brand_logo_image_preserved', () => {
  const brand = readText('src/components/BrandLockup.tsx');
  assert.match(brand, /PUBLIC_BRAND_MEDIA\.logoWhite/);
  assert.match(brand, /nojara-logo-image|nojara-public-logo/);
  const media = readText('src/data/publicBrandMedia.ts');
  assert.match(media, /nojara-logo-white\.png/);
});

check('materials.named_registry_not_global_recipe', () => {
  const mat = readJson('public/design-system/material-registry.json');
  const ids = mat.materials.map((m) => m.id);
  assert.ok(ids.includes('MAT_LIQUID_GLASS_SHELL'));
  assert.ok(ids.includes('MAT_SILVER_CORE'));
  assert.ok(ids.includes('MAT_BRONZE_GOLD_RAILS'));
  assert.ok(ids.includes('MAT_D0_GOLD_RIBBED'));
  const glass = mat.materials.find((m) => m.id === 'MAT_LIQUID_GLASS_SHELL');
  const silver = mat.materials.find((m) => m.id === 'MAT_SILVER_CORE');
  assert.notEqual(glass.parameters.transmission, silver.parameters.transmission);
  assert.notEqual(glass.parameters.ior ?? null, silver.parameters.ior ?? null);
  const ownership = readJson('public/design-system/component-registry.json').single_ownership_authorities;
  assert.match(ownership.rendererLifecycle, /CosmographCanvas/);
  assert.match(ownership.layoutAndCollisionAuthority, /layoutEngine/);
});

check('editions.intro180_and_explainer60_separate', () => {
  const intro = readJson('public/cerebro.intro.json');
  const explainer = readJson('public/cerebro.explainer60.json');
  assert.equal(intro.meta.durationSeconds, 180);
  assert.equal(intro.meta.totalFrames, 10800);
  assert.equal(explainer.meta.durationSeconds, 60);
  assert.equal(explainer.meta.totalFrames, 3600);
  assert.match(
    String(explainer.relationshipToIntro180 || explainer.status || ''),
    /not.?replacing|Distinct|optional/i
  );
});

assert.equal(results.length, 36, `Expected exactly 36 assertions, got ${results.length}`);

const failed = results.filter((r) => r.status === 'FAIL');
const report = {
  schema: 'nojara.cerebro.validate-design/1',
  sourceLock: SOURCE_LOCK,
  assertionCount: results.length,
  status: failed.length ? 'FAIL' : 'PASS',
  failed: failed.map((f) => f.id),
  results,
  note: 'Static design-lock contract only. Does not claim visual WebGL verification.',
};

fs.writeFileSync(path.join(root, 'VALIDATE_DESIGN_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, assertionCount: report.assertionCount, failed: report.failed }, null, 2));
if (failed.length) {
  for (const f of failed) console.error(`FAIL ${f.id}: ${f.detail}`);
  process.exit(1);
}
