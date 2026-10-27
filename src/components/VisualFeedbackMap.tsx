import React, { useState } from 'react';

export type PlainLanguageConcernId =
  | 'crowded'
  | 'cheap'
  | 'moves_too_much'
  | 'more_depth'
  | 'template'
  | 'hidden_important'
  | 'dislike_cards'
  | 'not_cinematic';

export interface ConcernMindMapNode {
  id: PlainLanguageConcernId;
  labelEn: string;
  labelAr: string;
  diagnosis: string;
  optionA: {
    title: string;
    tokensApplied: string;
    previewDesc: string;
  };
  optionB: {
    title: string;
    tokensApplied: string;
    previewDesc: string;
  };
}

export interface FeedbackAnnotation {
  id: string;
  projectId: string;
  checkpointId: string;
  locale: 'en' | 'ar';
  targetElement: string;
  concernId: PlainLanguageConcernId;
  concernLabel: string;
  chosenAlternative: 'A' | 'B';
  note: string;
  createdAtIso: string;
}

export const PLAIN_LANGUAGE_CONCERNS: ConcernMindMapNode[] = [
  {
    id: 'crowded',
    labelEn: 'It feels crowded',
    labelAr: 'التصميم مزدحم جداً',
    diagnosis: 'HUD density exceeds comfortable scan rhythm; secondary metadata competes with primary action.',
    optionA: {
      title: 'Progressive Disclosure (Recommended)',
      tokensApplied: 'gap-4 · collapse secondary telemetry into TaskInspector drawer',
      previewDesc: 'Shows only Node Code, Title, and 4-Tier dots on the map; full 9 fields open on click.',
    },
    optionB: {
      title: 'Expanded Canvas Breathing Room',
      tokensApplied: 'max-w-[460px] dock · 24% more unobstructed 3D sphere viewport',
      previewDesc: 'Narrows side docks and increases outer container padding to 20px.',
    },
  },
  {
    id: 'cheap',
    labelEn: 'It looks cheap',
    labelAr: 'يبدو رخيصاً أو غير متقن',
    diagnosis: 'Excessive candy badges or low-contrast borders dilute the CRO-NXS Obsidian architectural aesthetic.',
    optionA: {
      title: 'Zero-Pill Unboxed Typography',
      tokensApplied: '--surface-hud: rgba(12,17,26,0.78) · typographic separators (·)',
      previewDesc: 'Replaces rounded badge chips with crisp tabular-nums monospace text.',
    },
    optionB: {
      title: 'Machined Specular Hairline',
      tokensApplied: '--surface-glass-border: rgba(148,163,184,0.14) · 16px backdrop blur',
      previewDesc: 'Uses 1px optical slate borders with subtle sky-blue focus highlights.',
    },
  },
  {
    id: 'moves_too_much',
    labelEn: 'It moves too much',
    labelAr: 'الحركة مبالغ فيها',
    diagnosis: 'Continuous ambient motion or auto-camera hijacks distract from task inspection.',
    optionA: {
      title: 'Strict no-auto-camera + Static SVG Edges',
      tokensApplied: 'initial={false} · zero fake flow animations · no-auto-camera lock',
      previewDesc: 'Freezes background camera during node inspection and disables decorative loops.',
    },
    optionB: {
      title: 'Static Rest Sphere Fallback',
      tokensApplied: 'MotionConfig reducedMotion="user" · /cerebro/sphere_fallback_rest.png',
      previewDesc: 'Locks 3D rotation and switches to static rest sphere with 2D SVG station pins.',
    },
  },
  {
    id: 'more_depth',
    labelEn: 'I want more depth',
    labelAr: 'أريد عمقاً بصرياً أكبر',
    diagnosis: 'Flat overlay planes lack spatial parallax relative to the Three.js neural core.',
    optionA: {
      title: '50mm Spherical Prime + Bokeh Depth',
      tokensApplied: 'lensId="50mm" · uFocalDistance DOF bokeh · elevated HUD shadow',
      previewDesc: 'Sharpens the active orbital station while softening background galaxy particles.',
    },
    optionB: {
      title: 'Interior Planetary Dome Mode',
      tokensApplied: 'lensId="5mm" · radius=4.2u · BackSide Fresnel refraction',
      previewDesc: 'Places camera inside the breathing liquid-glass sphere looking out through the constellation grid.',
    },
  },
  {
    id: 'template',
    labelEn: 'It feels like a template',
    labelAr: 'يشبه القوالب الجاهزة',
    diagnosis: 'Generic SaaS card layouts fail to reflect NOJARA Studios and Cerebro HQ identity.',
    optionA: {
      title: 'JaapokkiSubtract + Bilingual Masri/Arabic Lockup',
      tokensApplied: '--font-display: JaapokkiSubtract · bespoke orbital telemetry',
      previewDesc: 'Anchors layout around the custom wordmark, 20-seat v1.5 crew callsigns, and 4-tier honesty rubric.',
    },
    optionB: {
      title: 'Asymmetric Director Viewfinder HUD',
      tokensApplied: 'Cinema Optics Bar · 35mm film grain shader · telemetry Hairlines',
      previewDesc: 'Frames the workspace like a physical Technocrane & Arri Master Prime viewfinder.',
    },
  },
  {
    id: 'hidden_important',
    labelEn: 'The important thing is hidden',
    labelAr: 'الشيء المهم مخفي',
    diagnosis: 'Blocking executive decisions (ASK_OF_39) or failed verification gates are buried below the fold.',
    optionA: {
      title: 'Pin ASK_OF_39 & 4-Tier Gate to Top',
      tokensApplied: '--status-awaiting: #F59E0B · top-dock Decision Queue badge',
      previewDesc: 'Surfaces pending decisions for 39 directly in the top bar and bottom dock with 1-click signoff.',
    },
    optionB: {
      title: 'Blocker-First Filter Sort',
      tokensApplied: 'Sort TASK_REGISTER by waitingForDecisionId & held status',
      previewDesc: 'Automatically orders held or awaiting-review stations to the top of the Accessible List.',
    },
  },
  {
    id: 'dislike_cards',
    labelEn: "I don't like these cards",
    labelAr: 'لا تعجبني هذه البطاقات',
    diagnosis: 'Boxed multi-card grids clutter the viewport and obscure the 3D sphere.',
    optionA: {
      title: 'Compact Ledger Row Mode',
      tokensApplied: 'Single-line tabular rows · 36px height · zero card nesting',
      previewDesc: 'Converts multi-line cards into a high-density architectural specification table.',
    },
    optionB: {
      title: 'Floating Spatial Pin Callouts',
      tokensApplied: 'Minimalist 2D vector leader lines anchored to 3D station coordinates',
      previewDesc: 'Minimizes card chrome so nodes float directly over their 3D orbital coordinates.',
    },
  },
  {
    id: 'not_cinematic',
    labelEn: "It doesn't feel cinematic",
    labelAr: 'لا يبدو سينمائياً بما يكفي',
    diagnosis: 'Default rectilinear camera lacks optical character, lens compression, and crane choreography.',
    optionA: {
      title: 'Anamorphic 24mm + Figure-8 Infinity Loop',
      tokensApplied: 'lensId="24mm" · loopMode="lemniscate" · ±6.5° banking roll',
      previewDesc: 'Engages continuous Bernoulli figure-8 crane flight across HQ and CDE with film grain.',
    },
    optionB: {
      title: '100mm 1:1 Macro + Selective Bloom',
      tokensApplied: 'lensId="100mm-macro" · UnrealBloomPass (threshold 0.78)',
      previewDesc: 'Moves to 3.8u macro focus on the sculptural station crystal with shallow depth of field.',
    },
  },
];

