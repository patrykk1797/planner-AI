import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TabType, AccentColor, RunLog, SyncAppStatus } from '../types.ts';
import { PlanRecalibrationData } from '../components/modals/PlanRecalibrationModal.tsx';
import { incrementPageview } from '../utils/analyticsStorage.ts';
import { safeLocalStorageSet } from '../utils/storage.ts';

export type PandaOverlayType = 'none' | 'minigames' | 'sims_studio' | 'sims_room';

export interface UIContextValue {
  showSplash: boolean;
  setShowSplash: React.Dispatch<React.SetStateAction<boolean>>;
  isInputFocused: boolean;
  theme: 'dark' | 'light';
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  accent: AccentColor;
  setAccent: React.Dispatch<React.SetStateAction<AccentColor>>;
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  handleSwitchTab: (nextTab: TabType) => void;
  scrollToTop: () => void;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  // Modals & Drawers
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  authModalTab: 'login' | 'register';
  setAuthModalTab: React.Dispatch<React.SetStateAction<'login' | 'register'>>;
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLiveHudOpen: boolean;
  setIsLiveHudOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRoutePlannerOpen: boolean;
  setIsRoutePlannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPandaModalOpen: boolean;
  setIsPandaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pandaInitialOverlay: PandaOverlayType;
  setPandaInitialOverlay: React.Dispatch<React.SetStateAction<PandaOverlayType>>;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAddRunOpen: boolean;
  setIsAddRunOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRunForDetail: RunLog | null;
  setSelectedRunForDetail: React.Dispatch<React.SetStateAction<RunLog | null>>;
  isRunDetailOpen: boolean;
  setIsRunDetailOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAutoSyncMobileOpen: boolean;
  setIsAutoSyncMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileDeviceType: 'ios' | 'android' | 'web';
  setMobileDeviceType: React.Dispatch<React.SetStateAction<'ios' | 'android' | 'web'>>;
  isAcwrModalOpen: boolean;
  setIsAcwrModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAppleHealthModalOpen: boolean;
  setIsAppleHealthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  globalIntegrationApp: SyncAppStatus | null;
  setGlobalIntegrationApp: React.Dispatch<React.SetStateAction<SyncAppStatus | null>>;
  isPlanRecalibrationOpen: boolean;
  setIsPlanRecalibrationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  planRecalibrationData: PlanRecalibrationData | null;
  setPlanRecalibrationData: React.Dispatch<React.SetStateAction<PlanRecalibrationData | null>>;
  lastAddedRunForRecalibration: Partial<RunLog> | null;
  setLastAddedRunForRecalibration: React.Dispatch<React.SetStateAction<Partial<RunLog> | null>>;

