# Sphere 1: the 25 Beats environment

`ExperienceCanvas` mounts `Sphere1Canvas` by default. `?env=network` brings back the old four-sphere
`CosmographCanvas` for comparison; nothing else selects it.

## Scene graph

```
Scene
|- Sphere1_BaseLighting      core rig, kept
|- AudioListener             core rig, kept (created on the first user gesture, parented to the camera)
'- Sphere1_Root              [0, 0, 0]
   |- Sphere1_ShellBack      MAT_LIQUID_GLASS_SHELL, back faces, renderOrder 9, depthWrite off
   |- Sphere1_Shell          MAT_LIQUID_GLASS_SHELL, front faces, renderOrder 10, depthWrite off
   '- BeatsTimelineContainer
      '- Beat_00 .. Beat_24
         |- BeatMediaViewport   image, video (playback manager) or generated title card
         |- BeatTextAnchor      word-by-word SDF text
         |- BeatMetricDisplay   callout card, numbers count up
         '- BeatMarker_NN       numbered ring, always visible
```

`Sphere1Environment.mount()` first calls `isolateScene()`, which removes and recursively disposes every
top-level object that is not a light, camera, audio listener or flagged with `markCoreRig()`.
`Sphere1Canvas` runs it again on unmount before releasing the renderer.

## Where to inject the real content

| What | Hook | Shape |
| --- | --- | --- |
| Copy, media, metric, camera override per beat | `beatContent` prop on `ExperienceCanvas` | `(index) => BeatContent \| null` |
| How a slot is drawn | `beatSlotFactories` prop | `createText`, `createMedia`, `createMetric`, `createMarker` |
| Speed ramp per beat | `BeatContent.camera.ramp` | `{ ease, travelSec, holdSec }`; `SPEED_RAMPS` has named eases |
| Camera position, target, focal length, roll | `BeatContent.camera` | defaults come from `computeBeatPlacements()` |
| Layout of the 25 anchors | `BeatLayoutOptions` | spiral radius, turns, standoff |

A beat with no content shows only its marker, and the journey caption says the content has not been supplied.

## Camera

`BeatsCameraRig` is the only camera authority. Orbit: drag, wheel, slow idle drift. Journey: one centripetal
Catmull-Rom curve through home, the 25 camera stops and home again, driven by one GSAP timeline in which each
segment has its own ease and hold. Reduced motion cuts between beats. Any pointer press during the journey
stops it and flies back to the orbit pose.
