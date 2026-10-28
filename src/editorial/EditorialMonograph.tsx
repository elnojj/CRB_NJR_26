import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ExperienceCanvas } from '../three/ExperienceCanvas';
import type { CameraCommandPayload, CameraTelemetry } from '../components/DualSphereCanvas';
import {
  EDITORIAL_COLOURS,
  EDITORIAL_QUALITY,
  EDITORIAL_SECTIONS,
  editorialFallbackDataUri,
  type EditorialCameraPose,
  type EditorialCameraPresetId,
  type EditorialQualityTier,
  type EditorialSection,
} from '../design/editorialMonograph';
import {
  applyPointerParallax,
  createEditorialPoseState,
  describePreset,
  tweenEditorialPose,
} from './editorialCamera';
import { PROJECTS_DATA } from '../data/sourceData';
import '../styles/editorial-monograph.css';

export interface EditorialMonographProps {
  reducedMotion?: boolean;
  onExitToOps?: () => void;
}

function cairoSessionLabel(): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detectInitialTier(reducedMotion: boolean): EditorialQualityTier {
  if (typeof window === 'undefined') return 'high';
  if (reducedMotion) return 'low';
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return 'fallback';
  } catch {
    return 'fallback';
  }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem <= 4) return 'medium';
  return 'high';
}

