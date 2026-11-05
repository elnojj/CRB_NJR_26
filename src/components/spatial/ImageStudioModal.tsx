import React, { useState, useRef } from 'react';

interface ImageStudioModalProps {
  open: boolean;
  onClose: () => void;
}

interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  timestamp: string;
}

const PRESETS = [
  {
    title: 'Tabuk Inverted Pyramid Pavilion',
    subtitle: 'Saudi Red Sea Coast · Amber Scattering',
    prompt:
      'Architectural rendering of the Tabuk Inverted Pyramid Pavilion at dusk, monolithic raw board-formed concrete cantilevered over tidal dunes, warm amber atmospheric scattering, deep titanium-indigo sky, subtle linear recessed LED reveal lines, cinematic photorealism.',
    ratio: '16:9',
  },
  {
    title: 'Cairo Tower Hologram Projection',
    subtitle: 'Nile Embankment · Anamorphic Lattice',
    prompt:
      'Night-time architectural photograph along the Nile River looking at the Cairo Tower, enveloped in a structural cobalt holographic wireframe lattice, laser volumetric projection, crisp water reflections, hyper-detailed architectural visual.',
    ratio: '16:9',
  },
  {
    title: 'El Batron Soundstage Production Rig',
    subtitle: 'Cairo Media City · Modular Acoustic Shell',
    prompt:
      'High-end studio production stage with modular hexagonal acoustic dampening panels in matte charcoal, precision robotic camera gantry with cold blue status indicators, anamorphic rim lighting, clean industrial design.',
    ratio: '16:9',
  },
  {
    title: 'Orbital Station 18 Drone Blueprint',
    subtitle: 'Cosmograph Probe · Technical Wireframe',
    prompt:
      'Technical isometric orthographic rendering of an orbital telemetry probe drone, carbon composite hull with twin ion nacelles, exposed optic sensor pod, telemetry callouts on dark navy blueprint background, sharp technical line art.',
    ratio: '1:1',
  },
];

