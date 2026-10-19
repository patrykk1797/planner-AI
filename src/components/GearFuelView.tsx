import React, { useState } from 'react';
import { Shoe, RunnerProfile } from '../types.ts';
import { calculateCarbLoading, calculateFuelingPlan, calculateDailyHydration } from '../utils/runningMath.ts';

interface GearFuelViewProps {
  shoes: Shoe[];
  profile: RunnerProfile;
  onAddShoe: (shoe: Shoe) => void;
  onDeleteShoe?: (id: string) => void;
  onSelectMainShoe: (id: string) => void;
  showToast: (msg: string) => void;
}

export const GearFuelView: React.FC<GearFuelViewProps> = ({
  shoes,
  profile,
  onAddShoe,
  onDeleteShoe,
  onSelectMainShoe,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'shoes' | 'carb' | 'fueling'>('shoes');

  // Shoe brand filter
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Carb-loading state
  const [targetRaceDistance, setTargetRaceDistance] = useState<'half' | 'marathon'>('marathon');
  const [checkedFoods, setCheckedFoods] = useState<Record<string, boolean>>({});

  // Custom AI shoe modal
  const [isAiShoeModalOpen, setIsAiShoeModalOpen] = useState<boolean>(false);
  const [customShoeQuery, setCustomShoeQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<Shoe | null>(null);

  const carbProtocol = calculateCarbLoading(profile.weight, targetRaceDistance);
  const fuelingPlan = calculateFuelingPlan(targetRaceDistance, 210);
  const dailyWater = calculateDailyHydration(profile.weight, 20, 0);

  const BRANDS = ['all', 'ASICS', 'Nike', 'Adidas', 'Hoka', 'Saucony', 'New Balance', 'Brooks', 'Puma', 'On Running', 'Mizuno', 'Altra', 'Salomon'];

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
      const newShoe: Shoe = {
        id: `shoe-${Date.now()}`,
        name: data.name || customShoeQuery.trim(),
        brand: data.brand || 'Biegowe Pro',
        footType: 'Neutralna',
        dropMm: data.dropMm || 8,
        weightG: data.weightG || 260,
        energyReturn: 8,
        cushionRating: 8,
        stabilityRating: 7,
        cushion: data.cushion || 'Średnia / Responsywna',
        idealFor: data.idealFor || 'Codzienne wybiegania',
        mileageKm: 0,
        maxMileageKm: 700,
        aiVerdict: data.aiNotes,
      };

      setAiAnalysisResult(newShoe);
      showToast(`Model ${newShoe.name} przeanalizowany! ✨`);
    } catch {
      showToast('Błąd analizy obuwia.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalyzedShoe = () => {
    if (!aiAnalysisResult) return;
    onAddShoe(aiAnalysisResult);
    showToast(`Dodano ${aiAnalysisResult.name} do Szafy Biegowej! 👟`);
    setIsAiShoeModalOpen(false);
    setAiAnalysisResult(null);
    setCustomShoeQuery('');
  };

  const filteredShoes = shoes.filter((s) => {
    if (selectedBrand !== 'all' && s.brand !== selectedBrand) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Top Header Card */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Moduł 8, 9 & 10 • Sprzęt & Dieta
            </span>
            <h2 className="text-base font-bold txt-main">Szafa 12 Marek & Odżywianie</h2>
          </div>
          <span className="text-xs font-black px-2 py-0.5 rounded-full accent-badge">
            Fitatu Sync
          </span>
        </div>

        {/* 3 Sub-tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 liquid-pill text-center">
          <button
            type="button"
            onClick={() => setSubTab('shoes')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'shoes' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            👟 Szafa Obuwia
          </button>
          <button
            type="button"
            onClick={() => setSubTab('carb')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'carb' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            🍝 Carb-Loading
          </button>
          <button
            type="button"
            onClick={() => setSubTab('fueling')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'fueling' ? 'liquid-active' : 'txt-sub'
            }`}
          >
            ⚡ Fueling Plan
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SHOES ROTATION */}
      {subTab === 'shoes' && (
        <div className="space-y-3 animate-ios">
          {/* Action row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold txt-main">
              Katalog 12 Marek ({shoes.length} modeli)
            </span>
            <button
              type="button"
              onClick={() => setIsAiShoeModalOpen(true)}
              className="liquid-active px-3 py-1.5 text-xs font-black flex items-center gap-1 shadow-md"
            >
              <span>✨</span>
              <span>+ Własny model AI</span>
            </button>
          </div>

          {/* Brand pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {BRANDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full whitespace-nowrap transition-all ${
                  selectedBrand === b ? 'liquid-active' : 'liquid-pill txt-sub'
                }`}
              >
                {b === 'all' ? 'Wszystkie' : b}
              </button>
            ))}
          </div>

          {/* Shoe Cards */}
          <div className="space-y-3">
            {filteredShoes.map((shoe) => {
              const wearPercent = Math.min(100, Math.round((shoe.mileageKm / shoe.maxMileageKm) * 100));
              const isWornOut = shoe.mileageKm >= 650;
              const isSelected = profile.selectedShoeId === shoe.id;

              return (
                <div
                  key={shoe.id}
                  className={`liquid-glass p-4 space-y-3 transition-all border ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : isWornOut
                      ? 'border-rose-500/50'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black txt-main">{shoe.name}</h3>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full accent-badge">
                            Aktywny
                          </span>
                        )}
                        {isWornOut && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            Alarm Zużycia!
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] txt-muted">{shoe.brand} • Stopa: {shoe.footType || 'Neutralna'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMainShoe(shoe.id);
                          showToast(`Ustawiono ${shoe.name} jako but bazowy!`);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          isSelected ? 'bg-[var(--accent)] text-black font-black' : 'liquid-pill txt-sub hover:accent-text'
                        }`}
                      >
                        {isSelected ? '✓ Wybrany' : 'Wybierz'}
                      </button>
                      {onDeleteShoe && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Czy na pewno chcesz usunąć model ${shoe.name} z szafy biegowej?`)) {
                              onDeleteShoe(shoe.id);
                              showToast(`Usunięto model ${shoe.name} z szafy! 🗑️`);
                            }
                          }}
                          aria-label={`Usuń ${shoe.name}`}
                          title="Usuń but z szafy"
                          className="w-7 h-7 rounded-lg liquid-pill flex items-center justify-center text-xs txt-sub hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-95"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mileage progress bar with EVA/PEBA alarm */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="txt-muted">Zużycie pianki:</span>
                      <span className="font-bold txt-main ios-num">{shoe.mileageKm} / {shoe.maxMileageKm} km ({wearPercent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          wearPercent >= 85 ? 'bg-rose-500' : wearPercent >= 55 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${wearPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Biomechanical Ratings */}
                  <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2 rounded-xl liquid-pill text-center text-[10px]">
                    <div>
                      <span className="text-[8px] txt-muted block uppercase">Drop</span>
                      <span className="font-bold txt-main">{shoe.dropMm} mm</span>
                    </div>
                    <div>
                      <span className="text-[8px] txt-muted block uppercase">Waga</span>
                      <span className="font-bold txt-main">{shoe.weightG} g</span>
                    </div>
                    <div>
                      <span className="text-[8px] txt-muted block uppercase">Dynamika</span>
                      <span className="font-bold accent-text">{shoe.energyReturn || 8}/10</span>
                    </div>
                    <div>
                      <span className="text-[8px] txt-muted block uppercase">Amortyzacja</span>
                      <span className="font-bold txt-main">{shoe.cushionRating || 8}/10</span>
                    </div>
                  </div>

                  {shoe.aiVerdict && (
                    <div className="liquid-pill p-2 text-[10px] txt-sub leading-snug border-l-2 border-[var(--accent)]">
                      <strong>Werdykt AI:</strong> {shoe.aiVerdict}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CARB-LOADING (FITATU / FOODADVISOR) */}
      {subTab === 'carb' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Moduł 9 • Superkompensacja Glikogenu
                </span>
                <h3 className="text-base font-bold txt-main">Protokół Carb-Loading</h3>
              </div>
              <div className="flex gap-1.5 p-1 liquid-pill text-xs">
                <button
                  type="button"
                  onClick={() => setTargetRaceDistance('half')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    targetRaceDistance === 'half' ? 'liquid-active' : 'txt-sub'
                  }`}
                >
                  Półmaraton (48h)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRaceDistance('marathon')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    targetRaceDistance === 'marathon' ? 'liquid-active' : 'txt-sub'
                  }`}
                >
                  Maraton (72h)
                </button>
              </div>
            </div>

            {/* Target Carbs Stat */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="liquid-pill p-3 border border-[var(--accent)]/40 bg-[var(--accent-soft)]">
                <span className="text-[10px] uppercase font-bold txt-muted block">Cel węglowodanów / dzień</span>
                <span className="text-2xl font-black accent-text ios-num">{carbProtocol.dailyCarbsG} g</span>
                <span className="text-[9px] txt-muted block">dla wagi {profile.weight} kg</span>
              </div>

              <div className="liquid-pill p-3">
                <span className="text-[10px] uppercase font-bold txt-muted block">Woda i nawodnienie</span>
                <span className="text-2xl font-black txt-main ios-num">{(dailyWater / 1000).toFixed(1)} L</span>
                <span className="text-[9px] txt-muted block">1g glikogenu wiąże 3g wody</span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold txt-muted block">Wytyczne dietetyczne Fitatu:</span>
              {carbProtocol.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] txt-sub leading-snug">
                  <span className="accent-text font-bold">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist of products to log in Fitatu */}
          <div className="liquid-glass p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold txt-main">Lista produktów do odhaczenia w Fitatu</span>
              <span className="text-[10px] accent-text font-bold">Wysoka gęstość węgli</span>
            </div>

            <div className="space-y-1.5">
              {carbProtocol.foodList.map((item, idx) => {
                const isChecked = !!checkedFoods[item.name];
                return (
                  <div
                    key={idx}
                    onClick={() => setCheckedFoods((p) => ({ ...p, [item.name]: !isChecked }))}
                    className={`liquid-pill p-2.5 flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isChecked ? 'border-emerald-500/40 bg-emerald-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isChecked ? 'bg-emerald-400 text-black' : 'border border-white/20'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <div>
                        <div className={`font-bold ${isChecked ? 'line-through txt-muted' : 'txt-main'}`}>
                          {item.name}
                        </div>
                        <div className="text-[10px] txt-muted">{item.portion}</div>
                      </div>
                    </div>

                    <span className="font-black accent-text text-xs ios-num">
                      +{item.carbsG} g
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RACE DAY FUELING PLAN */}
      {subTab === 'fueling' && (
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text block">
              Moduł 10 • Nawigator Dnia Startowego
            </span>
            <h3 className="text-base font-bold txt-main">Strategia Żywieniowa na Trasie</h3>

            <div className="liquid-pill p-3 space-y-1 border border-[var(--accent)]/30">
              <div className="text-xs font-black accent-text">{fuelingPlan.strategyName}</div>
              <p className="text-[11px] txt-sub leading-snug">{fuelingPlan.strategyDesc}</p>
            </div>

            {/* Hourly carbs intake target */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="liquid-pill p-2.5">
                <span className="text-[9px] txt-muted block uppercase">Docelowa podaż</span>
                <span className="text-lg font-black accent-text ios-num">{fuelingPlan.carbsPerHour} g/h</span>
                <span className="text-[9px] txt-muted">węglowodanów</span>
              </div>
              <div className="liquid-pill p-2.5">
                <span className="text-[9px] txt-muted block uppercase">Żele na trasie</span>
                <span className="text-lg font-black txt-main ios-num">{fuelingPlan.gelCheckpointsKm.length} sztuki</span>
                <span className="text-[9px] txt-muted">co 6-7 km</span>
              </div>
            </div>

            {/* Gel Checkpoints Map */}
            <div>
              <span className="text-[10px] font-bold txt-muted uppercase block mb-1.5">
                Kilometry przyjęcia żelu na trasie:
              </span>
              <div className="flex gap-2">
                {fuelingPlan.gelCheckpointsKm.map((km) => (
                  <div key={km} className="flex-1 liquid-pill py-2 text-center">
                    <span className="text-[9px] txt-muted block">Km</span>
                    <span className="text-sm font-black accent-text ios-num">{km}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Morning Countdown Schedule */}
          <div className="liquid-glass p-4 space-y-3">
            <span className="text-xs font-bold txt-main">Harmonogram Poranka Startowego</span>
            <div className="space-y-2">
              {fuelingPlan.morningSchedule.map((sched, idx) => (
                <div key={idx} className="liquid-pill p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold txt-main">{sched.action}</span>
                    <span className="text-[10px] accent-text font-black">{sched.timeBeforeRace}</span>
                  </div>
                  <p className="text-[11px] txt-muted leading-snug">{sched.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI SHOE ANALYZER */}
      {isAiShoeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-ios"
        >
          <div className="liquid-glass w-full max-w-sm p-5 space-y-3 animate-ios-modal max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold txt-main">Analizator Dowolnego Buta AI</h3>
              <button
                type="button"
                onClick={() => setIsAiShoeModalOpen(false)}
                className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAnalyzeShoe} className="space-y-2">
              <label className="text-[10px] txt-muted block">Wpisz nazwę modelu buta:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={customShoeQuery}
                  onChange={(e) => setCustomShoeQuery(e.target.value)}
                  placeholder="np. Saucony Endorphin Elite"
                  className="flex-1 liquid-pill px-3 py-2 text-xs txt-main font-bold outline-none"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="liquid-active px-3 text-xs font-bold shrink-0 disabled:opacity-40"
                >
                  {isAnalyzing ? '...' : 'Analizuj'}
                </button>
              </div>
            </form>

            {aiAnalysisResult && (
              <div className="liquid-pill p-3 space-y-2 border border-[var(--accent)] text-xs animate-ios">
                <div className="font-black txt-main">{aiAnalysisResult.name}</div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>Drop: <strong>{aiAnalysisResult.dropMm} mm</strong></div>
                  <div>Waga: <strong>{aiAnalysisResult.weightG} g</strong></div>
                  <div>Pianka: <strong>{aiAnalysisResult.cushion}</strong></div>
                  <div>Cel: <strong>{aiAnalysisResult.idealFor}</strong></div>
                </div>
                <p className="text-[10px] txt-sub leading-snug">{aiAnalysisResult.aiVerdict}</p>

                <button
                  type="button"
                  onClick={handleSaveAnalyzedShoe}
                  className="w-full py-2.5 rounded-full accent-bg text-black font-black text-xs hover:brightness-110 mt-1"
                >
                  + Dodaj do Mojej Szafy
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
