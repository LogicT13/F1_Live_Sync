import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveSocket } from '@/hooks/useLiveSocket'
import { useApi } from '@/hooks/useApi'
import TrackCanvas from '@/components/TrackCanvas'
import Leaderboard from '@/components/Leaderboard'
import Draggable from 'react-draggable'
import { GripHorizontal } from 'lucide-react'
import RCNotifications from '@/components/RCNotifications'
import SettingsModal from '@/components/SettingsModal'
import { DigitalTimer } from '@/components/DigitalTimer'
import Standings from '@/components/Standings'
import { Play, Pause, ChevronLeft, Settings, ShieldAlert, FastForward, Rewind, Radio } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useTranslation } from '@/i18n'

export default function LiveApp() {
  const { year, round, type } = useParams()
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  const t = useTranslation(settings.language)
  
  const [activeDelay, setActiveDelay] = useState<number>(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isLeaderboardDetached, setIsLeaderboardDetached] = useState(false)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [sessionTargetDate, setSessionTargetDate] = useState<Date | null>(null)
  const [isFetchingEvent, setIsFetchingEvent] = useState(true)
  const [now, setNow] = useState(new Date())

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
  const isWaitingRoom = isFetchingEvent 
    ? true // block data while fetching
    : (sessionTargetDate ? now < sessionTargetDate : isFutureYear);
  
  // If we are in the waiting room, we force speed=0 so the socket doesn't try to parse fake telemetry
  const speed = isPaused || isWaitingRoom ? 0 : playbackSpeed
  const live = useLiveSocket(Number(year), Number(round), type || "R", speed, activeDelay)

  const handleSkip = (seconds: number) => {
    // Skipping forward (+seconds) reduces the delay. Skipping backward increases it.
    setActiveDelay(prev => Math.max(0, prev - seconds))
  }

  const handleGoLive = () => {
    setActiveDelay(0)
    setPlaybackSpeed(1)
    setIsPaused(false)
  }
  
  // A race is considered finished if we are more than 4 hours past its start
  const isFinished = sessionTargetDate && now > new Date(sessionTargetDate.getTime() + 4 * 60 * 60 * 1000)
  const isLive = activeDelay === 0 && !isPaused && playbackSpeed === 1

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

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1d] text-white overflow-hidden relative">
      
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
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide ${live.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {live.connected ? t('connected') : t('connecting')}
            </span>
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
          
          {/* Top floating controls (Detach Leaderboard) */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => setIsLeaderboardDetached(!isLeaderboardDetached)}
              className="bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white p-2 rounded-lg border border-white/10 shadow-xl backdrop-blur-sm transition-all"
              title={isLeaderboardDetached ? t('attachLeaderboard') : t('detachLeaderboard')}
            >
              <GripHorizontal size={20} className={isLeaderboardDetached ? "text-f1-red" : ""} />
            </button>
          </div>

          {/* Left panel - Leaderboard */}
          {!isLeaderboardDetached ? (
            <div className="w-[450px] shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-sm z-20 shadow-2xl overflow-y-auto no-scrollbar pt-16">
              {drivers.length > 0 ? (
                <Leaderboard 
                  drivers={drivers}
                  highlightedDrivers={selectedDrivers}
                  onDriverClick={handleDriverClick}
                  settings={settings}
                  currentTime={live.frame?.timestamp || 0}
                  isRace={type === "R" || type === "S"}
                  isQualifying={type === "Q" || type === "SQ"}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  {t('waitingDrivers')}
                </div>
              )}
            </div>
          ) : (
            <Draggable handle=".leaderboard-drag-handle" bounds="parent">
              <div className="absolute top-20 left-4 w-[400px] max-h-[80vh] bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl z-50 shadow-2xl overflow-hidden flex flex-col cursor-move leaderboard-drag-handle">
                <div className="bg-black/40 text-center py-1 text-xs text-gray-500 border-b border-white/5 uppercase tracking-widest pointer-events-none">
                  <GripHorizontal size={14} className="inline-block mr-2" />
                  Arrastrar
                </div>
                <div className="overflow-y-auto no-scrollbar flex-1 cursor-default">
                  {drivers.length > 0 ? (
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
                  ) : (
                    <div className="p-8 text-center text-gray-500 italic">
                      {t('waitingDrivers')}
                    </div>
                  )}
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
                playbackSpeed={speed}
                showDriverNames={settings.showDriverNames}
                sectorOverlay={trackData?.sector_overlay}
                corners={trackData?.corners}
                marshalSectors={trackData?.marshal_sectors}
                sectorFlags={(live as any).session_info?.SectorFlags}
                showElevation={settings.showElevation}
                elevationRangeM={trackData?.elevation_range_m}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 italic">
                {t('loadingTrack')}
              </div>
            )}

            {/* Notifications Layer */}
            <div className="absolute top-4 right-4 pointer-events-none z-50">
              <RCNotifications messages={rcMessages} currentTime={live.frame?.timestamp || 0} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Multimedia Control Bar */}
      {!isWaitingRoom && (
        <div className="h-20 bg-black/40 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-8 z-40 shrink-0">
          
          <div className="flex items-center gap-4 w-1/3">
             <button
                onClick={handleGoLive}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 border ${
                  isLive 
                    ? 'bg-f1-red/20 text-f1-red border-f1-red/50 shadow-[0_0_15px_rgba(225,6,0,0.4)]' 
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Radio size={16} className={isLive ? "animate-pulse" : ""} />
                LIVE
              </button>
              
              {!isLive && activeDelay > 0 && (
                <span className="text-xs font-mono text-gray-400 font-medium bg-black/50 px-2 py-1 rounded-md border border-white/5">
                  -{activeDelay.toFixed(1)}s
                </span>
              )}
          </div>

          <div className="flex items-center justify-center gap-6 w-1/3">
            <button
              onClick={() => handleSkip(-5)}
              className="p-3 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-all hover:scale-110 active:scale-95"
              title="-5s"
            >
              <Rewind size={24} fill="currentColor" />
            </button>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl ${
                isPaused 
                  ? 'bg-f1-red text-white shadow-f1-red/30' 
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {isPaused ? <Play size={28} fill="currentColor" className="ml-1" /> : <Pause size={28} fill="currentColor" />}
            </button>
            
            <button
              onClick={() => handleSkip(5)}
              className="p-3 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-all hover:scale-110 active:scale-95"
              title="+5s"
            >
              <FastForward size={24} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center justify-end w-1/3">
            {isFinished && (
               <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden p-1 backdrop-blur-md">
                 {[0.5, 1, 2, 4, 8].map(spd => (
                   <button
                     key={spd}
                     onClick={() => setPlaybackSpeed(spd)}
                     className={`px-3 py-1.5 text-xs font-bold font-mono transition-all rounded-lg ${
                       playbackSpeed === spd && !isPaused
                         ? 'bg-f1-red text-white shadow-md'
                         : 'text-gray-400 hover:text-white hover:bg-white/5'
                     }`}
                   >
                     x{spd}
                   </button>
                 ))}
               </div>
            )}
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
