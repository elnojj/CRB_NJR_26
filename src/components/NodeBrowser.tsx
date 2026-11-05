import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { nodeDirectory, type DirectoryEntry, type NodeContent, contentChip } from '../data/nodeContent';
import type { ConnectedSphereId } from '../three/sphereNetwork';
import { nodeTokenDataUrl } from '../three/nodeTokens';
import { resolveReducedMotion } from '../utils/motionPreference';
import './nodeBrowser.css';

const SPHERE_TABS: ReadonlyArray<{ id: ConnectedSphereId; label: string }> = [
  { id: 'hq', label: 'HQ' },
  { id: 'cde', label: 'CDE' },
  { id: 'campaign-os', label: 'Campaign' },
  { id: 'about-us', label: 'About' },
];

const DIRECTORY = nodeDirectory();

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const SPHERE_ACCENT: Record<ConnectedSphereId, string> = {
  hq: '#4f9bff',
  cde: '#38c6e8',
  'campaign-os': '#d4af37',
  'about-us': '#e8d9a8',
};

/** A node with no approved media shows its generated token, never a blank box or a stand-in photo. */
function Thumb({ entry }: { entry: Pick<NodeContent, 'thumbs' | 'title' | 'nodeType' | 'sphere'> }) {
  const first = entry.thumbs[0];
  if (!first) {
    const token = nodeTokenDataUrl({ accentCss: SPHERE_ACCENT[entry.sphere], nodeType: entry.nodeType, label: entry.title });
    return (
      <span className="cerebro-node-thumb cerebro-node-thumb--token" aria-hidden="true">
        <img src={token} alt="" decoding="async" />
      </span>
    );
  }
  return (
    <span className="cerebro-node-thumb" aria-hidden="true">
      <img src={first.url} alt="" loading="lazy" decoding="async" />
      {first.kind === 'video' && <span className="cerebro-node-thumb__play" />}
    </span>
  );
}

export type NodeBrowserProps = {
  open: boolean;
  activeSphere: ConnectedSphereId;
  focusedNodeId: string | null;
  onClose: () => void;
  onPick: (entry: DirectoryEntry) => void;
};

export const NodeBrowser: React.FC<NodeBrowserProps> = ({
  open,
  activeSphere,
  focusedNodeId,
  onClose,
  onPick,
}) => {
  const [tab, setTab] = useState<ConnectedSphereId>(activeSphere);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Rows settle in one after another when the browser opens or the tab changes. The context reverts on
  // cleanup so a fast tab switch never leaves a row half faded.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list || resolveReducedMotion(window.location.search, safeStorage())) return undefined;
    const ctx = gsap.context(() => {
      gsap.from(list.children, { y: 14, autoAlpha: 0, duration: 0.75, ease: 'power3.out', stagger: 0.06 });
    }, list);
    return () => ctx.revert();
  }, [open, tab]);

  if (!open) return null;
  const entries = DIRECTORY[tab];
  return (
    <aside className="cerebro-node-browser" data-testid="node-browser" aria-label="All nodes">
      <header className="cerebro-node-browser__head">
        <h2>All nodes</h2>
        <button type="button" onClick={onClose} aria-label="Close node browser" data-testid="node-browser-close">
          Close
        </button>
      </header>
      <div className="cerebro-node-browser__tabs" role="tablist">
        {SPHERE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-testid={`node-tab-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span>{DIRECTORY[t.id].filter((entry) => !entry.parentId).length}</span>
          </button>
        ))}
      </div>
      <ul className="cerebro-node-browser__list" ref={listRef}>
        {entries.map((entry) => {
          const hasMedia = entry.tubeKey !== null;
          return (
            <li key={`${entry.sphere}-${entry.nodeType}-${entry.nodeId}`}>
              <button
                type="button"
                className="cerebro-node-row"
                data-testid={`node-row-${entry.sphere}-${entry.nodeId}`}
                data-active={focusedNodeId === entry.nodeId ? 'true' : 'false'}
                data-has-media={hasMedia ? 'true' : 'false'}
                data-child={entry.parentId ? 'true' : 'false'}
                onClick={() => onPick(entry)}
              >
                <Thumb entry={entry} />
                <span className="cerebro-node-row__text">
                  <strong>{entry.title}</strong>
                  <em>{entry.kindLabel}</em>
                  <span>{entry.chip}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export type NodeContentCardProps = {
  content: NodeContent | null;
  onClose: () => void;
};

export const NodeContentCard: React.FC<NodeContentCardProps> = ({ content, onClose }) => {
  if (!content) return null;
  const strip = content.thumbs.slice(0, 4);
  return (
    <section className="cerebro-node-card" data-testid="node-content-card" aria-label={`${content.title} contents`}>
      <header>
        <span className="cerebro-node-card__kind">{content.kindLabel}</span>
        <button type="button" onClick={onClose} aria-label="Dismiss node details" data-testid="node-card-close">
          ✕
        </button>
      </header>
      <h3>{content.title}</h3>
      {strip.length > 0 && (
        <div className="cerebro-node-card__strip" data-detail="true">
          {strip.map((thumb, idx) => (
            <span key={`${thumb.url}-${idx}`} className="cerebro-node-thumb cerebro-node-thumb--wide">
              <img src={thumb.url} alt="" loading="lazy" decoding="async" />
              {thumb.kind === 'video' && <span className="cerebro-node-thumb__play" />}
            </span>
          ))}
        </div>
      )}
      <p className="cerebro-node-card__chip">{contentChip(content)}</p>
      <p className="cerebro-node-card__summary" data-detail="true">{content.summary}</p>
      {content.honest && (
        <p className="cerebro-node-card__honest" data-detail="true">
          {content.honest}
        </p>
      )}
    </section>
  );
};
