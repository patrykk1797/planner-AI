/**
 * Pure running physiology and calculation utilities for all 16 modules
 */

export interface RunnerProfile {
  name: string;
  birthdate: string; // "DD.MM.YYYY" or "YYYY-MM-DD"
  gender: 'M' | 'F' | 'Other';
  weight: number; // kg
  targetWeight: number; // kg
  city: string;
  weeklyKm: number;
  time5k: string; // "mm:ss" e.g. "26:43"
  hrMax: number;
  rhr: number; // resting heart rate
  vo2max: number;
  targetGoal: string; // e.g. "Sub-25 5K", "Maraton", "Zrzucenie wagi"
  selectedDays: string[]; // ["Pon", "Śr", "Pt", "Sob"]
  selectedShoeId?: string;
  bamboos: number; // Panda points
  activePandaGear: {
    gear: string;
    skin: string;
    bg: string;
  };
  coachTone?: 'naukowy' | 'motywacyjny' | 'minimalistyczny';
  medications?: string;
  smokeFreeDays?: number;
  activePainZones?: string[];
}

export interface TrainingDay {
  dayName: string;
  dayShort: string;
  type: 'Bieg spokojny' | 'Interwały' | 'Tempo run' | 'Bieg długi' | 'Regeneracja' | 'Siła biegowa';
  distanceKm: number;
  durationMin: number;
  targetPace: string;
  hrZone: string;
  description: string;
  completed?: boolean;
}

export interface RunLog {
  id: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  durationMin: number;
  avgPace: string; // "5:20"
  avgHr: number;
  maxHr?: number;
  avgCadence: number;
  elevationGainM?: number;
  calories?: number;
  shoeName: string;
  notes?: string;
  coachFeedback?: string;
  gctMs?: number; // Ground Contact Time in ms
  splits?: Array<{ km: number; pace: string; hr: number; elevation: number }>;
  hrZones?: Array<{ zone: string; percentage: number; timeMin: number }>;
  vo2MaxEst?: number;
}

export interface Shoe {
  id: string;
  name: string;
  brand: string;
  footType?: 'Neutralna' | 'Pronująca' | 'Supinująca';
  mileageKm: number;
  maxMileageKm: number;
  dropMm: number;
  weightG: number;
  energyReturn?: number; // 1-10
  cushionRating?: number; // 1-10
  stabilityRating?: number; // 1-10
  cushion: string;
  idealFor: string;
  aiNotes?: string;
  aiVerdict?: string;
}

export interface RaceSlot {
  id: string;
  distanceCategory: '5k' | '10k' | 'half' | 'marathon';
  name: string;
  city: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  role: 'Główny Cel Sezonu A' | 'Start Kontrolny B' | 'Sprawdzian Szybkości';
  profile: 'Płaska/Atestowana' | 'Pofałdowana/Górska';
  targetTime?: string;
  predictedTime?: string;
}

/**
 * Calculates current age from a birthdate string (supports DD.MM.YYYY and YYYY-MM-DD)
 */
export function calculateAge(birthdateStr: string, referenceDate = new Date()): number {
  if (!birthdateStr) return 30;
  let year = 1995;
  let month = 1;
  let day = 1;

  if (birthdateStr.includes('.')) {
    const parts = birthdateStr.split('.').map((p) => parseInt(p.trim(), 10));
    if (parts.length === 3) {
      day = parts[0] || 1;
      month = parts[1] || 1;
      year = parts[2] || 1995;
    }
  } else if (birthdateStr.includes('-')) {
    const parts = birthdateStr.split('-').map((p) => parseInt(p.trim(), 10));
    if (parts.length === 3) {
      year = parts[0] || 1995;
      month = parts[1] || 1;
      day = parts[2] || 1;
    }
  }

  const birth = new Date(year, month - 1, day);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const m = referenceDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return isNaN(age) || age < 10 || age > 110 ? 30 : age;
}

/**
 * Checks if today is the runner's birthday
 */
export function isBirthdayToday(birthdateStr: string, today = new Date()): boolean {
  if (!birthdateStr) return false;
  let day = 0;
  let month = 0;

  if (birthdateStr.includes('.')) {
    const parts = birthdateStr.split('.').map((p) => parseInt(p.trim(), 10));
    day = parts[0] || 0;
    month = parts[1] || 0;
  } else if (birthdateStr.includes('-')) {
    const parts = birthdateStr.split('-').map((p) => parseInt(p.trim(), 10));
    month = parts[1] || 0;
    day = parts[2] || 0;
  }

  return day === today.getDate() && month === today.getMonth() + 1;
}

/**
 * Converts 5k time string "MM:SS" into total seconds
 */
export function time5kToSeconds(timeStr: string): number {
  if (!timeStr) return 1500;
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  const rawNum = parseFloat(timeStr);
  return isNaN(rawNum) ? 1500 : Math.round(rawNum * 60);
}

/**
 * Formats total seconds into MM:SS or HH:MM:SS
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Estimates VO2 max from 5k race time using simplified Jack Daniels formula
 */
export function estimateVO2MaxFrom5k(timeStr: string): number {
  const seconds = time5kToSeconds(timeStr);
  if (seconds <= 0) return 45;
  const minutes = seconds / 60;
  const v = 5000 / minutes;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
  return Math.round(Math.max(25, Math.min(85, vo2)));
}

