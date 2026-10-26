import React, { useState } from 'react';
import { RunnerProfile, RunLog, HealthBridgeData } from '../../types.ts';
import { performHealthBridgeSync } from '../../utils/healthBridgeParser.ts';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

interface AutoSyncMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceType: 'ios' | 'android' | 'web';
  profile: RunnerProfile;
  onAddSyncedRun: (run: RunLog, updatedPlan?: any, bamboos?: number) => void;
  onUpdateHealthBridge: (data: Partial<HealthBridgeData>) => void;
  showToast: (msg: string) => void;
}

export const AutoSyncMobileModal: React.FC<AutoSyncMobileModalProps> = ({
  isOpen,
  onClose,
  deviceType,
  profile,
  onAddSyncedRun,
  onUpdateHealthBridge,
  showToast,
}) => {
  useLockBodyScroll(isOpen);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  if (!isOpen) return null;

  const isIos = deviceType === 'ios';
  const appName = isIos ? 'Apple Zdrowie (HealthKit)' : 'Google Health Connect (Fit)';
  const deviceName = isIos ? 'iPhone / Apple Watch' : 'Android / Google Pixel';
  const icon = isIos ? '🍎' : '🟢';

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    showToast(`🔄 Połączenie z Mostkiem ${appName}...`);

    try {
      const res = await performHealthBridgeSync(
        isIos ? 'apple' : 'google_fit',
        profile.selectedShoeId ? 'Asics Novablast 4' : 'Nike Pegasus 41'
      );

      onUpdateHealthBridge({
        metrics: res.updatedMetrics,
      });

      if (res.newRun) {
        onAddSyncedRun(res.newRun, undefined, 35);
      }

      setIsSyncing(false);
      showToast(`🎉 Sukces! Zsynchronizowano dane z ${appName}. Pobrano najnowszy bieg (+35 🎋)!`);
      onClose();
    } catch (err) {
      setIsSyncing(false);
      showToast('⚠️ Błąd synchronizacji z Mostkiem Zdrowia.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios">
      <div className="liquid-glass w-full max-w-md p-6 space-y-4 border border-emerald-500/40 shadow-2xl rounded-3xl text-center my-auto max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Header Badge */}
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-3xl mx-auto flex items-center justify-center shadow-lg">
          {icon}
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            Wykryto {deviceName}
          </span>
          <h2 className="text-base font-black txt-main mt-2">
            Automatyczna Synchronizacja Biometrii
          </h2>
          <p className="text-xs txt-sub mt-1 leading-relaxed">
            Zalogowano na urządzeniu mobilnym. Czy chcesz pobrać najnowsze biegi, tętno spoczynkowe i kroki z <strong>{appName}</strong>?
          </p>
        </div>

        {/* Benefits list */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 text-xs">
          <div className="text-[10px] font-bold txt-muted uppercase tracking-wider">
            Co zostanie automatycznie zsynchronizowane:
          </div>
          <ul className="space-y-1.5 txt-main text-[11px]">
            <li className="flex items-center gap-2">
              <span className="accent-text font-black">✓</span>
              <span>Ostatnie treningi biegowe z podziałem na km i tętno</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="accent-text font-black">✓</span>
              <span>Dzienna liczba kroków i aktywne kalorie</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="accent-text font-black">✓</span>
              <span>Tętno spoczynkowe RHR & czas snu (Regeneracja)</span>
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleExecuteSync}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                <span>Synchronizacja w toku...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Tak, Zsynchronizuj i Pobierz Dane Teraz</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl liquid-pill text-xs font-bold txt-sub hover:text-white transition-all"
          >
            Przypomnij później / Pomiń
          </button>
        </div>
      </div>
    </div>
  );
};
