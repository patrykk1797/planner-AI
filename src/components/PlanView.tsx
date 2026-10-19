import React, { useState } from 'react';
import { TrainingDay, RunnerProfile, RaceSlot, RunLog } from '../types.ts';
import { RaceCalendarView } from './RaceCalendarView.tsx';
import { soundEngine } from '../utils/defaults.ts';

interface PlanViewProps {
  plan: TrainingDay[];
  weeklyFocus: string;
  summary: string;
  profile: RunnerProfile;
  races: RaceSlot[];
  runs?: RunLog[];
  isGenerating: boolean;
  onGeneratePlanAI: () => void;
  onToggleDayCompleted: (index: number) => void;
  onOpenSimulator: () => void;
  onOpenPandaModal?: () => void;
  onAddRace: (race: RaceSlot) => void;
  onDeleteRace: (id: string) => void;
  onUpdateCoachTone: (tone: 'naukowy' | 'motywacyjny' | 'minimalistyczny') => void;
  onSetMainGoal?: (goalName: string, targetTime?: string) => void;
  showToast: (msg: string) => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  plan,
  weeklyFocus,
  summary,
  profile,
  races,
  runs = [],
  isGenerating,
  onGeneratePlanAI,
  onToggleDayCompleted,
  onOpenSimulator,
  onOpenPandaModal,
  onAddRace,
  onDeleteRace,
  onUpdateCoachTone,
  onSetMainGoal,
  showToast,
}) => {
  // Navigation: Mikrocykl / Cały Miesiąc / Starty 2027
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'races'>('month');

  // Selected Day in Monthly Calendar
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(19); // Default to today/current day in Oct
  const [pandaMood, setPandaMood] = useState<'idle' | 'happy' | 'cheer' | 'eating'>('idle');
  const [pandaSpeech, setPandaSpeech] = useState<string>(
    `Cześć ${profile.name}! Przygotowałem Twój plan na ten miesiąc. Sprawdź dni w kalendarzu poniżej! 🎋`
  );

  const completedCount = plan.filter((d) => d.completed).length;
  const totalRuns = plan.filter((d) => d.distanceKm > 0).length;
  const totalWeeklyKm = plan.reduce((acc, d) => acc + (d.distanceKm || 0), 0);

  // Poke Panda Action
  const handlePokePanda = () => {
    const moods: Array<'happy' | 'cheer' | 'eating'> = ['happy', 'cheer', 'eating'];
    const nextMood = moods[Math.floor(Math.random() * moods.length)];
    setPandaMood(nextMood);

    if (nextMood === 'eating') {
      soundEngine.playPandaSound('crunch');
      setPandaSpeech('Mniam! Świeży bambus daje energię na mocny trening w Strefie 2! 🎋');
    } else {
      soundEngine.playPandaSound('cheer');
      setPandaSpeech(`Brawo ${profile.name}! Forma stale rośnie, a cel ${profile.targetGoal.slice(0, 24)}... jest coraz bliżej!`);
    }

    setTimeout(() => setPandaMood('idle'), 2500);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Interwały':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'Tempo run':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Bieg długi':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Regeneracja':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Siła biegowa':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      default:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    }
  };

  // Monthly Calendar configuration for October 2026 (31 days)
  // Thursday = 1st Oct, 31 days.
  // Map days 1..31 to training days in weekly plan cyclically
  const DAYS_IN_MONTH = 31;
  const FIRST_DAY_OFFSET = 3; // 0=Pon, 1=Wt, 2=Śr, 3=Czw (1 Oct 2026 is Thursday)
  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const getDayTrainingInfo = (dayNum: number) => {
    // Determine weekday (0=Pon .. 6=Nd)
    const weekdayIdx = (FIRST_DAY_OFFSET + (dayNum - 1)) % 7;
    // Map to plan day (0=Pon .. 6=Nd)
    const planItem = plan[weekdayIdx] || plan[0];

    // Some specific highlights: e.g. Day 14 was parkrun, Day 25 is race rehearsal
    const isCompleted = dayNum < 19 || (dayNum === 19 && planItem.completed);
    const isRaceDay = dayNum === 14 || dayNum === 28;

    return {
      dayNum,
      weekday: WEEKDAYS[weekdayIdx],
      planItem,
      isRest: planItem.distanceKm === 0,
      isCompleted,
      isRaceDay,
      icon: isRaceDay ? '🏁' : planItem.distanceKm === 0 ? '🧘' : planItem.type === 'Interwały' ? '⚡' : '🏃',
    };
  };

  const selectedDayInfo = getDayTrainingInfo(selectedDayNumber);

  return (
    <div className="space-y-4 px-4 pb-28 animate-ios">
      {/* 1. COMPACT PANDA MASCOT WIDGET (Zmniejszona Panda na 1. stronie) */}
      <div className="liquid-glass p-3 flex items-center gap-3 relative overflow-hidden border border-[var(--accent)]/30 shadow-lg">
        {/* Compact Clickable Panda Avatar */}
        <div
          onClick={handlePokePanda}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handlePokePanda();
          }}
          className="w-14 h-14 shrink-0 cursor-pointer select-none relative flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          title="Dotknij Pandę (Touch & Poke)!"
        >
          <svg viewBox="0 0 200 200" className={`w-full h-full ${pandaMood !== 'idle' ? 'scale-110' : ''} panda-float`}>
            {/* Glow */}
            <circle cx="100" cy="100" r="85" fill="var(--accent)" fillOpacity="0.12" />
            {/* Body */}
            <ellipse cx="100" cy="130" rx="60" ry="50" fill="#f8fafc" stroke="#090b10" strokeWidth="4" />
            <ellipse cx="100" cy="135" rx="40" ry="32" fill="#e2e8f0" />
            {/* Ears */}
            <circle cx="55" cy="55" r="22" fill="#090b10" />
            <circle cx="145" cy="55" r="22" fill="#090b10" />
            {/* Head */}
            <ellipse cx="100" cy="80" rx="52" ry="44" fill="#ffffff" stroke="#090b10" strokeWidth="4" />
            {/* Eye Patches */}
            <ellipse cx="78" cy="78" rx="14" ry="17" fill="#090b10" transform="rotate(-15 78 78)" />
            <ellipse cx="122" cy="78" rx="14" ry="17" fill="#090b10" transform="rotate(15 122 78)" />
            <circle cx="79" cy="76" r="4.5" fill="#ffffff" />
            <circle cx="121" cy="76" r="4.5" fill="#ffffff" />
            {/* Nose */}
            <ellipse cx="100" cy="92" rx="9" ry="6" fill="#090b10" />
            <path d="M94 98 Q100 106 106 98" stroke="#090b10" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Cap Gear */}
            {profile.activePandaGear?.gear?.includes('Czapeczka') && (
              <path d="M50 62 Q100 38 150 62 L152 70 Q100 48 48 70 Z" fill="var(--accent)" />
            )}
          </svg>
          <span className="absolute -bottom-1 text-[8px] font-black bg-black/70 px-1 rounded text-amber-300">
            {profile.bamboos} 🎋
          </span>
        </div>

        {/* Panda Speech & Level */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
              <span>🐼</span>
              <span>RUNPANDA COACH</span>
            </span>
            {onOpenPandaModal && (
              <button
                type="button"
                onClick={onOpenPandaModal}
                className="text-[10px] font-bold txt-muted hover:text-white flex items-center gap-0.5"
              >
                <span>Garderoba</span>
                <span>›</span>
              </button>
            )}
          </div>
          <p className="text-[11px] txt-main font-medium leading-snug line-clamp-2">
            "{pandaSpeech}"
          </p>
        </div>
      </div>

      {/* 2. AKTUALNE PODSUMOWANIE WYKRESU I PROGRESJI */}
      <div className="liquid-glass p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📈</span>
            <h3 className="text-xs font-black uppercase tracking-wider txt-main">
              Aktualna Progresja & Wykres Formy
            </h3>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full accent-badge">
            ACWR 1.08 • Sweet Spot
          </span>
        </div>

        {/* Visual Sparkline of Mileage Progression (Last 4 Weeks) */}
        <div className="flex items-end justify-between gap-1.5 h-16 pt-2 px-1">
          {[
            { label: 'Tydz -3', km: 24.0, target: 30, pace: '5:48' },
            { label: 'Tydz -2', km: 27.5, target: 32, pace: '5:42' },
            { label: 'Tydz -1', km: 31.0, target: 35, pace: '5:39' },
            { label: 'Obecny', km: 28.5, target: 32, pace: '5:37', current: true },
          ].map((week, idx) => {
            const heightPercent = Math.min(100, Math.round((week.km / 35) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold txt-muted">{week.km} km</span>
                <div className="w-full h-9 bg-white/10 rounded-lg overflow-hidden flex items-end">
                  <div
                    className={`w-full rounded-lg transition-all ${
                      week.current ? 'bg-[var(--accent)] shadow-md' : 'bg-white/30'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className={`text-[8px] font-bold ${week.current ? 'accent-text' : 'txt-muted'}`}>
                  {week.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Key Metrics Chips */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px]">
          <div className="p-1.5 rounded-xl liquid-pill">
            <span className="txt-muted block uppercase text-[8px]">Realizacja Tygodnia</span>
            <strong className="txt-main ios-num">28.5 / 32 km (89%)</strong>
          </div>
          <div className="p-1.5 rounded-xl liquid-pill">
            <span className="txt-muted block uppercase text-[8px]">Predykcja 5k</span>
            <strong className="accent-text ios-num">24:50 min (Sub-25!)</strong>
          </div>
          <div className="p-1.5 rounded-xl liquid-pill">
            <span className="txt-muted block uppercase text-[8px]">Gotowość Tlenowa</span>
            <strong className="accent-text ios-num">VO2 33 ml/kg</strong>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION: CAŁY MIESIĄC vs 7 DNI vs SEZON 2027 */}
      <div className="grid grid-cols-3 gap-1.5 p-1 liquid-glass rounded-2xl text-center text-xs">
        <button
          type="button"
          onClick={() => setViewMode('month')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            viewMode === 'month'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>🗓️</span>
          <span>Cały Miesiąc</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('week')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            viewMode === 'week'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>📋</span>
          <span>Mikrocykl (7 Dni)</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('races')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            viewMode === 'races'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>🏁</span>
          <span>Starty 2027</span>
        </button>
      </div>

      {/* 4A. VIEW: KALENDARZ STARTÓW 2027 */}
      {viewMode === 'races' ? (
        <RaceCalendarView
          races={races}
          profile={profile}
          onAddRace={onAddRace}
          onDeleteRace={onDeleteRace}
          onSetMainGoal={onSetMainGoal}
          showToast={showToast}
        />
      ) : viewMode === 'month' ? (
        /* 4B. VIEW: PRZEJRZYSTY KALENDARZ CAŁEGO MIESIĄCA Z IKONKAMI */
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-3.5 space-y-3">
            {/* Month Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Kalendarz Treningowy AI
                </span>
                <h3 className="text-base font-black txt-main">Październik 2026</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-[10px] accent-text font-bold">
                  <span>✓</span> Ukończone
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                  <span>🏃</span> Trening
                </span>
                <span className="flex items-center gap-1 text-[10px] text-sky-400 font-bold">
                  <span>🧘</span> Wolne
                </span>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black txt-muted uppercase pb-1">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="py-0.5">
                  {w}
                </div>
              ))}
            </div>

            {/* 31 Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading offset spaces */}
              {Array.from({ length: FIRST_DAY_OFFSET }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12 rounded-xl bg-white/[0.02]" />
              ))}

              {/* Day cells 1..31 */}
              {Array.from({ length: DAYS_IN_MONTH }).map((_, i) => {
                const dayNum = i + 1;
                const info = getDayTrainingInfo(dayNum);
                const isSelected = selectedDayNumber === dayNum;
                const isToday = dayNum === 19;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      setSelectedDayNumber(dayNum);
                      soundEngine.playClick(false);
                    }}
                    className={`h-12 p-1 rounded-xl flex flex-col items-center justify-between transition-all relative ${
                      isSelected
                        ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)] scale-105 z-10'
                        : info.isCompleted
                        ? 'accent-soft-bg border accent-soft-border hover:brightness-125'
                        : info.isRest
                        ? 'bg-white/5 border border-white/10 hover:border-white/20'
                        : 'bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60'
                    }`}
                  >
                    {/* Day number & Today indicator */}
                    <div className="flex items-center justify-between w-full px-0.5 text-[9px] font-bold">
                      <span className={isToday ? 'accent-text font-black' : 'txt-main'}>
                        {dayNum}
                      </span>
                      {info.isCompleted && (
                        <span className="text-[8px] accent-text font-black">✓</span>
                      )}
                    </div>

                    {/* Icon: 🏃 Trening, 🧘 Regeneracja, 🏁 Zawody */}
                    <span className="text-xs">{info.icon}</span>

                    {/* Distance label or REST */}
                    <span className="text-[8px] font-black truncate max-w-full txt-muted">
                      {info.isRest ? 'Wolne' : `${info.planItem.distanceKm}k`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4C. DETAILED WORKOUT CARD FOR THE SELECTED DAY */}
          <div className="liquid-glass p-4 space-y-3 border border-[var(--accent)]/40 animate-ios">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl liquid-pill flex items-center justify-center text-lg shrink-0">
                  {selectedDayInfo.icon}
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                    {selectedDayInfo.weekday}, {selectedDayNumber} Października 2026
                  </span>
                  <h3 className="text-sm font-black txt-main">
                    {selectedDayInfo.planItem.dayName}: {selectedDayInfo.planItem.type}
                  </h3>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(selectedDayInfo.planItem.type)}`}>
                {selectedDayInfo.planItem.type}
              </span>
            </div>

            {/* Metrics parameters if not rest */}
            {!selectedDayInfo.isRest ? (
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl liquid-pill text-center text-xs">
                <div>
                  <span className="text-[9px] txt-muted block uppercase">Dystans</span>
                  <strong className="txt-main ios-num">{selectedDayInfo.planItem.distanceKm} km</strong>
                </div>
                <div>
                  <span className="text-[9px] txt-muted block uppercase">Docelowe Tempo</span>
                  <strong className="accent-text">{selectedDayInfo.planItem.targetPace}</strong>
                </div>
                <div>
                  <span className="text-[9px] txt-muted block uppercase">Strefa Tętna</span>
                  <strong className="text-rose-400">{selectedDayInfo.planItem.hrZone}</strong>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl accent-soft-bg border accent-soft-border text-xs accent-text">
                🌿 Dzień regeneracji tlenowej. Mobilność bioder, nawodnienie i sen przed kolejną jednostką!
              </div>
            )}

            <p className="text-xs txt-sub leading-relaxed">
              {selectedDayInfo.planItem.description}
            </p>

            {/* Action buttons: Toggle complete */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] txt-muted">
                Status jednostki: <strong className={selectedDayInfo.isCompleted ? 'accent-text font-black' : 'text-amber-400'}>{selectedDayInfo.isCompleted ? '✓ Ukończona' : 'Do zrobienia'}</strong>
              </span>

              <button
                type="button"
                onClick={() => {
                  const idx = (FIRST_DAY_OFFSET + (selectedDayNumber - 1)) % 7;
                  onToggleDayCompleted(idx);
                  showToast(selectedDayInfo.isCompleted ? 'Oznaczono dzień jako do powtórzenia' : 'Zaliczono trening! Świetna robota! 🎋');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedDayInfo.isCompleted
                    ? 'accent-badge'
                    : 'liquid-active shadow-md hover:scale-105 active:scale-95'
                }`}
              >
                {selectedDayInfo.isCompleted ? '✓ Ukończony' : 'Oznacz jako ukończony'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 4D. VIEW: MIKROCYKL 7 DNI (LISTA) */
        <div className="space-y-4 animate-ios">
          {/* Plan Header Card */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  MODUŁ 3 • PERIODYZACJA TRENINGOWA
                </span>
                <h2 className="text-lg font-black txt-main">Mikrocykl Tygodniowy AI</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-black txt-main ios-num">
                  {completedCount}/{totalRuns} biegów
                </span>
                <div className="text-[10px] txt-muted font-medium">Suma: ~{totalWeeklyKm} km</div>
              </div>
            </div>

            {/* Coach Tone Selector */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold txt-muted uppercase tracking-wider">
                STYL I TON TRENERA AI:
              </span>
              <div className="flex gap-1.5 p-0.5 liquid-pill text-[10px]">
                {(['naukowy', 'motywacyjny', 'minimalistyczny'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onUpdateCoachTone(t);
                      showToast(`Ustawiono styl trenera: ${t === 'naukowy' ? 'Naukowy PRO' : t === 'motywacyjny' ? 'Motywator' : 'Minimalist'}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-black transition-all ${
                      profile.coachTone === t
                        ? 'accent-bg text-black shadow-md'
                        : 'txt-sub hover:text-white'
                    }`}
                  >
                    {t === 'naukowy' ? 'Naukowy PRO' : t === 'motywacyjny' ? 'Motywator' : 'Minimalist'}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Target Box */}
            <div className="p-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-black txt-main">
                <span className="text-sm">🎯</span>
                <span>{weeklyFocus || 'Budowa bazy tlenowej pod cel: Sub-25 min na 5 km'}</span>
              </div>
              <p className="text-[11px] txt-sub leading-snug">
                {summary || 'Plan zoptymalizowany pod 4 jednostki treningowe tygodniowo w Strefie 2 i 4.'}
              </p>
            </div>

            {/* Quick action grid: Generate AI + Simulator Co Jeśli */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onGeneratePlanAI}
                disabled={isGenerating}
                aria-label="Generuj plan treningowy AI"
                className="py-3 px-3 rounded-2xl accent-btn-gradient text-xs font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin text-sm">⟳</span>
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generuj Plan AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenSimulator}
                aria-label="Otwórz symulator Co Jeśli?"
                className="py-3 px-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 hover:bg-amber-500/20"
              >
                <span>🚀</span>
                <span>Symulator „Co Jeśli?”</span>
              </button>
            </div>
          </div>

          {/* 7 Days Cards */}
          <div className="space-y-2.5">
            {plan.map((day, idx) => {
              const isRest = day.distanceKm === 0;

              return (
                <div
                  key={`${day.dayShort}-${idx}`}
                  className={`liquid-glass p-3.5 transition-all ${
                    day.completed ? 'opacity-90 accent-border' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center font-black text-xs txt-main shrink-0">
                        {day.dayShort}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold txt-main leading-tight">
                          {day.dayName}
                        </h3>
                        <div className="text-[10px] txt-muted">
                          {isRest ? 'Dzień odpoczynku' : `${day.distanceKm} km • ~${day.durationMin} min`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(day.type)}`}>
                        {day.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleDayCompleted(idx)}
                        aria-label={`Oznacz trening ${day.dayName} jako ${day.completed ? 'nieukończony' : 'ukończony'}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                          day.completed
                            ? 'accent-btn-gradient'
                            : 'liquid-pill txt-muted hover:border-[var(--accent)] hover:text-white'
                        }`}
                      >
                        {day.completed ? '✓' : '○'}
                      </button>
                    </div>
                  </div>

                  {!isRest && (
                    <div className="grid grid-cols-2 gap-2 my-2 py-1.5 px-2.5 rounded-xl liquid-pill text-[11px]">
                      <div>
                        <span className="txt-muted block text-[9px] uppercase">Tempo</span>
                        <span className="font-bold txt-main">{day.targetPace}</span>
                      </div>
                      <div>
                        <span className="txt-muted block text-[9px] uppercase">Tętno docelowe</span>
                        <span className="font-bold txt-main truncate">{day.hrZone}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] txt-sub leading-snug">
                    {day.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