const ASPECT_RATIOS = [
  { label: '16:9 (Landscape)', value: '16:9' },
  { label: '9:16 (Story/Vertical)', value: '9:16' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '4:3 (Classic)', value: '4:3' },
  { label: '3:4 (Portrait)', value: '3:4' },
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({ open, onClose }) => {
  const [prompt, setPrompt] = useState<string>(PRESETS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImageItem[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImageItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setReferenceImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageBase64: referenceImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Image generation failed');
      }

      const imageUrl = `data:${data.mimeType || 'image/jpeg'};base64,${data.imageBase64}`;
      const newItem: GeneratedImageItem = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        prompt: prompt.trim(),
        aspectRatio,
        model: data.model || 'gemini-nano-banana-2.1',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setHistory((prev) => [newItem, ...prev]);
      setActiveImage(newItem);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = (item: GeneratedImageItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `cerebro-concept-${item.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-(--z-fullscreen-overlay) flex items-center justify-center p-3 sm:p-5 bg-[#0A0E17]/95 animate-fade-in"
    >
      <div
        data-testid="image-studio-modal"
        className="cj-glass-card w-full max-w-5xl max-h-[92vh] rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-2xl border border-[color:var(--token-cold-border)] overflow-hidden bg-[#101622]/95 text-[#F2F6F8]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--token-divider)] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#65ACFF] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm sm:text-base font-semibold tracking-wide uppercase text-[#F2F6F8]">
                  Creative Image Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#65ACFF]/15 text-[#65ACFF] border border-[#65ACFF]/30">
                  gemini-nano-banana-2.1
                </span>
              </div>
              <p className="font-mono text-xs text-[#909AA8]">
                Concept visualization & storyboard generator · Calibrated architectural render pipeline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[color:var(--token-divider)] bg-[#141C2B] text-[#909AA8] hover:text-[#F2F6F8] hover:border-[#65ACFF] flex items-center justify-center font-mono cursor-pointer transition-colors"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-hidden min-h-0">
          {/* Left Config Column */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 overflow-y-auto pr-1">
            {/* Presets */}
            <div>
              <label className="block font-mono text-[11px] font-semibold tracking-wider uppercase text-[#C5CCD6] mb-1.5">
                Curated Architectural Presets
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p.prompt);
                      setAspectRatio(p.ratio);
                    }}
                    className="text-left p-2 rounded-lg bg-[#141C2B]/80 hover:bg-[#1B2538] border border-[color:var(--token-divider)] hover:border-[#65ACFF]/40 transition-all cursor-pointer group"
                  >
                    <div className="font-display text-xs font-medium text-[#F2F6F8] group-hover:text-[#65ACFF]">
                      {p.title}
                    </div>
                    <div className="font-mono text-[10px] text-[#909AA8] mt-0.5 truncate">
                      {p.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#C5CCD6]">
                  Prompt Specification
                </label>
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="font-mono text-[10px] text-[#909AA8] hover:text-[#F2F6F8] cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe your architectural structure, camera lens, atmospheric lighting..."
                className="w-full rounded-xl bg-[#0B1019] border border-[color:var(--token-divider)] focus:border-[#65ACFF] focus:outline-none p-3 text-xs font-sans text-[#F2F6F8] resize-none leading-relaxed transition-colors"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="block font-mono text-[11px] font-semibold tracking-wider uppercase text-[#C5CCD6] mb-1.5">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value)}
                    className={`px-2 py-1.5 rounded-lg text-center font-mono text-[11px] font-medium border transition-all cursor-pointer ${
                      aspectRatio === r.value
                        ? 'bg-[#65ACFF]/15 border-[#65ACFF] text-[#65ACFF]'
                        : 'bg-[#141C2B] border-[color:var(--token-divider)] text-[#909AA8] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {r.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Image Input (img2img / editing) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#C5CCD6]">
                  Reference Image (Optional Edit / Style)
                </label>
                {referenceImage && (
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="font-mono text-[10px] text-[#FF5666] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {referenceImage ? (
                <div className="relative rounded-lg overflow-hidden border border-[#65ACFF]/40 max-h-24 bg-[#0B1019] flex items-center justify-center">
                  <img
                    src={`data:image/jpeg;base64,${referenceImage}`}
                    alt="Reference preview"
                    className="max-h-24 object-contain"
                  />
                  <div className="absolute bottom-1 right-2 font-mono text-[9px] bg-[#0A0E17]/80 px-1.5 py-0.5 rounded text-[#9AFFE0]">
                    Image Attached
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-dashed border-[color:var(--token-divider)] hover:border-[#65ACFF]/50 bg-[#141C2B]/50 hover:bg-[#141C2B] text-center font-mono text-xs text-[#909AA8] hover:text-[#F2F6F8] cursor-pointer transition-colors"
                >
                  + Upload reference JPEG/PNG
                </button>
              )}
            </div>

            {/* Generate Button */}
            <button
              type="button"
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
              className="mt-1 w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#65ACFF] to-[#9AFFE0] text-[#0A0E17] hover:opacity-95 shadow-lg shadow-[#65ACFF]/10"
            >
              {generating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0A0E17] border-t-transparent animate-spin" />
                  Generating with Gemini Nano...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.2h7.6l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3-6.2-4.5h7.6z" />
                  </svg>
                  Generate Concept Render
                </>
              )}
            </button>

            {error && (
              <div className="p-2.5 rounded-lg bg-[#FF5666]/15 border border-[#FF5666]/30 text-[#FF5666] font-mono text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Right Preview Column */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 bg-[#0B1019] rounded-xl border border-[color:var(--token-divider)] p-4 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="font-mono text-xs text-[#C5CCD6] flex items-center gap-2">
                <span className="text-[#65ACFF]">VIEWPORT</span>
                {activeImage && (
                  <span className="text-[10px] text-[#909AA8]">
                    · {activeImage.aspectRatio} · {activeImage.timestamp}
                  </span>
                )}
              </div>

              {activeImage && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadImage(activeImage)}
                    className="px-2.5 py-1 rounded-lg bg-[#141C2B] hover:bg-[#1B2538] border border-[color:var(--token-divider)] font-mono text-xs text-[#9AFFE0] cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    ↓ Save Image
                  </button>
                </div>
              )}
            </div>

            {/* Display Area */}
            <div className="flex-1 flex items-center justify-center min-h-0 bg-[#070A10] rounded-lg border border-[color:var(--token-divider)] relative overflow-hidden group">
              {generating ? (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="w-12 h-12 rounded-full border-2 border-[#65ACFF] border-t-transparent animate-spin" />
                  <div className="font-mono text-xs text-[#65ACFF]">
                    Computing atmospheric raymarches...
                  </div>
                  <div className="font-mono text-[10px] text-[#909AA8] max-w-xs">
                    Targeting gemini-nano-banana-2.1 sub-surface dispersion shader
                  </div>
                </div>
              ) : activeImage ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <img
                    src={activeImage.url}
                    alt={activeImage.prompt}
                    className="max-h-full max-w-full object-contain rounded shadow-2xl"
                  />
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-[#0A0E17]/95 border border-[color:var(--token-divider)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="font-mono text-[11px] text-[#C5CCD6] line-clamp-2">
                      {activeImage.prompt}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center p-6 text-[#909AA8]">
                  <svg className="w-10 h-10 stroke-current opacity-40 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div className="font-display text-xs text-[#C5CCD6]">No Render Active</div>
                  <div className="font-mono text-[11px] max-w-xs">
                    Select a preset or input your prompt to synthesize high-fidelity concept imagery.
                  </div>
                </div>
              )}
            </div>

            {/* History Strip */}
            {history.length > 0 && (
              <div className="shrink-0 flex flex-col gap-1.5 pt-1 border-t border-[color:var(--token-divider)]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#909AA8]">
                  Session History ({history.length})
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveImage(item)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer ${
                        activeImage?.id === item.id
                          ? 'border-[#65ACFF] ring-1 ring-[#65ACFF]'
                          : 'border-[color:var(--token-divider)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
