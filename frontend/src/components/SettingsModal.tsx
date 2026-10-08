import { X, Globe } from "lucide-react";
import { ReplaySettings } from "@/hooks/useSettings";
import { useTranslation } from "@/i18n";

interface Props {
  settings: ReplaySettings;
  update: (key: keyof ReplaySettings, value: boolean | string) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, update, onClose }: Props) {
  const t = useTranslation(settings.language);

  const SETTING_GROUPS = [
    {
      title: t('leaderboard.title'),
      items: [
        { key: "showTeamAbbr", label: t('leaderboard.teamAbbr') },
        { key: "showDriverNames", label: t('leaderboard.driverNames') },
        { key: "showGapToLeader", label: t('leaderboard.gapToLeader') },
        { key: "showLastLapTime", label: t('leaderboard.lastLapTime') },
        { key: "showBestLapTime", label: t('leaderboard.bestLapTime') },
      ],
    },
    {
      title: t('raceData.title'),
      items: [
        { key: "showPitStops", label: t('raceData.pitStops') },
        { key: "showPitPrediction", label: t('raceData.pitPrediction') },
        { key: "showGridChange", label: t('raceData.gridChange') },
        { key: "showSectors", label: t('raceData.sectors') },
      ],
    },
    {
      title: t('tyres.title'),
      items: [
        { key: "showTyreType", label: t('tyres.tyreType') },
        { key: "showTyreAge", label: t('tyres.tyreAge') },
        { key: "showTyreHistory", label: t('tyres.tyreHistory') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1a24] border border-f1-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-f1-border shrink-0">
          <h2 className="text-xl font-bold italic tracking-wider">{t('settings')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
               <Globe size={16} /> {t('language')}
             </h3>
             <div className="flex gap-2">
                <button
                  onClick={() => update('language', 'es')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-colors ${settings.language === 'es' ? 'bg-f1-red text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  Español
                </button>
                <button
                  onClick={() => update('language', 'en')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-colors ${settings.language === 'en' ? 'bg-f1-red text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  English
                </button>
             </div>
          </div>

          <div className="h-px bg-f1-border w-full my-4"></div>

          {SETTING_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{group.title}</h3>
              <div className="space-y-2">
                {group.items.map(({ key, label }) => {
                  const k = key as keyof ReplaySettings;
                  const isChecked = settings[k] as boolean;
                  return (
                    <label key={k} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                      <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{label}</span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isChecked ? 'bg-f1-red' : 'bg-gray-600'}`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={(e) => update(k, e.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
