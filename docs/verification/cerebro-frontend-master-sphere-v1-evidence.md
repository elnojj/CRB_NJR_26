# Evidence — cerebro-frontend-master-sphere-v1

Date: 2026-11-02 (Africa/Cairo)  
Branch: `main`  
Base / tip: see Publication after push  
Source lock: `1f78a1295d4dd36a11320995c1e14bf17788ac25`

Honesty rule: the 36 design-config checks do not prove GPU appearance, live media playback, accessibility journeys, or deployment. Those are reported separately below.

## Publication

| Remote | SHA | Status |
|--------|-----|--------|
| Cursor Origin `main` | `2669382` | Verified via `git push` + `git ls-remote` |
| GitHub `elnojj/CRB_NJR_26` `main` | `2669382` | Synced via deployment PAT · matches Origin |

## Static gates

| Command | Result |
|---------|--------|
| `npm run validate:design` | PASS 36/36 |
| `npm run lint` | PASS |
| `npm run qa:spheres` | PASS |
| `npm run qa:remediation` | PASS |
| `npm run build` | PASS |

## Layer evidence

| requirementId | implementedBehavior | testCommandOrRuntimeScenario | actualResult | remainingGate | filesChanged (this pass + prior) |
|---------------|---------------------|------------------------------|--------------|---------------|----------------------------------|
| L01 | Locked fonts Sora/Inter/JetBrains/Noto Kufi; cobalt focus; station hex from config; no gold aliases for focus/stations/voice | validate:design + token audit | PASS static; CSS mirrors + guiTokens aligned | Visual computed-style audit at all viewports | `cerebro.tokens.css`, `guiTokens.ts`, `colours.ts`, `index.css`, spatial/chrome CSS |
| L02 | Elevation z-tokens; blur ≤12px; blur removed from land animation; tokens own custom properties | validate:design; CSS review | PASS static | Full computed-style audit | `cerebro.tokens.css`, component CSS |
| L03 | Master portals from `PROJECTS_DATA` (8); peer network migration input; unavailable project-world hosts on MAT glass; context-lost pause + remount rebuild; ice media fallback | qa:spheres; code path enter/exit unavailable | PASS code; worlds stay **unavailable** until verified assets | Rich playable interiors; GPU restore visual proof | `masterSphere.ts`, `projectWorldHost.ts`, `projectWorldManifest.ts`, `CosmographCanvas.tsx` |
| L04 | C06 capsule + expanded sheet; offline/retry; Connect/Stop separated; RMS only while live | Browser `/?intro=0` | Capsule visible | Mic denial / reconnect live matrix | `VoiceCard.tsx`, `elevenLabsBridge.ts` |
| L05 | sceneSafeRect + keyboard inset; voice sheet owns phone; utility in collision | layout self-tests prior | PASS prior | Clipped-control matrix at 5 viewports | `layoutEngine.ts` |
| L06 | Typed actions + receipts; nav generation; unavailable project/panel receipts | code paths | PASS code | Hand-tracking settle live proof | `App.tsx`, `actionDispatcher.ts` |
| L07 | `cerebro.session.v1` + CanonicalNavigationSnapshot; tour never resumes mid-step | hydration code | PASS code | Reload-in-project runtime matrix | `cerebroSessionStore.ts` |
| L08 | Idle orbit gated by stage ownership; skippable intro separate | code + prior intro QA | Orbit gated | Full film idle-replay ownership | `App.tsx`, `CosmographCanvas.tsx` |
| L09 | Registry panels; unknown panel → unavailable receipt | code | PASS code | Empty/error/stale states per panel audit | `PanelsOverlay.tsx`, `runtimeRegistry.ts` |
| L10 | Default-app bloom off; film bloom intro-only | CosmographCanvas review | PASS code | Interrupt/resize camera matrix | `CosmographCanvas.tsx` |
| L11 | lang/dir; Arabic letter-spacing 0; cobalt focus ring; Escape stack; sphere label aria-labels + 44px | code | PASS code | Full SR journey without WebGL hit-testing | `App.tsx`, `CosmographCanvas.tsx`, `index.css` |
| L12 | SystemStatusLayer; WebGL reduced-graphics + Retry remount; return-to-master | code | PASS code | Exhaustive failure-state copy audit | `SystemStatusLayer.tsx`, `CosmographCanvas.tsx` |
| L13 | Drive catalog provenance/playable fields; no invented media | qa:remediation prior | PASS declaration | Signed-URL expiry live matrix | `driveMediaCatalog.ts` |

## Architecture honesty

| Claim | Status |
|-------|--------|
| One translucent master sphere as **sole** primary metaphor (peers fully demoted in UX) | **Partial** — master portals + mapping exist; HQ/CDE dual-sphere scene remains the live workspace composition (migration in progress, not finished) |
| Selecting inner sphere opens scoped playable WebGL world | **Unavailable plates only** for source projects — correct under projectWorldRule (do not invent media) |
| Closing returns to saved master pose | **Implemented** in projectWorldRuntime + Escape / return control |
| Never use “6 Suns · 4 Real” | **Fixed** — badge = `8 programmes · 4 verified · 4 sample` from `PROJECTS_DATA` |

## Runtime scenarios (honest)

| Scenario | Evidence |
|----------|----------|
| master world zero/one/many | Portals support 0..N packing; live data has 8 |
| enter/exit available project worlds | No playable worlds yet — enter yields unavailable plate + return |
| WebGL context lost/restored | Local pause + `webglRebuildKey` remount; pose kept in `stateRef` |
| English/Arabic keyboard | lang/dir + Escape stack + label a11y; full SR journey not recorded this pass |

## Screenshots

- `/opt/cursor/artifacts/screenshots/cerebro-workspace-after-frontend-fixes.webp`
- `/opt/cursor/artifacts/screenshots/cerebro-workspace-voice-capsule.webp`

## Remaining (do not claim done)

1. Full demotion of peer dual-sphere composition to master-only primary navigation (scene still dual HQ/CDE).
2. Rich project-world interiors when verified assets exist.
3. Full screen-reader primary journey proof.
4. Live matrix for voice denial/reconnect and signed-URL expiry.
