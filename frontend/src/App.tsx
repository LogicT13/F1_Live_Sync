import { useState, useEffect } from 'react'
import { useLiveSocket } from '@/hooks/useLiveSocket'
import { useApi } from '@/hooks/useApi'
import TrackCanvas from '@/components/TrackCanvas'
import Leaderboard from '@/components/Leaderboard'
import { Play, Pause } from 'lucide-react'

// Dummy default settings to satisfy the Leaderboard component
const defaultSettings = {
  showLeaderboard: true,
  showTeamAbbr: true,
  showTyreAge: true,
  showTyreType: true,
  showPitStops: true,
  showTyreHistory: false,
  showGridChange: true,
  showBestLapTime: true,
  showGapToLeader: true,
  showSessionTime: true,
  showDriverNames: false,
  showWeather: false,
  showAirTemp: false,
  showTrackTemp: false,
  showHumidity: false,
  showWind: false,
  showRainfall: false,
  showPitPrediction: false,
  showPitConfidence: false,
  showPitFreeAir: false,
  showLastLapTime: true,
  showSectors: true,
  showLapNotifications: false,
  highlightClose: true,
  useImperial: false,
  showTrackFlags: true,
  showCorners: true,
  showMarshalSectors: true,
  showElevation: true,
  rcSound: true,
}

// Fixed session for now, we can make it dynamic later
const YEAR = 2024
const ROUND = 21 // Sao Paulo GP (example)
const SESSION_TYPE = "R"

function App() {
  const [delayInput, setDelayInput] = useState<string>("0")
  const [activeDelay, setActiveDelay] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  
  const { data: trackData } = useApi<any>(
    `/api/sessions/${YEAR}/${ROUND}/track?type=${SESSION_TYPE}`
  );

  // Speed is 0 when paused, 1 when playing (for interpolation)
  const speed = isPaused ? 0 : 1

  // Connect to live socket
  const live = useLiveSocket(YEAR, ROUND, SESSION_TYPE, speed, activeDelay)

  const handleApplyDelay = () => {
    const parsed = parseFloat(delayInput)
    if (!isNaN(parsed)) {
      setActiveDelay(parsed)
    }
  }

  const handleDriverClick = (abbr: string) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(abbr)) return prev.filter((d) => d !== abbr);
      if (prev.length >= 2) return [prev[1], abbr];
      return [...prev, abbr];
    });
  }

  const drivers = live.frame?.drivers || []
  const trackPoints = trackData?.track_points || []
  const rotation = trackData?.rotation || 0

  return (
    <div className="h-screen flex flex-col bg-f1-dark text-white overflow-hidden">
      {/* Top Bar - Controls */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-f1-border bg-[#1a1a24] shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold italic tracking-wider text-white">F1 LIVE<span className="text-f1-red">SYNC</span></h1>
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-bold uppercase tracking-wide">
            {live.connected ? "Connected" : "Connecting..."}
          </span>
        </div>
        
        {/* Custom Controls requested by user */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-f1-border">
            <label className="text-sm text-gray-400 font-medium">Delay (segundos):</label>
            <input 
              type="number" 
              className="w-20 bg-transparent text-white font-mono text-center outline-none border-b border-gray-600 focus:border-f1-red px-1"
              value={delayInput}
              onChange={(e) => setDelayInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyDelay()}
            />
            <button 
              onClick={handleApplyDelay}
              className="ml-2 px-3 py-1 bg-gray-700 hover:bg-f1-red transition-colors rounded text-sm font-bold"
            >
              Aplicar
            </button>
          </div>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
              isPaused ? "bg-f1-red hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
            {isPaused ? "REANUDAR" : "PAUSAR"}
          </button>
        </div>
      </div>

      {/* Main Layout: Leaderboard on the Left, Track on the Right */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Leaderboard */}
        <div className="w-[450px] shrink-0 border-r border-f1-border bg-black/20 overflow-y-auto no-scrollbar">
          {drivers.length > 0 ? (
            <Leaderboard 
              drivers={drivers}
              highlightedDrivers={selectedDrivers}
              onDriverClick={handleDriverClick}
              settings={defaultSettings}
              currentTime={live.frame?.session_time || 0}
              isRace={SESSION_TYPE === "R" || SESSION_TYPE === "S"}
              isQualifying={SESSION_TYPE === "Q" || SESSION_TYPE === "SQ"}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 italic">
              Esperando datos de pilotos...
            </div>
          )}
        </div>

        {/* Right Side: Track Map */}
        <div className="flex-1 relative bg-f1-dark/50">
          {trackPoints.length > 0 ? (
            <TrackCanvas
              trackPoints={trackPoints}
              rotation={rotation}
              drivers={drivers}
              highlightedDrivers={selectedDrivers}
              trackStatus={live.frame?.status || "green"}
              playbackSpeed={speed}
              showDriverNames={false}
              corners={trackData?.corners}
              marshalSectors={trackData?.marshal_sectors}
              showElevation={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 italic">
              Cargando circuito...
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default App
