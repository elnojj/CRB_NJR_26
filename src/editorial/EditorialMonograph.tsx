import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExperienceCanvas } from '../three/ExperienceCanvas';
import type {
  CameraAnglePresetId,
  CameraCommandPayload,
  CameraTelemetry,
  CinemaLensId,
} from '../components/DualSphereCanvas';
import { CINEMA_LENS_PRESETS } from '../components/CosmographCanvas';
import {
  EDITORIAL_COLOURS,
  EDITORIAL_SECTIONS,
  editorialFallbackDataUri,
  type EditorialCameraPresetId,
  type EditorialQualityTier,
  type EditorialSection,
} from '../design/editorialMonograph';
import { describePreset } from './editorialCamera';
import { PROJECTS_DATA } from '../data/sourceData';
import '../styles/editorial-monograph.css';

export interface EditorialMonographProps {
  reducedMotion?: boolean;
  onExitToOps?: () => void;
}

const CHAPTER_CAMERA: Record<
  EditorialCameraPresetId,
  { angle: CameraAnglePresetId; lens: CinemaLensId; sphere: 'hq' | 'cde' }
> = {
  '01_INIT': { angle: 'eye_horizon', lens: '35mm', sphere: 'hq' },
  '02_SURF': { angle: 'macro_close', lens: '85mm', sphere: 'hq' },
  '03_SPEC': { angle: 'ots_core', lens: '50mm', sphere: 'hq' },
  '04_DISP': { angle: 'gods_eye', lens: '24mm', sphere: 'hq' },
};

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
  return 'high';
}

