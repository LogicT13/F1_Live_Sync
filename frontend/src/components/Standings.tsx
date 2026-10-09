import { useEffect, useState } from 'react';
import { Trophy, Users, Shield } from 'lucide-react';

interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    givenName: string;
    familyName: string;
    nationality: string;
  };
  Constructors: {
    name: string;
  }[];
}

interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    name: string;
    nationality: string;
  };
}

export default function Standings({ year }: { year: number }) {
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const [driversRes, constructorsRes] = await Promise.all([
          fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`),
          fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`)
        ]);

        if (driversRes.ok) {
          const dData = await driversRes.json();
          setDriverStandings(dData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || []);
        }
        if (constructorsRes.ok) {
          const cData = await constructorsRes.json();
          setConstructorStandings(cData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || []);
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [year]);

  if (loading) {
    return <div className="text-gray-400 italic text-center p-8">Cargando clasificaciones de {year}...</div>;
  }

  if (!driverStandings.length && !constructorStandings.length) {
    return <div className="text-gray-500 italic text-center p-8">Las clasificaciones para la temporada {year} aun no estan disponibles.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
      {/* Driver Standings */}
      <section>
        <h2 className="text-f1-red font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
          <Trophy size={18} /> Campeonato de Pilotos
        </h2>
        <div className="bg-black/30 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-center w-12">Pos</th>
                <th className="px-4 py-3">Piloto</th>
                <th className="px-4 py-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {driverStandings.map((ds) => (
                <tr key={ds.position} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-center text-gray-400">{ds.position}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{ds.Driver.givenName} {ds.Driver.familyName}</div>
                    <div className="text-xs text-gray-500">{ds.Constructors[0]?.name}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-f1-red text-right">{ds.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Constructor Standings */}
      <section>
        <h2 className="text-f1-red font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
          <Shield size={18} /> Campeonato de Constructores
        </h2>
        <div className="bg-black/30 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-center w-12">Pos</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {constructorStandings.map((cs) => (
                <tr key={cs.position} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-center text-gray-400">{cs.position}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{cs.Constructor.name}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-f1-red text-right">{cs.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
