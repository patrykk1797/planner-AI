import type { RunLog, RunnerProfile } from './runningMath.ts';
import { formatSecondsToTime, calculateDynamicVo2Max } from './runningMath.ts';

export interface TargetDistanceOption {
  key: string;
  label: string;
  distanceKm: number;
  category: '5k' | '10k' | 'half' | 'marathon' | 'custom';
}

export const STANDARD_DISTANCES: TargetDistanceOption[] = [
  { key: '5k', label: '5 km (Szybka Piątka)', distanceKm: 5.0, category: '5k' },
  { key: '10k', label: '10 km (Atestowana Dycha)', distanceKm: 10.0, category: '10k' },
  { key: 'half', label: 'Półmaraton (21.097 km)', distanceKm: 21.0975, category: 'half' },
  { key: 'marathon', label: 'Królewski Maraton (42.195 km)', distanceKm: 42.195, category: 'marathon' },
];

export interface FitnessAnalysisResult {
  targetDistanceKm: number;
  currentVo2Max: number;
  recentRunsCount: number;
  avgRecentPaceStr: string;
  avgRecentPaceSec: number;
  tempoRecentPaceStr: string;
  tempoRecentPaceSec: number;
  longestRunKm: number;

  // Model 1: VO2Max (Jack Daniels / VDOT physiological ceiling)
  vo2PredictedTimeSec: number;
  vo2PredictedTimeStr: string;
  vo2PredictedPaceSec: number;
  vo2PredictedPaceStr: string;

  // Model 2: Recent Training Pace (Pete Riegel fatigue model)
  trainingPredictedTimeSec: number;
  trainingPredictedTimeStr: string;
  trainingPredictedPaceSec: number;
  trainingPredictedPaceStr: string;

  // Model 3: Hybrid Synthesis (Real-world race day forecast)
  hybridPredictedTimeSec: number;
  hybridPredictedTimeStr: string;
  hybridPredictedPaceSec: number;
  hybridPredictedPaceStr: string;
  predictedSpeedKmh: number;

  // Readiness & Form Gap Diagnosis
  deltaSec: number; // Training - VO2Max
  formStatus: 'optymalna_forma' | 'rezerwa_tlenowa' | 'wysoka_ekonomia' | 'brak_bazy_dlugiej';
  formStatusTitle: string;
  formStatusBadgeClass: string;
  readinessIndexPercent: number; // 0 - 100%
  diagnosisExplanation: string;
  actionableCoachingTip: string;

  // Splits & Strategy
  splits: Array<{
    segmentName: string;
    distanceRangeKm: string;
    paceStr: string;
    cumulativeTimeStr: string;
    hrZoneLabel: string;
    targetHrBpm: string;
    tacticsNotes: string;
  }>;
}

/**
 * 1. Jack Daniels VDOT / VO2Max Race Time Solver
 * Solves: VO2(distance / t) = VO2Max * F(t)
 */
export function solveRaceTimeFromVo2Max(distanceKm: number, vo2max: number): number {
  const numDist = Number(distanceKm);
  const validDist = Math.max(1, Math.min(150, !isNaN(numDist) && numDist > 0 ? numDist : 21.0975));
  const numVo2 = Number(vo2max);
  const safeVo2 = Math.max(25, Math.min(85, !isNaN(numVo2) && numVo2 > 0 ? numVo2 : 45));
  const dMeters = validDist * 1000;

  // Oxygen cost formula: VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2 (v in m/min)
  const calcVo2Cost = (v: number) => -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);

  // Fractional utilization for t minutes
  const calcFraction = (tMin: number) =>
    0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);

  // Binary search for t (in minutes)
  let lowMin = (dMeters / 450); // fast (450 m/min = 27 km/h)
  let highMin = (dMeters / 60);  // slow (60 m/min = 3.6 km/h)

  for (let iter = 0; iter < 30; iter++) {
    const midMin = (lowMin + highMin) / 2;
    const v = dMeters / midMin;
    const cost = calcVo2Cost(v);
    const capacity = safeVo2 * calcFraction(midMin);

    if (cost > capacity) {
      // Running too fast for capacity -> need more time
      lowMin = midMin;
    } else {
      highMin = midMin;
    }
  }

  const finalMin = (lowMin + highMin) / 2;
  return Math.round(finalMin * 60);
}

/**
 * 2. Parse pace string "mm:ss" to total seconds
 */
