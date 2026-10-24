import { NotificationSettings, RunnerProfile, TrainingDay, WeatherData } from '../types.ts';
import { soundEngine } from './defaults.ts';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  permissionStatus: typeof window !== 'undefined' && 'Notification' in window ? (Notification.permission as any) : 'default',
  workoutReminderTime: '07:30',
  notifyOnWorkoutDays: true,
  notifyOnRestDays: true,
  notifyOnParamImprovement: true,
  notifyOnRecoveryComplete: true,
  notifyOnWeatherAndAqi: true,
  weatherNotifyTime: '07:00',
  soundEnabled: true,
  lastNotified: {},
};

/**
 * Requests browser Web Notification permissions
 */
export const requestBrowserNotificationPermission = async (): Promise<'granted' | 'denied' | 'default'> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result as 'granted' | 'denied' | 'default';
  } catch (err) {
    console.warn('Browser notification permission error:', err);
    return 'denied';
  }
};

/**
 * Sends a native browser push notification or falls back to in-app notification
 */
export const triggerPushNotification = (
  title: string,
  body: string,
  icon: string = '🏃',
  showToast?: (msg: string) => void,
  soundEnabled: boolean = true
) => {
  if (soundEnabled) {
    soundEngine.playSuccess();
  }

  // Native Browser Web Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=128&auto=format&fit=crop&q=80',
        badge: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=128&auto=format&fit=crop&q=80',
        tag: `runpanda-${Date.now()}`,
      });
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }

  // In-app toast banner fallback
  if (showToast) {
    showToast(`${icon} ${title}: ${body}`);
  }
};

/**
 * Evaluates whether any scheduled or condition-based notifications should fire
 */
export const checkAndTriggerNotifications = (
  settings: NotificationSettings,
  profile: RunnerProfile,
  plan: TrainingDay[],
  weatherData?: WeatherData,
  showToast?: (msg: string) => void
): { updatedSettings: NotificationSettings; firedCount: number } => {
  if (!settings.enabled) return { updatedSettings: settings, firedCount: 0 };

  const now = new Date();
  const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const todayDateStr = now.toISOString().split('T')[0];
  const dayNamePL = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'][now.getDay()];

  let fired = 0;
  const lastNotified = { ...settings.lastNotified };

  // 1. Scheduled Workout or Rest Day Reminder
  if (
    currentHHMM === settings.workoutReminderTime &&
    lastNotified.workout !== todayDateStr
  ) {
    const todayPlan = plan.find((p) => p.dayShort.toLowerCase() === dayNamePL.toLowerCase() || p.dayName.toLowerCase().includes(dayNamePL.toLowerCase()));
    
    if (todayPlan && todayPlan.type !== 'Regeneracja' && settings.notifyOnWorkoutDays) {
      triggerPushNotification(
        '🏋️ Powiadomienie o Treningu',
        `Dzisiaj zaplanowano: ${todayPlan.type} (${todayPlan.distanceKm} km)! Czas na rozgrzewkę.`,
        '🏃',
        showToast,
        settings.soundEnabled
      );
      lastNotified.workout = todayDateStr;
      fired++;
    } else if ((!todayPlan || todayPlan.type === 'Regeneracja') && settings.notifyOnRestDays) {
      triggerPushNotification(
        '💤 Dzień Odpoczynku & Regeneracji',
        'Dzisiaj dzień regeneracji. Zadbaj o sen, rolowanie i nawodnienie!',
        '🧘',
        showToast,
        settings.soundEnabled
      );
      lastNotified.workout = todayDateStr;
      fired++;
    }
  }

  // 2. Weather & Air Quality (AQI) Notification
  if (
    settings.notifyOnWeatherAndAqi &&
    currentHHMM === settings.weatherNotifyTime &&
    lastNotified.weather !== todayDateStr
  ) {
    const city = profile.city || 'Zgierz';
    const temp = weatherData ? Math.round(weatherData.temp) : 17;
    const aqi = weatherData ? weatherData.aqi : 22;
    const aqiText = aqi <= 50 ? 'Czyste powietrze (Brak smogu)' : 'Umiarkowane AQI';

    triggerPushNotification(
      `🌤️ Pogoda w ${city}`,
      `Temperatura: ${temp}°C • ${aqiText} (AQI: ${aqi}). Świetny czas na trening na zewnątrz!`,
      '🌤️',
      showToast,
      settings.soundEnabled
    );
    lastNotified.weather = todayDateStr;
    fired++;
  }

  return {
    updatedSettings: {
      ...settings,
      lastNotified,
    },
    firedCount: fired,
  };
};

/**
 * Explicit trigger helper for testing parameter improvement notification
 */
export const triggerParameterImprovementNotification = (
  paramName: string,
  oldVal: string | number,
  newVal: string | number,
  unit: string,
  showToast?: (msg: string) => void
) => {
  triggerPushNotification(
    '🚀 Znacząca Poprawa Parametru!',
    `Twoje ${paramName} uległo poprawie z ${oldVal} ${unit} do ${newVal} ${unit}! Trener AI gratuluje progresu! 🎉`,
    '📈',
    showToast,
    true
  );
};

/**
 * Explicit trigger helper for recovery complete notification
 */
export const triggerRecoveryCompleteNotification = (showToast?: (msg: string) => void) => {
  triggerPushNotification(
    '🔋 Pełna Regeneracja Osiągnięta (100%)',
    'Twój poziom mikrouszkodzeń mięśniowych spadł do zera. Organizm jest w 100% gotowy na mocne akcenty i rekordy!',
    '⚡',
    showToast,
    true
  );
};
