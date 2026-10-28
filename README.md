# CEREBRO + CDE — NOJARA Studios (CRB_NJR_26)

3D cosmographic project dashboard (**Cerebro HQ**) and interactive Culture & Design Engineer universe for NOJARA Studios.

Imported from [`elnojj/CRB_NJR_26`](https://github.com/elnojj/CRB_NJR_26).

## Run locally

```bash
npm install
cp .env.example .env   # optional: set GEMINI_API_KEY / ElevenLabs keys
npm run dev
```

Default port is `3000`. Override with `PORT=3847 npm run dev`.

Open `http://127.0.0.1:<PORT>`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite middleware (tsx) |
| `npm run build` | Production Vite build |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm start` | Run compiled/node server |

## Secrets

Copy `.env.example` → `.env`. The UI boots without live keys; Gemini / ElevenLabs features need:

- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` (optional voice agent)

## Stack

React 19 · Vite 8 · Three.js · Express · Tailwind 4 · Motion · MediaPipe · Firebase client

## Blueprint V2.0 shared-screen upgrade

Incremental GUI upgrade (does not migrate to R3F):

- `src/three/CerebroSphere.ts` — transmission glass accents, Fresnel via `<opaque_fragment>`, closed orbital tubes, bounded particle drift + `dispose()`
- `src/components/PersistentCerebroWidget.tsx` — center overlay with all five state axes
- `src/components/ProjectHealthStrip.tsx` — bottom Progress / Blockers / Due strip (`unknown` when missing)
- `src/styles/cerebro-shell.css` — gap-based responsive shell tokens
- CosmographCanvas: DPR cap 1.5, threshold-based bloom tuning, sphere fx wired into the existing render loop
