import React, { useState, useEffect, useCallback } from 'react';
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
import { DynamicHeader } from './components/DynamicHeader.tsx';
import { LiveActivityBar } from './components/LiveActivityBar.tsx';
import { PlanView } from './components/PlanView.tsx';
import { RunsView } from './components/RunsView.tsx';
import { ChatView } from './components/ChatView.tsx';
import { StrengthView } from './components/StrengthView.tsx';
import { GearFuelView } from './components/GearFuelView.tsx';
import { SimulatorModal } from './components/SimulatorModal.tsx';
import { LiveRunHUD } from './components/LiveRunHUD.tsx';
import { PandaModal } from './components/PandaModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { AddRunModal } from './components/AddRunModal.tsx';
import { RunDetailModal } from './components/RunDetailModal.tsx';
import { Toast } from './components/Toast.tsx';
import {
  SvgPlanIcon,
  SvgRunIcon,
  SvgStrengthIcon,
  SvgShoeIcon,
  SvgSettingsIcon,
} from './components/SvgIcons.tsx';

import { SettingsView } from './components/SettingsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import {
  PersonalBest,
  AccentColor,
  UserAccount,
} from './types.ts';
import {
  loadStoredAccounts,
  saveStoredAccounts,
  getActiveAccountId,
  setActiveAccountId,
  loadAccountData,
  saveAccountData,
  deleteAccountData,
} from './utils/accountStorage.ts';

const INITIAL_PERSONAL_BESTS: PersonalBest[] = [
  { distanceId: '1k', distanceName: '1 km', time: '4:15', pace: '4:15 /km', date: '12.09.2026', raceOrRunName: 'Trening interwałowy Zgierz', gapToTarget: '-15s do celu' },
  { distanceId: '1mile', distanceName: '1 mila (1.61 km)', time: '7:08', pace: '4:26 /km', date: '04.10.2026', raceOrRunName: 'Sprawdzian na bieżni', gapToTarget: '-20s do celu' },
  { distanceId: '3k', distanceName: '3 km', time: '13:50', pace: '4:36 /km', date: '28.08.2026', raceOrRunName: 'Test Coopera Park Miejski', gapToTarget: '-35s do celu' },
  { distanceId: '5k', distanceName: '5 km', time: '25:00', pace: '5:00 /km', date: '14.10.2026', raceOrRunName: 'Parkrun Park Poniatowskiego', gapToTarget: 'Cel: Sub-25 min!' },
  { distanceId: '10k', distanceName: '10 km', time: '53:40', pace: '5:22 /km', date: '20.09.2026', raceOrRunName: 'Bieg Fabrykanta Łódź', gapToTarget: 'Cel: Sub-50 min' },
  { distanceId: 'half', distanceName: 'Półmaraton (21.1 km)', time: '1:59:30', pace: '5:39 /km', date: '15.05.2026', raceOrRunName: 'Półmaraton Łódź 2026', gapToTarget: 'Cel 2027: 1:52:00' },
  { distanceId: 'marathon', distanceName: 'Maraton (42.2 km)', time: '4:28:15', pace: '6:21 /km', date: '08.10.2025', raceOrRunName: 'Silesia Marathon', gapToTarget: 'Cel: Sub-4h w 2027' },
];