/**
 * Module 1: Comprehensive "Co Jeśli?" Running Simulator
 * Predicts 5K, 10K, Half-Marathon, Marathon times, GCT, VO2max, and injury risk
 */
export interface SimulatorInputs {
  baseWeightKg: number;
  simWeightKg: number;
  base5kSeconds: number;
  cadenceSpm: number;
  aerobicZ2Pct: number; // 0 - 100
  strengthWeekly: number; // 0 - 3
  sleepScore: number; // 1 - 10
  raceTempC: number; // 0 - 35
  shoeWeightG: number;
  shoeEnergyReturn: number; // 1 - 10
  isCarbonShoe: boolean;
}

export interface SimulatorOutputs {
  predicted5kTime: string;
  predicted5kPace: string;
  predicted10kTime: string;
  predicted10kPace: string;
  predictedHalfTime: string;
  predictedHalfPace: string;
  predictedMarathonTime: string;
  predictedMarathonPace: string;
  gctMs: number; // Ground Contact Time ms
  vo2RelativeGain: number; // ml/kg/min change
  injuryRiskPct: number; // 0 - 100
  injuryFactors: string[];
  roadmapStages: Array<{
    stageNumber: number;
    title: string;
    focus: string;
    durationWeeks: number;
  }>;
}

export function runWhatIfSimulator(inputs: SimulatorInputs): SimulatorOutputs {
  const {
    baseWeightKg,
    simWeightKg,
    base5kSeconds,
    cadenceSpm,
    aerobicZ2Pct,
    strengthWeekly,
    sleepScore,
    raceTempC,
    shoeWeightG,
    shoeEnergyReturn,
    isCarbonShoe,
  } = inputs;

  // 1. Weight impact: ~2.5 seconds per km saved per -1 kg lost
  const weightDeltaKg = simWeightKg - baseWeightKg;
  const paceDeltaSecPerKmFromWeight = weightDeltaKg * 2.5;

  // 2. VO2 max change: ~+0.45 ml/kg/min per -1 kg
  const vo2RelativeGain = Number((-weightDeltaKg * 0.45).toFixed(1));

  // 3. Cadence effect: optimal ~175-180 spm; <160 adds knee braking
  const cadenceEfficiency = (cadenceSpm - 165) * -0.4; // positive or negative sec/km

  // 4. Ground Contact Time (GCT in ms):
  // Baseline ~265 ms at 155 spm, reducing by 1.2 ms per step/min
  const gctMs = Math.round(Math.max(190, Math.min(310, 265 - (cadenceSpm - 155) * 1.35)));

  // 5. Aerobic Discipline (Strefa 2): 80% is optimal (polarized 80/20)
  // Higher Z2 discipline reduces cardiac drift and improves fat metabolism
  const aerobicBonus = (aerobicZ2Pct - 50) * -0.15; // sec/km

  // 6. Strength training and sleep recovery
  const strengthBonus = strengthWeekly * -1.2; // sec/km
  const sleepBonus = (sleepScore - 7) * -0.8; // sec/km

  // 7. Shoe weight & energy return (e.g., 200g racing shoe vs 320g trainer)
  const shoeWeightPenalty = (shoeWeightG - 230) * 0.015; // sec/km
  const shoeReturnBonus = (shoeEnergyReturn - 6) * -1.0; // sec/km

  // 8. Race temperature: optimal 10-14 C
  let tempPenalty = 0;
  if (raceTempC > 15) {
    tempPenalty = (raceTempC - 15) * 0.8; // sec/km
  } else if (raceTempC < 5) {
    tempPenalty = (5 - raceTempC) * 0.4;
  }

  // Net pace correction per km
  const totalPaceCorrection =
    paceDeltaSecPerKmFromWeight +
    cadenceEfficiency +
    aerobicBonus +
    strengthBonus +
    sleepBonus +
    shoeWeightPenalty +
    shoeReturnBonus +
    tempPenalty;

  // Baseline 5k pace
  const basePaceSec = base5kSeconds / 5;
  const sim5kPaceSec = Math.max(180, basePaceSec + totalPaceCorrection);
  const sim5kTotalSec = sim5kPaceSec * 5;

  // Pete Riegel formula with fatigue exponent (1.06)
  // 10K = 5K * (10/5)^1.06
  const sim10kTotalSec = sim5kTotalSec * Math.pow(10 / 5, 1.06);
  // Half = 5K * (21.097/5)^1.06
  const simHalfTotalSec = sim5kTotalSec * Math.pow(21.097 / 5, 1.06);
  // Marathon = 5K * (42.195/5)^1.06 (with aerobic discipline factor)
  const marathonFatigueExp = 1.075 - (aerobicZ2Pct / 100) * 0.025;
  const simMarathonTotalSec = sim5kTotalSec * Math.pow(42.195 / 5, marathonFatigueExp);

  // Injury Risk Assessment
  let injuryRisk = 25; // baseline
  const injuryFactors: string[] = [];

  if (isCarbonShoe && cadenceSpm < 165) {
    injuryRisk += 30;
    injuryFactors.push('Agresywny but karbonowy przy niskiej kadencji (<165 spm) przeciąża ścięgno Achillesa');
  }
  if (isCarbonShoe && simWeightKg > 82) {
    injuryRisk += 20;
    injuryFactors.push('Sztywna płytka karbonowa przy masie >80 kg zwiększa uderzenie na powięź i kolana');
  }
  if (strengthWeekly === 0) {
    injuryRisk += 25;
    injuryFactors.push('Brak treningu siłowego osłabia mięśnie pośladkowe średnie (ryzyko pasma ITBS)');
  }
  if (cadenceSpm < 158) {
    injuryRisk += 15;
    injuryFactors.push('Overstriding (kadencja <158 spm) generuje duże siły hamowania na stawie rzepkowo-udowym');
  }
  if (sleepScore < 6) {
    injuryRisk += 15;
    injuryFactors.push('Niedostateczna regeneracja nocna podnosi poziom kortyzolu i spowalnia syntezę kolagenu');
  }

  // 4-Stage Roadmap AI
  const roadmapStages = [
    {
      stageNumber: 1,
      title: 'Baza Tlenowa & Kapilaryzacja',
      focus: `80% objętości w Strefie 2 (aerobic), adaptacja mitochondrialna i redukcja dryfu tętna.`,
      durationWeeks: 4,
    },
    {
      stageNumber: 2,
      title: 'Adaptacja Biomechaniczna & Siła',
      focus: `Podnoszenie kadencji do ${cadenceSpm} spm (skrócenie GCT do ${gctMs} ms) oraz protokoły siłowe na pośladek i Soleus.`,
      durationWeeks: 4,
    },
    {
      stageNumber: 3,
      title: 'Prędkość Specyficzna (BPS)',
      focus: `Treningi progowe LT i interwały w tempie docelowym ${formatSecondsToTime(sim5kPaceSec)} min/km na 5K.`,
      durationWeeks: 3,
    },
    {
      stageNumber: 4,
      title: 'Tapering & Strategia Startowa',
      focus: `Redukcja objętości o 40%, protokół Carb-Loading, strategia Negative Split na trasie.`,
      durationWeeks: 2,
    },
  ];

  return {
    predicted5kTime: formatSecondsToTime(sim5kTotalSec),
    predicted5kPace: `${formatSecondsToTime(sim5kPaceSec)} min/km`,
    predicted10kTime: formatSecondsToTime(sim10kTotalSec),
    predicted10kPace: `${formatSecondsToTime(sim10kTotalSec / 10)} min/km`,
    predictedHalfTime: formatSecondsToTime(simHalfTotalSec),
    predictedHalfPace: `${formatSecondsToTime(simHalfTotalSec / 21.097)} min/km`,
    predictedMarathonTime: formatSecondsToTime(simMarathonTotalSec),
    predictedMarathonPace: `${formatSecondsToTime(simMarathonTotalSec / 42.195)} min/km`,
    gctMs,
    vo2RelativeGain,
    injuryRiskPct: Math.min(100, Math.max(5, injuryRisk)),
    injuryFactors,
    roadmapStages,
  };
}

