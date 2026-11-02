# v0.1 — historical source inventory (not a validated map)

**Recommended stamp:** *historical source inventory at `51be7ca`; live behavior unverified.*

Cited checkpoint `51be7ca` and version `1.28.0` are real. Current `main` is on a **different history path** (example tip used for this note: `35d1d08`). The PDF cannot stand as a current-main screen-and-action map.

No live click-through or rendered WebGL QA was performed for v0.1.

## Finding → validation

| Finding | Validation |
|---------|------------|
| Checkpoint | `51be7ca` + `1.28.0` real; current `main` diverged — PDF is not a current-main map. |
| Entry and routes | Intro entry logic is broadly correct: explicit workspace `?view=` skips intro; first-tab entry without one opens the 180s intro. `App` route effect has many aliases beyond a “12” label. `?view=dashboard` / `pockets` collapses the dashboard; it does **not** open a distinct screen. |
| Screen count | The 17 numbered entries mix full entry modes, panels, overlays, a modal group, and a default-mounted spatial layer. Not 17 equivalent screens. Each needs type, mount condition, close path, and responsive state. |
| Renderer | Workspace: `ExperienceCanvas` → `DualSphereCanvas` → `CosmographCanvas`. Intro: mounts `CosmographCanvas` directly. Listing `DualSphereCanvas` as merely “another renderer” obscures the chain. |
| Tools and tests | Spatial bridge declares **33** schemas (`CEREBRO_33_TOOL_SCHEMAS` in `src/three/toolBridge.ts`). Voice-agent manifest declares **27** client tools (`src/data/croCdeGoogleAgentManifest.ts`). “Voice tool: 33” conflates them. Self-test defines **21** checks; counts do not prove checks passed. (On current `main` the developer button label is already “21-Point Self-Test”; stale “16-Point” wording must not be treated as evidence.) |
| Actions | Title claims control → handler → result, but v0.1 records controls/handlers only. Missing: observed resulting state, failure behavior, permission gate, test evidence. Server endpoints were not read by the PDF author. |

## Current-work corrections (vs v0.1 spatial-health text)

1. **Interactive project plan (current `main`)** — `InteractiveProjectPlan` (`src/components/spatial/InteractiveProjectPlan.tsx`) with map/list state, filters, pan/zoom, history, and linked node actions. Mounted from `SpatialHealthLayout`. v0.1 spatial-health description predates this.
2. **Intro duration editions** — Repo intro still targets **180 seconds**. Any **25-beat / 90-second** journey timeline is a **proposed, unimplemented** edition. Keep editions explicitly separate ([`EDITIONS.md`](./EDITIONS.md)).
