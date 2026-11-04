import React from 'react';
import type { HudMenuSpec, HudMenuTone } from '../../three/hudBridge';

const TONE_CLASS: Record<HudMenuTone, string> = {
  default: '',
  mint: 'text-[#9AFFE0]',
  blue: 'text-[#65ACFF]',
  light: 'text-[#F2F6F8]',
};

/**
 * DOM rendering of the stations/tools menu. The 3D spatial menu is the primary UI; this list is the fallback when WebGL
 * is unavailable and the accessible, test-addressable mirror while the 3D menu is showing.
 */
export function MoreMenuList({ spec }: { spec: HudMenuSpec }) {
  return (
    <>
      {spec.sections.map((section, index) => (
        <React.Fragment key={section.id}>
          {index > 0 ? <div className="fim-rule" /> : null}
          {section.title ? <div className="fim-section">{section.title}</div> : null}
          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`fim-item ${TONE_CLASS[item.tone ?? 'default']}`.trim()}
              data-testid={item.testId}
              onClick={item.onSelect}
            >
              {item.meta !== undefined ? (
                <>
                  <span>{item.label}</span>
                  <span className="fim-meta">{item.meta}</span>
                </>
              ) : (
                item.label
              )}
            </button>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