/**
 * Module 9: Carb-Loading (Fitatu / FoodAdvisor Protocol)
 */
export function calculateCarbLoading(
  weightKg: number,
  targetDistance: 'half' | 'marathon'
): {
  dailyCarbsG: number;
  durationHours: number;
  recommendations: string[];
  foodList: Array<{ name: string; portion: string; carbsG: number }>;
} {
  const safeWeight = weightKg || 70;
  if (targetDistance === 'marathon') {
    // 8-10g per kg, 72-96h
    const dailyCarbsG = Math.round(safeWeight * 8.5);
    return {
      dailyCarbsG,
      durationHours: 72,
      recommendations: [
        `Podaż 8–9 g węglowodanów na 1 kg masy ciała (${dailyCarbsG} g dziennie).`,
        'Drastycznie zredukuj błonnik (ciemne pieczywo zamień na białe, unikaj strączków) i tłuszcze.',
        'Jedz mniejsze porcje co 2.5–3 godziny z dużą ilością płynów i elektrolitów.',
      ],
      foodList: [
        { name: 'Ryż biały jaśminowy', portion: '150 g (suchy)', carbsG: 120 },
        { name: 'Makaron pszenny jasny', portion: '150 g (suchy)', carbsG: 110 },
        { name: 'Banany dojrzałe', portion: '3 sztuki (~350 g)', carbsG: 75 },
        { name: 'Sok jabłkowy 100%', portion: '500 ml', carbsG: 55 },
        { name: 'Miód pszczeli do owsianki', portion: '4 łyżki (80 g)', carbsG: 65 },
        { name: 'Bułka pszenna z dżemem', portion: '2 bułki + 60 g dżemu', carbsG: 90 },
      ],
    };
  }

  // Half-marathon: 6-7g per kg, 48h
  const dailyCarbsG = Math.round(safeWeight * 6.5);
  return {
    dailyCarbsG,
    durationHours: 48,
    recommendations: [
      `Podaż 6–7 g węglowodanów na 1 kg masy ciała (${dailyCarbsG} g dziennie).`,
      'Ładowanie rozpocznij 48h przed startem (np. od piątku rano na niedzielny bieg).',
      'Lekka kolacja w przeddzień startu bogata w węglowodany proste i średniozłożone.',
    ],
    foodList: [
      { name: 'Kasza kuskus / ryż', portion: '120 g (sucha)', carbsG: 90 },
      { name: 'Płatki owsiane błyskawiczne', portion: '100 g', carbsG: 68 },
      { name: 'Banany', portion: '2 sztuki (~240 g)', carbsG: 50 },
      { name: 'Izotonik startowy', portion: '500 ml', carbsG: 32 },
      { name: 'Pieczywo pszenne z miodem', portion: '2 kromki + 40 g miodu', carbsG: 60 },
    ],
  };
}

