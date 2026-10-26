import { RunLog, HealthSyncMetrics } from '../types.ts';

export interface HKQuantityValue {
  quantity: number;
  unit: string; // 'km' | 'm' | 'count/min' | 'kcal' | 'kg' | 'steps'
}

export interface HKWorkoutSplit {
  kmNumber: number;
  paceMinKm: string;
  avgHrBpm?: number;
  elevationMeters?: number;
}

export interface HKRunningWorkoutSample {
  uuid?: string;
  workoutActivityType?: 'HKWorkoutActivityTypeRunning' | string;
  startDate: string; // ISO format or Date string
  endDate?: string;
  durationSeconds: number; // Duration in seconds
  totalDistanceKm?: number; // Distance in KM
  totalDistanceMeters?: number; // Distance in Meters
  totalEnergyBurnedKcal?: number; // Active calories
  averageHeartRateBpm?: number; // Avg HR
  maximumHeartRateBpm?: number; // Max HR
  averageCadenceSpm?: number; // Cadence (steps per min)
  elevationGainMeters?: number; // Elevation gain
  splits?: HKWorkoutSplit[];
  sourceName?: string; // e.g. "Apple Watch Ultra 2"
  notes?: string;
}

export interface HKBiometricMetricsSample {
  restingHeartRateBpm?: number;
  vo2MaxMlKgMin?: number;
  stepsTodayCount?: number;
  bodyMassKg?: number;
  activeEnergyBurnedKcal?: number;
  sleepHoursCount?: number;
  lastSyncTimeIso?: string;
}

export interface HealthKitDelegateConfig {
  onAuthSuccess?: (message: string) => void;
  onWorkoutsReceived?: (runs: RunLog[], rawWorkoutsCount: number) => void;
  onBiometricsReceived?: (metrics: HealthSyncMetrics) => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Maps a raw iOS HealthKit running workout sample directly into Treda's RunLog format
 */
export const mapHealthKitWorkoutToRunLog = (
  hk: HKRunningWorkoutSample,
  shoeName: string = 'Nike Pegasus 41'
): RunLog => {
  // 1. Calculate distance in km
  let distKm = 0;
  if (typeof hk.totalDistanceKm === 'number' && hk.totalDistanceKm > 0) {
    distKm = hk.totalDistanceKm;
  } else if (typeof hk.totalDistanceMeters === 'number' && hk.totalDistanceMeters > 0) {
    distKm = hk.totalDistanceMeters / 1000;
  } else {
    distKm = 5.0; // default fallback if missing
  }
  distKm = Number(distKm.toFixed(2));

  // 2. Calculate duration in minutes
  const durSec = hk.durationSeconds && hk.durationSeconds > 0 ? hk.durationSeconds : distKm * 310;
  const durationMin = Math.max(1, Math.round(durSec / 60));

  // 3. Compute pace (MM:SS /km)
  const paceTotalSecPerKm = distKm > 0 ? Math.round(durSec / distKm) : 300;
  const paceMinutes = Math.floor(paceTotalSecPerKm / 60);
  const paceSeconds = Math.round(paceTotalSecPerKm % 60);
  const avgPace = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds}`;

  // 4. Format ISO date YYYY-MM-DD
  let dateStr = new Date().toISOString().split('T')[0];
  try {
    if (hk.startDate) {
      dateStr = new Date(hk.startDate).toISOString().split('T')[0];
    }
  } catch {}

  // 5. Map splits
  const mappedSplits = (hk.splits || []).map((s) => ({
    km: s.kmNumber,
    pace: s.paceMinKm,
    hr: s.avgHrBpm || hk.averageHeartRateBpm || 150,
    elevation: s.elevationMeters || 5,
  }));

  const rawId = hk.uuid || `hk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: rawId.startsWith('apple-') ? rawId : `apple-${rawId}`,
    title: `Bieg z Apple Watch (HealthKit) • ${distKm} km`,
    sourceApp: 'apple',
    date: dateStr,
    distanceKm: distKm,
    durationMin,
    avgPace,
    avgHr: hk.averageHeartRateBpm ? Math.round(hk.averageHeartRateBpm) : 152,
    maxHr: hk.maximumHeartRateBpm ? Math.round(hk.maximumHeartRateBpm) : 172,
    avgCadence: hk.averageCadenceSpm ? Math.round(hk.averageCadenceSpm) : 176,
    elevationGainM: hk.elevationGainMeters != null ? Math.round(hk.elevationGainMeters) : 38,
    calories: hk.totalEnergyBurnedKcal ? Math.round(hk.totalEnergyBurnedKcal) : Math.round(distKm * 65),
    shoeName,
    notes: hk.notes || `Pobrane automatycznie z Apple Zdrowie przez JS HealthKit Delegate (${hk.sourceName || 'iOS Health'}).`,
    splits: mappedSplits,
  };
};