export function paceToSeconds(paceStr: string): number {
  if (!paceStr) return 330; // 5:30 default
  const parts = paceStr.split(':').map((p) => parseInt(p.trim(), 10));
  const min = parts[0] || 5;
  const sec = parts[1] || 30;
  return min * 60 + sec;
}

/**
 * 3. Recent Training Pace Analyzer & Riegel Extrapolation
 */
export function analyzeRecentTrainingPace(
  runs: RunLog[],
  profile: RunnerProfile,
  targetDistanceKm: number
): {
  recentRunsCount: number;
  avgPaceSec: number;
  tempoPaceSec: number;
  longestRunKm: number;
  trainingPredictedTimeSec: number;
} {
  const safeProfile = profile || ({} as RunnerProfile);
  const validRuns = (Array.isArray(runs) ? runs : []).filter(
    (r) => r && typeof r.distanceKm === 'number' && !isNaN(r.distanceKm) && r.distanceKm >= 1.0 && r.avgPace && paceToSeconds(r.avgPace) > 120
  );

  let avgPaceSec = 315; // 5:15 default
  let tempoPaceSec = 300; // 5:00 default
  let longestRunKm = 8.0;

  if (validRuns.length > 0) {
    // Take up to 10 latest runs
    const recentSample = validRuns.slice(0, 10);
    let totalDist = 0;
    let weightedPaceSum = 0;
    const paces: number[] = [];

    recentSample.forEach((r) => {
      const pSec = paceToSeconds(r.avgPace);
      const d = Number(r.distanceKm) || 0;
      weightedPaceSum += pSec * d;
      totalDist += d;
      paces.push(pSec);
      if (d > longestRunKm) longestRunKm = d;
    });

    avgPaceSec = totalDist > 0 ? Math.round(weightedPaceSum / totalDist) : 315;

    // Tempo pace: fastest 20% of paces or fastest run
    paces.sort((a, b) => a - b);
    tempoPaceSec = paces[0] || Math.max(180, avgPaceSec - 20);
  } else if (safeProfile?.time5k) {
    const base5kSec = paceToSeconds(safeProfile.time5k);
    avgPaceSec = Math.round(base5kSec / 5) + 25; // aerobic training pace is ~25s slower than 5k pace
    tempoPaceSec = Math.round(base5kSec / 5);
  }

  // Reference effort for Pete Riegel formula
  const safeTargetDist = Math.max(1, Math.min(150, Number(targetDistanceKm) || 21.0975));
  const refDistance = 5.0;
  const refPace = safeTargetDist <= 10 ? tempoPaceSec * 0.96 : tempoPaceSec * 1.02;
  const refTimeSec = refDistance * refPace;

  // Adaptive fatigue exponent b:
  let fatigueExp = 1.06;
  if (safeTargetDist > 15) {
    if (longestRunKm < 14 && safeTargetDist <= 21.1) {
      fatigueExp = 1.085; // lacking long run for half marathon
    } else if (longestRunKm < 26 && safeTargetDist > 30) {
      fatigueExp = 1.11; // high fatigue wall for marathon
    } else {
      fatigueExp = 1.065;
    }
  }

  const rawTrainingSec = refTimeSec * Math.pow(safeTargetDist / refDistance, fatigueExp);
  const trainingPredictedTimeSec = Math.max(
    180,
    Math.round(isNaN(rawTrainingSec) ? safeTargetDist * 330 : rawTrainingSec)
  );

  return {
    recentRunsCount: validRuns.length,
    avgPaceSec: Math.max(120, avgPaceSec),
    tempoPaceSec: Math.max(120, tempoPaceSec),
    longestRunKm: Math.max(1.0, longestRunKm),
    trainingPredictedTimeSec,
  };
}

/**
 * 4. Master Race Fitness Prediction & Comparison Engine
 */
