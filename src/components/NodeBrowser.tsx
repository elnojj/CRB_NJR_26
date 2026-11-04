import React, { useState } from 'react';
import { nodeDirectory, type DirectoryEntry, type NodeContent, contentChip } from '../data/nodeContent';
import type { ConnectedSphereId } from '../three/sphereNetwork';
import './nodeBrowser.css';

const SPHERE_TABS: ReadonlyArray<{ id: ConnectedSphereId; label: string }> = [
  { id: 'hq', label: 'HQ' },
  { id: 'cde', label: 'CDE' },
  { id: 'campaign-os', label: 'Campaign' },
  { id: 'about-us', label: 'About' },
];

const DIRECTORY = nodeDirectory();

function Thumb({ entry }: { entry: Pick<NodeContent, 'thumbs'> }) {
  const first = entry.thumbs[0];
  if (!first) {
    return <span className="cerebro-node-thumb cerebro-node-thumb--empty" aria-hidden="true" />;
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
      <ul className="cerebro-node-browser__list">
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
        <div>
          <span className="cerebro-node-card__kind">{content.kindLabel}</span>
          <h3>{content.title}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss node details" data-testid="node-card-close">
          ×
        </button>
      </header>
      {strip.length > 0 && (
        <div className="cerebro-node-card__strip">
          {strip.map((thumb, idx) => (
            <span key={`${thumb.url}-${idx}`} className="cerebro-node-thumb cerebro-node-thumb--wide">
              <img src={thumb.url} alt="" loading="lazy" decoding="async" />
              {thumb.kind === 'video' && <span className="cerebro-node-thumb__play" />}
            </span>
          ))}
        </div>
      )}
      <p className="cerebro-node-card__chip">{contentChip(content)}</p>
      <p className="cerebro-node-card__summary">{content.summary}</p>
      {content.honest && <p className="cerebro-node-card__honest">{content.honest}</p>}
    </section>
  );
};
