import React, { useState, useEffect, useCallback } from 'react';
import { Map, Play, Megaphone, Eye, X, Stethoscope } from 'lucide-react';
import {
  TabType,
  RunnerProfile,
  TrainingDay,
  RunLog,
  Shoe,
  RaceSlot,
  WeatherData,
  ChatMessage,
} from './types.ts';
import {
  PATRYK_PRESET,
  DEFAULT_PLAN,
  DEFAULT_RUNS,
  DEFAULT_SHOES,
  DEFAULT_RACES_2027,
  soundEngine,
} from './utils/defaults.ts';
import { checkAndTriggerNotifications, DEFAULT_NOTIFICATION_SETTINGS } from './utils/notificationEngine.ts';
import {
  calculateDynamicVo2Max,
  calculatePeakPerformance,
  time5kToSeconds,
  formatSecondsToTime,
} from './utils/runningMath.ts';
import {
  checkAndUpdatePersonalBests,
  recalculateAllPersonalBests,
  calculateRunRewards,
  computeRunnerTelemetry,
} from './utils/physiologicalEngine.ts';
import { recordAiPlanGenerated, incrementPageview } from './utils/analyticsStorage.ts';
import { DynamicHeader } from './components/DynamicHeader.tsx';
import { AcwrExplanationModal } from './components/AcwrExplanationModal.tsx';
import { LiveActivityBar } from './components/LiveActivityBar.tsx';
import { PlanView } from './components/PlanView.tsx';
import { RunsView } from './components/RunsView.tsx';
import { ChatView } from './components/ChatView.tsx';
import { RaceCalendarView } from './components/RaceCalendarView.tsx';
import { BodyGearView } from './components/BodyGearView.tsx';
import { StrengthView } from './components/StrengthView.tsx';
import { GearFuelView } from './components/GearFuelView.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { PandaModal } from './components/PandaModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { AddRunModal } from './components/AddRunModal.tsx';
import { RunDetailModal } from './components/RunDetailModal.tsx';
import { Toast } from './components/Toast.tsx';
import {
  SvgPlanIcon,
  SvgRunIcon,
  SvgTrophyIcon,
  SvgBodyGearIcon,
  SvgSettingsIcon,
  SvgStrengthIcon,
  SvgShoeIcon,
  SvgPandaFace,
} from './components/SvgIcons.tsx';

import { SettingsView } from './components/SettingsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { AdminPinModal } from './components/AdminPinModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { SUPPORTED_INTEGRATION_APPS } from './components/AppIntegrationModal.tsx';
import { PlanRecalibrationModal, PlanRecalibrationData } from './components/PlanRecalibrationModal.tsx';
import { computePhysiologicalPlanAdaptation } from './utils/physiologicalPlanAdaptation.ts';