/**
 * Initializes and registers global window delegates for iOS HealthKit WKWebView communication
 */
export const registerGlobalHealthKitDelegates = (config: HealthKitDelegateConfig): void => {
  if (typeof window === 'undefined') return;

  // Define global delegate namespace on window
  (window as any).AppleHealthKitDelegate = {
    onAuthSuccess: (msg: string) => {
      console.log('🍏 [HealthKit Delegate] Auth Success:', msg);
      if (config.onAuthSuccess) config.onAuthSuccess(msg);
    },

    onWorkoutsReceived: (rawWorkouts: HKRunningWorkoutSample[]) => {
      console.log('🍏 [HealthKit Delegate] Received Workouts:', rawWorkouts);
      if (Array.isArray(rawWorkouts)) {
        const mapped = rawWorkouts.map((w) => mapHealthKitWorkoutToRunLog(w));
        if (config.onWorkoutsReceived) {
          config.onWorkoutsReceived(mapped, rawWorkouts.length);
        }
      }
    },

    onBiometricsReceived: (rawBiometrics: HKBiometricMetricsSample) => {
      console.log('🍏 [HealthKit Delegate] Received Biometrics:', rawBiometrics);
      const metrics: HealthSyncMetrics = {
        stepsToday: rawBiometrics.stepsTodayCount ?? 0,
        restingHeartRate: rawBiometrics.restingHeartRateBpm ?? 0,
        sleepHours: rawBiometrics.sleepHoursCount ?? 0,
        activeCalories: rawBiometrics.activeEnergyBurnedKcal ?? 0,
        vo2MaxEst: rawBiometrics.vo2MaxMlKgMin ?? 0,
        lastSyncTime: 'Dzisiaj, ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        sourceDevice: 'Apple Watch & iOS HealthKit',
      };
      if (config.onBiometricsReceived) {
        config.onBiometricsReceived(metrics);
      }
    },

    onError: (errMessage: string) => {
      console.error('🍏 [HealthKit Delegate] Error:', errMessage);
      if (config.onError) config.onError(errMessage);
    },
  };

  // Bind top-level window helper callbacks for iOS WebKit handlers
  (window as any).onHealthKitWorkoutsReceived = (data: any) => {
    const workouts = Array.isArray(data) ? data : data?.workouts || [];
    (window as any).AppleHealthKitDelegate.onWorkoutsReceived(workouts);
  };

  (window as any).onHealthKitBiometricsReceived = (data: any) => {
    (window as any).AppleHealthKitDelegate.onBiometricsReceived(data);
  };

  (window as any).onHealthKitAuthStatus = (status: any) => {
    (window as any).AppleHealthKitDelegate.onAuthSuccess(
      typeof status === 'string' ? status : 'Uprawnienia HealthKit zostały przyznane.'
    );
  };
};

/**
 * Triggers iOS Native WebKit message handler if available
 */
export const requestIosHealthKitPermissionBridge = (): boolean => {
  if (typeof window === 'undefined') return false;

  const nativeHandler =
    (window as any).webkit?.messageHandlers?.healthKit ||
    (window as any).webkit?.messageHandlers?.healthKitDelegate ||
    (window as any).AppleHealthKit;

  if (nativeHandler && typeof nativeHandler.postMessage === 'function') {
    nativeHandler.postMessage({
      action: 'requestAuthorizationAndFetchWorkouts',
      permissions: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierVO2Max',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKWorkoutTypeIdentifierRunning',
      ],
      callbackDelegate: 'window.AppleHealthKitDelegate',
    });
    return true;
  }

  return false;
};
