"use client";

import { useState, useRef, useEffect } from "react";
import { ReplayDriver } from "@/hooks/useReplaySocket";
import { ReplaySettings } from "@/hooks/useSettings";
import { TYRE_COLORS, TYRE_SHORT, TEAM_ABBR } from "@/lib/constants";
import { lapColorClass, SectorMarkers } from "@/lib/lapTiming";

export interface LapEntry {
  driver: string;
  lap_number: number;
  lap_time: string | null;
  time: number | null; // session-elapsed seconds when lap was completed
  compound: string | null;
  pit_in: boolean;
  pit_out: boolean;
}

interface Props {
  drivers: ReplayDriver[];
  highlightedDrivers: string[];
  onDriverClick: (abbr: string) => void;
  settings: ReplaySettings;
  currentTime: number;
  isRace: boolean;
  isQualifying?: boolean;
  compact?: boolean;
  onScaleChange?: (scale: number) => void;
  lapData?: Map<string, Map<number, { time: string; completedAt: number | null }>>;
  currentLap?: number;
  mobileTeamAbbrHidden?: boolean;
}

function formatGap(gap: string | null): string {
  if (!gap) return "";
  // Handle "1L", "2L" format (gap to leader)
  const lapped = gap.match(/^(\d+)\s*L$/);
  if (lapped) {
    const n = parseInt(lapped[1]);
    return `+${n} Lap${n > 1 ? "s" : ""}`;
  }
  // Handle "LAP 1", "LAP 0" format (interval data)
  const lapFormat = gap.match(/^LAP\s+(\d+)$/i);
  if (lapFormat) {
    const n = parseInt(lapFormat[1]);
    if (n === 0) return "Interval";
    return `+${n} Lap${n > 1 ? "s" : ""}`;
  }
  return gap;
}

function parseGapSeconds(gap: string | null): number | null {
  if (!gap) return null;
  if (gap.startsWith("LAP")) return 0;
  const lapped = gap.match(/^(\d+)\s*L$/);
  if (lapped) return null; // can't compute interval for lapped cars
  try {
    return parseFloat(gap.replace("+", ""));
  } catch {
    return null;
  }
}

function computeIntervals(sorted: ReplayDriver[]): Map<string, string> {
  const intervals = new Map<string, string>();
  for (let i = 0; i < sorted.length; i++) {
    const drv = sorted[i];
    if (i === 0) {
      intervals.set(drv.abbr, "Leader");
      continue;
    }
    // Use real interval data from F1 timing feed if available
    if (drv.interval) {
      intervals.set(drv.abbr, formatGap(drv.interval));
      continue;
    }
    // Fallback: compute from gap-to-leader differences
    const currGap = parseGapSeconds(drv.gap);
    const prevGap = parseGapSeconds(sorted[i - 1].gap);
    if (currGap !== null && prevGap !== null) {
      const diff = currGap - prevGap;
      intervals.set(drv.abbr, `+${diff.toFixed(3)}`);
    } else {
      intervals.set(drv.abbr, formatGap(drv.gap));
    }
  }
  return intervals;
}