// Performance optimization: Lazy-load heavy modals & Leaflet mapping engine
const SimulatorModal = React.lazy(() =>
  import('./components/SimulatorModal.tsx').then((m) => ({ default: m.SimulatorModal }))
);
const LiveRunHUD = React.lazy(() =>
  import('./components/LiveRunHUD.tsx').then((m) => ({ default: m.LiveRunHUD }))
);
const RoutePlannerModal = React.lazy(() =>
  import('./components/RoutePlannerModal.tsx').then((m) => ({ default: m.RoutePlannerModal }))
);
const AdminPanelModal = React.lazy(() =>
  import('./components/AdminPanelModal.tsx').then((m) => ({ default: m.AdminPanelModal }))
);
const AutoSyncMobileModal = React.lazy(() =>
  import('./components/AutoSyncMobileModal.tsx').then((m) => ({ default: m.AutoSyncMobileModal }))
);
const AppleHealthSyncModal = React.lazy(() =>
  import('./components/AppleHealthSyncModal.tsx').then((m) => ({ default: m.AppleHealthSyncModal }))
);
const AppIntegrationModal = React.lazy(() =>
  import('./components/AppIntegrationModal.tsx').then((m) => ({ default: m.AppIntegrationModal }))
);
import {
  PersonalBest,
  AccentColor,
  UserAccount,
  SyncAppStatus,
} from './types.ts';
import {
  loadStoredAccounts,
  saveStoredAccounts,
  getActiveAccountId,
  setActiveAccountId,
  loadAccountData,
  saveAccountData,
  deleteAccountData,
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from './utils/accountStorage.ts';
import { safeJsonParse } from './utils/geminiUtils.ts';
import { safeLocalStorageSet, sanitizeRunForStorage } from './utils/storage.ts';

const safePersist = (key: string, data: any) => {
  try {
    const val = typeof data === 'string' ? data : JSON.stringify(sanitizeRunForStorage(data));
    safeLocalStorageSet(key, val);
  } catch (err) {
    console.warn(`[App] Failed to persist ${key}:`, err);
  }
};

const INITIAL_PERSONAL_BESTS: PersonalBest[] = [
  { distanceId: '1k', distanceName: '1 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '1mile', distanceName: '1 mila (1.61 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '3k', distanceName: '3 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '5k', distanceName: '5 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '10k', distanceName: '10 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'half', distanceName: 'Półmaraton (21.1 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'marathon', distanceName: 'Maraton (42.2 km)', time: '--:--', pace: '- /km', date: '-' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [deviceIp, setDeviceIp] = useState<string | null>(null);

  // User Accounts (Device/IP bound)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadStoredAccounts());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeId = getActiveAccountId();
    if (!activeId) return null;
    const all = loadStoredAccounts();
    return all.find((a) => a.id === activeId) || null;
  });

  // Device IP detection on load (preserves logged in account across app updates)
  useEffect(() => {
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ip) {
          const clientIp = data.ip;
          setDeviceIp(clientIp);

          // Update accounts list and persist current device IP without ever logging user out
          const validAccounts = loadStoredAccounts(clientIp);
          if (validAccounts.length > 0) {
            setAccounts(validAccounts);
            // If no user is active yet, attempt to restore the active account
            setCurrentUser((prevUser) => {
              if (prevUser) return prevUser; // Keep existing logged in user!
              const activeId = getActiveAccountId(clientIp);
              if (activeId) {
                return validAccounts.find((a) => a.id === activeId) || validAccounts[0];
              }
              return null;
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard Focus State for mobile UI
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsInputFocused(true);
      }
    };
    const handleBlur = (e: FocusEvent) => {
      setIsInputFocused(false);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);


  // Sync and restore full user state from Cloud SQL database on mount or user login
  useEffect(() => {
    if (!currentUser?.id) return;

    fetch('/api/db/user-data', {
      headers: {
        'x-user-id': currentUser.id,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.userData) {
          const cloud = data.userData;
          if (cloud.profile) {
            setProfile(cloud.profile);
            if (cloud.profile.accentColor) {
              setAccent(cloud.profile.accentColor);
              document.documentElement.setAttribute('data-accent', cloud.profile.accentColor);
            }
          }
          if (Array.isArray(cloud.runs) && cloud.runs.length > 0) setRuns(cloud.runs);
          if (Array.isArray(cloud.shoes) && cloud.shoes.length > 0) setShoes(cloud.shoes);
          if (Array.isArray(cloud.plan) && cloud.plan.length > 0) setPlan(cloud.plan);
          if (Array.isArray(cloud.personalBests) && cloud.personalBests.length > 0) setPersonalBests(cloud.personalBests);
          if (Array.isArray(cloud.races) && cloud.races.length > 0) setRaces(cloud.races);
          if (cloud.weeklyFocus) setWeeklyFocus(cloud.weeklyFocus);
          if (cloud.planSummary) setPlanSummary(cloud.planSummary);
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);
  const [isGuestDemo, setIsGuestDemo] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Admin Mode & Owner Panel State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('running_admin_mode') === 'true';
  });
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isAdminPanelModalOpen, setIsAdminPanelModalOpen] = useState<boolean>(false);
  const [globalPushBanner, setGlobalPushBanner] = useState<string | null>(() => {
    return localStorage.getItem('running_push_banner') || null;
  });

  const handleToggleUserPro = (userId: string) => {
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
          const updatedAcc = { ...a, isPro: nextPro, subscriptionTier: (nextPro ? 'PRO' : 'LITE') as ('PRO' | 'LITE') };
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
  };

  const handleAddUserBamboos = (userId: string, amount: number) => {
    setProfile((p) => {
      const next = { ...p, bamboos: p.bamboos + amount };
      localStorage.setItem('runner_profile_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleResetUserPlan = (userId: string) => {
    setPlan(DEFAULT_PLAN);
    localStorage.setItem('running_plan_v2', JSON.stringify(DEFAULT_PLAN));
  };

  const handleAdminDeleteUser = (userId: string) => {
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
  };

  const handleAddCustomRace = (newRace: RaceSlot) => {
    setRaces((prev) => {
      const nxt = [newRace, ...prev];
      localStorage.setItem('running_races_2027', JSON.stringify(nxt));
      return nxt;
    });
  };

  const handleDeleteCustomRace = (raceId: string) => {
    setRaces((prev) => {
      const nxt = prev.filter((r) => r.id !== raceId);
      localStorage.setItem('running_races_2027', JSON.stringify(nxt));
      return nxt;
    });
  };

  const handleAddCustomShoe = (newShoe: Shoe) => {
    setShoes((prev) => {
      const nxt = [newShoe, ...prev];
      localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
      return nxt;
    });
  };

  const handleDeleteCustomShoe = (shoeId: string) => {
    setShoes((prev) => {
      const nxt = prev.filter((s) => s.id !== shoeId);
      localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
      return nxt;
    });
  };

  const handleSetGlobalPushBanner = (text: string | null) => {
    setGlobalPushBanner(text);
    if (text) {
      localStorage.setItem('running_push_banner', text);
    } else {
      localStorage.removeItem('running_push_banner');
    }
  };

  // Theme & Accent
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('running_theme') as 'dark' | 'light') || 'dark';
  });

  const [accent, setAccent] = useState<AccentColor>(() => {
    return (localStorage.getItem('running_accent') as any) || 'orange';
  });

  // Current tab
  const [activeTab, setActiveTab] = useState<TabType>('plan');

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTo?.({ top: 0, left: 0, behavior: 'smooth' });
    document.body.scrollTo?.({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const handleSwitchTab = useCallback((nextTab: TabType) => {
    setActiveTab(nextTab);
    scrollToTop();
  }, [scrollToTop]);

  useEffect(() => {
    incrementPageview();
    scrollToTop();
  }, [activeTab, scrollToTop]);

  const [hasUserProfile, setHasUserProfile] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('treda_user_profile') || localStorage.getItem('runner_profile_v2'));
  });

  // Personal Bests
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>(() => {
    const saved = localStorage.getItem('treda_pbs') || localStorage.getItem('running_pbs_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
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
      try { return JSON.parse(saved); } catch {}
    }
    return hasUserProfile ? DEFAULT_PLAN : [];
  });

  const [weeklyFocus, setWeeklyFocus] = useState<string>(() => {
    return localStorage.getItem('running_weekly_focus_v2') || 'Budowa bazy tlenowej pod twój cel';
  });
  const [planSummary, setPlanSummary] = useState<string>(() => {
    return localStorage.getItem('running_plan_summary_v2') || 'Plan zoptymalizowany pod wybrane dni i strefę tlenową Z2.';
  });

  // Races 2027 Calendar
  const [races, setRaces] = useState<RaceSlot[]>(() => {
    const saved = localStorage.getItem('running_races_2027');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_RACES_2027;
  });

  // Runs history
  const [runs, setRuns] = useState<RunLog[]>(() => {
    const saved = localStorage.getItem('treda_workouts') || localStorage.getItem('running_runs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return hasUserProfile ? DEFAULT_RUNS : [];
  });

  // Shoes rotation
  const [shoes, setShoes] = useState<Shoe[]>(() => {
    const saved = localStorage.getItem('treda_shoes') || localStorage.getItem('running_shoes_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return hasUserProfile ? DEFAULT_SHOES : [];
  });

  // Live Weather & Smog (AQI)
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'model',
      text: 'Cześć! Jestem Twoim osobistym Fizjologiem AI. Znam Twoją metrykę, VO2max, historię biegów i buty w szafie. O czym chcesz porozmawiać – regeneracji, tempie czy periodyzacji?',
      timestamp: '14:48',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Modals state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isLiveHudOpen, setIsLiveHudOpen] = useState<boolean>(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [isPandaModalOpen, setIsPandaModalOpen] = useState<boolean>(false);
  const [pandaInitialOverlay, setPandaInitialOverlay] = useState<'none' | 'minigames' | 'sims_studio' | 'sims_room'>('none');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return !localStorage.getItem('treda_user_profile') && !localStorage.getItem('runner_profile_v2');
  });
  const [isAddRunOpen, setIsAddRunOpen] = useState<boolean>(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [selectedRunForDetail, setSelectedRunForDetail] = useState<RunLog | null>(null);
  const [isRunDetailOpen, setIsRunDetailOpen] = useState<boolean>(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState<boolean>(false);
  const [isSubmittingRun, setIsSubmittingRun] = useState<boolean>(false);
  const [isAutoSyncMobileOpen, setIsAutoSyncMobileOpen] = useState<boolean>(false);
  const [mobileDeviceType, setMobileDeviceType] = useState<'ios' | 'android' | 'web'>('web');
  const [isAcwrModalOpen, setIsAcwrModalOpen] = useState<boolean>(false);
  const [isAppleHealthModalOpen, setIsAppleHealthModalOpen] = useState<boolean>(false);
  const [globalIntegrationApp, setGlobalIntegrationApp] = useState<SyncAppStatus | null>(null);
  const [isPlanRecalibrationOpen, setIsPlanRecalibrationOpen] = useState<boolean>(false);
  const [planRecalibrationData, setPlanRecalibrationData] = useState<PlanRecalibrationData | null>(null);
  const [lastAddedRunForRecalibration, setLastAddedRunForRecalibration] = useState<Partial<RunLog> | null>(null);

  const handleOpenIntegrationsHub = useCallback((appId?: string) => {
    const targetId = appId || 'strava';
    const found =
      profile.connectedApps?.find((a) => a.id === targetId) ||
      SUPPORTED_INTEGRATION_APPS.find((a) => a.id === targetId) ||
      SUPPORTED_INTEGRATION_APPS[0];
    setGlobalIntegrationApp(found);
  }, [profile.connectedApps]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

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
    }, 20000); // Check every 20s

    return () => clearInterval(interval);
  }, [profile, plan, weather, showToast]);

  // Continuous auto-save for logged-in users to guarantee all changes persist
  useEffect(() => {
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
      });
    }
  }, [currentUser, profile, plan, runs, shoes, personalBests, races, weeklyFocus, planSummary]);

  const handleUpdateProfile = useCallback((up: Partial<RunnerProfile>) => {
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
  }, []);

  const handleLoginSuccess = useCallback((account: UserAccount, isNewRegistration?: boolean) => {
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
      // 100% CZYSTY START DLA NOWEGO KONTA - ZEROWANIE BIEGÓW, SZAFY I PLANU (bez kopiowania PATRYK_PRESET)
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

    // Istniejące konto - wczytaj jego prywatne dane oraz ustawienia (w tym subskrypcję PRO/LITE)
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
        setAccent(loadedSettings.accentColor as any);
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

    // Fetch full user progress from Cloud SQL database to restore everything on new device
    fetch('/api/db/user-data', {
      headers: {
        'x-user-id': account.id,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.userData) {
          const cloud = data.userData;
          if (cloud.profile) {
            setProfile(cloud.profile);
            if (cloud.profile.accentColor) {
              setAccent(cloud.profile.accentColor);
              document.documentElement.setAttribute('data-accent', cloud.profile.accentColor);
            }
          }
          if (Array.isArray(cloud.runs) && cloud.runs.length > 0) setRuns(cloud.runs);
          if (Array.isArray(cloud.shoes) && cloud.shoes.length > 0) setShoes(cloud.shoes);
          if (Array.isArray(cloud.plan) && cloud.plan.length > 0) setPlan(cloud.plan);
          if (Array.isArray(cloud.personalBests) && cloud.personalBests.length > 0) setPersonalBests(cloud.personalBests);
          if (Array.isArray(cloud.races) && cloud.races.length > 0) setRaces(cloud.races);
          if (cloud.weeklyFocus) setWeeklyFocus(cloud.weeklyFocus);
          if (cloud.planSummary) setPlanSummary(cloud.planSummary);

          // Update local storage cache on this device
          saveAccountData(account.id, cloud);
          showToast(`Pomyślnie wczytano Twój pełny postęp z bazy w chmurze! ☁️`);
        }
      })
      .catch((e) => console.error('Error restoring user data from cloud:', e));

    // Detect iOS or Android device type without forcing the auto-sync modal open on every login
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
  }, [deviceIp, showToast]);

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
    setCurrentUser(null);
    setIsGuestDemo(false);
    setActiveAccountId(null);
    showToast('Wylogowano pomyślnie. Witaj na ekranie startowym RunPanda!');
  }, [currentUser, profile, plan, runs, shoes, personalBests, races, weeklyFocus, planSummary, showToast]);

  const handleDeleteAccount = useCallback(() => {
    if (!currentUser) return;
    const deletedId = currentUser.id;
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
  }, [currentUser, handleLoginSuccess, showToast]);

  // Ability to change shoes for an already logged run
  const handleUpdateRunShoe = useCallback((runId: string, newShoeName: string) => {
    const targetRun = runs.find((r) => r.id === runId);
    if (!targetRun) return;
    const oldShoeName = targetRun.shoeName;
    if (oldShoeName === newShoeName) return;

    const dist = targetRun.distanceKm;

    // 1. Update run in runs array
    const updatedRuns = runs.map((r) => (r.id === runId ? { ...r, shoeName: newShoeName } : r));
    setRuns(updatedRuns);

    // 2. Adjust mileage in shoes array
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

    // 3. Update selectedRunForDetail if open
    setSelectedRunForDetail((prev) => (prev && prev.id === runId ? { ...prev, shoeName: newShoeName } : prev));

    // 4. Persist to Cloud SQL / accountStorage
    if (currentUser) {
      saveAccountData(currentUser.id, { runs: updatedRuns, shoes: updatedShoes });
      fetch('/api/db/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ ...targetRun, shoeName: newShoeName }),
      }).catch(() => {});
    }

    showToast(`Zmieniono but na: ${newShoeName} (zaktualizowano szafę) 👟`);
  }, [runs, shoes, currentUser, showToast]);

  // Sync theme & accent attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    safeLocalStorageSet('running_theme', theme);
    safeLocalStorageSet('running_accent', accent);
  }, [theme, accent]);

  // Persist state safely
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

  // Debounced (1500 ms) full state persistence to Cloud SQL for logged-in user
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      saveAccountData(currentUser.id, {
        profile,
        plan,
        runs,
        shoes,
        personalBests,
        races,
        weeklyFocus,
        planSummary,
      });

      fetch('/api/db/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userData: {
            profile,
            plan,
            runs,
            shoes,
            personalBests,
            races,
            weeklyFocus,
            planSummary,
          },
        }),
      }).catch((e) => console.warn('Debounced Cloud SQL sync warning:', e));
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentUser, profile, plan, runs, shoes, personalBests, races, weeklyFocus, planSummary]);

  // Weather fetch (without overwriting profile.city on automatic startup to prevent fetch loops)
  const fetchWeather = useCallback(async (lat?: number, lon?: number) => {
    setIsWeatherLoading(true);
    try {
      let url = '/api/weather';
      if (lat !== undefined && lon !== undefined) {
        url += `?lat=${lat}&lon=${lon}`;
      } else if (profile.city) {
        url += `?city=${encodeURIComponent(profile.city)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather API returned status: ${res.status}`);
      }
      const rawText = await res.text();
      let data: WeatherData;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Weather response is not JSON: ${rawText.slice(0, 30)}`);
      }

      setWeather(data);
      // Only update profile.city when user explicitly refreshes via GPS coordinates
      if (lat !== undefined && lon !== undefined && data.city) {
        setProfile((prev) => (prev.city === data.city ? prev : { ...prev, city: data.city }));
      }
    } catch (err) {
      console.warn('Weather fetch handled with graceful fallback:', err);
      // Ensure realistic live weather state even if offline or blocked
      setWeather((prev) => prev || {
        city: profile.city || 'Warszawa',
        lat: 52.23,
        lon: 21.01,
        temp: 18,
        windSpeed: 12,
        humidity: 55,
        pm2_5: 10,
        pm10: 16,
        aqi: 20,
        condition: 'Częściowe zachmurzenie ⛅',
      });
    } finally {
      setIsWeatherLoading(false);
    }
  }, [profile.city]);

  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshGps = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolokalizacja niedostępna. Pobieranie danych dla miasta.');
      fetchWeather();
      return;
    }

    setIsWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
        showToast('Pobrano współrzędne GPS i realny odczyt PM2.5 / AQI! 📍');
      },
      (err) => {
        console.warn('GPS error:', err);
        showToast('Nie udało się pobrać GPS. Załadowano dane dla miasta bazowego.');
        fetchWeather();
      },
      { timeout: 7000 }
    );
  }, [fetchWeather, showToast]);

  const handleEarnBamboos = (amount: number, reason: string) => {
    setProfile((prev) => ({
      ...prev,
      bamboos: prev.bamboos + amount,
      levelXp: prev.levelXp + amount * 3,
    }));
  };

  // Generate 7-day plan AI
  const handleGeneratePlanAI = async (customProfile?: RunnerProfile) => {
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
  };

  // Reset for new user (Onboarding First)
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
  }, [showToast]);

  // Load demo profile (Patryk ze Zgierza)
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

  // Centralized Workout Registration Engine (Tri-linking: workouts <-> shoes <-> charts <-> PBs <-> Gemini AI)
  const registerNewWorkoutInSystem = useCallback((
    rawRun: Omit<RunLog, 'id' | 'coachFeedback'>,
    customCoachFeedback?: string
  ) => {
    const runId = `run-${Date.now()}`;
    const newRun: RunLog = {
      ...rawRun,
      id: runId,
      coachFeedback: customCoachFeedback || 'Przyzwoity trening! Monitoruj kadencję i tętno spoczynkowe.',
    };

    // 1. Calculate Run Rewards (Bamboos & XP + Cadence Bonus)
    const reward = calculateRunRewards(newRun);

    // 2. Add Run to List
    const nextRuns = [newRun, ...runs];
    setRuns(nextRuns);
    safePersist('treda_workouts', nextRuns);
    safePersist('running_runs_v2', nextRuns);

    // 3. Update Shoe Mileage (exclusively match rawRun.shoeName if provided; only fallback to selectedShoeId when rawRun.shoeName is empty)
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

    // 4. Check & Update Personal Bests
    const pbResult = checkAndUpdatePersonalBests(newRun, personalBests);
    let totalBamboosEarned = reward.bamboos;
    let pbToastText = '';

    if (pbResult.beatenDistances.length > 0) {
      setPersonalBests(pbResult.updatedPbs);
      safePersist('treda_pbs', pbResult.updatedPbs);
      safePersist('running_pbs_v1', pbResult.updatedPbs);
      totalBamboosEarned += 100; // PB Bonus +100 Bamboos
      pbToastText = ` 🏆 POBITO REKORD PB (${pbResult.beatenDistances.join(', ')})! +100 🎋`;
    }

    // 5. Update Profile VO2Max & Rewards (dynamic VO2Max without artificial Math.max lock)
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

    // 6. Update Plan Progress: match weekday from run's date (Pon, Wt, Śr, Czw, Pt, Sob, Niedz)
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

    // 7. Save to User Account Storage & Cloud SQL
    if (currentUser) {
      saveAccountData(currentUser.id, {
        profile: nextProfile,
        runs: nextRuns,
        shoes: nextShoes,
        personalBests: pbResult.updatedPbs,
        plan: nextPlan,
      });
      fetch('/api/db/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(newRun),
      }).catch(() => {});
    }

    // 8. Trigger Async Gemini AI Workout Analysis and persist analysis (matching RunLog in types.ts)
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
  }, [shoes, runs, personalBests, profile, plan, currentUser, showToast]);

  // Add run with Zero-Click Coaching & Dynamic Plan Recalibration
  const handleSubmitRun = async (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => {
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

      // If server or network did not return full recalibration, compute deterministic adaptation
      if (!recalibration || !recalibration.updatedPlan) {
        recalibration = computePhysiologicalPlanAdaptation(plan, runData, profile);
        if (recalibration.coachFeedback) coachFeedback = recalibration.coachFeedback;
      }

      registerNewWorkoutInSystem(runData, coachFeedback);
      setIsAddRunOpen(false);

      // Instantly apply dynamic recalibrated plan and trigger modal
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
  };

  const handleDeleteRun = useCallback((runId: string) => {
    const targetRun = runs.find((r) => r.id === runId);
    if (!targetRun) return;

    const nextRuns = runs.filter((r) => r.id !== runId);
    setRuns(nextRuns);
    safePersist('running_runs_v2', nextRuns);
    safePersist('treda_workouts', nextRuns);

    // Subtract exact mileage from shoes
    const nextShoes = shoes.map((s) => {
      if (s.name === targetRun.shoeName) {
        return { ...s, mileageKm: Math.max(s.initialMileageKm || 0, +(s.mileageKm - targetRun.distanceKm).toFixed(2)) };
      }
      return s;
    });
    setShoes(nextShoes);
    safePersist('running_shoes_v2', nextShoes);
    safePersist('treda_shoes', nextShoes);

    // Recalculate Personal Bests based on remaining runs
    const nextPbs = recalculateAllPersonalBests(nextRuns, personalBests);
    setPersonalBests(nextPbs);
    safePersist('treda_pbs', nextPbs);
    safePersist('running_pbs_v1', nextPbs);

    // Recalculate VO2 max
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

      fetch(`/api/db/runs/${encodeURIComponent(runId)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        },
      }).catch((err) => console.warn('Cloud SQL delete run warning:', err));
    }

    // If on targetRun.date there is no other run in nextRuns, revert completed: false in plan
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
  }, [runs, shoes, personalBests, profile, plan, currentUser, selectedRunForDetail, showToast]);

  const handleUpdateRunDate = useCallback((runId: string, newDate: string) => {
    const targetRun = runs.find((r) => r.id === runId);
    if (!targetRun || targetRun.date === newDate) return;

    const oldDate = targetRun.date;
    const updatedRun = { ...targetRun, date: newDate };
    const nextRuns = runs.map((r) => (r.id === runId ? updatedRun : r));
    setRuns(nextRuns);
    safePersist('running_runs_v2', nextRuns);
    safePersist('treda_workouts', nextRuns);

    // Sync with Plan:
    // 1. Check if any remaining runs exist on oldDate; if not, revert that day in plan
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

    // 2. Mark new date's day as completed
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
      fetch('/api/db/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify(updatedRun),
      }).catch((err) => console.warn('Cloud SQL update run date warning:', err));
    }

    if (selectedRunForDetail && selectedRunForDetail.id === runId) {
      setSelectedRunForDetail(updatedRun);
    }

    showToast(`Zmieniono datę biegu na ${newDate} i zsynchronizowano powiązany dzień w planie! 📅`);
  }, [runs, plan, currentUser, selectedRunForDetail, showToast]);

  const handleImportAllData = useCallback((data: any) => {
    if (data.profile) setProfile(data.profile);
    if (data.plan) setPlan(data.plan);
    if (data.runs) setRuns(data.runs);
    if (data.shoes) setShoes(data.shoes);
    if (data.personalBests) setPersonalBests(data.personalBests);
    if (data.races) setRaces(data.races);
    if (data.weeklyFocus) setWeeklyFocus(data.weeklyFocus);
    if (data.planSummary) setPlanSummary(data.planSummary);

    // Persist immediately
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
  }, [currentUser]);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          profile,
          lastRun: runs[0] || null,
          shoes,
        }),
      });

      const data = await res.json();
      const chatResult = safeJsonParse(data);
      const modelMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: (chatResult && chatResult.reply) || 'Dziękuję za pytanie. Bieganie w strefie tlenowej to podstawa sukcesu!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      showToast('Błąd połączenia z Fizjologiem AI.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleToggleDayCompleted = (index: number) => {
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
  };

  const lastRun = runs[0] || null;

  // If user is not logged in and not in guest demo, show Welcome Screen!
  if (!currentUser && !isGuestDemo) {
    return (
      <div className="w-full max-w-md mx-auto min-h-[100dvh] flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Toast message={toastMessage} onClose={hideToast} />
        <WelcomeScreen
          onOpenAuth={(mode) => {
            setAuthModalTab(mode);
            setIsAuthModalOpen(true);
          }}
          onSelectSavedAccount={(acc) => handleLoginSuccess(acc, false)}
          onContinueAsGuest={() => {
            setIsGuestDemo(true);
            showToast('Uruchomiono tryb demonstracyjny z przykładowymi danymi!');
          }}
          savedAccounts={accounts}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          existingAccounts={accounts}
          currentAccountId={null}
          showToast={showToast}
          initialTab={authModalTab}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {/* Toast */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Global Push Banner (broadcast by Admin/Owner) */}
      {globalPushBanner && (
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 text-white text-xs font-black px-4 py-2 flex items-center justify-between gap-2 shadow-lg animate-pulse border-b border-white/20 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="truncate">{globalPushBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSetGlobalPushBanner(null)}
            className="text-[10px] bg-black/30 hover:bg-black/50 px-2 py-0.5 rounded-full text-white/90 shrink-0 hover:text-white flex items-center gap-1"
          >
            <span>Zamknij</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Guest Demo Banner if active */}
      {isGuestDemo && (
        <div className="mx-3 mt-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs z-30">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-[11px] font-bold text-amber-300">
              Tryb demonstracyjny (Gość)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('register');
              setIsAuthModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95"
          >
            Załóż konto
          </button>
        </div>
      )}

      {/* Dynamic Header */}
      <DynamicHeader
        profile={profile}
        weather={weather}
        lastRun={lastRun}
        runs={runs}
        personalBests={personalBests}
        onRefreshGps={handleRefreshGps}
        isWeatherLoading={isWeatherLoading}
        currentUser={currentUser}
        onOpenPandaModal={() => setIsPandaModalOpen(true)}
        onOpenSettings={() => setActiveTab((prev) => (prev === 'settings' ? 'plan' : 'settings'))}
        onOpenAuth={() => {
          setAuthModalTab('login');
          setIsAuthModalOpen(true);
        }}
        onOpenChat={() => setIsChatDrawerOpen(true)}
        onLogWater={(amount) => {
          handleEarnBamboos(2, 'Nawodnienie');
          showToast(`Wypito ${amount} ml wody! +2 🎋`);
        }}
        onTriggerAdminPin={() => setIsAdminPinModalOpen(true)}
        isAdminMode={isAdminMode}
        onOpenAdminPanel={() => setIsAdminPanelModalOpen(true)}
        onOpenAcwrModal={() => setIsAcwrModalOpen(true)}
        onOpenAchievements={() => setActiveTab('live')}
        onOpenAppleHealth={() => setIsAppleHealthModalOpen(true)}
        onOpenIntegrationsHub={handleOpenIntegrationsHub}
      />

      {/* Main Content Area */}
      <main className="flex-1 mt-3">
        {activeTab === 'settings' ? (
          <SettingsView
            profile={profile}
            plan={plan}
            shoes={shoes}
            runs={runs}
            personalBests={personalBests}
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            onAddSyncedRun={(newRun) => {
              handleSubmitRun(newRun);
            }}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onOpenAuth={() => {
              setAuthModalTab('login');
              setIsAuthModalOpen(true);
            }}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            showToast={showToast}
            onClose={() => setActiveTab('plan')}
            onClearDataNewUser={handleClearDataNewUser}
            onLoadDemoProfile={handleLoadDemoProfile}
            onTriggerAdminPin={() => setIsAdminPinModalOpen(true)}
            isAdminMode={isAdminMode}
            onOpenAdminPanel={() => setIsAdminPanelModalOpen(true)}
            onImportAllData={handleImportAllData}
          />
        ) : (
          <>
            {(activeTab === 'plan' || activeTab === 'panda') && (
              <PlanView
                plan={plan}
                weeklyFocus={weeklyFocus}
                summary={planSummary}
                profile={profile}
                races={races}
                runs={runs}
                isGenerating={isPlanGenerating}
                onGeneratePlanAI={() => handleGeneratePlanAI()}
                onToggleDayCompleted={handleToggleDayCompleted}
                onUpdatePlan={(updatedPlan) => {
                  setPlan(updatedPlan);
                  localStorage.setItem('running_plan_v2', JSON.stringify(updatedPlan));
                  localStorage.setItem('treda_plan', JSON.stringify(updatedPlan));
                  if (currentUser) {
                    saveAccountData(currentUser.id, { plan: updatedPlan });
                  }
                }}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onOpenPandaModal={() => {
                  setPandaInitialOverlay('none');
                  setIsPandaModalOpen(true);
                }}
                onOpenSimsStudio={() => {
                  setPandaInitialOverlay('sims_studio');
                  setIsPandaModalOpen(true);
                }}
                onOpenLiveHud={() => setIsLiveHudOpen(true)}
                onAddRace={(r) => setRaces((prev) => [r, ...prev])}
                onDeleteRace={(id) => setRaces((prev) => prev.filter((r) => r.id !== id))}
                onUpdateCoachTone={(t) => handleUpdateProfile({ coachTone: t })}
                onSetMainGoal={(goal, targetTimeOrWeeklyKm) => {
                  const updates: Partial<RunnerProfile> = { targetGoal: goal };
                  if (typeof targetTimeOrWeeklyKm === 'number' && targetTimeOrWeeklyKm > 0) {
                    updates.weeklyKm = targetTimeOrWeeklyKm;
                  }
                  handleUpdateProfile(updates);
                  setWeeklyFocus(`Przygotowania pod cel: ${goal}`);
                  showToast(`Zaktualizowano cel główny: ${goal}!`);
                }}
                onSelectRunForDetail={(run) => {
                  setSelectedRunForDetail(run);
                  setIsRunDetailOpen(true);
                }}
                onOpenIntegrationsHub={handleOpenIntegrationsHub}
                onOpenAddRun={() => setIsAddRunOpen(true)}
                showToast={showToast}
              />
            )}

            {(activeTab === 'trainings' || activeTab === 'live') && (
              <RunsView
                runs={runs}
                profile={profile}
                personalBests={personalBests}
                shoes={shoes}
                onAddShoe={(newShoe) => {
                  setShoes((prev) => {
                    const exists = prev.some((s) => s.name.toLowerCase() === newShoe.name.toLowerCase());
                    if (exists) return prev;
                    const nxt = [newShoe, ...prev];
                    localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
                    localStorage.setItem('treda_shoes', JSON.stringify(nxt));
                    if (currentUser) {
                      saveAccountData(currentUser.id, { shoes: nxt });
                    }
                    return nxt;
                  });
                }}
                onOpenAddRun={() => setIsAddRunOpen(true)}
                onSelectRunForDetail={(run) => {
                  setSelectedRunForDetail(run);
                  setIsRunDetailOpen(true);
                }}
                onDeleteRun={handleDeleteRun}
                onEarnBamboos={handleEarnBamboos}
                onOpenIntegrationsHub={handleOpenIntegrationsHub}
                showToast={showToast}
                onAddSyncedRun={(newRun) => handleSubmitRun(newRun)}
                onOpenLiveHud={() => setIsLiveHudOpen(true)}
                onOpenRoutePlanner={() => setIsRoutePlannerOpen(true)}
                onUpdatePersonalBest={(pb) => {
                  setPersonalBests((prev) => {
                    const next = prev.map((p) => (p.distanceId === pb.distanceId ? pb : p));
                    localStorage.setItem('running_pbs_v1', JSON.stringify(next));
                    localStorage.setItem('treda_pbs', JSON.stringify(next));
                    return next;
                  });
                  showToast(`Zaktualizowano rekord życiowy ${pb.distanceName}: ${pb.time}! 🏆`);
                }}
              />
            )}

            {activeTab === 'races' && (
              <RaceCalendarView
                races={races}
                profile={profile}
                runs={runs}
                plan={plan}
                onAddRace={(r) => setRaces((prev) => [r, ...prev])}
                onDeleteRace={(id) => setRaces((prev) => prev.filter((r) => r.id !== id))}
                onSetMainGoal={(goal) => {
                  handleUpdateProfile({ targetGoal: goal });
                  setWeeklyFocus(`Przygotowania pod cel: ${goal}`);
                  showToast(`Zaktualizowano cel główny: ${goal}!`);
                }}
                showToast={showToast}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onOpenRoutePlanner={() => setIsRoutePlannerOpen(true)}
              />
            )}

            {(activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear') && (
              <BodyGearView
                profile={profile}
                runs={runs}
                shoes={shoes}
                weather={weather}
                onUpdateProfile={handleUpdateProfile}
                onAddShoe={(s) => {
                  setShoes((prev) => {
                    const nxt = [s, ...prev];
                    localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
                    localStorage.setItem('treda_shoes', JSON.stringify(nxt));
                    if (currentUser) {
                      saveAccountData(currentUser.id, { shoes: nxt });
                    }
                    return nxt;
                  });
                }}
                onUpdateShoe={(updatedShoe) => {
                  setShoes((prev) => {
                    const nxt = prev.map((s) => (s.id === updatedShoe.id ? updatedShoe : s));
                    localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
                    localStorage.setItem('treda_shoes', JSON.stringify(nxt));
                    if (currentUser) {
                      saveAccountData(currentUser.id, { shoes: nxt });
                    }
                    return nxt;
                  });
                }}
                onDeleteShoe={(id) => {
                  setShoes((prev) => {
                    const nxt = prev.filter((s) => s.id !== id);
                    localStorage.setItem('running_shoes_v2', JSON.stringify(nxt));
                    if (currentUser) {
                      saveAccountData(currentUser.id, { shoes: nxt });
                    }
                    return nxt;
                  });
                  if (profile.selectedShoeId === id) {
                    setProfile((p) => ({ ...p, selectedShoeId: '' }));
                  }
                }}
                onSelectMainShoe={(id) => setProfile((p) => ({ ...p, selectedShoeId: id }))}
                onEarnBamboos={handleEarnBamboos}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Live Activity Bar with Integrated Side-by-Side Physiologist Chat Trigger */}
      <LiveActivityBar
        lastRun={lastRun}
        profile={profile}
        onOpenAddRun={() => setIsAddRunOpen(true)}
        onOpenChat={() => setIsChatDrawerOpen(true)}
        onOpenRunDetail={(run) => {
          setSelectedRunForDetail(run);
          setIsRunDetailOpen(true);
        }}
      />

      {/* iOS 27 Liquid Glass Navigation Dock: Exactly 5 Clean Balanced Tabs */}
      {!isInputFocused && (
        <nav
          aria-label="Nawigacja główna"
          className="fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40 animate-ios"
        >
          <div className="liquid-dock p-1.5 flex items-center justify-around">
            <button
              type="button"
              onClick={() => handleSwitchTab('plan')}
              aria-label="Zakładka Plan i RunPanda"
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
                activeTab === 'plan' || activeTab === 'panda' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
              }`}
            >
              <SvgPlanIcon size={18} />
              <span className="text-[10px] mt-0.5 flex items-center gap-1 leading-none whitespace-nowrap">
                <span>Plan &</span>
                <SvgPandaFace size={13} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('trainings')}
              aria-label="Zakładka Treningi i Dziennik"
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
                activeTab === 'trainings' || activeTab === 'live' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
              }`}
            >
              <SvgRunIcon size={18} />
              <span className="text-[10px] mt-0.5">Treningi</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('races')}
              aria-label="Zakładka Starty 2027 i Symulator"
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
                activeTab === 'races' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
              }`}
            >
              <SvgTrophyIcon size={18} />
              <span className="text-[10px] mt-0.5">Starty 2027</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('body_gear')}
              aria-label="Zakładka Ciało i Szafa"
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
                activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
              }`}
            >
              <SvgBodyGearIcon size={18} />
              <span className="text-[10px] mt-0.5">Ciało & Szafa</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('settings')}
              aria-label="Zakładka Opcje i Profil"
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
                activeTab === 'settings' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
              }`}
            >
              <SvgSettingsIcon size={18} />
              <span className="text-[10px] mt-0.5">Opcje</span>
            </button>
          </div>
        </nav>
      )}

      {/* MODALS */}
      {isSimulatorOpen && (
        <ErrorBoundary fallbackTitle="Symulator Biegowy Co Jeśli">
          <React.Suspense fallback={null}>
            <SimulatorModal
              isOpen={isSimulatorOpen}
              onClose={() => setIsSimulatorOpen(false)}
              profile={profile}
              shoes={shoes}
              onApplyToProfile={(up) => {
                handleUpdateProfile(up);
                if (up.time5k) {
                  const parts = up.time5k.split(':').map(Number);
                  const sec5k = parts.length === 2 ? parts[0] * 60 + parts[1] : 1500;
                  const paceSecPerKm = Math.round(sec5k / 5);
                  const formatPace = (sec: number) => {
                    const m = Math.floor(sec / 60);
                    const s = Math.round(sec % 60);
                    return `${m}:${s < 10 ? '0' : ''}${s} /km`;
                  };
                  const updatedPlan = plan.map((day) => {
                    if (day.distanceKm === 0) return day;
                    const typeLower = day.type.toLowerCase();
                    if (typeLower.includes('interwał') || typeLower.includes('szybk') || typeLower.includes('rytm')) {
                      return { ...day, targetPace: formatPace(Math.max(180, paceSecPerKm - 15)) };
                    }
                    if (typeLower.includes('tempo') || typeLower.includes('próg')) {
                      return { ...day, targetPace: formatPace(paceSecPerKm + 10) };
                    }
                    return { ...day, targetPace: formatPace(paceSecPerKm + 45) };
                  });
                  setPlan(updatedPlan);
                  localStorage.setItem('running_plan_v2', JSON.stringify(updatedPlan));
                  localStorage.setItem('treda_plan', JSON.stringify(updatedPlan));
                  setPlanSummary(
                    `Plan zaktualizowany wg Symulatora Co Jeśli (5K: ${up.time5k}, waga docelowa: ${up.targetWeight} kg, VO2max: ${up.vo2max}).`
                  );
                }
                showToast('Parametry z Symulatora przeniesione do profilu i planu treningowego!');
              }}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {isLiveHudOpen && (
        <React.Suspense fallback={null}>
          <LiveRunHUD
            isOpen={isLiveHudOpen}
            onClose={() => setIsLiveHudOpen(false)}
            profile={profile}
            shoes={shoes}
            onFinishRun={(run) => {
              handleSubmitRun({
                date: new Date().toLocaleDateString('sv-SE'),
                distanceKm: run.distanceKm,
                durationMin: run.durationMin,
                avgPace: run.avgPace,
                avgHr: run.avgHr,
                avgCadence: run.avgCadence,
                shoeName: run.shoeName,
                gctMs: run.gctMs,
                verticalOscillationCm: run.verticalOscillationCm,
                groundContactBalancePercent: run.groundContactBalancePercent,
                verticalRatioPercent: run.verticalRatioPercent,
                notes: 'Zarejestrowano w Live Run HUD z polskim głosem trenera AI.',
              });
            }}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      <PandaModal
        isOpen={isPandaModalOpen}
        initialOverlay={pandaInitialOverlay}
        onClose={() => {
          setIsPandaModalOpen(false);
          setPandaInitialOverlay('none');
        }}
        profile={profile}
        shoes={shoes}
        onUpdateProfile={(up) => setProfile((p) => ({ ...p, ...up }))}
        showToast={showToast}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        profile={profile}
        shoes={shoes}
        onSaveProfile={(up) => {
          setProfile(up);
          if (currentUser) {
            const updatedAccount: UserAccount = {
              ...currentUser,
              name: up.name || currentUser.name,
              onboardingCompleted: true,
            };
            setCurrentUser(updatedAccount);
            setAccounts((prev) => {
              const next = prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a));
              saveStoredAccounts(next);
              return next;
            });
          }
        }}
        onGeneratePlanAI={handleGeneratePlanAI}
        showToast={showToast}
      />

      <AddRunModal
        isOpen={isAddRunOpen}
        onClose={() => setIsAddRunOpen(false)}
        shoes={shoes}
        profile={profile}
        onSubmitRun={handleSubmitRun}
        isSubmitting={isSubmittingRun}
        showToast={showToast}
      />

      {/* Completed Run Detail Modal with Interactive Route Map, Telemetry & Shoe Switcher */}
      <RunDetailModal
        isOpen={isRunDetailOpen}
        run={selectedRunForDetail}
        profile={profile}
        onClose={() => setIsRunDetailOpen(false)}
        showToast={showToast}
        shoes={shoes}
        onUpdateRunShoe={handleUpdateRunShoe}
        onUpdateRunDate={handleUpdateRunDate}
        onDeleteRun={handleDeleteRun}
      />

      {/* Floating Chat Drawer Modal */}
      {isChatDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios"
        >
          <div className="liquid-glass w-full max-w-sm p-4 space-y-3 animate-ios-modal max-h-[90dvh] flex flex-col my-auto border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black txt-main flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                <span>Fizjolog AI na Żywo (Gemini 3 Flash)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(false)}
                className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center font-bold text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatView
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                profile={profile}
                lastRun={lastRun}
                shoes={shoes}
              />
            </div>
          </div>
        </div>
      )}

      {/* Runner Account Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        existingAccounts={accounts}
        currentAccountId={currentUser?.id || null}
        showToast={showToast}
        initialTab={authModalTab}
      />

      {/* Admin PIN Verification Modal (Secret Developer Entrance) */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setIsAdminMode(true);
          localStorage.setItem('running_admin_mode', 'true');
          setIsAdminPanelModalOpen(true);
        }}
        showToast={showToast}
      />

      {/* Admin / Owner SaaS Dashboard Modal */}
      {isAdminPanelModalOpen && (
        <React.Suspense fallback={null}>
          <AdminPanelModal
            isOpen={isAdminPanelModalOpen}
            onClose={() => setIsAdminPanelModalOpen(false)}
            users={accounts}
            currentUser={currentUser}
            profile={profile}
            runs={runs}
            races={races}
            shoes={shoes}
            personalBests={personalBests}
            globalPushBanner={globalPushBanner}
            onToggleUserPro={handleToggleUserPro}
            onAddUserBamboos={handleAddUserBamboos}
            onResetUserPlan={handleResetUserPlan}
            onDeleteUser={handleAdminDeleteUser}
            onAddCustomRace={handleAddCustomRace}
            onDeleteCustomRace={handleDeleteCustomRace}
            onAddCustomShoe={handleAddCustomShoe}
            onDeleteCustomShoe={handleDeleteCustomShoe}
            onSetGlobalPushBanner={handleSetGlobalPushBanner}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      {/* GPS Route Planner Modal */}
      {isRoutePlannerOpen && (
        <React.Suspense fallback={null}>
          <RoutePlannerModal
            isOpen={isRoutePlannerOpen}
            onClose={() => setIsRoutePlannerOpen(false)}
            runnerPaceMinKm={
              profile.time5k
                ? formatSecondsToTime(Math.round(time5kToSeconds(profile.time5k) / 5))
                : '5:30'
            }
            profile={profile}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      {/* Mobile Auto Sync Health Prompt Modal (iPhone / Android) */}
      {isAutoSyncMobileOpen && (
        <React.Suspense fallback={null}>
          <AutoSyncMobileModal
            isOpen={isAutoSyncMobileOpen}
            onClose={() => setIsAutoSyncMobileOpen(false)}
            deviceType={mobileDeviceType}
            profile={profile}
            onAddSyncedRun={(newRun) => handleSubmitRun(newRun)}
            onUpdateHealthBridge={(data) => {
              setProfile((p) => ({
                ...p,
                healthBridge: p.healthBridge ? { ...p.healthBridge, ...data } : undefined,
              }));
            }}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      {/* ACWR Explanation Modal */}
      <AcwrExplanationModal
        isOpen={isAcwrModalOpen}
        onClose={() => setIsAcwrModalOpen(false)}
        currentAcwr={calculatePeakPerformance(runs).acwr}
      />

      {/* Apple Health iOS Integration Sync Modal */}
      {isAppleHealthModalOpen && (
        <React.Suspense fallback={null}>
          <AppleHealthSyncModal
            isOpen={isAppleHealthModalOpen}
            onClose={() => setIsAppleHealthModalOpen(false)}
            profile={profile}
            onAddSyncedRun={(newRun) => handleSubmitRun(newRun)}
            onUpdateProfileHealth={(updates) => {
              setProfile((p) => ({
                ...p,
                ...(updates.rhr ? { rhr: updates.rhr } : {}),
                ...(updates.vo2max ? { vo2max: updates.vo2max } : {}),
                ...(updates.weight ? { weight: updates.weight } : {}),
              }));
            }}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      {/* Global 8-Sports Apps Integration Modal (Strava, Garmin, Apple, Polar, Coros, Huawei, Komoot, Google Fit) */}
      {!!globalIntegrationApp && (
        <React.Suspense fallback={null}>
          <AppIntegrationModal
            isOpen={!!globalIntegrationApp}
            onClose={() => setGlobalIntegrationApp(null)}
            app={globalIntegrationApp}
            profile={profile}
            plan={plan}
            shoes={shoes}
            onToggleConnect={(appId) => {
              const currentList = profile.connectedApps && profile.connectedApps.length > 0
                ? profile.connectedApps
                : SUPPORTED_INTEGRATION_APPS;
              const updated = currentList.map((a) =>
                a.id === appId
                  ? { ...a, connected: !a.connected, lastSync: !a.connected ? 'Właśnie teraz' : undefined }
                  : a
              );
              handleUpdateProfile({ connectedApps: updated });
              setGlobalIntegrationApp((prev) => (prev && prev.id === appId ? { ...prev, connected: !prev.connected } : prev));
            }}
            onAddSyncedRun={(newRun, updatedPlan, bamboos) => {
              registerNewWorkoutInSystem(newRun);
              if (updatedPlan) setPlan(updatedPlan);
              if (bamboos) handleEarnBamboos(bamboos, 'Synchronizacja biegu');
            }}
            showToast={showToast}
          />
        </React.Suspense>
      )}

      {/* Plan Recalibration Popup Modal ("Okienko po dodaniu biegu") */}
      <PlanRecalibrationModal
        isOpen={isPlanRecalibrationOpen}
        onClose={() => setIsPlanRecalibrationOpen(false)}
        onViewPlan={() => {
          setIsPlanRecalibrationOpen(false);
          setActiveTab('plan');
          scrollToTop();
        }}
        recalibrationData={planRecalibrationData}
        newRun={lastAddedRunForRecalibration}
      />
    </div>
  );
}
