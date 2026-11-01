# CEREBRO + CDE — NOJARA Studios (Subz + Movie)

Spatial dual-sphere project orchestration for NOJARA Studios, plus the **180s JSON-driven introduction** (`CerebroIntro`).

## Run locally

```bash
npm install   # or: bun install
PORT=3847 npm run dev
```

- Default entry opens the cinematic intro (`/?intro=1`)
- Skip to workspace: `/?intro=0&view=hq`
- Proof shot index: `/proofs.html`
- Timeline config: `public/cerebro.intro.json`

## Intro notes

- Music/SFX only (no spoken voice). Silent local masters ship until the review mix package is restored.
- Chapter media currently remaps to local Hotspot_26 showreel / About Us portrait fallbacks.
- Confirmed portraits for Shweekar Ahmed and Khaled El Shaalan remain missing (no invented faces).
- `Enter Cerebro` hands off to the live workspace and disables `introBridge` camera ownership.

## Subz fixes retained

- Boot loader no longer sticks near 1%
- Blue EffectComposer slab removed when panels open
- Station labels clamp inside the unobstructed safe rect
- Drive sphere VideoTexture + About Us `/api/drive/*`

## Docs

See `docs/intro/README.md`, `docs/intro/QA_REPORT.json`, and `docs/intro/FRAME_TABLE.json`.