/**
 * Module 10: Race Day Fueling Plan (5K, 10K, Half-Marathon, Marathon)
 */
export function calculateFuelingPlan(
  distanceCategory: '5k' | '10k' | 'half' | 'marathon' | 'ultra',
  targetFinishMinutes: number
): {
  morningSchedule: Array<{ timeBeforeRace: string; action: string; details: string }>;
  gelCheckpointsKm: number[];
  carbsPerHour: number;
  strategyName: string;
  strategyDesc: string;
} {
  let carbsPerHour = 75;
  let gelCheckpointsKm: number[] = [6, 12, 18, 24, 30, 36];
  let strategyName = 'Negative Split & Ochrona Glikogenu';
  let strategyDesc = 'Pierwsze 10% dystansu biegnij 5-8 sekund wolniej od średniej, aby oszczędzić glikogen. Po 60% dystansu stopniowo przyspieszaj.';

  if (distanceCategory === '5k') {
    carbsPerHour = 30;
    gelCheckpointsKm = []; // No gels during 5K run
    strategyName = 'Płynny Start & Maksymalizacja VO2max';
    strategyDesc = 'Pierwsze 500m w tempie docelowym. Trzymaj rytm w strefie VO2max i wykonaj finisz na ostatnich 800 metrach.';
  } else if (distanceCategory === '10k') {
    carbsPerHour = 45;
    gelCheckpointsKm = [5];
    strategyName = 'Równe Tempo & Finisz 2km';
    strategyDesc = 'Idealne trzymanie tempa (Even Pacing) od 1 do 8 km. Żel na 5km zapobiega spadkowi cukru przed mocnym finiszem.';
  } else if (distanceCategory === 'half') {
    carbsPerHour = 60;
    gelCheckpointsKm = [7, 14];
    strategyName = 'Kontrolowana Strefa 3 & Negative Split';
    strategyDesc = 'Trzymaj Strefę 3 do 15 km. Żele na 7 km i 14 km z wodą dają ciągły dopływ glukozy do pracujących mięśni.';
  } else if (distanceCategory === 'ultra') {
    carbsPerHour = 90;
    gelCheckpointsKm = [10, 20, 30, 40, 50, 60];
    strategyName = 'Stały Dopływ Energii & Elektrolity Ultra';
    strategyDesc = 'Bieg ultra wymaga stałego dostarczania 80-90g węglowodanów na godzinę (żele + napoje węglowodanowe + sole/sód) oraz dyscypliny tętna w Strefie 2.';
  }

  const morningSchedule = [
    {
      timeBeforeRace: '3h 30m przed startem',
      action: 'Pobudka i śniadanie węglowodanowe',
      details: 'Owsianka na wodzie z bananem i miodem lub białe pieczywo z dżemem. 400 ml wody z elektrolitami.',
    },
    {
      timeBeforeRace: '2h 00m przed startem',
      action: 'Zakończenie trawienia stałego pokarmu',
      details: 'Ostatnia toaleta. Od tego momentu tylko małe łyki izotonika (ok. 150 ml na godzinę).',
    },
    {
      timeBeforeRace: '45m przed startem',
      action: 'Rozgrzewka dynamiczna',
      details: '8 min truchtu, wymachy nóg, mobilność stóp i 3 rytmiczne przebieżki 60m.',
    },
    {
      timeBeforeRace: '15m przed startem',
      action: 'Pierwszy żel startowy i wejście w strefę',
      details: 'Żel z kofeiną (~30g węglowodanów) popity 100 ml wody. Mentalne skupienie na tempie pierwszego kilometra.',
    },
  ];

  return {
    morningSchedule,
    gelCheckpointsKm,
    carbsPerHour,
    strategyName,
    strategyDesc,
  };
}

/**
 * Module 15: Weather pace correction and clothing recommendation
 */
