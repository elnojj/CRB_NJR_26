# Gate Zero — Alternate version (rushing-saffron /cro)

Prepared: 28 October 2026 · Builder session on Origin `tarek-nojara/catalyst`  
Contract: Cerebro alternate version builder handoff (same date)

## 1. Deployment → source mapping (evidence)

| Field | Value | Evidence |
| --- | --- | --- |
| Handoff URL | `https://rushing-saffron-1imluth.tmp.now/cro/` | Contract; **now HTTP 404** (anonymous Vercel temp expired) |
| Same-build live URL | `https://prompt-tungsten-4q0hhhv.tmp.now/cro/` | HTTP 200; asset `index-DQZBCSpy.js` matches local `dist/` |
| Owner / repo | Origin **`tarek-nojara/catalyst`** (private) | `origin repo view`; UUID `r_01m60e37jhfr0bw1sx9w3z3s8n` |
| Git remote (underlying) | `origin.cursor.com/git/tarek-nojara/tmp-9ae644d5d241e10f.git` | `git remote -v` |
| Branch | `main` | `git status` |
| Deployed commit | **`20a660e`** (`20a660e7ac5770ce3398ed1e9312e2622676c781`) | `git rev-parse HEAD`; message *Wire labs.nojara.com /cro production deploy path* |
| Framework | Vite 8 + React 19 + Express + Three.js (not Next.js) | `package.json` |
| Entry | `index.html` → `src/main.tsx` → `<App />` | `src/main.tsx` |
| Public base | `VITE_BASE=/cro/` | `vite.config.ts`, `npm run build:labs`, `vercel.json` |
| Pipeline | Manual / agent: `build:labs` → static tree under `/cro` → `vercel deploy --temporary` or Express `PORT` + Cloudflare tunnel | `scripts/keepalive-preview.sh`, `README.md` |
| **Not** this source | `cerebro-core.vercel.app` / PR #109/#110 / `bfe85b8` | Different Next.js app; commits absent here |

**Checkpoint for this base:** `20a660e` on `main` (recoverable via git). Local data checkpoint file `src/data/checkpoint_v1_25_0.json` + `store.json` — application data, not git tip.

**MUST NOT:** merge main-version PRs 109/110; treat cerebro-core as this tree; invent paths.

## 2. Capability matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Soft-WebGL / reduced-graphics map nav | **Implemented · audit-verified (V01)** | CosmographCanvas sets reason + “REDUCED-GRAPHICS…” label |
| HQ ↔ CDE semantic switch | **Implemented · audit-verified (V06)** | BrandLockup / `activeSphere` |
| Project open (SEVEN) + CDE Explorer | **Implemented · audit-verified** | Panels + SAMPLE labels preserved |
| Owner PIN gate (`3939`) | **Implemented · unverified in audit** | Client-only; skipped on `.tmp.now` / preview hosts |
| Google OAuth + Workspace REST | **Implemented · unverified** | Firebase popup; Wireframes panels; token in-memory only |
| Express durable store | **Implemented · unverified** | `store.json`; uploads mostly memory |
| ElevenLabs voice Connect Live | **Implemented · unverified** | Bridge + Web Speech fallback; audit did not Connect Live |
| Gemini orchestrate | **Implemented · broken contract** | Client sends `prompt`, server expects `userCommand` |
| Email / calendar **write** | **Unavailable / draft-only** | Minutes draft “email not connected”; no verified send |
| GPU glass / DOF / original sphere continuity | **Unverified / partial** | Soft-WebGL path was what audit saw; approved sphere reference **missing** |
| Tour auto-start | **Implemented · problematic (V07)** | `import.meta.env.PROD` auto-starts full tour |
| Playback mute ≠ mic mute | **Partial · unverified** | Separate concepts exist; not audio-proven |
| Campaign Engine OS | **Out of scope** | Future phase |

## 3. Audit V01–V10 → code mapping

