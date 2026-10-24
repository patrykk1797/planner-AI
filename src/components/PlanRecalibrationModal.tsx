import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  Heart,
  Footprints,
  ShieldCheck,
  Zap,
  Activity,
  X,
} from 'lucide-react';
import { DayPlan, RunLog } from '../types.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

export interface PlanDiffItem {
  dayShort: string;
  dayName: string;
  changeType?: 'modified' | 'rest' | 'added';
  beforeType: string;
  afterType: string;
  beforeDistanceKm: number;
  afterDistanceKm: number;
  beforePace: string;
  afterPace: string;
  beforeHrZone: string;
  afterHrZone: string;
  reason: string;
  isModified?: boolean;
}

export interface PlanRecalibrationData {
  coachFeedback?: string;
  coachExplanation?: string;
  keyChanges?: string[];
  diffItems?: PlanDiffItem[];
  updatedPlan?: DayPlan[];
  pandaReaction?: string;
  bamboosEarned?: number;
}

interface PlanRecalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPlan: () => void;
  recalibrationData: PlanRecalibrationData | null;
  newRun: Partial<RunLog> | null;
}

export const PlanRecalibrationModal: React.FC<PlanRecalibrationModalProps> = ({
  isOpen,
  onClose,
  onViewPlan,
  recalibrationData,
  newRun,
}) => {
  useLockBodyScroll(isOpen);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen]);

  if (!isOpen || !recalibrationData) return null;

  const diffItems = recalibrationData.diffItems || [];
  const keyChanges = recalibrationData.keyChanges || [];
  const explanation =
    recalibrationData.coachExplanation ||
    recalibrationData.coachFeedback ||
    'Plan treningowy został automatycznie zaktualizowany na podstawie ostatniego treningu.';

  const dist = newRun?.distanceKm != null ? newRun.distanceKm : 5.0;
  const pace = newRun?.avgPace || '5:00';
  const hr = newRun?.avgHr || 150;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none overscroll-contain h-[100dvh] w-screen overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto no-scrollbar rounded-3xl bg-slate-950 border border-orange-500/40 p-5 sm:p-6 shadow-2xl space-y-5 animate-ios my-auto"
      >
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-mono text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-orange-400 animate-pulse" />
                <span>DYNAMICZNA REKALIBRACJA PLANU AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-black uppercase">
                Zero-Click Coach
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              ⚡ Plan Biegowy Został Zaktualizowany!
            </h2>
            <p className="text-xs txt-muted">
              Wykryto nowy bieg – trener AI natychmiast przeliczył Twój tygodniowy mikrocykl.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Run Quick Recap Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] txt-muted block uppercase font-bold">Właśnie zarejestrowano:</span>
              <span className="font-bold text-white font-mono text-sm">
                {dist} km <span className="text-xs text-orange-300 font-normal">w {pace}/km</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-rose-300 font-mono font-bold">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>{hr} bpm</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Wdrożono ✓</span>
            </span>
          </div>
        </div>

        {/* Coach Explanation / Commentary */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-400">
            <span className="text-sm">💬</span>
            <span>Diagnoza Trenera AI: Dlaczego plan się zmienił?</span>
          </div>
          <p className="text-xs text-slate-200/90 leading-relaxed font-medium">
            „{explanation}”
          </p>
        </div>

        {/* Key Changes Summary (Co się zmieniło po krótce) */}
        {keyChanges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Co dokładnie zmieniło się w wyliczonym planie:</span>
            </h4>
            <div className="space-y-1.5">
              {keyChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-emerald-200/95 flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-emerald-400 font-black mt-0.5">➔</span>
                  <span className="font-medium">{change}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day-by-Day Before vs After Visual Diff Cards */}
        {diffItems.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>Porównanie przed vs po adaptacji:</span>
              </span>
              <span className="text-[10px] font-mono text-sky-400/80">Nadchodzące dni</span>
            </h4>

            <div className="space-y-2">
              {diffItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-2.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-mono text-xs">
                        {item.dayShort}
                      </span>
                      <span>{item.dayName}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Adaptacja obciążenia
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Before */}
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-red-500/20 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Przed adaptacją:
                      </span>
                      <div className="font-bold text-slate-300 line-through text-[11px]">
                        {item.beforeType} ({item.beforeDistanceKm} km)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.beforePace} • {item.beforeHrZone}
                      </div>
                    </div>

                    {/* After */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 space-y-1">
                      <span className="text-[9px] uppercase font-black text-emerald-400 block flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Po adaptacji (Wdrożono):</span>
                      </span>
                      <div className="font-black text-emerald-300 text-[11px]">
                        {item.afterType} ({item.afterDistanceKm} km)
                      </div>
                      <div className="text-[10px] text-emerald-400/90 font-mono font-bold">
                        {item.afterPace} • {item.afterHrZone}
                      </div>
                    </div>
                  </div>

                  {item.reason && (
                    <div className="text-[10px] text-slate-300/80 italic bg-white/5 px-2.5 py-1 rounded-lg">
                      💡 <strong>Uzasadnienie:</strong> {item.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Status Banner */}
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Nowy plan został już zapisany w pamięci i automatycznie zsynchronizowany z Twoim kontem!
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Zrozumiałem, świetnie! (Wdrożono) 🚀</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewPlan();
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-xl liquid-pill text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Zobacz pełny Plan Tygodnia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
