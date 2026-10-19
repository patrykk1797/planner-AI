import React, { useState, useEffect } from 'react';
import { RunnerProfile, Shoe } from '../types.ts';
import { runWhatIfSimulator, time5kToSeconds, SimulatorOutputs } from '../utils/runningMath.ts';
import { soundEngine } from '../utils/defaults.ts';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  shoes: Shoe[];
  onApplyToProfile?: (updated: Partial<RunnerProfile>) => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  profile,
  shoes,
  onApplyToProfile,
}) => {
  // Simulator sliders state
  const [weight, setWeight] = useState<number>(profile.weight);
  const [cadence, setCadence] = useState<number>(172);
  const [z2Percent, setZ2Percent] = useState<number>(75);
  const [strengthSessions, setStrengthSessions] = useState<number>(2);
  const [sleepScore, setSleepScore] = useState<number>(8);
  const [raceTemp, setRaceTemp] = useState<number>(14);
  const [selectedShoeId, setSelectedShoeId] = useState<string>(profile.selectedShoeId || shoes[0]?.id || 'shoe-1');
  
  // Metronome state
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [beatNum, setBeatNum] = useState<number>(1);

  // Mode selection: "Moja Forma" vs "Potencjał na Wybrany Bieg"
  const [simMode, setSimMode] = useState<'current' | 'optimal'>('optimal');

  const selectedShoe = shoes.find((s) => s.id === selectedShoeId) || shoes[0];
  const isCarbon = selectedShoe?.cushion.toLowerCase().includes('karbon') || selectedShoe?.name.toLowerCase().includes('vaporfly');

  const outputs: SimulatorOutputs = runWhatIfSimulator({
    baseWeightKg: profile.weight,
    simWeightKg: weight,
    base5kSeconds: time5kToSeconds(profile.time5k),
    cadenceSpm: cadence,
    aerobicZ2Pct: z2Percent,
    strengthWeekly: strengthSessions,
    sleepScore: sleepScore,
    raceTempC: raceTemp,
    shoeWeightG: selectedShoe?.weightG || 240,
    shoeEnergyReturn: selectedShoe?.energyReturn || 8,
    isCarbonShoe: isCarbon,
  });

  // Metronome toggle
  const toggleMetronome = () => {
    if (isMetronomeActive) {
      soundEngine.stopMetronome();
      setIsMetronomeActive(false);
    } else {
      soundEngine.startMetronome(cadence, (b) => setBeatNum(b));
      setIsMetronomeActive(true);
    }
  };

  useEffect(() => {
    return () => {
      soundEngine.stopMetronome();
    };
  }, []);

  const handleApplyPresetMode = (mode: 'current' | 'optimal') => {
    setSimMode(mode);
    if (mode === 'current') {
      setWeight(profile.weight);
      setCadence(164);
      setZ2Percent(50);
      setStrengthSessions(1);
      setSleepScore(6);
      setRaceTemp(18);
    } else {
      setWeight(profile.targetWeight);
      setCadence(176);
      setZ2Percent(80);
      setStrengthSessions(2);
      setSleepScore(9);
      setRaceTemp(12);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-3 animate-ios overflow-y-auto"
    >
      <div className="liquid-glass w-full max-w-md p-5 space-y-4 animate-ios-modal max-h-[92vh] overflow-y-auto no-scrollbar my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Moduł 1 • Predyktor Fizjologiczny
            </span>
            <h2 className="text-base font-black txt-main">Symulator Biegowy „Co Jeśli?”</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.stopMetronome();
              setIsMetronomeActive(false);
              onClose();
            }}
            aria-label="Zamknij symulator"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 2 Base Modes */}
        <div className="grid grid-cols-2 gap-2 p-1 liquid-pill">
          <button
            type="button"
            onClick={() => handleApplyPresetMode('current')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              simMode === 'current' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            📊 Moja Forma (Stan Obecny)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPresetMode('optimal')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              simMode === 'optimal' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            🚀 Potencjał na Cel Startowy
          </button>
        </div>

        {/* Projected Finish Times Display */}
        <div className="liquid-pill p-3.5 space-y-2 border border-[var(--accent)]/40 bg-gradient-to-b from-[var(--accent-soft)] to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Wyliczone Czasy na Mecie
            </span>
            <span className="text-[10px] txt-muted">GCT: <strong className="txt-main">{outputs.gctMs} ms</strong></span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-black/30 rounded-xl p-2 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold">5 km</span>
              <div className="text-sm font-black txt-main ios-num">{outputs.predicted5kTime}</div>
              <div className="text-[9px] accent-text">{outputs.predicted5kPace}</div>
            </div>

            <div className="bg-black/30 rounded-xl p-2 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold">10 km</span>
              <div className="text-sm font-black txt-main ios-num">{outputs.predicted10kTime}</div>
              <div className="text-[9px] accent-text">{outputs.predicted10kPace}</div>
            </div>

            <div className="bg-black/30 rounded-xl p-2 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold">Półmaraton</span>
              <div className="text-xs font-black txt-main ios-num mt-0.5">{outputs.predictedHalfTime}</div>
              <div className="text-[9px] accent-text">{outputs.predictedHalfPace}</div>
            </div>

            <div className="bg-black/30 rounded-xl p-2 border border-white/5">
              <span className="text-[9px] txt-muted block uppercase font-bold">Maraton</span>
              <div className="text-xs font-black txt-main ios-num mt-0.5">{outputs.predictedMarathonTime}</div>
              <div className="text-[9px] accent-text">{outputs.predictedMarathonPace}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] txt-muted pt-1 border-t border-white/10">
            <span>Wpływ masy na tempo: <strong className="text-emerald-400">~2.5 s/km za każdy -1 kg</strong></span>
            <span>VO2 max: <strong className="text-emerald-400">{outputs.vo2RelativeGain >= 0 ? `+${outputs.vo2RelativeGain}` : outputs.vo2RelativeGain} ml/kg</strong></span>
          </div>
        </div>

        {/* Dynamic Injury Risk Bar (ITBS / Knee / Achilles) */}
        <div className="liquid-pill p-3 space-y-1.5 border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold txt-main flex items-center gap-1.5">
              <span>🩺</span>
              <span>Wskaźnik Ryzyka Kontuzji (ITBS / Kolano / Achilles)</span>
            </span>
            <span
              className={`font-black ios-num ${
                outputs.injuryRiskPct > 60
                  ? 'text-rose-400'
                  : outputs.injuryRiskPct > 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {outputs.injuryRiskPct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                outputs.injuryRiskPct > 60
                  ? 'bg-rose-500'
                  : outputs.injuryRiskPct > 35
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${outputs.injuryRiskPct}%` }}
            ></div>
          </div>

          {outputs.injuryFactors.length > 0 && (
            <div className="text-[10px] text-rose-300 space-y-0.5 pt-1">
              {outputs.injuryFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span>⚠️</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Physiological Sliders */}
        <div className="space-y-3 text-xs">
          {/* 1. Weight Slider */}
          <div className="liquid-pill p-3 space-y-1">
            <div className="flex justify-between">
              <label htmlFor="sim-weight" className="font-bold txt-main">Masa ciała zawodnika</label>
              <span className="accent-text font-black text-sm ios-num">{weight.toFixed(1)} kg</span>
            </div>
            <input
              id="sim-weight"
              type="range"
              min="40.0"
              max="160.0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[9px] txt-muted">
              <span>40 kg</span>
              <span>Krok co 0.1 kg</span>
              <span>160 kg</span>
            </div>
          </div>

          {/* 2. Cadence + WebAudio Metronome */}
          <div className="liquid-pill p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <label htmlFor="sim-cadence" className="font-bold txt-main">Kadencja docelowa</label>
                <div className="text-[10px] txt-muted">Skraca czas kontaktu z podłożem (GCT)</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="accent-text font-black text-sm ios-num">{cadence} spm</span>
                <button
                  type="button"
                  onClick={toggleMetronome}
                  aria-label="Włącz metronom WebAudio"
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                    isMetronomeActive
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'liquid-active'
                  }`}
                >
                  {isMetronomeActive ? `🔊 Takt ${beatNum}/4` : '🎵 Metronom'}
                </button>
              </div>
            </div>
            <input
              id="sim-cadence"
              type="range"
              min="148"
              max="178"
              step="1"
              value={cadence}
              onChange={(e) => setCadence(parseInt(e.target.value, 10))}
            />
            <div className="flex justify-between text-[9px] txt-muted">
              <span>148 spm (overstriding)</span>
              <span>Optimum: 172–178 spm</span>
              <span>178 spm</span>
            </div>
          </div>

          {/* 3. Aerobic Discipline (Z2) */}
          <div className="liquid-pill p-3 space-y-1">
            <div className="flex justify-between">
              <div>
                <label htmlFor="sim-z2" className="font-bold txt-main">Dyscyplina Tlenowa (Strefa 2)</label>
                <div className="text-[10px] txt-muted">Kapilaryzacja i ochrona przed dryfem tętna</div>
              </div>
              <span className="accent-text font-black text-sm ios-num">{z2Percent}% biegów</span>
            </div>
            <input
              id="sim-z2"
              type="range"
              min="0"
              max="100"
              step="5"
              value={z2Percent}
              onChange={(e) => setZ2Percent(parseInt(e.target.value, 10))}
            />
          </div>

          {/* 4. Strength Sessions + Sleep Score */}
          <div className="grid grid-cols-2 gap-2">
            <div className="liquid-pill p-2.5 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold txt-main">Siła / tyg.</span>
                <span className="accent-text font-bold">{strengthSessions}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={strengthSessions}
                onChange={(e) => setStrengthSessions(parseInt(e.target.value, 10))}
              />
              <span className="text-[9px] txt-muted block text-center">0x do 3x w tyg.</span>
            </div>

            <div className="liquid-pill p-2.5 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold txt-main">Sen / Regeneracja</span>
                <span className="accent-text font-bold">{sleepScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sleepScore}
                onChange={(e) => setSleepScore(parseInt(e.target.value, 10))}
              />
              <span className="text-[9px] txt-muted block text-center">Jakość snu 1–10</span>
            </div>
          </div>

          {/* 5. Shoe Selection & Temperature */}
          <div className="grid grid-cols-2 gap-2">
            <div className="liquid-pill p-2.5 space-y-1">
              <label htmlFor="sim-shoe" className="text-[10px] txt-muted block font-bold">Obuwie startowe</label>
              <select
                id="sim-shoe"
                value={selectedShoeId}
                onChange={(e) => setSelectedShoeId(e.target.value)}
                className="w-full bg-transparent txt-main font-bold outline-none text-[11px]"
              >
                {shoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.weightG}g)
                  </option>
                ))}
              </select>
            </div>

            <div className="liquid-pill p-2.5 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[10px] txt-muted font-bold">Temp. startu</span>
                <span className="accent-text font-bold">{raceTemp}°C</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="1"
                value={raceTemp}
                onChange={(e) => setRaceTemp(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* 4-Stage Roadmap AI (Droga Treningowa) */}
        <div className="liquid-pill p-3.5 space-y-2 border border-white/10">
          <span className="text-[10px] font-black uppercase tracking-wider accent-text block">
            4-Etapowa Droga Treningowa i Zalecenia AI
          </span>
          <div className="space-y-2">
            {outputs.roadmapStages.map((st) => (
              <div key={st.stageNumber} className="flex gap-2 text-xs">
                <span className="w-5 h-5 rounded-full accent-bg text-black font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {st.stageNumber}
                </span>
                <div>
                  <div className="font-bold txt-main">
                    {st.title} <span className="text-[10px] txt-muted">({st.durationWeeks} tyg.)</span>
                  </div>
                  <div className="text-[11px] txt-sub leading-snug">{st.focus}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (onApplyToProfile) {
                onApplyToProfile({
                  targetWeight: weight,
                  selectedShoeId,
                });
              }
              onClose();
            }}
            className="flex-1 py-3 rounded-full accent-bg text-black font-black text-xs hover:brightness-110 shadow-lg"
          >
            ✓ Zastosuj Parametry do Planu
          </button>
        </div>
      </div>
    </div>
  );
};
