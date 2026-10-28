# CEREBRO HQ — Blueprint v2.0 Audit Baseline

**Date:** 2026-10-28 (Africa/Cairo)  
**Source of truth requested:** `Cerebro_Tarek_Nojara_UI_UX_Blueprint_2026-10-24(2).pdf` (149 pages / 60 screens / 14 core states)  
**Repo tip at audit:** `0374bfc` on `main`

## Source PDF status

| Item | Result |
| --- | --- |
| Exact filename in workspace uploads | **NOT FOUND** |
| Exact filename in Google Drive (authorized account) | **NOT FOUND** |
| Closest local PDFs | `cerebro-gui-upgrade-v2_CORRECTED_20261028.pdf` (10p), `02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT` (24p) |
| Closest Drive PRD with screens | `CEREBRO_PRD_UI_UPDATE_v0_3i_with_SCREENS.pdf` (13.7 MB — download capped at 10 MB) |
| Readable companion | `CEREBRO_PRD_UI_UPDATE_v0_3i.md` |

**Blocker:** PDF page numbers in the matrix are marked `PDF-UNAVAILABLE` until the 149-page attachment is provided. Screen IDs, behavior contracts, and palette values are taken from the Master Blueprint Implementation prompt (v2.0 / 28 Oct 2026) plus live repository inspection.

## Stack (installed — not assumed from PDF)

| Package | Installed |
| --- | --- |
| `three` | `0.186.1` |
| `@react-three/fiber` | **NOT installed** |
| `@react-three/drei` | **NOT installed** |
| `postprocessing` (npm) | **NOT installed** — uses `three/addons/postprocessing/*` |
| React | `19.x` |
| Vite + Express | yes (`server.ts`) |
| ElevenLabs bridge | `src/utils/elevenLabsBridge.ts` |
| Firebase / Google OAuth | `src/utils/googleWorkspaceAuth.ts` |
| Automated test runner | **none** (in-app `gui-layout.test.ts` self-tests only) |

**Architecture fact:** Primary world is imperative Three.js in `CosmographCanvas.tsx`, not R3F. Blueprint text that says “ONE primary R3F world” is reconciled as **one primary WebGL world context** — we will not add a second GPU canvas or introduce R3F unless a later phase proves incompatibility that cannot be met with the existing Path A renderer.

## Navigation model (actual)

| Contract | Count | Location |
| --- | --- | --- |
| `GuiVisualState` | 10 | `visualStateMachine.ts` **and divergent** `guiTokens.ts` |
| `GuiCanonicalScreenId` S01–S09 | 9 | same |
| Tour screens S01–S18 | 18 | `cerebroTourAndCtaStore.ts` |
| Typed 14-state enum | **MISSING** | Introduced as `BlueprintCoreState` in `src/blueprint/coreStates.ts` |
| Letter screen IDs A1…PM5 | **MISSING as types** | Introduced in `src/blueprint/screenRegistry.ts` |

## Brand token reconciliation

| Blueprint proposed | Current locked | Decision |
| --- | --- | --- |
| canvas `#101D27` | `#101D27` | **KEEP** — match |
| surface `#142632` | `#142632` (`glassSolid`) | **KEEP** — match |
| text `#F2F6F8` | `#F2F6F8` | **KEEP** — match |
| ice `#B4DDFF` | `#B4DDFF` (`focus-glow`) | **KEEP** — match |
| voice `#78D3B2` | sacred voice orb `#9AFFE0` / mid `#359D8E` | **CONFLICT** — keep sacred orb; expose `#78D3B2` as `--token-voice-semantic` PROPOSED alias for non-orb voice chrome only |
| people `#E6A2B4` | station people `#7CE0B8` | **CONFLICT** — keep `#7CE0B8` for stations; expose `#E6A2B4` as `--token-people-semantic` PROPOSED for human-identity accents only |

Typography migration: **deferred** — keep existing application fonts until approved.

## Brand assets

| Asset | Status |
| --- | --- |
| `public/assets/cerebro-wordmark.svg` | present |
| `public/assets/cerebro-bismillah.svg` | present (BootLoader also embeds inline path) |
| Approved white Arabic NOJARA mark | **NOT found as dedicated SVG** — BLOCKED for exact mark; do not fake calligraphy |

## Auth / sources

- Owner gate: `BootLoader.tsx` keypad `3939` + server verification paths in `server.ts`
- Project register: `src/data/sourceData.ts` + snapshot CSV under `public/assets/aistudio/`
- Media: Spatial Media v7 Path A + Hotspot_26 local cache (authorized subset only)

## Preview / deploy

- Cloudflare quick tunnel + Vercel `--temporary` (~60m) used historically; ephemeral
- `vercel.json` SPA rewrite present
