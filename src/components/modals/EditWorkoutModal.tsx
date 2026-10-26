import React, { useState, useEffect } from 'react';
import { Edit3, Sliders, ArrowLeftRight, Bot } from 'lucide-react';
import { TrainingDay } from '../../types.ts';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

export interface EditWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  plan: TrainingDay[];
  onSavePlan: (updatedPlan: TrainingDay[]) => void;
  showToast: (msg: string) => void;
}

export const EditWorkoutModal: React.FC<EditWorkoutModalProps> = ({
  isOpen,
  onClose,
  dayIndex,
  plan,
  onSavePlan,
  showToast,
}) => {
  const currentDay = plan[dayIndex];

  const [activeTab, setActiveTab] = useState<'edit' | 'swap'>('edit');
  const [targetType, setTargetType] = useState<TrainingDay['type']>(currentDay?.type || 'Bieg spokojny');
  const [distanceKm, setDistanceKm] = useState<number>(currentDay?.distanceKm || 0);
  const [durationMin, setDurationMin] = useState<number>(currentDay?.durationMin || 0);
  const [targetPace, setTargetPace] = useState<string>(currentDay?.targetPace || '');
  const [hrZone, setHrZone] = useState<string>(currentDay?.hrZone || '');
  const [description, setDescription] = useState<string>(currentDay?.description || '');
  const [selectedSwapDayIndex, setSelectedSwapDayIndex] = useState<number>(
    dayIndex === 0 ? 1 : 0
  );

  useEffect(() => {
    if (currentDay) {
      setTargetType(currentDay.type);
      setDistanceKm(currentDay.distanceKm);
      setDurationMin(currentDay.durationMin);
      setTargetPace(currentDay.targetPace);
      setHrZone(currentDay.hrZone);
      setDescription(currentDay.description);
    }
  }, [dayIndex, currentDay]);

  const WORKOUT_TYPES: TrainingDay['type'][] = [
    'Bieg spokojny',
    'Interwały',
    'Tempo run',
    'Bieg długi',
    'Siła biegowa',
    'Regeneracja',
  ];

  const handleSave = () => {
    const updated = [...plan];
    updated[dayIndex] = {
      ...updated[dayIndex],
      type: targetType,
      distanceKm: Number(distanceKm) || 0,
      durationMin: Number(durationMin) || 0,
      targetPace,
      hrZone,
      description,
    };
    onSavePlan(updated);
    showToast(`Zapisano zmiany w treningu na ${currentDay.dayName}!`);
    onClose();
  };

  const handleSwap = () => {
    if (selectedSwapDayIndex === dayIndex) {
      showToast('Wybierz inny dzień tygodnia do zamiany');
      return;
    }
    const updated = [...plan];
    const source = updated[dayIndex];
    const target = updated[selectedSwapDayIndex];

    updated[dayIndex] = {
      ...source,
      type: target.type,
      distanceKm: target.distanceKm,
      durationMin: target.durationMin,
      targetPace: target.targetPace,
      hrZone: target.hrZone,
      description: target.description,
      completed: target.completed,
      completedKm: target.completedKm,
    };

    updated[selectedSwapDayIndex] = {
      ...target,
      type: source.type,
      distanceKm: source.distanceKm,
      durationMin: source.durationMin,
      targetPace: source.targetPace,
      hrZone: source.hrZone,
      description: source.description,
      completed: source.completed,
      completedKm: source.completedKm,
    };

    onSavePlan(updated);
    showToast(`Przełożono trening: ${source.dayName} ⇄ ${target.dayName}!`);
    onClose();
  };

  const handleAiAdjust = () => {
    const reducedKm = Math.max(3, +(distanceKm * 0.7).toFixed(1));
    const reducedDur = Math.max(25, Math.round(durationMin * 0.75));
    setTargetType('Bieg spokojny');
    setDistanceKm(reducedKm);
    setDurationMin(reducedDur);
    setTargetPace('5:40 /km');
    setHrZone('Z2 (135-148 bpm)');
    setDescription(
      `Dostosowano przez Trenera AI pod regenerację: obniżono objętość do ${reducedKm} km w bezpiecznej strefie tlenowej Z2. Zmniejszono obciążenie mięśniowo-powięziowe.`
    );
    showToast('AI dostosowało parametry jednostki (mniej czasu / zmęczenie)!');
  };

  useLockBodyScroll(isOpen);

  if (!isOpen || !currentDay) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center pt-2 sm:pt-6 pb-24 sm:pb-8 px-3 sm:px-4 overscroll-contain overflow-y-auto animate-fade-in text-white"
    >
      <div className="liquid-glass max-w-lg w-full rounded-3xl border border-white/20 shadow-2xl flex flex-col max-h-[84dvh] sm:max-h-[88dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-white/10 p-4 pb-3">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <span className="p-1 rounded-xl bg-sky-500/20 text-sky-300">
                <Edit3 className="w-4 h-4" />
              </span>
              <span>Edytuj / Przełóż Trening</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentDay.dayName} ({currentDay.dayShort}) • {currentDay.type}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Subtabs: Modyfikuj vs Przełóż (Swap) */}
        <div className="px-4 pt-3 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-sky-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Modyfikuj jednostkę</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('swap')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'swap'
                  ? 'bg-sky-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Przełóż dzień (Swap)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 p-4 pr-3.5">
          {activeTab === 'edit' ? (
            <div className="space-y-3">
              {/* Typ Treningu */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                  Typ jednostki treningowej
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {WORKOUT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetType(t)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        targetType === t
                          ? 'bg-sky-500/25 border-sky-400 text-white shadow-sm ring-1 ring-sky-400/50'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dystans & Czas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Dystans (km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Czas trwania (min)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="360"
                    value={durationMin}
                    onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Tempo & Strefa Tętna */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Docelowe tempo
                  </label>
                  <input
                    type="text"
                    value={targetPace}
                    onChange={(e) => setTargetPace(e.target.value)}
                    placeholder="np. 5:15 /km"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Strefa tętna
                  </label>
                  <input
                    type="text"
                    value={hrZone}
                    onChange={(e) => setHrZone(e.target.value)}
                    placeholder="np. Z2 (135-148 bpm)"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Opis */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Opis i wskazówki trenerskie
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs leading-relaxed focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              {/* AI Korekta Treningu */}
              <button
                type="button"
                onClick={handleAiAdjust}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-sky-500/20 border border-emerald-400/40 hover:border-emerald-400 text-emerald-300 font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>🤖 Dostosuj ten trening z AI (mniej czasu / zmęczenie)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Wybierz dzień tygodnia, z którym chcesz zamienić trening z dnia{' '}
                <strong className="text-sky-300">{currentDay.dayName}</strong> ({currentDay.type},{' '}
                {currentDay.distanceKm} km):
              </p>

              <div className="space-y-1.5">
                {plan.map((d, idx) => {
                  if (idx === dayIndex) return null;
                  const isSelected = selectedSwapDayIndex === idx;
                  return (
                    <button
                      key={d.dayShort}
                      type="button"
                      onClick={() => setSelectedSwapDayIndex(idx)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg liquid-pill flex items-center justify-center font-black text-xs text-sky-300">
                          {d.dayShort}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{d.dayName}</div>
                          <div className="text-[10px] text-slate-400">
                            {d.type} {d.distanceKm > 0 ? `• ${d.distanceKm} km` : '• Dzień wolny'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Wybrany do zamiany ✓' : 'Wybierz'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-3 pt-2.5 border-t border-white/10 bg-slate-950/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Anuluj
          </button>
          {activeTab === 'edit' ? (
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Zapisz zmiany
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwap}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:brightness-110 text-white text-xs font-black shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Przełóż trening (Swap)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
