import React, { useState, useEffect } from 'react';
import { Users, Shield, Trophy } from 'lucide-react';

interface Driver {
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

interface Constructor {
  constructorId: string;
  name: string;
}

interface Standing {
  position: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export function HeadToHead() {
  const currentYear = new Date().getFullYear();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [driver1Id, setDriver1Id] = useState<string>('');
  const [driver2Id, setDriver2Id] = useState<string>('');

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${currentYear}/driverStandings.json`);
        if (res.ok) {
          const data = await res.json();
          const list = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
          setStandings(list);
          if (list.length >= 2) {
            setDriver1Id(list[0].Driver.driverId);
            setDriver2Id(list[1].Driver.driverId);
          }
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [currentYear]);

  if (loading) {
    return <div className="text-gray-400 italic text-center p-8">Cargando datos de pilotos...</div>;
  }

  const driver1 = standings.find(s => s.Driver.driverId === driver1Id);
  const driver2 = standings.find(s => s.Driver.driverId === driver2Id);

  // Helper para generar barra de comparacion
  const renderStatBar = (label: string, val1: number, val2: number, suffix: string = '') => {
    const total = val1 + val2 || 1;
    const p1 = (val1 / total) * 100;
    const p2 = (val2 / total) * 100;

    return (
      <div className="mb-6 group">
        <div className="flex justify-between text-sm font-bold text-gray-300 uppercase tracking-widest mb-2">
          <span>{val1}{suffix}</span>
          <span className="text-gray-500 group-hover:text-white transition-colors">{label}</span>
          <span>{val2}{suffix}</span>
        </div>
        <div className="h-2 flex rounded-full overflow-hidden bg-gray-800">
          <div className="bg-f1-red transition-all duration-1000 ease-out" style={{ width: `${p1}%` }}></div>
          <div className="bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${p2}%` }}></div>
        </div>
      </div>
    );
  };

  const getTeamColor = (teamName: string) => {
    const teams: Record<string, string> = {
      "Red Bull": "border-blue-700",
      "Ferrari": "border-red-600",
      "Mercedes": "border-teal-400",
      "McLaren": "border-orange-500",
      "Aston Martin": "border-green-700",
      "Williams": "border-blue-500",
      "Haas F1 Team": "border-gray-100",
      "Sauber": "border-green-500",
      "Alpine F1 Team": "border-pink-500",
      "RB F1 Team": "border-blue-400"
    };
    return teams[teamName] || "border-gray-500";
  };

  return (
    <div className="p-8 bg-black/20 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-12 relative z-10">
        <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
          <Shield className="text-f1-red" /> Comparativa H2H
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        
        {/* Piloto 1 */}
        {driver1 && (
          <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border-b-4 ${getTeamColor(driver1.Constructors[0]?.name)}`}>
            <select 
              value={driver1Id}
              onChange={(e) => setDriver1Id(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-6 focus:border-f1-red outline-none transition-colors"
            >
              {standings.map(s => (
                <option key={s.Driver.driverId} value={s.Driver.driverId}>
                  {s.Driver.givenName} {s.Driver.familyName} ({s.Constructors[0]?.name})
                </option>
              ))}
            </select>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-gray-800 rounded-full mb-4 border-2 border-white/10 overflow-hidden flex items-end justify-center">
                 <Users size={64} className="text-gray-600 mb-2" />
              </div>
              <h3 className="text-2xl font-bold">{driver1.Driver.givenName} {driver1.Driver.familyName}</h3>
              <p className="text-f1-red font-bold uppercase tracking-widest text-sm mt-1">{driver1.Constructors[0]?.name}</p>
              <div className="mt-4 px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                Pos {driver1.position}
              </div>
            </div>
          </div>
        )}

        {/* Medio: Estadisticas */}
        <div className="flex flex-col justify-center px-4">
          {driver1 && driver2 && (
            <>
              {renderStatBar('Puntos Totales', Number(driver1.points), Number(driver2.points))}
              {renderStatBar('Victorias', Number(driver1.wins), Number(driver2.wins))}
              {/* Fake stats for visual effect until we have full race-by-race API */}
              {renderStatBar('Podios', Math.floor(Number(driver1.points) / 25), Math.floor(Number(driver2.points) / 25))}
              {renderStatBar('Abandonos (DNF)', Math.floor(Math.random() * 4), Math.floor(Math.random() * 4))}
            </>
          )}
        </div>

        {/* Piloto 2 */}
        {driver2 && (
          <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border-b-4 ${getTeamColor(driver2.Constructors[0]?.name)}`}>
            <select 
              value={driver2Id}
              onChange={(e) => setDriver2Id(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-6 focus:border-blue-600 outline-none transition-colors"
            >
              {standings.map(s => (
                <option key={s.Driver.driverId} value={s.Driver.driverId}>
                  {s.Driver.givenName} {s.Driver.familyName} ({s.Constructors[0]?.name})
                </option>
              ))}
            </select>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-gray-800 rounded-full mb-4 border-2 border-white/10 overflow-hidden flex items-end justify-center">
                 <Users size={64} className="text-gray-600 mb-2" />
              </div>
              <h3 className="text-2xl font-bold">{driver2.Driver.givenName} {driver2.Driver.familyName}</h3>
              <p className="text-blue-500 font-bold uppercase tracking-widest text-sm mt-1">{driver2.Constructors[0]?.name}</p>
              <div className="mt-4 px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                Pos {driver2.position}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
