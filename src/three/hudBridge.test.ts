import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hudBridge, spatialHudPresentation, type HudDockSpec, type HudMenuSpec } from './hudBridge';

test('keyboard mode replaces 3D controls without discarding destinations or callbacks', () => {
  let calls = 0;
  const dock: HudDockSpec = { status: 'Ready', buttons: [{ id: 'call', label: 'Call', active: false, onSelect: () => { calls++; } }] };
  const menu: HudMenuSpec = { title: 'Tools', sections: [], onClose() {} };
  try {
    hudBridge.setActive(true);
    hudBridge.setDock(dock);
    hudBridge.setMenu(menu);
    hudBridge.setKeyboardControls(false);
    assert.equal(spatialHudPresentation().dock, dock);
    hudBridge.setKeyboardControls(true);
    assert.deepEqual(spatialHudPresentation(), { dock: null, menu: null });
    assert.equal(hudBridge.get().active, true, 'Keyboard access does not tear down WebGL');
    hudBridge.get().dock!.buttons[0].onSelect();
    assert.equal(calls, 1);
    hudBridge.setKeyboardControls(false);
    assert.equal(spatialHudPresentation().menu, menu);
    assert.equal(spatialHudPresentation().dock, dock);
  } finally {
    hudBridge.setActive(false); hudBridge.setDock(null); hudBridge.setMenu(null); hudBridge.setKeyboardControls(false);
  }
});
