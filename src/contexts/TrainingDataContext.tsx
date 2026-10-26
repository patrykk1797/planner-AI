import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RunnerProfile,
  TrainingDay,
  RunLog,
  Shoe,
  RaceSlot,
  WeatherData,
  ChatMessage,
  ChatOcrAttachmentPayload,
  PersonalBest,
  UserAccount,
  AccentColor,
} from '../types.ts';
import {
  PATRYK_PRESET,
  DEFAULT_PLAN,
  DEFAULT_RUNS,
  DEFAULT_SHOES,
  DEFAULT_RACES_2027,
} from '../utils/defaults.ts';
import { checkAndTriggerNotifications, DEFAULT_NOTIFICATION_SETTINGS } from '../utils/notificationEngine.ts';
import { calculateDynamicVo2Max } from '../utils/runningMath.ts';
import {
  checkAndUpdatePersonalBests,
  recalculateAllPersonalBests,
  calculateRunRewards,
} from '../utils/physiologicalEngine.ts';
import { recordAiPlanGenerated } from '../utils/analyticsStorage.ts';
import { SUPPORTED_INTEGRATION_APPS } from '../components/modals/AppIntegrationModal.tsx';
import { PlanRecalibrationData } from '../components/modals/PlanRecalibrationModal.tsx';
import { computePhysiologicalPlanAdaptation } from '../utils/physiologicalPlanAdaptation.ts';
import {
  loadStoredAccounts,
  saveStoredAccounts,
  setActiveAccountId,
  loadAccountData,
  saveAccountData,
  deleteAccountData,
} from '../utils/accountStorage.ts';
import { safeJsonParse } from '../utils/geminiUtils.ts';
import { safeLocalStorageSet, sanitizeRunForStorage } from '../utils/storage.ts';
import { auth, getAuthHeaders } from '../lib/firebase.ts';
import { signOut, deleteUser } from 'firebase/auth';
import { useAuth } from './AuthContext.tsx';
import { useUI } from './UIContext.tsx';
import { useWeather } from '../hooks/useWeather.ts';
import { useFirebaseSync } from '../hooks/useFirebaseSync.ts';
import { useTrainingCalculator } from '../hooks/useTrainingCalculator.ts';

export const safePersist = (key: string, data: any) => {
  try {
    const val = typeof data === 'string' ? data : JSON.stringify(sanitizeRunForStorage(data));
    safeLocalStorageSet(key, val);
  } catch (err) {
    console.warn(`[TrainingDataContext] Failed to persist ${key}:`, err);
  }
};

