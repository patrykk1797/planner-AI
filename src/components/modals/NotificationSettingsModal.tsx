import React, { useState } from 'react';
import { NotificationSettings, RunnerProfile, TrainingDay, WeatherData } from '../../types.ts';
import {
  requestBrowserNotificationPermission,
  triggerPushNotification,
  triggerParameterImprovementNotification,
  triggerRecoveryCompleteNotification,
} from '../../utils/notificationEngine.ts';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  profile: RunnerProfile;
  plan: TrainingDay[];
  weatherData?: WeatherData;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  showToast: (msg: string) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  profile,
  weatherData,
  onUpdateSettings,
  showToast,
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [isRequestingPerm, setIsRequestingPerm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleToggleMaster = async (enabled: boolean) => {
    let permStatus = localSettings.permissionStatus;
    if (enabled && permStatus !== 'granted') {
      setIsRequestingPerm(true);
      permStatus = await requestBrowserNotificationPermission();
      setIsRequestingPerm(false);
      if (permStatus === 'granted') {
        showToast('🎉 Zgoda na powiadomienia przeglądarkowe została udzielona!');
      } else {
        showToast('⚠️ Powiadomienia w przeglądarce są zablokowane. Użyjemy powiadomień w aplikacji.');
      }
    }
    const updated = { ...localSettings, enabled, permissionStatus: permStatus };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleUpdate = (field: keyof NotificationSettings, val: any) => {
    const updated = { ...localSettings, [field]: val };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-4 animate-ios">
      <div className="liquid-glass w-full max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-[var(--accent)]/40 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30">
              🔔
            </span>
            <div>
              <h2 className="text-base font-black txt-main">Centrum Powiadomień Biegacza</h2>
              <p className="text-[11px] txt-muted">
                Godziny przypomnień, prognoza pogody, poprawa parametrów & regeneracja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Master Switch & Browser Permission Banner */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider accent-text">
                Główny Przełącznik Powiadomień
              </span>
              <div className="text-xs font-bold txt-main mt-0.5">
                {localSettings.enabled ? '🟢 Powiadomienia Aktywne' : '🔴 Powiadomienia Wyłączone'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleMaster(!localSettings.enabled)}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase transition-all shadow-md ${
                localSettings.enabled
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-white/10 txt-sub hover:bg-white/20'
              }`}
            >
              {localSettings.enabled ? 'Włączone ✓' : 'Włącz teraz'}
            </button>
          </div>

          {/* Browser Push Permission State */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌐</span>
              <span className="txt-sub">Uprawnienia przeglądarkowe Push:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  localSettings.permissionStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {localSettings.permissionStatus === 'granted' ? 'Udzielono (Push Banner)' : 'Nieudzielono / Wewnątrz Aplikacji'}
              </span>
            </div>

            {localSettings.permissionStatus !== 'granted' && (
              <button
                type="button"
                disabled={isRequestingPerm}
                onClick={async () => {
                  setIsRequestingPerm(true);
                  const res = await requestBrowserNotificationPermission();
                  setIsRequestingPerm(false);
                  handleUpdate('permissionStatus', res);
                  if (res === 'granted') {
                    showToast('🎉 Zgoda udzielona!');
                  }
                }}
                className="text-[10px] font-bold accent-text hover:underline"
              >
                {isRequestingPerm ? 'Prośba...' : 'Poproś o zgodę Push →'}
              </button>
            )}
          </div>
        </div>

        {/* Schedule & Timing Controls */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
            <span>⏰</span>
            <span>Ustawienia Godzinowe & Harmonogram</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Workout Reminder Hour */}
            <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold txt-main">Godzina Przypomnienia o Treningu</span>
                <span className="text-[10px] accent-text font-mono">24h</span>
              </div>
              <p className="text-[10px] txt-muted">O tej porze otrzymasz powiadomienie o zaplanowanym biegu lub dniu wolnym.</p>
              <input
                type="time"
                value={localSettings.workoutReminderTime || '07:30'}
                onChange={(e) => handleUpdate('workoutReminderTime', e.target.value)}
                className="w-full p-2.5 rounded-xl bg-black/50 border border-white/20 txt-main font-bold font-mono text-sm outline-none"
              />
            </div>

            {/* Weather & AQI Hour */}
            <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold txt-main">Godzina Pogody & Jakości Powietrza</span>
                <span className="text-[10px] accent-text font-mono">Poranek</span>
              </div>
              <p className="text-[10px] txt-muted">Poranny raport z temperaturą i brakiem smogu (AQI) w Twojej lokalizacji ({profile.city}).</p>
              <input
                type="time"
                value={localSettings.weatherNotifyTime || '07:00'}
                onChange={(e) => handleUpdate('weatherNotifyTime', e.target.value)}
                className="w-full p-2.5 rounded-xl bg-black/50 border border-white/20 txt-main font-bold font-mono text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Checkbox Toggles for Special Notifications */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider accent-text flex items-center gap-1.5">
            <span>🎯</span>
            <span>Kategorie i Warunki Powiadomień</span>
          </h3>

          <div className="space-y-2 text-xs">
            {/* 1. Workout & Rest Days */}
            <label className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏋️</span>
                <div>
                  <div className="font-bold txt-main">Zaplanowane Treningi i Dni Odpoczynku</div>
                  <div className="text-[10px] txt-muted">Powiadomienie o godzinie {localSettings.workoutReminderTime} o planie na dzisiejszy dzień.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.notifyOnWorkoutDays}
                onChange={(e) => handleUpdate('notifyOnWorkoutDays', e.target.checked)}
                className="w-4 h-4 accent-color rounded"
              />
            </label>

            {/* 2. Significant Parameter Improvement */}
            <label className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-lg">🚀</span>
                <div>
                  <div className="font-bold txt-main">Znacząca Poprawa Parametrów Formy</div>
                  <div className="text-[10px] txt-muted">Powiadomienie przy wzroście VO2Max, spadku tętna spoczynkowego lub nowym PB na 5km.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.notifyOnParamImprovement}
                onChange={(e) => handleUpdate('notifyOnParamImprovement', e.target.checked)}
                className="w-4 h-4 accent-color rounded"
              />
            </label>

            {/* 3. Recovery Completed */}
            <label className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔋</span>
                <div>
                  <div className="font-bold txt-main">Skończenie Pełnej Regeneracji (100%)</div>
                  <div className="text-[10px] txt-muted">Powiadomienie, gdy czas wypoczynku po akcencie minie i mięśnie są w 100% gotowe.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.notifyOnRecoveryComplete}
                onChange={(e) => handleUpdate('notifyOnRecoveryComplete', e.target.checked)}
                className="w-4 h-4 accent-color rounded"
              />
            </label>

            {/* 4. Weather and Air Quality (AQI) */}
            <label className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-lg">🌤️</span>
                <div>
                  <div className="font-bold txt-main">Pogoda & Jakość Powietrza (AQI)</div>
                  <div className="text-[10px] txt-muted">Temperatura, wiatr oraz ocena smogu w lokalizacji {profile.city}.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.notifyOnWeatherAndAqi}
                onChange={(e) => handleUpdate('notifyOnWeatherAndAqi', e.target.checked)}
                className="w-4 h-4 accent-color rounded"
              />
            </label>
          </div>
        </div>

        {/* Live Test Notification Panel */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent)]/15 to-transparent border border-[var(--accent)]/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider accent-text">
              ⚡ Symulator Powiadomień na Żywo
            </span>
            <span className="text-[10px] txt-muted">Przetestuj banery i dźwięk w przeglądarce</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                triggerPushNotification(
                  '🏋️ Przypomnienie o Treningu',
                  'Dzisiaj w planie: Interwały 6x 800m! Pamiętaj o dynamicznej rozgrzewce.',
                  '🏃',
                  showToast,
                  localSettings.soundEnabled
                );
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold txt-main text-center text-[11px] transition-all"
            >
              🏃 Trening
            </button>

            <button
              type="button"
              onClick={() => {
                triggerParameterImprovementNotification(
                  'Pułap Tlenowy (VO2Max)',
                  profile.vo2max,
                  profile.vo2max + 2,
                  'ml/kg/min',
                  showToast
                );
              }}
              className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-center text-[11px] transition-all"
            >
              🚀 VO2Max (+2)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerRecoveryCompleteNotification(showToast);
              }}
              className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-center text-[11px] transition-all"
            >
              🔋 Regeneracja
            </button>

            <button
              type="button"
              onClick={() => {
                const temp = weatherData ? Math.round(weatherData.temp) : 18;
                const aqi = weatherData ? weatherData.aqi : 19;
                triggerPushNotification(
                  `🌤️ Poranek w ${profile.city}`,
                  `Temperatura ${temp}°C, wiatr 12 km/h. Jakość powietrza: Bardzo dobra (AQI ${aqi}). Idealne warunki!`,
                  '🌤️',
                  showToast,
                  localSettings.soundEnabled
                );
              }}
              className="p-2 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-bold text-center text-[11px] transition-all"
            >
              🌤️ Pogoda & AQI
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl accent-btn-gradient text-xs font-black uppercase tracking-wider shadow-lg"
          >
            Zapisz Ustawienia Powiadomień
          </button>
        </div>
      </div>
    </div>
  );
};
