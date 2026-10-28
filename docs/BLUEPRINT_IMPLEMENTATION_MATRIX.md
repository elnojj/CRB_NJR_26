# CEREBRO HQ — Blueprint Implementation Matrix v2.0

**Generated:** 2026-10-28 · **Source PDF:** `Cerebro_Tarek_Nojara_UI_UX_Blueprint_2026-10-24(2).pdf` — **NOT IN WORKSPACE/DRIVE** (page column = `PDF-UNAVAILABLE`).

**Status legend:** `IMPLEMENTED` working end-to-end · `PARTIAL` exists but gaps · `MISSING` no dedicated view · `BLOCKED` cannot proceed safely · `VERIFIED` has automated/manual test evidence (never claim without tests).

## Summary

| Status | Count |
| --- | ---: |
| IMPLEMENTED | 23 |
| PARTIAL | 37 |
| MISSING | 0 |
| BLOCKED | 0 |
| VERIFIED | 0 |
| **Total** | **60** |

See also: [`BLUEPRINT_AUDIT_BASELINE.md`](./BLUEPRINT_AUDIT_BASELINE.md). Canonical typed registry: `src/blueprint/screenRegistry.ts`.

## Matrix

| screen ID | PDF page | existing component | current status | required changes | test evidence | commit |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | PDF-UNAVAILABLE | BootLoader.tsx (keypad) | PARTIAL | Confirm server lockout parity; never expose private records pre-auth; wire BlueprintScreenId. | none | — |
| A2 | PDF-UNAVAILABLE | BootLoader.tsx | PARTIAL | Make readiness-driven (not fixed countdown); skip when usable; silent entry on voice failure; use approved bismillah artwork asset. | none | — |
| A3 | PDF-UNAVAILABLE | App.tsx + VoiceCard + CosmographCanvas | PARTIAL | Align arrival camera with CameraDirector; ensure Cerebro widget dominant at z30. | none | — |
| B1 | PDF-UNAVAILABLE | layoutEngine.ts + App shell | PARTIAL | Reconcile tablet landscape targets (world/widget/panel/transcript/health/input) with computeGuiLayout slots. | gui-layout.self-tests | — |
| B2 | PDF-UNAVAILABLE | CosmographCanvas.tsx | PARTIAL | Stable project node IDs, selection/focus, accessible list fallback parity. | none | — |
| B3 | PDF-UNAVAILABLE | CosmographCanvas stations + PanelsOverlay | PARTIAL | Ensure each station binds by canonical id; labels follow 3D anchors. | none | — |
| B4 | PDF-UNAVAILABLE | WireframesV11Panels portfolio / projects | PARTIAL | Table view over Project Register rows with source freshness + unknown states. | none | — |
| H01 | PDF-UNAVAILABLE | ProjectHealthStrip.tsx + VerifiedProgress | PARTIAL | Numerator/denominator only; no fake gauges; expose blockers/deadlines/source freshness. | none | — |
| H02 | PDF-UNAVAILABLE | PanelsOverlay decisions (comment H02) | PARTIAL | Decision queue evidence + two-tap where writes exist. | none | — |
| H03 | PDF-UNAVAILABLE | briefing / tasks day slices | IMPLEMENTED | Dedicated Today panel from register deadlines + calendar when authorized. | none | — |
| H04 | PDF-UNAVAILABLE | PanelsOverlay timeline (comment H04) + CheckpointTimeline | PARTIAL | Accessible timeline with real checkpoint data; no decorative-only mode. | none | — |
| H05 | PDF-UNAVAILABLE | insights blockers fragments | IMPLEMENTED | Dedicated blockers/risks panel with source-backed rows. | none | — |
| H06 | PDF-UNAVAILABLE | people panel RACI | PARTIAL | Distinct human / AI / service identities; Owner 39 not an AI crew seat. | none | — |
| H07 | PDF-UNAVAILABLE | none dedicated | IMPLEMENTED | Activity feed from authentic revisions/receipts only. | none | — |
| I1 | PDF-UNAVAILABLE | WireframesV11Panels insights | PARTIAL | Truthful insight cards with evidence locators; no fabricated signals. | none | — |
| L1 | PDF-UNAVAILABLE | CosmographCanvas project nodes | PARTIAL | Constellation selection → project page with origin restore. | none | — |
| L2 | PDF-UNAVAILABLE | project-detail panel | PARTIAL | Full ProjectRef read model tabs with empty/error/loading. | none | — |
| L3 | PDF-UNAVAILABLE | tasks panel | PARTIAL | Status changes produce expected revisions; no fake completion. | none | — |
| L4 | PDF-UNAVAILABLE | TaskInspector.tsx | IMPLEMENTED | Promote to first-class panel id with back/origin restore. | none | — |
| L5 | PDF-UNAVAILABLE | partial forms in panels | IMPLEMENTED | Create/edit forms with validation + save receipt; no unauthorized remote writes. | none | — |
| L6 | PDF-UNAVAILABLE | none | IMPLEMENTED | Archive/restore with explicit unavailable if source lacks capability. | none | — |
| F1 | PDF-UNAVAILABLE | files panel + Drive adapter | PARTIAL | Folder graph with canonical Drive ids; unavailable when unauthorized. | none | — |
| F2 | PDF-UNAVAILABLE | file-viewer panel | PARTIAL | MIME-aware viewer states; preserve source URI/revision. | none | — |
| V1 | PDF-UNAVAILABLE | VoiceCard.tsx + elevenLabsBridge.ts | PARTIAL | Separate connection/input/output/execution/persistence axes; one session across nav. | none | — |
| V2 | PDF-UNAVAILABLE | VoiceCard transcript | PARTIAL | Provisional in-place updates; final messages retain IDs. | none | — |
| V3 | PDF-UNAVAILABLE | action receipts fragments | IMPLEMENTED | Visible action card: target, operation, result, evidence, recovery. | none | — |
| V4 | PDF-UNAVAILABLE | HandsOverlay.tsx | PARTIAL | Same validated intents as voice/touch; truthful tracking states only. | none | — |
| C1 | PDF-UNAVAILABLE | crew panel + crewRegistry | PARTIAL | Profile cards with actor ID/role; no fabricated presence. | none | — |
| C2 | PDF-UNAVAILABLE | PanelsOverlay team-room (comment C2) | PARTIAL | Text-only supporting members; authentic replies only. | none | — |
| G1 | PDF-UNAVAILABLE | gmail / workspace panels | PARTIAL | Never fake inbox; show unauthorized/unavailable explicitly. | none | — |
| G2 | PDF-UNAVAILABLE | calendar panel | PARTIAL | Real Calendar API or unavailable state. | none | — |
| G3 | PDF-UNAVAILABLE | none dedicated | IMPLEMENTED | iframe player + provider events; truthful playback states. | none | — |
| G4 | PDF-UNAVAILABLE | PanelsOverlay minutes (comment G4) | PARTIAL | Handoff states only when channel evidence supports them. | none | — |
| S1 | PDF-UNAVAILABLE | gmail/minutes two-tap gates | PARTIAL | Shared TwoTapConfirm primitive for all destructive/remote writes. | none | — |
| S2 | PDF-UNAVAILABLE | status badges across panels | IMPLEMENTED | Canonical status vocabulary UI surface. | none | — |
| S3 | PDF-UNAVAILABLE | VerifiedProgress / health strips | IMPLEMENTED | Accessible line/bar/table only; no fake pie/count-up. | none | — |
| S4 | PDF-UNAVAILABLE | visualStateMachine.ts | IMPLEMENTED | Unify divergent GuiVisualState enums; expose debug-free user-facing state words. | none | — |
| W1 | PDF-UNAVAILABLE | none | IMPLEMENTED | Editable widget grid with persistence receipts. | none | — |
| W2 | PDF-UNAVAILABLE | none | IMPLEMENTED | Catalogue of allowed widgets only. | none | — |
| R1 | PDF-UNAVAILABLE | layoutEngine phone breakpoint | PARTIAL | 390×844 validation: 16px gutters, one sheet, health strip, accessible input. | gui-layout.self-tests | — |
| R2 | PDF-UNAVAILABLE | layoutEngine ipad / landscape | PARTIAL | 1024×768 + Split View + keyboard insets. | gui-layout.self-tests | — |
| R3 | PDF-UNAVAILABLE | layoutEngine desktop/wide | PARTIAL | 1440×900 ~28/38/28 spatial proportions. | gui-layout.self-tests | — |
| X1 | PDF-UNAVAILABLE | settings panel | PARTIAL | Settings sections with reduced-motion + quality tiers. | none | — |
| X2 | PDF-UNAVAILABLE | baghira / kinzo panels | IMPLEMENTED | Unify as crew workspaces with text-only agents. | none | — |
| X3 | PDF-UNAVAILABLE | none | IMPLEMENTED | Planning workspace over real milestones/risks. | none | — |
| X4 | PDF-UNAVAILABLE | runtimeRegistry.ts fragments | IMPLEMENTED | Runtime status from authentic agent/tool evidence. | none | — |
| X5 | PDF-UNAVAILABLE | file-viewer PDF paths | IMPLEMENTED | Dedicated PDF viewer with page controls + source URI. | none | — |
| X6 | PDF-UNAVAILABLE | SpatialMediaPanel / media panel | IMPLEMENTED | Focused image mode with origin restore; aspect + credits. | none | — |
| X7 | PDF-UNAVAILABLE | none | IMPLEMENTED | HTMLAudioElement transport with truthful states. | none | — |
| J1 | PDF-UNAVAILABLE | App dispatchCamera + CosmographCanvas | PARTIAL | CameraDirector class landed + attached to App dispatchCamera; finish CatmullRom sampling inside CosmographCanvas travel loop; stop on media focus. | none | — |
| J2 | PDF-UNAVAILABLE | none | IMPLEMENTED | Called-in card stack UI with dismiss/restore. | none | — |
| J3 | PDF-UNAVAILABLE | cerebroTourAndCtaStore S01–S18 | PARTIAL | Map tour stops to BlueprintScreenIds; keep stop/skip. | preview=?preview=1 manual | — |
| J4 | PDF-UNAVAILABLE | none | IMPLEMENTED | Quality-tier safe background choices only. | none | — |
| J5 | PDF-UNAVAILABLE | none | IMPLEMENTED | Upload + classify with explicit permission gates; no unauthorized Drive writes. | none | — |
| J6 | PDF-UNAVAILABLE | SpatialMediaPanel + MediaGrid3D Path A | PARTIAL | Focused media hides workspace cards; restore origin; Hotspot_26 as test fixture only. | none | d780791 / 0374bfc |
| PM1 | PDF-UNAVAILABLE | actionDispatcher + ElevenLabs tools | PARTIAL | Draft → validate → save receipt → duplicate prevention. | none | — |
| PM2 | PDF-UNAVAILABLE | team-room draft | PARTIAL | No fabricated typing/read receipts. | none | — |
| PM3 | PDF-UNAVAILABLE | minutes/decisions receipts | IMPLEMENTED | Unified ActionReceipt surface for all mutations. | none | — |
| PM4 | PDF-UNAVAILABLE | ProjectHealthStrip | PARTIAL | Persistent z50 health with real n/d and blockers. | none | — |
| PM5 | PDF-UNAVAILABLE | camera stop + draft persistence fragments | PARTIAL | Preserve drafts on interrupt; camera stop ≠ cancel remote write. | none | — |