export function calculateWeatherAdjustment(tempC: number, windSpeedKmH: number): {
  paceCorrectionSecPerKm: number;
  clothingAdvice: string;
  weatherWarning?: string;
} {
  let paceSec = 0;
  let weatherWarning: string | undefined;

  // Temperature penalty (>15 C or <0 C)
  if (tempC > 20) {
    paceSec += Math.round((tempC - 20) * 1.5);
    weatherWarning = 'Wysoka temperatura podnosi tętno o 5-10 bpm. Zwolnij o kilka sekund i pij więcej płynów.';
  } else if (tempC > 27) {
    paceSec += 15;
    weatherWarning = 'Upał! Ryzyko odwodnienia i udaru cieplnego. Trening wyłącznie wczesnym rankiem lub wieczorem.';
  }

  // Wind penalty (>20 km/h)
  if (windSpeedKmH > 25) {
    paceSec += Math.round((windSpeedKmH - 25) * 0.4);
    if (!weatherWarning) weatherWarning = 'Silny wiatr czołowy zwiększa opór aerodynamiczny i koszt energetyczny.';
  }

  // "+10°C Rule": Dress as if it were 10 degrees warmer
  const perceivedRunningTemp = tempC + 10;
  let clothingAdvice = 'Koszulka z krótkim rękawem + spodenki do biegania.';

  if (perceivedRunningTemp < 0) {
    clothingAdvice = 'Ciepła czapka, rękawiczki, bielizna termoaktywna + wiatrówka z membraną, długie legginsy ocieplane.';
  } else if (perceivedRunningTemp < 10) {
    clothingAdvice = 'Cienka opaska/czapka, lekka koszulka z długim rękawem (longsleeve) + kamizelka biegowa, długie legginsy.';
  } else if (perceivedRunningTemp < 20) {
    clothingAdvice = 'Koszulka z krótkim rękawem, spodenki/tights, ewentualnie odpinane rękawki biegowe.';
  } else {
    clothingAdvice = 'Lekki singlet (bezrękawnik) startowy lub koszulka z krótkim rękawem, spodenki z rozcięciem, czapka z daszkiem przeciw słońcu.';
  }

  return {
    paceCorrectionSecPerKm: paceSec,
    clothingAdvice,
    weatherWarning,
  };
}

/**
 * Module 14: Physiological factors (Nicotine recovery)
 */
export function calculateNicotineRecovery(daysFree: number): {
  rhrReductionBpm: number;
  vo2Gain: number;
  circulatoryImprovementPct: number;
  healthMilestone: string;
} {
  const days = Math.max(0, daysFree || 0);
  const rhrReductionBpm = Math.min(8, Math.round(days * 0.15));
  const vo2Gain = Number(Math.min(3.5, days * 0.06).toFixed(1));
  const circulatoryImprovementPct = Math.min(100, Math.round(days * 2.2));

  let healthMilestone = 'Początek regeneracji rzęsek oskrzelowych i spadek tlenku węgla we krwi.';
  if (days >= 90) {
    healthMilestone = 'Funkcja płuc poprawiona o ~15-20%. Pojemność życiowa (FVC) i wymiana gazowa niemal w pełni zregenerowane!';
  } else if (days >= 30) {
    healthMilestone = 'Układ krążenia odzyskał naturalną elastyczność naczyń. Wyraźny spadek tętna spoczynkowego i szybsza restytucja po interwałach.';
  } else if (days >= 7) {
    healthMilestone = 'Tlenek węgla usunięty z hemoglobiny. Mięśnie otrzymują o 10% więcej czystego tlenu w Strefie 2.';
  }

  return {
    rhrReductionBpm,
    vo2Gain,
    circulatoryImprovementPct,
    healthMilestone,
  };
}

/**
 * Daily hydration requirement (ml)
 */
export function calculateDailyHydration(weightKg: number, tempC = 20, runKmToday = 0): number {
  const baseWater = (weightKg || 70) * 35;
  const tempAddition = tempC > 22 ? (tempC - 22) * 50 : 0;
  const runningAddition = runKmToday * 80;
  return Math.round(baseWater + tempAddition + runningAddition);
}

/**
 * Karvonen Heart Rate Zones
 */
export function calculateHeartRateZones(hrMax: number, rhr: number) {
  const safeHrMax = hrMax || 185;
  const safeRhr = rhr || 60;
  const hrr = safeHrMax - safeRhr;

  return {
    zone1: {
      name: 'Strefa 1: Regeneracja',
      min: Math.round(safeRhr + hrr * 0.5),
      max: Math.round(safeRhr + hrr * 0.6),
      desc: 'Bieg regeneracyjny, bardzo lekki wysiłek',
    },
    zone2: {
      name: 'Strefa 2: Tlenowa (Baza)',
      min: Math.round(safeRhr + hrr * 0.6),
      max: Math.round(safeRhr + hrr * 0.7),
      desc: 'Budowa bazy tlenowej, tempo konwersacyjne',
    },
    zone3: {
      name: 'Strefa 3: Tempo / Aerobowa',
      min: Math.round(safeRhr + hrr * 0.7),
      max: Math.round(safeRhr + hrr * 0.8),
      desc: 'Umiarkowany wysiłek, oddech rytmiczny',
    },
    zone4: {
      name: 'Strefa 4: Próg Mleczanowy',
      min: Math.round(safeRhr + hrr * 0.8),
      max: Math.round(safeRhr + hrr * 0.9),
      desc: 'Trening progowy, interwały tempowe',
    },
    zone5: {
      name: 'Strefa 5: Beztlenowa / VO2max',
      min: Math.round(safeRhr + hrr * 0.9),
      max: safeHrMax,
      desc: 'Sprinty, maksymalne interwały VO2max',
    },
  };
}

/**
 * Air Quality Index (AQI / PM2.5 in ug/m3) evaluation
 */
