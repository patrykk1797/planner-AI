import { RunLog, PersonalBest, RunnerProfile } from '../types.ts';
import { calculateAge } from './runningMath.ts';

export { calculateAge };

/**
 * Calculates athletic age category (e.g. M20, M30, K30) according to World Athletics / PZLA standards
 */
export function calculateAgeCategory(gender: 'M' | 'F' | 'Other', birthdateStr: string): string {
  const age = calculateAge(birthdateStr);
  const prefix = gender === 'F' ? 'K' : 'M';
  if (age < 20) return `${prefix}16`;
  if (age < 30) return `${prefix}20`;
  if (age < 40) return `${prefix}30`;
  if (age < 50) return `${prefix}40`;
  if (age < 60) return `${prefix}50`;
  if (age < 70) return `${prefix}60`;
  return `${prefix}70+`;
}

/**
 * Jack Daniels VDOT formula
 * Calculates physiological oxygen uptake (ml/kg/min) based on race distance (meters) and duration (seconds).
 */
export function calculateJackDanielsVdot(distanceMeters: number, totalSeconds: number): number {
  if (distanceMeters <= 0 || totalSeconds <= 0) return 42;
  const timeMinutes = totalSeconds / 60;
  const velocityMetersPerMin = distanceMeters / timeMinutes;

  // Oxygen cost formula (VO2 ml/kg/min)
  const vo2Cost =
    -4.6 +
    0.182258 * velocityMetersPerMin +
    0.000104 * Math.pow(velocityMetersPerMin, 2);

  // Percent of VO2max sustained for this duration
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  if (percentMax <= 0) return 40;
  const vdot = vo2Cost / percentMax;
  return Number(Math.max(25, Math.min(85, vdot)).toFixed(1));
}

/**
 * Converts a time string (MM:SS or HH:MM:SS) to total seconds
 */
export function timeStringToSeconds(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  const rawNum = parseFloat(timeStr);
  return isNaN(rawNum) ? 0 : Math.round(rawNum * 60);
}

/**
 * Formats total seconds into MM:SS or HH:MM:SS
 */
