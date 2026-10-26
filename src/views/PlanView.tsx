import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Trophy,
  Flag,
  Zap,
  Flame,
  Activity,
  Mountain,
  HeartPulse,
  Moon,
  Footprints,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  Check,
  CheckCircle2,
  Circle,
  TrendingUp,
  Target,
  Bot,
  Award,
  Maximize2,
  Leaf,
  Plus,
  ArrowRight,
  Video,
  Scale,
  Heart,
  Edit3,
  ArrowLeftRight,
  Minus,
  Play,
} from 'lucide-react';
import { TrainingDay, RunnerProfile, RaceSlot, RunLog } from '../types.ts';
import { RaceCalendarView } from './RaceCalendarView.tsx';
import { AcwrExplanationModal } from '../components/modals/AcwrExplanationModal.tsx';
import { GoalConfigurationModal } from '../components/modals/GoalConfigurationModal.tsx';
import { InteractiveRunRouteMap } from '../components/maps/InteractiveRunRouteMap.tsx';
import { calculatePeakPerformance, calculateDynamicVo2Max, calculateReadinessBattery } from '../utils/runningMath.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';
import { computeRunnerTelemetry } from '../utils/physiologicalEngine.ts';
import { soundEngine, DEFAULT_PLAN } from '../utils/defaults.ts';
import {
  PandaMascot25D,
  WardrobeState,
  loadSavedPandaWardrobe,
  loadSavedPandaScene,
  getWardrobeSummaryBadges,
} from '../components/panda/PandaMascot25D.tsx';
import { useTrainingData } from '../contexts/TrainingDataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';

interface PlanViewProps {
  plan?: TrainingDay[];
  weeklyFocus?: string;
  summary?: string;
  profile?: RunnerProfile;
  races?: RaceSlot[];
  runs?: RunLog[];
  isGenerating?: boolean;
  onGeneratePlanAI?: (customProfile?: RunnerProfile) => void;
  onToggleDayCompleted?: (index: number) => void;
  onUpdatePlan?: (updatedPlan: TrainingDay[]) => void;
  onOpenSimulator?: () => void;
  onOpenPandaModal?: () => void;
  onOpenSimsStudio?: () => void;
  onOpenLiveHud?: () => void;
  onAddRace?: (race: RaceSlot) => void;
  onDeleteRace?: (id: string) => void;
  onUpdateCoachTone?: (tone: 'naukowy' | 'motywacyjny' | 'minimalistyczny') => void;
  onSetMainGoal?: (goalName: string, targetTimeOrWeeklyKm?: string | number) => void;
  onSelectRunForDetail?: (run: RunLog) => void;
  onOpenIntegrationsHub?: (appId?: string) => void;
  showToast?: (msg: string) => void;
  onOpenAddRun?: () => void;
}

import { PlanWorkoutDetailModal } from '../components/modals/PlanWorkoutDetailModal.tsx';
import { EditWorkoutModal } from '../components/modals/EditWorkoutModal.tsx';

