import React, { useState } from 'react';
import {
  Footprints,
  Sparkles,
  Trash2,
  Check,
  X,
  Bot,
  AlertTriangle,
  Activity,
  Plus,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { Shoe, RunnerProfile } from '../types.ts';
import { ShoeBrandLogo } from './ShoeBrandLogo.tsx';
import { ShoeDetailModal } from './ShoeDetailModal.tsx';
import {
  enrichShoeSpecs,
  SHOE_TRAINING_PURPOSE_MAP,
} from '../utils/shoeBiometrics.ts';

interface ShoesViewProps {
  shoes: Shoe[];
  profile: RunnerProfile;
  onAddShoe: (shoe: Shoe) => void;
  onDeleteShoe?: (shoeId: string) => void;
  onSelectMainShoe?: (shoeId: string) => void;
  showToast: (msg: string) => void;
}

export const ShoesView: React.FC<ShoesViewProps> = ({
  shoes,
  profile,
  onAddShoe,
  onDeleteShoe,
  onSelectMainShoe,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [shoeQuery, setShoeQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<Shoe | null>(null);
  const [selectedShoeForDetails, setSelectedShoeForDetails] = useState<Shoe | null>(null);

  const handleAnalyzeShoe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shoeQuery.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-shoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoeQuery: shoeQuery.trim(),
          runnerWeight: profile.weight,
          runnerGoal: profile.targetGoal,
        }),
      });

      const data = await res.json();
      const enrichedNewShoe = enrichShoeSpecs({
        id: `shoe-${Date.now()}`,
        name: data.name || shoeQuery.trim(),
        brand: data.brand || 'Biegowe Pro',
        footType: data.footType || 'Neutralna',
        dropMm: typeof data.dropMm === 'number' ? data.dropMm : 8,
        dropDescription: data.dropDescription,
        weightG: data.weightG || 260,
        energyReturn: data.energyReturn || 8,
        cushionRating: data.cushionRating || 8,
        stabilityRating: data.stabilityRating || 7,
        cushion: data.cushion || 'Średnia',
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
        aiNotes: data.aiNotes || data.aiVerdict,
        aiVerdict: data.aiVerdict || data.aiNotes,
        brandLogoSvg: data.brandLogoSvg,
        brandLogoUrl: data.brandLogoUrl,
        brandPrimaryColor: data.brandPrimaryColor,
        brandTagline: data.brandTagline,
      });

      setAnalysisResult(enrichedNewShoe);
      showToast(`Model ${enrichedNewShoe.name} przeanalizowany (${enrichedNewShoe.brand})! 👟`);
    } catch (err) {
      console.error(err);
      showToast('Wystąpił błąd analizy buta.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToCloset = () => {
    if (!analysisResult) return;
    onAddShoe(analysisResult);
    showToast(`Dodano ${analysisResult.name} do Szafy Biegacza!`);
    setIsModalOpen(false);
    setAnalysisResult(null);
    setShoeQuery('');
  };

  return (
    <div className="space-y-4 px-4 pb-24 animate-ios">
      {/* Top action header */}
      <div className="liquid-glass p-4 flex items-center justify-between rounded-2xl">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5" />
            <span>Rotacja Obuwia</span>
          </span>
          <h2 className="text-base font-bold txt-main">Szafa Biegowa</h2>
          <div className="text-[11px] txt-muted mt-0.5">
            {shoes.length} modele w aktywnej rotacji
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Analizator dowolnego buta AI"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 text-xs font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>+ Dodaj Model AI</span>
        </button>
      </div>

      {/* Shoes list */}
      <div className="space-y-3">
        {shoes.map((rawShoe) => {
          const shoe = enrichShoeSpecs(rawShoe);
          const maxThresholdKm = 700;
          const isOver700 = shoe.mileageKm >= maxThresholdKm;
          const wearPercent = Math.min(100, Math.round((shoe.mileageKm / maxThresholdKm) * 100));
          const isSelected = profile.selectedShoeId === shoe.id;

          return (
            <div
              key={shoe.id}
              className={`liquid-glass p-4 space-y-3 transition-all border rounded-2xl ${
                isOver700
                  ? 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                  : isSelected
                  ? 'border-emerald-400 bg-emerald-950/20'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ShoeBrandLogo
                    brand={shoe.brand}
                    shoeName={shoe.name}
                    brandLogoSvg={shoe.brandLogoSvg}
                    primaryColor={shoe.brandPrimaryColor}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold txt-main">{shoe.name}</h3>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full accent-badge">
                          Główny
                        </span>
                      )}
                      {isOver700 && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Przekroczono 700 km!</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] txt-muted">Marka: {shoe.brand}</span>
                      <span className="text-[10px] text-emerald-400/80">• Typ: {shoe.footType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right font-mono">
                    <span className={`text-xs font-black ios-num ${isOver700 ? 'text-rose-400' : 'txt-main'}`}>
                      {shoe.mileageKm} / {maxThresholdKm} km
                    </span>
                    <div className="text-[10px] txt-muted">{wearPercent}% zużycia</div>
                  </div>
                  {onDeleteShoe && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteShoe(shoe.id);
                        showToast(`Usunięto model ${shoe.name} z szafy biegowej`);
                      }}
                      title="Usuń but z szafy"
                      aria-label={`Usuń ${shoe.name}`}
                      className="w-7 h-7 rounded-lg liquid-pill flex items-center justify-center text-rose-400 hover:bg-rose-500/20 text-xs transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Training purposes badges & distance */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {shoe.trainingPurposes && shoe.trainingPurposes.map((p) => {
                  const meta = SHOE_TRAINING_PURPOSE_MAP[p];
                  if (!meta) return null;
                  return (
                    <span
                      key={p}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}
                    >
                      {meta.shortLabel}
                    </span>
                  );
                })}
                {shoe.recommendedDistance && (
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-white/10">
                    🏁 {shoe.recommendedDistance}
                  </span>
                )}
              </div>

              {/* Mileage progress bar with 700km red alert */}
              <div className="space-y-1">
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/5 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver700
                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                        : wearPercent > 75
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${wearPercent}%` }}
                  />
                </div>
                {isOver700 && (
                  <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Wymagana wymiana obuwia – przebieg przekroczył 700 km!</span>
                  </p>
                )}
              </div>

              {/* Advanced Specs grid */}
              <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2 rounded-xl liquid-pill text-center text-[10px]">
                <div className="border-r border-white/5 pr-1">
                  <span className="txt-muted block uppercase text-[8px]">Drop</span>
                  <span className="font-bold text-amber-300">{shoe.dropMm} mm</span>
                </div>
                <div className="border-r border-white/5 pr-1">
                  <span className="txt-muted block uppercase text-[8px]">Amortyzacja</span>
                  <span className="font-bold text-emerald-300">{shoe.cushionRating}/10</span>
                </div>
                <div className="border-r border-white/5 pr-1">
                  <span className="txt-muted block uppercase text-[8px]">Dynamika</span>
                  <span className="font-bold text-cyan-300">{shoe.energyReturn}/10</span>
                </div>
                <div>
                  <span className="txt-muted block uppercase text-[8px]">Stabilność</span>
                  <span className="font-bold text-purple-300">{shoe.stabilityRating}/10</span>
                </div>
              </div>

              <div className="text-[11px] txt-sub flex items-center justify-between gap-2">
                <div>
                  <span className="txt-muted">Pianka / Płytka: </span>
                  <span className="font-medium text-slate-200">
                    {shoe.foamTechnology || shoe.cushion} {shoe.plateType && shoe.plateType !== 'Brak płytki' ? `• ${shoe.plateType}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedShoeForDetails(shoe)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95"
                >
                  <Compass className="w-3 h-3" />
                  <span>Karta Biomechaniki</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </button>
              </div>

              {shoe.aiNotes && (
                <div className="liquid-pill p-2 text-[10px] txt-sub italic border-l-2 border-emerald-400 flex items-start gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>AI:</strong> {shoe.aiNotes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: AI SHOE ANALYZER */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-ios"
        >
          <div className="liquid-glass w-full max-w-sm p-5 space-y-4 border border-white/15 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold txt-main">Analizator Buta AI</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setAnalysisResult(null);
                }}
                aria-label="Zamknij okno analizy buta"
                className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAnalyzeShoe} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] txt-muted block mb-1">
                  Wpisz model buta (dowolna marka):
                </label>
                <input
                  type="text"
                  value={shoeQuery}
                  onChange={(e) => setShoeQuery(e.target.value)}
                  placeholder="np. Asics Gel-Nimbus 26, Nike Pegasus 41..."
                  className="w-full liquid-pill px-3 py-2 font-bold txt-main outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !shoeQuery.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-60 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Analizowanie...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Analizuj z Gemini AI</span>
                  </>
                )}
              </button>
            </form>

            {analysisResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/35 border border-emerald-500/45 space-y-2.5 text-xs animate-ios">
                <div className="p-2.5 rounded-xl bg-black/55 border border-white/10 flex items-center justify-between gap-2">
                  <ShoeBrandLogo
                    brand={analysisResult.brand}
                    shoeName={analysisResult.name}
                    brandLogoSvg={analysisResult.brandLogoSvg}
                    primaryColor={analysisResult.brandPrimaryColor}
                    size="lg"
                    showBadgeLabel={true}
                  />
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    ✓ Logo Marki
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-0.5">
                  <span className="text-white">{analysisResult.name}</span>
                  <span className="text-emerald-400">{analysisResult.brand}</span>
                </div>
                <p className="text-[11px] txt-sub leading-tight">{analysisResult.aiVerdict}</p>
                <button
                  type="button"
                  onClick={handleSaveToCloset}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-md transition-all mt-1"
                >
                  + Dodaj but wraz z logo do Szafy Biegacza
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADVANCED SHOE BIOMETRICS DETAIL */}
      <ShoeDetailModal
        isOpen={Boolean(selectedShoeForDetails)}
        onClose={() => setSelectedShoeForDetails(null)}
        shoe={selectedShoeForDetails}
        profile={profile}
        onSelectMainShoe={onSelectMainShoe}
      />
    </div>
  );
};