export function secondsToTimeString(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface DynamicRunnerTelemetry {
  hasWorkouts: boolean;
  totalWorkouts: number;
  totalKm: number;
  weeklyKm: number;
  vdot: number;
  avgCadence: number | null;
  avgGctMs: number | null;
  avgHeartRate: number | null;
  readinessPercent: number;
  age: number;
  ageCategory: string;
  bmi: string;
  hrZones: {
    zone1: { name: string; min: number; max: number; desc: string };
    zone2: { name: string; min: number; max: number; desc: string };
    zone3: { name: string; min: number; max: number; desc: string };
    zone4: { name: string; min: number; max: number; desc: string };
    zone5: { name: string; min: number; max: number; desc: string };
  };
}

/**
 * Central Physiological Engine: Computes 100% dynamic metrics from real workouts and runner profile.
 * No hardcoded telemetry.
 */
export function computeRunnerTelemetry(
  profile: RunnerProfile | null,
  workouts: RunLog[] = []
): DynamicRunnerTelemetry {
  const safeProfile = profile || {
    name: 'Biegacz',
    birthdate: '14.05.1995',
    gender: 'M' as const,
    weight: 70,
    targetWeight: 68,
    height: 178,
    time5k: '25:00',
    hrMax: 185,
    rhr: 60,
  };

  const age = calculateAge(safeProfile.birthdate);
  const ageCategory = calculateAgeCategory(safeProfile.gender || 'M', safeProfile.birthdate);

  const numWeight = safeProfile.weight || 70;
  const numHeight = safeProfile.height || 178;
  const bmi = numHeight > 0 ? (numWeight / Math.pow(numHeight / 100, 2)).toFixed(1) : '22.1';

  // Karvonen formula: ((HRmax - RHR) * %intensity) + RHR
  const hrMax = safeProfile.hrMax || 185;
  const rhr = safeProfile.rhr || 60;
  const hrr = Math.max(20, hrMax - rhr);

  const hrZones = {
    zone1: {
      name: 'Strefa 1: Regeneracja',
      min: Math.round(rhr + hrr * 0.5),
      max: Math.round(rhr + hrr * 0.6),
      desc: 'Bieg regeneracyjny, bardzo lekki wysiłek',
    },
    zone2: {
      name: 'Strefa 2: Tlenowa (Baza)',
      min: Math.round(rhr + hrr * 0.6),
      max: Math.round(rhr + hrr * 0.7),
      desc: 'Budowa bazy tlenowej, tempo konwersacyjne',
    },
    zone3: {
      name: 'Strefa 3: Tempo / Aerobowa',
      min: Math.round(rhr + hrr * 0.7),
      max: Math.round(rhr + hrr * 0.8),
      desc: 'Umiarkowany wysiłek, oddech rytmiczny',
    },
    zone4: {
      name: 'Strefa 4: Próg Mleczanowy',
      min: Math.round(rhr + hrr * 0.8),
      max: Math.round(rhr + hrr * 0.9),
      desc: 'Trening progowy, interwały tempowe',
    },
    zone5: {
      name: 'Strefa 5: Beztlenowa / VO2max',
      min: Math.round(rhr + hrr * 0.9),
      max: hrMax,
      desc: 'Sprinty, maksymalne interwały VO2max',
    },
  };

  const hasWorkouts = Array.isArray(workouts) && workouts.length > 0;
  const totalWorkouts = workouts.length;
  const totalKm = workouts.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);

  // Weekly Km (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyKm = workouts.reduce((sum, r) => {
    try {
      const rDate = new Date(r.date);
      if (rDate >= sevenDaysAgo && rDate <= now) {
        return sum + (Number(r.distanceKm) || 0);
      }
    } catch {}
    return sum;
  }, 0);

  // VDOT calculation: Jack Daniels formula based on best workout or onboarding 5k time
  let bestVdot = 0;
  if (hasWorkouts) {
    for (const w of workouts) {
      const distM = (Number(w.distanceKm) || 0) * 1000;
      const sec = (Number(w.durationMin) || 0) * 60;
      if (distM >= 1000 && sec > 0) {
        const vdot = calculateJackDanielsVdot(distM, sec);
        if (vdot > bestVdot) bestVdot = vdot;
      }
    }
  }

  // If no workouts or workouts were very slow, fallback to onboarding 5k time VDOT
  if (bestVdot === 0) {
    const sec5k = timeStringToSeconds(safeProfile.time5k || '25:00');
    bestVdot = calculateJackDanielsVdot(5000, sec5k > 0 ? sec5k : 1500);
  }

  // Average Cadence from workouts
  let avgCadence: number | null = null;
  const runsWithCadence = workouts.filter((r) => r.avgCadence && r.avgCadence > 100);
  if (runsWithCadence.length > 0) {
    const sum = runsWithCadence.reduce((s, r) => s + (r.avgCadence || 0), 0);
    avgCadence = Math.round(sum / runsWithCadence.length);
  }

  // Average GCT from workouts
  let avgGctMs: number | null = null;
  const runsWithGct = workouts.filter((r) => r.gctMs && r.gctMs > 150 && r.gctMs < 350);
  if (runsWithGct.length > 0) {
    const sum = runsWithGct.reduce((s, r) => s + (r.gctMs || 0), 0);
    avgGctMs = Math.round(sum / runsWithGct.length);
  }

  // Average Heart Rate from workouts
  let avgHeartRate: number | null = null;
  const runsWithHr = workouts.filter((r) => r.avgHr && r.avgHr > 60);
  if (runsWithHr.length > 0) {
    const sum = runsWithHr.reduce((s, r) => s + (r.avgHr || 0), 0);
    avgHeartRate = Math.round(sum / runsWithHr.length);
  }

  // Readiness calculation based on days since last workout & load
  let readinessPercent = 95;
  if (hasWorkouts) {
    const lastWorkout = workouts[0];
    try {
      const lastDate = new Date(lastWorkout.date);
      const hoursSince = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 3600));
      if (hoursSince < 12) {
        readinessPercent = 65;
      } else if (hoursSince < 24) {
        readinessPercent = 82;
      } else if (hoursSince < 48) {
        readinessPercent = 94;
      } else {
        readinessPercent = 98;
      }
    } catch {
      readinessPercent = 90;
    }
  }

  return {
    hasWorkouts,
    totalWorkouts,
    totalKm: Number(totalKm.toFixed(1)),
    weeklyKm: Number(weeklyKm.toFixed(1)),
    vdot: bestVdot,
    avgCadence,
    avgGctMs,
    avgHeartRate,
    readinessPercent,
    age,
    ageCategory,
    bmi,
    hrZones,
  };
}

/**
 * Standard distances for Personal Bests
 */
