# Liquid Glass 3D GUI v7 — Implementation Notes

**Schema:** `cerebro.cinematic-liquid-glass.v7`  
**Source:** `public/assets/aistudio/CEREBRO_UNIFIED_LIQUID_GLASS_3D_V7.json`  
**Canonical TS:** `src/design/liquidGlassV7.ts`  
**DOM CSS:** `src/styles/liquid-glass-v7.css`  
**Commit:** `3c48242`

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

## Verification evidence (2026-10-28 Africa/Cairo)

### Automated

| Check | Result |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | **pass** (exit 0) |
| `npm run build` | **pass** (exit 0, Vite 8.3.5) |
| `runGuiLayoutSelfTests()` | **9/9 pass** (phone / iPad / landscape / desktop / wide / optics / motion) |

### Screenshots

| Shot | Path | Size | Notes |
| --- | --- | --- | --- |
| Before desktop | `/opt/cursor/artifacts/screenshots/v7-before-desktop.webp` | 1440-class | Pre-final capture; glass + dual particle spheres visible |
| After desktop | `…/v7-after-desktop.png` (+ `.webp`) | **1440×900** | H03 glass panels, optics, voice, sharp text |
| After iPad | `…/v7-after-ipad.png` (+ `.webp`) | **820×1180** | Single left inspector, voice dock, no DevTools |
| After phone | `…/v7-after-phone.png` (+ `.webp`) | **390×844** | Bottom sheet + voice; sharp text |
| Phone + sphere (GPU) | `…/v7-after-phone-devtools.webp` | ~400×1017 | Confirms dual-hemisphere particle sphere through glass |

URL exercised: `/?preview=1&blueprint=H03` on `127.0.0.1:3847` and Cloudflare tunnel.

## Reference images

JSON describes references A/B/C textually; binary image files were not attached to the upload folder. Visual authority taken from those descriptions + numeric material settings.

## Unresolved limitations

- Binary reference stills A/B/C were not in the upload set — numeric JSON + textual refs used
- Headless Chrome soft-WebGL undersamples dense particle spheres vs interactive GPU session
- Full 18-screen / 60-blueprint action matrix not re-run as a single automated pass this iteration
- Live Google Calendar / some Drive streams remain auth-gated (honest empty states, no invented media)
- Master Blueprint PDF (149p) still unavailable for page-level mapping
