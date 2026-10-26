import { RunLog, HealthBridgeData, HealthSyncMetrics, HealthBridgeSyncRecord } from '../types.ts';

export const DEFAULT_HEALTH_METRICS: HealthSyncMetrics = {
  stepsToday: 0,
  restingHeartRate: 0,
  sleepHours: 0,
  activeCalories: 0,
  vo2MaxEst: 0,
  lastSyncTime: 'Brak synchronizacji',
  sourceDevice: 'Brak podłączonego urządzenia',
};

export const DEFAULT_HEALTH_BRIDGE_DATA: HealthBridgeData = {
  appleHealthConnected: false,
  googleHealthConnected: false,
  autoSyncIntervalMinutes: 15,
  isSyncing: false,
  metrics: DEFAULT_HEALTH_METRICS,
  syncHistory: [],
};

/**
 * Checks if native iOS WebKit HealthKit JS Bridge is present in the browser
 */
export const detectAppleHealthBridge = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    !!(window as any).webkit?.messageHandlers?.healthKitSync ||
    !!(window as any).webkit?.messageHandlers?.healthKit ||
    !!(window as any).AppleHealthBridge
  );
};

/**
 * Checks if Android Health Connect API Bridge is available
 */
export const detectGoogleHealthConnect = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).AndroidHealthConnect;
};

/**
 * Parses Apple Health Export XML string or JSON / CSV content without fabricating fake runs
 */
export const parseAppleHealthExport = (
  content: string,
  shoeName: string = 'Nike Pegasus 41'
): {
  metrics: Partial<HealthSyncMetrics>;
  runs: RunLog[];
  logs: string[];
} => {
  const logs: string[] = [];
  const runs: RunLog[] = [];
  let stepsToday = 0;
  let restingHeartRate = 0;
  let sleepHours = 0;
  let vo2MaxEst = 0;

  logs.push('🔍 Analiza pliku eksportu Apple Zdrowie (HealthKit XML / JSON)...');

  if (content.includes('<HealthData') || content.includes('<Record') || content.includes('<Workout')) {
    logs.push('📄 Wykryto format Apple Health XML.');

    const stepMatches = content.match(/HKQuantityTypeIdentifierStepCount"[^>]*value="(\d+)"/g);
    if (stepMatches && stepMatches.length > 0) {
      let sum = 0;
      stepMatches.slice(-20).forEach((m) => {
        const valMatch = m.match(/value="(\d+)"/);
        if (valMatch) sum += parseInt(valMatch[1], 10);
      });
      if (sum > 0) {
        stepsToday = sum;
        logs.push(`✅ Odczytano rekordy kroków: ${stepsToday.toLocaleString('pl-PL')} kroków`);
      }
    }

    const rhrMatches = content.match(/HKQuantityTypeIdentifierRestingHeartRate"[^>]*value="([\d.]+)"/g);
    if (rhrMatches && rhrMatches.length > 0) {
      const lastRhr = rhrMatches[rhrMatches.length - 1].match(/value="([\d.]+)"/);
      if (lastRhr) {
        restingHeartRate = Math.round(parseFloat(lastRhr[1]));
        logs.push(`❤️ Odczytano tętno spoczynkowe RHR: ${restingHeartRate} bpm`);
      }
    }

    const vo2Matches = content.match(/HKQuantityTypeIdentifierVO2Max"[^>]*value="([\d.]+)"/g);
    if (vo2Matches && vo2Matches.length > 0) {
      const lastVo2 = vo2Matches[vo2Matches.length - 1].match(/value="([\d.]+)"/);
      if (lastVo2) {
        vo2MaxEst = +(parseFloat(lastVo2[1]).toFixed(1));
        logs.push(`🫁 Odczytano pułap tlenowy VO2Max: ${vo2MaxEst} ml/kg/min`);
      }
    }

    const workoutMatches = content.match(/<Workout[^>]*HKWorkoutActivityTypeRunning[^>]*>/g);
    if (workoutMatches && workoutMatches.length > 0) {
      logs.push(`🏃 Znaleziono ${workoutMatches.length} biegów w pliku Apple HealthKit.`);
      workoutMatches.slice(-15).forEach((wXml, idx) => {
        const distM = wXml.match(/totalDistance="([\d.]+)"/);
        const distUnitM = wXml.match(/totalDistanceUnit="([^"]+)"/);
        const durM = wXml.match(/duration="([\d.]+)"/);
        const durUnitM = wXml.match(/durationUnit="([^"]+)"/);
        const dateM = wXml.match(/startDate="([^"]+)"/);
        const energyM = wXml.match(/totalEnergyBurned="([\d.]+)"/);

        if (!distM) return;
        let rawDist = parseFloat(distM[1]);
        if (isNaN(rawDist) || rawDist <= 0) return;

        const distUnit = (distUnitM?.[1] || 'km').toLowerCase();
        if (distUnit === 'm' || rawDist > 200) {
          rawDist = rawDist / 1000;
        } else if (distUnit === 'mi') {
          rawDist = rawDist * 1.60934;
        }
        const distKm = +(rawDist.toFixed(2));

        let rawDur = durM ? parseFloat(durM[1]) : 0;
        const durUnit = (durUnitM?.[1] || 'min').toLowerCase();
        if (durUnit === 's' || durUnit === 'sec' || rawDur > 500) {
          rawDur = rawDur / 60;
        }
        const durMin = rawDur > 0 ? Math.max(1, Math.round(rawDur)) : Math.max(1, Math.round(distKm * 5.5));
        const dateStr = dateM ? dateM[1].split(' ')[0] : new Date().toISOString().split('T')[0];

        const paceSec = Math.round(((rawDur > 0 ? rawDur * 60 : durMin * 60)) / distKm);
        const avgPace = `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, '0')}`;

        runs.push({
          id: `apple-hk-export-${dateStr}-${idx}`,
          title: `Bieg z Apple Watch (HealthKit) • ${distKm} km`,
          sourceApp: 'apple',
          date: dateStr,
          distanceKm: distKm,
          durationMin: durMin,
          avgPace,
          avgHr: 0,
          avgCadence: 0,
          elevationGainM: 0,
          calories: energyM ? Math.round(parseFloat(energyM[1])) : Math.round(distKm * 65),
          shoeName,
          notes: 'Zaimportowano z pliku export.xml Apple Zdrowie.',
        });
      });
    }
  } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    logs.push('📄 Wykryto format JSON Apple Health / HealthKit Export.');
    try {
      const parsed = JSON.parse(content);
      if (parsed.metrics) {
        stepsToday = Number(parsed.metrics.steps) || 0;
        restingHeartRate = Number(parsed.metrics.rhr) || 0;
        sleepHours = Number(parsed.metrics.sleep) || 0;
        vo2MaxEst = Number(parsed.metrics.vo2Max) || 0;
        logs.push('✅ Pomyślnie przetworzono pola JSON biometrii.');
      }
      const workoutsArr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.workouts) ? parsed.workouts : [];
      workoutsArr.forEach((w: any, i: number) => {
        const distKm = Number(w.distanceKm ?? w.totalDistanceKm ?? (w.distance ? w.distance / 1000 : 0));
        if (!distKm || distKm <= 0) return;
        const durMin = Number(w.durationMin ?? (w.durationSeconds ? Math.round(w.durationSeconds / 60) : Math.round(distKm * 5.5)));
        const paceSec = Math.round((durMin * 60) / distKm);
        runs.push({
          id: `apple-json-${Date.now()}-${i}`,
          title: w.title || `Bieg z Apple Watch • ${distKm} km`,
          sourceApp: 'apple',
          date: (w.date || w.startDate || new Date().toISOString()).split('T')[0],
          distanceKm: +(distKm.toFixed(2)),
          durationMin: Math.max(1, durMin),
          avgPace: w.avgPace || `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, '0')}`,
          avgHr: Number(w.avgHr || w.averageHeartRateBpm) || 0,
          avgCadence: Number(w.avgCadence || w.averageCadenceSpm) || 0,
          shoeName,
          notes: 'Zaimportowano z pliku JSON Apple Health.',
        });
      });
    } catch {
      throw new Error('Nieprawidłowy plik JSON eksportu Apple Zdrowie.');
    }
  }

  if (runs.length === 0 && stepsToday === 0 && restingHeartRate === 0) {
    throw new Error(
      'W wybranym pliku nie znaleziono treningów biegowych (HKWorkoutActivityTypeRunning) ani rekordów biometrii Apple Zdrowie.'
    );
  }

  logs.push(`🎉 Przetworzono dane Apple Zdrowie (znaleziono biegów: ${runs.length}).`);

  return {
    metrics: {
      ...(stepsToday > 0 ? { stepsToday } : {}),
      ...(restingHeartRate > 0 ? { restingHeartRate } : {}),
      ...(sleepHours > 0 ? { sleepHours } : {}),
      ...(vo2MaxEst > 0 ? { vo2MaxEst } : {}),
      lastSyncTime: 'Dzisiaj, ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      sourceDevice: 'Import pliku Apple Zdrowie',
    },
    runs,
    logs,
  };
};