| ID | Code finding | Action class |
| --- | --- | --- |
| V01 | Soft-WebGL label + map fallback | **Preserve** |
| V02 | `BrandLockup` uses `/assets/cerebro-wordmark.svg` without `BASE_URL` → **404 under `/cro/`**; `/cro/assets/...` 200 | **Fix path** |
| V03 | Sticky header z=40 over panels z=25 | **Layout reserve** |
| V04 | Optics + voice + health strip collide at 1180×757 | **Collision-first layout** |
| V05 | Narrow panel density | **Panel width / scroll** |
| V06 | HQ/CDE + SAMPLE paths work | **Preserve** |
| V07 | PROD auto-tour; BootLoader “17” vs 18 choreography | **Intentional tour + count reconcile** |
| V08 | Tour captions bleed into live transcript UX | **Scope captions** |
| V09 | Default `connectionState='Live'` while voice Ready; checkpoint strings from `crewRegistry` | **Truthful scopes** |
| V10 | SAMPLE markings in data | **Preserve SAMPLE; don’t invent backend proof** |

## 4. Approved visual / asset blockers

| Asset | Status |
| --- | --- |
| Wordmark SVG | Present at `public/assets/cerebro-wordmark.svg`; **loading bug under `/cro/`** |
| Bismillah SVG | Present; BootLoader uses inline path instead |
| Original non-hex sphere reference stills | **Missing / not located** — docs note approved white Arabic mark / binary refs absent |
| Geodesic `EdgesGeometry` dome | Present (not honeycomb tiles); contract forbids hex substitute — treat lattice opacity/behavior carefully; **do not invent “original sphere”** |
| Fonts WOFF2 / material maps index | **Not delivered as formal asset index** |

**Sphere visual sign-off: BLOCKED** until owner points at approved reference. Fallback soft-WebGL must remain.

## 5. Conflicting requirements (owner resolution)

1. **Tour:** Contract wants intentional/dismissible entry; current PROD build auto-starts tour on every `.tmp.now` load. Proposed default: auto-tour only with `?tour=1` or `?preview=1`, not bare `import.meta.env.PROD`.
2. **Displayed hash `1c16a15` / CP-20261023-2131:** page claims from `crewRegistry`, **not** git `20a660e`. Proposed: show build id from actual commit/env or label as registry metadata.
3. **“Live” connection:** default Live vs voice Ready. Proposed: default connection to Offline/Local until real event.

## 6. Smallest staged plan

### Stage A — Trust & layout foundation (this pass)
1. Prefix brand/static asset URLs with `import.meta.env.BASE_URL` (V02).
2. Stop PROD-only auto-tour; keep `?preview=1` / `?tour=1` (V07).
3. Reconcile tour total 18 vs “17” copy (V07).
4. Default connection scope off Live until evidenced (V09 partial).
5. Reserve top sticky vs panel chrome; calm optics/voice/health collision at 1180×757 (V03–V04) — minimal CSS/layout, no new design system.
6. Lint + build:labs; redeploy candidate preview; screenshot 1180×757.

### Stage B — Captions / voice truth (next)
Caption scoping, transcript history readability, mute path tests (needs audio device).

### Stage C — Spatial / sphere (blocked on reference)
Shared loader↔entry sphere identity only after approved reference; keep soft-WebGL.

### Stage D — Write integrations
Only after sandbox credentials; confirm/readback — no simulated success.

## 7. Tests intended for Stage A

- `npm run lint`
- `npm run build:labs`
- Curl: `/cro/assets/cerebro-wordmark.svg` → 200; page `<img>` loads
- Fresh load without `?tour=1`: no auto tour; with `?tour=1`: tour starts; Exit Tour works
- Viewport 1180×757: panel title/close not covered by sticky; voice controls in viewport
- Soft-WebGL banner still present when context unavailable

## 8. Release posture

No production replace. Candidate remains alternate `/cro` preview. **No claim of A01–A14 PASS** until evidence attached. Owner release approval required before any durable alias (labs.nojara.com / claim).