/**
 * Opt-in reading shell that keeps the full dual-sphere Cosmograph + labels + optics.
 * Primary product surface remains App (ops HQ).
 */
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
  const [telemetry, setTelemetry] = useState<CameraTelemetry | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommandPayload | null>(
    null
  );
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const cmdSeq = useRef(1);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const flagged = useMemo(
    () =>
      PROJECTS_DATA.filter(
        (p) => p.health === 'At risk' || p.health === 'Blocked'
      ).slice(0, 6),
    []
  );

  const showWebgl = tier !== 'fallback' && !webglFailed;

  const dispatchCamera = useCallback(
    (payload: Omit<CameraCommandPayload, 'id'> & { id?: number }) => {
      cmdSeq.current += 1;
      setCameraCommand({ ...payload, id: payload.id ?? cmdSeq.current });
    },
    []
  );

  useEffect(() => {
    if (reducedMotion && tier === 'high') setTier('low');
  }, [reducedMotion, tier]);

  useEffect(() => {
    const map = CHAPTER_CAMERA[cameraPreset];
    dispatchCamera({
      verb: 'switch_sphere',
      targetSphere: map.sphere,
    });
    const t1 = window.setTimeout(() => {
      dispatchCamera({
        verb: 'set_lens',
        lensId: map.lens,
        focalLengthMm: CINEMA_LENS_PRESETS[map.lens].focalMm,
      });
    }, 80);
    const t2 = window.setTimeout(() => {
      dispatchCamera({
        verb: 'set_angle',
        anglePreset: map.angle,
      });
    }, 160);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cameraPreset, dispatchCamera]);

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

  const onSelectNode = useCallback(
    (id: string, _nodeType: string, sphere: 'hq' | 'cde') => {
      setFocusedNodeId(id);
      dispatchCamera({
        verb: 'focus_node',
        targetNodeId: id,
        targetSphere: sphere,
      });
    },
    [dispatchCamera]
  );

  return (
    <div
      className="editorial-root editorial-root--with-dashboard"
      data-editorial-schema="cerebro.editorial.monograph/h03"
      data-quality-tier={tier}
    >
      <a className="editorial-skip" href="#editorial-main">
        Skip to editorial content
      </a>

      <header className="editorial-chrome">
        <a className="editorial-mark" href="#hero">
          <strong>Cerebro</strong>
          <span>H03 · Spheres + dashboard</span>
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
          Full ops HQ
        </a>
      </header>

      <div className="editorial-scene editorial-scene--interactive">
        {showWebgl ? (
          <ExperienceCanvas
            activeSphere="hq"
            focusedNodeId={focusedNodeId}
            tourHighlightId={null}
            captionBubble={null}
            reducedMotion={reducedMotion || tier === 'low'}
            forceWebglFallback={false}
            cameraCommand={cameraCommand}
            editorialMode={false}
            editorialCameraPose={null}
            onSelectNode={onSelectNode}
            onUserTouchPauseTour={() => undefined}
            onTelemetryChange={setTelemetry}
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
        <div className="editorial-veil editorial-veil--light" />
      </div>

      {/* 3D optics / cinema specs dashboard */}
      <div className="editorial-optics" onPointerDown={(e) => e.stopPropagation()}>
        <div className="editorial-optics-row">
          <strong>OPTICS</strong>
          <span data-testid="editorial-camera-telemetry">
            {telemetry?.focalLengthMm ?? 35}mm · FOV {telemetry?.vFovDeg ?? 37.8}° ·{' '}
            {telemetry?.distance ?? '—'}u
          </span>
        </div>
        <div className="editorial-optics-row">
          {(
            [
              '14mm',
              '24mm',
              '35mm',
              '50mm',
              '85mm',
              '100mm-macro',
            ] as CinemaLensId[]
          ).map((lens) => {
            const active = (telemetry?.activeLens || '35mm') === lens;
            return (
              <button
                key={lens}
                type="button"
                className={active ? 'is-active' : undefined}
                onClick={() =>
                  dispatchCamera({
                    verb: 'set_lens',
                    lensId: lens,
                    focalLengthMm: CINEMA_LENS_PRESETS[lens].focalMm,
                  })
                }
              >
                {lens === '100mm-macro' ? '100mm' : lens}
              </button>
            );
          })}
        </div>
        <div className="editorial-optics-row">
          {(
            [
              { id: 'gods_eye', label: "God's Eye" },
              { id: 'high_crane', label: 'Crane' },
              { id: 'eye_horizon', label: 'Horizon' },
              { id: 'low_hero', label: 'Hero Low' },
              { id: 'macro_close', label: 'Macro' },
              { id: 'dutch_cant', label: 'Dutch' },
            ] as { id: CameraAnglePresetId; label: string }[]
          ).map((ang) => {
            const active = telemetry?.activeAnglePreset === ang.id;
            return (
              <button
                key={ang.id}
                type="button"
                className={active ? 'is-active' : undefined}
                onClick={() =>
                  dispatchCamera({ verb: 'set_angle', anglePreset: ang.id })
                }
              >
                {ang.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              dispatchCamera({ verb: 'switch_sphere', targetSphere: 'hq' })
            }
          >
            HQ Sphere
          </button>
          <button
            type="button"
            onClick={() =>
              dispatchCamera({ verb: 'switch_sphere', targetSphere: 'cde' })
            }
          >
            CDE Sphere
          </button>
          <button type="button" onClick={() => dispatchCamera({ verb: 'center' })}>
            Center
          </button>
        </div>
      </div>

      <main id="editorial-main" className="editorial-scroll editorial-scroll--narrow">
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
        {describePreset(cameraPreset)} · spheres live · tier {tier}
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
              <dt>Scene</dt>
              <dd>Dual spheres · labels · optics</dd>
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
          </div>
        )}

        {isOptics && (
          <dl className="editorial-meta">
            <div className="editorial-meta-row">
              <dt>Renderer</dt>
              <dd>Three.js Cosmograph · single context</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Spheres</dt>
              <dd>HQ [0,0,0] · CDE [38,4,-22]</dd>
            </div>
            <div className="editorial-meta-row">
              <dt>Tone</dt>
              <dd>ACES · selective bloom · grain</dd>
            </div>
          </dl>
        )}

        {isEpilogue && (
          <div className="editorial-tier-grid">
            <article>
              <h4>Tier 1 · High fidelity</h4>
              <p>Full PBR dual-sphere scene with labels and optics dashboard.</p>
            </article>
            <article>
              <h4>Ops HQ</h4>
              <p>Use Full ops HQ for panels, voice, tour, and blueprint deep-links.</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

export default EditorialMonograph;