export function calculateRaceFitnessPrediction(
  profile: RunnerProfile,
  runs: RunLog[] = [],
  targetDistanceKm: number = 21.0975,
  modifiers: {
    carbonShoes?: boolean;
    raceTempC?: number; // default 14°C
    elevationProfile?: 'flat' | 'rolling' | 'hilly';
  } = {}
): FitnessAnalysisResult {
  const safeProfile = profile || ({} as RunnerProfile);
  const safeRuns = Array.isArray(runs) ? runs.filter(Boolean) : [];
  const numDist = Number(targetDistanceKm);
  const effectiveDistance = Math.max(1, Math.min(150, !isNaN(numDist) && numDist > 0 ? numDist : 21.0975));
  const calculatedVo2 = calculateDynamicVo2Max(safeProfile, safeRuns);
  const safeProfileVo2 = typeof safeProfile?.vo2max === 'number' && !isNaN(safeProfile.vo2max) ? safeProfile.vo2max : 0;
  const currentVo2 = Math.max(25, Math.min(85, Math.max(safeProfileVo2, calculatedVo2) || 45.0));

  // 1. VO2Max pure physiological model
  const rawVo2TimeSec = solveRaceTimeFromVo2Max(effectiveDistance, currentVo2);

  // 2. Recent training workouts model
  const trainingAnalysis = analyzeRecentTrainingPace(safeRuns, safeProfile, effectiveDistance);
  const rawTrainingTimeSec = trainingAnalysis.trainingPredictedTimeSec || 7200;

  // 3. Environmental & Equipment Modifiers
  let modifierFactor = 1.0;
  if (modifiers?.carbonShoes) modifierFactor -= 0.025; // 2.5% boost
  const temp = modifiers?.raceTempC ?? 14;
  if (temp > 18) modifierFactor += Math.min(0.08, (temp - 18) * 0.008); // heat penalty
  if (temp < 2) modifierFactor += 0.02; // cold penalty
  if (modifiers?.elevationProfile === 'rolling') modifierFactor += 0.025;
  if (modifiers?.elevationProfile === 'hilly') modifierFactor += 0.06;

  const vo2PredictedTimeSec = Math.max(180, Math.round((rawVo2TimeSec || 7000) * modifierFactor));
  const trainingPredictedTimeSec = Math.max(180, Math.round(rawTrainingTimeSec * modifierFactor));

  // 4. Hybrid Synthesis: Weighted average
  const trainingWeight = Math.min(0.65, 0.4 + ((trainingAnalysis.recentRunsCount || 0) * 0.03));
  const vo2Weight = 1.0 - trainingWeight;

  const hybridPredictedTimeSec = Math.max(
    180,
    Math.round(vo2PredictedTimeSec * vo2Weight + trainingPredictedTimeSec * trainingWeight)
  );

  const hybridPredictedPaceSec = Math.max(60, Math.round(hybridPredictedTimeSec / effectiveDistance));
  const vo2PredictedPaceSec = Math.max(60, Math.round(vo2PredictedTimeSec / effectiveDistance));
  const trainingPredictedPaceSec = Math.max(60, Math.round(trainingPredictedTimeSec / effectiveDistance));

  // Speed in km/h
  const safeHybridTime = Math.max(60, hybridPredictedTimeSec || 3600);
  const predictedSpeedKmh = Number((effectiveDistance / (safeHybridTime / 3600)).toFixed(1)) || 11.0;

  // 5. Readiness Index & Form Gap Diagnosis
  const deltaSec = trainingPredictedTimeSec - vo2PredictedTimeSec;
  let formStatus: FitnessAnalysisResult['formStatus'] = 'optymalna_forma';
  let formStatusTitle = 'Optymalna Dyspozycja Startowa';
  let formStatusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  let readinessIndexPercent = 94;
  let diagnosisExplanation = '';
  let actionableCoachingTip = '';

  if (effectiveDistance >= 20 && trainingAnalysis.longestRunKm < 14) {
    formStatus = 'brak_bazy_dlugiej';
    formStatusTitle = 'Brak Długiego Wybiegania (Ryzyko Ściany)';
    formStatusBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    readinessIndexPercent = 72;
    const safeLongest = Number(trainingAnalysis.longestRunKm) || 0;
    const safeEffective = Number(effectiveDistance) || 0;
    diagnosisExplanation = `Twój silnik tlenowy (VO2Max ${currentVo2}) jest mocny, ale najdłuższy zarejestrowany trening to zaledwie ${safeLongest.toFixed(1)} km. Na dystansie ${safeEffective.toFixed(1)} km grozi to wyczerpaniem zapasów glikogenu i spadkiem tempa po 15. kilometrze.`;
    actionableCoachingTip = 'Wykonaj w weekend spokojne wybieganie 16-18 km w Strefie 2 (do 142 bpm) z testem żelu energetycznego na 40. minucie.';
  } else if (deltaSec > 90) {
    formStatus = 'rezerwa_tlenowa';
    formStatusTitle = 'Wysoka Rezerwa Tlenowa (Potencjał do Przebicia)';
    formStatusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    readinessIndexPercent = 86;
    diagnosisExplanation = `Zdolność pochłaniania tlenu VO2Max (${currentVo2} ml/kg/min) wskazuje na teoretyczny czas ${formatSecondsToTime(vo2PredictedTimeSec)}, podczas gdy tempo z treningów szacuje ${formatSecondsToTime(trainingPredictedTimeSec)}. Masz niewykorzystaną rezerwę prędkości!`;
    actionableCoachingTip = 'Włącz do mikrocyklu 1 trening tempowy LT2 (np. 4x 2 km w tempie docelowym) z przerwą 90s w truchcie.';
  } else if (deltaSec < -45) {
    formStatus = 'wysoka_ekonomia';
    formStatusTitle = 'Ponadprzeciętna Ekonomia Biegu';
    formStatusBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    readinessIndexPercent = 97;
    diagnosisExplanation = `Biegasz w tempach wyższych niż wynikałoby z samego pułapu VO2Max. Oznacza to doskonałą biomechanikę (niski koszt tlenowy na kilometr) oraz znakomitą tolerancję kwasu mlekowego.`;
    actionableCoachingTip = 'Utrzymaj bieżący rytm i nie przyspieszaj na pierwszych 3 kilometrach — równomierny bieg da gwarancję nowego rekordu życiowego.';
  } else {
    formStatus = 'optymalna_forma';
    formStatusTitle = 'Szczytowa Synchronizacja Formy';
    formStatusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    readinessIndexPercent = 95;
    diagnosisExplanation = `Znakomite zgranie: pułap VO2Max (${currentVo2}) oraz realne tempo ostatnich ${trainingAnalysis.recentRunsCount} jednostek treningowych pokrywają się niemal 1:1. Jesteś w optymalnej dyspozycji do startu.`;
    actionableCoachingTip = 'Zadbaj o pełne ładowanie węglowodanami na 36h przed startem i trzymaj zadeklarowane tempo od samego początku.';
  }

  // 6. Tactical Splits Generation
  const splits: FitnessAnalysisResult['splits'] = [];
  const hrMax = profile.hrMax || 185;

  if (effectiveDistance <= 6) {
    // 5K: split by 1 km
    for (let km = 1; km <= Math.round(effectiveDistance); km++) {
      let kmPaceSec = hybridPredictedPaceSec;
      let notes = 'Utrzymanie równego rytmu';
      if (km === 1) {
        kmPaceSec += 4;
        notes = 'Spokojny start bez przepalenia nóg';
      } else if (km === Math.round(effectiveDistance)) {
        kmPaceSec -= 6;
        notes = 'Maksymalny finisz do samej mety';
      }
      splits.push({
        segmentName: `Kilometr ${km}`,
        distanceRangeKm: `${km} km`,
        paceStr: formatSecondsToTime(kmPaceSec),
        cumulativeTimeStr: formatSecondsToTime(km * hybridPredictedPaceSec),
        hrZoneLabel: km < 3 ? 'Strefa 3 (Tempo)' : 'Strefa 4/5 (Próg / VO2Max)',
        targetHrBpm: `${Math.round(hrMax * 0.86)}-${Math.round(hrMax * 0.94)} bpm`,
        tacticsNotes: notes,
      });
    }
  } else if (effectiveDistance <= 12) {
    // 10K: 3 segments (0-3km, 3-7km, 7-10km)
    splits.push({
      segmentName: 'I. Otwarcie (0 - 3 km)',
      distanceRangeKm: '1 - 3 km',
      paceStr: formatSecondsToTime(hybridPredictedPaceSec + 3),
      cumulativeTimeStr: formatSecondsToTime(3 * (hybridPredictedPaceSec + 3)),
      hrZoneLabel: 'Strefa 3 (Tlenowa Baza)',
      targetHrBpm: `${Math.round(hrMax * 0.82)}-${Math.round(hrMax * 0.86)} bpm`,
      tacticsNotes: 'Nie ulegaj euforii tłumu, kontroluj kadencję 175+ spm',
    });
    splits.push({
      segmentName: 'II. Środek Trasy (3 - 8 km)',
      distanceRangeKm: '3 - 8 km',
      paceStr: formatSecondsToTime(hybridPredictedPaceSec),
      cumulativeTimeStr: formatSecondsToTime(8 * hybridPredictedPaceSec),
      hrZoneLabel: 'Strefa 4 (Próg Mleczanowy)',
      targetHrBpm: `${Math.round(hrMax * 0.87)}-${Math.round(hrMax * 0.91)} bpm`,
      tacticsNotes: 'Równe tempo wyścigowe jak szwajcarski zegarek',
    });
    splits.push({
      segmentName: 'III. Finisz (8 - 10 km)',
      distanceRangeKm: '8 - 10 km',
      paceStr: formatSecondsToTime(hybridPredictedPaceSec - 5),
      cumulativeTimeStr: formatSecondsToTime(hybridPredictedTimeSec),
      hrZoneLabel: 'Strefa 5 (Strefa Beztlenowa)',
      targetHrBpm: `${Math.round(hrMax * 0.92)}-${hrMax} bpm`,
      tacticsNotes: 'Negative split: przyspieszenie i walka o sekundy',
    });
  } else {
    // Half or Marathon: 5 km blocks
    const numBlocks = Math.ceil(effectiveDistance / 5);
    for (let b = 1; b <= numBlocks; b++) {
      const fromKm = (b - 1) * 5;
      const toKm = Math.min(effectiveDistance, b * 5);
      const isFirst = b === 1;
      const isLast = b === numBlocks;
      let blockPace = hybridPredictedPaceSec;
      let notes = 'Stały, ekonomiczny krok';
      if (isFirst) {
        blockPace += 4;
        notes = 'Ekonomiczne wejście na obroty, oszczędzanie glikogenu';
      } else if (isLast) {
        blockPace -= 4;
        notes = 'Ostatnie kilometry, pełne wykorzystanie rezerw energii';
      }
      const safeToKm = Number(toKm) || 0;
      const safeFromKm = Number(fromKm) || 0;
      splits.push({
        segmentName: `Punkt ${safeToKm.toFixed(1)} km`,
        distanceRangeKm: `${safeFromKm.toFixed(0)} - ${safeToKm.toFixed(1)} km`,
        paceStr: formatSecondsToTime(blockPace),
        cumulativeTimeStr: formatSecondsToTime(toKm * hybridPredictedPaceSec),
        hrZoneLabel: b <= 2 ? 'Strefa 2/3 (Aerobowa)' : b >= numBlocks - 1 ? 'Strefa 4 (Próg)' : 'Strefa 3 (Maratońska)',
        targetHrBpm: `${Math.round(hrMax * (0.78 + b * 0.025))}-${Math.round(hrMax * (0.83 + b * 0.025))} bpm`,
        tacticsNotes: notes,
      });
    }
  }

  return {
    targetDistanceKm: effectiveDistance,
    currentVo2Max: currentVo2,
    recentRunsCount: trainingAnalysis.recentRunsCount,
    avgRecentPaceStr: formatSecondsToTime(trainingAnalysis.avgPaceSec),
    avgRecentPaceSec: trainingAnalysis.avgPaceSec,
    tempoRecentPaceStr: formatSecondsToTime(trainingAnalysis.tempoPaceSec),
    tempoRecentPaceSec: trainingAnalysis.tempoPaceSec,
    longestRunKm: trainingAnalysis.longestRunKm,

    vo2PredictedTimeSec,
    vo2PredictedTimeStr: formatSecondsToTime(vo2PredictedTimeSec),
    vo2PredictedPaceSec,
    vo2PredictedPaceStr: formatSecondsToTime(vo2PredictedPaceSec),

    trainingPredictedTimeSec,
    trainingPredictedTimeStr: formatSecondsToTime(trainingPredictedTimeSec),
    trainingPredictedPaceSec,
    trainingPredictedPaceStr: formatSecondsToTime(trainingPredictedPaceSec),

    hybridPredictedTimeSec,
    hybridPredictedTimeStr: formatSecondsToTime(hybridPredictedTimeSec),
    hybridPredictedPaceSec,
    hybridPredictedPaceStr: formatSecondsToTime(hybridPredictedPaceSec),
    predictedSpeedKmh,

    deltaSec,
    formStatus,
    formStatusTitle,
    formStatusBadgeClass,
    readinessIndexPercent,
    diagnosisExplanation,
    actionableCoachingTip,

    splits,
  };
}