/**
 * Queries real native bridge for Apple Health or Google Health Connect if running in native wrapper;
 * rejects in standard web browser instead of fabricating random workouts.
 */
export const performHealthBridgeSync = async (
  source: 'apple' | 'google_fit',
  shoeName: string = 'Asics Novablast 4'
): Promise<{
  updatedMetrics: HealthSyncMetrics;
  newRun?: RunLog;
  syncRecord: HealthBridgeSyncRecord;
  message: string;
}> => {
  const isApple = source === 'apple';
  const nativeBridge = isApple
    ? (window as any).AppleHealthBridge
    : (window as any).AndroidHealthConnect;

  if (!nativeBridge || typeof nativeBridge.syncWorkouts !== 'function') {
    throw new Error(
      isApple
        ? 'Bezpośredni odczyt HealthKit wymaga natywnego kontenera iOS lub Skrótu iPhone (Webhook). W przeglądarce użyj importu pliku export.xml / GPX lub Skanera Zrzutów Ekranu AI.'
        : 'Bezpośredni odczyt Google Health Connect wymaga natywnego mostka Android. W przeglądarce zaimportuj plik GPX/TCX/CSV lub użyj Skanera Zrzutów Ekranu AI.'
    );
  }

  const bridgeData = await nativeBridge.syncWorkouts({ shoeName });
  if (!bridgeData || !bridgeData.run) {
    throw new Error('Natywny mostek nie zwrócił żadnych nowych treningów biegowych.');
  }

  return bridgeData;
};

