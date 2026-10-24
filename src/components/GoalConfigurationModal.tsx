import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  X,
  Trophy,
  Flag,
  Mountain,
  Activity,
  Footprints,
  Calendar,
  Heart,
  TrendingUp,
  Flame,
  Timer,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
  Target,
  Sliders
} from 'lucide-react';
import { RunnerProfile } from '../types.ts';
import { estimateVO2MaxFrom5k, time5kToSeconds, formatSecondsToTime } from '../utils/runningMath.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

interface GoalConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  onSaveGoal: (updatedGoal: {
    targetGoal: string;
    weeklyKm?: number;
    selectedDays?: string[];
    targetRaceDate?: string;
  }) => void;
  onGeneratePlanAI?: (customProfile?: RunnerProfile) => Promise<void> | void;
  showToast: (msg: string) => void;
}

export type MainCategory = 'road' | 'trail' | 'general' | 'get_started';

interface CategoryCard {
  id: MainCategory;
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  borderColor: string;
  athleteTag: string;
  icon: React.ReactNode;
  imageUrl: string;
}

const MAIN_CATEGORIES: CategoryCard[] = [
  {
    id: 'road',
    title: 'ROAD RACE',
    subtitle: 'Biegi uliczne • 5 km, 10 km, Półmaraton, Maraton',
    badge: 'Szosowy & Asfalt',
    bgGradient: 'from-[var(--accent)]/25 via-orange-950/40 to-slate-950',
    borderColor: 'border-[var(--accent)]/40 hover:border-[var(--accent)]',
    athleteTag: 'Eliud Kipchoge • Sub-3h & Życiówki',
    icon: <Flag className="w-5 h-5 accent-text" />,
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'trail',
    title: 'TRAIL RACE',
    subtitle: 'Góry, las, techniczny teren i przewyższenia',
    badge: 'Ultra & Teren',
    bgGradient: 'from-[var(--accent)]/25 via-teal-950/40 to-slate-950',
    borderColor: 'border-[var(--accent)]/40 hover:border-[var(--accent)]',
    athleteTag: 'Kilian Jornet • Skyrunning & Ultra',
    icon: <Mountain className="w-5 h-5 accent-text" />,
    imageUrl: 'https://images.unsplash.com/photo-1510074378966-f84d0857d402?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'general',
    title: 'GENERAL TRAINING',
    subtitle: 'Baza tlenowa Z2, zdrowie, kadencja i siła biegowa',
    badge: 'Baza & Forma',
    bgGradient: 'from-[var(--accent)]/25 via-sky-950/40 to-slate-950',
    borderColor: 'border-[var(--accent)]/40 hover:border-[var(--accent)]',
    athleteTag: 'Wszechstronny Rozwój • Cardio',
    icon: <Activity className="w-5 h-5 accent-text" />,
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'get_started',
    title: 'GET STARTED',
    subtitle: 'Bezpieczny debiut biegowy do 5 km bez zatrzymania',
    badge: 'Debiut od Zera',
    bgGradient: 'from-[var(--accent)]/25 via-purple-950/40 to-slate-950',
    borderColor: 'border-[var(--accent)]/40 hover:border-[var(--accent)]',
    athleteTag: 'Pierwsze Kroki • Motywacja',
    icon: <Footprints className="w-5 h-5 accent-text" />,
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
  },
];

interface SpecificGoal {
  id: string;
  category: 'wellbeing' | 'between' | 'races';
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  defaultDistanceKm: number;
  defaultTimeStr: string;
}

