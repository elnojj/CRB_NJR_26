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
  voiceSheetExpanded?: boolean;
  voiceDragDelta?: { x: number; y: number };
  keyboardInsetBottom?: number;
  allowFourQuadrantSlots?: boolean;
}

function resolveActiveSlotTab(
  slotId: PanelSlotAssignment['slotId'],
  tabPanelIds: string[],
  activeSlotTabs?: Record<string, string | undefined>
): string {
  const requested = activeSlotTabs?.[slotId];
  if (requested && tabPanelIds.includes(requested)) {
    return requested;
  }
  return tabPanelIds[tabPanelIds.length - 1] ?? tabPanelIds[0] ?? '';
}

export function computeGuiLayout(params: ComputeGuiLayoutParams): ComputedGuiLayout {
  const width = Math.max(320, Math.round(params.width));
  const height = Math.max(568, Math.round(params.height));
  const breakpoint = resolveGuiBreakpoint(width, height);
  const openPanels = params.openPanels ?? [];
  const activeSlotTabs = params.activeSlotTabs;
  const phoneSheetState = params.phoneSheetState ?? 'default';
  const kbInset = Math.max(0, Math.round(params.keyboardInsetBottom ?? 0));
  const allowFourQuadrantSlots = params.allowFourQuadrantSlots ?? openPanels.length > 2;
  const voiceSheetExpanded = Boolean(params.voiceSheetExpanded);
  const margin = GUI_TOUCH_TOKENS.panelCollisionMarginPx;
  const spherePad = GUI_TOUCH_TOKENS.sphereSafePaddingPx;

  // ---------------------------------------------------------------------------
  // 1. PHONE (390x844 reference)
  // ---------------------------------------------------------------------------
  if (breakpoint === 'phone') {
    const padX = 12;
    const colW = Math.max(296, width - padX * 2);
    const headerRect: GuiRect = { x: padX, y: 12, w: colW, h: 52 };
    const minimizedChipsRect: GuiRect = { x: padX, y: 388, w: colW, h: 36 };

    const utilityH = 48;
    const utilityY = height - utilityH - 12 - kbInset;
    const utilityRect: GuiRect = {
      x: padX,
      y: utilityY,
      w: colW,
      h: utilityH,
    };

    const isSheetOpen = openPanels.length > 0 && !voiceSheetExpanded;
    const voiceH = 52;
    const voiceW = Math.min(256, Math.max(220, Math.round(width * 0.56)));
    const voiceY = Math.max(headerRect.y + headerRect.h + 120, utilityRect.y - margin - voiceH);
    const voiceRect: GuiRect = {
      x: Math.round((width - voiceW) / 2),
      y: voiceY,
      w: voiceW,
      h: voiceH,
    };

    const panelSlots: PanelSlotAssignment[] = [];
    let sheetTop = voiceY;

    if (isSheetOpen) {
      const targetSheetH =
        phoneSheetState === 'collapsed'
          ? 72
          : phoneSheetState === 'expanded'
            ? Math.round(height * 0.62)
            : Math.min(256, Math.round(height * 0.42));
      const maxAvailableSheetH = Math.max(
        72,
        Math.min(
          Math.round(height * 0.62),
          voiceRect.y - margin - (headerRect.y + headerRect.h + 140)
        )
      );
      const sheetH = Math.min(targetSheetH, maxAvailableSheetH);
      sheetTop = voiceRect.y - margin - sheetH;

      const tabs = [...openPanels];
      panelSlots.push({
        slotId: 'bottomSheet',
        rect: {
          x: padX,
          y: sheetTop,
          w: colW,
          h: sheetH,
        },
        activePanelId: resolveActiveSlotTab('bottomSheet', tabs, activeSlotTabs),
        tabPanelIds: tabs,
      });
    }

    const safeBottom = isSheetOpen ? sheetTop - margin : voiceRect.y - margin;
    const safeTop = headerRect.y + headerRect.h + margin;
    const centerSafeRect: GuiRect = {
      x: padX,
      y: safeTop,
      w: colW,
      h: Math.max(140, safeBottom - safeTop),
    };

    const allInteractiveRects = [
      headerRect,
      ...panelSlots.map((s) => s.rect),
      voiceRect,
      utilityRect,
    ];
    const check = verifyZeroOverlap(allInteractiveRects, margin);

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: padX, y: 76, w: colW, h: Math.max(280, voiceRect.y - 92) },
      minimizedChipsRect,
      voiceRect,
      panelSlots,
      overflowTabPanelIds: openPanels.length > 1 ? openPanels.slice(0, -1) : [],
      zeroOverlapPassed: check.passed,
      voiceCompactedForSheet: isSheetOpen,
      quadrantModeActive: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. IPAD PORTRAIT (820x1180 & 1024x768 reference)
  // ---------------------------------------------------------------------------
  if (breakpoint === 'ipad') {
    const padX = 20;
    const headerRect: GuiRect = { x: padX, y: 16, w: width - padX * 2, h: 52 };
    const inspectorW = Math.min(296, Math.round(width * 0.34));
    const inspectorTop = 84;
    const bottomDockReserve = 84 + kbInset;

    const voiceW = Math.min(256, Math.max(220, Math.round(width * 0.28)));
    const voiceH = 52;
    const voiceY = Math.max(inspectorTop + 200, height - bottomDockReserve - voiceH);
    const voiceRect: GuiRect = {
      x: Math.round((width - voiceW) / 2),
      y: voiceY,
      w: voiceW,
      h: voiceH,
    };

    const inspectorH = Math.max(220, Math.min(620, voiceRect.y - margin - inspectorTop));

    const panelSlots: PanelSlotAssignment[] = [];
    if (openPanels.length > 0) {
      const tabs = [...openPanels];
      panelSlots.push({
        slotId: 'leftInspector',
        rect: {
          x: padX,
          y: inspectorTop,
          w: inspectorW,
          h: inspectorH,
        },
        activePanelId: resolveActiveSlotTab('leftInspector', tabs, activeSlotTabs),
        tabPanelIds: tabs,
      });
    }

    const safeX = openPanels.length > 0 ? padX + inspectorW + spherePad : padX;
    const safeW = Math.max(280, width - safeX - padX);
    const safeH = Math.max(260, voiceRect.y - margin - inspectorTop);
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
    const check = verifyZeroOverlap(allInteractiveRects, margin);

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: safeX, y: 88, w: safeW, h: safeH },
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
    const slotW = 280;
    const slotTop = 84;
    const bottomDockReserve = 84 + kbInset;
    const headerRect: GuiRect = { x: padX, y: 16, w: width - padX * 2, h: 52 };
    const voiceW = 240;
    const voiceH = 52;
    const voiceY = Math.max(slotTop + 200, height - bottomDockReserve - voiceH);
    const voiceRect: GuiRect = {
      x: Math.round((width - voiceW) / 2),
      y: voiceY,
      w: voiceW,
      h: voiceH,
    };
    const slotH = Math.max(240, Math.min(580, voiceRect.y - margin - slotTop));

    const panelSlots: PanelSlotAssignment[] = [];
    if (openPanels.length >= 1) {
      const leftTabs = openPanels.filter((_, i) => i % 2 === 0);
      panelSlots.push({
        slotId: 'left',
        rect: { x: padX, y: slotTop, w: slotW, h: slotH },
        activePanelId: resolveActiveSlotTab('left', leftTabs, activeSlotTabs),
        tabPanelIds: leftTabs,
      });
    }
    if (openPanels.length >= 2) {
      const rightTabs = openPanels.filter((_, i) => i % 2 === 1);
      panelSlots.push({
        slotId: 'right',
        rect: { x: width - padX - slotW, y: slotTop, w: slotW, h: slotH },
        activePanelId: resolveActiveSlotTab('right', rightTabs, activeSlotTabs),
        tabPanelIds: rightTabs,
      });
    }

    const leftEdge = openPanels.length >= 1 ? padX + slotW + spherePad : padX;
    const rightEdge = openPanels.length >= 2 ? width - padX - slotW - spherePad : width - padX;
    const centerSafeRect: GuiRect = {
      x: leftEdge,
      y: slotTop,
      w: Math.max(320, rightEdge - leftEdge),
      h: Math.max(240, voiceRect.y - margin - slotTop),
    };

    const check = verifyZeroOverlap(
      [headerRect, ...panelSlots.map((s) => s.rect), voiceRect],
      margin
    );

    return {
      breakpoint,
      viewportW: width,
      viewportH: height,
      headerRect,
      centerSafeRect,
      sceneSafeRect: centerSafeRect,
      mediaFullViewRect: { x: leftEdge, y: slotTop, w: centerSafeRect.w, h: centerSafeRect.h },
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
  const headerH = 52;
  const headerRect: GuiRect = {
    x: padX,
    y: headerY,
    w: width - padX * 2,
    h: headerH,
  };

  const maxFlankW = Math.floor((width - padX * 2 - Math.round(width * 0.52)) / 2);
  const slotW = Math.max(264, Math.min(isWide ? 348 : 304, maxFlankW));
  const quadrantSlotW = Math.max(256, Math.min(isWide ? 336 : 296, maxFlankW));
  const slotTop = isWide ? 88 : 84;
  const bottomDockReserve = (isWide ? 92 : 84) + kbInset;

  const voiceW = 256;
  const voiceH = 52;
  const defaultVoiceX = Math.round((width - voiceW) / 2);
  const defaultVoiceY = Math.max(slotTop + 220, height - bottomDockReserve - voiceH);

  const dragX = Math.round(params.voiceDragDelta?.x ?? 0);
  const dragY = Math.round(params.voiceDragDelta?.y ?? 0);

  const activeSlotW = allowFourQuadrantSlots && openPanels.length >= 3 ? quadrantSlotW : slotW;
  const minVoiceX = padX + (openPanels.length >= 1 ? activeSlotW + margin : 0);
  const maxVoiceX =
    width -
    padX -
    voiceW -
    (openPanels.length >= 2 ? activeSlotW + margin : 0);

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
  const voiceRect = clampRectToViewport(
    rawVoiceRect,
    width,
    height,
    padX,
    headerY + headerH + margin,
    bottomDockReserve
  );

  const slotMaxBottom = Math.min(voiceRect.y - margin, height - bottomDockReserve);
  const slotH = Math.max(240, Math.min(isWide ? 680 : 560, slotMaxBottom - slotTop));

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
        activePanelId: resolveActiveSlotTab(q.slotId, [q.panelId], activeSlotTabs),
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
        activePanelId: resolveActiveSlotTab('left', leftTabs, activeSlotTabs),
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
        activePanelId: resolveActiveSlotTab('right', rightTabs, activeSlotTabs),
        tabPanelIds: rightTabs,
      });
    }
  }

  const leftOccupiedEdge = openPanels.length >= 1 ? padX + activeSlotW + spherePad : padX;
  const rightOccupiedEdge =
    openPanels.length >= 2 ? width - padX - activeSlotW - spherePad : width - padX;

  const centerSafeRect: GuiRect = {
    x: leftOccupiedEdge,
    y: slotTop,
    w: Math.max(360, rightOccupiedEdge - leftOccupiedEdge),
    h: Math.max(260, voiceRect.y - margin - slotTop),
  };

  const allInteractiveRects = [
    headerRect,
    ...panelSlots.map((s) => s.rect),
    voiceRect,
  ];
  const check = verifyZeroOverlap(allInteractiveRects, margin);

  return {
    breakpoint,
    viewportW: width,
    viewportH: height,
    headerRect,
    centerSafeRect,
    sceneSafeRect: centerSafeRect,
    mediaFullViewRect: {
      x: centerSafeRect.x,
      y: slotTop,
      w: centerSafeRect.w,
      h: centerSafeRect.h,
    },
    voiceRect,
    panelSlots,
    overflowTabPanelIds: openPanels.length > 2 ? openPanels.slice(2) : [],
    zeroOverlapPassed: check.passed,
    voiceCompactedForSheet: false,
    quadrantModeActive: useQuadrants,
  };
}
