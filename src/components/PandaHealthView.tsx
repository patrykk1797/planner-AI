import React, { useState } from 'react';
import { RunnerProfile, RunLog, WeatherData, PainZone } from '../types.ts';
import {
  isBirthdayToday,
  calculateNicotineRecovery,
  calculateWeatherAdjustment,
  evaluateAirQuality,
} from '../utils/runningMath.ts';
import { PAIN_ZONES_DATABASE, soundEngine } from '../utils/defaults.ts';
import { PandaMascot25D } from './PandaMascot25D.tsx';

interface PandaHealthViewProps {
  profile: RunnerProfile;
  runs: RunLog[];
  weather: WeatherData | null;
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  onEarnBamboos: (amount: number, reason: string) => void;
  showToast: (msg: string) => void;
}

export const PandaHealthView: React.FC<PandaHealthViewProps> = ({
  profile,
  runs,
  weather,
  onUpdateProfile,
  onEarnBamboos,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'panda' | 'physio' | 'lifestyle' | 'stats'>('panda');

  // Interactive Touch & Poke Panda state
  const [pandaMood, setPandaMood] = useState<'idle' | 'happy' | 'biceps' | 'eating' | 'jump'>('idle');
  const [pandaSpeech, setPandaSpeech] = useState<string>(
    `Cześć ${profile.name}! Dotknij mnie, aby przybić piątkę lub sprawdzić formę! 🎋`
  );

  // Pain Zone selection
  const [selectedPainId, setSelectedPainId] = useState<string | null>(null);

  // Lifestyle collapsible toggle
  const [isLifestyleOpen, setIsLifestyleOpen] = useState<boolean>(false);

  // Birthday check
  const birthdayActive = isBirthdayToday(profile.birthdate);
  const nicotineStats = calculateNicotineRecovery(profile.smokeFreeDays || 0);
  const weatherAdj = calculateWeatherAdjustment(weather?.temp || 18, weather?.windSpeed || 10);
  const aqiInfo = weather ? evaluateAirQuality(weather.pm2_5) : null;

  // Touch & Poke Panda reaction
  const handlePokePanda = () => {
    const moods: Array<'happy' | 'biceps' | 'eating' | 'jump'> = ['happy', 'biceps', 'eating', 'jump'];
    const nextMood = moods[Math.floor(Math.random() * moods.length)];
    setPandaMood(nextMood);

    if (nextMood === 'eating') {
      soundEngine.playPandaSound('crunch');
      setPandaSpeech('Mniam! Świeży bambus daje moc na drugi kilometr interwałów! 🎋');
    } else if (nextMood === 'biceps') {
      soundEngine.playPandaSound('cheer');
      setPandaSpeech('Mięsień pośladkowy średni gotowy! Żadne pasmo ITBS nas nie zatrzyma! 💪');
    } else if (nextMood === 'jump') {
      soundEngine.playPandaSound('jump');
      setPandaSpeech('Hopsa! Czas kontaktu z podłożem skrócony do minimum! ⚡');
    } else {
      soundEngine.playPandaSound('cheer');
      setPandaSpeech(`Świetnie Ci idzie, ${profile.name}! Twoja dyscyplina w Strefie 2 buduje mistrzowską bazę!`);
    }

    setTimeout(() => setPandaMood('idle'), 2500);
  };

  const handleClaimBirthdayGift = () => {
    soundEngine.playPandaSound('birthday');
    onEarnBamboos(500, 'Prezent Urodzinowy od Pandy');
    showToast('Wszystkiego Najlepszego! Złota Korona Pandy i +500 🎋 dodane!');
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

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Top Header Card */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              GARDEROBA, ZDROWIE & REHABILITACJA
            </span>
            <h2 className="text-base font-bold txt-main">Ekosystem RunPanda & Zdrowie</h2>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full accent-badge ios-num">
            Poziom {Math.floor(profile.levelXp / 250) + 1} ({profile.bamboos} 🎋)
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 liquid-pill text-center text-xs">
          <button
            type="button"
            onClick={() => setSubTab('panda')}
            className={`py-2 rounded-xl font-bold transition-all ${
              subTab === 'panda' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            🐼 Panda
          </button>
          <button
            type="button"
            onClick={() => setSubTab('physio')}
            className={`py-2 rounded-xl font-bold transition-all ${
              subTab === 'physio' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            🩺 Ból Ciała
          </button>
          <button
            type="button"
            onClick={() => setSubTab('lifestyle')}
            className={`py-2 rounded-xl font-bold transition-all ${
              subTab === 'lifestyle' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            🌿 Zdrowie
          </button>
          <button
            type="button"
            onClick={() => setSubTab('stats')}
            className={`py-2 rounded-xl font-bold transition-all ${
              subTab === 'stats' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            📈 Wykresy
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INTERACTIVE RUNPANDA MASCOT */}
      {subTab === 'panda' && (
        <div className="space-y-3 animate-ios">
          {/* Birthday Notification Banner */}
          {birthdayActive && (
            <div className="liquid-glass p-3 border-2 border-amber-400 bg-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🎂</span>
                <div>
                  <div className="text-xs font-black text-amber-300">Dziś Twoje Urodziny!</div>
                  <div className="text-[10px] txt-muted">Panda przygotowała Złotą Koronę i +500 🎋</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClaimBirthdayGift}
                className="accent-bg text-black px-3 py-1.5 rounded-full text-xs font-black hover:scale-105"
              >
                Odbierz Prezent 🎁
              </button>
            </div>
          )}

          {/* Interactive Touch & Poke Panda Stage */}
          <div className="liquid-glass p-6 text-center space-y-4 relative overflow-hidden border border-[var(--accent)]/30">
            {/* World Background Tag */}
            <div className="text-[10px] font-bold txt-muted flex items-center justify-center gap-1.5">
              <span>🏟️ Tło:</span>
              <strong className="accent-text">{profile.activePandaGear.bg}</strong>
            </div>

              {/* Redesigned 2.5D Canvas Panda with Touch & Petting Physics */}
              <div className="flex flex-col items-center justify-center">
                <PandaMascot25D
                  stateMode={
                    pandaMood === 'eating'
                      ? 'eating'
                      : pandaMood === 'biceps' || pandaMood === 'jump'
                      ? 'running'
                      : pandaMood === 'happy'
                      ? 'proud'
                      : 'idle'
                  }
                  onPoke={() => handlePokePanda()}
                  className="w-52 h-52 mx-auto"
                />
                <span className="text-[10px] font-bold accent-text bg-black/60 px-2.5 py-0.5 rounded-full mt-1">
                  Dotknij lub pogłaszcz Pandę 2.5D 👆
                </span>
              </div>

            {/* Dynamic speech bubble */}
            <div className="liquid-pill p-3 text-xs txt-main font-medium border border-white/10 relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[var(--glass-bg)] border-t border-l border-white/10"></span>
              "{pandaSpeech}"
            </div>
          </div>

          {/* XP Level & Bamboo Progress */}
          <div className="liquid-glass p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold txt-main">Punkty Doświadczenia (XP)</span>
              <span className="accent-text font-black ios-num">{profile.levelXp % 250} / 250 XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full accent-bg transition-all"
                style={{ width: `${((profile.levelXp % 250) / 250) * 100}%` }}
              ></div>
            </div>
            <div className="text-[10px] txt-muted">
              Zdobywaj XP za kilometry, treningi siłowe, serię ćwiczeń i realizację planu!
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VIRTUAL PHYSIOTHERAPIST - BODY PAIN MAP */}
      {subTab === 'physio' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  WIRTUALNY FIZJOTERAPEUTA AI
                </span>
                <h3 className="text-base font-bold txt-main">Interaktywna Mapa Bólu Ciała</h3>
              </div>
              <span className="text-xl">🩺</span>
            </div>
            <p className="text-[11px] txt-sub leading-snug">
              Dotknij obszar ciała, w którym czujesz ból lub napięcie. AI natychmiast wygeneruje protokół naprawczy oraz dostosuje Twój plan treningowy!
            </p>
          </div>

          {/* Anatomical Clickable Body Grid */}
          <div className="liquid-glass p-4 space-y-2">
            <span className="text-xs font-bold txt-main block">Wybierz bolesny obszar:</span>
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
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300 font-bold'
                        : 'liquid-pill txt-main hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{pz.label}</span>
                      <span>{isSelected ? '🔴' : '⚪'}</span>
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

      {/* SUB-TAB 3: LIFESTYLE & ENVIRONMENTAL FACTORS */}
      {subTab === 'lifestyle' && (
        <div className="space-y-3 animate-ios">
          {/* Weather & Temp Pace Correction */}
          <div className="liquid-glass p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  WARUNKI ŚRODOWISKOWE & POGODA
                </span>
                <h3 className="text-sm font-bold txt-main">Pogodowy Korektor Tempa & Ubiór</h3>
              </div>
              <span className="text-xl">🌤️</span>
            </div>

            <div className="liquid-pill p-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span className="txt-muted">Korekta tempa:</span>
                <span className="accent-text ios-num">+{weatherAdj.paceCorrectionSecPerKm} sek / km</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="txt-muted">Rekomendacja ubioru (+10°C):</span>
                <span className="txt-main text-right">{weatherAdj.clothingAdvice}</span>
              </div>
              {weatherAdj.weatherWarning && (
                <div className="text-[10px] text-amber-300 pt-1">
                  ⚠️ {weatherAdj.weatherWarning}
                </div>
              )}
            </div>
          </div>

          {/* Module 14: Collapsible Health Factors (Medications & Nicotine) */}
          <div className="liquid-glass p-4 space-y-3">
            <div
              onClick={() => setIsLifestyleOpen(!isLifestyleOpen)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  REGENERACJA & CZYNNIKI ZDROWOTNE
                </span>
                <h3 className="text-sm font-bold txt-main">Leki Regulujące Tętno & Regeneracja</h3>
              </div>
              <span className="text-xs font-bold txt-muted">{isLifestyleOpen ? '▲ Zwiń' : '▼ Rozwiń'}</span>
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
                    <span className="text-lg font-black text-emerald-400 ios-num">
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
                    <div>Spadek tętna spocz.: <strong className="text-emerald-400">-{nicotineStats.rhrReductionBpm} bpm</strong></div>
                    <div>Wzrost VO2 max: <strong className="text-emerald-400">+{nicotineStats.vo2Gain} ml/kg</strong></div>
                  </div>

                  <div className="text-[10px] txt-sub italic border-l-2 border-emerald-400 pl-2">
                    {nicotineStats.healthMilestone}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VECTOR SVG CHARTS */}
      {subTab === 'stats' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                ANALIZA & DYNAMIKA PROGRESU
              </span>
              <h3 className="text-sm font-bold txt-main">Progresja Tempa i Tętna w Czasie</h3>
            </div>

            {/* Smooth Bézier SVG Chart */}
            <div className="w-full h-44 rounded-2xl liquid-pill p-2 relative overflow-hidden border border-white/10">
              <svg viewBox="0 0 320 120" className="w-full h-full">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Target line */}
                <line x1="10" y1="50" x2="310" y2="50" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <text x="15" y="45" fill="rgba(255,255,255,0.5)" fontSize="8">Cel: 5:00 min/km</text>

                {/* Area fill under Bézier curve */}
                <path
                  d="M 20 85 C 60 75, 100 80, 140 65 C 180 50, 220 58, 260 42 C 280 38, 300 32, 305 30 L 305 110 L 20 110 Z"
                  fill="url(#chartGrad)"
                />

                {/* Bézier curve line */}
                <path
                  d="M 20 85 C 60 75, 100 80, 140 65 C 180 50, 220 58, 260 42 C 280 38, 300 32, 305 30"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Measurement data points */}
                {[
                  { cx: 20, cy: 85, pace: '5:45' },
                  { cx: 140, cy: 65, pace: '5:35' },
                  { cx: 260, cy: 42, pace: '5:15' },
                  { cx: 305, cy: 30, pace: '5:02' },
                ].map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.cx} cy={pt.cy} r="4" fill="#ffffff" stroke="var(--accent)" strokeWidth="2" />
                    <text x={pt.cx - 10} y={pt.cy - 7} fill="#f8fafc" fontSize="8" fontWeight="bold">
                      {pt.pace}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] txt-muted">
              <span>Wrzesień 2026</span>
              <span>Październik 2026</span>
              <span className="accent-text font-bold">PB: 5:02 /km</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
