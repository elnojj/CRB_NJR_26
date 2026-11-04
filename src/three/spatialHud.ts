import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { detectWebKitEngine } from '../lib/browserEngine';
import { buildHudIconGeometry } from './hudIcons';
import {
  HUD_COLORS,
  createHudGlassMaterials,
  createOutlineGeometry,
  createSlabGeometry,
  resolveHudGlassMode,
  type HudGlassMaterials,
} from './hudGlass';
import type {
  HudDockButtonId,
  HudDockSpec,
  HudMenuSpec,
  HudMenuTone,
} from './hudBridge';
import {
  DOCK_METRICS,
  MENU_METRICS,
  clampScroll,
  dockWidth,
  isRowVisible,
  layoutMenuContent,
  menuViewportHeight,
  type MenuContentLayout,
} from './hudLayout';

const ASSET_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
const FONT_SANS = `${ASSET_BASE}assets/fonts/Inter-Medium.ttf`;
const FONT_MONO = `${ASSET_BASE}assets/fonts/JetBrainsMono-Regular.ttf`;

/** Depth in camera space where 1 HUD pixel is converted to world units. Everything is drawn on top of the scene. */
const HUD_DEPTH = 3;
const ORDER = { glass: 5000, tint: 5001, edge: 5002, plate: 5003, plateEdge: 5004, content: 5005 } as const;

export type HudHitZone = 'menu-item' | 'menu-close' | 'menu-panel' | 'dock-button' | 'dock-body';
export type HudHit = { zone: HudHitZone; id: string };

type TextOptions = {
  size: number;
  color: number;
  font: string;
  anchorX?: 'left' | 'center' | 'right';
  letterSpacing?: number;
};

type Plate = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  edge: THREE.LineLoop;
  edgeMat: THREE.LineBasicMaterial;
  hover: number;
  press: number;
  active: number;
  hoverTarget: number;
  pressTarget: number;
  activeTarget: number;
};

type MenuRow = {
  group: THREE.Group;
  y: number;
  h: number;
  plate: Plate | null;
  texts: Text[];
  hit: HudHit | null;
  visible: boolean;
};

type MenuState = {
  root: THREE.Group;
  key: string;
  width: number;
  panelH: number;
  glass: THREE.Mesh;
  tint: THREE.Mesh | null;
  edge: THREE.LineLoop;
  title: Text;
  closePlate: Plate;
  closeGlyph: Text;
  content: THREE.Group;
  rows: MenuRow[];
  layout: MenuContentLayout;
  thumb: THREE.Mesh;
  thumbMat: THREE.MeshBasicMaterial;
  scroll: number;
  scrollTarget: number;
  viewportH: number;
};

type DockButton = {
  id: HudDockButtonId;
  group: THREE.Group;
  plate: Plate;
  icon: THREE.Mesh;
  iconMat: THREE.MeshBasicMaterial;
  label: Text;
  baseX: number;
  hit: HudHit;
};

type DockState = {
  root: THREE.Group;
  key: string;
  width: number;
  glass: THREE.Mesh;
  tint: THREE.Mesh | null;
  edge: THREE.LineLoop;
  status: Text;
  buttons: DockButton[];
};

const TONE_COLOR: Record<HudMenuTone, number> = {
  default: HUD_COLORS.text,
  mint: HUD_COLORS.mint,
  blue: HUD_COLORS.blue,
  light: HUD_COLORS.light,
};

function toneColor(tone: HudMenuTone | undefined): number {
  switch (tone ?? 'default') {
    case 'mint':
      return TONE_COLOR.mint;
    case 'blue':
      return TONE_COLOR.blue;
    case 'light':
      return TONE_COLOR.light;
    case 'default':
      return TONE_COLOR.default;
    default: {
      const unreachable: never = tone as never;
      return unreachable;
    }
  }
}

