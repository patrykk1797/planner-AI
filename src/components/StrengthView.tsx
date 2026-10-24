import React, { useState } from 'react';
import {
  Dumbbell,
  Stethoscope,
  HeartPulse,
  Check,
  CheckCircle2,
  Circle,
  AlertTriangle,
  CloudSun,
  ChevronUp,
  ChevronDown,
  Activity
} from 'lucide-react';
import { RunnerProfile, RunLog, WeatherData, PainZone } from '../types.ts';
import { STRENGTH_EXERCISES, PAIN_ZONES_DATABASE, soundEngine } from '../utils/defaults.ts';
import {
  calculateNicotineRecovery,
  calculateWeatherAdjustment,
} from '../utils/runningMath.ts';
import { HumanExerciseAnimation2D5 } from './HumanExerciseAnimation2D5.tsx';

interface StrengthViewProps {
  profile: RunnerProfile;
  runs: RunLog[];
  weather: WeatherData | null;
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  onEarnBamboos: (amount: number, reason: string) => void;
  showToast: (msg: string) => void;
}

export const StrengthView: React.FC<StrengthViewProps> = ({
  profile,
  runs,
  weather,
  onUpdateProfile,
  onEarnBamboos,
  showToast,
}) => {
  // Main Sub-tabs: Siła (Biomechanika) vs Ból Ciała (Fizjo) vs Zdrowie
  const [activeSubTab, setActiveSubTab] = useState<'strength' | 'physio' | 'health'>('strength');

  // Exercise filters & sets
  const [selectedPackage, setSelectedPackage] = useState<'all' | 'itbs' | 'achilles' | 'core'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<'all' | 'dom' | 'band' | 'gym'>('all');
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  // Physio & Pain Zone selection
  const [selectedPainId, setSelectedPainId] = useState<string | null>('pz-knee-itbs');

  // Lifestyle collapsible toggle
  const [isLifestyleOpen, setIsLifestyleOpen] = useState<boolean>(true);

  const handleLogSet = (exerciseId: string, exName: string) => {
    const nextCount = (completedSets[exerciseId] || 0) + 1;
    setCompletedSets((prev) => ({ ...prev, [exerciseId]: nextCount }));
    soundEngine.playClick(true);
    showToast(`Odhaczono serię (${nextCount}/3): ${exName}!`);
  };

  const handleSelectPain = (pain: PainZone) => {
    const isCurrentlyActive = selectedPainId === pain.id || profile.activePainZones?.includes(pain.id);

    if (isCurrentlyActive) {
      setSelectedPainId(null);
      const updated = (profile.activePainZones || []).filter((id) => id !== pain.id);
      onUpdateProfile({ activePainZones: updated });
      soundEngine.playClick(true);
      showToast(`Odkliknięto ból: ${pain.label} - wyczyszczono protokół! 👍`);
    } else {
      setSelectedPainId(pain.id);
      const updated = [...(profile.activePainZones || []).filter((id) => id !== pain.id), pain.id];
      onUpdateProfile({ activePainZones: updated });
      soundEngine.playClick(true);
      showToast(`Aktywowano protokół rehabilitacyjny dla: ${pain.label}`);
    }
  };

  const handleClearAllPain = () => {
    setSelectedPainId(null);
    onUpdateProfile({ activePainZones: [] });
    soundEngine.playClick(true);
    showToast('Wyczyszczono wszystkie obszary bólowe! Wracasz do pełnego planu! 🟢');
  };

  const nicotineStats = calculateNicotineRecovery(profile.smokeFreeDays || 0);
  const weatherAdj = calculateWeatherAdjustment(weather?.temp || 18, weather?.windSpeed || 10);

  const filteredExercises = STRENGTH_EXERCISES.filter((ex) => {
    if (selectedPackage !== 'all' && ex.package !== selectedPackage) return false;
    if (equipmentFilter !== 'all' && ex.equipment !== equipmentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 pb-24 animate-ios">
      {/* Top Header Card */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>Centrum Biomechaniki & Zdrowia</span>
            </span>
            <h2 className="text-base font-bold txt-main">Siła, Ból Ciała & Zdrowie</h2>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full accent-badge shrink-0">
            Wzorzec Biomechaniczny
          </span>
        </div>

        {/* 3 Clean Sub-tabs with Vector Icons */}
        <div className="grid grid-cols-3 gap-1.5 p-1 liquid-pill text-center text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('strength')}
            className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'strength' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Siła</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('physio')}
            className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'physio' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ból Ciała</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('health')}
            className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'health' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Zdrowie</span>
          </button>
        </div>
      </div>

      {/* 1. TRENING SIŁOWY DLA BIEGACZY */}
      {activeSubTab === 'strength' && (
        <div className="space-y-3 animate-ios">
          {/* Packages filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <span className="text-[10px] txt-muted font-bold uppercase shrink-0">Pakiet:</span>
            {[
              { id: 'all', label: 'Wszystkie' },
              { id: 'itbs', label: 'Kolano biegacza (ITBS)' },
              { id: 'achilles', label: 'Ścięgno Achillesa' },
              { id: 'core', label: 'Core & Miednica' },
            ].map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPackage(pkg.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                  selectedPackage === pkg.id ? 'liquid-active' : 'liquid-pill txt-sub hover:text-white'
                }`}
              >
                {pkg.label}
              </button>
            ))}
          </div>

          {/* Exercises list */}
          <div className="space-y-4">
            {filteredExercises.map((ex) => {
              const currentSets = completedSets[ex.id] || 0;
              return (
                <div key={ex.id} className="liquid-glass p-4 space-y-3 border border-white/10 hover:border-[var(--accent)]/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black txt-main">{ex.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-sky-400">{ex.repsSets}</span>
                        <span className="text-[10px] txt-muted">• Sprzęt: {ex.equipment}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogSet(ex.id, ex.name)}
                      className="liquid-active px-3 py-1.5 text-xs font-black rounded-xl shadow-md hover:scale-105 active:scale-95 flex items-center gap-1"
                    >
                      <span>✓</span>
                      <span>Seria {currentSets}/3</span>
                    </button>
                  </div>

                  {/* 2.5D Vector Human Motion Technique Model */}
                  <HumanExerciseAnimation2D5 exerciseId={ex.id} exerciseName={ex.name} />

                  <p className="text-[11px] txt-sub leading-snug">{ex.instructions.join(' ')}</p>

                  <div className="liquid-pill p-2 text-[10px] txt-muted flex items-center justify-between">
                    <span>Cel mięśniowy: <strong className="txt-main">{ex.targetMuscle}</strong></span>
                    <span className="text-emerald-400 font-bold">Wzorzec Techniki ✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* 3. BÓL CIAŁA & WIRTUALNY FIZJOTERAPEUTA */}
      {activeSubTab === 'physio' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Wirtualny Fizjoterapeuta & Ortopedia
                </span>
                <h3 className="text-base font-bold txt-main">Interaktywna Mapa Bólu Ciała</h3>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <p className="text-[11px] txt-sub leading-snug">
              Dotknij obszar ciała, w którym odczuwasz przeciążenie. AI natychmiast wygeneruje protokół naprawczy oraz dostosuje Twój plan treningowy!
            </p>
          </div>

          {/* Clickable anatomical pain buttons */}
          <div className="liquid-glass p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold txt-main">Wybierz bolesny obszar:</span>
              {(selectedPainId || (profile.activePainZones && profile.activePainZones.length > 0)) && (
                <button
                  type="button"
                  onClick={handleClearAllPain}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Odkliknij ból (Brak bólu)</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAIN_ZONES_DATABASE.map((pz) => {
                const isSelected = selectedPainId === pz.id || profile.activePainZones?.includes(pz.id);
                return (
                  <button
                    key={pz.id}
                    type="button"
                    onClick={() => handleSelectPain(pz)}
                    className={`p-3 rounded-2xl text-left text-xs transition-all border ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300 font-bold ring-1 ring-rose-500/40'
                        : 'liquid-pill txt-main hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate">{pz.label}</span>
                      {isSelected ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] txt-muted block mt-1">{pz.severity}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Rehab Protocol display */}
          {selectedPainId && (
            <div className="liquid-glass p-4 space-y-3 border-2 border-rose-500/40 animate-ios">
              {(() => {
                const pain = PAIN_ZONES_DATABASE.find((p) => p.id === selectedPainId);
                if (!pain) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-rose-400">{pain.name}</h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                        Protokół Naprawczy
                      </span>
                    </div>

                    <div className="liquid-pill p-3 space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-rose-400">Działania Fizjoterapeutyczne:</span>
                      <p className="text-[11px] txt-main leading-relaxed">{pain.protocol}</p>
                    </div>

                    <div className="liquid-pill p-3 space-y-1 text-xs border border-[var(--accent)]/30">
                      <span className="text-[10px] uppercase font-bold accent-text">Automatyczna Korekta Planu AI:</span>
                      <p className="text-[11px] txt-sub leading-relaxed">{pain.planAdjustment}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 4. ZDROWIE, REGENERACJA & WYKRESY */}
      {activeSubTab === 'health' && (
        <div className="space-y-3 animate-ios">
          {/* Weather & Temp Pace Correction */}
          <div className="liquid-glass p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Korekta Środowiskowa
                </span>
                <h3 className="text-sm font-bold txt-main">Pogodowy Korektor Tempa & Ubiór</h3>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
                <CloudSun className="w-4 h-4 text-sky-400" />
              </div>
            </div>

            <div className="liquid-pill p-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span className="txt-muted">Korekta tempa:</span>
                <span className="accent-text ios-num">+{weatherAdj.paceCorrectionSecPerKm} sek / km</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="txt-muted">Rekomendacja ubioru:</span>
                <span className="txt-main text-right">{weatherAdj.clothingAdvice}</span>
              </div>
              {weatherAdj.weatherWarning && (
                <div className="text-[10px] text-amber-300 pt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{weatherAdj.weatherWarning}</span>
                </div>
              )}
            </div>
          </div>

          {/* Health Factors: Medications & Nicotine */}
          <div className="liquid-glass p-4 space-y-3">
            <div
              onClick={() => setIsLifestyleOpen(!isLifestyleOpen)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Czynniki Fizjologiczne
                </span>
                <h3 className="text-sm font-bold txt-main">Leki Regulujące Tętno & Regeneracja</h3>
              </div>
              <span className="text-xs font-bold txt-muted flex items-center gap-1">
                {isLifestyleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isLifestyleOpen ? 'Zwiń' : 'Rozwiń'}</span>
              </span>
            </div>

            {isLifestyleOpen && (
              <div className="space-y-3 pt-2 text-xs border-t border-white/10 animate-ios">
                <div>
                  <label className="text-[10px] txt-muted block mb-1">
                    Przyjmowane leki (np. beta-blokery obniżające tętno max):
                  </label>
                  <input
                    type="text"
                    value={profile.medications || ''}
                    onChange={(e) => onUpdateProfile({ medications: e.target.value })}
                    placeholder="np. Bisoprolol 2.5mg (obniża HRmax o ~15 bpm)"
                    className="w-full liquid-pill px-3 py-2 text-xs txt-main font-bold outline-none"
                  />
                </div>

                {/* Nicotine recovery tracker */}
                <div className="liquid-pill p-3 space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-bold txt-main block">Dni bez nikotyny</span>
                      <span className="text-[10px] txt-muted">Tradycyjne, podgrzewacze, e-papierosy</span>
                    </div>
                    <span className="text-lg font-black accent-text ios-num">
                      {profile.smokeFreeDays || 0} dni
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={profile.smokeFreeDays || 0}
                    onChange={(e) => onUpdateProfile({ smokeFreeDays: parseInt(e.target.value, 10) })}
                  />

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div>Spadek tętna spocz.: <strong className="accent-text">-{nicotineStats.rhrReductionBpm} bpm</strong></div>
                    <div>Wzrost VO2 max: <strong className="accent-text">+{nicotineStats.vo2Gain} ml/kg</strong></div>
                  </div>

                  <div className="text-[10px] txt-sub italic border-l-2 accent-border pl-2">
                    {nicotineStats.healthMilestone}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SVG Vector Chart for Resting Heart Rate & Regeneration */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Trend Regeneracji
                </span>
                <h4 className="text-xs font-black txt-main">Tętno Spoczynkowe (RHR bpm)</h4>
              </div>
              <span className="text-xs font-black accent-text ios-num">
                {profile.rhr || 58} bpm (Optymalne)
              </span>
            </div>

            {/* Sparkline chart */}
            <div className="h-28 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 320 80">
                <line x1="0" y1="20" x2="320" y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
                <line x1="0" y1="50" x2="320" y2="50" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
                <path
                  d="M 10 55 L 60 52 L 110 58 L 160 48 L 210 44 L 260 40 L 310 38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {[
                  { x: 10, y: 55, val: 62 },
                  { x: 60, y: 52, val: 61 },
                  { x: 110, y: 58, val: 63 },
                  { x: 160, y: 48, val: 60 },
                  { x: 210, y: 44, val: 59 },
                  { x: 260, y: 40, val: 58 },
                  { x: 310, y: 38, val: 57 },
                ].map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#10b981" stroke="#000" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-[9px] txt-muted">
              <span>7 dni temu (62 bpm)</span>
              <span>Dziś (58 bpm - adaptacja tlenowa)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
