import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

test('reduced motion has no legacy planar sphere and a workspace replaces the fallback map', async () => {
  const bundle = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
      import { ExperienceCanvas } from './src/three/ExperienceCanvas';
      import { CosmographCanvas } from './src/components/CosmographCanvas';
      import { GuiFocusOverlay } from './src/gui/GuiFocusOverlay';
      const props = { activeSphere: 'hq', focusedNodeId: null, tourHighlightId: null, captionBubble: null,
        reducedMotion: true, cameraCommand: null, onSelectNode() {}, onUserTouchPauseTour() {}, onTelemetryChange() {} };
      const panel = { id: 'workspace-content', nodeId: 'projects', sphere: 'hq', slot: 0, content: <button>Workspace action</button> };
      const render = props => renderToStaticMarkup(<CosmographCanvas {...props} />);
      console.log(JSON.stringify({
        reduced: renderToStaticMarkup(<ExperienceCanvas {...props} />),
        fallback: render({ ...props, forceWebglFallback: true, spatialPanels: [] }),
        workspace: render({ ...props, forceWebglFallback: true, spatialPanels: [panel] }),
        suspended: render({ ...props, forceWebglFallback: true, spatialPanels: [{ ...panel, suspended: true }] }),
        focus: renderToStaticMarkup(<GuiFocusOverlay activeScreen="S01" breakpoint="phone" visualState="focus" cameraPreset="master"
          viewportW={390} viewportH={844} centerSafeRect={{x:12,y:76,w:366,h:500}}
          projectedTarget={{ id:'project',label:'UNIQUE_PLANAR_LABEL',x:150,y:200,visible:true }}
          isCameraInFlight={false} showQaHud={false} hasBookmark={false} />),
      }));` },
    bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const views = JSON.parse(execFileSync(process.execPath, ['--input-type=module'], { input: bundle.outputFiles![0].text, encoding: 'utf8' }));
  assert.doesNotMatch(views.reduced, /sphere_fallback_rest\.png|sphere-fallback-rest-layer|Crew Roster \(v1\.5\)/);
  assert.match(views.fallback, /reduced-graphics-fallback/);
  assert.match(views.workspace, /Workspace action/);
  assert.doesNotMatch(views.workspace, /reduced-graphics-fallback/);
  assert.match(views.suspended, /inert="" aria-hidden="true" style="display:none"/);
  assert.match(views.suspended, /Workspace action/, 'Suspending a foreground-blocked workspace preserves its content tree');
  assert.doesNotMatch(views.focus, /UNIQUE_PLANAR_LABEL/);
  assert.match(views.focus, /<circle/, 'The noninteractive focus ring remains');
});