export const INITIAL_PERSONAL_BESTS: PersonalBest[] = [
  { distanceId: '1k', distanceName: '1 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '1mile', distanceName: '1 mila (1.61 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '3k', distanceName: '3 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '5k', distanceName: '5 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '10k', distanceName: '10 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'half', distanceName: 'Półmaraton (21.1 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'marathon', distanceName: 'Maraton (42.2 km)', time: '--:--', pace: '- /km', date: '-' },
];

export interface TrainingDataContextValue {
  hasUserProfile: boolean;
  profile: RunnerProfile;
  setProfile: React.Dispatch<React.SetStateAction<RunnerProfile>>;
  plan: TrainingDay[];
  setPlan: React.Dispatch<React.SetStateAction<TrainingDay[]>>;
  weeklyFocus: string;
  setWeeklyFocus: React.Dispatch<React.SetStateAction<string>>;
  planSummary: string;
  setPlanSummary: React.Dispatch<React.SetStateAction<string>>;
  races: RaceSlot[];
  setRaces: React.Dispatch<React.SetStateAction<RaceSlot[]>>;
  runs: RunLog[];
  setRuns: React.Dispatch<React.SetStateAction<RunLog[]>>;
  lastRun: RunLog | null;
  shoes: Shoe[];
  setShoes: React.Dispatch<React.SetStateAction<Shoe[]>>;
  personalBests: PersonalBest[];
  setPersonalBests: React.Dispatch<React.SetStateAction<PersonalBest[]>>;
  weather: WeatherData | null;
  isWeatherLoading: boolean;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  isPlanGenerating: boolean;
  isSubmittingRun: boolean;

  // Calculator helpers
  runnerPaceMinKm: string;
  recalibratePlanFromSimulator: (time5k: string, currentPlan: TrainingDay[]) => TrainingDay[];

  // Core handlers
  handleUpdateProfile: (up: Partial<RunnerProfile>) => void;
  handleRefreshGps: () => void;
  handleEarnBamboos: (amount: number, reason: string) => void;
  handleGeneratePlanAI: (customProfile?: RunnerProfile) => Promise<void>;
  handleClearDataNewUser: () => void;
  handleLoadDemoProfile: () => void;
  registerNewWorkoutInSystem: (
    rawRun: Omit<RunLog, 'id' | 'coachFeedback'>,
    customCoachFeedback?: string
  ) => void;
  handleSubmitRun: (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => Promise<void>;
  handleDeleteRun: (runId: string) => void;
  handleUpdateRunShoe: (runId: string, newShoeName: string) => void;
  handleUpdateRunDate: (runId: string, newDate: string) => void;
  handleImportAllData: (data: any) => void;
  handleSendMessage: (text: string, attachment?: ChatOcrAttachmentPayload) => Promise<void>;
  handleToggleDayCompleted: (index: number) => void;
  handleOpenIntegrationsHub: (appId?: string) => void;
  handleUpdatePlan: (updatedPlan: TrainingDay[]) => void;
  handleSetMainGoal: (goal: string, targetTimeOrWeeklyKm?: string | number) => void;
  handleAddShoe: (newShoe: Shoe) => void;
  handleUpdateShoe: (updatedShoe: Shoe) => void;
  handleDeleteShoe: (id: string) => void;
  handleSelectMainShoe: (id: string) => void;
  handleUpdatePersonalBest: (pb: PersonalBest) => void;

  // Auth / Account lifecycle handlers
  handleLoginSuccess: (account: UserAccount, isNewRegistration?: boolean) => void;
  handleLogout: () => void;
  handleDeleteAccount: () => Promise<void>;

  // Admin handlers
  handleToggleUserPro: (userId: string) => void;
  handleAddUserBamboos: (userId: string, amount: number) => void;
  handleResetUserPlan: (userId: string) => void;
  handleAdminDeleteUser: (userId: string) => void;
  handleAddCustomRace: (newRace: RaceSlot) => void;
  handleDeleteCustomRace: (raceId: string) => void;
  handleAddCustomShoe: (newShoe: Shoe) => void;
  handleDeleteCustomShoe: (shoeId: string) => void;
}

const TrainingDataContext = createContext<TrainingDataContextValue | null>(null);

export const TrainingDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accounts, setAccounts, currentUser, setCurrentUser, setIsGuestDemo, deviceIp } = useAuth();
  const {
    setTheme,
    setAccent,
    showToast,
    setIsOnboardingOpen,
    setIsAddRunOpen,
    selectedRunForDetail,
    setSelectedRunForDetail,
    setIsRunDetailOpen,
    setMobileDeviceType,
    setGlobalIntegrationApp,
    setIsPlanRecalibrationOpen,
    setPlanRecalibrationData,
    setLastAddedRunForRecalibration,
  } = useUI();

  const [hasUserProfile, setHasUserProfile] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('treda_user_profile') || localStorage.getItem('runner_profile_v2'));
  });

  // Personal Bests
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>(() => {
    const saved = localStorage.getItem('treda_pbs') || localStorage.getItem('running_pbs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return hasUserProfile ? INITIAL_PERSONAL_BESTS : [];
  });

  // Runner profile
  const [profile, setProfile] = useState<RunnerProfile>(() => {
    const saved = localStorage.getItem('treda_user_profile') || localStorage.getItem('runner_profile_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          accentColor: parsed.accentColor || 'orange',
          theme: parsed.theme || 'dark',
        };
      } catch {}
    }
    return {
      name: 'Nowy Biegacz',
      birthdate: '14.05.1995',
      gender: 'M',
      weight: 70,
      targetWeight: 68,
      height: 178,
      city: 'Warszawa',
      weeklyKm: 0,
      time5k: '25:00',
      hrMax: 185,
      rhr: 60,
      vo2max: 42,
      targetGoal: 'Budowa bazy tlenowej',
      selectedDays: ['Wt', 'Czw', 'Sob'],
      bamboos: 50,
      levelXp: 100,
      activePandaGear: { gear: 'Czapeczka Biegowa', skin: 'Klasyczna Panda', bg: 'Park Miejski' },
      coachTone: 'naukowy',
      accentColor: 'orange',
      theme: 'dark',
    };
  });

  // 7-day training plan
  const [plan, setPlan] = useState<TrainingDay[]>(() => {
    const saved = localStorage.getItem('treda_plan') || localStorage.getItem('running_plan_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return hasUserProfile ? DEFAULT_PLAN : [];
  });

  const [weeklyFocus, setWeeklyFocus] = useState<string>(() => {
    return localStorage.getItem('running_weekly_focus_v2') || 'Budowa bazy tlenowej pod twój cel';
  });
  const [planSummary, setPlanSummary] = useState<string>(() => {
    return (
      localStorage.getItem('running_plan_summary_v2') ||
      'Plan zoptymalizowany pod wybrane dni i strefę tlenową Z2.'
    );
  });

  // Races 2027 Calendar
  const [races, setRaces] = useState<RaceSlot[]>(() => {
    const saved = localStorage.getItem('running_races_2027');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_RACES_2027;
  });

  // Runs history
  const [runs, setRuns] = useState<RunLog[]>(() => {
    const saved = localStorage.getItem('treda_workouts') || localStorage.getItem('running_runs_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return hasUserProfile ? DEFAULT_RUNS : [];
  });

  // Shoes rotation
  const [shoes, setShoes] = useState<Shoe[]>(() => {
    const saved = localStorage.getItem('treda_shoes') || localStorage.getItem('running_shoes_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return hasUserProfile ? DEFAULT_SHOES : [];
  });

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'model',
      text: 'Cześć! Jestem Twoim osobistym Fizjologiem AI. Znam Twoją metrykę, VO2max, historię biegów i buty w szafie. Możesz zadać mi pytanie lub przesłać przez moduł OCR zdjęcie planu treningowego albo wyników badań krwi (morfologia, ferrytyna, elektrolity), a przygotuję ich szczegółową analizę tekstową!',
      timestamp: '14:48',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState<boolean>(false);
  const [isSubmittingRun, setIsSubmittingRun] = useState<boolean>(false);

  // Weather Hook
  const handleUpdateCityFromGps = useCallback((newCity: string) => {
    setProfile((prev) => (prev.city === newCity ? prev : { ...prev, city: newCity }));
  }, []);

  const { weather, isWeatherLoading, refreshGpsWeather } = useWeather({
    city: profile.city,
    onUpdateCityFromGps: handleUpdateCityFromGps,
    showToast,
  });

  // Training Calculator Hook
  const { runnerPaceMinKm, recalibratePlanFromSimulator } = useTrainingCalculator(
    profile,
    runs,
    plan,
    personalBests
  );

  // Firebase & Cloud SQL Sync Hook
  const handleRestoreCloudData = useCallback(
    (cloud: {
      profile?: RunnerProfile;
      shoes?: Shoe[];
      plan?: TrainingDay[];
      races?: RaceSlot[];
      runs?: RunLog[];
      personalBests?: PersonalBest[];
      weeklyFocus?: string;
      planSummary?: string;
    }) => {
      if (cloud.profile) {
        setProfile(cloud.profile);
        if (Array.isArray(cloud.shoes)) setShoes(cloud.shoes);
        if (Array.isArray(cloud.plan)) setPlan(cloud.plan);
        if (Array.isArray(cloud.races)) setRaces(cloud.races);
      }
      if (Array.isArray(cloud.runs) && cloud.runs.length > 0) setRuns(cloud.runs);
      if (Array.isArray(cloud.personalBests) && cloud.personalBests.length > 0)
        setPersonalBests(cloud.personalBests);
      if (cloud.weeklyFocus) setWeeklyFocus(cloud.weeklyFocus);
      if (cloud.planSummary) setPlanSummary(cloud.planSummary);
    },
    []
  );

  const handleSyncAccent = useCallback(
    (accentColor: AccentColor) => {
      setAccent(accentColor);
      document.documentElement.setAttribute('data-accent', accentColor);
    },
    [setAccent]
  );

  useFirebaseSync({
    currentUser,
    profile,
    plan,
    runs,
    shoes,
    personalBests,
    races,
    weeklyFocus,
    planSummary,
    onRestoreCloudData: handleRestoreCloudData,
    onSyncAccent: handleSyncAccent,
  });

  // Periodic background evaluation for Scheduled Notifications (Workout reminders, Weather, Recovery)
  useEffect(() => {
    const notifSettings = profile.notifications || DEFAULT_NOTIFICATION_SETTINGS;
    if (!notifSettings.enabled) return;

    const interval = setInterval(() => {
      const { updatedSettings, firedCount } = checkAndTriggerNotifications(
        notifSettings,
        profile,
        plan,
        weather || undefined,
        showToast
      );
      if (firedCount > 0) {
        setProfile((prev) => ({ ...prev, notifications: updatedSettings }));
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [profile, plan, weather, showToast]);

  // Persist state safely to localStorage
  useEffect(() => {
    safePersist('runner_profile_v2', profile);
    safePersist('treda_user_profile', profile);
  }, [profile]);

  useEffect(() => {
    safePersist('running_plan_v2', plan);
    safePersist('treda_plan', plan);
  }, [plan]);

  useEffect(() => {
    safeLocalStorageSet('running_weekly_focus_v2', weeklyFocus);
  }, [weeklyFocus]);

  useEffect(() => {
    safeLocalStorageSet('running_plan_summary_v2', planSummary);
  }, [planSummary]);

  useEffect(() => {
    safePersist('running_races_2027', races);
  }, [races]);

  useEffect(() => {
    safePersist('running_runs_v2', runs);
    safePersist('treda_workouts', runs);
  }, [runs]);

  useEffect(() => {
    safePersist('running_shoes_v2', shoes);
    safePersist('treda_shoes', shoes);
  }, [shoes]);

  useEffect(() => {
    safePersist('treda_pbs', personalBests);
    safePersist('running_pbs_v1', personalBests);
  }, [personalBests]);

  const handleUpdateProfile = useCallback(
    (up: Partial<RunnerProfile>) => {
      if (up.accentColor) {
        setAccent(up.accentColor);
        document.documentElement.setAttribute('data-accent', up.accentColor);
        localStorage.setItem('running_accent', up.accentColor);
      }
      if (up.theme) {
        setTheme(up.theme);
        document.documentElement.setAttribute('data-theme', up.theme);
        localStorage.setItem('running_theme', up.theme);
      }
      setProfile((p) => ({ ...p, ...up }));
    },
    [setAccent, setTheme]
  );

  const handleOpenIntegrationsHub = useCallback(
    (appId?: string) => {
      const targetId = appId || 'strava';
      const found =
        profile.connectedApps?.find((a) => a.id === targetId) ||
        SUPPORTED_INTEGRATION_APPS.find((a) => a.id === targetId) ||
        SUPPORTED_INTEGRATION_APPS[0];
      setGlobalIntegrationApp(found);
    },
    [profile.connectedApps, setGlobalIntegrationApp]
  );

  const handleEarnBamboos = useCallback((amount: number, _reason: string) => {
    setProfile((prev) => ({
      ...prev,
      bamboos: prev.bamboos + amount,
      levelXp: prev.levelXp + amount * 3,
    }));
  }, []);

  // Generate 7-day plan AI
  const handleGeneratePlanAI = useCallback(
    async (customProfile?: RunnerProfile) => {
      setIsPlanGenerating(true);
      const targetProfile = customProfile || profile;

      try {
        const res = await fetch('/api/gemini/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: targetProfile,
            shoes,
          }),
        });

        const data = await res.json();
        const planData = safeJsonParse(data);
        if (planData && planData.days && Array.isArray(planData.days)) {
          setPlan(planData.days);
          localStorage.setItem('running_plan_v2', JSON.stringify(planData.days));
          localStorage.setItem('treda_plan', JSON.stringify(planData.days));
          if (planData.weeklyFocus) {
            setWeeklyFocus(planData.weeklyFocus);
            localStorage.setItem('running_weekly_focus_v2', planData.weeklyFocus);
          }
          if (planData.summary) {
            setPlanSummary(planData.summary);
            localStorage.setItem('running_plan_summary_v2', planData.summary);
          }

          const todayIso = new Date().toISOString().split('T')[0];
          setProfile((prev) => ({
            ...prev,
            planGeneratedAt: todayIso,
          }));

          recordAiPlanGenerated();
          handleEarnBamboos(20, 'Wygenerowanie planu AI');
          showToast('Gemini 3 Flash wygenerował Twój plan! +20 🎋');
        }
      } catch (err) {
        console.error('Generate plan error:', err);
        showToast('Wystąpił błąd generowania planu.');
      } finally {
        setIsPlanGenerating(false);
      }
    },
    [profile, shoes, handleEarnBamboos, showToast]
  );

  const handleClearDataNewUser = useCallback(() => {
    localStorage.removeItem('treda_user_profile');
    localStorage.removeItem('runner_profile_v2');
    localStorage.removeItem('treda_workouts');
    localStorage.removeItem('running_runs_v2');
    localStorage.removeItem('treda_shoes');
    localStorage.removeItem('running_shoes_v2');
    localStorage.removeItem('treda_pbs');
    localStorage.removeItem('running_pbs_v1');
    localStorage.removeItem('treda_plan');
    localStorage.removeItem('running_plan_v2');

    const todayIso = new Date().toISOString().split('T')[0];
    setHasUserProfile(false);
    setRuns([]);
    setShoes([]);
    setPlan([]);
    setPersonalBests([]);
    setProfile({
      name: '',
      birthdate: '',
      gender: 'M',
      weight: 70,
      targetWeight: 68,
      height: 175,
      city: 'Warszawa',
      weeklyKm: 0,
      time5k: '',
      hrMax: 185,
      rhr: 60,
      vo2max: 0,
      targetGoal: 'Budowa bazy tlenowej',
      selectedDays: ['Pn', 'Śr', 'Pt'],
      bamboos: 0,
      levelXp: 0,
      activePandaGear: { gear: 'Czapeczka Biegowa', skin: 'Klasyczna Panda', bg: 'Park Miejski' },
      coachTone: 'naukowy',
      accentColor: 'orange',
      theme: 'dark',
      planGeneratedAt: todayIso,
      createdAt: todayIso,
    });

    setIsOnboardingOpen(true);
    showToast('Wyczyszczono dane. Skonfiguruj nowy profil w kreatorze! 🏃');
  }, [setIsOnboardingOpen, showToast]);

  const handleLoadDemoProfile = useCallback(() => {
    const demoProfile: RunnerProfile = {
      ...PATRYK_PRESET,
      accentColor: 'orange',
      theme: 'dark',
    };
    setProfile(demoProfile);
    setRuns(DEFAULT_RUNS);
    setShoes(DEFAULT_SHOES);
    setPlan(DEFAULT_PLAN);
    setPersonalBests(INITIAL_PERSONAL_BESTS);
    setRaces(DEFAULT_RACES_2027);
    setHasUserProfile(true);

    safePersist('treda_user_profile', demoProfile);
    safePersist('runner_profile_v2', demoProfile);
    safePersist('treda_workouts', DEFAULT_RUNS);
    safePersist('running_runs_v2', DEFAULT_RUNS);
    safePersist('treda_shoes', DEFAULT_SHOES);
    safePersist('running_shoes_v2', DEFAULT_SHOES);
    safePersist('treda_plan', DEFAULT_PLAN);
    safePersist('running_plan_v2', DEFAULT_PLAN);
    safePersist('treda_pbs', INITIAL_PERSONAL_BESTS);
    safePersist('running_pbs_v1', INITIAL_PERSONAL_BESTS);

    showToast('Załadowano profil testowy (Patryk ze Zgierza) z pełnymi danymi! 👟');
  }, [showToast]);

  // Centralized Workout Registration Engine
  const registerNewWorkoutInSystem = useCallback(
    (rawRun: Omit<RunLog, 'id' | 'coachFeedback'>, customCoachFeedback?: string) => {
      const runId = `run-${Date.now()}`;
      const newRun: RunLog = {
        ...rawRun,
        id: runId,
        coachFeedback: customCoachFeedback || 'Przyzwoity trening! Monitoruj kadencję i tętno spoczynkowe.',
      };

      const reward = calculateRunRewards(newRun);

      const nextRuns = [newRun, ...runs];
      setRuns(nextRuns);
      safePersist('treda_workouts', nextRuns);
      safePersist('running_runs_v2', nextRuns);

      let nextShoes = shoes;
      if (rawRun.shoeName) {
        nextShoes = shoes.map((s) => {
          if (s.name === rawRun.shoeName) {
            return { ...s, mileageKm: +(s.mileageKm + rawRun.distanceKm).toFixed(2) };
          }
          return s;
        });
        setShoes(nextShoes);
        safePersist('treda_shoes', nextShoes);
        safePersist('running_shoes_v2', nextShoes);
      } else if (profile.selectedShoeId) {
        nextShoes = shoes.map((s) => {
          if (s.id === profile.selectedShoeId) {
            return { ...s, mileageKm: +(s.mileageKm + rawRun.distanceKm).toFixed(2) };
          }
          return s;
        });
        setShoes(nextShoes);
        safePersist('treda_shoes', nextShoes);
        safePersist('running_shoes_v2', nextShoes);
      }

      const pbResult = checkAndUpdatePersonalBests(newRun, personalBests);
      let totalBamboosEarned = reward.bamboos;
      let pbToastText = '';

      if (pbResult.beatenDistances.length > 0) {
        setPersonalBests(pbResult.updatedPbs);
        safePersist('treda_pbs', pbResult.updatedPbs);
        safePersist('running_pbs_v1', pbResult.updatedPbs);
        totalBamboosEarned += 100;
        pbToastText = ` 🏆 POBITO REKORD PB (${pbResult.beatenDistances.join(', ')})! +100 🎋`;
      }

      const newVo2 = calculateDynamicVo2Max(profile, nextRuns);
      const nextProfile: RunnerProfile = {
        ...profile,
        vo2max: rawRun.vo2MaxEst ? Number(rawRun.vo2MaxEst) : newVo2,
        bamboos: profile.bamboos + totalBamboosEarned,
        levelXp: profile.levelXp + reward.xp,
      };
      setProfile(nextProfile);
      safePersist('treda_user_profile', nextProfile);
      safePersist('runner_profile_v2', nextProfile);

      const runDate = new Date(rawRun.date);
      const dayIndex = isNaN(runDate.getTime()) ? new Date().getDay() : runDate.getDay();
      const dayShorts = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
      const targetDayShort = dayShorts[dayIndex];

      let dayMatched = false;
      let nextPlan = plan.map((day) => {
        if (day.dayShort === targetDayShort && !dayMatched) {
          dayMatched = true;
          return { ...day, completed: true, completedKm: rawRun.distanceKm };
        }
        return day;
      });

      if (!dayMatched) {
        let fallbackMatched = false;
        nextPlan = plan.map((day) => {
          if (!fallbackMatched && !day.completed && day.distanceKm > 0) {
            fallbackMatched = true;
            return { ...day, completed: true, completedKm: rawRun.distanceKm };
          }
          return day;
        });
      }

      setPlan(nextPlan);
      safePersist('treda_plan', nextPlan);
      safePersist('running_plan_v2', nextPlan);

      if (currentUser) {
        saveAccountData(currentUser.id, {
          profile: nextProfile,
          runs: nextRuns,
          shoes: nextShoes,
          personalBests: pbResult.updatedPbs,
          plan: nextPlan,
        });
        getAuthHeaders({ 'Content-Type': 'application/json' })
          .then((headers) => {
            if (!headers) return;
            return fetch('/api/db/runs', {
              method: 'POST',
              headers,
              body: JSON.stringify(newRun),
            });
          })
          .catch(() => {});
      }

      fetch('/api/gemini/analyze-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout: newRun, profile: nextProfile, shoes: nextShoes }),
      })
        .then((res) => res.json())
        .then((data) => {
          const analysisData = safeJsonParse(data);
          if (analysisData && analysisData.analysis) {
            setRuns((prev) => {
              const updatedRunsWithAi = prev.map((r) =>
                r.id === runId ? { ...r, analysis: analysisData.analysis } : r
              );
              safePersist('treda_workouts', updatedRunsWithAi);
              safePersist('running_runs_v2', updatedRunsWithAi);
              if (currentUser) {
                saveAccountData(currentUser.id, { runs: updatedRunsWithAi });
              }
              return updatedRunsWithAi;
            });
          }
        })
        .catch((e) => console.warn('Async AI workout analysis error:', e));

      showToast(`Bieg zapisany! +${totalBamboosEarned} 🎋${pbToastText}`);
    },
    [shoes, runs, personalBests, profile, plan, currentUser, showToast]
  );

  // Add run with Zero-Click Coaching & Dynamic Plan Recalibration
  const handleSubmitRun = useCallback(
    async (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => {
      setIsSubmittingRun(true);
      try {
        let coachFeedback = 'Świetny trening! Pamiętaj o nawodnieniu i prawidłowej regeneracji stóp.';
        let recalibration: PlanRecalibrationData | null = null;
        try {
          const res = await fetch('/api/gemini/zero-click-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newRun: runData,
              profile,
              currentPlan: plan,
            }),
          });
          const coachResultRaw = await res.json();
          const coachResult = safeJsonParse(coachResultRaw);
          if (coachResult && (coachResult.coachFeedback || coachResult.updatedPlan)) {
            recalibration = coachResult;
            if (coachResult.coachFeedback) coachFeedback = coachResult.coachFeedback;
          }
        } catch (e) {
          console.warn('Zero-click coach network fallback:', e);
        }

        if (!recalibration || !recalibration.updatedPlan) {
          recalibration = computePhysiologicalPlanAdaptation(plan, runData, profile);
          if (recalibration.coachFeedback) coachFeedback = recalibration.coachFeedback;
        }

        registerNewWorkoutInSystem(runData, coachFeedback);
        setIsAddRunOpen(false);

        if (recalibration) {
          if (Array.isArray(recalibration.updatedPlan) && recalibration.updatedPlan.length > 0) {
            setPlan(recalibration.updatedPlan);
            safePersist('treda_plan', recalibration.updatedPlan);
            safePersist('running_plan_v2', recalibration.updatedPlan);
            if (currentUser) {
              saveAccountData(currentUser.id, { plan: recalibration.updatedPlan });
            }
          }
          setPlanRecalibrationData(recalibration);
          setLastAddedRunForRecalibration(runData);
          setIsPlanRecalibrationOpen(true);
        }
      } catch (err) {
        console.error(err);
        const fallbackRecalibration = computePhysiologicalPlanAdaptation(plan, runData, profile);
        registerNewWorkoutInSystem(runData, fallbackRecalibration.coachFeedback);
        if (Array.isArray(fallbackRecalibration.updatedPlan) && fallbackRecalibration.updatedPlan.length > 0) {
          setPlan(fallbackRecalibration.updatedPlan);
          safePersist('treda_plan', fallbackRecalibration.updatedPlan);
          safePersist('running_plan_v2', fallbackRecalibration.updatedPlan);
          if (currentUser) {
            saveAccountData(currentUser.id, { plan: fallbackRecalibration.updatedPlan });
          }
        }
        setPlanRecalibrationData(fallbackRecalibration);
        setLastAddedRunForRecalibration(runData);
        setIsPlanRecalibrationOpen(true);
        setIsAddRunOpen(false);
      } finally {
        setIsSubmittingRun(false);
      }
    },
    [
      profile,
      plan,
      currentUser,
      registerNewWorkoutInSystem,
      setIsAddRunOpen,
      setPlanRecalibrationData,
      setLastAddedRunForRecalibration,
      setIsPlanRecalibrationOpen,
    ]
  );

  const handleDeleteRun = useCallback(
    (runId: string) => {
      const targetRun = runs.find((r) => r.id === runId);
      if (!targetRun) return;

      const nextRuns = runs.filter((r) => r.id !== runId);
      setRuns(nextRuns);
      safePersist('running_runs_v2', nextRuns);
      safePersist('treda_workouts', nextRuns);

      if (targetRun.date) {
        const remainingRunsOnDate = nextRuns.filter((r) => r.date === targetRun.date);
        if (remainingRunsOnDate.length === 0) {
          const runDate = new Date(targetRun.date);
          const dayIndex = isNaN(runDate.getTime()) ? new Date().getDay() : runDate.getDay();
          const dayShorts = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
          const targetDayShort = dayShorts[dayIndex];

          let reverted = false;
          const nextPlan = plan.map((day) => {
            if (day.dayShort === targetDayShort && !reverted) {
              reverted = true;
              return { ...day, completed: false, completedKm: 0 };
            }
            return day;
          });
          setPlan(nextPlan);
          safePersist('treda_plan', nextPlan);
          safePersist('running_plan_v2', nextPlan);
        }
      }

      const nextShoes = shoes.map((s) => {
        if (s.name === targetRun.shoeName) {
          return {
            ...s,
            mileageKm: Math.max(s.initialMileageKm || 0, +(s.mileageKm - targetRun.distanceKm).toFixed(2)),
          };
        }
        return s;
      });
      setShoes(nextShoes);
      safePersist('running_shoes_v2', nextShoes);
      safePersist('treda_shoes', nextShoes);

      const nextPbs = recalculateAllPersonalBests(nextRuns, personalBests);
      setPersonalBests(nextPbs);
      safePersist('treda_pbs', nextPbs);
      safePersist('running_pbs_v1', nextPbs);

      const newVo2 = calculateDynamicVo2Max(profile, nextRuns);
      const nextProfile = { ...profile, vo2max: newVo2 };
      setProfile(nextProfile);
      safePersist('runner_profile_v2', nextProfile);
      safePersist('treda_user_profile', nextProfile);

      if (currentUser) {
        saveAccountData(currentUser.id, {
          runs: nextRuns,
          shoes: nextShoes,
          personalBests: nextPbs,
          profile: nextProfile,
        });

        getAuthHeaders()
          .then((headers) => {
            if (!headers) return;
            return fetch(`/api/db/runs/${encodeURIComponent(runId)}`, {
              method: 'DELETE',
              headers,
            });
          })
          .catch((err) => console.warn('Cloud SQL delete run warning:', err));
      }

      const hasRemainingRunOnDate = nextRuns.some((r) => r.date === targetRun.date);
      if (!hasRemainingRunOnDate) {
        const runDate = new Date(targetRun.date);
        const dayIndex = isNaN(runDate.getTime()) ? new Date().getDay() : runDate.getDay();
        const dayShorts = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
        const targetDayShort = dayShorts[dayIndex];

        const revertedPlan = plan.map((day) => {
          if (day.dayShort === targetDayShort) {
            return { ...day, completed: false, completedKm: undefined };
          }
          return day;
        });
        setPlan(revertedPlan);
        safePersist('treda_plan', revertedPlan);
        safePersist('running_plan_v2', revertedPlan);
      }

      if (selectedRunForDetail && selectedRunForDetail.id === runId) {
        setSelectedRunForDetail(null);
        setIsRunDetailOpen(false);
      }

      showToast('Usunięto trening z dziennika, przeliczono rekordy PB i szafę obuwniczą 🗑️');
    },
    [
      runs,
      shoes,
      personalBests,
      profile,
      plan,
      currentUser,
      selectedRunForDetail,
      setSelectedRunForDetail,
      setIsRunDetailOpen,
      showToast,
    ]
  );

  const handleUpdateRunShoe = useCallback(
    (runId: string, newShoeName: string) => {
      const targetRun = runs.find((r) => r.id === runId);
      if (!targetRun) return;
      const oldShoeName = targetRun.shoeName;
      if (oldShoeName === newShoeName) return;

      const dist = targetRun.distanceKm;

      const updatedRuns = runs.map((r) => (r.id === runId ? { ...r, shoeName: newShoeName } : r));
      setRuns(updatedRuns);

      const updatedShoes = shoes.map((s) => {
        if (s.name === oldShoeName) {
          return { ...s, mileageKm: Math.max(0, +(s.mileageKm - dist).toFixed(2)) };
        }
        if (s.name === newShoeName) {
          return { ...s, mileageKm: +(s.mileageKm + dist).toFixed(2) };
        }
        return s;
      });
      setShoes(updatedShoes);

      setSelectedRunForDetail((prev) => (prev && prev.id === runId ? { ...prev, shoeName: newShoeName } : prev));

      if (currentUser) {
        saveAccountData(currentUser.id, { runs: updatedRuns, shoes: updatedShoes });
        getAuthHeaders({ 'Content-Type': 'application/json' })
          .then((headers) => {
            if (!headers) return;
            return fetch('/api/db/runs', {
              method: 'POST',
              headers,
              body: JSON.stringify({ ...targetRun, shoeName: newShoeName }),
            });
          })
          .catch(() => {});
      }

      showToast(`Zmieniono but na: ${newShoeName} (zaktualizowano szafę) 👟`);
    },
    [runs, shoes, currentUser, setSelectedRunForDetail, showToast]
  );

  const handleUpdateRunDate = useCallback(
    (runId: string, newDate: string) => {
      const targetRun = runs.find((r) => r.id === runId);
      if (!targetRun || targetRun.date === newDate) return;

      const oldDate = targetRun.date;
      const updatedRun = { ...targetRun, date: newDate };
      const nextRuns = runs.map((r) => (r.id === runId ? updatedRun : r));
      setRuns(nextRuns);
      safePersist('running_runs_v2', nextRuns);
      safePersist('treda_workouts', nextRuns);

      const hasOtherRunOnOldDate = nextRuns.some((r) => r.id !== runId && r.date === oldDate);
      const oldDayIndex = new Date(oldDate).getDay();
      const newDayIndex = new Date(newDate).getDay();
      const dayShorts = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
      const oldDayShort = dayShorts[isNaN(oldDayIndex) ? 0 : oldDayIndex];
      const newDayShort = dayShorts[isNaN(newDayIndex) ? 0 : newDayIndex];

      let nextPlan = plan.map((day) => {
        if (!hasOtherRunOnOldDate && day.dayShort === oldDayShort) {
          return { ...day, completed: false, completedKm: undefined };
        }
        return day;
      });

      let matchedNewDay = false;
      nextPlan = nextPlan.map((day) => {
        if (day.dayShort === newDayShort && !matchedNewDay) {
          matchedNewDay = true;
          return { ...day, completed: true, completedKm: targetRun.distanceKm };
        }
        return day;
      });

      setPlan(nextPlan);
      safePersist('treda_plan', nextPlan);
      safePersist('running_plan_v2', nextPlan);

      if (currentUser) {
        saveAccountData(currentUser.id, {
          runs: nextRuns,
          plan: nextPlan,
        });
        getAuthHeaders({ 'Content-Type': 'application/json' })
          .then((headers) => {
            if (!headers) return;
            return fetch('/api/db/runs', {
              method: 'POST',
              headers,
              body: JSON.stringify(updatedRun),
            });
          })
          .catch((err) => console.warn('Cloud SQL update run date warning:', err));
      }

      if (selectedRunForDetail && selectedRunForDetail.id === runId) {
        setSelectedRunForDetail(updatedRun);
      }

      showToast(`Zmieniono datę biegu na ${newDate} i zsynchronizowano powiązany dzień w planie! 📅`);
    },
    [runs, plan, currentUser, selectedRunForDetail, setSelectedRunForDetail, showToast]
  );

  const handleImportAllData = useCallback(
    (data: any) => {
      if (data.profile) setProfile(data.profile);
      if (data.plan) setPlan(data.plan);
      if (data.runs) setRuns(data.runs);
      if (data.shoes) setShoes(data.shoes);
      if (data.personalBests) setPersonalBests(data.personalBests);
      if (data.races) setRaces(data.races);
      if (data.weeklyFocus) setWeeklyFocus(data.weeklyFocus);
      if (data.planSummary) setPlanSummary(data.planSummary);

      if (data.profile) safePersist('treda_user_profile', data.profile);
      if (data.plan) safePersist('treda_plan', data.plan);
      if (data.runs) safePersist('treda_workouts', data.runs);
      if (data.shoes) safePersist('treda_shoes', data.shoes);
      if (data.personalBests) safePersist('treda_pbs', data.personalBests);
      if (data.races) safePersist('running_races_2027', data.races);
      if (data.weeklyFocus) safeLocalStorageSet('running_weekly_focus_v2', data.weeklyFocus);
      if (data.planSummary) safeLocalStorageSet('running_plan_summary_v2', data.planSummary);

      if (currentUser) {
        saveAccountData(currentUser.id, {
          profile: data.profile,
          plan: data.plan,
          runs: data.runs,
          shoes: data.shoes,
          personalBests: data.personalBests,
          races: data.races,
          weeklyFocus: data.weeklyFocus,
          planSummary: data.planSummary,
        });
      }
    },
    [currentUser]
  );

  const handleSendMessage = useCallback(
    async (text: string, attachment?: ChatOcrAttachmentPayload) => {
      const displayLabel =
        text.trim() ||
        (attachment?.documentType === 'medical'
          ? '🩸 Przesłano zdjęcie wyników badań do analizy OCR'
          : attachment?.documentType === 'training_plan'
          ? '📅 Przesłano zdjęcie planu treningowego do analizy OCR'
          : '📷 Przesłano dokument do analizy tekstowej OCR');

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: displayLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageAttachmentUrl: attachment?.imageBase64,
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        const historyPayload = chatMessages.map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const endpoint = attachment?.imageBase64 ? '/api/gemini/ocr-chat' : '/api/gemini/chat';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: displayLabel,
            history: historyPayload,
            profile,
            lastRun: runs[0] || null,
            shoes,
            ...(attachment?.imageBase64
              ? {
                  imageBase64: attachment.imageBase64,
                  mimeType: attachment.mimeType || 'image/jpeg',
                  documentType: attachment.documentType || 'auto',
                }
              : {}),
          }),
        });

        const data = await res.json();
        const chatResult = safeJsonParse(data);
        const modelMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text:
            (chatResult && chatResult.reply) ||
            'Dziękuję za pytanie. Bieganie w strefie tlenowej to podstawa sukcesu!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ocrResult: chatResult?.ocrResult || undefined,
        };

        setChatMessages((prev) => [...prev, modelMsg]);

        if (attachment?.imageBase64) {
          handleEarnBamboos(15, 'Analiza OCR dokumentu z Fizjologiem AI');
          showToast('Zakończono analizę OCR dokumentu! +15 🎋');
        }
      } catch (err) {
        console.error('Chat error:', err);
        showToast('Błąd połączenia z Fizjologiem AI.');
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatMessages, profile, runs, shoes, handleEarnBamboos, showToast]
  );

  const handleToggleDayCompleted = useCallback(
    (index: number) => {
      setPlan((prev) => {
        const next = [...prev];
        const current = next[index];
        if (current) {
          const nextState = !current.completed;
          next[index] = { ...current, completed: nextState };
          if (nextState) {
            handleEarnBamboos(15, 'Ukończono trening z planu');
            showToast(`Trening ${current.dayName} oznaczony jako ukończony! +15 🎋`);
          } else {
            setProfile((p) => ({
              ...p,
              bamboos: Math.max(0, p.bamboos - 15),
              levelXp: Math.max(0, p.levelXp - 45),
            }));
            showToast(`Odznaczono trening ${current.dayName} (-15 🎋)`);
          }
        }
        return next;
      });
    },
    [handleEarnBamboos, showToast]
  );

  const handleUpdatePlan = useCallback(
    (updatedPlan: TrainingDay[]) => {
      setPlan(updatedPlan);
      localStorage.setItem('running_plan_v2', JSON.stringify(updatedPlan));
      localStorage.setItem('treda_plan', JSON.stringify(updatedPlan));
      if (currentUser) {
        saveAccountData(currentUser.id, { plan: updatedPlan });
      }
    },
    [currentUser]
  );

  const handleSetMainGoal = useCallback(
    (goal: string, targetTimeOrWeeklyKm?: string | number) => {
      const updates: Partial<RunnerProfile> = { targetGoal: goal };
      if (typeof targetTimeOrWeeklyKm === 'number' && targetTimeOrWeeklyKm > 0) {
        updates.weeklyKm = targetTimeOrWeeklyKm;
      }
      handleUpdateProfile(updates);
      setWeeklyFocus(`Przygotowania pod cel: ${goal}`);
      showToast(`Zaktualizowano cel główny: ${goal}!`);
    },
    [handleUpdateProfile, showToast]
  );

  const handleAddShoe = useCallback(
    (newShoe: Shoe) => {
      setShoes((prev) => {
        const exists = prev.some((s) => s.name.toLowerCase() === newShoe.name.toLowerCase() && s.id === newShoe.id);
        if (exists) return prev;
        const nxt = [newShoe, ...prev];
        localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
        localStorage.setItem('treda_shoes', JSON.stringify(nxt));
        if (currentUser) {
          saveAccountData(currentUser.id, { shoes: nxt });
        }
        return nxt;
      });
    },
    [currentUser]
  );

  const handleUpdateShoe = useCallback(
    (updatedShoe: Shoe) => {
      setShoes((prev) => {
        const nxt = prev.map((s) => (s.id === updatedShoe.id ? updatedShoe : s));
        localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
        localStorage.setItem('treda_shoes', JSON.stringify(nxt));
        if (currentUser) {
          saveAccountData(currentUser.id, { shoes: nxt });
        }
        return nxt;
      });
    },
    [currentUser]
  );

  const handleDeleteShoe = useCallback(
    (id: string) => {
      setShoes((prev) => {
        const nxt = prev.filter((s) => s.id !== id);
        localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
        localStorage.setItem('treda_shoes', JSON.stringify(nxt));
        if (currentUser) {
          saveAccountData(currentUser.id, { shoes: nxt });
        }
        return nxt;
      });
      if (profile.selectedShoeId === id) {
        setProfile((p) => ({ ...p, selectedShoeId: '' }));
      }
    },
    [currentUser, profile.selectedShoeId]
  );

  const handleSelectMainShoe = useCallback((id: string) => {
    setProfile((p) => ({ ...p, selectedShoeId: id }));
  }, []);

  const handleUpdatePersonalBest = useCallback(
    (pb: PersonalBest) => {
      setPersonalBests((prev) => {
        const next = prev.map((p) => (p.distanceId === pb.distanceId ? pb : p));
        localStorage.setItem('running_pbs_v1', JSON.stringify(next));
        localStorage.setItem('treda_pbs', JSON.stringify(next));
        return next;
      });
      showToast(`Zaktualizowano rekord życiowy ${pb.distanceName}: ${pb.time}! 🏆`);
    },
    [showToast]
  );

  // Auth lifecycle handlers
  const handleLoginSuccess = useCallback(
    (account: UserAccount, isNewRegistration?: boolean) => {
      setCurrentUser(account);
      setIsGuestDemo(false);
      setActiveAccountId(account.id);
      setAccounts((prev) => {
        const exists = prev.some((a) => a.id === account.id);
        const updated = exists ? prev.map((a) => (a.id === account.id ? account : a)) : [...prev, account];
        saveStoredAccounts(updated, deviceIp || undefined);
        return updated;
      });

      if (isNewRegistration) {
        const freshProfile: RunnerProfile = {
          name: account.name || 'Nowy Biegacz',
          birthdate: '01.01.1995',
          gender: 'M',
          weight: 70,
          targetWeight: 68,
          height: 178,
          city: 'Warszawa',
          weeklyKm: 25,
          time5k: '25:00',
          hrMax: 185,
          rhr: 60,
          vo2max: 42,
          targetGoal: 'Budowa bazy tlenowej i regularne bieganie',
          selectedDays: ['Wt', 'Czw', 'Sob'],
          bamboos: 50,
          levelXp: 100,
          activePandaGear: { gear: 'Czapeczka Biegowa', skin: 'Klasyczna Panda', bg: 'Park Miejski' },
          coachTone: 'naukowy',
          accentColor: 'orange',
          theme: 'dark',
          planGeneratedAt: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
        };

        const freshPbs = INITIAL_PERSONAL_BESTS.map((pb) => ({ ...pb, time: '--:--', date: '-' }));

        setProfile(freshProfile);
        setRuns([]);
        setShoes([]);
        setPlan([]);
        setPersonalBests(freshPbs);
        setRaces(DEFAULT_RACES_2027);
        setWeeklyFocus('Budowa bazy tlenowej pod twój cel');
        setPlanSummary('Plan zoptymalizowany pod wybrane dni i strefę tlenową Z2.');

        saveAccountData(account.id, {
          account,
          profile: freshProfile,
          runs: [],
          shoes: [],
          plan: [],
          personalBests: freshPbs,
          races: DEFAULT_RACES_2027,
          weeklyFocus: 'Budowa bazy tlenowej pod twój cel',
          planSummary: 'Plan zoptymalizowany pod wybrane dni i strefę tlenową Z2.',
          settings: {
            subscriptionTier: account.subscriptionTier || 'PRO',
            isPro: Boolean(account.isPro ?? true),
            theme: freshProfile.theme || 'dark',
            accentColor: freshProfile.accentColor || 'orange',
            coachTone: freshProfile.coachTone || 'naukowy',
            autoSyncEnabled: true,
          },
        });

        setIsOnboardingOpen(true);
        showToast(`Witaj ${account.name}! Skonfiguruj swój profil i dodaj pierwsze buty 👟`);
        return;
      }

      const savedUserData = loadAccountData(account.id);
      const loadedSettings = savedUserData.settings;
      if (loadedSettings) {
        account.isPro = loadedSettings.isPro;
        account.subscriptionTier = loadedSettings.subscriptionTier;
        setCurrentUser({ ...account });
        if (loadedSettings.theme) {
          document.documentElement.setAttribute('data-theme', loadedSettings.theme);
        }
        if (loadedSettings.accentColor) {
          setAccent(loadedSettings.accentColor as AccentColor);
          document.documentElement.setAttribute('data-accent', loadedSettings.accentColor);
        }
      } else {
        account.isPro = account.isPro ?? true;
        account.subscriptionTier = account.subscriptionTier || (account.isPro ? 'PRO' : 'LITE');
        setCurrentUser({ ...account });
      }

      if (savedUserData.profile) setProfile(savedUserData.profile);
      setRuns(savedUserData.runs || []);
      setShoes(savedUserData.shoes || []);
      setPlan(savedUserData.plan || []);
      setPersonalBests(savedUserData.personalBests || INITIAL_PERSONAL_BESTS);
      if (savedUserData.races) setRaces(savedUserData.races);
      if (savedUserData.weeklyFocus) setWeeklyFocus(savedUserData.weeklyFocus);
      if (savedUserData.planSummary) setPlanSummary(savedUserData.planSummary);

      getAuthHeaders()
        .then((headers) => {
          if (!headers) return null;
          return fetch('/api/db/user-data', { headers }).then((res) => (res.ok ? res.json() : null));
        })
        .then((data) => {
          if (data && data.userData) {
            const cloud = data.userData;
            if (cloud.profile) {
              setProfile(cloud.profile);
              if (cloud.profile.accentColor) {
                setAccent(cloud.profile.accentColor);
                document.documentElement.setAttribute('data-accent', cloud.profile.accentColor);
              }
              if (Array.isArray(cloud.shoes)) setShoes(cloud.shoes);
              if (Array.isArray(cloud.plan)) setPlan(cloud.plan);
              if (Array.isArray(cloud.races)) setRaces(cloud.races);
            }
            if (Array.isArray(cloud.runs) && cloud.runs.length > 0) setRuns(cloud.runs);
            if (Array.isArray(cloud.personalBests) && cloud.personalBests.length > 0)
              setPersonalBests(cloud.personalBests);
            if (cloud.weeklyFocus) setWeeklyFocus(cloud.weeklyFocus);
            if (cloud.planSummary) setPlanSummary(cloud.planSummary);

            saveAccountData(account.id, cloud);
            showToast(`Pomyślnie wczytano Twój pełny postęp z bazy w chmurze! ☁️`);
          }
        })
        .catch((e) => console.error('Error restoring user data from cloud:', e));

      if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/i.test(ua)) {
          setMobileDeviceType('ios');
        } else if (/Android/i.test(ua)) {
          setMobileDeviceType('android');
        }
      }

      if (!account.onboardingCompleted) {
        setIsOnboardingOpen(true);
      }
    },
    [
      deviceIp,
      setAccounts,
      setCurrentUser,
      setIsGuestDemo,
      setAccent,
      setIsOnboardingOpen,
      setMobileDeviceType,
      showToast,
    ]
  );

  const handleLogout = useCallback(() => {
    if (currentUser) {
      saveAccountData(currentUser.id, {
        account: currentUser,
        profile,
        plan,
        runs,
        shoes,
        personalBests,
        races,
        weeklyFocus,
        planSummary,
        settings: {
          subscriptionTier: currentUser.subscriptionTier || (currentUser.isPro ? 'PRO' : 'LITE'),
          isPro: Boolean(currentUser.isPro),
          theme: profile.theme || 'dark',
          accentColor: profile.accentColor || 'orange',
          coachTone: profile.coachTone || 'naukowy',
          autoSyncEnabled: true,
        },
      });
    }
    signOut(auth).catch((err) => console.warn('Firebase signOut warning:', err));
    setCurrentUser(null);
    setIsGuestDemo(false);
    setActiveAccountId(null);
    showToast('Wylogowano pomyślnie. Witaj na ekranie startowym RunPanda!');
  }, [
    currentUser,
    profile,
    plan,
    runs,
    shoes,
    personalBests,
    races,
    weeklyFocus,
    planSummary,
    setCurrentUser,
    setIsGuestDemo,
    showToast,
  ]);

  const handleDeleteAccount = useCallback(async () => {
    if (!currentUser) return;
    const deletedId = currentUser.id;

    try {
      const headers = await getAuthHeaders();
      if (headers) {
        await fetch('/api/db/account', {
          method: 'DELETE',
          headers,
        });
      }
      if (auth.currentUser && auth.currentUser.uid === deletedId) {
        await deleteUser(auth.currentUser).catch((e) =>
          console.warn('Firebase deleteUser warning (reauth may be needed):', e)
        );
      } else {
        await signOut(auth).catch(() => {});
      }
    } catch (err) {
      console.warn('Error deleting account from server:', err);
    }

    deleteAccountData(deletedId);
    const remaining = loadStoredAccounts().filter((a) => a.id !== deletedId);
    setAccounts(remaining);
    if (remaining.length > 0) {
      handleLoginSuccess(remaining[0], false);
    } else {
      setCurrentUser(null);
      setIsGuestDemo(false);
      setActiveAccountId(null);
    }
    showToast('Konto oraz wszystkie powiązane dane zostały trwale usunięte');
  }, [currentUser, setAccounts, handleLoginSuccess, setCurrentUser, setIsGuestDemo, showToast]);

  // Admin handlers
  const handleToggleUserPro = useCallback(
    (userId: string) => {
      if (userId === 'current') {
        const nextPro = !currentUser?.isPro;
        const nextTier: 'PRO' | 'LITE' = nextPro ? 'PRO' : 'LITE';
        if (currentUser) {
          const updated = { ...currentUser, isPro: nextPro, subscriptionTier: nextTier };
          setCurrentUser(updated);
          setAccounts((prev) => {
            const nxt = prev.map((a) => (a.id === updated.id ? updated : a));
            saveStoredAccounts(nxt, deviceIp || undefined);
            return nxt;
          });
          saveAccountData(currentUser.id, {
            account: updated,
            settings: {
              subscriptionTier: nextTier,
              isPro: nextPro,
              theme: profile.theme || 'dark',
              accentColor: profile.accentColor || 'orange',
              coachTone: profile.coachTone || 'naukowy',
              autoSyncEnabled: true,
            },
          });
        } else {
          setProfile((p) => ({ ...p, isPro: true }));
        }
        return;
      }
      setAccounts((prev) => {
        const nxt = prev.map((a) => {
          if (a.id === userId) {
            const nextPro = !a.isPro;
            const updatedAcc = {
              ...a,
              isPro: nextPro,
              subscriptionTier: (nextPro ? 'PRO' : 'LITE') as 'PRO' | 'LITE',
            };
            saveAccountData(userId, {
              account: updatedAcc,
              settings: {
                subscriptionTier: updatedAcc.subscriptionTier,
                isPro: nextPro,
                theme: 'dark',
                accentColor: 'orange',
                coachTone: 'naukowy',
                autoSyncEnabled: true,
              },
            });
            return updatedAcc;
          }
          return a;
        });
        saveStoredAccounts(nxt, deviceIp || undefined);
        return nxt;
      });
    },
    [currentUser, deviceIp, profile.accentColor, profile.coachTone, profile.theme, setAccounts, setCurrentUser]
  );

  const handleAddUserBamboos = useCallback((_userId: string, amount: number) => {
    setProfile((p) => {
      const next = { ...p, bamboos: p.bamboos + amount };
      localStorage.setItem('runner_profile_v2', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleResetUserPlan = useCallback((_userId: string) => {
    setPlan(DEFAULT_PLAN);
    localStorage.setItem('running_plan_v2', JSON.stringify(DEFAULT_PLAN));
  }, []);

  const handleAdminDeleteUser = useCallback(
    (userId: string) => {
      deleteAccountData(userId);
      setAccounts((prev) => {
        const next = prev.filter((a) => a.id !== userId);
        saveStoredAccounts(next, deviceIp || undefined);
        return next;
      });
      if (currentUser?.id === userId) {
        setCurrentUser(null);
        setIsGuestDemo(true);
        setActiveAccountId(null);
      }
    },
    [currentUser?.id, deviceIp, setAccounts, setCurrentUser, setIsGuestDemo]
  );

  const handleAddCustomRace = useCallback((newRace: RaceSlot) => {
    setRaces((prev) => {
      const nxt = [newRace, ...prev];
      localStorage.setItem('running_races_2027', JSON.stringify(nxt));
      return nxt;
    });
  }, []);

  const handleDeleteCustomRace = useCallback((raceId: string) => {
    setRaces((prev) => {
      const nxt = prev.filter((r) => r.id !== raceId);
      localStorage.setItem('running_races_2027', JSON.stringify(nxt));
      return nxt;
    });
  }, []);

  const handleAddCustomShoe = useCallback((newShoe: Shoe) => {
    setShoes((prev) => {
      const nxt = [newShoe, ...prev];
      localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
      return nxt;
    });
  }, []);

  const handleDeleteCustomShoe = useCallback((shoeId: string) => {
    setShoes((prev) => {
      const nxt = prev.filter((s) => s.id !== shoeId);
      localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
      return nxt;
    });
  }, []);

  const lastRun = runs[0] || null;

  return (
    <TrainingDataContext.Provider
      value={{
        hasUserProfile,
        profile,
        setProfile,
        plan,
        setPlan,
        weeklyFocus,
        setWeeklyFocus,
        planSummary,
        setPlanSummary,
        races,
        setRaces,
        runs,
        setRuns,
        lastRun,
        shoes,
        setShoes,
        personalBests,
        setPersonalBests,
        weather,
        isWeatherLoading,
        chatMessages,
        isChatLoading,
        isPlanGenerating,
        isSubmittingRun,
        runnerPaceMinKm,
        recalibratePlanFromSimulator,
        handleUpdateProfile,
        handleRefreshGps: refreshGpsWeather,
        handleEarnBamboos,
        handleGeneratePlanAI,
        handleClearDataNewUser,
        handleLoadDemoProfile,
        registerNewWorkoutInSystem,
        handleSubmitRun,
        handleDeleteRun,
        handleUpdateRunShoe,
        handleUpdateRunDate,
        handleImportAllData,
        handleSendMessage,
        handleToggleDayCompleted,
        handleOpenIntegrationsHub,
        handleUpdatePlan,
        handleSetMainGoal,
        handleAddShoe,
        handleUpdateShoe,
        handleDeleteShoe,
        handleSelectMainShoe,
        handleUpdatePersonalBest,
        handleLoginSuccess,
        handleLogout,
        handleDeleteAccount,
        handleToggleUserPro,
        handleAddUserBamboos,
        handleResetUserPlan,
        handleAdminDeleteUser,
        handleAddCustomRace,
        handleDeleteCustomRace,
        handleAddCustomShoe,
        handleDeleteCustomShoe,
      }}
    >
      {children}
    </TrainingDataContext.Provider>
  );
};

export function useTrainingData() {
  const ctx = useContext(TrainingDataContext);
  if (!ctx) {
    throw new Error('useTrainingData must be used within a TrainingDataProvider');
  }
  return ctx;
}
