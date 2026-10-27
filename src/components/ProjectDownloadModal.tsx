import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { COLOUR_TOKENS, COLOUR_TABLE } from '../tokens/colours';
import {
  SOURCE_MAP,
  MISSING_ITEMS,
  PROJECTS_DATA,
  REGISTER_RECORDS,
  RACI_MATRIX,
  SHOWREEL_ITEMS,
  STORY_CHAPTERS,
} from '../data/sourceData';
import {
  CRO_CDE_GOOGLE_AGENT_NAME,
  CRO_CDE_GOOGLE_SYSTEM_PROMPT,
  CRO_CDE_GOOGLE_TOOLS_SCHEMA,
  buildElevenLabsAgentPayload,
} from '../data/croCdeGoogleAgentManifest';

interface ProjectDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

// Vite raw source glob fallback so client-side ZIP generation works 100% even without backend
const rawSourceModules = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,css,json}',
    '/index.html',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/metadata.json',
    '/server.ts',
  ],
  { query: '?raw', import: 'default' }
);

export const ProjectDownloadModal: React.FC<ProjectDownloadModalProps> = ({
  open,
  onClose,
}) => {
  const [filesMap, setFilesMap] = useState<Record<string, string>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingFiles(true);

    async function loadAllProjectFiles() {
      // 1. Try server endpoint first
      try {
        const res = await fetch('/api/project/files');
        if (res.ok) {
          const data = await res.json();
          if (data?.files && Object.keys(data.files).length > 0 && active) {
            setFilesMap(data.files);
            setLoadingFiles(false);
            return;
          }
        }
      } catch {
        // Fallback to Vite raw glob
      }

      // 2. Client-side Vite ?raw glob fallback
      const collected: Record<string, string> = {};
      for (const [pathKey, loader] of Object.entries(rawSourceModules)) {
        try {
          const rawContent = (await loader()) as string;
          const cleanPath = pathKey.replace(/^\//, '');
          collected[cleanPath] = rawContent;
        } catch {}
      }

      // Add README & ElevenLabs Manifest
      collected['Cro-cde-google_ElevenLabs_Agent_Manifest.json'] = JSON.stringify(
        buildElevenLabsAgentPayload(),
        null,
        2
      );
      collected['README.md'] = `# CEREBRO + CDE (v1.25 — NOJARA Studios)\n\nOwner: 39 (Tarek Nojara), Founder and Culture and Design Engineer, NOJARA Studios (est. 2016), Cairo–Riyadh.\n\n## Quick Start\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`;

      if (active) {
        setFilesMap(collected);
        setLoadingFiles(false);
      }
    }

    loadAllProjectFiles();
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const handleDownloadFullZip = async () => {
    setDownloadingZip(true);
    setStatusMessage('Packaging CEREBRO_CDE_v1.25_FULL_PROJECT.zip...');
    try {
      const zip = new JSZip();
      for (const [relPath, content] of Object.entries(filesMap)) {
        zip.file(relPath, content);
      }
      zip.file(
        'Cro-cde-google_ElevenLabs_Agent_Manifest.json',
        JSON.stringify(buildElevenLabsAgentPayload(), null, 2)
      );
      zip.file(
        'NOJARA_HQ_26_Source_And_Register_Snapshot.json',
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
            sourceMap: SOURCE_MAP,
            colourTable: COLOUR_TABLE,
            missingItems: MISSING_ITEMS,
            projects: PROJECTS_DATA,
            registerRecords: REGISTER_RECORDS,
            raciMatrix: RACI_MATRIX,
            showreels: SHOWREEL_ITEMS,
            storyChapters: STORY_CHAPTERS,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CEREBRO_CDE_v1.25_FULL_PROJECT.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Downloaded CEREBRO_CDE_v1.25_FULL_PROJECT.zip');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'ZIP packaging failed');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadJson = (filename: string, obj: unknown) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage(`Downloaded ${filename}`);
  };

  const fileKeys = Object.keys(filesMap).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#05090E]/85 backdrop-blur-md">
      <div
        className="w-full max-w-4xl max-h-[88vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl neural-reveal"
        style={{
          backgroundColor: COLOUR_TOKENS.glassRgba,
          borderColor: COLOUR_TOKENS.stationFiles,
          borderTopWidth: '3px',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/15 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="font-mono text-[10px] text-[#3DDC97] uppercase tracking-wider">
              NOJARA STUDIOS · FULL SOURCE ARCHIVE & ELEVENLABS BUNDLE
            </div>
            <h2 className="font-display text-base md:text-lg font-semibold text-[#F2F6F8]">
              CEREBRO + CDE v1.25 — Full Project Download
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/30 text-[#BDCBD3] hover:text-[#F2F6F8] font-mono text-base cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Primary Download Cards */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Full Project ZIP */}
            <div className="rounded-xl p-4 border border-[#3DDC97]/60 bg-[#101D27]/95 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-[#3DDC97]">
                  COMPLETE SOURCE CODE (.ZIP)
                </span>
                <h3 className="font-display text-sm font-semibold text-[#F2F6F8]">
                  Full Project Bundle ({fileKeys.length} Files)
                </h3>
                <p className="font-sans text-xs text-[#BDCBD3]">
                  Includes all TypeScript/React components, Three.js dual-sphere engine, MediaPipe CV rig, Express server, CSS tokens, and Vite config.
                </p>
              </div>
              <button
                type="button"
                disabled={downloadingZip || loadingFiles}
                onClick={handleDownloadFullZip}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-[#3DDC97] text-[#101D27] hover:opacity-95 cursor-pointer disabled:opacity-50"
              >
                {downloadingZip
                  ? 'Building ZIP...'
                  : 'Download Full Project (.ZIP)'}
              </button>
            </div>

            {/* 2. ElevenLabs Cro-cde-google Manifest */}
            <div className="rounded-xl p-4 border border-[#4C8DFF]/60 bg-[#101D27]/95 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-[#4C8DFF]">
                  ELEVENLABS AGENT MANIFEST (.JSON)
                </span>
                <h3 className="font-display text-sm font-semibold text-[#F2F6F8]">
                  Agent: {CRO_CDE_GOOGLE_AGENT_NAME} (18 Tools)
                </h3>
                <p className="font-sans text-xs text-[#BDCBD3]">
                  Complete system prompt, locked greeting, and all 18 client tool schemas ready for ElevenLabs ConvAI import.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleDownloadJson(
                    'Cro-cde-google_ElevenLabs_Agent_18_Tools.json',
                    {
                      agentName: CRO_CDE_GOOGLE_AGENT_NAME,
                      systemPrompt: CRO_CDE_GOOGLE_SYSTEM_PROMPT,
                      tools: CRO_CDE_GOOGLE_TOOLS_SCHEMA,
                      createPayload: buildElevenLabsAgentPayload(),
                    }
                  )
                }
                className="w-full min-h-[42px] px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-[#4C8DFF] text-[#101D27] hover:opacity-95 cursor-pointer"
              >
                Download 18-Tool Agent (.JSON)
              </button>
            </div>

            {/* 3. NOJARA Project Register & Source Snapshot */}
            <div className="rounded-xl p-4 border border-[#F2B66D]/60 bg-[#101D27]/95 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-[#F2B66D]">
                  SOURCE OF TRUTH SNAPSHOT (.JSON)
                </span>
                <h3 className="font-display text-sm font-semibold text-[#F2F6F8]">
                  52 PMO Records + RACI + 5 Showreels
                </h3>
                <p className="font-sans text-xs text-[#BDCBD3]">
                  Exports the complete read-only NOJARA register snapshot, colour token registry, RACI matrix, and 8 story chapters.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleDownloadJson('NOJARA_HQ_26_Register_Snapshot.json', {
                    owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
                    sourceMap: SOURCE_MAP,
                    colourTable: COLOUR_TABLE,
                    projects: PROJECTS_DATA,
                    registerRecords: REGISTER_RECORDS,
                    raciMatrix: RACI_MATRIX,
                    showreels: SHOWREEL_ITEMS,
                    storyChapters: STORY_CHAPTERS,
                  })
                }
                className="w-full min-h-[42px] px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-[#F2B66D] text-[#101D27] hover:opacity-95 cursor-pointer"
              >
                Download Register Data (.JSON)
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="px-4 py-2 rounded-xl bg-[#101D27] border border-[#3DDC97]/50 font-mono text-xs text-[#9AFFE0]">
              {statusMessage}
            </div>
          )}

          {/* Interactive Codebase File Inspector */}
          <div className="rounded-xl border border-white/20 bg-[#05090E] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#101D27] border-b border-white/15 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#BDCBD3]">Inspect File:</span>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#05090E] border border-white/30 font-mono text-xs text-[#F2F6F8]"
                >
                  {fileKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const content = filesMap[selectedFile] || '';
                  navigator.clipboard?.writeText(content);
                  setStatusMessage(`Copied ${selectedFile} to clipboard`);
                }}
                className="px-3 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-white/30 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
              >
                Copy File Content
              </button>
            </div>
            <pre className="p-4 max-h-60 overflow-auto font-mono text-[11px] text-[#D0DCE3] leading-relaxed">
              {filesMap[selectedFile] || 'Loading project files...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
