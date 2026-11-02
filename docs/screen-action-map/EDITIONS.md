# Journey / intro editions (do not conflate)

| Edition | Duration | Status in this repo | Authority |
|---------|----------|---------------------|-----------|
| **Shipped intro** | **180s** (10 800 frames @ 60 fps) | Implemented — `public/cerebro.intro.json`, `docs/intro/`, `src/intro/main.tsx` | Runtime + review proofs |
| **Proposed journey cut** | **~90s / 25-beat** timeline | **Not implemented** — proposal only; must not overwrite or “correct” the 180s intro in QA maps | Separate design artifact |

Rules:

- Screen-and-action rows that cite intro timing must name which edition they mean.
- Do not mark the 90s cut as live behavior until it exists in `main` and has click-through + WebGL evidence.
- Workspace post-intro behavior (`/?intro=0&view=hq`, etc.) is independent of which intro edition eventually ships.