interface VisualFeedbackMapProps {
  projectId: string;
  checkpointId: string;
  locale: 'en' | 'ar';
  initialTargetElement?: string;
  annotations: FeedbackAnnotation[];
  onSaveAnnotation: (annotation: FeedbackAnnotation) => void;
  onApplyRemedyPreview?: (concernId: PlainLanguageConcernId, option: 'A' | 'B') => void;
  onClose: () => void;
}

export const VisualFeedbackMap: React.FC<VisualFeedbackMapProps> = ({
  projectId,
  checkpointId,
  locale,
  initialTargetElement = 'HUD Blueprint & Task Inspector',
  annotations,
  onSaveAnnotation,
  onApplyRemedyPreview,
  onClose,
}) => {
  const [targetElement, setTargetElement] = useState<string>(initialTargetElement);
  const [selectedConcernId, setSelectedConcernId] =
    useState<PlainLanguageConcernId>('crowded');
  const [chosenAlt, setChosenAlt] = useState<'A' | 'B'>('A');
  const [customNote, setCustomNote] = useState<string>('');

  const activeConcern =
    PLAIN_LANGUAGE_CONCERNS.find((c) => c.id === selectedConcernId) ||
    PLAIN_LANGUAGE_CONCERNS[0];

  const handleSave = () => {
    const newAnnotation: FeedbackAnnotation = {
      id: `fb-${Date.now().toString(36)}`,
      projectId,
      checkpointId,
      locale,
      targetElement,
      concernId: activeConcern.id,
      concernLabel: locale === 'ar' ? activeConcern.labelAr : activeConcern.labelEn,
      chosenAlternative: chosenAlt,
      note:
        customNote.trim() ||
        `Selected Option ${chosenAlt}: ${
          chosenAlt === 'A' ? activeConcern.optionA.title : activeConcern.optionB.title
        }`,
      createdAtIso: new Date().toISOString(),
    };
    onSaveAnnotation(newAnnotation);
    onApplyRemedyPreview?.(activeConcern.id, chosenAlt);
    setCustomNote('');
  };

  return (
    <div
      data-testid="visual-feedback-map-modal"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="cerebro-hud-panel p-4 space-y-3.5 max-h-[76vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] pb-2.5">
        <div>
          <div className="font-mono text-[10px] text-[#38BDF8] uppercase">
            PLAIN-LANGUAGE VISUAL FEEDBACK INSPECTOR (UI-103 · RASMA GATE)
          </div>
          <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
            Critique Any HUD Element & Compare Visual Remedies
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded bg-[#121926] border border-[rgba(148,163,184,0.25)] font-mono text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
        >
          Close ✕
        </button>
      </div>

      {/* Target Element Selector */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
          Target Element:
        </span>
        {[
          'HUD Blueprint & Task Inspector',
          'Top BuildActivityHeader',
          '3D Neural Core Sphere',
          'Crew Roster 20-Seat Cards',
          'Cinema Optics Bar',
        ].map((el) => (
          <button
            key={el}
            type="button"
            onClick={() => setTargetElement(el)}
            className={`px-2.5 py-1 rounded font-mono text-[10px] border cursor-pointer ${
              targetElement === el
                ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#F8FAFC]'
                : 'bg-[#05070B] border-[rgba(148,163,184,0.18)] text-[#94A3B8]'
            }`}
          >
            {el}
          </button>
        ))}
      </div>

      {/* 8 Plain-Language Concern Mind Map Nodes */}
      <div>
        <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1.5">
          Select Plain-Language Concern (Mind Map):
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLAIN_LANGUAGE_CONCERNS.map((c) => {
            const active = c.id === selectedConcernId;
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`concern-btn-${c.id}`}
                onClick={() => setSelectedConcernId(c.id)}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#121926] border-[#38BDF8] text-[#F8FAFC]'
                    : 'bg-[#05070B]/80 border-[rgba(148,163,184,0.16)] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <div className="font-display text-xs font-semibold">
                  {locale === 'ar' ? c.labelAr : c.labelEn}
                </div>
                <div className="font-mono text-[9px] text-[#64748B] mt-0.5">
                  {locale === 'ar' ? c.labelEn : c.labelAr}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Visual Alternatives Comparison */}
      <div className="p-3 rounded-xl bg-[#05070B]/80 border border-[rgba(148,163,184,0.16)] space-y-2.5">
        <div className="font-mono text-[10px] text-[#F59E0B]">
          Diagnosis: {activeConcern.diagnosis}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {(['A', 'B'] as const).map((optKey) => {
            const opt = optKey === 'A' ? activeConcern.optionA : activeConcern.optionB;
            const isSelected = chosenAlt === optKey;
            return (
              <button
                key={optKey}
                type="button"
                onClick={() => {
                  setChosenAlt(optKey);
                  onApplyRemedyPreview?.(activeConcern.id, optKey);
                }}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#121926] border-[#10B981]'
                    : 'bg-[#0C111A] border-[rgba(148,163,184,0.16)] hover:border-[#38BDF8]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-xs font-semibold text-[#F8FAFC]">
                    Alternative {optKey}: {opt.title}
                  </span>
                  <span className="font-mono text-[10px] text-[#10B981]">
                    {isSelected ? 'Selected' : 'Preview'}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#38BDF8] mb-1">
                  {opt.tokensApplied}
                </div>
                <p className="text-xs text-[#94A3B8]">{opt.previewDesc}</p>
              </button>
            );
          })}
        </div>

        {/* Save Permanent FeedbackAnnotation */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Optional note for Rasma & Banna (bound to checkpoint & locale)..."
            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-[#0C111A] border border-[rgba(148,163,184,0.24)] text-xs text-[#F8FAFC]"
          />
          <button
            type="button"
            data-testid="save-feedback-annotation-btn"
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-[#10B981] text-[#05070B] font-mono text-xs font-semibold cursor-pointer"
          >
            Save FeedbackAnnotation ({checkpointId})
          </button>
        </div>
      </div>

      {/* Saved Annotations Log */}
      {annotations.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] text-[#94A3B8] uppercase">
            Saved Feedback Annotations ({annotations.length}):
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#05070B] border border-[rgba(148,163,184,0.14)] font-mono text-[10px]"
              >
                <span className="text-[#F8FAFC]">
                  [{ann.checkpointId} · {ann.locale.toUpperCase()}] {ann.targetElement} →{' '}
                  <strong className="text-[#38BDF8]">{ann.concernLabel}</strong> (Alt{' '}
                  {ann.chosenAlternative})
                </span>
                <span className="text-[#94A3B8] truncate max-w-[260px]">
                  {ann.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
