import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import FlipClock from './FlipClock';
import { Calendar, ChevronRight, Flag, MapPin } from 'lucide-react';

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
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    apiFetch<any>(`/api/seasons/${currentYear}/events`)
      .then(res => {
        setEvents(res.events || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [currentYear]);

  if (loading) {
    return <div className="h-screen bg-[#15151e] flex items-center justify-center text-white">Cargando calendario...</div>;
  }

  const now = new Date();
  
  // Find past, next, and future events
  const pastEvents = events.filter(e => new Date(e.event_date) < now);
  const futureEvents = events.filter(e => new Date(e.event_date) >= now);
  
  const nextEvent = futureEvents.length > 0 ? futureEvents[0] : null;
  const otherFutureEvents = futureEvents.slice(1);

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

  return (
    <div className="min-h-screen bg-[#15151e] text-white p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-4xl font-bold italic tracking-wider">F1 LIVE<span className="text-f1-red">SYNC</span></h1>
          <div className="text-gray-400 font-medium">Temporada {currentYear}</div>
        </header>

        {nextEvent && (
          <section className="mb-16">
            <h2 className="text-f1-red font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <Flag size={16} /> PROXIMA CARRERA (T-Minus)
            </h2>
            <div className="bg-black/40 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Calendar size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-1">{nextEvent.event_name}</h3>
                <p className="text-gray-400 flex items-center gap-2 mb-8">
                  <MapPin size={16} /> {nextEvent.location}, {nextEvent.country}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {nextEvent.sessions.map((session, idx) => {
                    const sessionDate = session.date_utc ? new Date(session.date_utc) : null;
                    const isFuture = sessionDate && sessionDate > now;
                    return (
                      <div key={idx} className="bg-[#1a1a24] p-6 rounded-xl border border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-lg">{getSessionLabel(session.name)}</span>
                          <span className="text-gray-400 text-sm">
                            {sessionDate ? sessionDate.toLocaleString() : 'TBA'}
                          </span>
                        </div>
                        {isFuture && session.date_utc ? (
                          <FlipClock targetDate={session.date_utc} />
                        ) : (
                          <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                            <span className="text-green-400 font-bold">Sesion Finalizada</span>
                            <button 
                              onClick={() => navigate(`/live/${currentYear}/${nextEvent.round_number}/${getTypeCode(session.name)}`)}
                              className="px-4 py-2 bg-f1-red hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
                            >
                              Ver Replay
                            </button>
                          </div>
                        )}
                        {isFuture && session.date_utc && sessionDate && (sessionDate.getTime() - now.getTime() < 1000 * 60 * 60 * 24) && (
                           <button 
                           onClick={() => navigate(`/live/${currentYear}/${nextEvent.round_number}/${getTypeCode(session.name)}`)}
                           className="mt-4 w-full px-4 py-3 bg-f1-red hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm text-center"
                         >
                           Ir a Sesion en Vivo
                         </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Past Events */}
          <section>
            <h2 className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-6 border-b border-gray-800 pb-2">
              Carreras Anteriores
            </h2>
            <div className="space-y-3">
              {pastEvents.slice().reverse().map((evt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/20 p-4 rounded-lg border border-gray-800/50 hover:border-gray-600 transition-colors">
                  <div>
                    <div className="font-bold">{evt.event_name}</div>
                    <div className="text-sm text-gray-500">{new Date(evt.event_date).toLocaleDateString()} - {evt.country}</div>
                  </div>
                  <button 
                    onClick={() => navigate(`/live/${currentYear}/${evt.round_number}/R`)}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors text-f1-red"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              ))}
              {pastEvents.length === 0 && <div className="text-gray-500 italic">No hay carreras pasadas aun.</div>}
            </div>
          </section>

          {/* Future Events */}
          <section>
            <h2 className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-6 border-b border-gray-800 pb-2">
              Proximas Carreras
            </h2>
            <div className="space-y-3">
              {otherFutureEvents.map((evt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/10 p-4 rounded-lg border border-transparent">
                  <div>
                    <div className="font-bold text-gray-300">{evt.event_name}</div>
                    <div className="text-sm text-gray-600">{new Date(evt.event_date).toLocaleDateString()} - {evt.country}</div>
                  </div>
                </div>
              ))}
              {otherFutureEvents.length === 0 && <div className="text-gray-500 italic">No hay mas carreras esta temporada.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
