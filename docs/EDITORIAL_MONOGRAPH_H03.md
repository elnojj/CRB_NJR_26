# Monolithic Precision — Editorial Monograph (Blueprint H03)

**Schema:** `cerebro.editorial.monograph/h03`  
**Primary product:** full ops HQ App at `/?preview=1` (dual spheres, labels, optics, panels, voice).  
**Optional reading shell:** `EditorialMonograph` keeps spheres + optics; not the default route.

## Dual system

| Layer | Role |
| --- | --- |
| Sticky WebGL | Existing Three.js `CosmographCanvas` / `ExperienceCanvas` (single renderer) |
| Editorial DOM | Scroll chapters with Cormorant display + Source Sans + IBM Plex Mono |

Typography stays in CSS layout; camera motion never projects text.

## Visual direction

- Palette: carbon `#0E1012`, basalt `#1A1C1E`, bone `#F5F3EE`, silver `#CFD7DF`
- No neon pills, glassmorphic cards, or decorative gradients on UI chrome
- Hairline rules, chapter numerals, coordinate registers

## Scene (editorial mode)

- Studio lights: key `#F5F3EE` 2.20, rim `#CFD7DF` 3.50, ambient `#1A1C1E` 0.80 + PMREM
- Post: ACES, restrained bloom, grain 0.04, vignette 0.42, CA 0.0012 (scene only)
- GSAP tweens camera **position + lookAt target + FOV** concurrently (`editorialCamera.ts`)
- Presets: `01_INIT` / `02_SURF` / `03_SPEC` / `04_DISP`

## Degradation

1. **High** — full post, parallax, DPR ≤ 2  
2. **Medium/Low** — FPS or reduced-motion: post/parallax cut, DPR 1  
3. **Fallback** — static SVG captures per chapter; DOM remains fully readable  

## Preserved

Ops HQ, auth, voice bridge, 14-state model, blueprint registry, and liquid-glass v7 path remain at non-editorial URLs.
