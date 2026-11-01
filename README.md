# CEREBRO + CDE — NOJARA Studios (Subz)

Spatial dual-sphere project orchestration for NOJARA Studios. Synced with `elnojj/CRB_NJR_26` `main` (bootloader + brand assets) while keeping Subz runtime fixes.

## In this build

- Bootloader + public brand/showreel assets from GitHub `main`
- Boot no longer sticks near 1% (parent re-renders do not reset the loader)
- Blue half-screen slab removed (`setViewOffset` skipped while EffectComposer is active)
- Station labels clamp and separate inside the unobstructed safe rect
- Drive Hotspot_26_media VideoTexture on the HQ sphere (local fallback under `public/media/`)
- About Us bios panel wired to `/api/drive/about`

## Run locally

```bash
npm install   # or: bun install
PORT=3847 npm run dev
```

Entry: `tsx server.ts` (Vite + Express). Optional `GOOGLE_API_KEY` / `GOOGLE_DRIVE_API_KEY` for live Drive streams; otherwise local media fallbacks are used.