const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, Math.max(1, max - 1))}…` : value;

/**
 * The Cerebro HUD drawn inside the WebGL scene: the right-hand tools menu and the bottom Call/Hands/Chat/Nodes dock.
 * It is parented to the camera so it stays locked to the viewport while still being real 3D geometry (curved glass,
 * perspective tilt, depth parallax). Text is signed-distance-field text from troika-three-text, the engine behind
 * drei's `<Text>`, so glyphs stay vector-crisp at any scale on Safari and iPadOS.
 */
export class SpatialHudLayer {
  readonly group = new THREE.Group();

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly glassMode;
  private readonly menuMats: HudGlassMaterials;
  private readonly dockMats: HudGlassMaterials;
  private readonly textMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  private readonly iconGeometries = new Map<HudDockButtonId, THREE.BufferGeometry>();
  private readonly allTexts = new Set<Text>();
  private readonly safeProbe: HTMLElement;

  private menuSpec: HudMenuSpec | null = null;
  private menu: MenuState | null = null;
  private menuOpen = 0;
  private dockSpec: HudDockSpec | null = null;
  private dock: DockState | null = null;
  private dockOpen = 0;

  private viewW = 1;
  private viewH = 1;
  private time = 0;
  private hovered: HudHit | null = null;
  private pressed: {
    pointerId: number;
    hit: HudHit;
    startY: number;
    lastY: number;
    scrolled: boolean;
  } | null = null;
  private disposed = false;

  onActivate?: (zone: HudHitZone) => void;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly domElement: HTMLElement,
    options: { softwareGl: boolean }
  ) {
    this.glassMode = resolveHudGlassMode(options.softwareGl, detectWebKitEngine());
    this.menuMats = createHudGlassMaterials(this.glassMode);
    this.dockMats = createHudGlassMaterials(this.glassMode);
    this.group.name = 'cerebro-spatial-hud';
    this.group.renderOrder = ORDER.glass;
    this.group.frustumCulled = false;
    this.safeProbe = document.createElement('div');
    this.safeProbe.style.cssText =
      'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(this.safeProbe);
  }

  get mode() {
    return this.glassMode;
  }

  setMenu(spec: HudMenuSpec | null): void {
    this.menuSpec = spec;
    if (spec && !this.menu) this.menuOpen = Math.max(this.menuOpen, 0.001);
  }

  setDock(spec: HudDockSpec | null): void {
    this.dockSpec = spec;
  }

  /** True while any HUD surface is on screen and can intercept pointers. */
  private get hasInteractiveSurface(): boolean {
    return (this.menu !== null && this.menuOpen > 0.5) || (this.dock !== null && this.dockOpen > 0.5);
  }

  // ------------------------------------------------------------------ construction helpers

  private createText(text: string, opts: TextOptions): Text {
    const t = new Text();
    t.text = text;
    t.font = opts.font;
    t.fontSize = opts.size;
    t.color = opts.color;
    t.anchorX = opts.anchorX ?? 'left';
    t.anchorY = 'middle';
    t.whiteSpace = 'nowrap';
    if (opts.letterSpacing) t.letterSpacing = opts.letterSpacing;
    t.material = this.textMaterial;
    t.renderOrder = ORDER.content;
    t.frustumCulled = false;
    t.raycast = () => undefined;
    t.sync();
    this.allTexts.add(t);
    return t;
  }

  private setText(t: Text, value: string): void {
    if (t.text === value) return;
    t.text = value;
    t.sync();
  }

  private disposeText(t: Text): void {
    this.allTexts.delete(t);
    t.removeFromParent();
    t.dispose();
  }

  private createPlate(w: number, h: number, radius: number): Plate {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: HUD_COLORS.plate,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(createSlabGeometry(w, h, radius, 0, 4, 1), mat);
    mesh.renderOrder = ORDER.plate;
    mesh.frustumCulled = false;
    const edgeMat = new THREE.LineBasicMaterial({
      color: HUD_COLORS.cobalt,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
    });
    const edge = new THREE.LineLoop(createOutlineGeometry(w, h, radius, 0, 0.2), edgeMat);
    edge.renderOrder = ORDER.plateEdge;
    edge.frustumCulled = false;
    group.add(mesh, edge);
    return {
      group,
      mesh,
      mat,
      edge,
      edgeMat,
      hover: 0,
      press: 0,
      active: 0,
      hoverTarget: 0,
      pressTarget: 0,
      activeTarget: 0,
    };
  }

  private disposePlate(plate: Plate): void {
    plate.mesh.geometry.dispose();
    plate.mat.dispose();
    plate.edge.geometry.dispose();
    plate.edgeMat.dispose();
    plate.group.removeFromParent();
  }

  private createSlab(
    mats: HudGlassMaterials,
    w: number,
    h: number,
    radius: number,
    curve: number,
    stepsX: number
  ): { glass: THREE.Mesh; tint: THREE.Mesh | null; edge: THREE.LineLoop } {
    const glass = new THREE.Mesh(createSlabGeometry(w, h, radius, curve, stepsX, 2), mats.glass);
    glass.renderOrder = ORDER.glass;
    glass.frustumCulled = false;
    let tint: THREE.Mesh | null = null;
    if (mats.tint) {
      tint = new THREE.Mesh(createSlabGeometry(w, h, radius, curve, stepsX, 2), mats.tint);
      tint.renderOrder = ORDER.tint;
      tint.frustumCulled = false;
      tint.position.z = 0.15;
    }
    const edge = new THREE.LineLoop(createOutlineGeometry(w, h, radius, curve), mats.edge);
    edge.renderOrder = ORDER.edge;
    edge.frustumCulled = false;
    return { glass, tint, edge };
  }

  // ------------------------------------------------------------------ menu

  private menuKey(spec: HudMenuSpec, width: number): string {
    return `${width}|${spec.title}|${spec.sections
      .map((s) => `${s.id}:${s.title ?? ''}:${s.items.map((i) => `${i.id}=${i.label}=${i.meta ?? ''}=${i.tone ?? ''}`).join(',')}`)
      .join(';')}`;
  }

  private buildMenu(spec: HudMenuSpec, width: number): void {
    this.destroyMenu();
    const layout = layoutMenuContent(spec.sections);
    const viewportH = menuViewportHeight(this.viewH, layout.contentHeight);
    const panelH = MENU_METRICS.titleH + viewportH + MENU_METRICS.pad * 1.5;
    const root = new THREE.Group();
    root.name = 'hud-menu';
    const slab = this.createSlab(this.menuMats, width, panelH, 22, 0, 24);
    slab.glass.userData.hit = { zone: 'menu-panel', id: 'panel' } satisfies HudHit;
    root.add(slab.glass);
    if (slab.tint) root.add(slab.tint);
    root.add(slab.edge);

    const title = this.createText(spec.title.toUpperCase(), {
      size: 11,
      color: HUD_COLORS.muted,
      font: FONT_MONO,
      letterSpacing: 0.12,
    });
    title.position.set(-width / 2 + MENU_METRICS.pad + 6, panelH / 2 - MENU_METRICS.titleH / 2, 1);
    root.add(title);

    const closePlate = this.createPlate(34, 34, 12);
    closePlate.group.position.set(width / 2 - MENU_METRICS.pad - 17, panelH / 2 - MENU_METRICS.titleH / 2, 0.6);
    closePlate.mesh.userData.hit = { zone: 'menu-close', id: 'close' } satisfies HudHit;
    root.add(closePlate.group);
    const closeGlyph = this.createText('×', { size: 20, color: HUD_COLORS.text, font: FONT_SANS, anchorX: 'center' });
    closeGlyph.position.z = 1;
    closePlate.group.add(closeGlyph);

    const content = new THREE.Group();
    content.position.set(-width / 2 + MENU_METRICS.pad, panelH / 2 - MENU_METRICS.titleH, 0.6);
    root.add(content);

    const rowW = width - MENU_METRICS.pad * 2;
    const rows: MenuRow[] = [];
    for (const row of layout.rows) {
      const group = new THREE.Group();
      content.add(group);
      if (row.kind === 'section') {
        const label = this.createText(row.title.toUpperCase(), {
          size: 10,
          color: HUD_COLORS.cobaltBright,
          font: FONT_MONO,
          letterSpacing: 0.14,
        });
        label.position.set(6, 0, 1);
        group.add(label);
        rows.push({ group, y: row.y, h: row.h, plate: null, texts: [label], hit: null, visible: true });
        continue;
      }
      const section = spec.sections.find((s) => s.id === row.sectionId);
      const item = section?.items.find((i) => i.id === row.itemId);
      if (!item) continue;
      const plate = this.createPlate(rowW, row.h, 12);
      plate.group.position.set(rowW / 2, 0, 0);
      const hit: HudHit = { zone: 'menu-item', id: `${row.sectionId}/${row.itemId}` };
      plate.mesh.userData.hit = hit;
      group.add(plate.group);
      const texts: Text[] = [];
      const label = this.createText(truncate(item.label, 34), {
        size: 13,
        color: toneColor(item.tone),
        font: FONT_SANS,
      });
      label.position.set(14, 0, 1);
      group.add(label);
      texts.push(label);
      if (item.meta) {
        const meta = this.createText(item.meta, {
          size: 10.5,
          color: HUD_COLORS.muted,
          font: FONT_MONO,
          anchorX: 'right',
        });
        meta.position.set(rowW - 14, 0, 1);
        group.add(meta);
        texts.push(meta);
      }
      rows.push({ group, y: row.y, h: row.h, plate, texts, hit, visible: true });
    }

    const thumbMat = new THREE.MeshBasicMaterial({
      color: HUD_COLORS.cobaltBright,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
    });
    const thumb = new THREE.Mesh(new THREE.PlaneGeometry(3, 1), thumbMat);
    thumb.renderOrder = ORDER.plate;
    thumb.frustumCulled = false;
    thumb.raycast = () => undefined;
    root.add(thumb);

    this.menu = {
      root,
      key: this.menuKey(spec, width),
      width,
      panelH,
      glass: slab.glass,
      tint: slab.tint,
      edge: slab.edge,
      title,
      closePlate,
      closeGlyph,
      content,
      rows,
      layout,
      thumb,
      thumbMat,
      scroll: 0,
      scrollTarget: 0,
      viewportH,
    };
    this.group.add(root);
  }

  private destroyMenu(): void {
    const menu = this.menu;
    if (!menu) return;
    for (const row of menu.rows) {
      for (const t of row.texts) this.disposeText(t);
      if (row.plate) this.disposePlate(row.plate);
    }
    this.disposeText(menu.title);
    this.disposeText(menu.closeGlyph);
    this.disposePlate(menu.closePlate);
    menu.glass.geometry.dispose();
    menu.tint?.geometry.dispose();
    menu.edge.geometry.dispose();
    menu.thumb.geometry.dispose();
    menu.thumbMat.dispose();
    menu.root.removeFromParent();
    this.menu = null;
  }

  private syncMenu(dt: number): void {
    const spec = this.menuSpec;
    const target = spec ? 1 : 0;
    this.menuOpen = damp(this.menuOpen, target, 16, dt);
    if (Math.abs(this.menuOpen - target) < 0.004) this.menuOpen = target;

    if (spec) {
      const width = Math.min(MENU_METRICS.width, Math.max(240, this.viewW - 28));
      const key = this.menuKey(spec, width);
      const expectedViewport = menuViewportHeight(this.viewH, layoutMenuContent(spec.sections).contentHeight);
      if (!this.menu || this.menu.key !== key || Math.abs(this.menu.viewportH - expectedViewport) > 0.5) {
        const keepScroll = this.menu?.scrollTarget ?? 0;
        this.buildMenu(spec, width);
        if (this.menu) {
          this.menu.scrollTarget = clampScroll(keepScroll, this.menu.layout.contentHeight, this.menu.viewportH);
          this.menu.scroll = this.menu.scrollTarget;
        }
      }
    }
    const menu = this.menu;
    if (!menu) return;
    if (!spec && this.menuOpen <= 0) {
      this.destroyMenu();
      return;
    }

    const open = this.menuOpen;
    menu.root.visible = open > 0.002;
    const ease = 1 - Math.pow(1 - open, 3);
    menu.root.position.set(
      this.viewW / 2 - MENU_METRICS.rightMargin - menu.width / 2 + (1 - ease) * 36,
      this.viewH / 2 - MENU_METRICS.topReserve - menu.panelH / 2,
      0
    );
    menu.root.rotation.y = -0.07 + Math.sin(this.time * 0.6) * 0.01;
    menu.root.rotation.x = Math.cos(this.time * 0.5) * 0.008;
    menu.root.scale.setScalar(0.94 + 0.06 * ease);

    menu.scroll = damp(menu.scroll, menu.scrollTarget, 18, dt);
    if (Math.abs(menu.scroll - menu.scrollTarget) < 0.05) menu.scroll = menu.scrollTarget;

    for (const row of menu.rows) {
      const visible = isRowVisible(row, menu.scroll, menu.viewportH);
      row.visible = visible;
      row.group.visible = visible;
      if (!visible) continue;
      row.group.position.y = -(row.y - menu.scroll) - row.h / 2;
      if (row.plate && row.hit) {
        const hovered = this.hovered?.zone === 'menu-item' && this.hovered.id === row.hit.id;
        row.plate.hoverTarget = hovered ? 1 : 0;
        row.plate.pressTarget = hovered && this.pressed && !this.pressed.scrolled ? 1 : 0;
        this.tickPlate(row.plate, dt, open, 0.5, 0.88);
      }
      for (const t of row.texts) t.fillOpacity = open;
    }

    const closeHover = this.hovered?.zone === 'menu-close';
    menu.closePlate.hoverTarget = closeHover ? 1 : 0;
    menu.closePlate.pressTarget = closeHover && this.pressed ? 1 : 0;
    this.tickPlate(menu.closePlate, dt, open, 0.45, 0.9);
    menu.title.fillOpacity = open;
    menu.closeGlyph.fillOpacity = open;

    const overflow = menu.layout.contentHeight - menu.viewportH;
    menu.thumb.visible = overflow > 1 && open > 0.5;
    if (menu.thumb.visible) {
      const ratio = menu.viewportH / menu.layout.contentHeight;
      const thumbH = Math.max(28, menu.viewportH * ratio);
      const travel = menu.viewportH - thumbH;
      const t = overflow > 0 ? menu.scroll / overflow : 0;
      menu.thumb.scale.set(1, thumbH, 1);
      menu.thumb.position.set(
        menu.width / 2 - 5,
        menu.panelH / 2 - MENU_METRICS.titleH - thumbH / 2 - travel * t,
        0.8
      );
    }
    menu.thumbMat.opacity = 0.55 * open;
  }

  // ------------------------------------------------------------------ dock

  private dockKey(spec: HudDockSpec, width: number): string {
    return `${width}|${spec.buttons.map((b) => b.id).join(',')}`;
  }

  private buildDock(spec: HudDockSpec, width: number): void {
    this.destroyDock();
    const height = DOCK_METRICS.height;
    const root = new THREE.Group();
    root.name = 'hud-dock';
    const slab = this.createSlab(this.dockMats, width, height, DOCK_METRICS.cornerRadius, DOCK_METRICS.curveRadius, 56);
    slab.glass.userData.hit = { zone: 'dock-body', id: 'body' } satisfies HudHit;
    root.add(slab.glass);
    if (slab.tint) root.add(slab.tint);
    root.add(slab.edge);

    const status = this.createText('', {
      size: 10.5,
      color: HUD_COLORS.muted,
      font: FONT_MONO,
      anchorX: 'center',
      letterSpacing: 0.04,
    });
    root.add(status);

    const count = spec.buttons.length;
    const bw = (width - DOCK_METRICS.pad * 2 - DOCK_METRICS.gap * (count - 1)) / count;
    const buttons: DockButton[] = [];
    spec.buttons.forEach((button, index) => {
      const group = new THREE.Group();
      const plate = this.createPlate(bw, DOCK_METRICS.buttonH, 15);
      const hit: HudHit = { zone: 'dock-button', id: button.id };
      plate.mesh.userData.hit = hit;
      group.add(plate.group);

      let geometry = this.iconGeometries.get(button.id);
      if (!geometry) {
        geometry = buildHudIconGeometry(button.id);
        this.iconGeometries.set(button.id, geometry);
      }
      const iconMat = new THREE.MeshBasicMaterial({
        color: HUD_COLORS.text,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const icon = new THREE.Mesh(geometry, iconMat);
      icon.scale.setScalar(19 / 24);
      icon.position.set(0, 9, 1);
      icon.renderOrder = ORDER.content;
      icon.frustumCulled = false;
      icon.raycast = () => undefined;
      group.add(icon);

      const label = this.createText(button.label, {
        size: 11,
        color: HUD_COLORS.text,
        font: FONT_MONO,
        anchorX: 'center',
        letterSpacing: 0.03,
      });
      label.position.set(0, -14, 1);
      group.add(label);

      const baseX = -width / 2 + DOCK_METRICS.pad + bw / 2 + index * (bw + DOCK_METRICS.gap);
      buttons.push({ id: button.id, group, plate, icon, iconMat, label, baseX, hit });
      root.add(group);
    });

    this.dock = { root, key: this.dockKey(spec, width), width, glass: slab.glass, tint: slab.tint, edge: slab.edge, status, buttons };
    this.group.add(root);
  }

  private destroyDock(): void {
    const dock = this.dock;
    if (!dock) return;
    for (const b of dock.buttons) {
      this.disposeText(b.label);
      this.disposePlate(b.plate);
      b.iconMat.dispose();
    }
    this.disposeText(dock.status);
    dock.glass.geometry.dispose();
    dock.tint?.geometry.dispose();
    dock.edge.geometry.dispose();
    dock.root.removeFromParent();
    this.dock = null;
  }

  private dockBottomMargin(): number {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const safe = this.safeProbe.offsetHeight;
    return DOCK_METRICS.bottomMargin + (coarse ? 12 : 0) + safe;
  }

  private syncDock(dt: number): void {
    const spec = this.dockSpec;
    const target = spec ? 1 : 0;
    this.dockOpen = damp(this.dockOpen, target, 10, dt);
    if (Math.abs(this.dockOpen - target) < 0.004) this.dockOpen = target;
    if (spec) {
      const width = dockWidth(this.viewW);
      const key = this.dockKey(spec, width);
      if (!this.dock || this.dock.key !== key) this.buildDock(spec, width);
    }
    const dock = this.dock;
    if (!dock) return;
    if (!spec && this.dockOpen <= 0) {
      this.destroyDock();
      return;
    }
    const open = this.dockOpen;
    const ease = 1 - Math.pow(1 - open, 3);
    dock.root.visible = open > 0.002;
    const margin = this.dockBottomMargin();
    const bob = Math.sin(this.time * 0.9) * 1.1;
    dock.root.position.set(0, -this.viewH / 2 + margin + DOCK_METRICS.height / 2 - (1 - ease) * 40 + bob, 0);
    dock.root.rotation.x = -0.16;
    dock.root.scale.setScalar(0.96 + 0.04 * ease);

    if (spec) {
      const maxChars = Math.floor((dock.width - 48) / 6.6);
      this.setText(dock.status, truncate(spec.status, maxChars));
    }
    dock.status.position.set(0, DOCK_METRICS.height / 2 - 17, 1);
    dock.status.fillOpacity = open;

    const R = DOCK_METRICS.curveRadius;
    const rowY = -DOCK_METRICS.height / 2 + DOCK_METRICS.pad + DOCK_METRICS.buttonH / 2;
    for (const b of dock.buttons) {
      const bspec = spec?.buttons.find((s) => s.id === b.id);
      const a = b.baseX / R;
      b.group.position.set(R * Math.sin(a), rowY, R * (1 - Math.cos(a)) + 0.5);
      b.group.rotation.y = -a;
      const hovered = this.hovered?.zone === 'dock-button' && this.hovered.id === b.id;
      const pressed = hovered && this.pressed !== null;
      b.plate.hoverTarget = hovered ? 1 : 0;
      b.plate.pressTarget = pressed ? 1 : 0;
      b.plate.activeTarget = bspec?.active ? 1 : 0;
      this.tickPlate(b.plate, dt, open, 0.5, 0.9);
      if (bspec) this.setText(b.label, bspec.label);
      const tone = new THREE.Color(HUD_COLORS.text).lerp(new THREE.Color(HUD_COLORS.cobaltBright), b.plate.active);
      b.iconMat.color.copy(tone);
      b.iconMat.opacity = open;
      b.label.color = tone.getHex();
      b.label.fillOpacity = open;
    }
  }

  // ------------------------------------------------------------------ shared per-frame work

  private tickPlate(plate: Plate, dt: number, alpha: number, baseOpacity: number, hoverOpacity: number): void {
    plate.hover = damp(plate.hover, plate.hoverTarget, 20, dt);
    plate.press = damp(plate.press, plate.pressTarget, 30, dt);
    plate.active = damp(plate.active, plate.activeTarget, 14, dt);
    const color = plate.mat.color;
    color.setHex(HUD_COLORS.plate).lerp(new THREE.Color(HUD_COLORS.plateHover), plate.hover);
    color.lerp(new THREE.Color(HUD_COLORS.cobalt), plate.active * 0.55);
    const strength = Math.max(plate.hover, plate.active);
    plate.mat.opacity = (baseOpacity + (hoverOpacity - baseOpacity) * strength) * alpha;
    plate.edgeMat.color.setHex(HUD_COLORS.cobalt).lerp(new THREE.Color(HUD_COLORS.cobaltBright), strength);
    plate.edgeMat.opacity = (0.18 + 0.72 * strength) * alpha;
    plate.group.scale.setScalar(1 - 0.045 * plate.press);
  }

  private applyOpacity(mats: HudGlassMaterials, alpha: number): void {
    mats.glass.opacity = mats.glassBaseOpacity * alpha;
    if (mats.tint) mats.tint.opacity = mats.tintBaseOpacity * alpha;
    mats.edge.opacity = mats.edgeBaseOpacity * alpha;
  }

  /** Runs once per rendered frame, before the scene renders. */
  update(dt: number, viewW: number, viewH: number): void {
    if (this.disposed) return;
    const step = Math.min(0.1, Math.max(0.001, dt));
    this.time += step;
    this.viewW = viewW;
    this.viewH = viewH;
    const unitsPerPx = (2 * HUD_DEPTH * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)) / viewH;
    this.group.position.set(0, 0, -HUD_DEPTH);
    this.group.scale.setScalar(unitsPerPx);

    this.syncMenu(step);
    this.syncDock(step);

    this.applyOpacity(this.menuMats, this.menuOpen);
    this.applyOpacity(this.dockMats, this.dockOpen);

    const clear =
      this.dock && this.dockSpec ? this.dockBottomMargin() + DOCK_METRICS.height + 10 : 0;
    document.documentElement.style.setProperty('--cerebro-hud-dock-clear', `${Math.round(clear)}px`);
  }

  // ------------------------------------------------------------------ interaction

  private collectHitMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    if (this.menu && this.menuOpen > 0.5) {
      meshes.push(this.menu.glass, this.menu.closePlate.mesh);
      for (const row of this.menu.rows) if (row.visible && row.plate) meshes.push(row.plate.mesh);
    }
    if (this.dock && this.dockOpen > 0.5) {
      meshes.push(this.dock.glass);
      for (const b of this.dock.buttons) meshes.push(b.plate.mesh);
    }
    return meshes;
  }

  hitTest(clientX: number, clientY: number): HudHit | null {
    if (!this.hasInteractiveSurface) return null;
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.group.updateWorldMatrix(true, true);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.collectHitMeshes(), false);
    const best =
      hits.find((h) => h.object.userData.hit && h.object.userData.hit.zone !== 'menu-panel' && h.object.userData.hit.zone !== 'dock-body') ??
      hits[0];
    return (best?.object.userData.hit as HudHit | undefined) ?? null;
  }

  handlePointerDown(e: PointerEvent): boolean {
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit) return false;
    this.pressed = { pointerId: e.pointerId, hit, startY: e.clientY, lastY: e.clientY, scrolled: false };
    this.hovered = hit;
    return true;
  }

  handlePointerMove(e: PointerEvent): HudHit | null {
    const pressed = this.pressed;
    if (pressed && pressed.pointerId === e.pointerId) {
      if (this.menu && (pressed.hit.zone === 'menu-item' || pressed.hit.zone === 'menu-panel')) {
        if (!pressed.scrolled && Math.abs(e.clientY - pressed.startY) > 7) pressed.scrolled = true;
        if (pressed.scrolled) {
          const dy = e.clientY - pressed.lastY;
          this.menu.scrollTarget = clampScroll(this.menu.scrollTarget - dy, this.menu.layout.contentHeight, this.menu.viewportH);
          this.menu.scroll = this.menu.scrollTarget;
        }
      }
      pressed.lastY = e.clientY;
      return this.hovered;
    }
    this.hovered = e.target === this.domElement ? this.hitTest(e.clientX, e.clientY) : null;
    return this.hovered;
  }

  handlePointerUp(e: PointerEvent): boolean {
    const pressed = this.pressed;
    if (!pressed || pressed.pointerId !== e.pointerId) return false;
    this.pressed = null;
    if (pressed.scrolled) return true;
    const hit = this.hitTest(e.clientX, e.clientY);
    if (hit && hit.zone === pressed.hit.zone && hit.id === pressed.hit.id) this.activate(hit);
    this.hovered = e.pointerType === 'mouse' ? hit : null;
    return true;
  }

  handlePointerCancel(e: PointerEvent): void {
    if (this.pressed?.pointerId === e.pointerId) this.pressed = null;
  }

  handleWheel(e: WheelEvent): boolean {
    if (!this.menu || this.menuOpen < 0.5) return false;
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit || (hit.zone !== 'menu-item' && hit.zone !== 'menu-panel' && hit.zone !== 'menu-close')) return false;
    this.menu.scrollTarget = clampScroll(
      this.menu.scrollTarget + e.deltaY,
      this.menu.layout.contentHeight,
      this.menu.viewportH
    );
    return true;
  }

  clearHover(): void {
    this.hovered = null;
  }

  private activate(hit: HudHit): void {
    switch (hit.zone) {
      case 'menu-close':
        this.onActivate?.(hit.zone);
        this.menuSpec?.onClose();
        return;
      case 'menu-item': {
        const [sectionId, itemId] = hit.id.split('/');
        const item = this.menuSpec?.sections.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);
        if (item) {
          this.onActivate?.(hit.zone);
          item.onSelect();
        }
        return;
      }
      case 'dock-button': {
        const button = this.dockSpec?.buttons.find((b) => b.id === hit.id);
        if (button) {
          this.onActivate?.(hit.zone);
          button.onSelect();
        }
        return;
      }
      case 'menu-panel':
      case 'dock-body':
        return;
      default: {
        const unreachable: never = hit.zone;
        return unreachable;
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.destroyMenu();
    this.destroyDock();
    for (const t of [...this.allTexts]) this.disposeText(t);
    for (const g of this.iconGeometries.values()) g.dispose();
    this.iconGeometries.clear();
    for (const mats of [this.menuMats, this.dockMats]) {
      mats.glass.dispose();
      mats.tint?.dispose();
      mats.edge.dispose();
    }
    this.textMaterial.dispose();
    this.safeProbe.remove();
    document.documentElement.style.removeProperty('--cerebro-hud-dock-clear');
    this.group.removeFromParent();
  }
}
