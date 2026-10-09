import re

with open('frontend/src/LiveApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Play, Pause, ChevronLeft, Minus, Plus, Settings, ShieldAlert } from 'lucide-react'",
    "import { Play, Pause, ChevronLeft, Settings, ShieldAlert, FastForward, Rewind, Radio } from 'lucide-react'"
)

# 2. Update states and functions
states_old = '''  const [delayInput, setDelayInput] = useState<string>("0")
  const [activeDelay, setActiveDelay] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [sessionTargetDate, setSessionTargetDate] = useState<Date | null>(null)
  const [isFetchingEvent, setIsFetchingEvent] = useState(true)
  const [now, setNow] = useState(new Date())'''

states_new = '''  const [activeDelay, setActiveDelay] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [sessionTargetDate, setSessionTargetDate] = useState<Date | null>(null)
  const [isFetchingEvent, setIsFetchingEvent] = useState(true)
  const [now, setNow] = useState(new Date())'''
content = content.replace(states_old, states_new)

# 3. Update speed logic
speed_old = '''  // If we are in the waiting room, we force speed=0 so the socket doesn't try to parse fake telemetry
  const speed = isPaused || isWaitingRoom ? 0 : 1'''
speed_new = '''  // If we are in the waiting room, we force speed=0 so the socket doesn't try to parse fake telemetry
  const speed = isPaused || isWaitingRoom ? 0 : playbackSpeed'''
content = content.replace(speed_old, speed_new)

# 4. Remove handleApplyDelay and handleIncrementDelay, add new handlers
handlers_old = '''  const handleApplyDelay = (override?: number) => {
    const parsed = override !== undefined ? override : parseFloat(delayInput)
    if (!isNaN(parsed)) {
      setActiveDelay(parsed)
      setDelayInput(parsed.toFixed(1))
    }
  }

  const handleIncrementDelay = (amount: number) => {
    const current = parseFloat(delayInput) || 0
    const next = current + amount
    setDelayInput(next.toFixed(1))
    handleApplyDelay(next)
  }'''
handlers_new = '''  const handleSkip = (seconds: number) => {
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
  const isLive = activeDelay === 0 && !isPaused && playbackSpeed === 1'''
content = content.replace(handlers_old, handlers_new)

# 5. Remove Top Bar Controls
topbar_controls = '''          {!isWaitingRoom && (
            <>
              <div className="flex items-center bg-black/50 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                <button
                  onClick={() => handleIncrementDelay(-5)}
                  className="px-3 py-1.5 hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <div className="flex flex-col items-center px-2 py-1 min-w-[80px]">
                  <span className="text-xs text-gray-500 font-bold uppercase">{t('delay')}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={delayInput}
                      onChange={(e) => setDelayInput(e.target.value)}
                      onBlur={() => handleApplyDelay()}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDelay()}
                      className="w-12 bg-transparent text-center font-mono font-bold text-sm text-f1-red outline-none"
                    />
                    <span className="text-xs text-gray-400 font-mono">s</span>
                  </div>
                </div>
                <button
                  onClick={() => handleIncrementDelay(5)}
                  className="px-3 py-1.5 hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all duration-200 border ${
                    isPaused 
                      ? 'bg-f1-red text-white border-f1-red shadow-lg shadow-f1-red/20' 
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                  {isPaused ? t('resume') : t('pause')}
                </button>
              </div>
            </>
          )}'''
content = content.replace(topbar_controls, "")

# 6. Add Bottom Bar
bottom_bar = '''      )}

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
'''
content = content.replace("      )}\n\n      {showSettings && (", bottom_bar)

with open('frontend/src/LiveApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
