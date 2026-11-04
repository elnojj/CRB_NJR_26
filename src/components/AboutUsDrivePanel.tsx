import React from 'react';
import { ABOUT_US_BIOS, DRIVE_MEDIA_ASSETS } from '../data/driveMediaCatalog';
import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';

export const AboutUsDrivePanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 text-[#F2F6F8]">
      <div className="flex items-center gap-3 border-b border-[rgba(197,204,214,0.18)] pb-3">
        <img
          src={PUBLIC_BRAND_MEDIA.logoWhite.url}
          alt="NOJARA"
          className="h-6 w-auto object-contain"
        />
        <div>
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#F2F6F8]">
            About NOJARA Studios
          </h2>
          <div className="text-[11px] font-mono text-[#D4AF37]">
            Culture & Design Engineering
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ABOUT_US_BIOS.map((bio) => (
          <div
            key={bio.id}
            className="p-3.5 rounded-xl border border-[rgba(197,204,214,0.15)] bg-[#101622]/60 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-xs text-[#FFF4D0]">
                  {bio.name}
                </div>
                <div className="font-mono text-[10px] text-[#A2B4C0]">
                  {bio.role}
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]">
                FOUNDER
              </span>
            </div>
            <p className="text-xs text-[#C5CCD6] leading-relaxed">
              {bio.summary}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#A2B4C0]">
          Verified Master Showreels & Media
        </div>
        <div className="grid grid-cols-1 gap-2">
          {DRIVE_MEDIA_ASSETS.filter((a) => a.kind === 'video').map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(197,204,214,0.12)] bg-[#101622]/40"
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs font-medium text-[#F2F6F8] truncate">
                  {asset.title}
                </div>
                <div className="text-[10px] font-mono text-[#C5CCD6]">
                  {asset.role}
                </div>
              </div>
              <a
                href={asset.localFallback}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[10px] font-mono px-2.5 py-1 rounded border border-[#65ACFF]/40 text-[#65ACFF] hover:bg-[#65ACFF]/10 transition-colors"
              >
                Stream ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
