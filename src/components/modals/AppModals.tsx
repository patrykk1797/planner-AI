import React from 'react';
import { X, Stethoscope } from 'lucide-react';
import { UserAccount } from '../../types.ts';
import { saveStoredAccounts } from '../../utils/accountStorage.ts';
import { calculatePeakPerformance } from '../../utils/runningMath.ts';
import { AcwrExplanationModal } from './AcwrExplanationModal.tsx';
import { ChatView } from '../../views/ChatView.tsx';
import { PandaModal } from './PandaModal.tsx';
import { OnboardingModal } from './OnboardingModal.tsx';
import { AddRunModal } from './AddRunModal.tsx';
import { RunDetailModal } from './RunDetailModal.tsx';
import { AuthModal } from './AuthModal.tsx';
import { AdminPinModal } from './AdminPinModal.tsx';
import { ErrorBoundary } from '../layout/ErrorBoundary.tsx';
import { SUPPORTED_INTEGRATION_APPS } from './AppIntegrationModal.tsx';
import { PlanRecalibrationModal } from './PlanRecalibrationModal.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTrainingData } from '../../contexts/TrainingDataContext.tsx';

const SimulatorModal = React.lazy(() =>
  import('./SimulatorModal.tsx').then((m) => ({ default: m.SimulatorModal }))
);
const LiveRunHUD = React.lazy(() =>
  import('../layout/LiveRunHUD.tsx').then((m) => ({ default: m.LiveRunHUD }))
);
const RoutePlannerModal = React.lazy(() =>
  import('./RoutePlannerModal.tsx').then((m) => ({ default: m.RoutePlannerModal }))
);
const AdminPanelModal = React.lazy(() =>
  import('./AdminPanelModal.tsx').then((m) => ({ default: m.AdminPanelModal }))
);
const AutoSyncMobileModal = React.lazy(() =>
  import('./AutoSyncMobileModal.tsx').then((m) => ({ default: m.AutoSyncMobileModal }))
);
const AppleHealthSyncModal = React.lazy(() =>
  import('./AppleHealthSyncModal.tsx').then((m) => ({ default: m.AppleHealthSyncModal }))
);
const AppIntegrationModal = React.lazy(() =>
  import('./AppIntegrationModal.tsx').then((m) => ({ default: m.AppIntegrationModal }))
);

export const AppModals: React.FC = () => {
  const {
    setActiveTab,
    scrollToTop,
    showToast,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
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
    isRunDetailOpen,
    setIsRunDetailOpen,
    isAutoSyncMobileOpen,
    setIsAutoSyncMobileOpen,
    mobileDeviceType,
    isAcwrModalOpen,
    setIsAcwrModalOpen,
    isAppleHealthModalOpen,
    setIsAppleHealthModalOpen,
    globalIntegrationApp,
    setGlobalIntegrationApp,
    isPlanRecalibrationOpen,
    setIsPlanRecalibrationOpen,
    planRecalibrationData,
    lastAddedRunForRecalibration,
    setIsAdminMode,
    isAdminPinModalOpen,
    setIsAdminPinModalOpen,
    isAdminPanelModalOpen,
    setIsAdminPanelModalOpen,
    globalPushBanner,
    handleSetGlobalPushBanner,
  } = useUI();

  const { accounts, setAccounts, currentUser, setCurrentUser } = useAuth();

  const {
    profile,
    setProfile,
    plan,
    setPlan,
    setPlanSummary,
    runs,
    lastRun,
    shoes,
    races,
    personalBests,
    chatMessages,
    isChatLoading,
    isSubmittingRun,
    runnerPaceMinKm,
    recalibratePlanFromSimulator,
    handleUpdateProfile,
    handleGeneratePlanAI,
    handleSubmitRun,
    handleUpdateRunShoe,
    handleUpdateRunDate,
    handleDeleteRun,
    handleSendMessage,
    handleLoginSuccess,
    registerNewWorkoutInSystem,
    handleEarnBamboos,
    handleToggleUserPro,
    handleAddUserBamboos,
    handleResetUserPlan,
    handleAdminDeleteUser,
    handleAddCustomRace,
    handleDeleteCustomRace,
    handleAddCustomShoe,
    handleDeleteCustomShoe,
  } = useTrainingData();

  return (
    <>
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
                  const updatedPlan = recalibratePlanFromSimulator(up.time5k, plan);
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

      {isChatDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios"
        >
          <div className="liquid-glass w-full max-w-md p-3.5 sm:p-4 space-y-2.5 animate-ios-modal max-h-[92dvh] flex flex-col my-auto border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black txt-main flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                <span>Fizjolog AI • Analiza OCR Planów i Badań</span>
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        existingAccounts={accounts}
        currentAccountId={currentUser?.id || null}
        showToast={showToast}
        initialTab={authModalTab}
      />

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

      {isRoutePlannerOpen && (
        <React.Suspense fallback={null}>
          <RoutePlannerModal
            isOpen={isRoutePlannerOpen}
            onClose={() => setIsRoutePlannerOpen(false)}
            runnerPaceMinKm={runnerPaceMinKm}
            profile={profile}
            showToast={showToast}
          />
        </React.Suspense>
      )}

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

      <AcwrExplanationModal
        isOpen={isAcwrModalOpen}
        onClose={() => setIsAcwrModalOpen(false)}
        currentAcwr={calculatePeakPerformance(runs).acwr}
      />

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
              const currentList =
                profile.connectedApps && profile.connectedApps.length > 0
                  ? profile.connectedApps
                  : SUPPORTED_INTEGRATION_APPS;
              const updated = currentList.map((a) =>
                a.id === appId
                  ? { ...a, connected: !a.connected, lastSync: !a.connected ? 'Właśnie teraz' : undefined }
                  : a
              );
              handleUpdateProfile({ connectedApps: updated });
              setGlobalIntegrationApp((prev) =>
                prev && prev.id === appId ? { ...prev, connected: !prev.connected } : prev
              );
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
    </>
  );
};