export default function Leaderboard({ drivers, highlightedDrivers, onDriverClick, settings, currentTime, isRace, isQualifying, compact, onScaleChange, lapData, currentLap, mobileTeamAbbrHidden }: Props) {
  const [showInterval, setShowInterval] = useState(true);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateScale() {
      if (compact) {
        setScale(1);
        onScaleChange?.(1);
        return;
      }
      if (!containerRef.current || !contentRef.current) return;
      // On mobile (< 640px), don't scale - let it scroll instead
      if (window.innerWidth < 640) {
        setScale(1);
        onScaleChange?.(1);
        return;
      }
      const containerH = containerRef.current.clientHeight;
      const contentH = contentRef.current.scrollHeight;
      let newScale = 1;
      if (contentH > containerH && contentH > 0) {
        newScale = Math.max(0.55, containerH / contentH);
      }
      setScale(newScale);
      onScaleChange?.(newScale);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [drivers.length, settings.showGapToLeader, settings.showBestLapTime, settings.showLastLapTime, isRace, compact, onScaleChange]);

  const sorted = [...drivers].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999),
  );

  const intervals = isRace && showInterval ? computeIntervals(sorted) : null;

  return (
    <div ref={containerRef} className={`bg-white/95 backdrop-blur-xl border-r border-gray-200 h-full shadow-lg ${compact ? "overflow-y-auto" : "overflow-y-auto sm:overflow-hidden"}`}>
      <div ref={contentRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%` }}>

      <div className="divide-y divide-gray-100">
        {sorted.map((drv) => {
          const isHighlighted = highlightedDrivers.includes(drv.abbr);
          const isLeader = drv.position === 1;
          const compound = drv.compound;
          const tyreColor = compound ? (TYRE_COLORS[compound] || "#888") : undefined;
          const tyreLabel = compound ? (TYRE_SHORT[compound] || "?") : null;

          const displayGap = (() => {
            if (drv.retired) return "Out";
            if (drv.in_pit && isRace) return "PIT";
            if (isRace && drv.position === 1) return showInterval ? "Interval" : "Leader";
            if (drv.gap === "No time") return "No time";
            if (isRace && intervals) {
              return intervals.get(drv.abbr) || formatGap(drv.gap);
            }
            if (!isRace) {
              // For practice/qualifying: gap column shows gap to leader
              if (drv.position === 1) return "";
              return formatGap(drv.gap);
            }
            return formatGap(drv.gap);
          })();

          // Map team color for hover borders
          const teamBorderColor = (() => {
            const teams: Record<string, string> = {
              "Red Bull Racing": "border-l-blue-700",
              "Ferrari": "border-l-red-600",
              "Mercedes": "border-l-teal-400",
              "McLaren": "border-l-orange-500",
              "Aston Martin": "border-l-green-700",
              "Williams": "border-l-blue-500",
              "Haas F1 Team": "border-l-gray-300",
              "Kick Sauber": "border-l-green-500",
              "Alpine": "border-l-pink-500",
              "RB": "border-l-blue-400"
            };
            return teams[drv.team] || "border-l-gray-500";
          })();

          return (
            <button
              key={drv.abbr}
              onClick={() => onDriverClick(drv.abbr)}
              className={`w-full flex items-center px-1 sm:px-2 py-1.5 transition-all duration-150 ease-out text-left border-l-[3px] hover:bg-gray-50/80 ${
                isHighlighted ? `bg-gray-50` : "border-transparent bg-white"
              } ${drv.no_timing ? "opacity-40" : drv.knocked_out ? "opacity-50" : ""}`}
              style={{
                borderLeftColor: isHighlighted ? drv.color : 'transparent',
                ...(isHighlighted ? { boxShadow: `inset 4px 0 12px -4px ${drv.color}` } : {})
              }}
            >
              {/* Position - 24px */}
              {isLeader ? (
                <span className="w-6 h-6 flex items-center justify-center rounded bg-f1-red text-white text-[17px] font-black flex-shrink-0 shadow-sm">
                  {drv.position}
                </span>
              ) : (
                <span className="w-6 text-[17px] font-black text-[#1a1f2b] text-right flex-shrink-0">
                  {drv.position ?? "-"}
                </span>
              )}

              {/* Team color bar */}
              <span
                className="w-1.5 h-7 rounded-sm flex-shrink-0 mx-1.5 shadow-sm"
                style={{ backgroundColor: drv.color }}
              />

              {/* Team abbreviation */}
              {settings.showTeamAbbr && !mobileTeamAbbrHidden && (
                <span className="w-8 text-[11px] font-bold text-gray-500 flex-shrink-0" title="Team">
                  {TEAM_ABBR[drv.team] || drv.team?.slice(0, 3).toUpperCase()}
                </span>
              )}

              {/* Driver abbreviation */}
              <span className="w-[60px] flex items-center gap-1 text-[18px] font-black tracking-wider text-[#1a1f2b] flex-shrink-0">
                {drv.abbr}
                {drv.flag === "investigation" && (
                  <div className="relative group/tooltip flex items-center justify-center ml-0.5">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center text-[#1a1f2b] text-[8px] font-bold cursor-help shadow-sm">
                      !
                    </span>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none z-50 whitespace-nowrap bg-white text-[#1a1f2b] text-[10px] font-medium px-3 py-1.5 rounded-md border border-gray-200 shadow-lg translate-y-1 group-hover/tooltip:translate-y-0">
                       Bajo investigación (Race Control)
                       <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-gray-200 rotate-45" />
                    </div>
                  </div>
                )}
                {drv.flag === "penalty" && (
                  <div className="relative group/tooltip flex items-center justify-center ml-0.5">
                    <span className="w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold cursor-help shadow-sm">
                      P
                    </span>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none z-50 whitespace-nowrap bg-white text-[#1a1f2b] text-[10px] font-medium px-3 py-1.5 rounded-md border border-gray-200 shadow-lg translate-y-1 group-hover/tooltip:translate-y-0">
                       Penalización aplicada
                       <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-gray-200 rotate-45" />
                    </div>
                  </div>
                )}
              </span>

              {/* Pit indicator (non-race only) */}
              {!isRace && (
                <span className="w-[13px] ml-2 -mr-1 flex-shrink-0 flex items-center justify-center">
                  {drv.in_pit && (
                    <span className="w-[13px] h-[13px] bg-[#1a1f2b] rounded-[2px] flex items-center justify-center">
                      <span className="text-[8px] font-extrabold text-white leading-none">P</span>
                    </span>
                  )}
                </span>
              )}

              {/* Grid delta - 24px (race only) */}
              {isRace && settings.showGridChange && (
              <span className="w-6 flex-shrink-0 text-center" title="Grid position change">
                {!drv.retired && currentTime >= 10 && (
                  drv.pit_start ? (
                    <span className="text-[10px] font-bold text-gray-500">Pit</span>
                  ) : drv.grid_position != null && drv.position != null && (() => {
                    const delta = drv.grid_position - drv.position;
                    if (delta > 0) return (
                      <span className="text-[10px] font-bold text-green-600">▲{delta}</span>
                    );
                    if (delta < 0) return (
                      <span className="text-[10px] font-bold text-red-500">▼{Math.abs(delta)}</span>
                    );
                    return null;
                  })()
                )}
              </span>
              )}

              {/* Flags - 16px */}
              <span className={`w-4 flex-shrink-0 flex items-center justify-center ${!isRace ? "ml-1.5" : ""}`}>
                {isRace && drv.has_fastest_lap && (
                  <svg className="w-3.5 h-3.5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M12 6v7l4.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
              </span>

              {/* Best lap time (practice/qualifying only) */}
              {!isRace && settings.showBestLapTime && (
                <span className={`w-[60px] flex-shrink-0 text-[15px] font-bold text-right ${drv.position === 1 ? "text-purple-600" : "text-[#1a1f2b]"}`} title="Best lap time">
                  {drv.retired ? "Out" : (drv.best_lap_time || (drv.position === 1 ? formatGap(drv.gap) : null) || "")}
                </span>
              )}

              {/* Gap to leader */}
              {settings.showGapToLeader && (
                isRace && isLeader && !drv.retired ? (
                  <span
                    className="w-14 flex-shrink-0 flex justify-start"
                    onClick={(e) => { e.stopPropagation(); setShowInterval(!showInterval); }}
                  >
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors">
                      {showInterval ? "Interval" : "Leader"}
                    </span>
                  </span>
                ) : isRace ? (
                  drv.in_pit && !drv.retired ? (
                    <span className="w-14 flex-shrink-0 text-left text-yellow-600" title="In pit lane">
                      <span className="text-[15px] font-bold">PIT</span>
                      {drv.pit_time != null && (
                        <span className="text-[9px] font-bold ml-0.5 tabular-nums">{drv.pit_time.toFixed(1)}s</span>
                      )}
                    </span>
                  ) : (
                    <span title={showInterval ? "Interval to car ahead" : "Gap to leader"} className={`w-14 flex-shrink-0 text-[15px] font-bold text-left tabular-nums ${
                      showInterval && settings.highlightClose && displayGap && (() => {
                          const val = parseFloat(displayGap.replace("+", ""));
                          return !isNaN(val) && val > 0 && val < 1;
                        })()
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}>
                      {displayGap}
                    </span>
                  )
                ) : (
                  <span className={`w-14 flex-shrink-0 text-[15px] font-bold text-left tabular-nums text-gray-500 ml-3 sm:ml-2`} title="Gap to leader">
                    {displayGap}
                  </span>
                )
              )}

              {/* Last lap time */}
              {settings.showLastLapTime && (() => {
                let lastLapTime: string | null = null;
                let colorClass = "text-gray-500";
                
                // Use new `timing` object from F1 feed if available (Live mode)
                if ((drv as any).timing?.last_lap) {
                   lastLapTime = (drv as any).timing.last_lap.value;
                   if ((drv as any).timing.last_lap.ob) colorClass = "text-purple-600";
                   else if ((drv as any).timing.last_lap.pb) colorClass = "text-green-600";
                   else colorClass = "text-[#1a1f2b]";
                } else {
                   // Fallback to Replay mode calculation
                   const driverLaps = lapData?.get(drv.abbr);
                   if (!driverLaps) return <span className="w-[50px] sm:w-[60px] flex-shrink-0" />;

                   let lastLapNum = 0;
                   if (isRace) {
                     for (let l = (currentLap || 0); l >= 1; l--) {
                       const entry = driverLaps.get(l);
                       if (entry) { lastLapTime = entry.time; lastLapNum = l; break; }
                     }
                   } else {
                     for (const [lapNum, entry] of driverLaps) {
                       if (entry.completedAt !== null && entry.completedAt <= currentTime && lapNum > lastLapNum) {
                         lastLapTime = entry.time;
                         lastLapNum = lapNum;
                       }
                     }
                   }

                   if (lastLapTime && lastLapNum >= 2 && !drv.retired) {
                      colorClass = lapColorClass(lastLapTime, drv.abbr, lapData, currentTime, currentLap || 0, isRace, drv.has_fastest_lap);
                      if (colorClass.includes("text-white")) colorClass = colorClass.replace("text-white", "text-[#1a1f2b]");
                      if (colorClass.includes("text-purple-400")) colorClass = colorClass.replace("text-purple-400", "text-purple-600");
                      if (colorClass.includes("text-green-400")) colorClass = colorClass.replace("text-green-400", "text-green-600");
                      if (colorClass.includes("text-yellow-400")) colorClass = colorClass.replace("text-yellow-400", "text-[#1a1f2b]"); // Yellow text is hard to read on white
                   } else {
                      lastLapTime = null;
                   }
                }

                if (!lastLapTime || drv.retired) return (
                  <span className="w-[50px] sm:w-[60px] flex-shrink-0 text-xs sm:text-[15px] text-right tabular-nums text-gray-400" title="Last lap time">
                    {drv.retired ? "" : (lastLapTime || "")}
                  </span>
                );

                return (
                  <span className={`w-[50px] sm:w-[60px] flex-shrink-0 text-xs sm:text-[15px] text-right tabular-nums font-bold ${colorClass}`} title="Last lap time">
                    {lastLapTime}
                  </span>
                );
              })()}

              {/* Live sector indicators - fixed width (qualifying and practice) */}
              {!isRace && settings.showSectors && (
                <SectorMarkers sectors={drv.sectors} className="w-7 flex-shrink-0 mx-1" />
              )}

              {/* Pit stops / chequered flag - 20px (race only) */}
              {isRace && settings.showPitStops && (
                <span className="w-8 flex-shrink-0 flex items-center justify-center ml-1" title={drv.finished ? "Finished" : "Pit stops"}>
                  {drv.finished ? (
                    <img src="/chequered-flag.png" alt="Finished" className="w-5 h-5 object-contain" />
                  ) : drv.tyre_history && drv.tyre_history.length > 1 ? (
                    <div className="flex -space-x-1">
                      {drv.tyre_history.slice(0, 3).map((comp, idx) => {
                        const hColor = TYRE_COLORS[comp] || "#888";
                        const hLabel = TYRE_SHORT[comp] || "?";
                        return (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-extrabold leading-none border bg-black z-10 shadow-sm"
                            style={{ borderColor: hColor, color: hColor }}
                          >
                            {hLabel}
                          </span>
                        );
                      })}
                    </div>
                  ) : drv.pit_stops > 0 ? (
                    <span className="w-5 h-5 border border-gray-300 bg-gray-50 rounded-sm flex items-center justify-center text-[10px] font-extrabold text-[#1a1f2b]">
                      {drv.pit_stops}
                    </span>
                  ) : null}
                </span>
              )}

              {/* Pit prediction - 36px (race only) */}
              {isRace && settings.showPitPrediction && (
                <span className="w-9 flex-shrink-0 flex items-center justify-end gap-0.5 ml-1" title="Predicted position after pit stop">
                  {drv.pit_prediction != null && (
                    <>
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        settings.showPitConfidence && drv.pit_prediction_margin != null
                          ? drv.pit_prediction_margin < 1 ? "text-red-500"
                          : drv.pit_prediction_margin < 2.5 ? "text-yellow-600"
                          : "text-gray-500"
                          : "text-gray-500"
                      }`}>
                        <svg className="w-4 h-4 opacity-70 -scale-y-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 14l-4-4 4-4" />
                          <path d="M5 10h11a4 4 0 0 1 0 8h-1" />
                        </svg>
                        P{drv.pit_prediction}
                      </span>
                    </>
                  )}
                </span>
              )}

              {/* Pit gaps (ahead / behind) stacked - race only, shown with pit prediction */}
              {isRace && settings.showPitPrediction && settings.showPitFreeAir && (
                <span className="w-9 flex-shrink-0 flex flex-col items-end leading-tight" title="Pit gaps: ↑ gap ahead, ↓ gap behind">
                  {drv.pit_prediction != null && (
                    <>
                      <span className="text-[8px] font-bold text-gray-500">
                        {drv.pit_prediction_free_air != null
                          ? `↑${drv.pit_prediction_free_air.toFixed(1)}s`
                          : "—"}
                      </span>
                      <span className={`text-[8px] font-bold ${
                        settings.showPitConfidence && drv.pit_prediction_margin != null
                          ? drv.pit_prediction_margin < 1 ? "text-red-500"
                          : drv.pit_prediction_margin < 2.5 ? "text-yellow-600"
                          : "text-gray-500"
                          : "text-gray-500"
                      }`}>
                        {drv.pit_prediction_margin != null
                          ? `↓${drv.pit_prediction_margin.toFixed(1)}s`
                          : "—"}
                      </span>
                    </>
                  )}
                </span>
              )}

              {/* Tyre history - 36px (race only) */}
              {isRace && settings.showTyreHistory && (
                <span className="w-9 flex-shrink-0 flex items-center justify-end gap-0.5" title="Tyre history">
                  {(drv.tyre_history || []).slice(-2).map((comp, i) => {
                    const hColor = TYRE_COLORS[comp] || "#888";
                    const hLabel = TYRE_SHORT[comp] || "?";
                    return (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-extrabold leading-none border opacity-50"
                        style={{
                          borderColor: hColor,
                          color: hColor,
                          backgroundColor: "transparent",
                        }}
                      >
                        {hLabel}
                      </span>
                    );
                  })}
                </span>
              )}

              {/* Tyre Stack / Current tyre compound - 20px */}
              {settings.showTyreType && (
                <span className="w-5 flex-shrink-0 flex items-center justify-center ml-1 relative group" title="Tyre history">
                  <div className="absolute right-0 flex items-center justify-end space-x-[-8px] group-hover:space-x-1 transition-all duration-300 ease-out z-20">
                    {drv.tyre_history && drv.tyre_history.length > 0 ? (
                      drv.tyre_history.map((histComp, idx) => {
                        const histColor = TYRE_COLORS[histComp] || "#888";
                        const histLabel = TYRE_SHORT[histComp] || "?";
                        const isLast = idx === drv.tyre_history.length - 1;
                        return (
                          <div 
                            key={idx} 
                            className={`relative w-[15px] h-[15px] rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${!isLast ? 'group-hover:scale-100 scale-95 opacity-90 group-hover:opacity-100' : 'z-10 shadow-lg'}`}
                            style={{ 
                              background: `radial-gradient(circle at 35% 35%, #444 0%, #111 60%, #000 100%)`,
                              boxShadow: `inset 0 0 3px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)`,
                              border: `1.5px solid ${histColor}`
                            }}
                          >
                            <span className="text-[7.5px] font-extrabold leading-none drop-shadow-md" style={{ color: histColor }}>{histLabel}</span>
                          </div>
                        );
                      })
                    ) : (
                      compound && (
                          <div 
                            className="relative w-[15px] h-[15px] rounded-full flex-shrink-0 flex items-center justify-center z-10 shadow-lg"
                            style={{ 
                              background: `radial-gradient(circle at 35% 35%, #444 0%, #111 60%, #000 100%)`,
                              boxShadow: `inset 0 0 3px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)`,
                              border: `1.5px solid ${tyreColor || "#555"}`
                            }}
                          >
                            <span className="text-[7.5px] font-extrabold leading-none drop-shadow-md" style={{ color: tyreColor || "#555" }}>{tyreLabel}</span>
                          </div>
                      )
                    )}
                  </div>
                </span>
              )}

              {/* Tyre age - 20px */}
              {settings.showTyreAge && (
                <span className="w-5 flex-shrink-0 text-xs font-extrabold text-[#1a1f2b] text-right" title="Tyre age (laps)">
                  {drv.tyre_life ?? ""}
                </span>
              )}

            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
