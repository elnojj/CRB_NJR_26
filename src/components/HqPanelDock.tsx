import React from 'react';
import { HQ_NODE_LABEL, panelsForHqNode, type HqNodeId } from '../data/hqNodeWiring';

export type HqPanelDockProps = {
  node: HqNodeId;
  activePanel: string | null;
  onOpenPanel: (panelId: string) => void;
};

export const HqPanelDock: React.FC<HqPanelDockProps> = ({ node, activePanel, onOpenPanel }) => {
  const panels = panelsForHqNode(node);
  return (
    <nav className="cerebro-hq-dock" data-testid={`hq-dock-${node}`} aria-label={`${HQ_NODE_LABEL[node]} workspace`}>
      <span className="cerebro-hq-dock__title">
        {HQ_NODE_LABEL[node]}
        <em>{panels.length} tools</em>
      </span>
      <ul data-detail="true">
        {panels.map((panel) => (
          <li key={panel.panelId}>
            <button
              type="button"
              data-testid={`hq-dock-${node}-${panel.panelId}`}
              data-active={activePanel === panel.panelId ? 'true' : 'false'}
              onClick={() => onOpenPanel(panel.panelId)}
            >
              <span>{panel.label}</span>
              {panel.caveat ? <em>{panel.caveat}</em> : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