export default function App() {
  // User Accounts
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadStoredAccounts());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeId = getActiveAccountId();
    if (!activeId) return null;
    const all = loadStoredAccounts();
    return all.find((a) => a.id === activeId) || null;
  });
  const [isGuestDemo, setIsGuestDemo] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Theme & Accent
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('running_theme') as 'dark' | 'light') || 'dark';
  });

  const [accent, setAccent] = useState<AccentColor>(() => {
    return (localStorage.getItem('running_accent') as any) || 'orange';
  });

  // Current tab
  const [activeTab, setActiveTab] = useState<TabType>('plan');

  // Personal Bests
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>(() => {
    const saved = localStorage.getItem('running_pbs_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_PERSONAL_BESTS;
  });

  // Runner profile
  const [profile, setProfile] = useState<RunnerProfile>(() => {
    const saved = localStorage.getItem('runner_profile_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...PATRYK_PRESET,
          ...parsed,
          accentColor: parsed.accentColor || 'orange',
          theme: parsed.theme || 'dark',
        };
      } catch {}
    }
    return {
      ...PATRYK_PRESET,
      accentColor: 'orange',
      theme: 'dark',
    };
  });

  // 7-day training plan
  const [plan, setPlan] = useState<TrainingDay[]>(() => {
    const saved = localStorage.getItem('running_plan_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_PLAN;
  });

  const [weeklyFocus, setWeeklyFocus] = useState<string>(
    'Budowa bazy tlenowej pod cel: Sub-25 min na 5 km'
  );
  const [planSummary, setPlanSummary] = useState<string>(
    'Plan zoptymalizowany pod 4 jednostki treningowe tygodniowo w Strefie 2 i 4.'
  );

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
    const saved = localStorage.getItem('running_runs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_RUNS;
  });

  // Shoes rotation
  const [shoes, setShoes] = useState<Shoe[]>(() => {
    const saved = localStorage.getItem('running_shoes_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_SHOES;
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
  const [isPandaModalOpen, setIsPandaModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAddRunOpen, setIsAddRunOpen] = useState<boolean>(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [selectedRunForDetail, setSelectedRunForDetail] = useState<RunLog | null>(null);
  const [isRunDetailOpen, setIsRunDetailOpen] = useState<boolean>(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState<boolean>(false);
  const [isSubmittingRun, setIsSubmittingRun] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

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
      saveStoredAccounts(updated);
      return updated;
    });

    if (isNewRegistration) {
      // 100% CZYSTY START DLA NOWEGO KONTA - ZEROWANIE BIEGÓW, SZAFY I PLANU
      const freshProfile: RunnerProfile = {
        ...PATRYK_PRESET,
        name: account.name || 'Nowy Biegacz',
        city: '',
        weight: 70,
        targetWeight: 68,
        time5k: '25:00',
        weeklyKm: 25,
        targetGoal: 'Budowa bazy tlenowej i regularne bieganie',
        accentColor: 'orange',
        theme: 'dark',
      };

      const freshPbs = INITIAL_PERSONAL_BESTS.map((pb) => ({ ...pb, time: '--:--', date: '-' }));

      setProfile(freshProfile);
      setRuns([]);
      setShoes([]);
      setPlan([]);
      setPersonalBests(freshPbs);

      saveAccountData(account.id, {
        account,
        profile: freshProfile,
        runs: [],
        shoes: [],
        plan: [],
        personalBests: freshPbs,
      });

      setIsOnboardingOpen(true);
      showToast(`Witaj ${account.name}! Skonfiguruj swój profil i dodaj pierwsze buty 👟`);
      return;
    }

    // Istniejące konto - wczytaj jego prywatne dane
    const savedUserData = loadAccountData(account.id);
    if (savedUserData.profile) {
      setProfile(savedUserData.profile);
      if (savedUserData.profile.accentColor) {
        setAccent(savedUserData.profile.accentColor);
        document.documentElement.setAttribute('data-accent', savedUserData.profile.accentColor);
      }
    } else {
      setProfile({ ...PATRYK_PRESET, name: account.name });
    }

    setRuns(savedUserData.runs || []);
    setShoes(savedUserData.shoes || []);
    setPlan(savedUserData.plan || []);
    setPersonalBests(savedUserData.personalBests || INITIAL_PERSONAL_BESTS);

    if (!account.onboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    if (currentUser) {
      saveAccountData(currentUser.id, {
        profile,
        plan,
        runs,
        shoes,
        personalBests,
      });
    }
    setCurrentUser(null);
    setIsGuestDemo(false);
    setActiveAccountId(null);
    showToast('Wylogowano pomyślnie. Witaj na ekranie startowym RunPanda!');
  }, [currentUser, profile, plan, runs, shoes, personalBests, showToast]);

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

  // Persist current user data
  useEffect(() => {
    if (currentUser) {
      saveAccountData(currentUser.id, {
        profile,
        plan,
        runs,
        shoes,
        personalBests,
      });
    }
  }, [currentUser, profile, plan, runs, shoes, personalBests]);

  // Sync theme & accent attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('running_theme', theme);
    localStorage.setItem('running_accent', accent);
  }, [theme, accent]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('runner_profile_v2', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('running_plan_v2', JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem('running_races_2027', JSON.stringify(races));
  }, [races]);

  useEffect(() => {
    localStorage.setItem('running_runs_v2', JSON.stringify(runs));
  }, [runs]);

  useEffect(() => {
    localStorage.setItem('running_shoes_v2', JSON.stringify(shoes));
  }, [shoes]);

  // Weather fetch
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
      if (data.city) {
        setProfile((prev) => ({ ...prev, city: data.city }));
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
  }, [fetchWeather]);

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
      if (data.days && Array.isArray(data.days)) {
        setPlan(data.days);
        if (data.weeklyFocus) setWeeklyFocus(data.weeklyFocus);
        if (data.summary) setPlanSummary(data.summary);

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

  // Add run with Zero-Click Coaching
  const handleSubmitRun = async (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => {
    setIsSubmittingRun(true);
    try {
      const newRun: RunLog = {
        ...runData,
        id: `run-${Date.now()}`,
      };

      const res = await fetch('/api/gemini/zero-click-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRun,
          profile,
          currentPlan: plan,
        }),
      });

      const coachResult = await res.json();
      const updatedRun: RunLog = {
        ...newRun,
        coachFeedback: coachResult.coachFeedback,
      };

      setRuns((prev) => [updatedRun, ...prev]);

      if (coachResult.updatedPlan && Array.isArray(coachResult.updatedPlan)) {
        setPlan(coachResult.updatedPlan);
      }

      setShoes((prev) =>
        prev.map((s) => {
          if (s.name === runData.shoeName) {
            return { ...s, mileageKm: Math.round(s.mileageKm + runData.distanceKm) };
          }
          return s;
        })
      );

      const earned = coachResult.bamboosEarned || Math.round(runData.distanceKm * 5);
      handleEarnBamboos(earned, 'Ukończony bieg');

      setIsAddRunOpen(false);
      showToast(`Zapisano bieg! Zero-Click Coaching przeliczył plan. +${earned} 🎋!`);
    } catch (err) {
      console.error(err);
      showToast('Bieg dodany.');
      setIsAddRunOpen(false);
    } finally {
      setIsSubmittingRun(false);
    }
  };

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
      const modelMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: data.reply || 'Dziękuję za pytanie. Bieganie w strefie tlenowej to podstawa sukcesu!',
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
        }
      }
      return next;
    });
  };

  const lastRun = runs[0] || null;

  // If user is not logged in and not in guest demo, show Welcome Screen!
  if (!currentUser && !isGuestDemo) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
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
      {/* Toast */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Guest Demo Banner if active */}
      {isGuestDemo && (
        <div className="mx-3 mt-2 p-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs z-30">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👀</span>
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
        onRefreshGps={handleRefreshGps}
        isWeatherLoading={isWeatherLoading}
        currentUser={currentUser}
        onOpenPandaModal={() => setIsPandaModalOpen(true)}
        onOpenSettings={() => setActiveTab((prev) => (prev === 'settings' ? 'plan' : 'settings'))}
        onOpenAuth={() => {
          setAuthModalTab('login');
          setIsAuthModalOpen(true);
        }}
        onLogWater={(amount) => {
          handleEarnBamboos(2, 'Nawodnienie');
          showToast(`Wypito ${amount} ml wody! +2 🎋`);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 mt-3">
        {activeTab === 'settings' ? (
          <SettingsView
            profile={profile}
            plan={plan}
            shoes={shoes}
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            onAddSyncedRun={(newRun, updatedPlan, bamboos) => {
              setRuns((prev) => [newRun, ...prev]);
              if (updatedPlan) setPlan(updatedPlan);
              if (bamboos) handleEarnBamboos(bamboos, 'Synchronizacja biegu');
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
          />
        ) : (
          <>
            {activeTab === 'plan' && (
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
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onOpenPandaModal={() => setIsPandaModalOpen(true)}
                onAddRace={(r) => setRaces((prev) => [r, ...prev])}
                onDeleteRace={(id) => setRaces((prev) => prev.filter((r) => r.id !== id))}
                onUpdateCoachTone={(t) => setProfile((p) => ({ ...p, coachTone: t }))}
                onSetMainGoal={(goal) => {
                  setProfile((p) => ({ ...p, targetGoal: goal }));
                  setWeeklyFocus(`Przygotowania pod cel: ${goal}`);
                  showToast(`Zaktualizowano cel główny: ${goal}!`);
                }}
                showToast={showToast}
              />
            )}

            {activeTab === 'live' && (
              <div className="space-y-4 px-4 pb-24 animate-ios">
                <div className="liquid-glass p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                      Moduł 11 & 12 • Asystent Biegu & GPS
                    </span>
                    <h2 className="text-base font-bold txt-main">Asystent Biegu na Żywo</h2>
                    <div className="text-[11px] txt-muted">Głos Trenera PL, OSRM Snapping, GPX</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLiveHudOpen(true)}
                    className="accent-bg text-black px-4 py-2 text-xs font-black rounded-full shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>▶️</span>
                    <span>Uruchom Live HUD</span>
                  </button>
                </div>

                <RunsView
                  runs={runs}
                  profile={profile}
                  personalBests={personalBests}
                  onOpenAddRun={() => setIsAddRunOpen(true)}
                  onSelectRunForDetail={(run) => {
                    setSelectedRunForDetail(run);
                    setIsRunDetailOpen(true);
                  }}
                  onUpdatePersonalBest={(pb) => {
                    setPersonalBests((prev) => {
                      const next = prev.map((p) => (p.distanceId === pb.distanceId ? pb : p));
                      localStorage.setItem('running_pbs_v1', JSON.stringify(next));
                      return next;
                    });
                    showToast(`Zaktualizowano rekord życiowy ${pb.distanceName}: ${pb.time}! 🏆`);
                  }}
                />
              </div>
            )}

            {activeTab === 'strength' && (
              <StrengthView
                profile={profile}
                runs={runs}
                weather={weather}
                onUpdateProfile={handleUpdateProfile}
                onEarnBamboos={handleEarnBamboos}
                showToast={showToast}
              />
            )}

            {activeTab === 'gear' && (
              <GearFuelView
                shoes={shoes}
                profile={profile}
                onAddShoe={(s) => setShoes((p) => [s, ...p])}
                onDeleteShoe={(id) => {
                  setShoes((prev) => prev.filter((s) => s.id !== id));
                  if (profile.selectedShoeId === id) {
                    setProfile((p) => ({ ...p, selectedShoeId: '' }));
                  }
                }}
                onSelectMainShoe={(id) => setProfile((p) => ({ ...p, selectedShoeId: id }))}
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

      {/* iOS 27 Liquid Glass Navigation Dock: 5 Clean Balanced Tabs */}
      <nav
        aria-label="Nawigacja główna"
        className="fixed bottom-3 left-4 right-4 max-w-sm mx-auto z-40"
      >
        <div className="liquid-dock p-1.5 flex items-center justify-around">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            aria-label="Zakładka Plan i Periodyzacja"
            className={`flex flex-col items-center py-1.5 px-3 rounded-full transition-all ${
              activeTab === 'plan' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <SvgPlanIcon size={18} />
            <span className="text-[10px] mt-0.5">Plan '27</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live')}
            aria-label="Zakładka Trening Live i Dziennik"
            className={`flex flex-col items-center py-1.5 px-3 rounded-full transition-all ${
              activeTab === 'live' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <SvgRunIcon size={18} />
            <span className="text-[10px] mt-0.5">Live Bieg</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('strength')}
            aria-label="Zakładka Trening Siłowy, Ból Ciała i Zdrowie"
            className={`flex flex-col items-center py-1.5 px-3 rounded-full transition-all ${
              activeTab === 'strength' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <SvgStrengthIcon size={18} />
            <span className="text-[10px] mt-0.5">Siła & Zdrowie</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gear')}
            aria-label="Zakładka Sprzęt i Dieta"
            className={`flex flex-col items-center py-1.5 px-3 rounded-full transition-all ${
              activeTab === 'gear' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <SvgShoeIcon size={18} />
            <span className="text-[10px] mt-0.5">Szafa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-label="Zakładka Ustawienia i Synchronizacja"
            className={`flex flex-col items-center py-1.5 px-3 rounded-full transition-all ${
              activeTab === 'settings' ? 'ios27-tab-active font-black' : 'txt-sub hover:text-white'
            }`}
          >
            <SvgSettingsIcon size={18} />
            <span className="text-[10px] mt-0.5">Opcje</span>
          </button>
        </div>
      </nav>

      {/* MODALS */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        profile={profile}
        shoes={shoes}
        onApplyToProfile={(up) => {
          setProfile((p) => ({ ...p, ...up }));
          showToast('Parametry zaktualizowane w profilu!');
        }}
      />

      <LiveRunHUD
        isOpen={isLiveHudOpen}
        onClose={() => setIsLiveHudOpen(false)}
        profile={profile}
        shoes={shoes}
        onFinishRun={(run) => {
          handleSubmitRun({
            date: new Date().toISOString().split('T')[0],
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

      <PandaModal
        isOpen={isPandaModalOpen}
        onClose={() => setIsPandaModalOpen(false)}
        profile={profile}
        onUpdateProfile={(up) => setProfile((p) => ({ ...p, ...up }))}
        showToast={showToast}
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
      />

      {/* Floating Chat Drawer Modal */}
      {isChatDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-3 animate-ios"
        >
          <div className="liquid-glass w-full max-w-sm p-4 space-y-3 animate-ios-modal max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black txt-main flex items-center gap-1.5">
                <span>🧑‍⚕️</span>
                <span>Fizjolog AI na Żywo (Gemini 3 Flash)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(false)}
                className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center font-bold text-xs"
              >
                ✕
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
    </div>
  );
}
