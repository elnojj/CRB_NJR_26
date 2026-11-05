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

Unlock with the server-configured owner access code before calling. `/api/openai/realtime/access`
verifies that code; `/api/openai/realtime/session` checks it again before exchanging SDP with OpenAI.
Set `CEREBRO_OWNER_ACCESS_CODE` to 24-256 random URL-safe characters on the server. The browser
holds it in the current tab's memory only; refresh or Lock owner access clears it. Audience headers
and the old visual keypad cannot authenticate this endpoint. No managed authentication SDK or
Google account is required. Per-instance failed-attempt throttling limits repeated invalid codes.
The route runs in Express locally and as standalone `api/openai/realtime/session.js` on Vercel.
The OpenAI key never reaches the browser. No separate OpenAI agent ID is needed.

The configurable badge label is `VITE_CEREBRO_VOICE_LABEL`; blank derives the provider's label.
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

React 19 · Vite 8 · Three.js · Express · Tailwind 4 · Motion · MediaPipe

## Neural Observatory v1.1

Single-Auteur Spatial Cinema aesthetic with deterministic compositing:

- **3D `mesh.renderOrder`** (`src/three/renderOrder.ts`): sky → galaxy → photosphere → glass → lattice → rings → cardiac tubes → pulse beads → HTML anchors
- **Post pipeline**: RenderPass → UnrealBloomPass (0.45 / 0.35 / 0.82) → chromatic aberration (0.0018) + 35mm grain (0.022) → ACES exposure 1.05
- **DOM `GUI_Z_LAYERS`**: canvas 10 → avoidance 20 → panels 25 → chrome 30 → sticky 40 → drawers 50 → modals 100 → voice 110 → hands 200 → media fullscreen 210 → toasts 300
- **`?preview=1`**: skips boot, starts the full 18-screen tour (`start_tour` / `step_tour` / `trigger_cta`)

Build id: `cerebro-gui-v5.0.0` · Neural Observatory contract `v1.1`

## Repair checkpoint — spatial content and voice

The existing CSS3D panel host now renders the selected workspace content. The same component is used in reduced graphics mode; the removed PanelsOverlay has not been restored. Register views identify their snapshot date and do not claim live sync. Unlock owner access via Call to inspect owner snapshot records.

`npm run build` and `npm run build:labs` bundle standalone Vercel voice functions. Run `node scripts/build-voice-functions.mjs` after changing server voice source. Generated `.js` functions must be committed; do not reintroduce an unbundled `.ts` entrypoint with the same URL.

`GET /api/openai/realtime/status` reports configuration presence only, without keys or user data.
It does not establish paid model access or working device audio. Set `OPENAI_API_KEY` and
`CEREBRO_OWNER_ACCESS_CODE` on the existing Vercel project, then redeploy. No client authentication
variables or third-party identity service are used. The access code is separate from the provider key.


Chat uses server-owned `GEMINI_CHAT_MODEL` (default `gemini-3.8-flash`). Offline fallback is visibly identified. TXT, MD, JSON, CSV, and TSV attachments up to 256 KB send their actual text; PDFs and images are explicitly unsupported. Chat messages do not automatically create notes or tasks.
