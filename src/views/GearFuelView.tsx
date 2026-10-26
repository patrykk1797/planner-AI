import React, { useState } from 'react';
import {
  Footprints,
  Utensils,
  Zap,
  Sparkles,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Bot,
  Activity,
  Droplets,
  Flame,
  Scale,
  Gauge,
  Layers,
  Compass,
  Eye,
  Info,
  ArrowUpRight
} from 'lucide-react';
import { Shoe, RunnerProfile } from '../types.ts';
import { calculateCarbLoading, calculateFuelingPlan, calculateDailyHydration } from '../utils/runningMath.ts';
import { ShoeBrandLogo } from '../components/icons/ShoeBrandLogo.tsx';
import { ShoeDetailModal } from '../components/modals/ShoeDetailModal.tsx';
import {
  enrichShoeSpecs,
  SHOE_TRAINING_PURPOSE_MAP,
  explainShoeDrop,
} from '../utils/shoeBiometrics.ts';

interface GearFuelViewProps {
  shoes: Shoe[];
  runs?: Array<{ distanceKm: number; shoeName?: string }>;
  profile: RunnerProfile;
  onAddShoe: (shoe: Shoe) => void;
  onUpdateShoe?: (shoe: Shoe) => void;
  onDeleteShoe?: (id: string) => void;
  onSelectMainShoe: (id: string) => void;
  showToast: (msg: string) => void;
}

