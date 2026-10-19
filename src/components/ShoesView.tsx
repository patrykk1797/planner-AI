import React, { useState } from 'react';
import { Shoe, RunnerProfile } from '../types.ts';

interface ShoesViewProps {
  shoes: Shoe[];
  profile: RunnerProfile;
  onAddShoe: (shoe: Shoe) => void;
  onDeleteShoe?: (shoeId: string) => void;
  showToast: (msg: string) => void;
}

export const ShoesView: React.FC<ShoesViewProps> = ({
  shoes,
  profile,
  onAddShoe,
  onDeleteShoe,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [shoeQuery, setShoeQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<Shoe | null>(null);

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
      const newShoe: Shoe = {
        id: `shoe-${Date.now()}`,
        name: data.name || shoeQuery.trim(),
        brand: data.brand || 'Biegowe Pro',
        footType: 'Neutralna',
        dropMm: data.dropMm || 8,
        weightG: data.weightG || 260,
        energyReturn: 8,
        cushionRating: 8,
        stabilityRating: 7,
        cushion: data.cushion || 'Średnia',
        idealFor: data.idealFor || 'Codzienne wybiegania',
        mileageKm: 0,
        maxMileageKm: 700,
        aiNotes: data.aiNotes,
        aiVerdict: data.aiNotes,
      };

      setAnalysisResult(newShoe);
      showToast(`Model ${newShoe.name} przeanalizowany przez AI! ✨`);
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
    showToast(`Dodano ${analysisResult.name} do Szafy Biegacza! 👟`);
    setIsModalOpen(false);
    setAnalysisResult(null);
    setShoeQuery('');
  };

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Top action header */}
      <div className="liquid-glass p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider accent-text">
            Rotacja Obuwia
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
          className="liquid-active px-3 py-2 text-xs font-black shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5"
        >
          <span>✨</span>
          <span>+ Własny model AI</span>
        </button>
      </div>

      {/* Shoes list */}
      <div className="space-y-3">
        {shoes.map((shoe) => {
          const wearPercent = Math.min(100, Math.round((shoe.mileageKm / shoe.maxMileageKm) * 100));
          const isSelected = profile.selectedShoeId === shoe.id;

          return (
            <div
              key={shoe.id}
              className={`liquid-glass p-4 space-y-3 transition-all ${
                isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold txt-main">{shoe.name}</h3>
                    {isSelected && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full accent-badge">
                        Główny
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] txt-muted">{shoe.brand}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-xs font-black txt-main ios-num">
                      {shoe.mileageKm} / {shoe.maxMileageKm} km
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
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Mileage bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    wearPercent > 80 ? 'bg-rose-500' : wearPercent > 50 ? 'bg-amber-400' : 'accent-bg'
                  }`}
                  style={{ width: `${wearPercent}%` }}
                ></div>
              </div>

              {/* Specs pill */}
              <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl liquid-pill text-center text-[10px]">
                <div>
                  <span className="txt-muted block uppercase">Drop</span>
                  <span className="font-bold txt-main">{shoe.dropMm} mm</span>
                </div>
                <div>
                  <span className="txt-muted block uppercase">Waga</span>
                  <span className="font-bold txt-main">{shoe.weightG} g</span>
                </div>
                <div>
                  <span className="txt-muted block uppercase">Pianka</span>
                  <span className="font-bold txt-main truncate">{shoe.cushion.slice(0, 15)}</span>
                </div>
              </div>

              <div className="text-[11px] txt-sub">
                <span className="txt-muted">Przeznaczenie: </span>
                {shoe.idealFor}
              </div>

              {shoe.aiNotes && (
                <div className="liquid-pill p-2 text-[10px] txt-muted italic border-l-2 border-[var(--accent)]">
                  🤖 AI: {shoe.aiNotes}
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
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-ios"
        >
          <div className="liquid-glass w-full max-w-sm p-5 space-y-4 animate-ios-modal max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase accent-text">
                  Gemini 3 Flash • Silnik Sprzętowy
                </span>
                <h3 className="text-base font-bold txt-main">Analizator Dowolnego Buta AI</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setAnalysisResult(null);
                }}
                aria-label="Zamknij okno analizy buta"
                className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] txt-sub leading-relaxed">
              Wpisz dowolny model buta (np. <em>Nike Alphafly 3, Asics Gel-Nimbus 26, Hoka Speedgoat 5, Puma Deviate Nitro</em>). Gemini pobierze specyfikację i oceni dopasowanie pod Twoją masę <strong>{profile.weight} kg</strong>.
            </p>

            <form onSubmit={handleAnalyzeShoe} className="space-y-3">
              <div>
                <label className="text-[10px] txt-muted block mb-1">Nazwa modelu</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={shoeQuery}
                    onChange={(e) => setShoeQuery(e.target.value)}
                    placeholder="np. Nike Vaporfly 3"
                    className="flex-1 liquid-pill px-3 py-2 txt-main font-bold outline-none text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isAnalyzing || !shoeQuery.trim()}
                    className="liquid-active px-4 text-xs font-bold shrink-0 disabled:opacity-40"
                  >
                    {isAnalyzing ? '...' : 'Analizuj ✨'}
                  </button>
                </div>
              </div>
            </form>

            {isAnalyzing && (
              <div className="liquid-pill p-4 text-center space-y-2 animate-pulse">
                <span className="text-2xl animate-spin inline-block">👟</span>
                <div className="text-xs font-bold txt-main">
                  Gemini analizuje geometrię, drop i piankę dla {shoeQuery}...
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="liquid-pill p-3 space-y-2 border border-[var(--accent)] animate-ios">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black txt-main">{analysisResult.name}</h4>
                  <span className="text-[10px] accent-text font-bold">{analysisResult.brand}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="txt-muted block">Drop:</span>
                    <strong className="txt-main">{analysisResult.dropMm} mm</strong>
                  </div>
                  <div>
                    <span className="txt-muted block">Waga (rozm. 42.5):</span>
                    <strong className="txt-main">{analysisResult.weightG} g</strong>
                  </div>
                  <div>
                    <span className="txt-muted block">Amortyzacja:</span>
                    <strong className="txt-main">{analysisResult.cushion}</strong>
                  </div>
                  <div>
                    <span className="txt-muted block">Zastosowanie:</span>
                    <strong className="txt-main">{analysisResult.idealFor}</strong>
                  </div>
                </div>

                <div className="text-[11px] txt-sub leading-snug border-t border-white/10 pt-2">
                  <strong>Ekspert AI:</strong> {analysisResult.aiNotes}
                </div>

                <button
                  type="button"
                  onClick={handleSaveToCloset}
                  className="w-full py-2.5 rounded-full accent-bg text-black font-black text-xs hover:brightness-110 shadow-lg mt-2"
                >
                  + Dodaj do mojej Szafy Biegowej
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
