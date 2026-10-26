import { useMemo, useCallback } from 'react';
import { RunnerProfile, RunLog, TrainingDay, PersonalBest } from '../types.ts';
import {
  calculateDynamicVo2Max,
  calculatePeakPerformance,
  calculateReadinessBattery,
  time5kToSeconds,
  formatSecondsToTime,
} from '../utils/runningMath.ts';
import {
  checkAndUpdatePersonalBests,
  recalculateAllPersonalBests,
  calculateRunRewards,
  computeRunnerTelemetry,
} from '../utils/physiologicalEngine.ts';
import { computePhysiologicalPlanAdaptation } from '../utils/physiologicalPlanAdaptation.ts';

export function useTrainingCalculator(
  profile: RunnerProfile,
  runs: RunLog[],
  plan: TrainingDay[],
  personalBests: PersonalBest[]
) {
  const dynamicVo2Max = useMemo(
    () => calculateDynamicVo2Max(profile, runs),
    [profile, runs]
  );

  const peakPerformance = useMemo(
    () => calculatePeakPerformance(runs),
    [runs]
  );

  const readinessBattery = useMemo(
    () => calculateReadinessBattery(runs, profile),
    [runs, profile]
  );

  const runnerTelemetry = useMemo(
    () => computeRunnerTelemetry(profile, runs),
    [profile, runs]
  );

  const runnerPaceMinKm = useMemo(() => {
    if (!profile.time5k) return '5:30';
    return formatSecondsToTime(Math.round(time5kToSeconds(profile.time5k) / 5));
  }, [profile.time5k]);

  const recalibratePlanFromSimulator = useCallback(
    (time5k: string, currentPlan: TrainingDay[]): TrainingDay[] => {
      const parts = time5k.split(':').map(Number);
      const sec5k = parts.length === 2 ? parts[0] * 60 + parts[1] : 1500;
      const paceSecPerKm = Math.round(sec5k / 5);
      const formatPace = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s} /km`;
      };

      return currentPlan.map((day) => {
        if (day.distanceKm === 0) return day;
        const typeLower = day.type.toLowerCase();
        if (typeLower.includes('interwał') || typeLower.includes('szybk') || typeLower.includes('rytm')) {
          return { ...day, targetPace: formatPace(Math.max(180, paceSecPerKm - 15)) };
        }
        if (typeLower.includes('tempo') || typeLower.includes('próg')) {
          return { ...day, targetPace: formatPace(paceSecPerKm + 10) };
        }
        return { ...day, targetPace: formatPace(paceSecPerKm + 45) };
      });
    },
    []
  );

  return {
    dynamicVo2Max,
    peakPerformance,
    readinessBattery,
    runnerTelemetry,
    runnerPaceMinKm,
    recalibratePlanFromSimulator,
    calculateRunRewards,
    checkAndUpdatePersonalBests: (run: RunLog) => checkAndUpdatePersonalBests(run, personalBests),
    recalculateAllPersonalBests: (nextRuns: RunLog[]) => recalculateAllPersonalBests(nextRuns, personalBests),
    computePhysiologicalPlanAdaptation: (
      currentPlan: TrainingDay[],
      runData: Omit<RunLog, 'id' | 'coachFeedback'>,
      targetProfile: RunnerProfile
    ) => computePhysiologicalPlanAdaptation(currentPlan, runData, targetProfile),
  };
}
