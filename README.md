# CEREBRO + CDE — NOJARA Studios (Subz)

Spatial dual-sphere project orchestration for NOJARA Studios. Branch lineage: `elnojj/CRB_NJR_26` @ `Subz`.

## Fixes in this slice

- **Boot no longer sticks near 1%** — parent re-renders no longer reset the 8s loader clock
- **Blue half-screen slab removed** — `setViewOffset` disabled while EffectComposer/bloom is active
- **Station labels stop stacking** when a side panel (Media, etc.) is open — labels clamp and separate inside the unobstructed safe rect

## Run locally

```bash
npm install
npm run dev
```

Default Vite/Express entry is `tsx server.ts` (see `package.json`).
