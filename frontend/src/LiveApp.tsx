import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveSocket } from '@/hooks/useLiveSocket'
import { useApi } from '@/hooks/useApi'
import TrackCanvas from '@/components/TrackCanvas'
import Leaderboard from '@/components/Leaderboard'
import Draggable from 'react-draggable'
import { GripHorizontal } from 'lucide-react'
import SettingsModal from '@/components/SettingsModal'
import { DigitalTimer } from '@/components/DigitalTimer'
import Standings from '@/components/Standings'
import MicrosectorsBar from '@/components/MicrosectorsBar'
import RCNotifications from '@/components/RCNotifications'
import { Play, Pause, ChevronLeft, Settings, ShieldAlert, FastForward, Rewind, Radio, MousePointerClick } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useTranslation } from '@/i18n'

export default function LiveApp() {
  const { year, round, type } = useParams()
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  const t = useTranslation(settings.language)
  
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isLeaderboardDetached, setIsLeaderboardDetached] = useState(false)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [sessionTargetDate, setSessionTargetDate] = useState<Date | null>(null)
  const [isFetchingEvent, setIsFetchingEvent] = useState(true)
  const [now, setNow] = useState(new Date())

  // Control auto-hide UI
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetControlsTimeout = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  // Keep 'now' updated for the waiting room logic
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch event info to know exactly when this session starts
  useEffect(() => {
    setIsFetchingEvent(true)
    fetch(`/api/seasons/${year}/events`)
      .then(r => r.json())
      .then(res => {
        if (res && res.events) {
          const ev = res.events.find((e: any) => e.round_number === Number(round))
          if (ev && ev.sessions) {
            // Find the session matching the requested type
            const sessionCodes: Record<string, string> = {
              "Race": "R", "Qualifying": "Q", "Sprint": "S", 
              "Sprint Qualifying": "SQ", "Practice 1": "FP1", 
              "Practice 2": "FP2", "Practice 3": "FP3"
            };
            const s = ev.sessions.find((s: any) => sessionCodes[s.name] === type || s.name === type)
            if (s && s.date_utc) {
              setSessionTargetDate(new Date(s.date_utc))
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsFetchingEvent(false))
  }, [year, round, type])
  
  const { data: trackData } = useApi<any>(
    `/api/sessions/${year}/${round}/track?type=${type}`
  );

  const isFutureYear = Number(year) > now.getFullYear();
  // Show waiting room if session is more than 10 minutes away
  const isWaitingRoom = sessionTargetDate 
    ? (sessionTargetDate.getTime() - now.getTime() > 10 * 60 * 1000)
    : false;
  
  // If we are in the waiting room, we force speed=0 so the socket doesn't try to parse fake telemetry
  const speed = isPaused || isWaitingRoom ? 0 : playbackSpeed
  const live = useLiveSocket(Number(year), Number(round), type || "R", speed)

  const handleSkip = (seconds: number) => {
    live.send(JSON.stringify({ command: 'skip', seconds }))
  }

  const handleGoLive = () => {
    setPlaybackSpeed(1)
    setIsPaused(false)
    live.send(JSON.stringify({ command: 'seek', time: live.totalTime }))
  }

  // Handle Scrubber Seek
  const handleSeek = (time: number) => {
    live.send(JSON.stringify({ command: 'seek', time }))
  }
  
  // A race is considered finished if we are more than 4 hours past its start
  const isFinished = sessionTargetDate && now > new Date(sessionTargetDate.getTime() + 4 * 60 * 60 * 1000)
  
  // Backend delay calculation
  const backendDelay = Math.max(0, live.totalTime - (live.frame?.timestamp || 0))
  const isLive = backendDelay < 3 && !isPaused && playbackSpeed === 1

  const handleDriverClick = (abbr: string) => {
    setSelectedDrivers((prev) => {
      // Toggle if already selected
      if (prev.includes(abbr)) return prev.filter((d) => d !== abbr);
      // Add if we have less than 2
      return [...prev, abbr];
    });
  }

  const drivers = live.frame?.drivers || []
  const trackPoints = trackData?.track_points || []
  const rotation = trackData?.rotation || 0
  const rcMessages = live.rcMessages || []

  // Format time function for scrubber
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-[#f4f5f8] text-[#1a1f2b] overflow-hidden relative font-sans" onMouseMove={resetControlsTimeout}>
      
      {/* Dynamic Backgrounds (Sober Light Theme) */}
      <div className="absolute top-0 left-[-10%] w-[50vw] h-[50vw] bg-gray-200/50 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-[-10%] w-[50vw] h-[50vw] bg-blue-100/30 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Top Bar - Controls */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md shrink-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-800">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tight text-[#1a1f2b]">F1 LIVE<span className="text-f1-red">SYNC</span></h1>
          
          {!isWaitingRoom && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${live.connected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                {live.connected ? t('connected') : t('connecting')}
              </span>
              <button
                onClick={() => setIsLeaderboardDetached(!isLeaderboardDetached)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-800"
                title={isLeaderboardDetached ? t('attachLeaderboard') : t('detachLeaderboard')}
              >
                <GripHorizontal size={16} className={isLeaderboardDetached ? "text-f1-red" : ""} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-800"
            title={t('settings')}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {isWaitingRoom ? (
        /* Waiting Room UI */
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-8 overflow-y-auto">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl font-black italic mb-4 uppercase tracking-tighter text-[#1a1f2b]">Sala de Espera</h2>
            <p className="text-gray-500 uppercase tracking-[0.3em] font-bold flex items-center justify-center gap-2 mb-8">
              <ShieldAlert size={16} className="text-f1-red"/> Transmisión aún no iniciada
            </p>
            {sessionTargetDate && (
              <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl p-8 shadow-xl inline-block">
                 <DigitalTimer targetDate={sessionTargetDate.toISOString()} />
              </div>
            )}
          </div>
          
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center animate-in fade-in zoom-in-95 duration-1000 delay-300">
             <div className="hidden lg:block bg-white/50 p-4 rounded-xl shadow-sm border border-gray-100">
               <Standings year={Number(year)} />
             </div>
             <div className="flex justify-center items-center opacity-20 drop-shadow-xl">
                {/* Fallback track display in waiting room */}
                <svg width="400" height="400" viewBox="-10000 -10000 20000 20000" className="pointer-events-none">
                  {trackPoints && trackPoints.length > 0 && (
                    <g transform={`rotate(${rotation})`}>
                      <path
                        d={`M ${trackPoints.map((p: any) => `${p.x},${p.y}`).join(' L ')} Z`}
                        fill="none"
                        stroke="#1a1f2b"
                        strokeWidth="150"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </svg>
             </div>
             <div className="lg:hidden bg-white/50 p-4 rounded-xl shadow-sm border border-gray-100">
               <Standings year={Number(year)} />
             </div>
          </div>
        </div>
      ) : (
        /* Live Telemetry UI */
        <div className="flex-1 flex relative z-10 overflow-hidden">
          
          {/* Left panel - Leaderboard */}
          {!isLeaderboardDetached ? (
            <div className="w-[450px] shrink-0 border-r border-gray-200 bg-white/90 backdrop-blur-md z-20 shadow-2xl overflow-y-auto no-scrollbar">
              <Leaderboard 
                drivers={drivers}
                highlightedDrivers={selectedDrivers}
                onDriverClick={handleDriverClick}
                settings={settings}
                currentTime={live.frame?.timestamp || 0}
                isRace={type === "R" || type === "S"}
                isQualifying={type === "Q" || type === "SQ"}
              />
            </div>
          ) : (
            <Draggable handle=".leaderboard-drag-handle" bounds="parent">
              <div className="absolute top-20 left-4 w-[400px] max-h-[80vh] bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl z-50 shadow-2xl overflow-hidden flex flex-col cursor-move leaderboard-drag-handle">
                <div className="bg-gray-100/80 text-center py-1 text-xs text-gray-500 border-b border-gray-200 uppercase tracking-widest pointer-events-none font-bold">
                  <GripHorizontal size={14} className="inline-block mr-2" />
                  Arrastrar
                </div>
                <div className="overflow-y-auto no-scrollbar flex-1 cursor-default">
                  <Leaderboard 
                    drivers={drivers}
                    highlightedDrivers={selectedDrivers}
                    onDriverClick={handleDriverClick}
                    settings={settings}
                    currentTime={live.frame?.timestamp || 0}
                    isRace={type === "R" || type === "S"}
                    isQualifying={type === "Q" || type === "SQ"}
                    compact={true}
                  />
                </div>
              </div>
            </Draggable>
          )}

          {/* Right panel - Track Canvas */}
          <div className="flex-1 relative bg-transparent z-10">
            <TrackCanvas 
              trackPoints={trackPoints}
              rotation={rotation}
              trackStatus={(live as any).session_info?.TrackStatus || live.frame?.status || "green"}
              drivers={drivers}
              highlightedDrivers={selectedDrivers}
              playbackSpeed={speed}
              showDriverNames={settings.showDriverNames}
              sectorOverlay={trackData?.sector_overlay}
              corners={trackData?.corners}
              marshalSectors={trackData?.marshal_sectors}
              sectorFlags={live.frame?.sector_flags}
              showElevation={settings.showElevation}
              elevationRangeM={trackData?.elevation_range_m}
            />

            {/* Microsectors Overlay */}
            <MicrosectorsBar
              driver={selectedDrivers.length === 1 ? drivers.find(d => d.abbr === selectedDrivers[0]) || null : null}
              isVisible={(type === "Q" || type === "SQ") && selectedDrivers.length === 1}
            />

            {/* Notifications Layer */}
            <RCNotifications messages={rcMessages} currentTime={live.frame?.timestamp || 0} />
          </div>
        </div>
      )}

      {/* Bottom Multimedia Control Bar */}
      {!isWaitingRoom && (
        <div className={`flex flex-col bg-transparent z-40 shrink-0 transition-all duration-700 pb-4 pt-12 absolute bottom-0 left-0 right-0 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>

          {/* Scrubber / Progress Bar */}
          <div className="w-full h-1.5 bg-gray-300 relative group cursor-pointer hover:h-2.5 transition-all duration-200 shadow-sm" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const percent = Math.max(0, Math.min(1, clickX / rect.width))
              handleSeek(percent * live.totalTime)
          }}>
            <div
              className="absolute top-0 left-0 h-full bg-f1-red transition-all duration-300 pointer-events-none"
              style={{ width: `${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%` }}
            />
            {/* Hover Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -translate-x-1/2 bg-[#1a1f2b] text-white px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap hidden group-hover:block font-mono shadow-md"
                 style={{ left: `${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%` }}>
              {formatTime(live.frame?.timestamp || 0)} / {formatTime(live.totalTime || 0)}
            </div>
            {/* Scrubber Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-md opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none"
                 style={{ left: `calc(${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%)` }}
            />
          </div>

          <div className="h-20 flex items-center justify-between px-8 bg-white/60 backdrop-blur-md border-t border-gray-200">
          
          <div className="flex items-center gap-4 w-1/3">
             {isFinished && (
               <div className="flex items-center bg-gray-100/50 border border-gray-200 rounded-xl overflow-hidden p-1 backdrop-blur-md">
                 {[0.5, 1, 2, 4, 8].map(spd => (
                   <button
                     key={spd}
                     onClick={() => { setPlaybackSpeed(spd); setIsPaused(false); }}
                     className={`px-3 py-1.5 text-xs font-bold font-mono transition-all rounded-lg ${
                       playbackSpeed === spd && !isPaused
                         ? 'bg-white text-[#1a1f2b] shadow-sm border border-gray-200'
                         : 'text-gray-500 hover:text-[#1a1f2b] hover:bg-white/50'
                     }`}
                   >
                     x{spd}
                   </button>
                 ))}
               </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-8 w-1/3">
            <button
              onClick={() => handleSkip(-5)}
              className="text-gray-500 hover:text-[#1a1f2b] transition-all hover:scale-110 active:scale-95 bg-white p-2 rounded-full shadow-sm border border-gray-200"
              title="-5s"
            >
              <Rewind size={20} fill="currentColor" />
            </button>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-[#1a1f2b] transition-all hover:scale-110 active:scale-95 bg-white p-4 rounded-full shadow-md border border-gray-200"
            >
              {isPaused ? <Play size={28} fill="currentColor" className="ml-1" /> : <Pause size={28} fill="currentColor" />}
            </button>
            
            <button
              onClick={() => handleSkip(5)}
              className="text-gray-500 hover:text-[#1a1f2b] transition-all hover:scale-110 active:scale-95 bg-white p-2 rounded-full shadow-sm border border-gray-200"
              title="+5s"
            >
              <FastForward size={20} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center justify-end w-1/3 pr-4">
             {!isFinished && (
                <div 
                  className={`flex items-center justify-center p-2 rounded-full ${!isLive ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                  onClick={!isLive ? handleGoLive : undefined}
                  title={!isLive ? "Click to jump to Live" : "Streaming Live"}
                >
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isLive ? 'bg-f1-red shadow-[0_0_8px_rgba(225,6,0,0.6)]' : 'bg-transparent'}`}></div>
                </div>
            )}
          </div>

        </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          update={update}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