export function evaluateAirQuality(pm2_5: number): {
  status: 'Idealne' | 'Dobre' | 'Umiarkowane' | 'Niezdrowe' | 'Bardzo złe';
  color: string;
  advice: string;
} {
  if (pm2_5 <= 10) {
    return {
      status: 'Idealne',
      color: '#10b981',
      advice: 'Czyste powietrze! Świetne warunki na długi bieg lub intensywne interwały.',
    };
  }
  if (pm2_5 <= 25) {
    return {
      status: 'Dobre',
      color: '#22c55e',
      advice: 'Dobra jakość powietrza. Śmiało realizuj pełny trening na zewnątrz.',
    };
  }
  if (pm2_5 <= 50) {
    return {
      status: 'Umiarkowane',
      color: '#eab308',
      advice: 'Umiarkowane stężenie pyłów. Osoby wrażliwe powinny skrócić bieg.',
    };
  }
  if (pm2_5 <= 75) {
    return {
      status: 'Niezdrowe',
      color: '#f97316',
      advice: 'Smog! Rozważ spokojny bieg regeneracyjny lub trening na bieżni mechanicznej.',
    };
  }
  return {
    status: 'Bardzo złe',
    color: '#ef4444',
    advice: 'Alarm smogowy! Zrezygnuj z intensywnego biegania w plenerze.',
  };
}

/**
 * Zero-Click Coaching local rules
 */
export function generateCoachingFeedback(run: {
  distanceKm: number;
  avgHr: number;
  avgCadence: number;
  hrMax: number;
}): {
  cadenceTip: string;
  hrTip: string;
  recoveryRecommendation: string;
} {
  const { avgHr, avgCadence, hrMax } = run;
  const hrPercent = hrMax > 0 ? (avgHr / hrMax) * 100 : 75;

  let cadenceTip = 'Świetna kadencja (~175-185 spm). Minimalizujesz obciążenie kolan i stawów skokowych.';
  if (avgCadence < 162) {
    cadenceTip = 'Niska kadencja (<162 spm) sugeruje lekkie overstriding. Spróbuj skrócić krok i zwiększyć rytm do ~170 spm.';
  } else if (avgCadence < 172) {
    cadenceTip = 'Solidna kadencja. Zwiększenie rytmu o 3-5 kroków/min poprawi ekonomikę biegu i skróci GCT.';
  }

  let hrTip = 'Tętno w optymalnej strefie tlenowej (Z2). Znakomita praca nad bazą mitochondriów.';
  let recoveryRecommendation = 'Jutro zalecany dzień odpoczynku lub lekki bieg regeneracyjny 4-5 km.';

  if (hrPercent > 88) {
    hrTip = 'Bieg w strefie beztlenowej / progowej (>88% HRmax). Wysokie obciążenie układu krążenia.';
    recoveryRecommendation = 'Wysoki koszt energetyczny! Następne 48h to regeneracja lub tylko rolowanie i mobilność.';
  } else if (hrPercent > 80) {
    hrTip = 'Tempo umiarkowane/progowe (Strefa 3-4). Dobry bodziec pod zawody 5K/10K.';
    recoveryRecommendation = 'W kolejnym treningu postaw na spokojne wybieganie w Strefie 2.';
  }

  return { cadenceTip, hrTip, recoveryRecommendation };
}

/**
 * Calculates dynamic VO2 Max based on 5K pace, weight change, and smoke-free recovery bonus
 */
export function calculateDynamicVo2Max(
  profile: { time5k: string; smokeFreeDays?: number; weight?: number; targetWeight?: number; vo2max?: number },
  runs: Array<{ distanceKm: number; avgPace?: string; durationMin?: number; vo2MaxEst?: number }> = []
): number {
  if (runs && runs.length > 0) {
    const latestRun = runs[0];
    if (latestRun?.vo2MaxEst && Number(latestRun.vo2MaxEst) > 15) {
      return Number(Number(latestRun.vo2MaxEst).toFixed(1));
    }
    if (latestRun?.avgPace) {
      const parts = latestRun.avgPace.split(':').map((p) => parseInt(p, 10));
      const paceSec = (parts[0] || 5) * 60 + (parts[1] || 0);
      if (paceSec > 120 && paceSec < 900) {
        const paceMin = paceSec / 60;
        const v = 1000 / paceMin;
        const rawVo2 = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
        if (!isNaN(rawVo2) && rawVo2 > 20) {
          return Number(Math.max(25, Math.min(85, rawVo2)).toFixed(1));
        }
      }
    }
    const runWithVo2 = runs.find((r) => r.vo2MaxEst && Number(r.vo2MaxEst) > 15);
    if (runWithVo2 && runWithVo2.vo2MaxEst) {
      return Number(Number(runWithVo2.vo2MaxEst).toFixed(1));
    }
  }

  const safeProfile = profile || { time5k: '25:00' };
  const baseVo2 = estimateVO2MaxFrom5k(safeProfile.time5k || '25:00');
  const smokeBonus = Math.min(3.5, (safeProfile.smokeFreeDays || 0) * 0.05);
  const weightDiff = (74.5 - (safeProfile.weight || 74.5)) * 0.4;

  const finalVo2 = (safeProfile.vo2max && safeProfile.vo2max > 20)
    ? Math.max(safeProfile.vo2max, baseVo2 + smokeBonus + weightDiff)
    : baseVo2 + smokeBonus + weightDiff;

  return Number(Math.max(25, Math.min(85, finalVo2)).toFixed(1));
}

