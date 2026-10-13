import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { DigitalTimer } from './DigitalTimer';
import Standings from './Standings';
import { HeadToHead } from './HeadToHead';
import { Calendar, ChevronRight, Flag, MapPin, Clock } from 'lucide-react';
import TrackMiniature from './TrackMiniature';

interface Session {
  name: string;
  date_utc: string | null;
  available: boolean;
  precomputed: boolean;
}

interface Event {
  round_number: number;
  country: string;
  event_name: string;
  location: string;
  event_date: string;
  sessions: Session[];
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'standings' | 'h2h'>('calendar');
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<any>(`/api/seasons/${currentYear}/events`)
      .then(res => {
        if (!res || !res.events) {
           throw new Error("Respuesta inválida de la API");
        }
        setEvents(res.events);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fallo al conectar con el backend:", err);
        setError("No se pudo conectar al backend de F1 LiveSync.");
        setLoading(false);
      });
  }, [currentYear]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0f1d] text-white p-8 flex items-center justify-center">Cargando temporada...</div>;
  }

  if (error || events.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="text-f1-red text-6xl mb-4">⚠️</div>
        <h2 className="text-3xl font-bold mb-2">Error de Conexión</h2>
        <p className="text-gray-400 mb-6">{error || "El backend no devolvió el calendario."}</p>
        <p className="text-sm text-gray-500 bg-black/20 p-4 rounded-lg border border-white/10 max-w-md shadow-2xl">
          Asegurate de estar corriendo el servidor de FastAPI en el puerto 8000 en otra terminal.
          <br /><br />
          <code className="text-gray-400 bg-black/40 px-2 py-1 rounded">cd backend</code><br />
          <code className="text-gray-400 bg-black/40 px-2 py-1 rounded">uvicorn main:app --port 8000</code>
        </p>
      </div>
    );
  }

  const now = new Date();
  
  // Encontrar la próxima carrera (primer evento con al menos una sesión en el futuro o muy reciente)
  const nextEventIndex = events.findIndex(evt => {
    if (!evt.sessions) return false;
    // Si la última sesión del evento es en el futuro, o pasó hace muy poco
    const lastSession = evt.sessions[evt.sessions.length - 1];
    if (lastSession && lastSession.date_utc) {
      return new Date(lastSession.date_utc) > now;
    }
    return new Date(evt.event_date) >= now;
  });

  let nextEvent = null;
  let pastEvents = events;
  let otherFutureEvents: Event[] = [];

  if (nextEventIndex !== -1) {
    nextEvent = events[nextEventIndex];
    pastEvents = events.slice(0, nextEventIndex);
    otherFutureEvents = events.slice(nextEventIndex + 1);
  }

  const getSessionLabel = (name: string) => {
    const labels: Record<string, string> = {
      "Race": "Carrera",
      "Qualifying": "Clasificacion",
      "Sprint": "Sprint",
      "Sprint Qualifying": "Clasif. Sprint",
      "Sprint Shootout": "Sprint Shootout",
      "Practice 1": "Practica 1",
      "Practice 2": "Practica 2",
      "Practice 3": "Practica 3",
    };
    return labels[name] || name;
  };

  const getTypeCode = (name: string) => {
    const codes: Record<string, string> = {
      "Race": "R", "Qualifying": "Q", "Sprint": "S", 
      "Sprint Qualifying": "SQ", "Practice 1": "FP1", 
      "Practice 2": "FP2", "Practice 3": "FP3"
    };
    return codes[name] || "R";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString();
  };

  // Find the single absolute next session for the master timer
  let masterNextSession: Session | null = null;
  if (nextEvent && nextEvent.sessions) {
    masterNextSession = nextEvent.sessions.find(s => s.date_utc && new Date(s.date_utc) > now) || null;
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-8 overflow-y-auto relative selection:bg-f1-red/30">
      {/* Dynamic Glassmorphism Background Blobs */}
      <div className="fixed top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-f1-red/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen"></div>
      <div className="fixed bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-5xl font-bold italic tracking-tighter">F1 LIVE<span className="text-f1-red">SYNC</span></h1>
            <div className="text-gray-400 font-medium tracking-widest uppercase text-sm mt-2">Temporada {currentYear}</div>
          </div>
          <div className="flex bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/5 shadow-xl">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ease-out ${activeTab === 'calendar' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Calendario
            </button>
            <button 
              onClick={() => setActiveTab('standings')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ease-out ${activeTab === 'standings' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Campeonatos
            </button>
            <button 
              onClick={() => setActiveTab('h2h')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ease-out ${activeTab === 'h2h' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Comparativa H2H
            </button>
          </div>
        </header>

        {activeTab === 'calendar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {nextEvent && (
              <section className="mb-16">
                <h2 className="text-f1-red font-bold uppercase tracking-[0.2em] text-xs mb-4 flex items-center gap-2">
                  <Flag size={14} /> GRAN PREMIO EN CURSO
                </h2>
                
                {/* Glassmorphism Panel */}
                <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-8 w-64 h-64 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
                    <TrackMiniature year={currentYear} round={nextEvent.round_number} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start lg:items-center justify-between mb-10">
                    <div>
                      <h3 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">{nextEvent.event_name}</h3>
                      <p className="text-gray-400 flex items-center gap-2 text-lg font-light">
                        <MapPin size={18} className="text-f1-red" /> {nextEvent.location}, {nextEvent.country}
                      </p>
                    </div>
                    
                    {/* Master Timer */}
                    {masterNextSession && masterNextSession.date_utc && (
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-inner">
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Clock size={12} className="text-f1-red"/> Siguiente: {getSessionLabel(masterNextSession.name)}
                        </div>
                        <DigitalTimer targetDate={masterNextSession.date_utc} />
                      </div>
                    )}
                  </div>

                  {/* Sessions Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {nextEvent.sessions.map((session, idx) => {
                      const sessionDate = session.date_utc ? new Date(session.date_utc) : null;
                      
                      const sessionDurations: Record<string, number> = {
                        "Race": 7200,
                        "Qualifying": 4200,
                        "Sprint": 3600,
                        "Sprint Qualifying": 3000,
                        "Sprint Shootout": 3000,
                        "Practice 1": 3600,
                        "Practice 2": 3600,
                        "Practice 3": 3600,
                      };
                      const durationSecs = sessionDurations[session.name] || 3600;
                      const sessionEnd = sessionDate ? new Date(sessionDate.getTime() + durationSecs * 1000) : null;
                      const sessionStartWithPre = sessionDate ? new Date(sessionDate.getTime() - 15 * 60 * 1000) : null;
                      
                      const isLive = sessionStartWithPre && sessionEnd && now >= sessionStartWithPre && now <= sessionEnd;
                      const isFuture = sessionStartWithPre && now < sessionStartWithPre;

                      const isMaster = masterNextSession === session;

                      return (
                        <div key={idx} className={`bg-white/5 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-200 hover:bg-white/10 ${isMaster ? 'border-f1-red/50 shadow-[0_0_15px_rgba(225,6,0,0.15)]' : 'border-white/5'}`}>
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <span className="font-bold text-base block mb-1 text-white/90">{getSessionLabel(session.name)}</span>
                              <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">
                                {sessionDate ? sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                                <br />
                                {sessionDate ? sessionDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            
                            <div className="mt-6">
                              {isLive ? (
                                <button 
                                  onClick={() => navigate(`/live/${currentYear}/${nextEvent?.round_number}/${getTypeCode(session.name)}`)}
                                  className="w-full py-2.5 bg-f1-red hover:bg-red-600 text-white font-bold rounded-lg transition-colors text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                >
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                  </span>
                                  En Vivo
                                </button>
                              ) : isFuture ? (
                                <div className="text-gray-500 text-xs font-semibold uppercase tracking-widest text-center py-2.5 border border-white/5 rounded-lg bg-black/20">
                                  En Espera
                                </div>
                              ) : (
                                <button 
                                  onClick={() => navigate(`/replay/${currentYear}/${nextEvent?.round_number}/${getTypeCode(session.name)}`)}
                                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors text-xs uppercase tracking-wider border border-white/10"
                                >
                                  Ver Replay
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Past Events */}
              <section>
                <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                  Carreras Anteriores
                </h2>
                <div className="space-y-3">
                  {pastEvents.slice().reverse().map((evt, idx) => (
                    <div key={idx} className="group flex items-center justify-between bg-black/20 backdrop-blur-md p-5 rounded-xl border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-200 ease-out opacity-60 hover:opacity-100">
                      <div>
                        <div className="font-bold text-gray-300 text-lg group-hover:text-white transition-colors">{evt.event_name}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-1">{formatDate(evt.event_date)} &bull; {evt.country}</div>
                      </div>
                      <button 
                        onClick={() => navigate(`/replay/${currentYear}/${evt.round_number}/R`)}
                        className="p-3 bg-white/5 group-hover:bg-f1-red rounded-full transition-all duration-300 text-gray-400 group-hover:text-white"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))}
                  {pastEvents.length === 0 && <div className="text-gray-600 italic text-sm">No hay carreras pasadas aun.</div>}
                </div>
              </section>

              {/* Future Events */}
              <section>
                <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                  Próximas Carreras
                </h2>
                <div className="space-y-3">
                  {otherFutureEvents.map((evt, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/10 backdrop-blur-sm p-5 rounded-xl border border-transparent">
                      <div>
                        <div className="font-bold text-gray-400 text-lg">{evt.event_name}</div>
                        <div className="text-xs text-gray-600 uppercase tracking-wider font-medium mt-1">{formatDate(evt.event_date)} &bull; {evt.country}</div>
                      </div>
                    </div>
                  ))}
                  {otherFutureEvents.length === 0 && <div className="text-gray-600 italic text-sm">No hay mas carreras esta temporada.</div>}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Standings year={currentYear} />
          </div>
        )}

        {activeTab === 'h2h' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <HeadToHead />
          </div>
        )}

      </div>
    </div>
  );
}
