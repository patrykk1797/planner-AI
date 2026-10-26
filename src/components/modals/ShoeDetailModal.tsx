import React from 'react';
import {
  X,
  Footprints,
  Zap,
  ShieldCheck,
  Activity,
  Compass,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowUpRight,
  Gauge,
  Bot
} from 'lucide-react';
import { Shoe, RunnerProfile } from '../../types.ts';
import { ShoeBrandLogo } from '../icons/ShoeBrandLogo.tsx';
import {
  enrichShoeSpecs,
  explainShoeDrop,
  explainShoeCushion,
  explainShoeDynamics,
  explainShoeStability,
  SHOE_TRAINING_PURPOSE_MAP,
} from '../../utils/shoeBiometrics.ts';

interface ShoeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoe: Shoe | null;
  profile?: RunnerProfile;
  onSelectMainShoe?: (id: string) => void;
  isSelected?: boolean;
}

export const ShoeDetailModal: React.FC<ShoeDetailModalProps> = ({
  isOpen,
  onClose,
  shoe,
  profile,
  onSelectMainShoe,
  isSelected = false,
}) => {
  if (!isOpen || !shoe) return null;

  // Enrich with smart biomechanical defaults if any field is missing
  const fullShoe = enrichShoeSpecs(shoe);
  const dropInfo = explainShoeDrop(fullShoe.dropMm);
  const cushionInfo = explainShoeCushion(fullShoe.cushionRating, fullShoe.cushion);
  const dynamicsInfo = explainShoeDynamics(fullShoe.energyReturn, fullShoe.plateType);
  const stabilityInfo = explainShoeStability(fullShoe.stabilityRating, fullShoe.footType);

  const runnerWeight = profile?.weight || 74;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-3 animate-ios"
    >
      <div className="liquid-glass w-full max-w-lg p-5 space-y-4 border border-white/15 rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShoeBrandLogo
              brand={fullShoe.brand}
              shoeName={fullShoe.name}
              brandLogoUrl={fullShoe.brandLogoUrl}
              brandLogoSvg={fullShoe.brandLogoSvg}
              primaryColor={fullShoe.brandPrimaryColor}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black txt-main">{fullShoe.name}</h3>
                {isSelected && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full accent-badge">
                    Aktywny But Bazowy
                  </span>
                )}
              </div>
              <p className="text-[11px] txt-muted">
                Producent: <strong className="text-white">{fullShoe.brand}</strong>
                {fullShoe.brandTagline ? ` • ${fullShoe.brandTagline}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white shrink-0"
            aria-label="Zamknij podgląd buta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Quick Barometer Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          {/* Drop */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted block uppercase font-mono tracking-wider">Drop pięta-palce</span>
            <div className="text-base font-black text-amber-400">{fullShoe.dropMm} mm</div>
            <span className="text-[9px] txt-sub block truncate">{dropInfo.category.split('(')[0].trim()}</span>
          </div>

          {/* Cushioning */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted block uppercase font-mono tracking-wider">Amortyzacja</span>
            <div className="text-base font-black text-emerald-400">{fullShoe.cushionRating || 8}/10</div>
            <span className="text-[9px] txt-sub block truncate">{fullShoe.cushionLevel || 'Wysoka'}</span>
          </div>

          {/* Dynamics */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted block uppercase font-mono tracking-wider">Dynamika / Zwrot</span>
            <div className="text-base font-black accent-text">{fullShoe.energyReturn || 8}/10</div>
            <span className="text-[9px] txt-sub block truncate">{fullShoe.dynamicsLevel?.split('(')[0].trim() || 'Wysoka'}</span>
          </div>

          {/* Stability */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted block uppercase font-mono tracking-wider">Stabilność stopy</span>
            <div className="text-base font-black text-sky-400">{fullShoe.stabilityRating || 7}/10</div>
            <span className="text-[9px] txt-sub block truncate">{fullShoe.footType}</span>
          </div>
        </div>

        {/* 2. Przeznaczenie Treningowe (Wyróżnione Kafelki) */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Przeznaczenie Treningowe</span>
            </span>
            <span className="text-[10px] txt-muted font-mono">Dystans: {fullShoe.recommendedDistance}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(fullShoe.trainingPurposes && fullShoe.trainingPurposes.length > 0
              ? fullShoe.trainingPurposes
              : (['wolne_wybieganie', 'tempo', 'long_run'] as const)
            ).map((purposeKey) => {
              const badge = SHOE_TRAINING_PURPOSE_MAP[purposeKey] || {
                label: purposeKey,
                shortLabel: purposeKey,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/15',
                border: 'border-emerald-500/30',
                description: 'Dopasowany do regularnych biegów.',
              };
              return (
                <div
                  key={purposeKey}
                  className={`p-2 rounded-xl ${badge.bg} border ${badge.border} flex flex-col justify-between`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3 h-3 ${badge.color} shrink-0`} />
                    <span className={`text-[10px] font-black ${badge.color} truncate`}>
                      {badge.shortLabel}
                    </span>
                  </div>
                  <span className="text-[8px] txt-muted mt-1 leading-tight line-clamp-2">
                    {badge.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Szczegółowa Biomechanika Dropu & Lądowania */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>Biomechanika Dropu ({fullShoe.dropMm} mm) & Technika Biegu</span>
            </span>
            <span className="text-[10px] font-mono text-white font-bold">{fullShoe.weightG} g</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-amber-300 min-w-[120px] shrink-0">Styl lądowania:</span>
              <span className="text-[11px] txt-main">{dropInfo.strikeStyle}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-emerald-300 min-w-[120px] shrink-0">Biomechanika:</span>
              <span className="text-[11px] txt-sub">{dropInfo.biomechanics}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-rose-300 min-w-[120px] shrink-0">Wpływ na stawy:</span>
              <span className="text-[11px] txt-sub">{dropInfo.muscleTension}</span>
            </div>
          </div>
        </div>

        {/* 4. Amortyzacja & Dynamika (Pianka, Płytka, Zwrot energii) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Amortyzacja */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Amortyzacja & Pianka</span>
            </span>
            <div className="space-y-1">
              <div className="font-bold txt-main text-xs">{fullShoe.foamTechnology || fullShoe.cushion}</div>
              <p className="text-[10px] txt-sub leading-snug">{cushionInfo.impactAbsorption}</p>
              <p className="text-[9px] txt-muted">{cushionInfo.groundFeel}</p>
            </div>
          </div>

          {/* Dynamika */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Dynamika & Płytka</span>
            </span>
            <div className="space-y-1">
              <div className="font-bold txt-main text-xs">{fullShoe.plateType || 'Elastyczna podeszwa'}</div>
              <p className="text-[10px] txt-sub leading-snug">{dynamicsInfo.propulsion}</p>
              <p className="text-[9px] txt-muted">{dynamicsInfo.recommendedCadence}</p>
            </div>
          </div>
        </div>

        {/* 5. Stabilność & Typ Stopy & Nawierzchnia */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Stabilność, Typ Stopy & Nawierzchnia</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[8px] txt-muted uppercase block">Typ stopy</span>
              <strong className="text-white text-[11px] block">{fullShoe.footType}</strong>
              <span className="text-[9px] txt-muted leading-tight block">{stabilityInfo.footTypeAdvice}</span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[8px] txt-muted uppercase block">Wsparcie podeszwy</span>
              <strong className="text-white text-[11px] block">{fullShoe.stabilityType}</strong>
              <span className="text-[9px] txt-muted leading-tight block">{stabilityInfo.supportMechanism}</span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[8px] txt-muted uppercase block">Nawierzchnia</span>
              <strong className="text-white text-[11px] block">{fullShoe.surfaceType}</strong>
              <span className="text-[9px] txt-muted leading-tight block">Optymalna przyczepność i trwałość</span>
            </div>
          </div>
        </div>

        {/* 6. Werdykt Eksperta AI (Personalizowany pod wagę) */}
        {fullShoe.aiVerdict && (
          <div className="liquid-pill p-3 text-xs leading-relaxed border-l-2 border-emerald-400 flex items-start gap-2.5">
            <Bot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block mb-0.5">
                Werdykt Fizjologa Biegowego (Waga biegacza: {runnerWeight} kg)
              </span>
              <p className="text-[11px] txt-sub">{fullShoe.aiVerdict}</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          {onSelectMainShoe && (
            <button
              type="button"
              onClick={() => {
                onSelectMainShoe(fullShoe.id);
                onClose();
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'accent-bg text-black hover:brightness-110 active:scale-95 shadow-md'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSelected ? 'Ustawiony jako But Bazowy' : 'Ustaw jako But Bazowy'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