export const PlanView: React.FC<PlanViewProps> = (props) => {
  const dataCtx = useTrainingData();
  const uiCtx = useUI();

  const plan = props.plan ?? dataCtx.plan;
  const weeklyFocus = props.weeklyFocus ?? dataCtx.weeklyFocus;
  const summary = props.summary ?? dataCtx.planSummary;
  const profile = props.profile ?? dataCtx.profile;
  const races = props.races ?? dataCtx.races;
  const runs = props.runs ?? dataCtx.runs;
  const isGenerating = props.isGenerating ?? dataCtx.isPlanGenerating;
  const onGeneratePlanAI = props.onGeneratePlanAI ?? dataCtx.handleGeneratePlanAI;
  const onToggleDayCompleted = props.onToggleDayCompleted ?? dataCtx.handleToggleDayCompleted;
  const onUpdatePlan = props.onUpdatePlan ?? dataCtx.handleUpdatePlan;
  const onOpenSimulator = props.onOpenSimulator ?? (() => uiCtx.setIsSimulatorOpen(true));
  const onOpenPandaModal =
    props.onOpenPandaModal ??
    (() => {
      uiCtx.setPandaInitialOverlay('none');
      uiCtx.setIsPandaModalOpen(true);
    });
  const onOpenSimsStudio =
    props.onOpenSimsStudio ??
    (() => {
      uiCtx.setPandaInitialOverlay('sims_studio');
      uiCtx.setIsPandaModalOpen(true);
    });
  const onOpenLiveHud = props.onOpenLiveHud ?? (() => uiCtx.setIsLiveHudOpen(true));
  const onAddRace = props.onAddRace ?? dataCtx.handleAddCustomRace;
  const onDeleteRace = props.onDeleteRace ?? dataCtx.handleDeleteCustomRace;
  const onUpdateCoachTone =
    props.onUpdateCoachTone ?? ((tone) => dataCtx.handleUpdateProfile({ coachTone: tone }));
  const onSetMainGoal = props.onSetMainGoal ?? dataCtx.handleSetMainGoal;
  const onSelectRunForDetail =
    props.onSelectRunForDetail ??
    ((run) => {
      uiCtx.setSelectedRunForDetail(run);
      uiCtx.setIsRunDetailOpen(true);
    });
  const onOpenIntegrationsHub = props.onOpenIntegrationsHub ?? dataCtx.handleOpenIntegrationsHub;
  const showToast = props.showToast ?? uiCtx.showToast;
  const onOpenAddRun = props.onOpenAddRun ?? (() => uiCtx.setIsAddRunOpen(true));

  // Safe plan fallback
  const safePlan = Array.isArray(plan) && plan.length > 0 ? plan : DEFAULT_PLAN;

  // Navigation: Miesiąc / Mikrocykl (7 Dni) / Starty 2027
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'races'>('week');

  // Real Date Synchronization
  const realNow = new Date();
  const realYear = realNow.getFullYear();
  const realMonth = realNow.getMonth();
  const realDate = realNow.getDate();

  // Selected Day in Monthly Calendar
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(realDate);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [viewingWorkoutIndex, setViewingWorkoutIndex] = useState<number | null>(null);
  const [isAcwrModalOpen, setIsAcwrModalOpen] = useState<boolean>(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [pandaMood, setPandaMood] = useState<'idle' | 'happy' | 'cheer' | 'eating'>('idle');
  const [pandaSpeech, setPandaSpeech] = useState<string>(
    `Cześć ${profile.name}! Przygotowałem Twój plan treningowy. Sprawdź harmonogram w kalendarzu poniżej!`
  );
  const [pandaWardrobe, setPandaWardrobe] = useState<WardrobeState>(() => loadSavedPandaWardrobe());
  const [pandaScene, setPandaScene] = useState<string>(() => loadSavedPandaScene());

  useEffect(() => {
    const syncFromGame = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.wardrobe) {
        setPandaWardrobe(customEvt.detail.wardrobe);
      } else {
        setPandaWardrobe(loadSavedPandaWardrobe());
      }
      if (customEvt.detail?.sceneId) {
        setPandaScene(customEvt.detail.sceneId);
      } else {
        setPandaScene(loadSavedPandaScene());
      }
    };
    window.addEventListener('treda_panda_wardrobe_changed', syncFromGame);
    window.addEventListener('storage', syncFromGame);
    return () => {
      window.removeEventListener('treda_panda_wardrobe_changed', syncFromGame);
      window.removeEventListener('storage', syncFromGame);
    };
  }, []);

  const equippedBadges = getWardrobeSummaryBadges(pandaWardrobe);
  const sceneBgClass =
    pandaScene === 'las_bambusowy'
      ? 'from-emerald-900/70 via-teal-950/80 to-amber-950/80 border-emerald-500/40'
      : pandaScene === 'nocny_wroclaw'
      ? 'from-indigo-950/80 via-slate-900/80 to-purple-950/80 border-indigo-400/40'
      : pandaScene === 'stadion_pro'
      ? 'from-sky-900/70 via-slate-900/80 to-rose-950/80 border-rose-500/40'
      : 'from-amber-900/50 via-slate-900/80 to-emerald-950/70 border-amber-500/40';

  const completedCount = safePlan.filter((d) => Boolean(d?.completed)).length;
  const totalRuns = safePlan.filter((d) => (d?.distanceKm || 0) > 0).length;
  const totalWeeklyKm = safePlan.reduce((acc, d) => acc + (d?.distanceKm || 0), 0);

  const pandaLevel = Math.floor((profile.levelXp || 0) / 250) + 1;
  const pandaStatusText =
    pandaMood === 'eating'
      ? 'Po posiłku 🎋'
      : pandaMood === 'happy' || pandaMood === 'cheer'
      ? 'Super forma 🔥'
      : 'Pełna energii ⚡';

  // Poke Panda Action
  const handlePokePanda = () => {
    const moods: Array<'happy' | 'cheer' | 'eating'> = ['happy', 'cheer', 'eating'];
    const nextMood = moods[Math.floor(Math.random() * moods.length)];
    setPandaMood(nextMood);

    if (nextMood === 'eating') {
      soundEngine.playPandaSound('crunch');
      setPandaSpeech('Świeża energia na mocny bieg w Strefie 2!');
    } else {
      soundEngine.playPandaSound('cheer');
      setPandaSpeech(`Brawo ${profile.name}! Forma stale rośnie, a cel ${String(profile.targetGoal || 'Budowa bazy tlenowej').slice(0, 24)}... jest coraz bliżej!`);
    }

    setTimeout(() => setPandaMood('idle'), 2500);
  };

  const getWorkoutVectorIcon = (type: string, isRace = false) => {
    if (isRace) return <Flag className="w-3.5 h-3.5 text-violet-400" />;
    switch (type) {
      case 'Interwały':
        return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'Tempo run':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'Bieg długi':
        return <TrendingUp className="w-3.5 h-3.5 text-purple-400" />;
      case 'Regeneracja':
        return <Moon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Siła biegowa':
        return <Mountain className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Footprints className="w-3.5 h-3.5 text-emerald-400" />;
    }
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
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const getIntensityLabel = (type: string) => {
    switch (type) {
      case 'Interwały':
        return { label: 'Intensywność: Wysoka (Strefa 4-5)', color: 'text-rose-400' };
      case 'Tempo run':
        return { label: 'Intensywność: Średnia/Wysoka (Strefa 3-4)', color: 'text-amber-400' };
      case 'Bieg długi':
        return { label: 'Intensywność: Umiarkowana (Strefa 2)', color: 'text-purple-400' };
      case 'Regeneracja':
        return { label: 'Intensywność: Bardzo niska (Strefa 1)', color: 'text-emerald-400' };
      case 'Siła biegowa':
        return { label: 'Intensywność: Dynamiczna (Podbiegi)', color: 'text-cyan-400' };
      default:
        return { label: 'Intensywność: Tlenowa (Strefa 2)', color: 'text-emerald-400' };
    }
  };

  // Dynamic Month Calendar State initialized to real today's month
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date(realYear, realMonth, 1));
  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
  const MONTH_NAMES_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    soundEngine.playClick(false);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    soundEngine.playClick(false);
  };

  const currentYear = currentMonthDate.getFullYear();
  const currentMonthIdx = currentMonthDate.getMonth();
  const currentMonthName = MONTH_NAMES_PL[currentMonthIdx];
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayOffset = (new Date(currentYear, currentMonthIdx, 1).getDay() + 6) % 7; // Mon=0 .. Sun=6

  const getDayTrainingInfo = (dayNum: number) => {
    const weekdayIdx = (firstDayOffset + (dayNum - 1)) % 7;
    const planItem = safePlan[weekdayIdx] || safePlan[0] || DEFAULT_PLAN[0];

    const isCurrentCalendarMonth = currentYear === realYear && currentMonthIdx === realMonth;
    const isToday = isCurrentCalendarMonth && dayNum === realDate;
    const isFuture = (currentYear > realYear) ||
                     (currentYear === realYear && currentMonthIdx > realMonth) ||
                     (isCurrentCalendarMonth && dayNum > realDate);
    const isPast = (currentYear < realYear) ||
                   (currentYear === realYear && currentMonthIdx < realMonth) ||
                   (isCurrentCalendarMonth && dayNum < realDate);

    // Format ISO date string "YYYY-MM-DD" for this specific calendar day
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(currentMonthIdx + 1).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    // Plan start boundary: if user created account or reset data, plan starts from planGeneratedAt / createdAt onwards
    const planStartDate = profile?.planGeneratedAt || profile?.createdAt;
    const isBeforePlanStart = Boolean(planStartDate && dateStr < planStartDate);

    // Check if the user logged an actual run on this calendar date!
    const matchingRun = (runs || []).find((r) => {
      if (!r.date) return false;
      return r.date === dateStr || r.date.startsWith(dateStr);
    });

    const hasRealRun = Boolean(matchingRun);
    const realRun = matchingRun || null;

    // A real run always marks the day completed! If before plan creation, never mark completed unless real run exists.
    const isCompleted = hasRealRun
      ? true
      : isBeforePlanStart
      ? false
      : isFuture
      ? false
      : isToday
      ? Boolean(planItem?.completed)
      : false; // Past days without actual registered runs are not retroactively completed

    const isRaceDay = dayNum === 14 || dayNum === 28;

    return {
      dayNum,
      weekdayIdx,
      weekday: WEEKDAYS[weekdayIdx],
      dateStr,
      planItem,
      hasRealRun,
      realRun,
      isBeforePlanStart,
      isRest: hasRealRun ? false : isBeforePlanStart ? true : (planItem?.distanceKm || 0) === 0,
      isCompleted,
      isRaceDay,
      isToday,
      isFuture,
      isPast,
    };
  };

  const selectedDayInfo = getDayTrainingInfo(selectedDayNumber);
  const telemetry = computeRunnerTelemetry(profile, runs);
  const dynamicVo2 = calculateDynamicVo2Max(profile, runs);
  const unifiedVo2 = dynamicVo2 || profile.vo2max || 52;
  const peakAnalysis = calculatePeakPerformance(runs);
  const readiness = calculateReadinessBattery(runs, profile);

  // Today-First synchronization
  const realTodayWeekdayIdx = (new Date().getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const todayWorkout = safePlan[realTodayWeekdayIdx] || safePlan[0];
  const todayDateFormatted = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const isTodayCompleted = Boolean(todayWorkout?.completed);

  return (
    <div className="space-y-4 px-4 pb-28 animate-ios">
      {/* 1. TOP BENTO GRID: 4 ATHLETIC INDICATORS (Apple Fitness+ / Strava style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
        {/* Kafelek 1: Waga */}
        <div className="bento-tile shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Waga</span>
            <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black txt-main ios-num tracking-tight">
              {profile.weight} <span className="text-xs font-semibold txt-muted">kg</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[9.5px] font-medium txt-muted">
              Cel: <strong className="txt-main">{profile.targetWeight || 68} kg</strong>
            </span>
          </div>
        </div>

        {/* Kafelek 2: VO2Max / VDOT */}
        <div className="bento-tile shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">VO2Max</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-300 ios-num tracking-tight">
              {unifiedVo2} <span className="text-xs font-semibold text-amber-500/80 dark:text-amber-400/80">ml/kg</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[9.5px] font-bold text-emerald-500 dark:text-emerald-400">
              VDOT {unifiedVo2} • Poziom Pro
            </span>
          </div>
        </div>

        {/* Kafelek 3: Śr. Kadencja & GCT */}
        <div className="bento-tile shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Kadencja & GCT</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Footprints className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-black text-emerald-500 dark:text-emerald-300 ios-num tracking-tight">
              {telemetry.avgCadence || 176} <span className="text-xs font-semibold text-emerald-500/80 dark:text-emerald-400/80">spm</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[9.5px] font-medium text-cyan-500 dark:text-cyan-400">
              {telemetry.avgGctMs ? `${telemetry.avgGctMs} ms GCT` : '226 ms GCT'}
            </span>
          </div>
        </div>

        {/* Kafelek 4: 🔋 Bateria Organizmu / Gotowość (WHOOP / Garmin Body Battery) */}
        <div
          onClick={() => setIsAcwrModalOpen(true)}
          role="button"
          tabIndex={0}
          className="bento-tile shadow-sm cursor-pointer hover:border-[var(--accent)] group transition-all"
          title="Kliknij, aby poznać czynniki wpływające na baterię organizmu i wskaźnik ACWR"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider txt-muted group-hover:text-[var(--accent)] transition-colors flex items-center gap-1">
              <span>🔋</span>
              <span>Bateria Organizmu</span>
            </span>
            <div className={`w-6 h-6 rounded-lg ${readiness.batteryBg} ${readiness.batteryColor} flex items-center justify-center font-bold text-xs`}>
              {readiness.score >= 78 ? '⚡' : readiness.score >= 45 ? '🔋' : '🪫'}
            </div>
          </div>
          <div className="my-1.5">
            <div className={`text-xl sm:text-2xl font-black ${readiness.batteryColor} ios-num tracking-tight flex items-baseline gap-1`}>
              <span>{readiness.score}%</span>
              <span className="text-xs font-bold text-slate-400">Gotowość</span>
            </div>
          </div>
          <div className="pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className={`text-[9.5px] font-bold ${readiness.batteryColor} truncate max-w-[105px]`}>
              {readiness.statusLabel}
            </span>
            <span className="text-[8px] txt-muted font-mono">
              ACWR {peakAnalysis.acwr}
            </span>
          </div>
        </div>
      </div>

      {/* OSTRZEŻENIE O NISKIEJ BATERII ORGANIZMU (<45%) & AUTOKOREKTA PLANU WHOOP/AI */}
      {readiness.isLowBatteryWarning && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 space-y-2.5 animate-ios shadow-lg shadow-rose-500/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪫</span>
              <div>
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                  <span>Alert Zmęczenia WHOOP / AI</span>
                  <span>•</span>
                  <span>Bateria: {readiness.score}%</span>
                </span>
                <h4 className="text-xs font-black text-white">
                  Niski poziom regeneracji organizmu przed dzisiejszym treningiem
                </h4>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 text-[10px] font-black font-mono border border-rose-500/30 shrink-0">
              ACWR {readiness.details.acwr}
            </span>
          </div>

          <p className="text-[11px] text-rose-200/90 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-rose-500/20">
            🐼 <strong>RunPanda & Trener AI ostrzegają:</strong> {readiness.recommendation}
          </p>

          {todayWorkout.type !== 'Regeneracja' && onUpdatePlan && (
            <button
              type="button"
              onClick={() => {
                const updated = [...plan];
                updated[realTodayWeekdayIdx] = {
                  ...todayWorkout,
                  type: 'Regeneracja',
                  distanceKm: Math.min(4, Math.max(3, +(todayWorkout.distanceKm * 0.5).toFixed(1))),
                  targetPace: '6:15 /km',
                  hrZone: 'Z1 (<130 bpm)',
                  description: 'Autokorekta WHOOP/AI: Aktywna regeneracja tlenowa z powodu rozładowanej baterii organizmu.',
                };
                onUpdatePlan(updated);
                soundEngine.playSuccess();
                showToast('Zastosowano bezpieczną autokorektę planu na dziś! 🔋 Odpocznij i odbuduj energię.');
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span>🛡️ Zastosuj bezpieczną autokorektę (Zamień na Bieg Regeneracyjny Z1)</span>
            </button>
          )}
        </div>
      )}

      {/* 2. HERO CARD: DZISIEJSZY TRENING (Today First) */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setViewingWorkoutIndex(realTodayWeekdayIdx);
        }}
        className="liquid-glass p-4 rounded-3xl border border-[var(--accent-border)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-tile)] to-transparent space-y-3.5 shadow-xl relative overflow-hidden cursor-pointer group hover:border-emerald-400/60 transition-all"
        title="Kliknij, aby otworzyć pełne szczegóły treningu, rozgrzewkę i strukturę AI"
      >
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-0 w-48 h-32 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row: Day info + Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                DZISIEJSZY TRENING
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] accent-text font-bold">
                {todayWorkout.dayName}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black txt-main capitalize group-hover:text-emerald-300 transition-colors">
              {todayDateFormatted}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getBadgeColor(todayWorkout.type)} flex items-center gap-1`}>
              {getWorkoutVectorIcon(todayWorkout.type)}
              <span>{todayWorkout.type}</span>
            </span>
          </div>
        </div>

        {/* Workout Key Targets Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)]">
            <span className="text-[9px] txt-muted uppercase font-bold block">Dystans</span>
            <strong className="text-base sm:text-lg font-black txt-main ios-num">
              {todayWorkout.distanceKm} <span className="text-xs font-bold text-[var(--accent)]">km</span>
            </strong>
          </div>

          <div className="p-2.5 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)]">
            <span className="text-[9px] txt-muted uppercase font-bold block">Docelowe Tempo</span>
            <strong className="text-base sm:text-lg font-black txt-main font-mono">
              {todayWorkout.targetPace || '5:20 /km'}
            </strong>
          </div>

          <div className="p-2.5 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)]">
            <span className="text-[9px] txt-muted uppercase font-bold block">Strefa Tętna</span>
            <strong className="text-xs sm:text-sm font-black text-rose-500 dark:text-rose-400 truncate block mt-0.5">
              {todayWorkout.hrZone || 'Z2 (135-148)'}
            </strong>
          </div>
        </div>

        {/* Coach Workout Description + Direct Workout Details Entry Button */}
        <div className="p-3 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] text-xs space-y-2">
          <p className="txt-sub text-[11px] leading-relaxed">
            {todayWorkout.description || 'Płynny bieg tlenowy w Strefie 2 z naciskiem na rytmiczną kadencję 175-180 spm i stabilną pracę ramion.'}
          </p>

          <button
            type="button"
            onClick={() => setViewingWorkoutIndex(realTodayWeekdayIdx)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>🔍 Wejdź w dzisiejszy trening & Rozgrzewkę AI ›</span>
          </button>
        </div>

        {/* 3 Action Buttons for Today's Workout */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Button 1: Odhacz */}
          <button
            type="button"
            onClick={() => {
              onToggleDayCompleted(realTodayWeekdayIdx);
              soundEngine.playSuccess();
              showToast(isTodayCompleted ? 'Cofnięto ukończenie treningu' : 'Odhaczono dzisiejszy trening (+30 🎋)!');
            }}
            className={`py-2.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
              isTodayCompleted
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isTodayCompleted ? 'Ukończony ✓' : 'Odhacz'}</span>
          </button>

          {/* Button 2: Przełóż / Edytuj */}
          <button
            type="button"
            onClick={() => setEditingDayIndex(realTodayWeekdayIdx)}
            className="py-2.5 px-2 rounded-xl font-bold text-xs bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-slate-950 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Przełóż / Edytuj</span>
          </button>

          {/* Button 3: Start GPS */}
          <button
            type="button"
            onClick={() => {
              if (onOpenLiveHud) onOpenLiveHud();
              else if (onOpenSimulator) onOpenSimulator();
            }}
            className="py-2.5 px-2 rounded-xl font-black text-xs accent-btn-gradient text-slate-950 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Start GPS</span>
          </button>
        </div>
      </div>

      {/* 3. RUNPANDA 2.5D CARD WITH TWO BIG ACTION BUTTONS */}
      <div className="liquid-glass p-3.5 rounded-3xl border border-[var(--accent-border)] space-y-3 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Live 2.5D Canvas Panda Avatar */}
          <div
            onClick={handlePokePanda}
            className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b ${sceneBgClass} border shrink-0 select-none relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-inner overflow-visible`}
            title="Kliknij, aby pogłaskać RunPandę!"
          >
            <PandaMascot25D
              compact
              wardrobe={pandaWardrobe}
              stateMode={
                pandaMood === 'eating'
                  ? 'eating'
                  : pandaMood === 'happy' || pandaMood === 'cheer'
                  ? 'proud'
                  : 'idle'
              }
              className="w-18 h-18 sm:w-20 sm:h-20 -mt-1 pointer-events-none"
            />
            <span className="absolute -bottom-1.5 text-[9px] font-black bg-slate-950/95 px-2 py-0.5 rounded-full border border-amber-400/50 text-amber-300 flex items-center gap-1 shadow-md z-20">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>{profile.bamboos}</span>
            </span>
          </div>

          {/* Panda Speech, Level & Status */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 min-w-0 truncate">
                <Leaf className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="truncate">RUNPANDA 2.5D</span>
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                <span>Poz. {pandaLevel}</span>
              </span>
            </div>

            <p className="text-[11px] txt-main font-medium leading-snug line-clamp-2">
              "{pandaSpeech}"
            </p>

            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>{pandaStatusText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2 Dedicated Action Buttons for Panda: Świat Pandy & Sims Studio */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onOpenPandaModal}
            className="py-2.5 px-3 rounded-2xl bg-[var(--surface-tile)] hover:bg-[var(--surface-tile-hover)] border border-[var(--border-subtle)] text-xs font-black txt-main flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>🏠</span>
            <span>Świat Pandy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenSimsStudio) onOpenSimsStudio();
              else if (onOpenPandaModal) onOpenPandaModal();
            }}
            className="py-2.5 px-3 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-xs font-black text-indigo-600 dark:text-indigo-300 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>👗</span>
            <span>Kreator Stylu (Sims)</span>
          </button>
        </div>
      </div>

      {/* 2. ATHLETIC GOAL BANNER & CONFIGURATOR LAUNCHER */}
      <div className="liquid-glass p-3.5 sm:p-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-black rounded-2xl relative overflow-hidden space-y-2.5">
        {/* Top Header Row: Category Badge + Status + Action Button */}
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-400 tracking-wider whitespace-nowrap">
                  Główny Cel Sezonu
                </span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  88% celowości
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
            title="Skonfiguruj cele treningowe w profesjonalnym stylu"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Zmień Cel</span>
          </button>
        </div>

        {/* Goal Title */}
        <div>
          <h4 className="text-sm font-black txt-main leading-snug">
            {profile.targetGoal || 'Sub-25 min na 5 km i redukcja masy'}
          </h4>
        </div>

        {/* 3-Column Grid of Metric Tiles (styled exactly like the top header indicators) */}
        <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
          {/* Tile 1: VO2max */}
          <div className="p-2 rounded-xl bg-black/40 border border-sky-500/20 flex flex-col items-center justify-center shadow-sm hover:border-sky-500/40 transition-colors">
            <span className="text-[9px] font-black uppercase text-sky-400 flex items-center gap-1 leading-none">
              <Activity className="w-3 h-3 text-sky-400 shrink-0" />
              <span>VO2max</span>
            </span>
            <div className="text-xs sm:text-sm font-black text-sky-300 mt-1 ios-num leading-tight">
              ~{unifiedVo2}
            </div>
            <span className="text-[8px] txt-muted block truncate leading-none mt-0.5">ml/kg/min</span>
          </div>

          {/* Tile 2: Objętość */}
          <div className="p-2 rounded-xl bg-black/40 border border-amber-500/20 flex flex-col items-center justify-center shadow-sm hover:border-amber-500/40 transition-colors">
            <span className="text-[9px] font-black uppercase text-amber-400 flex items-center gap-1 leading-none">
              <Footprints className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Objętość</span>
            </span>
            <div className="text-xs sm:text-sm font-black text-amber-300 mt-1 ios-num leading-tight">
              ~{profile.weeklyKm || 25} km
            </div>
            <span className="text-[8px] txt-muted block truncate leading-none mt-0.5">tygodniowo</span>
          </div>

          {/* Tile 3: Tempo */}
          <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20 flex flex-col items-center justify-center shadow-sm hover:border-emerald-500/40 transition-colors">
            <span className="text-[9px] font-black uppercase text-emerald-400 flex items-center gap-1 leading-none">
              <Flame className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Tempo</span>
            </span>
            <div className="text-xs sm:text-sm font-black text-emerald-300 mt-1 ios-num leading-tight">
              {profile.time5k || '26:43'}
            </div>
            <span className="text-[8px] txt-muted block truncate leading-none mt-0.5">/5km cel</span>
          </div>
        </div>
      </div>

      {/* 3. PEAK PERFORMANCE & OBCIĄŻENIE TRENINGOWE (ACWR) */}
      {(() => {
        const peakAnalysis = calculatePeakPerformance(runs);
        const dynamicVo2 = calculateDynamicVo2Max(profile, runs);

        return (
          <div className="liquid-glass p-4 space-y-3 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Peak Performance & Analiza Obciążenia
                  </h3>
                  <p className="text-[10px] txt-muted">Ostatnie 7 dni vs Średnia z 4 tygodni (ACWR)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAcwrModalOpen(true)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${peakAnalysis.statusColor} flex items-center gap-1 hover:brightness-125 transition-all shadow-sm active:scale-95 cursor-pointer`}
                title="Kliknij, aby poznać wyjaśnienie wskaźnika ACWR i Peak Performance"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Peak: {peakAnalysis.peakScore}%</span>
                <span className="text-[9px] underline opacity-90">({peakAnalysis.status})</span>
              </button>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-0.5 text-center">
                <span className="text-[9px] font-bold txt-muted uppercase block">Obciążenie (7 dni)</span>
                <strong className="text-sm font-black txt-main ios-num">{peakAnalysis.acuteLoadKm} km</strong>
                <span className="text-[9px] text-emerald-400 block font-bold">Aktywny tydzień</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-0.5 text-center">
                <span className="text-[9px] font-bold txt-muted uppercase block">Średnia (4 tygodnie)</span>
                <strong className="text-sm font-black txt-main ios-num">{peakAnalysis.chronicLoadKm} km/tydź</strong>
                <span className="text-[9px] txt-sub block">Baza tlenowa</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-0.5 text-center">
                <span className="text-[9px] font-bold txt-muted uppercase block">Wskaźnik ACWR</span>
                <strong className="text-sm font-black accent-text ios-num">{peakAnalysis.acwr}</strong>
                <span className="text-[9px] text-emerald-400 block font-bold">Sweet Spot</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-0.5 text-center">
                <span className="text-[9px] font-bold txt-muted uppercase block">Dynamiczny VO2 Max</span>
                <strong className="text-sm font-black text-amber-300 ios-num">{unifiedVo2} ml/kg</strong>
                <span className="text-[9px] text-emerald-400 block font-bold">Aktualizowany AI</span>
              </div>
            </div>

            {/* AI Advice Pill */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
              <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="txt-sub text-[11px] leading-snug">
                <strong>Werdykt Trenera AI:</strong> {peakAnalysis.advice}
              </p>
            </div>

            {/* Interaktywna Mapa GPS Ostatniego Biegu (Leaflet) */}
            {runs.length > 0 && (
              <div className="pt-1">
                <InteractiveRunRouteMap
                  run={runs[0]}
                  cityName={profile.city}
                  title={`Interaktywna Mapa GPS • ${runs[0].title || `Ostatni bieg ${runs[0].distanceKm} km`}`}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. SUB-NAVIGATION WITH VECTOR ICONS: MIESIĄC vs 7 DNI vs SEZON 2027 */}
      <div className="grid grid-cols-3 gap-1.5 p-1 liquid-glass rounded-2xl text-center text-xs">
        <button
          type="button"
          onClick={() => setViewMode('month')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'month'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Miesiąc</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('week')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'week'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Mikrocykl (7 Dni)</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('races')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'races'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Starty 2027</span>
        </button>
      </div>

      {/* 5A. VIEW: KALENDARZ STARTÓW 2027 */}
      {viewMode === 'races' ? (
        <RaceCalendarView
          races={races}
          profile={profile}
          runs={runs}
          plan={safePlan}
          onAddRace={onAddRace}
          onDeleteRace={onDeleteRace}
          onSetMainGoal={onSetMainGoal}
          showToast={showToast}
          onOpenSimulator={onOpenSimulator}
        />
      ) : viewMode === 'month' ? (
        /* 5B. VIEW: PRZEJRZYSTY KALENDARZ CAŁEGO MIESIĄCA Z CZYTELNYMI WEKTORAMI */
        <div className="space-y-3 animate-ios">
          <div className="liquid-glass p-3.5 space-y-3">
            {/* Month Header with Vector Chevron Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Kalendarz Treningowy AI</span>
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-base font-black txt-main">
                      {currentMonthName} {currentYear}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 rounded-lg liquid-pill font-black text-xs hover:border-[var(--accent)] text-white transition-all active:scale-90"
                        title="Poprzedni miesiąc"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-lg liquid-pill font-black text-xs hover:border-[var(--accent)] text-white transition-all active:scale-90"
                        title="Następny miesiąc"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Vector Legend with wrapping to prevent overflow on mobile */}
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Ukończone</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                  <Footprints className="w-3 h-3 text-amber-300" />
                  <span>Bieg</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 shrink-0">
                  <Moon className="w-3 h-3 text-sky-400" />
                  <span>Wolne</span>
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

            {/* Dynamic Days Grid with Clean Vector Glyphs */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 overflow-hidden">
              {/* Empty leading offset spaces */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[56px] sm:min-h-[64px] rounded-xl bg-white/[0.02] border border-white/[0.03]" />
              ))}

              {/* Day cells 1..daysInMonth */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const info = getDayTrainingInfo(dayNum);
                const isSelected = selectedDayNumber === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      setSelectedDayNumber(dayNum);
                      soundEngine.playClick(false);
                    }}
                    className={`min-h-[56px] sm:min-h-[64px] w-full p-1 rounded-xl flex flex-col items-center justify-between transition-all relative overflow-hidden ${
                      isSelected
                        ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/50 z-10 shadow-lg'
                        : info.hasRealRun
                        ? 'border-2 border-emerald-400 bg-emerald-500/25 shadow-lg ring-1 ring-emerald-400/60'
                        : info.isToday
                        ? 'border-2 border-amber-400 bg-amber-500/20 shadow-md ring-1 ring-amber-400/50'
                        : info.isBeforePlanStart
                        ? 'bg-white/[0.02] border border-white/5 opacity-40 hover:opacity-80'
                        : info.isCompleted && !info.isFuture
                        ? 'accent-soft-bg border accent-soft-border hover:brightness-125'
                        : info.isRest
                        ? 'bg-white/5 border border-white/10 hover:border-white/20'
                        : 'bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60'
                    }`}
                  >
                    {/* Day number & Today indicator */}
                    <div className="flex items-center justify-between w-full px-0.5 text-[9px] font-bold leading-none">
                      <span className={info.isToday ? 'text-amber-300 font-black' : info.hasRealRun ? 'text-emerald-300 font-black' : info.isBeforePlanStart ? 'text-slate-500 font-medium' : 'txt-main'}>
                        {dayNum}
                      </span>
                      {info.isToday ? (
                        <span className="text-[6px] font-black bg-amber-400 text-slate-950 px-1 py-0.5 rounded leading-none shrink-0 shadow-sm">
                          DZIŚ
                        </span>
                      ) : info.hasRealRun ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3] shrink-0" />
                      ) : (!info.isBeforePlanStart && info.isCompleted && !info.isFuture) ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3] shrink-0" />
                      ) : null}
                    </div>

                    {/* Vector icon indicator */}
                    <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 my-0.5 pointer-events-none">
                      {info.hasRealRun ? (
                        <Footprints className="w-3.5 h-3.5 text-emerald-300" />
                      ) : info.isBeforePlanStart ? (
                        <Minus className="w-3 h-3 text-slate-600" />
                      ) : (
                        getWorkoutVectorIcon(info.planItem.type, info.isRaceDay)
                      )}
                    </div>

                    {/* Distance label or REST */}
                    <span className={`text-[7.5px] sm:text-[8px] font-black truncate max-w-full text-center leading-none ${
                      info.hasRealRun ? 'text-emerald-300 font-mono' : info.isBeforePlanStart ? 'text-slate-600' : 'txt-muted'
                    }`}>
                      {info.hasRealRun ? `${info.realRun?.distanceKm}k` : info.isBeforePlanStart ? '—' : info.isRest ? 'Wolne' : `${info.planItem.distanceKm}k`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5C. DETAILED WORKOUT CARD FOR THE SELECTED DAY */}
          {selectedDayInfo.hasRealRun && selectedDayInfo.realRun ? (
            <div className="liquid-glass p-4 space-y-3.5 border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 rounded-3xl animate-ios shadow-2xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <Footprints className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        {selectedDayInfo.weekday}, {selectedDayNumber} {currentMonthName} {currentYear}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase">
                        Zrealizowany Bieg ✓
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black txt-main">
                      {selectedDayInfo.realRun.title || `Bieg • ${selectedDayInfo.realRun.distanceKm} km`}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 font-mono bg-black/60 px-3 py-1 rounded-xl border border-emerald-500/40">
                    {selectedDayInfo.realRun.distanceKm} km w {selectedDayInfo.realRun.avgPace}/km
                  </span>
                </div>
              </div>

              {/* 4-Metric Run Bar */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 py-2 px-3 rounded-2xl bg-black/60 border border-white/10 text-center text-xs">
                <div>
                  <span className="text-[9px] txt-muted block uppercase font-bold">Dystans</span>
                  <strong className="text-white font-mono text-sm">{selectedDayInfo.realRun.distanceKm} km</strong>
                </div>
                <div>
                  <span className="text-[9px] txt-muted block uppercase font-bold">Tempo</span>
                  <strong className="text-amber-400 font-mono text-sm">{selectedDayInfo.realRun.avgPace}/km</strong>
                </div>
                <div>
                  <span className="text-[9px] txt-muted block uppercase font-bold">Śr. Tętno</span>
                  <strong className="text-rose-400 font-mono text-sm">{selectedDayInfo.realRun.avgHr} bpm</strong>
                </div>
                <div>
                  <span className="text-[9px] txt-muted block uppercase font-bold">Kadencja</span>
                  <strong className="text-emerald-400 font-mono text-sm">{selectedDayInfo.realRun.avgCadence || 176} spm</strong>
                </div>
              </div>

              {/* Equipment and Notes */}
              <div className="flex items-center justify-between text-xs text-slate-300 px-1 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <span>👟 Buty:</span>
                  <strong className="text-white">{selectedDayInfo.realRun.shoeName}</strong>
                </span>
                {selectedDayInfo.realRun.elevationGainM !== undefined && (
                  <span className="text-emerald-400 font-mono text-[11px]">
                    +{selectedDayInfo.realRun.elevationGainM} m przewyższeń
                  </span>
                )}
              </div>

              {selectedDayInfo.realRun.notes && (
                <p className="text-xs text-slate-300/90 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5 italic">
                  "{selectedDayInfo.realRun.notes}"
                </p>
              )}

              {/* Interactive Leaflet Map for this run */}
              <div className="pt-1">
                <InteractiveRunRouteMap
                  run={selectedDayInfo.realRun}
                  cityName={profile.city}
                  heightClass="h-56 sm:h-64"
                  title={`Trasa GPS z ${selectedDayInfo.dateStr} (${selectedDayInfo.realRun.distanceKm} km)`}
                />
              </div>

              {/* Action Button: View Full Video/Biomechanics Modal */}
              {onSelectRunForDetail && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectRunForDetail(selectedDayInfo.realRun!)}
                    className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Zobacz pełną analizę i biomechanikę wideo ›</span>
                  </button>
                </div>
              )}
            </div>
          ) : selectedDayInfo.isBeforePlanStart && !selectedDayInfo.hasRealRun ? (
            <div className="liquid-glass p-4 space-y-3 border border-white/10 rounded-2xl animate-ios">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl liquid-pill flex items-center justify-center shrink-0 border border-white/10 text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {selectedDayInfo.weekday}, {selectedDayNumber} {currentMonthName} {currentYear}
                  </span>
                  <h3 className="text-sm font-black txt-main">
                    Dzień przed wygenerowaniem planu
                  </h3>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs txt-muted leading-relaxed space-y-1.5">
                <p>
                  Twój plan treningowy obowiązuje od daty wygenerowania (<strong className="text-white">{profile.planGeneratedAt || profile.createdAt || 'bieżącego dnia'}</strong>) naprzód.
                </p>
                <p className="text-[11px] text-slate-400">
                  Dni sprzed wygenerowania planu nie zawierają zaplanowanych treningów wstecz. Jeśli odbyłeś wtedy bieg, zarejestruj go w zakładce Treningi!
                </p>
              </div>
            </div>
          ) : (
            <div className="liquid-glass p-4 space-y-3 border border-[var(--accent)]/40 animate-ios">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl liquid-pill flex items-center justify-center shrink-0 border border-white/10">
                    {getWorkoutVectorIcon(selectedDayInfo.planItem.type, selectedDayInfo.isRaceDay)}
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                      {selectedDayInfo.weekday}, {selectedDayNumber} {currentMonthName} {currentYear}
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
                    <span className="text-[9px] txt-muted block uppercase flex items-center justify-center gap-1">
                      <Footprints className="w-2.5 h-2.5" />
                      <span>Dystans</span>
                    </span>
                    <strong className="txt-main ios-num">{selectedDayInfo.planItem.distanceKm} km</strong>
                  </div>
                  <div>
                    <span className="text-[9px] txt-muted block uppercase flex items-center justify-center gap-1">
                      <Timer className="w-2.5 h-2.5" />
                      <span>Tempo</span>
                    </span>
                    <strong className="accent-text">{selectedDayInfo.planItem.targetPace}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] txt-muted block uppercase flex items-center justify-center gap-1">
                      <HeartPulse className="w-2.5 h-2.5" />
                      <span>Strefa Tętna</span>
                    </span>
                    <strong className="text-rose-400">{selectedDayInfo.planItem.hrZone}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl accent-soft-bg border accent-soft-border text-xs accent-text flex items-center gap-2">
                  <Moon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dzień regeneracji tlenowej. Mobilność bioder, nawodnienie i sen przed kolejną jednostką!</span>
                </div>
              )}

              <p className="text-xs txt-sub leading-relaxed">
                {selectedDayInfo.planItem.description}
              </p>

              {/* Action buttons: View detail, Toggle complete & Edit */}
              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const idx = (firstDayOffset + (selectedDayNumber - 1)) % 7;
                    setViewingWorkoutIndex(idx);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🔍 Wejdź w ten trening ›</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = (firstDayOffset + (selectedDayNumber - 1)) % 7;
                      setEditingDayIndex(idx);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold liquid-pill text-sky-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edytuj / Przełóż</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const idx = (firstDayOffset + (selectedDayNumber - 1)) % 7;
                      onToggleDayCompleted(idx);
                      showToast(selectedDayInfo.isCompleted ? 'Oznaczono dzień jako do powtórzenia' : 'Zaliczono trening! Świetna robota!');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      selectedDayInfo.isCompleted
                        ? 'accent-badge'
                        : 'liquid-active shadow-md hover:scale-105 active:scale-95'
                    }`}
                  >
                    {selectedDayInfo.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ukończony</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" />
                        <span>Oznacz jako ukończony</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 5D. VIEW: MIKROCYKL 7 DNI (VERT.RUN / RUNNA STYLE LIKE IMG_4491) */
        <div className="space-y-4 animate-ios">
          {/* Plan Header Card */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  <span>Periodyzacja Treningowa AI</span>
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

            {/* Weekly Target Box with Vector Target */}
            <div className="p-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-black txt-main">
                <Target className="w-4 h-4 text-emerald-400 shrink-0" />
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
                onClick={() => onGeneratePlanAI()}
                disabled={isGenerating}
                aria-label="Generuj plan treningowy AI"
                className="py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-60 transition-all"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Generuj Plan AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenSimulator}
                aria-label="Otwórz symulator Co Jeśli?"
                className="py-3 px-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 hover:bg-amber-500/20 transition-all"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Symulator „Co Jeśli?”</span>
              </button>
            </div>
          </div>

          {/* 7 Days Cards - Clean, high contrast, crisp typography (Runna style) */}
          <div className="space-y-2.5">
            {safePlan.map((day, idx) => {
              const isRest = day.distanceKm === 0;
              const intensity = getIntensityLabel(day.type);

              return (
                <div
                  key={`${day.dayShort}-${idx}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.btn-complete-day')) return;
                    setViewingWorkoutIndex(idx);
                  }}
                  className={`liquid-glass p-3.5 rounded-2xl border transition-all cursor-pointer hover:border-sky-400/50 group ${
                    day.completed ? 'opacity-90 border-emerald-500/50 bg-emerald-950/10' : 'border-white/10'
                  }`}
                  title="Kliknij, aby poznać szczegóły treningu, strukturę i wystartować z GPS"
                >
                  {/* Top Row: Day Label + Checkmark */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl liquid-pill flex items-center justify-center shrink-0 border border-white/10 group-hover:border-sky-400/50 transition-colors">
                        {getWorkoutVectorIcon(day.type)}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {day.dayName}
                        </div>
                        <h3 className="text-xs font-black txt-main leading-tight group-hover:text-sky-300 transition-colors">
                          {day.type} {day.distanceKm > 0 ? `• ${day.distanceKm} km` : ''}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDayIndex(idx);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-[10px] font-bold text-sky-300 border border-white/10 flex items-center gap-1 transition-all active:scale-95"
                        title="Edytuj parametry lub przełóż na inny dzień"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="hidden sm:inline">Edytuj</span>
                      </button>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(day.type)}`}>
                        {day.type}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDayCompleted(idx);
                        }}
                        aria-label={`Oznacz trening ${day.dayName} jako ${day.completed ? 'nieukończony' : 'ukończony'}`}
                        className={`btn-complete-day w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                          day.completed
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'liquid-pill txt-muted hover:border-[var(--accent)] hover:text-white'
                        }`}
                      >
                        {day.completed ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Intensity Label */}
                  <div className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 mb-2 flex items-center justify-between">
                    <span className={intensity.color}>{intensity.label}</span>
                    <span className="text-slate-400 font-mono">
                      {isRest ? 'Regeneracja' : `~${day.durationMin} min`}
                    </span>
                  </div>

                  {/* Metrics Pills */}
                  {!isRest && (
                    <div className="grid grid-cols-2 gap-2 my-2 py-1.5 px-2.5 rounded-xl liquid-pill text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Timer className="w-3 h-3 text-emerald-400 shrink-0" />
                        <div>
                          <span className="txt-muted block text-[9px] uppercase">Tempo</span>
                          <span className="font-bold txt-main">{day.targetPace}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HeartPulse className="w-3 h-3 text-rose-400 shrink-0" />
                        <div>
                          <span className="txt-muted block text-[9px] uppercase">Strefa Tętna</span>
                          <span className="font-bold txt-main truncate">{day.hrZone}</span>
                        </div>
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

      {/* Goal Configuration Modal */}
      <GoalConfigurationModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        profile={profile}
        onSaveGoal={(updated) => {
          if (onSetMainGoal && updated.targetGoal) {
            onSetMainGoal(updated.targetGoal, updated.weeklyKm);
          }
        }}
        onGeneratePlanAI={onGeneratePlanAI}
        showToast={showToast}
      />

      {/* ACWR Explanation Modal */}
      <AcwrExplanationModal
        isOpen={isAcwrModalOpen}
        onClose={() => setIsAcwrModalOpen(false)}
        currentAcwr={calculatePeakPerformance(runs).acwr}
      />

      {/* Edit / Swap Workout Modal */}
      {editingDayIndex !== null && (
        <EditWorkoutModal
          isOpen={editingDayIndex !== null}
          onClose={() => setEditingDayIndex(null)}
          dayIndex={editingDayIndex}
          plan={safePlan}
          onSavePlan={(updatedPlan) => {
            localStorage.setItem('running_plan_v2', JSON.stringify(updatedPlan));
            localStorage.setItem('treda_plan', JSON.stringify(updatedPlan));
            if (onUpdatePlan) {
              onUpdatePlan(updatedPlan);
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Workout Details Modal */}
      {viewingWorkoutIndex !== null && (
        <PlanWorkoutDetailModal
          isOpen={viewingWorkoutIndex !== null}
          onClose={() => setViewingWorkoutIndex(null)}
          dayIndex={viewingWorkoutIndex}
          plan={safePlan}
          profile={profile}
          onToggleCompleted={() => {
            onToggleDayCompleted(viewingWorkoutIndex);
            showToast('Zaktualizowano status treningu!');
          }}
          onOpenEditModal={() => setEditingDayIndex(viewingWorkoutIndex)}
          onOpenLiveHud={onOpenLiveHud}
          onOpenAddRun={onOpenAddRun}
          getWorkoutVectorIcon={getWorkoutVectorIcon}
          getBadgeColor={getBadgeColor}
        />
      )}
    </div>
  );
};
