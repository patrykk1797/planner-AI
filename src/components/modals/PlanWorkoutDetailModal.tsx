import React from 'react';
import { Sliders, Bot, Play, CheckCircle2, Edit3 } from 'lucide-react';
import { TrainingDay, RunnerProfile } from '../../types.ts';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

export interface PlanWorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  plan: TrainingDay[];
  profile: RunnerProfile;
  onToggleCompleted: () => void;
  onOpenEditModal: () => void;
  onOpenLiveHud?: () => void;
  onOpenAddRun?: () => void;
  getWorkoutVectorIcon: (type: string, isRace?: boolean) => React.ReactNode;
  getBadgeColor: (type: string) => string;
}

export const PlanWorkoutDetailModal: React.FC<PlanWorkoutDetailModalProps> = ({
  isOpen,
  onClose,
  dayIndex,
  plan,
  onToggleCompleted,
  onOpenEditModal,
  onOpenLiveHud,
  onOpenAddRun,
  getWorkoutVectorIcon,
  getBadgeColor,
}) => {
  const currentDay = plan[dayIndex];
  useLockBodyScroll(isOpen);

  if (!isOpen || !currentDay) return null;

  const isRest = currentDay.distanceKm === 0;
  const workoutTypeLower = currentDay.type.toLowerCase();

  let warmupAdvice = '10-15 min swobodnego truchtu w Strefie 1/2 + 4x rzuty nóg i krążenia bioder.';
  const mainAdvice = currentDay.description;
  let cooldownAdvice = '5-10 min truchtu wyciszającego + statyczne rozciąganie taśm tylnych.';

  if (workoutTypeLower.includes('interwał')) {
    warmupAdvice = '15 min narastającego truchtu Z1->Z2, ćwiczenia dynamiczne (skosy, wymachy) + 3 dynamiczne przebieżki 60m.';
    cooldownAdvice = '10 min swobodnego truchtu Z1, uzupełnienie płynów i nawodnienie z elektrolitami.';
  } else if (workoutTypeLower.includes('długi')) {
    warmupAdvice = '10 min bardzo spokojnego truchtu Z1 + mobilizacja stawów skokowych.';
    cooldownAdvice = '10 min marszu, kąpiel chłodząca nóg i wysokobiałkowy posiłek regeneracyjny do 45 min po biegu.';
  } else if (workoutTypeLower.includes('tempo')) {
    warmupAdvice = '12 min truchtu Z2 + 2x 100m w tempie docelowym dla aktywacji układu nerwowego.';
    cooldownAdvice = '8 min marszu ze spokojnym głębokim oddechem przeponowym.';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center pt-2 sm:pt-6 pb-24 sm:pb-8 px-3 sm:px-4 overscroll-contain overflow-y-auto animate-fade-in text-white"
    >
      <div className="liquid-glass max-w-lg w-full rounded-3xl border border-white/20 shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[88dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-white/10 p-4 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl liquid-pill flex items-center justify-center border border-white/10 text-emerald-400 shrink-0">
              {getWorkoutVectorIcon(currentDay.type)}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  {currentDay.dayName} • Plan AI
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(currentDay.type)}`}>
                  {currentDay.type}
                </span>
              </div>
              <h3 className="text-base font-black txt-main">
                {currentDay.type} {currentDay.distanceKm > 0 ? `• ${currentDay.distanceKm} km` : ''}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 p-4">
          {/* Target Metrics Grid */}
          {!isRest && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Dystans</span>
                <strong className="text-base font-black text-white ios-num">{currentDay.distanceKm} km</strong>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Tempo Cel</span>
                <strong className="text-base font-black text-amber-300 font-mono">{currentDay.targetPace}</strong>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Strefa HR</span>
                <strong className="text-xs font-black text-rose-400 truncate block mt-0.5">{currentDay.hrZone}</strong>
              </div>
            </div>
          )}

          {/* Workout Structure Sections */}
          <div className="space-y-2.5 text-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Struktura Treningu & Wskazówki AI</span>
            </h4>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              {/* 1. Rozgrzewka */}
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-amber-500/30">
                  1
                </span>
                <div>
                  <span className="font-black text-amber-300 text-[11px] block">Rozgrzewka (Warm-up)</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{warmupAdvice}</p>
                </div>
              </div>

              {/* 2. Część Główna */}
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-emerald-500/30">
                  2
                </span>
                <div>
                  <span className="font-black text-emerald-300 text-[11px] block">Akcent Główny (Main Part)</span>
                  <p className="text-white text-[11px] font-bold leading-relaxed">{mainAdvice}</p>
                </div>
              </div>

              {/* 3. Schłodzenie */}
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-sky-500/30">
                  3
                </span>
                <div>
                  <span className="font-black text-sky-300 text-[11px] block">Schłodzenie & Wykończenie (Cool-down)</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{cooldownAdvice}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coach Advice */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs">
            <Bot className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black text-emerald-300 text-[11px] block">Rekomendacja Fizjologa AI</span>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                Nawodnienie: wypij 300 ml wody na 20 min przed wyjściem. Utrzymuj stabilną kadencję (175+ spm) dla optymalnego zużycia glikogenu.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3 pt-2.5 border-t border-white/10 bg-slate-950/95 backdrop-blur-md shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenLiveHud) onOpenLiveHud();
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Start GPS z celem</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAddRun) onOpenAddRun();
              }}
              className="py-2.5 px-3 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>📸 Dodaj / Skanuj Bieg</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleCompleted();
              }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
                currentDay.completed
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{currentDay.completed ? 'Ukończony ✓' : 'Oznacz ukończony'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditModal();
              }}
              className="py-2.5 px-3 rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edytuj / Przełóż</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
