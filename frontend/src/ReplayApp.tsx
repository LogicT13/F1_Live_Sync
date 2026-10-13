import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReplaySocket } from '@/hooks/useReplaySocket'
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

export default function ReplayApp() {
  const { year, round, type } = useParams()
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  const t = useTranslation(settings.language)
  
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

  // Default to true if year is in the future, otherwise wait for sessionTargetDate
  const isFutureYear = Number(year) > now.getFullYear();
  // Remove waiting room UI restriction so it always shows the circuit & leaderboard
  const isWaitingRoom = false;
  
  // If we are in the waiting room, we force speed=0 so the socket doesn't try to parse fake telemetry
  const live = useReplaySocket(Number(year), Number(round), type || "R")

  const handleSkip = (seconds: number) => {
    if (live.frame) live.seek(live.frame.timestamp + seconds)
  }

  const handleGoLive = () => {
  }

  // Handle Scrubber Seek
  const handleSeek = (time: number) => {
    live.seek(time)
  }
  
  // A race is considered finished if we are more than 4 hours past its start
  const isFinished = live.finished
  const isLive = false

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
  const rcMessages = live.frame?.rc_messages || []

  // Format time function for scrubber
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1d] text-white overflow-hidden relative" onMouseMove={resetControlsTimeout}>
      
      {/* Dynamic Backgrounds */}
      <div className="absolute top-0 left-[-10%] w-[50vw] h-[50vw] bg-f1-red/5 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute bottom-0 right-[-10%] w-[50vw] h-[50vw] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0"></div>

      {/* Top Bar - Controls */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold italic tracking-wider text-white">F1 LIVE<span className="text-f1-red">SYNC</span></h1>
          
          {!isWaitingRoom && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide ${live.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {live.connected ? t('connected') : t('connecting')}
              </span>
              <button
                onClick={() => setIsLeaderboardDetached(!isLeaderboardDetached)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
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
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
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
            <h2 className="text-5xl font-bold italic mb-4 uppercase tracking-tighter text-white/90">Sala de Espera</h2>
            <p className="text-gray-400 uppercase tracking-[0.3em] font-semibold flex items-center justify-center gap-2 mb-8">
              <ShieldAlert size={16} className="text-f1-red"/> TransmisiÃ³n aÃºn no iniciada
            </p>
            {sessionTargetDate && (
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl inline-block">
                 <DigitalTimer targetDate={sessionTargetDate.toISOString()} />
              </div>
            )}
          </div>
          
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center animate-in fade-in zoom-in-95 duration-1000 delay-300">
             <div className="hidden lg:block">
               <Standings year={Number(year)} />
             </div>
             <div className="flex justify-center items-center opacity-30 drop-shadow-2xl">
                {/* Fallback track display in waiting room */}
                <svg width="400" height="400" viewBox="-10000 -10000 20000 20000" className="pointer-events-none">
                  {trackPoints && trackPoints.length > 0 && (
                    <g transform={`rotate(${rotation})`}>
                      <path
                        d={`M ${trackPoints.map((p: any) => `${p.x},${p.y}`).join(' L ')} Z`}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="100"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </svg>
             </div>
             <div className="lg:hidden">
               <Standings year={Number(year)} />
             </div>
          </div>
        </div>
      ) : (
        /* Live Telemetry UI */
        <div className="flex-1 flex relative z-10 overflow-hidden">
          
          {/* Left panel - Leaderboard */}
          {!isLeaderboardDetached ? (
            <div className="w-[450px] shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-sm z-20 shadow-2xl overflow-y-auto no-scrollbar">
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
              <div className="absolute top-20 left-4 w-[400px] max-h-[80vh] bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl z-50 shadow-2xl overflow-hidden flex flex-col cursor-move leaderboard-drag-handle">
                <div className="bg-black/40 text-center py-1 text-xs text-gray-500 border-b border-white/5 uppercase tracking-widest pointer-events-none">
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
            {trackPoints.length > 0 ? (
              <TrackCanvas 
                trackPoints={trackPoints}
                rotation={rotation}
                trackStatus={(live as any).session_info?.TrackStatus || live.frame?.status || "green"}
                drivers={drivers}
                highlightedDrivers={selectedDrivers}
                playbackSpeed={live.speed}
                showDriverNames={settings.showDriverNames}
                sectorOverlay={trackData?.sector_overlay}
                corners={trackData?.corners}
                marshalSectors={trackData?.marshal_sectors}
                sectorFlags={live.frame?.sector_flags}
                showElevation={settings.showElevation}
                elevationRangeM={trackData?.elevation_range_m}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 italic">
                {t('loadingTrack')}
              </div>
            )}

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
          <div className="w-full h-1 bg-white/10 relative group cursor-pointer hover:h-2 transition-all duration-200" onClick={(e) => {
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
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -translate-x-1/2 bg-black px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap hidden group-hover:block"
                 style={{ left: `${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%` }}>
              {formatTime(live.frame?.timestamp || 0)} / {formatTime(live.totalTime || 0)}
            </div>
            {/* Scrubber Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none"
                 style={{ left: `calc(${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%)` }}
            />
          </div>

          <div className="h-20 flex items-center justify-between px-8">
          
          <div className="flex items-center gap-4 w-1/3">
             {/* Empty left side or could have speeds here */}
             {isFinished && (
               <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden p-1 backdrop-blur-md">
                 {[0.5, 1, 2, 4, 8].map(spd => (
                   <button
                     key={spd}
                     onClick={() => live.setSpeed(spd)}
                     className={`px-3 py-1.5 text-xs font-bold font-mono transition-all rounded-lg ${
                       live.speed === spd && live.playing
                         ? 'bg-white/20 text-white shadow-md'
                         : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              className="text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95"
              title="-5s"
            >
              <Rewind size={20} fill="currentColor" />
            </button>
            
            <button
              onClick={() => live.playing ? live.pause() : live.play()}
              className="text-white transition-all hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            >
              {!live.playing ? <Play size={32} fill="currentColor" className="ml-1" /> : <Pause size={32} fill="currentColor" />}
            </button>
            
            <button
              onClick={() => handleSkip(5)}
              className="text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95"
              title="+5s"
            >
              <FastForward size={20} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center justify-end w-1/3 pr-4">
             {!isFinished && (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isLive && live.playing ? 'bg-f1-red shadow-[0_0_8px_rgba(225,6,0,1)]' : 'bg-gray-600'}`}></div>
                    <span className={`text-[10px] font-bold tracking-widest transition-colors ${isLive && live.playing ? 'text-white' : 'text-gray-500'}`}>LIVE</span>
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