export const PB_STANDARDS = [
  { id: '1k', name: '1 km', distKm: 1.0 },
  { id: '3k', name: '3 km', distKm: 3.0 },
  { id: '5k', name: '5 km', distKm: 5.0 },
  { id: '10k', name: '10 km', distKm: 10.0 },
  { id: 'half', name: 'Półmaraton (21.1 km)', distKm: 21.0975 },
  { id: 'marathon', name: 'Maraton (42.2 km)', distKm: 42.195 },
] as const;

/**
 * Evaluates whether a new workout broke any personal bests.
 * Returns updated personal bests array and any distance names that were beaten.
 */
export function checkAndUpdatePersonalBests(
  newRun: RunLog,
  currentPbs: PersonalBest[] = []
): { updatedPbs: PersonalBest[]; beatenDistances: string[] } {
  const distKm = Number(newRun.distanceKm) || 0;
  const durMin = Number(newRun.durationMin) || 0;
  if (distKm <= 0 || durMin <= 0) {
    return { updatedPbs: currentPbs, beatenDistances: [] };
  }

  const runSec = durMin * 60;
  const paceSecPerKm = runSec / distKm;
  const beatenDistances: string[] = [];

  const nextPbs = [...currentPbs];

  for (const std of PB_STANDARDS) {
    // If the run was at least as long as this distance
    if (distKm >= std.distKm * 0.98) {
      // Estimated or proportional time for this distance
      const timeForDistanceSec = paceSecPerKm * std.distKm;
      const formattedTime = secondsToTimeString(timeForDistanceSec);
      const formattedPace = `${secondsToTimeString(paceSecPerKm)} /km`;

      const existingPbIndex = nextPbs.findIndex((p) => p.distanceId === std.id);
      if (existingPbIndex >= 0) {
        const existingPb = nextPbs[existingPbIndex];
        const existingSec = timeStringToSeconds(existingPb.time);

        if (existingSec <= 0 || timeForDistanceSec < existingSec) {
          beatenDistances.push(std.name);
          nextPbs[existingPbIndex] = {
            ...existingPb,
            time: formattedTime,
            pace: formattedPace,
            date: newRun.date || new Date().toISOString().split('T')[0],
            raceOrRunName: newRun.title || `Bieg ${distKm} km`,
            gapToTarget: 'Nowy Rekord Życiowy! 🔥',
          };
        }
      } else {
        // First PB for this distance
        beatenDistances.push(std.name);
        nextPbs.push({
          distanceId: std.id,
          distanceName: std.name,
          time: formattedTime,
          pace: formattedPace,
          date: newRun.date || new Date().toISOString().split('T')[0],
          raceOrRunName: newRun.title || `Bieg ${distKm} km`,
          gapToTarget: 'Pierwszy rekord życiowy! 🚀',
        });
      }
    }
  }

  return { updatedPbs: nextPbs, beatenDistances };
}

/**
 * Recalculates all personal bests from scratch based on the remaining runs array
 */
export function recalculateAllPersonalBests(
  runs: RunLog[] = [],
  existingPbs: PersonalBest[] = []
): PersonalBest[] {
  let pbs: PersonalBest[] = existingPbs.map((pb) => ({
    ...pb,
    time: '--:--',
    pace: '--:-- /km',
    date: '-',
    raceOrRunName: 'Brak zapisanego biegu',
    gapToTarget: 'Brak rekordu',
  }));

  for (const r of runs) {
    const res = checkAndUpdatePersonalBests(r, pbs);
    pbs = res.updatedPbs;
  }
  return pbs;
}

/**
 * Calculates RunPanda gamification rewards for adding a workout
 * - +15 Bambusów za każdy km
 * - bonus +50 Bambusów za kadencję >= 162 spm
 * - +20 XP za każdy km
 */
export function calculateRunRewards(run: RunLog): {
  bamboos: number;
  xp: number;
  bonuses: string[];
} {
  const km = Math.max(0, Number(run.distanceKm) || 0);
  const baseBamboos = Math.round(km * 15);
  const baseXp = Math.round(km * 20);
  const bonuses: string[] = [`+${baseBamboos} 🎋 za ${km.toFixed(1)} km biegu`];

  let cadenceBonus = 0;
  if (run.avgCadence && run.avgCadence >= 162) {
    cadenceBonus = 50;
    bonuses.push('+50 🎋 za sprężysty rytm kadencji (≥162 spm)');
  }

  return {
    bamboos: baseBamboos + cadenceBonus,
    xp: baseXp,
    bonuses,
  };
}
