# CEREBRO + CDE — NOJARA Studios

3D cosmographic project dashboard (**Cerebro HQ**) and interactive Culture & Design Engineer universe for NOJARA Studios.

## Run locally

```bash
npm install
cp .env.example .env   # set OPENAI_API_KEY for voice; GEMINI_API_KEY for text/creative tools
PORT=3847 npm run dev
```

Cold start is fully automatic: **CerebroIntro wordmark** (over the live constellation) → **LiveSphereOpenSequence** (continuous WebGL camera one-shot: wide reveal → About Us Shweekar → Khaled → Tarek → business arc) → **BootLoader** → **ExperienceCanvas** workspace. No Enter Cerebro / Skip CTAs on the open path.

Open-sequence duration is configurable: `?openDuration=48` (seconds). Reduced-motion caps the journey.

Skip straight to workspace: `http://127.0.0.1:3847/?skipExplainer=1` or `?view=hq`.

**Primary HQ (spheres + dashboard + 3D optics):** `http://127.0.0.1:3847/?skipExplainer=1` or `?preview=1&blueprint=H03`.

## labs.nojara.com

Production target is **https://labs.nojara.com/cro/** (`/` redirects to `/cro/`).

```bash
npm run build:labs          # Vite base=/cro/
VERCEL_TOKEN=… npm run deploy:labs
# then alias the production URL to labs.nojara.com in the Vercel project that owns the domain
```

Requires a `VERCEL_TOKEN` for the Vercel team/project that already serves `labs.nojara.com`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express + Vite middleware (tsx) |
| `npm run build` | Production Vite build |
| `npm run build:labs` | Production build with `base=/cro/` for labs.nojara.com |
| `npm run deploy:labs` | Labs build + `vercel deploy --prod` |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm start` | Run compiled/node server |

## Secrets

Copy `.env.example` → `.env`. The UI boots without live keys; live providers need:

- `OPENAI_API_KEY` — server only, for the default OpenAI Voice provider
- `GEMINI_API_KEY` — text chat / creative tools and the optional legacy voice provider
- `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` (optional voice agent)

## OpenAI Voice

`VoiceCard` → `createVoiceBridge` → `OpenAiRealtimeVoiceBridge` is the default call path.
All voice services live in [`src/services/`](src/services/README.md): provider settings, shared tools,
connection logic, server handlers, retained providers and media ownership. UI components consume services.
It uses native WebRTC speech-to-speech, server VAD/interruption, final transcripts and the existing
27 Cerebro tools. Tool results go back as `function_call_output` receipts before the next response.
The same `handleExecuteToolCall` / `parseStructuredToolCall` / `executeTypedAction` path still owns UI actions.
Raw transcripts update history only. Ambient ducking follows real Listening/Speaking call states.

Configure the existing deployment with server-side `OPENAI_API_KEY`; optionally set
`OPENAI_REALTIME_MODEL` (default `gpt-realtime`) and `OPENAI_REALTIME_VOICE` (default `marin`).
The requested `gpt-realtime` model is used explicitly; model access/quota requires a live account check.
Its published retirement is 20 January 2027; update the server model configuration before then.
The retired `gpt-4o-realtime-preview` is not the default.

Sign in through the existing Firebase/Google flow before calling. `/api/openai/realtime/session`
validates that Firebase ID token with Identity Toolkit, then exchanges SDP with OpenAI.
`CEREBRO_VOICE_ALLOWED_UIDS` optionally limits voice access to comma-separated Firebase UIDs.
Audience headers and visual access codes cannot authenticate this endpoint. Existing private actions
retain their own authorization requirements; voice sign-in does not establish project membership.
The route runs in Express locally and as `api/openai/realtime/session.ts` on Vercel. It never returns
the OpenAI key, and no `VITE_OPENAI_API_KEY` should be configured. No separate OpenAI agent ID is needed.
The configurable badge label is `VITE_CEREBRO_VOICE_LABEL`; blank derives the provider's default label.

To select the retained Google bridge, build with `VITE_CEREBRO_VOICE_PROVIDER=google-ai-studio`.
The legacy `/api/gemini/voice-turn` backend must be available for that path; it is absent from this
checkpoint's Express routes. Text chat and creative Gemini endpoints are otherwise unchanged.

Run `npm run test:voice` for mocked WebRTC lifecycle, all-tool mapping, auth and endpoint checks.
Run `npm run lint`, `npm test` and `npm run build:labs` for broader checks (voice tests are included).
These checks do not establish real microphone permission, acoustic quality, device compatibility or paid API access.

OpenAI references: [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime),
[tool calling](https://developers.openai.com/api/docs/guides/realtime-conversations#function-calling),
[model lifecycle](https://developers.openai.com/api/docs/models/gpt-realtime).

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
