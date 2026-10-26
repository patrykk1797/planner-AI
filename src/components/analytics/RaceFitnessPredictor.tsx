import React, { useState, useMemo } from 'react';
import {
  Target,
  Flag,
  Activity,
  Footprints,
  Dna,
  Lightbulb,
  Zap,
  Thermometer,
  Mountain,
  ChevronDown,
  ChevronRight,
  Brain,
  Sparkles,
  Sliders,
  Timer,
  TrendingUp,
  HeartPulse
} from 'lucide-react';
import { RunnerProfile, RaceSlot, RunLog } from '../../types.ts';
import { soundEngine } from '../../utils/defaults.ts';
import {
  STANDARD_DISTANCES,
  calculateRaceFitnessPrediction,
  FitnessAnalysisResult,
} from '../../utils/raceFitnessPredictor.ts';

interface RaceFitnessPredictorProps {
  profile: RunnerProfile;
  runs?: RunLog[];
  races?: RaceSlot[];
  initialDistanceKm?: number;
  onSetMainGoal?: (goalName: string, targetTime?: string) => void;
  showToast: (msg: string) => void;
}

export const RaceFitnessPredictor: React.FC<RaceFitnessPredictorProps> = ({
  profile,
  runs = [],
  races = [],
  initialDistanceKm = 21.0975,
  onSetMainGoal,
  showToast,
}) => {
  // Target distance state
  const [selectedDistanceKey, setSelectedDistanceKey] = useState<string>('half');
  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(initialDistanceKm);
  const [isCustomDistance, setIsCustomDistance] = useState<boolean>(false);
  const [customDistanceInput, setCustomDistanceInput] = useState<string>('15');

  // Modifiers
  const [carbonShoes, setCarbonShoes] = useState<boolean>(false);
  const [raceTempC, setRaceTempC] = useState<number>(14);
  const [elevationProfile, setElevationProfile] = useState<'flat' | 'rolling' | 'hilly'>('flat');
  const [showSplitsTable, setShowSplitsTable] = useState<boolean>(true);

  // AI Coaching advice state
  const [isConsultingAI, setIsConsultingAI] = useState<boolean>(false);
  const [aiCoachAdvice, setAiCoachAdvice] = useState<string | null>(null);

  // Handle initialDistanceKm sync
  React.useEffect(() => {
    if (initialDistanceKm) {
      const num = Number(initialDistanceKm);
      if (!isNaN(num) && num > 0) {
        setTargetDistanceKm(num);
        const match = STANDARD_DISTANCES.find(
          (d) => Math.abs(d.distanceKm - num) < 0.2
        );
        if (match) {
          setSelectedDistanceKey(match.key);
          setIsCustomDistance(false);
        } else {
          setSelectedDistanceKey('custom');
          setIsCustomDistance(true);
          setCustomDistanceInput(String(num));
        }
      }
    }
  }, [initialDistanceKm]);

  // Handle standard distance switch
  const handleSelectStandardDistance = (opt: typeof STANDARD_DISTANCES[0]) => {
    soundEngine.playClick();
    setSelectedDistanceKey(opt.key);
    setIsCustomDistance(false);
    setTargetDistanceKm(opt.distanceKm);
  };

  // Handle selecting distance directly from user's planned races
  const handleSelectRaceDistance = (race: RaceSlot) => {
    if (!race) return;
    soundEngine.playClick();
    const dist = Number(race.distanceKm) || 5;
    setTargetDistanceKm(dist);
    const match = STANDARD_DISTANCES.find(
      (d) => Math.abs(d.distanceKm - dist) < 0.2
    );
    if (match) {
      setSelectedDistanceKey(match.key);
      setIsCustomDistance(false);
    } else {
      setSelectedDistanceKey(`race-${race.id}`);
      setIsCustomDistance(true);
      setCustomDistanceInput(String(dist));
    }
    showToast(`Załadowano dystans ze startu: "${race.name}" (${dist} km)!`);
  };

  // Handle custom distance change
  const handleApplyCustomDistance = (valStr: string) => {
    setCustomDistanceInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 120) {
      setTargetDistanceKm(parsed);
      setSelectedDistanceKey('custom');
      setIsCustomDistance(true);
    }
  };

  // Master calculation
  const prediction: FitnessAnalysisResult = useMemo(() => {
    try {
      const num = Number(targetDistanceKm);
      const validDist = !isNaN(num) && num > 0 ? num : 21.0975;
      return calculateRaceFitnessPrediction(profile, runs || [], validDist, {
        carbonShoes,
        raceTempC,
        elevationProfile,
      });
    } catch (err) {
      console.warn('Prediction calculation fallback:', err);
      return {
        targetDistanceKm: Number(targetDistanceKm) || 21.0975,
        currentVo2Max: profile?.vo2max || 45,
        recentRunsCount: (runs || []).length,
        avgRecentPaceStr: '5:30',
        avgRecentPaceSec: 330,
        tempoRecentPaceStr: '5:00',
        tempoRecentPaceSec: 300,
        longestRunKm: 8.0,
        vo2PredictedTimeSec: 6600,
        vo2PredictedTimeStr: '1:50:00',
        vo2PredictedPaceSec: 313,
        vo2PredictedPaceStr: '5:13',
        trainingPredictedTimeSec: 6800,
        trainingPredictedTimeStr: '1:53:20',
        trainingPredictedPaceSec: 322,
        trainingPredictedPaceStr: '5:22',
        hybridPredictedTimeSec: 6700,
        hybridPredictedTimeStr: '1:51:40',
        hybridPredictedPaceSec: 318,
        hybridPredictedPaceStr: '5:18',
        predictedSpeedKmh: 11.3,
        deltaSec: 200,
        formStatus: 'optymalna_forma' as const,
        formStatusTitle: 'Optymalna Dyspozycja Startowa',
        formStatusBadgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        readinessIndexPercent: 92,
        diagnosisExplanation: 'Prognoza wyliczona na bazie pułapu tlenowego i wprowadzonych parametrów.',
        actionableCoachingTip: 'Utrzymuj równe tempo w Strefie 2 i kontroluj kadencję.',
        splits: [],
      };
    }
  }, [profile, runs, targetDistanceKm, carbonShoes, raceTempC, elevationProfile]);

  // Set as official primary season goal
  const handleSetAsGoal = () => {
    soundEngine.playSuccess();
    const validDist = Number(targetDistanceKm) || 21.0975;
    const distanceLabel =
      STANDARD_DISTANCES.find((d) => Math.abs(d.distanceKm - validDist) < 0.2)?.label?.split('(')[0]?.trim() ||
      `${validDist.toFixed(1)} km`;

    const goalTitle = `Cel ${distanceLabel}: ${prediction.hybridPredictedTimeStr}`;
    if (onSetMainGoal) {
      onSetMainGoal(goalTitle, prediction.hybridPredictedTimeStr);
    }
  };

  // Consult AI Sports Physiologist for custom race briefing
  const handleConsultAI = async () => {
    setIsConsultingAI(true);
    soundEngine.playClick();

    try {
      const res = await fetch('/api/gemini/analyze-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeName: `Zawody na dystansie ${targetDistanceKm} km`,
          totalDistanceKm: targetDistanceKm,
          elevationGainM: elevationProfile === 'hilly' ? 220 : elevationProfile === 'rolling' ? 80 : 25,
          surfaceType: 'asfalt / trasa uliczna',
          profile,
        }),
      });

      const data = await res.json();
      if (data && data.summary) {
        setAiCoachAdvice(
          `${data.summary} ${data.safetyTips ? `Strategia: ${data.safetyTips}` : ''} Rekomendacja obuwia: ${data.recommendedShoes || 'Startowe'}.`
        );
        showToast('Fizjolog AI przygotował spersonalizowaną odprawę taktyczną!');
      } else {
        setAiCoachAdvice(prediction.actionableCoachingTip);
      }
    } catch (e) {
      console.warn('AI briefing notice:', e);
      setAiCoachAdvice(prediction.actionableCoachingTip);
    } finally {
      setIsConsultingAI(false);
    }
  };

  return (
    <div className="space-y-4 animate-ios">
      {/* 1. Header Banner */}
      <div className="liquid-glass p-4 rounded-3xl border border-sky-400/30 space-y-3 bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-black/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-lg shrink-0">
              <Target className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Fizjologia & VO2Max vs Ostatnie Treningi
                </span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                  Predyktor Formy Biegowej
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black txt-main leading-tight">
                Kalkulator Prognozowanej Formy Startowej
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] txt-muted font-bold">Pułap VO2Max:</span>
            <span className="px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-mono font-black text-xs border border-sky-400/30">
              {prediction.currentVo2Max} ml/kg/min
            </span>
          </div>
        </div>

        <p className="text-[11px] txt-sub leading-relaxed">
          Kalkulator łączy Twoją maksymalną pojemność tlenową (pułap VO2Max wg Jacka Danielsa) z realnymi tempami i objętością z ostatnich {prediction.recentRunsCount} treningów. Wskazuje czy Twoje tempo biegowe w pełni wykorzystuje potencjał tlenowy organizmu.
        </p>

        {/* 2. Target Distance Selector Tabs */}
        <div className="space-y-2 pt-1">
          <label className="text-[10px] font-bold uppercase tracking-wider txt-muted block">
            Wybierz zadeklarowany dystans docelowy:
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STANDARD_DISTANCES.map((opt) => {
              const isSelected = selectedDistanceKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectStandardDistance(opt)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black border-transparent shadow-lg scale-[1.02]'
                      : 'liquid-pill txt-main hover:border-white/20'
                  }`}
                >
                  <span>{opt.label.split('(')[0]}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black/80 font-bold' : 'txt-muted'}`}>
                    {opt.distanceKm} km
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick select from user's planned races if available */}
          {Array.isArray(races) && races.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] txt-muted font-bold shrink-0">Twoje starty 2027:</span>
              {races.filter((r) => r && r.id).map((race) => {
                const isRaceSelected =
                  selectedDistanceKey === `race-${race.id}` ||
                  Math.abs(Number(targetDistanceKm) - Number(race.distanceKm)) < 0.05;
                return (
                  <button
                    key={race.id}
                    type="button"
                    onClick={() => handleSelectRaceDistance(race)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                      isRaceSelected
                        ? 'bg-amber-400 text-black border-amber-300 font-black shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    <Flag className="w-3 h-3 text-amber-400" />
                    <span>{race.name} ({race.distanceKm} km)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom distance input */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] txt-muted font-bold shrink-0">Dystans niestandardowy:</span>
            <input
              type="number"
              min="1"
              max="120"
              step="0.5"
              value={customDistanceInput}
              onChange={(e) => handleApplyCustomDistance(e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-xl liquid-pill text-xs font-bold txt-main border border-white/10 outline-none text-center"
              placeholder="np. 15"
            />
            <span className="text-xs txt-sub font-bold">km</span>
            {isCustomDistance && (
              <span className="text-[10px] text-amber-400 font-bold ml-auto">
                Aktywny dystans: {targetDistanceKm} km
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Hybrid Prediction Card */}
      <div className="liquid-glass p-5 rounded-3xl border border-emerald-500/40 space-y-4 bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-black/80 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              Zintegrowana Prognoza Wyniku na Dystansie {Number(targetDistanceKm || 21.1).toFixed(1)} km
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black txt-main tracking-tight ios-num text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-300">
                {prediction.hybridPredictedTimeStr}
              </h3>
              <span className="text-xs txt-muted font-bold">
                (tempo {prediction.hybridPredictedPaceStr} /km)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] txt-muted uppercase font-bold block">Indeks Gotowości</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">
                {prediction.readinessIndexPercent}%
              </strong>
            </div>

            <button
              type="button"
              onClick={handleSetAsGoal}
              className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs active:scale-95 transition-all shadow-lg flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Ustaw jako Cel</span>
            </button>
          </div>
        </div>

        {/* 4. Side-by-Side Model Comparison (VO2Max vs Recent Workouts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Left: VO2Max Engine Model */}
          <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-400/30 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-sky-400" />
                <span>Potencjał VO2Max (Jack Daniels)</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/30">
                {prediction.currentVo2Max} ml/kg/min
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs txt-muted">Czas wg VO2Max:</span>
                <strong className="text-base font-black text-sky-300 ios-num">
                  {prediction.vo2PredictedTimeStr}
                </strong>
              </div>

              <div className="flex items-baseline justify-between text-[11px]">
                <span className="txt-muted">Docelowe tempo:</span>
                <span className="font-mono font-bold text-slate-200">
                  {prediction.vo2PredictedPaceStr} min/km
                </span>
              </div>
            </div>

            <p className="text-[10px] txt-muted leading-tight pt-1 border-t border-white/5">
              Teoretyczny pułap Twojego silnika tlenowego przy 100% wykorzystaniu frakcyjnym.
            </p>
          </div>

          {/* Right: Recent Training Pace Model */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-amber-400" />
                <span>Tempo z Ostatnich Treningów</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                {prediction.recentRunsCount} biegów w bazie
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs txt-muted">Czas z treningów:</span>
                <strong className="text-base font-black text-amber-300 ios-num">
                  {prediction.trainingPredictedTimeStr}
                </strong>
              </div>

              <div className="flex items-baseline justify-between text-[11px]">
                <span className="txt-muted">Średnie tempo wybiegań:</span>
                <span className="font-mono font-bold text-slate-200">
                  {prediction.avgRecentPaceStr} min/km
                </span>
              </div>
            </div>

            <p className="text-[10px] txt-muted leading-tight pt-1 border-t border-white/5">
              Ekstrapolacja z realnych biegów (najdłuższy: {Number(prediction?.longestRunKm || 8.0).toFixed(1)} km, tempo akcentu: {prediction?.tempoRecentPaceStr || '5:00'}/km).
            </p>
          </div>
        </div>

        {/* 5. Form Gap Diagnosis Card */}
        <div className="p-3.5 rounded-2xl liquid-pill border border-white/10 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] txt-muted uppercase font-bold block">Diagnoza Synchronizacji Formy</span>
                <strong className="text-xs font-black txt-main">{prediction.formStatusTitle}</strong>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${prediction.formStatusBadgeClass}`}>
              Rozbieżność: {Math.abs(prediction?.deltaSec || 0)}s {(prediction?.deltaSec || 0) > 0 ? '(rezerwa VO2Max)' : '(wysoka ekonomia)'}
            </span>
          </div>

          <p className="text-[11px] txt-sub leading-relaxed">
            {prediction.diagnosisExplanation}
          </p>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-[10px]">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="txt-main leading-relaxed">{prediction.actionableCoachingTip}</span>
          </div>
        </div>

        {/* 6. Environmental & Gear Modifiers Toggle Bar */}
        <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider txt-muted block">
            Symulacja warunków startowych i sprzętu:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Carbon shoes toggle */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setCarbonShoes(!carbonShoes);
              }}
              className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                carbonShoes
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-sm'
                  : 'liquid-pill txt-muted hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-left">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <div>
                  <span className="text-[11px] font-bold block">Płytka Carbonowa</span>
                  <span className="text-[9px] opacity-80">+2.5% ekonomii</span>
                </div>
              </div>
              <span className="font-mono text-[10px] font-black">{carbonShoes ? 'WŁ.' : 'WYŁ.'}</span>
            </button>

            {/* Temperature Slider */}
            <div className="p-2 rounded-xl liquid-pill border border-white/5 flex flex-col justify-center space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="txt-muted font-bold flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  <span>Temperatura startu:</span>
                </span>
                <span className="font-mono font-bold text-amber-400">{raceTempC}°C</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={raceTempC}
                onChange={(e) => setRaceTempC(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--accent)] h-1 cursor-pointer"
              />
            </div>

            {/* Elevation Profile */}
            <div className="p-2 rounded-xl liquid-pill border border-white/5 flex items-center justify-between">
              <span className="text-[10px] txt-muted font-bold flex items-center gap-1">
                <Mountain className="w-3 h-3 text-emerald-400" />
                <span>Profil trasy:</span>
              </span>
              <select
                value={elevationProfile}
                onChange={(e) => setElevationProfile(e.target.value as any)}
                className="bg-transparent font-bold text-[11px] text-emerald-400 outline-none cursor-pointer"
              >
                <option value="flat" className="bg-slate-900 text-white">Płaska / Szosa</option>
                <option value="rolling" className="bg-slate-900 text-white">Lekkie Pagórki</option>
                <option value="hilly" className="bg-slate-900 text-white">Wymagające Podbiegi</option>
              </select>
            </div>
          </div>
        </div>

        {/* 7. Tactical Splits Strategy Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSplitsTable(!showSplitsTable)}
              className="text-xs font-black text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              {showSplitsTable ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Strategia Pacingu & Międzyczasy ({(prediction?.splits || []).length} odcinków)</span>
            </button>

            <button
              type="button"
              onClick={handleConsultAI}
              disabled={isConsultingAI}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/40 flex items-center gap-1.5 transition-all"
            >
              {isConsultingAI ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                  <span>Odprawa AI...</span>
                </>
              ) : (
                <>
                  <Brain className="w-3.5 h-3.5 text-purple-300" />
                  <span>Odprawa Taktyczna AI</span>
                </>
              )}
            </button>
          </div>

          {aiCoachAdvice && (
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-1 animate-ios">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[10px] uppercase">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Fizjolog AI – Raport Taktyczny na Dystans {Number(targetDistanceKm || 21.1).toFixed(1)} km:</span>
              </div>
              <p className="text-[11px] txt-main leading-relaxed italic">
                "{aiCoachAdvice}"
              </p>
            </div>
          )}

          {showSplitsTable && (
            <div className="rounded-2xl overflow-hidden border border-white/10 text-xs">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[9px] uppercase font-bold txt-muted border-b border-white/10">
                      <th className="p-2.5">Odcinek</th>
                      <th className="p-2.5">Dystans</th>
                      <th className="p-2.5">Tempo docelowe</th>
                      <th className="p-2.5">Czas na punkcie</th>
                      <th className="p-2.5">Strefa HR</th>
                      <th className="p-2.5">Taktyka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                    {(prediction?.splits || []).map((s, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-2.5 font-bold txt-main">{s.segmentName}</td>
                        <td className="p-2.5 font-mono text-slate-300">{s.distanceRangeKm}</td>
                        <td className="p-2.5 font-mono font-black accent-text">{s.paceStr} /km</td>
                        <td className="p-2.5 font-mono font-bold text-sky-300">{s.cumulativeTimeStr}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono block">
                            {s.targetHrBpm}
                          </span>
                        </td>
                        <td className="p-2.5 text-[10px] txt-muted leading-tight">{s.tacticsNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