export interface PeakPerformanceAnalysis {
  acuteLoadKm: number;
  chronicLoadKm: number;
  acwr: number;
  status: 'Optymalny (Sweet Spot)' | 'Szybki Skok Formy' | 'Ryzyko Przeciążenia' | 'Regeneracja / Tapering';
  statusColor: string;
  peakScore: number; // 0 - 100%
  advice: string;
}

export function calculatePeakPerformance(runs: Array<{ distanceKm: number; date?: string }> = []): PeakPerformanceAnalysis {
  if (!runs || runs.length === 0) {
    return {
      acuteLoadKm: 0,
      chronicLoadKm: 0,
      acwr: 0,
      status: 'Regeneracja / Tapering',
      statusColor: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      peakScore: 100,
      advice: 'Brak zarejestrowanych biegów w ostatnich dniach. Gotowość do startu nowego mikrocyklu!',
    };
  }

  const nowMs = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const sevenDaysAgoMs = nowMs - 7 * ONE_DAY_MS;
  const twentyEightDaysAgoMs = nowMs - 28 * ONE_DAY_MS;

  let sumLast7Days = 0;
  let sumLast28Days = 0;
  let validDateCount = 0;

  for (const r of runs) {
    const dist = Number(r.distanceKm) || 0;
    if (dist <= 0) continue;

    if (r.date) {
      const runDateMs = new Date(r.date).getTime();
      if (!isNaN(runDateMs)) {
        validDateCount++;
        if (runDateMs >= sevenDaysAgoMs) {
          sumLast7Days += dist;
        }
        if (runDateMs >= twentyEightDaysAgoMs) {
          sumLast28Days += dist;
        }
      }
    }
  }

  // Fallback if runs lack valid date strings: use recent indices
  if (validDateCount === 0) {
    const recentRuns = runs.slice(0, 4);
    sumLast7Days = recentRuns.reduce((acc, r) => acc + (Number(r.distanceKm) || 0), 0);
    const monthRuns = runs.slice(0, 16);
    sumLast28Days = monthRuns.reduce((acc, r) => acc + (Number(r.distanceKm) || 0), 0);
  }

  const acuteLoad = +(sumLast7Days.toFixed(1));
  const chronicLoad = +((sumLast28Days / 4).toFixed(1));
  const acwr = chronicLoad > 0 ? Number((acuteLoad / chronicLoad).toFixed(2)) : (acuteLoad > 0 ? 1.0 : 0);

  let status: PeakPerformanceAnalysis['status'] = 'Optymalny (Sweet Spot)';
  let statusColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  let peakScore = 94;
  let advice = 'Obciążenie treningowe jest w idealnej strefie wzrostu formy. Mięśnie adaptują się optymalnie.';

  if (acwr > 1.5) {
    status = 'Ryzyko Przeciążenia';
    statusColor = 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    peakScore = 62;
    advice = 'Zbyt gwałtowny wzrost kilometraża! Wprowadź dzień dodatkowej regeneracji.';
  } else if (acwr > 1.3) {
    status = 'Szybki Skok Formy';
    statusColor = 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    peakScore = 85;
    advice = 'Wysoka intensywność i szybki przyrost formy. Monitoruj tętno spoczynkowe i sen.';
  } else if (acwr < 0.8) {
    status = 'Regeneracja / Tapering';
    statusColor = 'text-sky-400 bg-sky-500/20 border-sky-500/40';
    peakScore = 88;
    advice = 'Niskie obciążenie – świetny moment na wypoczynek przed kluczowymi zawodami.';
  }

  return {
    acuteLoadKm: acuteLoad,
    chronicLoadKm: chronicLoad,
    acwr,
    status,
    statusColor,
    peakScore,
    advice,
  };
}

/**
 * Parses duration input in hh:mm:ss, mm:ss, or total minutes format into decimal minutes
 */
export function parseHmsToMinutes(input: string): number {
  if (!input) return 30;
  const str = input.trim();
  const parts = str.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  }
  const raw = parseFloat(str);
  return isNaN(raw) ? 30 : raw;
}

/**
 * Formats decimal minutes into hh:mm:ss or mm:ss string
 */
