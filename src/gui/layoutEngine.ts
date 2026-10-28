/**
 * CEREBRO Stellar Command — GUI Amendment v4.0 (`cerebro-ui/4`)
 * Deterministic Slot-Based Layout Engine & Unobstructed Viewport Solver
 *
 * Implements the 5 canonical reference viewports from `CEREBRO_CDE_UNIFIED_AMEND_v4.json`:
 * - `desktop_1440_900` (up to 4 quadrant slots `[24,80,304,300]`, `[1112,80,304,300]`, `[24,396,304,300]`, `[1112,396,304,300]`, `sceneSafe: [344,80,752,704]`, `voiceDock: [480,804,480,72]`)
 * - `wide_1920_1080` (up to 4 quadrant slots `[32,88,360,380]`, `[1528,88,360,380]`, `[32,484,360,380]`, `[1528,484,360,380]`, `sceneSafe: [408,88,1104,856]`, `voiceDock: [690,984,540,72]`)
 * - `ipad_landscape_1180_820` (2 flanking slots `[20,76,288,612]`, `[872,76,288,612]`, `sceneSafe: [324,76,532,612]`, `voiceDock: [360,724,460,72]`)
 * - `ipad_portrait_820_1180` (1 left inspector slot `[20,76,304,648]`, `sceneSafe: [340,76,460,972]`, `voiceDock: [340,1084,460,72]`)
 * - `phone_390_844` (1 bottom sheet `[12,436,366,284]` + minimized chips `[12,388,366,36]`, `sceneSafe: [12,72,366,304]`, `voiceDock: [12,740,366,76]`)
 */

import { GuiRect, clampRectToViewport, verifyZeroOverlap } from './CollisionManager';
import { GUI_TOUCH_TOKENS } from './guiTokens';

export type GuiBreakpoint = 'phone' | 'ipad' | 'ipad_landscape' | 'desktop' | 'wide';

export type PhoneSheetExpansion = 'collapsed' | 'default' | 'expanded';

export interface PanelSlotAssignment {
  slotId:
    | 'left'
    | 'right'
    | 'bottomLeft'
    | 'bottomRight'
    | 'leftInspector'
    | 'bottomSheet';
  rect: GuiRect;
  activePanelId: string;
  tabPanelIds: string[];
}

export interface ComputedGuiLayout {
  breakpoint: GuiBreakpoint;
  viewportW: number;
  viewportH: number;
  headerRect: GuiRect;
  centerSafeRect: GuiRect;
  sceneSafeRect: GuiRect;
  mediaFullViewRect: GuiRect;
  minimizedChipsRect?: GuiRect;
  voiceRect: GuiRect;
  panelSlots: PanelSlotAssignment[];
  overflowTabPanelIds: string[];
  zeroOverlapPassed: boolean;
  voiceCompactedForSheet: boolean;
  quadrantModeActive: boolean;
}

export function resolveGuiBreakpoint(width: number, height = 900): GuiBreakpoint {
  if (width < 768) return 'phone';
  if (width < 1100) return 'ipad';
  if (width >= 1100 && width <= 1260 && height <= 860) return 'ipad_landscape';
  if (width < 1680) return 'desktop';
  return 'wide';
}

export interface ComputeGuiLayoutParams {
  width: number;
  height: number;
  openPanels: string[];
  activeSlotTabs?: Record<string, string | undefined>;
  phoneSheetState?: PhoneSheetExpansion;
  voiceExpanded?: boolean;
  voiceDragDelta?: { x: number; y: number };
  keyboardInsetBottom?: number;
  allowFourQuadrantSlots?: boolean;
}

