# NOJARA presents CEREBRO — 16:9 introduction code

**Review build. Music and sound design only. No spoken voice. No full video render.**

A runnable, 180-second Three.js/React introduction driven by JSON. English headlines carry the story of NOJARA, Tarek Nojara, Shweekar Ahmed, Khaled El Shaalan, Young & Human and El Batron: difficult production work → creative ecosystem → Cerebro. The dry humour stays with the work; no award, private incident or personal credit is invented.

## Files

- `CEREBRO_INTRO_FULL.json`: complete handoff with configuration, literal runtime/shader source, asset manifest and 10,800 frame records.
- `public/cerebro.intro.json`: slim runtime configuration. Edit copy, asset bindings and camera keys here.
- `public/proofs.html`: twelve-shot review viewer. Inspect each beat and its actual source media; export a branded PNG from the running WebGL renderer.
- Separate static-preview ZIP: compiled `dist/` website with local media, fonts, logos and music/SFX. No API key required.
- `QA_REPORT.json`: completed checks and remaining verification. Targets are not presented as measured browser performance.

JSON is data. The included runtime interprets it; JSON alone does not draw WebGL.

## Preserved source and behaviour

The actual procedural scene, nested node archetypes, optical materials, silver/bronze hardware, Fresnel/caustic patch, galaxy/bokeh shader, cardiac beam shader and grain/vignette compositor come from the supplied Stellar Command 1.28.0 source. The separate uploaded R3F CameraRig belongs to another implementation and was not silently mixed into this imperative Three.js branch.

One scoped controller writes camera position, target and lens. The original camera-writing block is skipped in intro mode. Shared-tangent Hermite interpolation keeps the path continuous. Seeded particle initialization keeps repeated proof frames coherent. Media, type and shader uniforms share an absolute clock. The 60 fps timeline has 10,800 frame addresses; actual recording performance depends on the device.

Real media opens from a node, expands without stretching, plays, collapses and returns without remounting the scene. Archive dialogue stays muted. No voice-agent connection is simulated. The original procedural audio engine is muted to prevent a competing soundtrack.

The original NOJARA Arabic mark is an image extracted intact from the supplied branding master. It is not recreated with text. Jaapokki Subtract and supplied Arabic fonts are local binaries. NOJARA identity, Cerebro optical surfaces and subsidiary marks remain distinct. Original El Batron and real Young & Human source assets are included.

## Open gates

1. **Confirmed portraits for Shweekar Ahmed and Khaled El Shaalan remain missing.** Their image fields are null. Add approved files under `public/assets/people/` and bind their `src` fields. No invented face, stranger or aspirational team moodboard is substituted.
2. **The current preview browser cannot create a WebGL context.** Build, TypeScript, asset and camera-math checks pass. Actual shader appearance, media textures, GPU performance and final framing remain visually unverified. The runtime reports this instead of showing a fake sphere or silently removing transmission.
3. **Owner screen approval remains open**, including the Young & Human mark candidate and archived motion asset. This is a review candidate, not an approved live production revision.

Use the proof viewer on a WebGL 2 capable device to export actual rendered frames. That is the next visual approval step. No full journey recording has been made.

## Run

Extract the static-preview ZIP and serve it over HTTP:

```sh
python3 -m http.server 8080 --directory dist
```

Open `/proofs.html` for the shot viewer or `/index.html` for the continuous journey. Use HTTP rather than `file://` so modules, JSON and media load correctly.

Extract the source ZIP for editing with Node 22.19+:

```sh
npm install
npm run dev
npm run typecheck
npm run qa
npm run build
```

For Google AI Studio, import the source ZIP and preserve `index.html` → `src/intro/main.tsx`. Install dependencies from the included lockfile. Keep the supplied Three.js version, scene and fonts. Do not add another canvas or camera writer. Review the static-preview ZIP's proof viewer before recording or wiring the public homepage.

**Controls:** Begin unlocks sound; Space pauses/resumes; Left/Right seeks five seconds; H hides controls; F requests fullscreen; Escape collapses manual media. Dragging pauses and orbits. A linked node opens its real media. `?record=1` hides controls; it does not close the open review gates.

## Integrate without resetting the camera

The exported `CerebroIntro` component accepts `renderWorkspace` and `onEnterWorkspace`. It bootstraps a React root only when the standalone HTML attribute is present.

```tsx
import { CerebroIntro } from './src/intro/main';

<CerebroIntro
  renderWorkspace={({ scene, renderer, pose, claimCamera, openMedia }) => (
    <YourWorkspaceOverlay
      scene={scene}
      renderer={renderer}
      initialPose={pose}
      claimCamera={claimCamera}
      openMedia={openMedia}
    />
  )}
/>
```

Keep the component mounted so its scene and renderer survive the handoff. `claimCamera` accepts a pose sampler; the adapter remains the sole camera writer. The `cerebro:intro-enter` event also exposes the context and pose. These are integration hooks, not a claim that a separate production workspace was deployed or tested.

## Audio and timing edits

`mix_audio.py` creates the measured music/SFX master and separate stems. Cues follow headline entry, media expansion, return and world travel. Spoken voice is omitted by owner instruction. `AUDIO_QA.json` reports the actual encoded mix.

After editing chapter timing or sound cues:

```sh
python mix_audio.py
python assemble_json.py
npm run qa
npm run build
```

Python requires NumPy and FFmpeg/ffprobe. `FRAME_TABLE.json` records camera, headline word progress, media state and shader time for every frame. The full JSON also embeds runtime source. Keep that source handoff private when deploying; serve `dist/`, which contains the slim runtime configuration.

## Provenance

- Supplied Stellar Command 1.28.0 archive: scene and shaders. Its payload matches the earlier supplied archive; it is not described as a new current production revision.
- Supplied NOJARA V31 master: original Arabic mark and font files.
- Founder First Content Inventory v2 and owner direction: narrative and role scope. Tarek is Founder / Culture and Design Engineer; no CEO title added.
- Actual NOJARA showreel, Traverse Talks, NOJARA × LaLiga and El Batron clips. Tarek's portrait still comes from the identified production interview archive.
- Drive `1pK739vVtO9zoDTPbVyOXesP6o-9MRnch`: original El Batron white mark.
- Drive `14jE1NJ0fdey3-KHRc323z_0dAEIflZAD`: Young & Human 2024 animation; brand-motion evidence, not proof of a co-creation mechanism.
- Supplied `YAH_Asset3.png`: unmodified Young & Human mark candidate for review.

Private review package. Public-use/credit confirmation remains separate from file access. No production repository, hosted website, agent prompt or external record was changed.
