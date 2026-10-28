# Liquid Glass 3D GUI v7 — Implementation Notes

**Schema:** `cerebro.cinematic-liquid-glass.v7`  
**Source:** `public/assets/aistudio/CEREBRO_UNIFIED_LIQUID_GLASS_3D_V7.json`  
**Canonical TS:** `src/design/liquidGlassV7.ts`  
**DOM CSS:** `src/styles/liquid-glass-v7.css`

## Applied

| Area | Change |
| --- | --- |
| Tokens | Canvas/glass/text/cobalt/focus/rim/amber/voice match JSON |
| DOM glass | Raised panels blur 16 / base cards no nested blur / media shell blur 6 |
| Separation | Panel collision margin **14px** |
| Optical shell | ior 1.48, roughness 0.08, transmission 0.88, clearcoat 0.8, fresnel exp 4, rim 0.25 |
| Post | Bloom 0.24 / thresh 0.9; grain 0.025; CA **0**; exposure 1.0; sat 0.96; contrast 1.04 |
| Particles | Amber horizon field (ref A); CDE dual-hemisphere amber/ivory (ref B) |
| Rings | Count **2**, tube radius **0.035** |
| Segments | Hero 96×64 / nav 64×48 / mobile 40×32 |
| Media tube | Already matched JSON (5.4u / 8×3 / 24 tiles) |
| Camera | Preset durations already matched overview/approach/focus/detail |
| Voice | `.lg-voice` chrome; accent `#9AFFE0` preserved |

## Preserved

- Single Three.js renderer (no R3F / WebGPU mix)
- Auth, routes, 14 core / blueprint registry, voice bridge, project register
- DOM text composited above WebGL (no grain/bloom on text or media DOM)

## Reference images

JSON describes references A/B/C textually; binary image files were not attached to the upload folder. Visual authority taken from those descriptions + numeric material settings.

## Unverified / next

- Automated Playwright viewport suite (manual captures used)
- Performance traces under load
- Full 18-screen action matrix pass