export const GearFuelView: React.FC<GearFuelViewProps> = ({
  shoes,
  runs = [],
  profile,
  onAddShoe,
  onUpdateShoe,
  onDeleteShoe,
  onSelectMainShoe,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'shoes' | 'carb' | 'fueling'>('shoes');

  // Carb-loading & Fueling Plan state
  const [targetRaceDistance, setTargetRaceDistance] = useState<'half' | 'marathon'>('marathon');
  const [fuelingDistance, setFuelingDistance] = useState<'5k' | '10k' | 'half' | 'marathon' | 'ultra'>('marathon');
  const [checkedFoods, setCheckedFoods] = useState<Record<string, boolean>>({});

  // Custom AI shoe modal & comparison state
  const [isAiShoeModalOpen, setIsAiShoeModalOpen] = useState<boolean>(false);
  const [customShoeQuery, setCustomShoeQuery] = useState<string>('');
  const [customInitialMileage, setCustomInitialMileage] = useState<number>(0);
  const [editingInitialShoeId, setEditingInitialShoeId] = useState<string | null>(null);
  const [editingInitialVal, setEditingInitialVal] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<Shoe | null>(null);

  const [compareShoeIds, setCompareShoeIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [selectedShoeForDetails, setSelectedShoeForDetails] = useState<Shoe | null>(null);

  const toggleCompareShoe = (id: string) => {
    if (compareShoeIds.includes(id)) {
      setCompareShoeIds(compareShoeIds.filter(i => i !== id));
    } else {
      if (compareShoeIds.length >= 2) {
        showToast('Możesz porównać maksymalnie 2 modele butów jednocześnie.');
      } else {
        setCompareShoeIds([...compareShoeIds, id]);
      }
    }
  };

  // Shoe Successor Modal state
  const [isSuccessorModalOpen, setIsSuccessorModalOpen] = useState<boolean>(false);
  const [successorShoe, setSuccessorShoe] = useState<Shoe | null>(null);
  const [successorCategory, setSuccessorCategory] = useState<'treningowe' | 'startowe' | 'trail' | 'regeneracyjne'>('treningowe');
  const [isFetchingSuccessors, setIsFetchingSuccessors] = useState<boolean>(false);
  const [successorRecommendations, setSuccessorRecommendations] = useState<Array<{ name: string; brand: string; dropMm: number; cushion: string; reason: string }> | null>(null);

  const handleFindSuccessor = async (shoe: Shoe, category: string = successorCategory) => {
    setSuccessorShoe(shoe);
    setIsSuccessorModalOpen(true);
    setIsFetchingSuccessors(true);
    setSuccessorRecommendations(null);

    try {
      const res = await fetch('/api/gemini/shoe-successors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retiredShoeName: shoe.name,
          retiredShoeBrand: shoe.brand,
          runnerWeight: profile.weight,
          runnerGoal: profile.targetGoal,
          category,
        }),
      });
      const data = await res.json();
      setSuccessorRecommendations(data);
    } catch {
      showToast('Błąd pobierania propozycji następców.');
      setSuccessorRecommendations([
        { name: 'Nike Pegasus 41', brand: 'Nike', dropMm: 10, cushion: 'Wszechstronna', reason: 'Niezawodny model treningowy.' }
      ]);
    } finally {
      setIsFetchingSuccessors(false);
    }
  };

  const carbProtocol = calculateCarbLoading(profile.weight, targetRaceDistance);
  const fuelingPlan = calculateFuelingPlan(fuelingDistance, 210);
  const dailyWater = calculateDailyHydration(profile.weight, 20, 0);

  const handleAnalyzeShoe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customShoeQuery.trim()) return;

    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-shoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoeQuery: customShoeQuery.trim(),
          runnerWeight: profile.weight,
          runnerGoal: profile.targetGoal,
        }),
      });

      const data = await res.json();
      const enrichedNewShoe = enrichShoeSpecs({
        id: `shoe-${Date.now()}`,
        name: data.name || customShoeQuery.trim(),
        brand: data.brand || 'Biegowe Pro',
        footType: data.footType || 'Neutralna',
        dropMm: typeof data.dropMm === 'number' ? data.dropMm : 8,
        dropDescription: data.dropDescription,
        weightG: data.weightG || 260,
        energyReturn: data.energyReturn || 8,
        cushionRating: data.cushionRating || 8,
        stabilityRating: data.stabilityRating || 7,
        cushion: data.cushion || 'Średnia / Responsywna',
        cushionLevel: data.cushionLevel,
        dynamicsLevel: data.dynamicsLevel,
        stabilityType: data.stabilityType,
        trainingPurposes: data.trainingPurposes,
        recommendedDistance: data.recommendedDistance,
        plateType: data.plateType,
        surfaceType: data.surfaceType,
        foamTechnology: data.foamTechnology,
        idealFor: data.idealFor || 'Codzienne wybiegania',
        mileageKm: 0,
        maxMileageKm: 700,
        aiVerdict: data.aiNotes || data.aiVerdict,
        brandLogoUrl: data.brandLogoUrl,
        brandLogoSvg: data.brandLogoSvg,
        brandPrimaryColor: data.brandPrimaryColor,
        brandTagline: data.brandTagline,
      });

      setAiAnalysisResult(enrichedNewShoe);
      showToast(`Przeanalizowano model ${enrichedNewShoe.name} (${enrichedNewShoe.brand})!`);
    } catch {
      showToast('Błąd analizy obuwia.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalyzedShoe = () => {
    if (!aiAnalysisResult) return;
    const initialKm = Math.max(0, Number(customInitialMileage) || 0);
    const enrichedWithInitial: Shoe = {
      ...aiAnalysisResult,
      initialMileageKm: initialKm,
      mileageKm: initialKm,
    };
    onAddShoe(enrichedWithInitial);
    showToast(`Dodano ${aiAnalysisResult.name} (Początkowy: ${initialKm} km) do Szafy Biegowej! 👟`);
    setIsAiShoeModalOpen(false);
    setAiAnalysisResult(null);
    setCustomShoeQuery('');
    setCustomInitialMileage(0);
  };

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Top Header Card */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              <span>SPRZĘT, DIETA & STRATEGIA STARTOWA</span>
            </span>
            <h2 className="text-base font-bold txt-main">Szafa Obuwia & Odżywianie</h2>
          </div>
          <span className="text-xs font-black px-2.5 py-0.5 rounded-full accent-badge">
            Fitatu Sync
          </span>
        </div>

        {/* 3 Sub-tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 liquid-pill text-center">
          <button
            type="button"
            onClick={() => setSubTab('shoes')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              subTab === 'shoes' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Szafa Obuwia</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('carb')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              subTab === 'carb' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Carb-Loading</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('fueling')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              subTab === 'fueling' ? 'liquid-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fueling Plan</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SHOES ROTATION */}
      {subTab === 'shoes' && (
        <div className="space-y-3 animate-ios">
          {/* Action row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold txt-main flex items-center gap-1">
              <span>Aktywne buty ({shoes.length} modeli)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (compareShoeIds.length !== 2) {
                    showToast('Wybierz zaznaczając "Porównaj" dokładnie 2 modele butów.');
                  } else {
                    setIsCompareModalOpen(true);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1 ${
                  compareShoeIds.length === 2 ? 'liquid-active shadow-md' : 'liquid-pill txt-sub'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Porównaj ({compareShoeIds.length}/2)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAiShoeModalOpen(true)}
                className="liquid-active px-3 py-1.5 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>+ Własny model AI</span>
              </button>
            </div>
          </div>

          {/* Shoe Cards */}
          <div className="space-y-3">
            {shoes.length === 0 ? (
              <div className="liquid-glass p-8 text-center space-y-3 border border-white/10 rounded-2xl">
                <Footprints className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
                <h3 className="text-sm font-black txt-main">Brak butów w Twojej szafie biegowej</h3>
                <p className="text-xs txt-sub max-w-xs mx-auto">
                  Twój profil nie posiada jeszcze dodanego obuwia. Kliknij przycisk poniżej, aby przeanalizować i dodać swoje buty biegowe!
                </p>
                <button
                  type="button"
                  onClick={() => setIsAiShoeModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl accent-bg text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>+ Dodaj Pierwszą Parę Butów</span>
                </button>
              </div>
            ) : (
              shoes.map((shoe) => {
                const initialKm = Number(shoe.initialMileageKm) || 0;
                const runsKm = (runs || [])
                  .filter((r) => r.shoeName && r.shoeName.toLowerCase() === shoe.name.toLowerCase())
                  .reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);
                const totalCalculatedKm = +(initialKm + runsKm).toFixed(1);
                const currentTotalKm = totalCalculatedKm > 0 ? totalCalculatedKm : (shoe.mileageKm || 0);

                const enriched = {
                  ...enrichShoeSpecs(shoe),
                  mileageKm: currentTotalKm,
                };
                const maxThresholdKm = enriched.maxMileageKm || 700;
                const isOver700 = currentTotalKm >= maxThresholdKm;
                const wearPercent = Math.min(100, Math.round((currentTotalKm / maxThresholdKm) * 100));
                const isSelected = profile.selectedShoeId === enriched.id;

                return (
                  <div
                    key={enriched.id}
                    className={`liquid-glass p-4 space-y-3 transition-all border rounded-2xl ${
                      isOver700
                        ? 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <ShoeBrandLogo
                          brand={enriched.brand}
                          shoeName={enriched.name}
                          brandLogoUrl={enriched.brandLogoUrl}
                          brandLogoSvg={enriched.brandLogoSvg}
                          primaryColor={enriched.brandPrimaryColor}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black txt-main">{enriched.name}</h3>
                            {isSelected && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full accent-badge">
                                Aktywny
                              </span>
                            )}
                            {isOver700 && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Wymaga wymiany (&gt;700 km)</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] txt-muted block">
                            Producent: <strong className="text-white">{enriched.brand}</strong> • Stopa: <strong className="text-sky-300">{enriched.footType || 'Neutralna'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleCompareShoe(enriched.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            compareShoeIds.includes(enriched.id)
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'liquid-pill txt-sub hover:text-white'
                          }`}
                        >
                          {compareShoeIds.includes(enriched.id) ? 'Porównywany' : 'Porównaj'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMainShoe(enriched.id);
                            showToast(`Ustawiono ${enriched.name} jako but bazowy!`);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'liquid-pill txt-sub hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Wybrany' : 'Wybierz'}
                        </button>
                        {onDeleteShoe && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteShoe(enriched.id);
                              showToast(`Usunięto model ${enriched.name} z szafy!`);
                            }}
                            aria-label={`Usuń ${enriched.name}`}
                            title="Usuń but z szafy"
                            className="w-7 h-7 rounded-lg liquid-pill flex items-center justify-center text-xs txt-sub hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Training Purposes Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {(enriched.trainingPurposes || []).map((purpose) => {
                        const badge = SHOE_TRAINING_PURPOSE_MAP[purpose];
                        if (!badge) return null;
                        return (
                          <span
                            key={purpose}
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md ${badge.bg} ${badge.color} border ${badge.border}`}
                          >
                            {badge.shortLabel}
                          </span>
                        );
                      })}
                      {enriched.recommendedDistance && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                          🏁 {enriched.recommendedDistance}
                        </span>
                      )}
                    </div>

                    {/* Mileage progress bar with initial offset & 700km red alarm */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="txt-muted flex items-center gap-1">
                          <Activity className="w-3 h-3 text-slate-400" />
                          <span>Całkowity Przebieg / Limit:</span>
                        </span>
                        <strong className={`ios-num ${isOver700 ? 'text-rose-400 font-black' : 'txt-main'}`}>
                          {enriched.mileageKm} / {maxThresholdKm} km ({wearPercent}%)
                        </strong>
                      </div>

                      {/* Mileage breakdown: Initial offset + Logged workouts */}
                      <div className="flex items-center justify-between text-[9.5px] px-2.5 py-1 rounded-lg bg-black/35 border border-white/5 flex-wrap gap-1">
                        <span className="text-slate-300">
                          Początkowy: <strong className="text-amber-400 font-mono">{initialKm} km</strong> • Zalogowane biegi: <strong className="text-emerald-400 font-mono">+{+runsKm.toFixed(1)} km</strong>
                        </span>
                        {onUpdateShoe && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInitialShoeId(shoe.id);
                              setEditingInitialVal(initialKm);
                            }}
                            className="text-[9px] font-bold text-orange-400 hover:text-orange-300 underline cursor-pointer"
                          >
                            ✏️ Zmień offset początkowy
                          </button>
                        )}
                      </div>

                      {/* Inline Initial Mileage Editor */}
                      {editingInitialShoeId === shoe.id && onUpdateShoe && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-orange-500/40 animate-ios">
                          <label className="text-[10px] text-orange-400 font-bold shrink-0">Przebieg początkowy:</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editingInitialVal}
                            onChange={(e) => setEditingInitialVal(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-20 px-2 py-0.5 rounded bg-black border border-white/20 text-xs font-mono font-bold text-white outline-none"
                          />
                          <span className="text-[10px] txt-muted">km</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedShoe: Shoe = {
                                ...shoe,
                                initialMileageKm: editingInitialVal,
                                mileageKm: +(editingInitialVal + runsKm).toFixed(1),
                              };
                              onUpdateShoe(updatedShoe);
                              setEditingInitialShoeId(null);
                              showToast(`Zaktualizowano przebieg początkowy dla ${shoe.name} na ${editingInitialVal} km! 👟`);
                            }}
                            className="px-2 py-1 rounded bg-orange-500 text-slate-950 font-black text-[10px] cursor-pointer"
                          >
                            Zapisz
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInitialShoeId(null)}
                            className="px-2 py-1 rounded bg-white/10 text-slate-300 font-bold text-[10px] cursor-pointer"
                          >
                            Anuluj
                          </button>
                        </div>
                      )}

                      {/* Progress Bar Container */}
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver700
                              ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                              : wearPercent >= 75
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${wearPercent}%` }}
                        />
                      </div>

                      {isOver700 && (
                        <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2">
                          <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Zużycie pianki amortyzującej przekroczyło limit 700 km! Ryzyko przeciążenia stawów.</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFindSuccessor(enriched)}
                            className="liquid-active px-2.5 py-1 text-[10px] font-black rounded-lg flex items-center gap-1 shadow-md hover:brightness-110 active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3 h-3 text-black" />
                            <span>Znajdź następcę</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Advanced Biomechanical 4-Tile Row */}
                    <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2 rounded-xl liquid-pill text-center text-[10px]">
                      <div>
                        <span className="text-[8px] txt-muted block uppercase">Drop</span>
                        <span className="font-black text-amber-400">{enriched.dropMm} mm</span>
                      </div>
                      <div>
                        <span className="text-[8px] txt-muted block uppercase">Amortyzacja</span>
                        <span className="font-black text-emerald-400">{enriched.cushionRating || 8}/10</span>
                      </div>
                      <div>
                        <span className="text-[8px] txt-muted block uppercase">Dynamika</span>
                        <span className="font-black accent-text">{enriched.energyReturn || 8}/10</span>
                      </div>
                      <div>
                        <span className="text-[8px] txt-muted block uppercase">Stabilność</span>
                        <span className="font-black text-sky-400">{enriched.stabilityRating || 7}/10</span>
                      </div>
                    </div>

                    {/* Interactive Button to View Full Technical & Biomechanical Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedShoeForDetails(enriched)}
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold txt-main flex items-center justify-between transition-all group"
                    >
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Compass className="w-3.5 h-3.5 text-sky-400" />
                        <span>Szczegółowa biometria & specyfikacja</span>
                      </span>
                      <span className="text-[10px] text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-bold">
                        <span>Otwórz analizę</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </button>

                    {enriched.aiVerdict && (
                      <div className="liquid-pill p-2 text-[10px] txt-sub leading-snug border-l-2 border-emerald-400 flex items-start gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Werdykt AI:</strong> {enriched.aiVerdict}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CARB-LOADING */}
      {subTab === 'carb' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  <span>Protokół Ładowania Węglowodanów</span>
                </span>
                <h3 className="text-sm font-black txt-main">Carb-Loading (3 dni przed startem)</h3>
              </div>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTargetRaceDistance('half')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    targetRaceDistance === 'half' ? 'bg-amber-400 text-black font-black' : 'liquid-pill txt-sub'
                  }`}
                >
                  Półmaraton
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRaceDistance('marathon')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    targetRaceDistance === 'marathon' ? 'bg-amber-400 text-black font-black' : 'liquid-pill txt-sub'
                  }`}
                >
                  Maraton
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <span className="text-[9px] txt-muted font-bold uppercase block">Cel dzienny węglowodanów</span>
                <strong className="text-lg font-black text-amber-300 ios-num">{carbProtocol.dailyCarbsG} g/dzień</strong>
                <span className="text-[9px] text-amber-400 block font-bold">Faza: {carbProtocol.durationHours}h przed startem</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-[9px] txt-muted font-bold uppercase block">Zalecenia Fitatu</span>
                <strong className="text-sm font-black text-emerald-400 ios-num">{carbProtocol.recommendations.length} wytycznych</strong>
                <span className="text-[9px] text-emerald-400 block font-bold">Wątroba & Mięśnie</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Zalecane produkty na ładowanie:</span>
              <div className="space-y-1">
                {carbProtocol.foodList.map((foodItem) => {
                  const foodKey = foodItem.name;
                  const isChecked = Boolean(checkedFoods[foodKey]);
                  return (
                    <button
                      key={foodKey}
                      type="button"
                      onClick={() => setCheckedFoods((prev) => ({ ...prev, [foodKey]: !prev[foodKey] }))}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                        isChecked ? 'bg-emerald-500/20 border-emerald-400 text-white' : 'liquid-pill border-white/10 txt-sub'
                      }`}
                    >
                      <div>
                        <div>{foodItem.name}</div>
                        <div className="text-[10px] text-slate-400">{foodItem.portion} • {foodItem.carbsG}g węgli</div>
                      </div>
                      {isChecked ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FUELING PLAN */}
      {subTab === 'fueling' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Strategia Żeli & Nawodnienia</span>
                </span>
                <h3 className="text-sm font-black txt-main">{fuelingPlan.strategyName}</h3>
              </div>

              <select
                value={fuelingDistance}
                onChange={(e) => setFuelingDistance(e.target.value as any)}
                className="liquid-pill px-2.5 py-1 text-xs font-bold txt-main outline-none"
              >
                <option value="10k">10 km</option>
                <option value="half">Półmaraton</option>
                <option value="marathon">Maraton</option>
                <option value="ultra">Ultra / Trail</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl liquid-pill">
                <span className="text-[9px] txt-muted block uppercase">Punkty Żeli</span>
                <strong className="text-sm font-black txt-main">{fuelingPlan.gelCheckpointsKm.length} pkt</strong>
              </div>
              <div className="p-2.5 rounded-xl liquid-pill">
                <span className="text-[9px] txt-muted block uppercase">Podaż węgli</span>
                <strong className="text-sm font-black text-amber-300">{fuelingPlan.carbsPerHour} g/h</strong>
              </div>
              <div className="p-2.5 rounded-xl liquid-pill">
                <span className="text-[9px] txt-muted block uppercase">Nawodnienie</span>
                <strong className="text-sm font-black text-sky-300">{(dailyWater / 1000).toFixed(1)} L/dzień</strong>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Harmonogram Punktów Kontrolnych:</span>
              <div className="space-y-1.5">
                {fuelingPlan.gelCheckpointsKm.map((km, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold txt-main">Kilometr {km} trasy</div>
                        <div className="text-[10px] txt-muted">Przyjmij żel energetyczny z wodą</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      ~30g CWO
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Custom Shoe Modal */}
      {isAiShoeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-3 animate-ios"
        >
          <div className="liquid-glass w-full max-w-md p-5 space-y-4 border border-white/15 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black txt-main">Dodaj Nowy Model AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiShoeModalOpen(false)}
                className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAnalyzeShoe} className="space-y-3">
              <div>
                <label className="text-[10px] txt-muted block mb-1">Nazwa / Model obuwia</label>
                <input
                  type="text"
                  value={customShoeQuery}
                  onChange={(e) => setCustomShoeQuery(e.target.value)}
                  placeholder="np. Nike Vaporfly 3, Asics Superblast 2, Hoka Clifton 9..."
                  className="w-full liquid-pill px-3 py-2.5 txt-main font-bold text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] txt-muted block mb-1">
                  Początkowy przebieg buta (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={customInitialMileage || ''}
                  onChange={(e) => setCustomInitialMileage(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0 (nowy) lub np. 300 km"
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold text-xs outline-none focus:border-emerald-400"
                />
                <span className="text-[9px] txt-muted block mt-0.5">
                  Podaj aktualny przebieg (np. 300 km). Nowe treningi będą automatycznie doliczane do tej wartości.
                </span>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !customShoeQuery.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-60 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Analizowanie biometrii obuwia...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Przeanalizuj przez Gemini AI</span>
                  </>
                )}
              </button>
            </form>

            {aiAnalysisResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/45 space-y-3 text-xs animate-ios">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ShoeBrandLogo
                      brand={aiAnalysisResult.brand}
                      shoeName={aiAnalysisResult.name}
                      brandLogoUrl={aiAnalysisResult.brandLogoUrl}
                      brandLogoSvg={aiAnalysisResult.brandLogoSvg}
                      primaryColor={aiAnalysisResult.brandPrimaryColor}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="font-black text-white text-sm truncate">{aiAnalysisResult.name}</h4>
                      <span className="text-[10px] txt-muted block truncate">
                        Producent: <strong className="text-white">{aiAnalysisResult.brand}</strong> • Stopa: <strong className="text-sky-300">{aiAnalysisResult.footType}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    {aiAnalysisResult.brand}
                  </span>
                </div>

                {/* Training Purpose Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(aiAnalysisResult.trainingPurposes || []).map((purpose) => {
                    const badge = SHOE_TRAINING_PURPOSE_MAP[purpose];
                    if (!badge) return null;
                    return (
                      <span
                        key={purpose}
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md ${badge.bg} ${badge.color} border ${badge.border}`}
                      >
                        {badge.shortLabel}
                      </span>
                    );
                  })}
                  {aiAnalysisResult.recommendedDistance && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                      🏁 {aiAnalysisResult.recommendedDistance}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center text-[10px]">
                  <div>
                    <span className="txt-muted block uppercase text-[8px]">Drop</span>
                    <strong className="text-amber-400 font-black">{aiAnalysisResult.dropMm} mm</strong>
                  </div>
                  <div>
                    <span className="txt-muted block uppercase text-[8px]">Amortyzacja</span>
                    <strong className="text-emerald-300 font-black">{aiAnalysisResult.cushionRating || 8}/10</strong>
                  </div>
                  <div>
                    <span className="txt-muted block uppercase text-[8px]">Dynamika</span>
                    <strong className="text-orange-400 font-black">{aiAnalysisResult.energyReturn || 8}/10</strong>
                  </div>
                  <div>
                    <span className="txt-muted block uppercase text-[8px]">Stabilność</span>
                    <strong className="text-sky-300 font-black">{aiAnalysisResult.stabilityRating || 7}/10</strong>
                  </div>
                </div>

                {aiAnalysisResult.dropDescription && (
                  <p className="text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    📐 <strong>Biomechanika dropu:</strong> {aiAnalysisResult.dropDescription}
                  </p>
                )}

                <p className="text-[11px] txt-sub leading-snug bg-black/30 p-2.5 rounded-xl border border-white/5">
                  🤖 <strong>Analiza AI:</strong> {aiAnalysisResult.aiVerdict}
                </p>

                <button
                  type="button"
                  onClick={handleSaveAnalyzedShoe}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-md transition-all mt-1 cursor-pointer"
                >
                  + Dodaj but do Szafy Biegacza
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shoe Comparison Modal */}
      {isCompareModalOpen && compareShoeIds.length === 2 && (() => {
        const rawShoeA = shoes.find(s => s.id === compareShoeIds[0]);
        const rawShoeB = shoes.find(s => s.id === compareShoeIds[1]);
        if (!rawShoeA || !rawShoeB) return null;
        const shoeA = enrichShoeSpecs(rawShoeA);
        const shoeB = enrichShoeSpecs(rawShoeB);
        return (
          <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-3 animate-ios">
            <div className="liquid-glass w-full max-w-lg p-5 space-y-4 border border-white/15 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black txt-main">Zestawienie & Porównanie Obuwia</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Shoe A */}
                <div className="p-3.5 rounded-2xl liquid-pill space-y-2 border border-white/10">
                  <span className="text-[9px] font-black uppercase text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">Model A</span>
                  <h4 className="font-black text-white text-sm">{shoeA.name}</h4>
                  <div className="text-[10px] txt-muted">{shoeA.brand}</div>
                  <div className="space-y-1 pt-2 border-t border-white/10 text-[11px]">
                    <div className="flex justify-between">
                      <span className="txt-muted">Przebieg:</span>
                      <strong className="font-bold txt-main">{shoeA.mileageKm} / {shoeA.maxMileageKm || 700} km</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Drop:</span>
                      <strong className="font-bold text-amber-400">{shoeA.dropMm} mm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Amortyzacja:</span>
                      <strong className="font-bold text-emerald-400">{shoeA.cushionRating || 8}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Dynamika:</span>
                      <strong className="font-bold accent-text">{shoeA.energyReturn || 8}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Stabilność:</span>
                      <strong className="font-bold text-sky-400">{shoeA.stabilityRating || 7}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Typ stopy:</span>
                      <strong className="font-bold txt-main">{shoeA.footType}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Dystans:</span>
                      <strong className="font-bold txt-main">{shoeA.recommendedDistance}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Płytka:</span>
                      <strong className="font-bold txt-main truncate">{shoeA.plateType}</strong>
                    </div>
                  </div>
                  {shoeA.aiVerdict && (
                    <div className="text-[10px] txt-sub bg-black/20 p-2 rounded-xl">
                      <strong>Werdykt:</strong> {shoeA.aiVerdict}
                    </div>
                  )}
                </div>

                {/* Shoe B */}
                <div className="p-3.5 rounded-2xl liquid-pill space-y-2 border border-white/10">
                  <span className="text-[9px] font-black uppercase text-sky-400 px-2 py-0.5 rounded bg-sky-500/10">Model B</span>
                  <h4 className="font-black text-white text-sm">{shoeB.name}</h4>
                  <div className="text-[10px] txt-muted">{shoeB.brand}</div>
                  <div className="space-y-1 pt-2 border-t border-white/10 text-[11px]">
                    <div className="flex justify-between">
                      <span className="txt-muted">Przebieg:</span>
                      <strong className="font-bold txt-main">{shoeB.mileageKm} / {shoeB.maxMileageKm || 700} km</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Drop:</span>
                      <strong className="font-bold text-amber-400">{shoeB.dropMm} mm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Amortyzacja:</span>
                      <strong className="font-bold text-emerald-400">{shoeB.cushionRating || 8}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Dynamika:</span>
                      <strong className="font-bold accent-text">{shoeB.energyReturn || 8}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Stabilność:</span>
                      <strong className="font-bold text-sky-400">{shoeB.stabilityRating || 7}/10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Typ stopy:</span>
                      <strong className="font-bold txt-main">{shoeB.footType}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Dystans:</span>
                      <strong className="font-bold txt-main">{shoeB.recommendedDistance}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="txt-muted">Płytka:</span>
                      <strong className="font-bold txt-main truncate">{shoeB.plateType}</strong>
                    </div>
                  </div>
                  {shoeB.aiVerdict && (
                    <div className="text-[10px] txt-sub bg-black/20 p-2 rounded-xl">
                      <strong>Werdykt:</strong> {shoeB.aiVerdict}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="w-full py-2.5 rounded-xl liquid-active text-slate-950 font-black text-xs hover:brightness-110 shadow-md transition-all"
              >
                Zamknij Porównanie
              </button>
            </div>
          </div>
        );
      })()}

      {/* Shoe Detail Modal with Full Biomechanical and Technical Analysis */}
      <ShoeDetailModal
        isOpen={Boolean(selectedShoeForDetails)}
        onClose={() => setSelectedShoeForDetails(null)}
        shoe={selectedShoeForDetails}
        profile={profile}
        onSelectMainShoe={onSelectMainShoe}
        isSelected={profile.selectedShoeId === selectedShoeForDetails?.id}
      />

      {/* Shoe Successor AI Modal */}
      {isSuccessorModalOpen && successorShoe && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-3 animate-ios">
          <div className="liquid-glass w-full max-w-md p-5 space-y-4 border border-white/15 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black txt-main">Następca dla: {successorShoe.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSuccessorModalOpen(false)}
                className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs txt-sub">
              Model zużyty po {successorShoe.mileageKm} km. Oto rekomendacje od AI dopasowane do Twojej wagi ({profile.weight} kg) i celu ({profile.targetGoal}):
            </p>

            {/* Category Filter */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] txt-muted block uppercase font-bold">Wybierz kategorię obuwia:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'treningowe', label: 'Codzienne Treningowe' },
                  { id: 'startowe', label: 'Startowe / Karbon' },
                  { id: 'trail', label: 'Trail / Teren' },
                  { id: 'regeneracyjne', label: 'Regeneracyjne / Max' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSuccessorCategory(cat.id as any);
                      if (successorShoe) handleFindSuccessor(successorShoe, cat.id);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                      successorCategory === cat.id
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                        : 'liquid-pill txt-sub hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {isFetchingSuccessors ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="text-xs txt-muted font-bold block">Gemini analizuje rynek obuwia i dobiera następcę...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {successorRecommendations?.map((rec, idx) => (
                  <div key={idx} className="liquid-pill p-3.5 space-y-2 border border-emerald-500/30 bg-emerald-950/10 rounded-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ShoeBrandLogo brand={rec.brand} shoeName={rec.name} size="sm" />
                        <h4 className="font-black text-white text-sm truncate">{rec.name}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20 shrink-0">{rec.brand}</span>
                    </div>
                    <div className="flex gap-2 text-[10px] txt-muted font-mono">
                      <span>Drop: {rec.dropMm} mm</span>
                      <span>•</span>
                      <span>Amortyzacja: {rec.cushion}</span>
                    </div>
                    <p className="text-[11px] txt-sub leading-snug">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsSuccessorModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-md transition-all"
            >
              Zamknij Rekomendacje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
