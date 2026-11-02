# CEREBRO + CDE — NOJARA Studios (Subz + Movie)

Spatial dual-sphere project orchestration for NOJARA Studios, plus the **180s JSON-driven introduction** (`CerebroIntro`).

## Screen & Action Map

- **v0.1 PDF** = historical code inventory at `51be7ca` — **not** a validated live map or QA sign-off. See `docs/screen-action-map/`.
- **v0.2** = matrix scaffold on current `main`; fill click/WebGL evidence before acceptance.

## AI Studio Git sync

Google AI Studio pulls from **GitHub** `main` (`elnojj/CRB_NJR_26`), not Cursor Origin.

```bash
export GH_TOKEN=…   # fine-grained PAT, Contents: Read and write
./scripts/sync-aistudio-main.sh
```

Agents: always run this (or equivalent) after shipping work meant for Studio. See `AGENTS.md`.

## Production (canonical)

**Firebase Hosting is the production link** for this AI Studio project. All production publishes go through Firebase — not GitHub Pages / Netlify / Vercel.

| | |
|---|---|
| Firebase project | `advance-copilot-489023-c3` (from `firebase-applet-config.json`) |
| Expected live URLs | https://advance-copilot-489023-c3.web.app · https://advance-copilot-489023-c3.firebaseapp.com |
| Config | `.firebaserc`, `firebase.json` (hosts Vite `dist/`) |

```bash
npm install
# One-time auth (CI uses FIREBASE_TOKEN; local can use firebase login)
export FIREBASE_TOKEN=…   # CI / non-interactive
npm run deploy             # vite build + firebase deploy --only hosting
```

GitHub Actions: `.github/workflows/firebase-hosting.yml` deploys `main` on push when `FIREBASE_TOKEN` is set as a repo secret.

Note: Hosting serves the static Vite build (intro + client workspace). Express `/api/*` routes from `server.ts` are not on Hosting; add Cloud Functions later if production needs Drive / ElevenLabs server APIs.

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