const SPECIFIC_GOALS: SpecificGoal[] = [
  {
    id: 'wellbeing_1',
    category: 'wellbeing',
    title: 'Poprawa Kondycji Ogólnej & Tętna Z2',
    description: 'Zbuduj mocną bazę tlenową, obniż tętno spoczynkowe i popraw zdrowie serca.',
    badge: 'Zdrowie',
    icon: <Heart className="w-4 h-4 text-rose-400" />,
    defaultDistanceKm: 5,
    defaultTimeStr: '00:30:00',
  },
  {
    id: 'wellbeing_2',
    category: 'wellbeing',
    title: 'Regularne Poranne Wybiegania',
    description: 'Wyrobienie zdrowego nawyku 3-4 treningów tygodniowo bez kontuzji.',
    badge: 'Nawyk',
    icon: <Calendar className="w-4 h-4 text-sky-400" />,
    defaultDistanceKm: 6,
    defaultTimeStr: '00:35:00',
  },
  {
    id: 'between_1',
    category: 'between',
    title: 'Budowanie Bazy Pod Sezon (Base Building)',
    description: 'Stopniowe zwiększanie kilometrażu bez przeciążania ścięgien i stawów.',
    badge: 'Baza',
    icon: <TrendingUp className="w-4 h-4 accent-text" />,
    defaultDistanceKm: 10,
    defaultTimeStr: '00:52:00',
  },
  {
    id: 'between_2',
    category: 'between',
    title: 'Poprawa Dynamiki & Kadencji (Speed Work)',
    description: 'Interwały, rytmy i przebieżki zwiększające ekonomię biegu.',
    badge: 'Szybkość',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    defaultDistanceKm: 5,
    defaultTimeStr: '00:24:00',
  },
  {
    id: 'races_1',
    category: 'races',
    title: 'Sub-20 / Sub-25 Minut na 5 km',
    description: 'Szybki i dynamiczny plan pod konkretną życiówkę na krótkim dystansie.',
    badge: '5K Race',
    icon: <Trophy className="w-4 h-4 text-amber-300" />,
    defaultDistanceKm: 5,
    defaultTimeStr: '00:22:00',
  },
  {
    id: 'races_2',
    category: 'races',
    title: 'Złamanie 1h 45m w Półmaratonie',
    description: 'Zaawansowana periodyzacja pod dystans 21.1 km z długimi wybieganiami.',
    badge: 'Półmaraton',
    icon: <Flag className="w-4 h-4 accent-text" />,
    defaultDistanceKm: 21.0975,
    defaultTimeStr: '01:44:00',
  },
  {
    id: 'races_3',
    category: 'races',
    title: 'Debiut lub Sub-4h w Maratonie',
    description: 'Profesjonalne ładowanie węglowodanów, długie tempo i wytrzymałość siłowa.',
    badge: 'Maraton',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    defaultDistanceKm: 42.195,
    defaultTimeStr: '03:55:00',
  },
];