export function formatMinutesToHms(totalMinutes: number): string {
  const totalSec = Math.max(0, Math.round(totalMinutes * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface ReadinessBatteryAnalysis {
  score: number; // 0 - 100%
  status: 'optimal' | 'moderate' | 'low_battery';
  statusLabel: string;
  batteryColor: string;
  batteryBg: string;
  batteryBorder: string;
  isLowBatteryWarning: boolean;
  factors: {
    acwrImpact: number;
    sleepImpact: number;
    rhrImpact: number;
    fatigueImpact: number;
  };
  details: {
    acwr: number;
    sleepHours: number;
    rhr: number;
    daysSinceHardWorkout: number;
  };
  recommendation: string;
  suggestedAction?: 'rest' | 'recovery_run' | 'proceed';
}

/**
 * Calculates Recovery & Readiness Battery (0-100%) inspired by WHOOP, Oura & Garmin Body Battery.
 * Synthesizes ACWR load, sleep duration, resting heart rate (RHR), and muscle/CNS recovery window.
 */
export function calculateReadinessBattery(
  runs: Array<{ distanceKm: number; date?: string; avgPace?: string; avgHr?: number }> = [],
  profile?: { sleepHours?: number; restingHeartRate?: number; hrMax?: number }
): ReadinessBatteryAnalysis {
  const peak = calculatePeakPerformance(runs);
  const acwr = peak.acwr;
  const sleepHours = typeof profile?.sleepHours === 'number' && profile.sleepHours > 0 ? profile.sleepHours : 7.5;
  const rhr = typeof profile?.restingHeartRate === 'number' && profile.restingHeartRate > 0 ? profile.restingHeartRate : 52;

  // 1. ACWR Impact (-30 to +15)
  let acwrImpact = 0;
  if (acwr >= 0.85 && acwr <= 1.25) {
    acwrImpact = 15; // Optimal sweet spot
  } else if (acwr > 1.25 && acwr <= 1.45) {
    acwrImpact = -10; // High acute spike
  } else if (acwr > 1.45) {
    acwrImpact = -30; // Danger overload zone
  } else if (acwr > 0 && acwr < 0.85) {
    acwrImpact = 5; // Deload / recovery
  }

  // 2. Sleep Impact (-25 to +25)
  let sleepImpact = 0;
  if (sleepHours >= 8.5) {
    sleepImpact = 25;
  } else if (sleepHours >= 7.5) {
    sleepImpact = 18;
  } else if (sleepHours >= 6.5) {
    sleepImpact = 5;
  } else if (sleepHours >= 5.5) {
    sleepImpact = -12;
  } else {
    sleepImpact = -25; // Sleep deprivation
  }

  // 3. Resting Heart Rate Impact (-15 to +15)
  let rhrImpact = 0;
  if (rhr <= 50) {
    rhrImpact = 15; // Parasympathetic dominance, deep recovery
  } else if (rhr <= 56) {
    rhrImpact = 8;
  } else if (rhr <= 62) {
    rhrImpact = -4;
  } else {
    rhrImpact = -15; // Sympathetic stress / elevated RHR
  }

  // 4. Time Since Last Hard Workout (-25 to +15)
  let daysSinceHardWorkout = 3;
  let fatigueImpact = 10;
  const nowMs = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (runs && runs.length > 0) {
    const sorted = [...runs].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    const lastRun = sorted[0];
    if (lastRun && lastRun.date) {
      const diffDays = Math.max(0, (nowMs - new Date(lastRun.date).getTime()) / ONE_DAY_MS);
      daysSinceHardWorkout = Math.round(diffDays * 10) / 10;

      const dist = Number(lastRun.distanceKm) || 0;
      const hr = Number(lastRun.avgHr) || 150;
      const isHard = dist >= 10 || hr >= 165;

      if (diffDays < 1) {
        fatigueImpact = isHard ? -25 : -10;
      } else if (diffDays < 2) {
        fatigueImpact = isHard ? -5 : 10;
      } else {
        fatigueImpact = 15; // Supercompensation
      }
    }
  }

  // Aggregate Base 50 + Factors
  let rawScore = 50 + acwrImpact + sleepImpact + rhrImpact + fatigueImpact;
  const score = Math.max(12, Math.min(100, Math.round(rawScore)));

  let status: 'optimal' | 'moderate' | 'low_battery' = 'moderate';
  let statusLabel = 'Umiarkowana Gotowość';
  let batteryColor = 'text-amber-400';
  let batteryBg = 'bg-amber-500/15';
  let batteryBorder = 'border-amber-500/30';
  let recommendation = 'Układ nerwowy w normie. Możesz zrealizować zaplanowany trening tlenowy.';
  let suggestedAction: 'rest' | 'recovery_run' | 'proceed' = 'proceed';

  if (score >= 78) {
    status = 'optimal';
    statusLabel = 'Pełna Bateria / Gotowość PRO';
    batteryColor = 'text-emerald-400';
    batteryBg = 'bg-emerald-500/15';
    batteryBorder = 'border-emerald-500/30';
    recommendation = 'Optymalna regeneracja! Ciało jest w oknie superkompensacji – idealny moment na mocny akcent lub interwały.';
    suggestedAction = 'proceed';
  } else if (score < 45) {
    status = 'low_battery';
    statusLabel = 'Rozładowana Bateria (Wysokie Zmęczenie)';
    batteryColor = 'text-rose-400';
    batteryBg = 'bg-rose-500/15';
    batteryBorder = 'border-rose-500/40';
    recommendation = 'Wysokie zmęczenie mięśniowe lub krążeniowe! Zalecamy autokorektę planu na dziś: zamiana akcentu na regenerację Z1 lub dzień wolny.';
    suggestedAction = acwr > 1.45 ? 'rest' : 'recovery_run';
  }

  return {
    score,
    status,
    statusLabel,
    batteryColor,
    batteryBg,
    batteryBorder,
    isLowBatteryWarning: score < 45,
    factors: {
      acwrImpact,
      sleepImpact,
      rhrImpact,
      fatigueImpact,
    },
    details: {
      acwr,
      sleepHours,
      rhr,
      daysSinceHardWorkout,
    },
    recommendation,
    suggestedAction,
  };
}

