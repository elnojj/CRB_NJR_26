/**
 * CEREBRO Stellar Command — GUI Amendment v4.0 (`cerebro-ui/4`)
 * Automated Layout, Optical & Collision Verification Suite (`gui-layout.test.ts`)
 *
 * Verifies all mandatory assertions from `CEREBRO_CDE_UNIFIED_AMEND_v4.json` across:
 * - `390x844` (Phone)
 * - `820x1180` (iPad Portrait)
 * - `1180x820` (iPad Landscape)
 * - `1440x900` (Desktop)
 * - `1920x1080` (Wide)
 */

import { computeGuiLayout } from './layoutEngine';
import { intersectionArea, verifyZeroOverlap } from './CollisionManager';
import {
  GUI_CAMERA_PRESETS,
  computeVerticalFovDeg,
  computeFittedCameraDistance,
  quinticSmootherstep,
} from './cameraPresets';
import { GUI_GLASS_TOKENS, GUI_TOUCH_TOKENS } from './guiTokens';

export interface GuiTestResult {
  name: string;
  viewport: string;
  passed: boolean;
  detail: string;
}

export interface GuiSelfTestSummary {
  total: number;
  passed: number;
  failed: number;
  results: GuiTestResult[];
}

export function runGuiLayoutSelfTests(): GuiSelfTestSummary {
  const results: GuiTestResult[] = [];
  const samplePanels = ['overview', 'roadmap', 'analytics', 'governance'];

  // 1. Phone 390x844 — One and only one panel sheet + zero voice overlap
  {
    const layoutDefault = computeGuiLayout({
      width: 390,
      height: 844,
      openPanels: samplePanels,
      phoneSheetState: 'default',
    });
    const layoutExpanded = computeGuiLayout({
      width: 390,
      height: 844,
      openPanels: samplePanels,
      phoneSheetState: 'expanded',
    });

    const singleSheetOnly =
      layoutDefault.panelSlots.length === 1 &&
      layoutDefault.panelSlots[0].tabPanelIds.length === 4;

    results.push({
      name: 'phone_390x844: single bottom sheet with tabs',
      viewport: '390x844',
      passed: singleSheetOnly,
      detail: `slots=${layoutDefault.panelSlots.length}, tabs=${layoutDefault.panelSlots[0]?.tabPanelIds.length ?? 0}`,
    });

    const overlapExpanded = intersectionArea(
      layoutExpanded.panelSlots[0].rect,
      layoutExpanded.voiceRect,
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    results.push({
      name: 'phone_390x844: zero overlap when sheet expanded (voice 52px dock)',
      viewport: '390x844',
      passed: overlapExpanded === 0 && layoutExpanded.voiceRect.h === 52,
      detail: `overlapArea=${overlapExpanded}, voiceH=${layoutExpanded.voiceRect.h}px`,
    });
  }

  // 2. iPad Portrait 820x1180 — Single left inspector (w=304) + voice dock right-bottom + zero overlap
  {
    const layout = computeGuiLayout({
      width: 820,
      height: 1180,
      openPanels: samplePanels,
    });

    const singleLeftInspector =
      layout.panelSlots.length === 1 &&
      layout.panelSlots[0].rect.x === 20 &&
      layout.panelSlots[0].rect.w === 304;

    const overlap = verifyZeroOverlap(
      [...layout.panelSlots.map((s) => s.rect), layout.voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    results.push({
      name: 'ipad_820x1180: single left inspector (304px) & zero overlap',
      viewport: '820x1180',
      passed: singleLeftInspector && overlap.passed,
      detail: `slots=${layout.panelSlots.length}, overlapPassed=${overlap.passed}`,
    });
  }

  // 2B. iPad Landscape 1180x820 — 2 flanking slots (w=288) + centered voice dock + zero overlap
  {
    const layout = computeGuiLayout({
      width: 1180,
      height: 820,
      openPanels: samplePanels,
    });

    const overlap = verifyZeroOverlap(
      [...layout.panelSlots.map((s) => s.rect), layout.voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    results.push({
      name: 'ipad_landscape_1180x820: 2 flanking slots (288px) & zero overlap',
      viewport: '1180x820',
      passed:
        layout.panelSlots.length === 2 &&
        layout.panelSlots[0].rect.w === 288 &&
        overlap.passed,
      detail: `slots=${layout.panelSlots.length}, slotW=${layout.panelSlots[0]?.rect.w}, overlapPassed=${overlap.passed}`,
    });
  }

  // 3. Desktop 1440x900 — 2 flanking slots or 4 quadrant slots + zero overlap with centered voice dock
  {
    const layout2 = computeGuiLayout({
      width: 1440,
      height: 900,
      openPanels: ['overview', 'roadmap'],
    });
    const layout4 = computeGuiLayout({
      width: 1440,
      height: 900,
      openPanels: samplePanels,
      allowFourQuadrantSlots: true,
    });

    const overlap2 = verifyZeroOverlap(
      [...layout2.panelSlots.map((s) => s.rect), layout2.voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );
    const overlap4 = verifyZeroOverlap(
      [...layout4.panelSlots.map((s) => s.rect), layout4.voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    results.push({
      name: 'desktop_1440x900: 2-slot & 4-quadrant zero panel/voice overlap',
      viewport: '1440x900',
      passed:
        layout2.panelSlots.length === 2 &&
        layout4.panelSlots.length === 4 &&
        layout2.voiceRect.w === 460 &&
        overlap2.passed &&
        overlap4.passed,
      detail: `slots2=${layout2.panelSlots.length}, slots4=${layout4.panelSlots.length}, voiceW=${layout2.voiceRect.w}, overlapPassed=${overlap2.passed && overlap4.passed}`,
    });
  }

  // 4. Wide 1920x1080 — 400px left/right slots, 480px voice, >= 960px center unobstructed width
  {
    const layout = computeGuiLayout({
      width: 1920,
      height: 1080,
      openPanels: ['overview', 'roadmap'],
    });

    const overlap = verifyZeroOverlap(
      [...layout.panelSlots.map((s) => s.rect), layout.voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    results.push({
      name: 'wide_1920x1080: 400px slots, 480px voice, >=960px centerSafe',
      viewport: '1920x1080',
      passed:
        layout.panelSlots.length === 2 &&
        layout.panelSlots[0].rect.w === 400 &&
        layout.voiceRect.w === 480 &&
        layout.centerSafeRect.w >= 960 &&
        overlap.passed,
      detail: `centerSafeW=${layout.centerSafeRect.w}px, overlapPassed=${overlap.passed}`,
    });
  }

  // 5. Camera 36x24mm Sensor Vertical FOV & Unobstructed Sphere Framing
  {
    const fov28 = computeVerticalFovDeg(28);
    const fov35 = computeVerticalFovDeg(35);
    const fov50 = computeVerticalFovDeg(50);
    const fov85 = computeVerticalFovDeg(85);

    const opticalMatch =
      fov28 === 46.4 && fov35 === 37.8 && fov50 === 27.0 && fov85 === 16.1;

    results.push({
      name: 'cameraPresets: 36x24mm optical vertical FOV formula',
      viewport: 'all',
      passed: opticalMatch,
      detail: `28mm=${fov28}°, 35mm=${fov35}°, 50mm=${fov50}°, 85mm=${fov85}°`,
    });

    const desktopLayout = computeGuiLayout({
      width: 1440,
      height: 900,
      openPanels: ['overview', 'roadmap'],
    });
    const distFocused = computeFittedCameraDistance({
      sphereRadius: 6.2,
      preset: GUI_CAMERA_PRESETS.focused,
      viewportW: 1440,
      viewportH: 900,
      unobstructedRect: desktopLayout.centerSafeRect,
    });

    results.push({
      name: 'cameraPresets: sphere unobstructed in focused state',
      viewport: '1440x900',
      passed: Number.isFinite(distFocused) && distFocused > 6.2 * 1.4,
      detail: `fittedDistance=${distFocused.toFixed(2)}u`,
    });
  }

  // 6. Quintic smootherstep boundary & midpoint verification + glass/touch tokens
  {
    const e0 = quinticSmootherstep(0);
    const eMid = quinticSmootherstep(0.5);
    const e1 = quinticSmootherstep(1);

    results.push({
      name: 'motion & tokens: quintic easing + >=44px touch targets',
      viewport: 'all',
      passed:
        e0 === 0 &&
        Math.abs(eMid - 0.5) < 1e-6 &&
        e1 === 1 &&
        GUI_TOUCH_TOKENS.minTargetPx >= 44 &&
        GUI_GLASS_TOKENS.headerH === 52,
      detail: `e(0.5)=${eMid}, minTarget=${GUI_TOUCH_TOKENS.minTargetPx}px, headerH=${GUI_GLASS_TOKENS.headerH}px`,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
