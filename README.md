# CEREBRO + CDE — NOJARA Studios

3D cosmographic project dashboard (**Cerebro HQ**) and interactive Culture & Design Engineer universe for NOJARA Studios.

## Run locally

```bash
npm install
cp .env.example .env   # optional: set GEMINI_API_KEY / ElevenLabs keys
PORT=3847 npm run dev
```

Open `http://127.0.0.1:3847/?preview=1` to skip the boot gate and auto-arm the 18-screen Wireframe tour.

**Primary HQ (spheres + dashboard + 3D optics):** `http://127.0.0.1:3847/?preview=1` or `?preview=1&blueprint=H03`.

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

## Data

Canonical persistence lives under `src/data/`:

- `src/data/store.json`
- `src/data/checkpoint_v1_25_0.json`

## Stack

React 19 · Vite 8 · Three.js · Express · Tailwind 4 · Motion · MediaPipe · Firebase client

## Neural Observatory v1.1

Single-Auteur Spatial Cinema aesthetic with deterministic compositing:

- **3D `mesh.renderOrder`** (`src/three/renderOrder.ts`): sky → galaxy → photosphere → glass → lattice → rings → cardiac tubes → pulse beads → HTML anchors
- **Post pipeline**: RenderPass → UnrealBloomPass (0.45 / 0.35 / 0.82) → chromatic aberration (0.0018) + 35mm grain (0.022) → ACES exposure 1.05
- **DOM `GUI_Z_LAYERS`**: canvas 10 → avoidance 20 → panels 25 → chrome 30 → sticky 40 → drawers 50 → modals 100 → voice 110 → hands 200 → media fullscreen 210 → toasts 300
- **`?preview=1`**: skips boot, starts the full 18-screen tour (`start_tour` / `step_tour` / `trigger_cta`)

Build id: `cerebro-gui-v5.0.0` · Neural Observatory contract `v1.1`