export const EditorialMonograph: React.FC<EditorialMonographProps> = ({
  reducedMotion = false,
  onExitToOps,
}) => {
  const [activeId, setActiveId] = useState(EDITORIAL_SECTIONS[0].id);
  const [cameraPreset, setCameraPreset] =
    useState<EditorialCameraPresetId>('01_INIT');
  const [tier, setTier] = useState<EditorialQualityTier>(() =>
    detectInitialTier(reducedMotion)
  );
  const [webglFailed, setWebglFailed] = useState(false);
  const [poseTick, setPoseTick] = useState(0);
  const poseRef = useRef<EditorialCameraPose>(createEditorialPoseState('01_INIT'));
  const basePoseRef = useRef<EditorialCameraPose>(createEditorialPoseState('01_INIT'));
  const pointerRef = useRef({ x: 0, y: 0 });
  const parallaxToX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const parallaxToY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const fpsSamples = useRef<number[]>([]);
  const lastFrame = useRef(performance.now());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const flagged = useMemo(
    () =>
      PROJECTS_DATA.filter(
        (p) => p.health === 'At risk' || p.health === 'Blocked'
      ).slice(0, 6),
    []
  );

  const quality = EDITORIAL_QUALITY[tier === 'fallback' ? 'fallback' : tier];
  const showWebgl = tier !== 'fallback' && !webglFailed;
  const editorialPose = poseRef.current;

  const bumpPose = useCallback(() => setPoseTick((n) => (n + 1) % 1_000_000), []);

  useEffect(() => {
    if (reducedMotion && tier === 'high') setTier('low');
  }, [reducedMotion, tier]);

  useEffect(() => {
    const proxy = { x: 0, y: 0 };
    parallaxToX.current = gsap.quickTo(proxy, 'x', {
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: () => {
        pointerRef.current.x = proxy.x;
      },
    });
    parallaxToY.current = gsap.quickTo(proxy, 'y', {
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: () => {
        pointerRef.current.y = proxy.y;
      },
    });
    return () => {
      parallaxToX.current = null;
      parallaxToY.current = null;
    };
  }, []);

  useEffect(() => {
    const tween = tweenEditorialPose(poseRef.current, cameraPreset, {
      reducedMotion: reducedMotion || tier === 'low',
      duration: 1.7,
      onUpdate: () => {
        basePoseRef.current = { ...poseRef.current };
        bumpPose();
      },
    });
    return () => {
      tween.kill();
    };
  }, [cameraPreset, reducedMotion, tier, bumpPose]);

  useEffect(() => {
    if (!quality.parallax || reducedMotion) return;
    let raf = 0;
    const loop = () => {
      applyPointerParallax(
        poseRef.current,
        basePoseRef.current,
        pointerRef.current,
        0.42
      );
      bumpPose();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [quality.parallax, reducedMotion, bumpPose]);

  useEffect(() => {
    if (!showWebgl) return;
    let raf = 0;
    const sample = (now: number) => {
      const dt = now - lastFrame.current;
      lastFrame.current = now;
      if (dt > 0 && dt < 1000) {
        const fps = 1000 / dt;
        const arr = fpsSamples.current;
        arr.push(fps);
        if (arr.length > 90) arr.shift();
        if (arr.length === 90) {
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          if (avg < 30 && tier === 'high') {
            setTier('low');
          } else if (avg < 40 && tier === 'high') {
            setTier('medium');
          }
        }
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [showWebgl, tier]);

  useEffect(() => {
    const nodes = EDITORIAL_SECTIONS.map((s) => sectionRefs.current[s.id]).filter(
      Boolean
    ) as HTMLElement[];
    if (nodes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) return;
        const section = EDITORIAL_SECTIONS.find((s) => s.id === visible.target.id);
        if (!section) return;
        setActiveId(section.id);
        setCameraPreset(section.camera);
      },
      { root: null, threshold: [0.35, 0.55, 0.7] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!quality.parallax || reducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      const cx = Math.max(-0.65, Math.min(0.65, nx));
      const cy = Math.max(-0.45, Math.min(0.45, ny));
      parallaxToX.current?.(cx);
      parallaxToY.current?.(cy);
    },
    [quality.parallax, reducedMotion]
  );

  const noopTelemetry = useCallback((_t: CameraTelemetry) => {}, []);
  const noopNode = useCallback(() => {}, []);
  const noopTour = useCallback(() => {}, []);
  const nullCommand = null as CameraCommandPayload | null;

  void poseTick;

  return (
    <div
      className="editorial-root"
      data-editorial-schema="cerebro.editorial.monograph/h03"
      data-quality-tier={tier}
      onPointerMove={onPointerMove}
    >
      <a className="editorial-skip" href="#editorial-main">
        Skip to editorial content
      </a>

      <header className="editorial-chrome">
        <a className="editorial-mark" href="#hero">
          <strong>Cerebro</strong>
          <span>H03 · Monolithic Precision</span>
        </a>
        <nav className="editorial-nav" aria-label="Chapter navigation">
          {EDITORIAL_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={activeId === s.id ? 'true' : undefined}
            >
              {s.navLabel}
            </a>
          ))}
        </nav>
        <a
          className="editorial-cta"
          href="/?preview=1&blueprint=H03"
          onClick={(e) => {
            if (onExitToOps) {
              e.preventDefault();
              onExitToOps();
            }
          }}
        >
          Open ops HQ
        </a>
      </header>

      <div className="editorial-scene" aria-hidden={showWebgl ? undefined : true}>
        {showWebgl ? (
          <ExperienceCanvas
            activeSphere="hq"
            focusedNodeId={null}
            tourHighlightId={null}
            captionBubble={null}
            reducedMotion={reducedMotion || tier === 'low'}
            forceWebglFallback={false}
            cameraCommand={nullCommand}
            editorialMode
            editorialCameraPose={editorialPose}
            editorialQualityTier={tier === 'medium' ? 'medium' : tier === 'low' ? 'low' : 'high'}
            onSelectNode={noopNode}
            onUserTouchPauseTour={noopTour}
            onTelemetryChange={noopTelemetry}
            onWebglUnavailable={() => {
              setWebglFailed(true);
              setTier('fallback');
            }}
          />
        ) : (
          <div className="editorial-fallback">
            <img
              src={editorialFallbackDataUri(cameraPreset)}
              alt={`Static capture for ${describePreset(cameraPreset)}`}
            />
          </div>
        )}
        <div className="editorial-veil" />
      </div>

      <main id="editorial-main" className="editorial-scroll">
        {EDITORIAL_SECTIONS.map((section, index) => (
          <Chapter
            key={section.id}
            section={section}
            index={index}
            flagged={flagged}
            sessionLabel={cairoSessionLabel()}
            setRef={(el) => {
              sectionRefs.current[section.id] = el;
            }}
          />
        ))}
      </main>

      <div className="editorial-telemetry" aria-live="polite">
        {describePreset(cameraPreset)} · tier {tier} · {EDITORIAL_COLOURS.bone.replace('#', '')}
      </div>
    </div>
  );
};

function Chapter({
  section,
  index,
  flagged,
  sessionLabel,
  setRef,
}: {
  section: EditorialSection;
  index: number;
  flagged: typeof PROJECTS_DATA;
  sessionLabel: string;
  setRef: (el: HTMLElement | null) => void;
}) {
  const isHero = index === 0;
  const isRegister = section.id === 'register';
  const isOptics = section.id === 'optics';
  const isEpilogue = section.id === 'epilogue';

  return (
    <section
      id={section.id}
      ref={setRef}
      className={isHero ? 'editorial-hero' : 'editorial-chapter'}
      data-camera={section.camera}
    >
      <div className="editorial-copy">
        <div className="editorial-kicker">{section.chapter}</div>
        <h1 className="editorial-title">{section.title}</h1>
        <p className="editorial-summary">{section.summary}</p>

        {isHero && (
          <dl className="editorial-meta">
            <div className="editorial-meta-row">
              <dt>Timezone</dt>
              <dd>Africa/Cairo</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Session</dt>
              <dd>{sessionLabel}</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Blueprint</dt>
              <dd>H03 · Today</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Architecture</dt>
              <dd>Sticky WebGL + editorial DOM</dd>
            </div>
          </dl>
        )}

        {isRegister && (
          <div className="editorial-register">
            <h3>Needs attention · register health</h3>
            {flagged.length === 0 ? (
              <p style={{ color: EDITORIAL_COLOURS.boneMuted, margin: 0 }}>
                No At Risk / Blocked rows in local register.
              </p>
            ) : (
              <ul>
                {flagged.map((p) => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                    <span className="editorial-health" data-state={p.health}>
                      {p.health}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p
              style={{
                marginTop: '1rem',
                marginBottom: 0,
                fontSize: '0.85rem',
                color: EDITORIAL_COLOURS.boneMuted,
                borderTop: `1px solid ${EDITORIAL_COLOURS.rule}`,
                paddingTop: '0.85rem',
              }}
            >
              Source unavailable: live Google Calendar agenda is not connected in this
              session. No sample agenda is shown as live.
            </p>
          </div>
        )}

        {isOptics && (
          <dl className="editorial-meta">
            <div className="editorial-meta-row">
              <dt>Key</dt>
              <dd>#F5F3EE · 2.20</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Rim</dt>
              <dd>#CFD7DF · 3.50</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Fill</dt>
              <dd>#1A1C1E · 0.80</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Tone</dt>
              <dd>ACES · grain · vignette · CA</dd>
            </div>
          </dl>
        )}

        {isEpilogue && (
          <div className="editorial-tier-grid">
            <article>
              <h4>Tier 1 · High fidelity</h4>
              <p>Full PBR scene, multi-pass post, GSAP dollying, pointer parallax. DPR ≤ 2.</p>
            </article>
            <article>
              <h4>Tier 2 · Constrained</h4>
              <p>Post bypassed, linear cuts, parallax off, DPR 1. Stable ≈30 FPS.</p>
            </article>
            <article>
              <h4>Tier 3 · Semantic fallback</h4>
              <p>Canvas hidden; chapter-aligned static captures; full DOM retained.</p>
            </article>
          </div>
        )}
      </div>

      <aside className="editorial-aside" aria-hidden="true">
        <div className="editorial-coord">{section.camera}</div>
        <div className="editorial-coord">{describePreset(section.camera)}</div>
        <div className="editorial-coord">Reading layer independent of matrix projection</div>
      </aside>
    </section>
  );
}

export default EditorialMonograph;
