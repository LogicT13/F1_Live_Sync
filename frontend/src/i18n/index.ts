export const translations = {
  es: {
    settings: 'Configuración',
    language: 'Idioma',
    delay: 'Delay (s)',
    apply: 'Aplicar',
    resume: 'REANUDAR',
    pause: 'PAUSAR',
    connecting: 'Conectando...',
    connected: 'Conectado',
    waitingDrivers: 'Esperando datos de pilotos...',
    loadingTrack: 'Cargando circuito...',
    leaderboard: {
      title: 'Leaderboard',
      teamAbbr: 'Abreviaturas de equipos',
      driverNames: 'Nombres de pilotos',
      gapToLeader: 'Distancia al líder / Intervalo',
      lastLapTime: 'Tiempo última vuelta',
      bestLapTime: 'Mejor vuelta',
    },
    raceData: {
      title: 'Datos de Carrera',
      pitStops: 'Cantidad de paradas (Pits)',
      pitPrediction: 'Predicción de paradas',
      gridChange: 'Cambios de posición',
      sectors: 'Indicadores de sector',
    },
    tyres: {
      title: 'Neumáticos',
      tyreType: 'Compuesto actual',
      tyreAge: 'Edad del neumático',
      tyreHistory: 'Historial de neumáticos',
    }
  },
  en: {
    settings: 'Settings',
    language: 'Language',
    delay: 'Delay (s)',
    apply: 'Apply',
    resume: 'RESUME',
    pause: 'PAUSE',
    connecting: 'Connecting...',
    connected: 'Connected',
    waitingDrivers: 'Waiting for driver data...',
    loadingTrack: 'Loading track...',
    leaderboard: {
      title: 'Leaderboard',
      teamAbbr: 'Team abbreviations',
      driverNames: 'Driver names',
      gapToLeader: 'Gap to leader / Interval',
      lastLapTime: 'Last lap time',
      bestLapTime: 'Best lap time',
    },
    raceData: {
      title: 'Race Data',
      pitStops: 'Pit stops count',
      pitPrediction: 'Pit predictions',
      gridChange: 'Position changes',
      sectors: 'Sector indicators',
    },
    tyres: {
      title: 'Tyres',
      tyreType: 'Current tyre compound',
      tyreAge: 'Tyre age',
      tyreHistory: 'Tyre history',
    }
  }
}

export type Language = 'es' | 'en';

export function useTranslation(lang: Language) {
  return function t(key: string): string {
    const keys = key.split('.');
    let current: any = translations[lang];

    for (const k of keys) {
      if (current[k] === undefined) {
        // Fallback to English
        let fallback: any = translations['en'];
        for (const fk of keys) {
          if (fallback[fk] === undefined) return key;
          fallback = fallback[fk];
        }
        return fallback;
      }
      current = current[k];
    }

    return current;
  }
}
