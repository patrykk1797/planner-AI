import React from 'react';
import { Megaphone, Eye, X } from 'lucide-react';
import { DynamicHeader } from './components/layout/DynamicHeader.tsx';
import { LiveActivityBar } from './components/layout/LiveActivityBar.tsx';
import { PlanView } from './views/PlanView.tsx';
import { RunsView } from './views/RunsView.tsx';
import { RaceCalendarView } from './views/RaceCalendarView.tsx';
import { BodyGearView } from './views/BodyGearView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { SplashScreen } from './views/SplashScreen.tsx';
import { Toast } from './components/layout/Toast.tsx';
import { AuthModal } from './components/modals/AuthModal.tsx';
import { WelcomeScreen } from './views/WelcomeScreen.tsx';
import { BottomNavDock } from './components/layout/BottomNavDock.tsx';
import { AppModals } from './components/modals/AppModals.tsx';
import { UIProvider, useUI } from './contexts/UIContext.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { TrainingDataProvider, useTrainingData } from './contexts/TrainingDataContext.tsx';

import { App as CapApp } from '@capacitor/app';
import { applyPlatformAttributes } from './utils/platformHelper.ts';

function AppShell() {
  const {
    showSplash,
    setShowSplash,
    toastMessage,
    showToast,
    hideToast,
    activeTab,
    handleSwitchTab,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    globalPushBanner,
    handleSetGlobalPushBanner,
    // Modals for Android Back Button listener
    isSimulatorOpen,
    setIsSimulatorOpen,
    isLiveHudOpen,
    setIsLiveHudOpen,
    isRoutePlannerOpen,
    setIsRoutePlannerOpen,
    isPandaModalOpen,
    setIsPandaModalOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isAddRunOpen,
    setIsAddRunOpen,
    isChatDrawerOpen,
    setIsChatDrawerOpen,
    isRunDetailOpen,
    setIsRunDetailOpen,
    isAutoSyncMobileOpen,
    setIsAutoSyncMobileOpen,
    isAcwrModalOpen,
    setIsAcwrModalOpen,
    isAppleHealthModalOpen,
    setIsAppleHealthModalOpen,
    isPlanRecalibrationOpen,
    setIsPlanRecalibrationOpen,
    isAdminPinModalOpen,
    setIsAdminPinModalOpen,
    isAdminPanelModalOpen,
    setIsAdminPanelModalOpen,
  } = useUI();

  const { accounts, currentUser, isGuestDemo, setIsGuestDemo } = useAuth();
  const { handleLoginSuccess } = useTrainingData();

  // Initialize platform adaptive attributes (data-os="ios" | "android")
  React.useEffect(() => {
    applyPlatformAttributes();
  }, []);

  // 4. Android Hardware / Native Back Button Listener (HIG vs Material You compliance)
  React.useEffect(() => {
    let backListenerHandle: any = null;

    const handleAndroidBack = (): boolean => {
      // 1. If any modal or drawer is open, close it first instead of exiting
      if (isAddRunOpen) {
        setIsAddRunOpen(false);
        return true;
      }
      if (isRunDetailOpen) {
        setIsRunDetailOpen(false);
        return true;
      }
      if (isPandaModalOpen) {
        setIsPandaModalOpen(false);
        return true;
      }
      if (isChatDrawerOpen) {
        setIsChatDrawerOpen(false);
        return true;
      }
      if (isSimulatorOpen) {
        setIsSimulatorOpen(false);
        return true;
      }
      if (isRoutePlannerOpen) {
        setIsRoutePlannerOpen(false);
        return true;
      }
      if (isLiveHudOpen) {
        setIsLiveHudOpen(false);
        return true;
      }
      if (isPlanRecalibrationOpen) {
        setIsPlanRecalibrationOpen(false);
        return true;
      }
      if (isAcwrModalOpen) {
        setIsAcwrModalOpen(false);
        return true;
      }
      if (isAppleHealthModalOpen) {
        setIsAppleHealthModalOpen(false);
        return true;
      }
      if (isAutoSyncMobileOpen) {
        setIsAutoSyncMobileOpen(false);
        return true;
      }
      if (isAdminPanelModalOpen) {
        setIsAdminPanelModalOpen(false);
        return true;
      }
      if (isAdminPinModalOpen) {
        setIsAdminPinModalOpen(false);
        return true;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }
      if (isOnboardingOpen) {
        setIsOnboardingOpen(false);
        return true;
      }

      // 2. If user is in another tab than 'plan', return to main 'plan' tab
      if (activeTab !== 'plan' && activeTab !== 'panda') {
        handleSwitchTab('plan');
        return true;
      }

      return false;
    };

    // Native Capacitor backButton event
    try {
      if (typeof CapApp !== 'undefined' && typeof CapApp.addListener === 'function') {
        const p = CapApp.addListener('backButton', ({ canGoBack }) => {
          const wasHandled = handleAndroidBack();
          if (!wasHandled && canGoBack) {
            window.history.back();
          }
        });
        if (p && typeof p.then === 'function') {
          p.then((handle) => {
            backListenerHandle = handle;
          }).catch(() => {});
        }
      }
    } catch {}

    // Web popstate fallback for mobile browsers
    const onPopState = (e: PopStateEvent) => {
      const handled = handleAndroidBack();
      if (handled) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', onPopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      if (backListenerHandle && typeof backListenerHandle.remove === 'function') {
        backListenerHandle.remove();
      }
      window.removeEventListener('popstate', onPopState);
    };
  }, [
    isAddRunOpen,
    isRunDetailOpen,
    isPandaModalOpen,
    isChatDrawerOpen,
    isSimulatorOpen,
    isRoutePlannerOpen,
    isLiveHudOpen,
    isPlanRecalibrationOpen,
    isAcwrModalOpen,
    isAppleHealthModalOpen,
    isAutoSyncMobileOpen,
    isAdminPanelModalOpen,
    isAdminPinModalOpen,
    isAuthModalOpen,
    isOnboardingOpen,
    activeTab,
    handleSwitchTab,
    setIsAddRunOpen,
    setIsRunDetailOpen,
    setIsPandaModalOpen,
    setIsChatDrawerOpen,
    setIsSimulatorOpen,
    setIsRoutePlannerOpen,
    setIsLiveHudOpen,
    setIsPlanRecalibrationOpen,
    setIsAcwrModalOpen,
    setIsAppleHealthModalOpen,
    setIsAutoSyncMobileOpen,
    setIsAdminPanelModalOpen,
    setIsAdminPinModalOpen,
    setIsAuthModalOpen,
    setIsOnboardingOpen,
  ]);

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
      <Toast message={toastMessage} onClose={hideToast} />

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

      {isGuestDemo && (
        <div className="mx-3 mt-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs z-30">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-[11px] font-bold text-amber-300">Tryb demonstracyjny (Gość)</span>
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

      <DynamicHeader />

      <main className="flex-1 mt-3 pb-28">
        {activeTab === 'settings' ? (
          <SettingsView />
        ) : (
          <>
            {(activeTab === 'plan' || activeTab === 'panda') && <PlanView />}
            {(activeTab === 'trainings' || activeTab === 'live') && <RunsView />}
            {activeTab === 'races' && <RaceCalendarView />}
            {(activeTab === 'body_gear' || activeTab === 'strength' || activeTab === 'gear') && <BodyGearView />}
          </>
        )}
      </main>

      <LiveActivityBar />
      <BottomNavDock />
      <AppModals />
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <TrainingDataProvider>
          <AppShell />
        </TrainingDataProvider>
      </AuthProvider>
    </UIProvider>
  );
}
