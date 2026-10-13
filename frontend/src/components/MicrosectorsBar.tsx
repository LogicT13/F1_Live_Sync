import React from 'react';
import type { ReplayDriver } from '@/hooks/useReplaySocket';

interface MicrosectorsBarProps {
  driver: ReplayDriver | null;
  isVisible: boolean;
}

export default function MicrosectorsBar({ driver, isVisible }: MicrosectorsBarProps) {
  if (!isVisible || !driver || !driver.sectors || driver.sectors.length === 0) {
    return null;
  }

  const getColorClass = (color: string) => {
    switch (color) {
      case "purple": return "bg-[#b100ff] shadow-[0_0_8px_#b100ff]";
      case "green": return "bg-[#00d200] shadow-[0_0_8px_#00d200]";
      case "yellow": return "bg-[#ffd500] shadow-[0_0_8px_#ffd500]";
      default: return "bg-gray-600/50";
    }
  };

  // Collect all 30 microsectors (assume 10 per sector)
  const allSegments = [];
  for (let s = 1; s <= 3; s++) {
    const sector = driver.sectors.find(sec => sec.num === s);
    const segments = sector?.segments || [];
    for (let i = 0; i < 10; i++) {
      allSegments.push(segments[i] || { status: 0, color: 'empty' });
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3 shadow-2xl flex items-center gap-6">

        {/* Driver Info */}
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <div
            className="w-1.5 h-8 rounded-full"
            style={{ backgroundColor: driver.color || '#fff' }}
          />
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight">{driver.abbr}</span>
            <span className="text-gray-400 text-xs font-medium uppercase">{driver.team}</span>
          </div>
        </div>

        {/* Continuous Microsectors Bar */}
        <div className="flex gap-[2px]">
          {allSegments.map((seg, idx) => (
            <React.Fragment key={idx}>
              <div
                className={`w-2 h-5 rounded-[1px] transition-colors duration-200 ${seg.color === 'empty' ? 'bg-white/10' : getColorClass(seg.color)}`}
              />
              {/* Optional tiny visual separator between sectors (after 10th and 20th segment) */}
              {(idx === 9 || idx === 19) && <div className="w-[2px]" />}
            </React.Fragment>
          ))}
        </div>

      </div>
    </div>
  );
}