export const GoalConfigurationModal: React.FC<GoalConfigurationModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveGoal,
  onGeneratePlanAI,
  showToast,
}) => {
  const [step, setStep] = useState<'discipline' | 'goal_list' | 'target_tuning'>('discipline');
  const [selectedDisciplines, setSelectedDisciplines] = useState<MainCategory[]>(['road']);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(['races_2']);
  const [distanceKm, setDistanceKm] = useState<number>(21.0975);
  const [targetTimeString, setTargetTimeString] = useState<string>('01:44:00');
  const [weeklyRunsCount, setWeeklyRunsCount] = useState<number>(4);
  const [targetTimeHorizon, setTargetTimeHorizon] = useState<string>('12 tygodni (Wiosna 2027)');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const currentVo2 = estimateVO2MaxFrom5k(profile.time5k);

  const handleToggleDiscipline = (discId: MainCategory) => {
    setSelectedDisciplines((prev) => {
      const isSelected = prev.includes(discId);
      const next = isSelected
        ? (prev.length > 1 ? prev.filter((id) => id !== discId) : prev)
        : [...prev, discId];
      showToast(`Zaznaczono kierunki (${next.length}). Kliknij „Dalej”, aby wybrać cele.`);
      return next;
    });
  };

  const handleToggleGoal = (goal: SpecificGoal) => {
    setSelectedGoalIds((prev) => {
      const isSelected = prev.includes(goal.id);
      const next = isSelected
        ? (prev.length > 1 ? prev.filter((id) => id !== goal.id) : prev)
        : [...prev, goal.id];
      showToast(`Zaznaczono celów: ${next.length}. Kliknij „Dalej”, aby dostroić parametry.`);
      return next;
    });
    setDistanceKm(goal.defaultDistanceKm);
    setTargetTimeString(goal.defaultTimeStr);
  };

  const handleApplyDistancePreset = (km: number, label: string) => {
    setDistanceKm(km);
    setTargetTimeString(getSuggestedTime(km));
    showToast(`Ustawiono dystans docelowy: ${label}`);
  };

  const getSuggestedTime = (km: number): string => {
    const base5kSec = time5kToSeconds(profile.time5k || '25:00');
    const predictedSec = base5kSec * Math.pow(km / 5, 1.06);
    return formatSecondsToTime(predictedSec);
  };

  const handleSaveAndGenerate = async () => {
    const selectedGoals = SPECIFIC_GOALS.filter((g) => selectedGoalIds.includes(g.id));
    const distLabel =
      Math.abs(distanceKm - 21.0975) < 0.1
        ? '21.1 km'
        : Math.abs(distanceKm - 42.195) < 0.1
        ? '42.2 km'
        : `${distanceKm} km`;
    const disciplinesLabel = selectedDisciplines.map((d) => d.toUpperCase()).join(' / ');
    const goalsSummary = selectedGoals.length > 0
      ? selectedGoals.map((g) => g.title).join(' + ')
      : 'Cel ogólny';
    const goalTitle = `[${disciplinesLabel}] ${goalsSummary} (${distLabel} • ${targetTimeString})`;
    const computedWeeklyKm = Math.round(
      Math.max(15, weeklyRunsCount * (distanceKm >= 42 ? 12 : distanceKm >= 21 ? 9 : 6.5))
    );

    setIsGenerating(true);
    try {
      onSaveGoal({
        targetGoal: goalTitle,
        weeklyKm: computedWeeklyKm,
      });

      if (onGeneratePlanAI) {
        const updatedProfile: RunnerProfile = {
          ...profile,
          targetGoal: goalTitle,
          weeklyKm: computedWeeklyKm,
        };
        await onGeneratePlanAI(updatedProfile);
      }

      showToast('Konfiguracja celów i plan AI zostały zaktualizowane!');
      onClose();
    } catch {
      showToast('Zapisano cel, ale wystąpił błąd w generowaniu planu AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  useLockBodyScroll(isOpen);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen animate-ios overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="liquid-glass w-full max-w-lg p-5 space-y-4 animate-ios-modal max-h-[90dvh] overflow-y-auto no-scrollbar border border-white/15 shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            {step !== 'discipline' && (
              <button
                type="button"
                onClick={() => setStep(step === 'target_tuning' ? 'goal_list' : 'discipline')}
                className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white transition-all active:scale-95"
                aria-label="Wróć"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 accent-text" />
                <span>Konfigurator Celu & Treningu</span>
              </span>
              <h2 className="text-base font-black txt-main tracking-tight">
                {step === 'discipline'
                  ? 'Wybierz Kierunek Treningu'
                  : step === 'goal_list'
                  ? 'Co jest Twoim głównym celem?'
                  : 'Dostrój Parametry & Wynik AI'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij konfigurator celu"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Progress Track */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className={`h-1.5 rounded-full transition-all ${step === 'discipline' ? 'accent-bg ring-2 accent-soft-border' : 'accent-bg'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 'goal_list' ? 'accent-bg ring-2 accent-soft-border' : step === 'target_tuning' ? 'accent-bg' : 'bg-white/10'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 'target_tuning' ? 'accent-bg ring-2 accent-soft-border' : 'bg-white/10'}`} />
        </div>

        {/* STEP 1: DISCIPLINE CARDS */}
        {/* STEP 1: DISCIPLINE CARDS */}
        {step === 'discipline' && (
          <div className="space-y-3 animate-ios">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full accent-soft-bg accent-text flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs txt-sub leading-snug">
                  Zaznacz jeden lub kilka kierunków treningowych (możesz wybrać więcej niż 1!). Po zaznaczeniu kliknij <strong>„Dalej”</strong> na dole.
                </p>
              </div>
              <span className="text-[10px] font-bold accent-text px-2 py-0.5 rounded-full liquid-pill shrink-0">
                Wybrano: {selectedDisciplines.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {MAIN_CATEGORIES.map((cat) => {
                const isSelected = selectedDisciplines.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleDiscipline(cat.id)}
                    className={`w-full group text-left relative overflow-hidden rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/60 shadow-xl scale-[1.01]'
                        : cat.borderColor
                    } bg-gradient-to-r ${cat.bgGradient}`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
                      style={{ backgroundImage: `url(${cat.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black tracking-widest uppercase text-white font-mono">
                            {cat.title}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-sans shadow-sm">
                              ✓ Wybrano
                            </span>
                          )}
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/90 backdrop-blur-md">
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium max-w-[270px] leading-tight">
                          {cat.subtitle}
                        </p>
                        <div className="text-[10px] accent-text font-bold tracking-tight pt-1 flex items-center gap-1.5">
                          <Activity className="w-3 h-3 accent-text" />
                          <span>{cat.athleteTag}</span>
                        </div>
                      </div>

                      <div className={`w-10 h-10 rounded-2xl liquid-pill flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-slate-950'
                          : 'border-white/20 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/20 text-white'
                      }`}>
                        {isSelected ? (
                          <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: CATEGORIZED GOALS (Multi-select, no auto-jump) */}
        {step === 'goal_list' && (
          <div className="space-y-3.5 animate-ios">
            <div className="p-3 rounded-2xl accent-soft-bg border border-[var(--accent)]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl accent-soft-bg accent-text flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black accent-text flex items-center gap-1">
                    <span>Zaznacz Cele (Wybrano: {selectedGoalIds.length})</span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Możesz wybrać kilka celów naraz. Po zaznaczeniu kliknij „Dalej” na dole.
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-black/40 accent-text border border-[var(--accent)]/30">
                VO2: ~{currentVo2}
              </span>
            </div>

            {/* Section: ZDROWIE & WELL-BEING */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-rose-400" />
                <span>Zdrowie & Dobre Samopoczucie (Well-Being)</span>
              </span>
              <div className="space-y-1.5">
                {SPECIFIC_GOALS.filter((g) => g.category === 'wellbeing').map((goal) => {
                  const isSelected = selectedGoalIds.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/20 shadow-md ring-1 ring-[var(--accent)]/40'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'accent-bg text-slate-950 font-black' : 'liquid-pill'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : goal.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold txt-main flex items-center gap-1.5">
                            <span>{goal.title}</span>
                            {isSelected && (
                              <span className="text-[9px] text-emerald-400 font-black">✓ Zaznaczony</span>
                            )}
                          </div>
                          <div className="text-[10px] txt-muted leading-tight">{goal.description}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full liquid-pill txt-sub shrink-0">
                        {goal.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: POMIĘDZY CELAMI */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span>Pomiędzy Celami (Ideal Between Goals)</span>
              </span>
              <div className="space-y-1.5">
                {SPECIFIC_GOALS.filter((g) => g.category === 'between').map((goal) => {
                  const isSelected = selectedGoalIds.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/20 shadow-md ring-1 ring-[var(--accent)]/40'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'accent-bg text-slate-950 font-black' : 'liquid-pill'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : goal.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold txt-main flex items-center gap-1.5">
                            <span>{goal.title}</span>
                            {isSelected && (
                              <span className="text-[9px] text-emerald-400 font-black">✓ Zaznaczony</span>
                            )}
                          </div>
                          <div className="text-[10px] txt-muted leading-tight">{goal.description}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full liquid-pill txt-sub shrink-0">
                        {goal.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: WYZWANIA & ZAWODY */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-300" />
                <span>Wyzwania & Zawody (Challenges & Races)</span>
              </span>
              <div className="space-y-1.5">
                {SPECIFIC_GOALS.filter((g) => g.category === 'races').map((goal) => {
                  const isSelected = selectedGoalIds.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/20 shadow-md ring-1 ring-[var(--accent)]/40'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'accent-bg text-slate-950 font-black' : 'liquid-pill'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : goal.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold txt-main flex items-center gap-1.5">
                            <span>{goal.title}</span>
                            {isSelected && (
                              <span className="text-[9px] text-emerald-400 font-black">✓ Zaznaczony</span>
                            )}
                          </div>
                          <div className="text-[10px] txt-muted leading-tight">{goal.description}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full liquid-pill txt-sub shrink-0">
                        {goal.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TUNING & PARAMETERS */}
        {step === 'target_tuning' && (
          <div className="space-y-3.5 text-xs animate-ios">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold txt-muted uppercase tracking-wider block">
                Dystans Docelowy:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { km: 5, label: '5 km' },
                  { km: 10, label: '10 km' },
                  { km: 21.0975, label: 'Półmaraton' },
                  { km: 42.195, label: 'Maraton' },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => handleApplyDistancePreset(d.km, d.label)}
                    className={`py-2 px-1 text-[11px] font-black rounded-xl border transition-all text-center ${
                      Math.abs(distanceKm - d.km) < 0.1
                        ? 'accent-bg text-slate-950 border-[var(--accent)] shadow-md'
                        : 'liquid-pill border-white/10 txt-sub hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 accent-text" />
                  <span>Prognoza Wyniku na Dystansie</span>
                </span>
                <span className="text-[10px] font-bold accent-text">
                  VO2max ~{currentVo2} ml/kg
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Docelowy czas (gg:mm:ss)</label>
                  <input
                    type="text"
                    value={targetTimeString}
                    onChange={(e) => setTargetTimeString(e.target.value)}
                    placeholder="00:48:00"
                    className="w-full liquid-pill px-3 py-2 text-sm font-black txt-main outline-none text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Dni w tygodniu</label>
                  <select
                    value={weeklyRunsCount}
                    onChange={(e) => setWeeklyRunsCount(parseInt(e.target.value, 10))}
                    className="w-full liquid-pill px-3 py-2 text-xs font-black txt-main outline-none"
                  >
                    <option value={3}>3 treningi / tydzień (Kompakt)</option>
                    <option value={4}>4 treningi / tydzień (Optymalny)</option>
                    <option value={5}>5 treningów / tydzień (Zaawansowany)</option>
                    <option value={6}>6 treningów / tydzień (Wyczyn)</option>
                  </select>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.04] text-[10px] txt-sub flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Sugerowany czas wg Riegela z Twojego 5K ({profile.time5k}):{' '}
                  <strong className="text-white">{getSuggestedTime(distanceKm)}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold txt-muted uppercase tracking-wider block">
                Horyzont czasowy & Okres Przygotowań:
              </label>
              <select
                value={targetTimeHorizon}
                onChange={(e) => setTargetTimeHorizon(e.target.value)}
                className="w-full liquid-pill px-3 py-2.5 text-xs font-bold txt-main outline-none"
              >
                <option value="8 tygodni (Krótki blok startowy)">8 tygodni (Krótki blok startowy)</option>
                <option value="12 tygodni (Wiosna 2027)">12 tygodni (Wiosna 2027) • Zalecany</option>
                <option value="16 tygodni (Pełna periodyzacja)">16 tygodni (Pełna periodyzacja pod Półmaraton/Maraton)</option>
                <option value="24 tygodnie (Jesień 2027)">24 tygodnie (Jesień 2027)</option>
              </select>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-2 flex items-center gap-2 border-t border-white/10">
          {step !== 'discipline' && (
            <button
              type="button"
              onClick={() => setStep(step === 'target_tuning' ? 'goal_list' : 'discipline')}
              className="py-2.5 px-4 rounded-xl liquid-pill font-bold text-xs txt-sub hover:text-white transition-all"
            >
              Wstecz
            </button>
          )}

          {step !== 'target_tuning' ? (
            <button
              type="button"
              onClick={() => setStep(step === 'discipline' ? 'goal_list' : 'target_tuning')}
              className="flex-1 py-2.5 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>Dalej</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleSaveAndGenerate}
              className="flex-1 py-3 rounded-xl accent-btn-gradient hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Dostosowywanie mikrocyklu AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Zapisz & Zaktualizuj Plan AI</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