  // Admin & Broadcast
  isAdminMode: boolean;
  setIsAdminMode: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminPinModalOpen: boolean;
  setIsAdminPinModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminPanelModalOpen: boolean;
  setIsAdminPanelModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  globalPushBanner: string | null;
  handleSetGlobalPushBanner: (text: string | null) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Keyboard Focus State for mobile UI (only hide dock for virtual-keyboard text inputs)
  useEffect(() => {
    const isTextKeyboardInput = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
        return ['text', 'number', 'email', 'password', 'search', 'tel', 'url'].includes(type);
      }
      return false;
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (isTextKeyboardInput(target)) {
        setIsInputFocused(true);
      }
    };
    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!isTextKeyboardInput(active)) {
          setIsInputFocused(false);
        }
      }, 50);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Theme & Accent
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('running_theme') as 'dark' | 'light') || 'dark';
  });

  const [accent, setAccent] = useState<AccentColor>(() => {
    return (localStorage.getItem('running_accent') as AccentColor) || 'orange';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    safeLocalStorageSet('running_theme', theme);
    safeLocalStorageSet('running_accent', accent);
  }, [theme, accent]);

  // Current tab
  const [activeTab, setActiveTab] = useState<TabType>('plan');

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTo?.({ top: 0, left: 0, behavior: 'smooth' });
    document.body.scrollTo?.({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const handleSwitchTab = useCallback(
    (nextTab: TabType) => {
      setActiveTab(nextTab);
      scrollToTop();
    },
    [scrollToTop]
  );

  useEffect(() => {
    incrementPageview();
    scrollToTop();
  }, [activeTab, scrollToTop]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Modals & Drawers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isLiveHudOpen, setIsLiveHudOpen] = useState<boolean>(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [isPandaModalOpen, setIsPandaModalOpen] = useState<boolean>(false);
  const [pandaInitialOverlay, setPandaInitialOverlay] = useState<PandaOverlayType>('none');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return !localStorage.getItem('treda_user_profile') && !localStorage.getItem('runner_profile_v2');
  });
  const [isAddRunOpen, setIsAddRunOpen] = useState<boolean>(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [selectedRunForDetail, setSelectedRunForDetail] = useState<RunLog | null>(null);
  const [isRunDetailOpen, setIsRunDetailOpen] = useState<boolean>(false);
  const [isAutoSyncMobileOpen, setIsAutoSyncMobileOpen] = useState<boolean>(false);
  const [mobileDeviceType, setMobileDeviceType] = useState<'ios' | 'android' | 'web'>('web');
  const [isAcwrModalOpen, setIsAcwrModalOpen] = useState<boolean>(false);
  const [isAppleHealthModalOpen, setIsAppleHealthModalOpen] = useState<boolean>(false);
  const [globalIntegrationApp, setGlobalIntegrationApp] = useState<SyncAppStatus | null>(null);
  const [isPlanRecalibrationOpen, setIsPlanRecalibrationOpen] = useState<boolean>(false);
  const [planRecalibrationData, setPlanRecalibrationData] = useState<PlanRecalibrationData | null>(null);
  const [lastAddedRunForRecalibration, setLastAddedRunForRecalibration] = useState<Partial<RunLog> | null>(null);

  // Admin Mode & Owner Panel State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('running_admin_mode') === 'true';
  });
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isAdminPanelModalOpen, setIsAdminPanelModalOpen] = useState<boolean>(false);
  const [globalPushBanner, setGlobalPushBanner] = useState<string | null>(() => {
    return localStorage.getItem('running_push_banner') || null;
  });

  const handleSetGlobalPushBanner = useCallback((text: string | null) => {
    setGlobalPushBanner(text);
    if (text) {
      localStorage.setItem('running_push_banner', text);
    } else {
      localStorage.removeItem('running_push_banner');
    }
  }, []);

  return (
    <UIContext.Provider
      value={{
        showSplash,
        setShowSplash,
        isInputFocused,
        theme,
        setTheme,
        accent,
        setAccent,
        activeTab,
        setActiveTab,
        handleSwitchTab,
        scrollToTop,
        toastMessage,
        showToast,
        hideToast,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        isSimulatorOpen,
        setIsSimulatorOpen,
        isLiveHudOpen,
        setIsLiveHudOpen,
        isRoutePlannerOpen,
        setIsRoutePlannerOpen,
        isPandaModalOpen,
        setIsPandaModalOpen,
        pandaInitialOverlay,
        setPandaInitialOverlay,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isAddRunOpen,
        setIsAddRunOpen,
        isChatDrawerOpen,
        setIsChatDrawerOpen,
        selectedRunForDetail,
        setSelectedRunForDetail,
        isRunDetailOpen,
        setIsRunDetailOpen,
        isAutoSyncMobileOpen,
        setIsAutoSyncMobileOpen,
        mobileDeviceType,
        setMobileDeviceType,
        isAcwrModalOpen,
        setIsAcwrModalOpen,
        isAppleHealthModalOpen,
        setIsAppleHealthModalOpen,
        globalIntegrationApp,
        setGlobalIntegrationApp,
        isPlanRecalibrationOpen,
        setIsPlanRecalibrationOpen,
        planRecalibrationData,
        setPlanRecalibrationData,
        lastAddedRunForRecalibration,
        setLastAddedRunForRecalibration,
        isAdminMode,
        setIsAdminMode,
        isAdminPinModalOpen,
        setIsAdminPinModalOpen,
        isAdminPanelModalOpen,
        setIsAdminPanelModalOpen,
        globalPushBanner,
        handleSetGlobalPushBanner,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
}