export function computeGuiLayout(params: ComputeGuiLayoutParams): ComputedGuiLayout {
  const width = Math.max(320, Math.round(params.width));
  const height = Math.max(568, Math.round(params.height));
  const breakpoint = resolveGuiBreakpoint(width, height);
  const openPanels = params.openPanels ?? [];
  const phoneSheetState = params.phoneSheetState ?? 'default';
  const kbInset = Math.max(0, Math.round(params.keyboardInsetBottom ?? 0));
  const allowFourQuadrantSlots = params.allowFourQuadrantSlots ?? openPanels.length > 2;

  // ---------------------------------------------------------------------------
  // 1. PHONE (390x844 reference)
  // ---------------------------------------------------------------------------
  if (breakpoint === 'phone') {
    const padX = 12;
    const colW = Math.max(296, width - padX * 2);
    const headerRect: GuiRect = { x: padX, y: 12, w: colW, h: 48 };
    const minimizedChipsRect: GuiRect = { x: padX, y: 388, w: colW, h: 36 };

    const isSheetExpanded = openPanels.length > 0 && phoneSheetState === 'expanded';
    const voiceH = isSheetExpanded ? 52 : 76;
    const voiceY = Math.max(headerRect.y + headerRect.h + 16, height - voiceH - 28 - kbInset);
    const voiceRect: GuiRect = {
      x: padX,
      y: voiceY,
      w: colW,
      h: voiceH,
    };

    const panelSlots: PanelSlotAssignment[] = [];
    let sheetTop = voiceY;

    if (openPanels.length > 0) {
      const targetSheetH =
        phoneSheetState === 'collapsed' ? 72 : phoneSheetState === 'expanded' ? 520 : 284;
      const maxAvailableSheetH = Math.max(
        72,
        voiceRect.y - GUI_TOUCH_TOKENS.panelCollisionMarginPx - (headerRect.y + headerRect.h + 100)
      );
      const sheetH = Math.min(targetSheetH, maxAvailableSheetH);
      sheetTop = voiceRect.y - GUI_TOUCH_TOKENS.panelCollisionMarginPx - sheetH;

      panelSlots.push({
        slotId: 'bottomSheet',
        rect: {
          x: padX,
          y: sheetTop,
          w: colW,
          h: sheetH,
        },
        activePanelId: openPanels[openPanels.length - 1],
        tabPanelIds: [...openPanels],
      });
    }

    const safeBottom =
      openPanels.length > 0 ? sheetTop - 12 : voiceRect.y - 12;
    const safeTop = headerRect.y + headerRect.h + 12;
    const centerSafeRect: GuiRect = {
      x: padX,
      y: safeTop,
      w: colW,
      h: Math.max(120, safeBottom - safeTop),
    };

    const allInteractiveRects = [
      headerRect,
      ...panelSlots.map((s) => s.rect),
      voiceRect,
    ];
    const check = verifyZeroOverlap(allInteractiveRects, GUI_TOUCH_TOKENS.panelCollisionMarginPx);

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: padX, y: 72, w: colW, h: Math.max(300, height - 190) },
      minimizedChipsRect,
      voiceRect,
      panelSlots,
      overflowTabPanelIds: openPanels.length > 1 ? openPanels.slice(0, -1) : [],
      zeroOverlapPassed: check.passed,
      voiceCompactedForSheet: isSheetExpanded,
      quadrantModeActive: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. IPAD PORTRAIT (820x1180 reference)
  // ---------------------------------------------------------------------------
  if (breakpoint === 'ipad') {
    const padX = 20;
    const headerRect: GuiRect = { x: padX, y: 16, w: width - padX * 2, h: 48 };
    const inspectorW = 304;
    const inspectorTop = 76;
    const inspectorH = Math.min(648, height - inspectorTop - 120);

    const voiceW = Math.min(460, Math.max(320, width - (padX + inspectorW + 16) - padX));
    const voiceH = params.voiceExpanded ? Math.min(320, Math.round(height * 0.32)) : 72;
    const voiceRect: GuiRect = {
      x: width - padX - voiceW,
      y: height - 24 - voiceH - kbInset,
      w: voiceW,
      h: voiceH,
    };

    const panelSlots: PanelSlotAssignment[] = [];
    if (openPanels.length > 0) {
      panelSlots.push({
        slotId: 'leftInspector',
        rect: {
          x: padX,
          y: inspectorTop,
          w: inspectorW,
          h: inspectorH,
        },
        activePanelId: openPanels[openPanels.length - 1],
        tabPanelIds: [...openPanels],
      });
    }

    const safeX = openPanels.length > 0 ? padX + inspectorW + 16 : padX;
    const safeW = Math.max(260, width - safeX - padX);
    const safeH = Math.max(260, voiceRect.y - 16 - inspectorTop);
    const centerSafeRect: GuiRect = {
      x: safeX,
      y: inspectorTop,
      w: safeW,
      h: safeH,
    };

    const allInteractiveRects = [
      headerRect,
      ...panelSlots.map((s) => s.rect),
      voiceRect,
    ];
    const check = verifyZeroOverlap(allInteractiveRects, GUI_TOUCH_TOKENS.panelCollisionMarginPx);

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: 40, y: 88, w: width - 80, h: height - 200 },
      voiceRect,
      panelSlots,
      overflowTabPanelIds: openPanels.length > 1 ? openPanels.slice(0, -1) : [],
      zeroOverlapPassed: check.passed,
      voiceCompactedForSheet: false,
      quadrantModeActive: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. IPAD LANDSCAPE (1180x820 reference)
  // ---------------------------------------------------------------------------
  if (breakpoint === 'ipad_landscape') {
    const padX = 20;
    const slotW = 288;
    const slotTop = 76;
    const headerRect: GuiRect = { x: padX, y: 16, w: width - padX * 2, h: 48 };
    const voiceW = 460;
    const voiceH = params.voiceExpanded ? 240 : 72;
    const voiceRect: GuiRect = {
      x: Math.round((width - voiceW) / 2),
      y: height - 24 - voiceH - kbInset,
      w: voiceW,
      h: voiceH,
    };
    const slotH = Math.max(240, Math.min(612, voiceRect.y - 16 - slotTop));

    const panelSlots: PanelSlotAssignment[] = [];
    if (openPanels.length >= 1) {
      const leftTabs = openPanels.filter((_, i) => i % 2 === 0);
      panelSlots.push({
        slotId: 'left',
        rect: { x: padX, y: slotTop, w: slotW, h: slotH },
        activePanelId: leftTabs[leftTabs.length - 1] || openPanels[0],
        tabPanelIds: leftTabs,
      });
    }
    if (openPanels.length >= 2) {
      const rightTabs = openPanels.filter((_, i) => i % 2 === 1);
      panelSlots.push({
        slotId: 'right',
        rect: { x: width - padX - slotW, y: slotTop, w: slotW, h: slotH },
        activePanelId: rightTabs[rightTabs.length - 1] || openPanels[1],
        tabPanelIds: rightTabs,
      });
    }

    const leftEdge = openPanels.length >= 1 ? padX + slotW + 16 : padX;
    const rightEdge = openPanels.length >= 2 ? width - padX - slotW - 16 : width - padX;
    const centerSafeRect: GuiRect = {
      x: leftEdge,
      y: slotTop,
      w: Math.max(300, rightEdge - leftEdge),
      h: Math.max(240, voiceRect.y - 16 - slotTop),
    };

    const check = verifyZeroOverlap(
      [headerRect, ...panelSlots.map((s) => s.rect), voiceRect],
      GUI_TOUCH_TOKENS.panelCollisionMarginPx
    );

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: 80, y: 76, w: width - 160, h: height - 180 },
      voiceRect,
      panelSlots,
      overflowTabPanelIds: openPanels.length > 2 ? openPanels.slice(2) : [],
      zeroOverlapPassed: check.passed,
      voiceCompactedForSheet: false,
      quadrantModeActive: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. DESKTOP (1440x900) & WIDE (1920x1080)
  // ---------------------------------------------------------------------------
  const isWide = breakpoint === 'wide';
  const padX = isWide ? 32 : 24;
  const headerY = 16;
  const headerH = 48;
  const headerRect: GuiRect = {
    x: padX,
    y: headerY,
    w: width - padX * 2,
    h: headerH,
  };

  const slotW = isWide ? 400 : 352;
  const quadrantSlotW = isWide ? 360 : 304;
  const slotTop = isWide ? 88 : 80;
  const voiceW = isWide ? 480 : 460;
  const voiceH = params.voiceExpanded ? Math.min(340, Math.round(height * 0.36)) : 76;
  const defaultVoiceX = Math.round((width - voiceW) / 2);
  const defaultVoiceY = height - (isWide ? 24 : 20) - voiceH - kbInset;

  const dragX = Math.round(params.voiceDragDelta?.x ?? 0);
  const dragY = Math.round(params.voiceDragDelta?.y ?? 0);

  const minVoiceX = padX + (openPanels.length >= 1 ? slotW + GUI_TOUCH_TOKENS.panelCollisionMarginPx : 0);
  const maxVoiceX =
    width -
    padX -
    voiceW -
    (openPanels.length >= 2 ? slotW + GUI_TOUCH_TOKENS.panelCollisionMarginPx : 0);

  const clampedVoiceX =
    maxVoiceX >= minVoiceX
      ? Math.max(minVoiceX, Math.min(maxVoiceX, defaultVoiceX + dragX))
      : defaultVoiceX;

  const rawVoiceRect: GuiRect = {
    x: clampedVoiceX,
    y: Math.max(slotTop + 180, Math.min(defaultVoiceY, defaultVoiceY + dragY)),
    w: voiceW,
    h: voiceH,
  };
  const voiceRect = clampRectToViewport(rawVoiceRect, width, height, padX);

  const slotMaxBottom = voiceRect.y - GUI_TOUCH_TOKENS.panelCollisionMarginPx;
  const slotH = Math.max(240, Math.min(isWide ? 760 : 620, slotMaxBottom - slotTop));

  const panelSlots: PanelSlotAssignment[] = [];
  const useQuadrants = allowFourQuadrantSlots && openPanels.length >= 3;

  if (useQuadrants) {
    const rowGap = 16;
    const rowH = Math.max(180, Math.floor((slotH - rowGap) / 2));
    const quadDefs: Array<{
      slotId: PanelSlotAssignment['slotId'];
      rect: GuiRect;
      panelId: string;
    }> = [
      {
        slotId: 'left',
        rect: { x: padX, y: slotTop, w: quadrantSlotW, h: rowH },
        panelId: openPanels[0],
      },
      {
        slotId: 'right',
        rect: { x: width - padX - quadrantSlotW, y: slotTop, w: quadrantSlotW, h: rowH },
        panelId: openPanels[1],
      },
      {
        slotId: 'bottomLeft',
        rect: { x: padX, y: slotTop + rowH + rowGap, w: quadrantSlotW, h: rowH },
        panelId: openPanels[2],
      },
    ];
    if (openPanels[3]) {
      quadDefs.push({
        slotId: 'bottomRight',
        rect: {
          x: width - padX - quadrantSlotW,
          y: slotTop + rowH + rowGap,
          w: quadrantSlotW,
          h: rowH,
        },
        panelId: openPanels[3],
      });
    }
    for (const q of quadDefs) {
      panelSlots.push({
        slotId: q.slotId,
        rect: q.rect,
        activePanelId: q.panelId,
        tabPanelIds: [q.panelId],
      });
    }
  } else {
    if (openPanels.length >= 1) {
      const leftTabs = openPanels.filter((_, idx) => idx % 2 === 0);
      panelSlots.push({
        slotId: 'left',
        rect: {
          x: padX,
          y: slotTop,
          w: slotW,
          h: slotH,
        },
        activePanelId: leftTabs[leftTabs.length - 1] || openPanels[0],
        tabPanelIds: leftTabs,
      });
    }

    if (openPanels.length >= 2) {
      const rightTabs = openPanels.filter((_, idx) => idx % 2 === 1);
      panelSlots.push({
        slotId: 'right',
        rect: {
          x: width - padX - slotW,
          y: slotTop,
          w: slotW,
          h: slotH,
        },
        activePanelId: rightTabs[rightTabs.length - 1] || openPanels[1],
        tabPanelIds: rightTabs,
      });
    }
  }

  const activeSlotW = useQuadrants ? quadrantSlotW : slotW;
  const leftOccupiedEdge =
    openPanels.length >= 1 ? padX + activeSlotW + GUI_TOUCH_TOKENS.panelCollisionMarginPx : padX;
  const rightOccupiedEdge =
    openPanels.length >= 2
      ? width - padX - activeSlotW - GUI_TOUCH_TOKENS.panelCollisionMarginPx
      : width - padX;

  const centerSafeRect: GuiRect = {
    x: leftOccupiedEdge,
    y: slotTop,
    w: Math.max(320, rightOccupiedEdge - leftOccupiedEdge),
    h: Math.max(240, voiceRect.y - GUI_TOUCH_TOKENS.panelCollisionMarginPx - slotTop),
  };

  const allInteractiveRects = [
    headerRect,
    ...panelSlots.map((s) => s.rect),
    voiceRect,
  ];
  const check = verifyZeroOverlap(allInteractiveRects, GUI_TOUCH_TOKENS.panelCollisionMarginPx);

  return {
    breakpoint,
    viewportW: width,
    viewportH: height,
    headerRect,
    centerSafeRect,
    sceneSafeRect: centerSafeRect,
    mediaFullViewRect: isWide
      ? { x: 180, y: 88, w: width - 360, h: height - 208 }
      : { x: 120, y: 80, w: width - 240, h: height - 196 },
    voiceRect,
    panelSlots,
    overflowTabPanelIds: openPanels.length > 2 ? openPanels.slice(2) : [],
    zeroOverlapPassed: check.passed,
    voiceCompactedForSheet: false,
    quadrantModeActive: useQuadrants,
  };
}
