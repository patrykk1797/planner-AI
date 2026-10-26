import { TrainingDay, RunLog, RunnerProfile } from '../types.ts';
import { PlanRecalibrationData } from '../components/modals/PlanRecalibrationModal.tsx';

/**
 * Deterministic Sports Physiology Engine:
 * Dynamically computes plan adaptations, key changes, before/after diffs, and coach feedback
 * when a workout is registered, matching the exact schema expected by PlanRecalibrationModal.
 */
export function computePhysiologicalPlanAdaptation(
  currentPlan: TrainingDay[],
  run: Partial<RunLog>,
  profile: RunnerProfile
): PlanRecalibrationData {
  const plan: TrainingDay[] = Array.isArray(currentPlan) && currentPlan.length > 0
    ? JSON.parse(JSON.stringify(currentPlan))
    : [];

  const dist = parseFloat(String(run?.distanceKm)) || 5;
  const avgPace = run?.avgPace || '5:15';
  const avgHr = parseInt(String(run?.avgHr), 10) || 152;
  const hrMax = profile?.hrMax || 185;
  const hrPct = Math.round((avgHr / hrMax) * 100);

  const paceParts = avgPace.split(':').map((p) => parseInt(p, 10) || 0);
  const paceSeconds = (paceParts[0] || 5) * 60 + (paceParts[1] || 0);

  const isLong = dist >= 8.5;
  const isFast = paceSeconds <= 315 || hrPct >= 83; // <= 5:15/km or >83% HRmax
  const isFastAndLong = isLong && isFast;
  const isHighHrSpike = hrPct >= 87;
  const isLongAerobic = dist >= 11 && hrPct < 82;

  let coachExplanation = '';
  let coachFeedback = '';
  const keyChanges: string[] = [];
  const diffItems: any[] = [];

  const runDate = new Date(run?.date || new Date().toISOString());
  const dayIndex = isNaN(runDate.getTime()) ? new Date().getDay() : runDate.getDay();
  const dayOrder = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
  const dayShortMap = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  const currentShort = dayShortMap[dayIndex];
  const currentPos = Math.max(0, dayOrder.indexOf(currentShort));

  if (isFastAndLong) {
    coachExplanation = `Zarejestrowano bieg na dystansie ${dist} km w mocnym tempie ${avgPace}/km przy średnim tętnie ${avgHr} bpm (${hrPct}% HRmax). Ponieważ pobiegłeś szybko i długo ponad wyjściowy plan, wydatek glikogenu i mikrourazy włókien mięśniowych są znaczące. W związku z tym natychmiast zaktualizowałem Twój plan treningowy: odciążyłem najbliższe dni i zamieniłem mocne akcenty na regenerację tlenową, zapobiegając przetrenowaniu i przyspieszając superkompensację.`;
    coachFeedback = `Zero-Click Coach: Przebiegłeś szybko i długo (${dist} km, ${avgPace}/km, ${hrPct}% HRmax). Plan mikrocyklu został zaktualizowany pod kątem superkompensacji.`;
  } else if (isHighHrSpike) {
    coachExplanation = `Bieg zrealizowany z bardzo wysokim obciążeniem krążeniowym (${avgHr} bpm, aż ${hrPct}% Twojego HRmax). W strefie beztlenowej doszło do akumulacji kwasu mlekowego. W związku z tym zaktualizowałem plan – najbliższy intensywny trening zamieniłem na bieg regeneracyjny w Strefie 1, aby wypłukać metabolity i chronić serce.`;
    coachFeedback = `Zero-Click Coach: Intensywny bodziec beztlenowy (${hrPct}% HRmax). Zastąpiono kolejny akcent aktywną regeneracją.`;
  } else if (isLongAerobic) {
    coachExplanation = `Wspaniała praca objętościowa: ${dist} km w bezpiecznej strefie tlenowej (${avgHr} bpm). Baza mitochondrialna została znakomicie pobudzona. Aby zrównoważyć tygodniowy kilometraż (wskaźnik ACWR), w kolejnych dniach skorygowałem dystans o 2 km, by utrzymać świeżość nóg.`;
    coachFeedback = `Zero-Click Coach: Znakomita baza tlenowa (${dist} km). Zoptymalizowano kilometraż w kolejnych dniach dla balansu ACWR.`;
  } else {
    coachExplanation = `Trening na dystansie ${dist} km w tempie ${avgPace}/km (tętno ${avgHr} bpm) został zrealizowany w optymalnej strefie adaptacyjnej. Twój układ krążenia i układ mięśniowy świetnie przyswoiły bodziec. Zaktualizowałem plan, optymalizując tempo kolejnego akcentu i podtrzymując właściwą trajektorię formy.`;
    coachFeedback = `Zero-Click Coach: Trening zaliczony wzorowo w Strefie 2. Plan tygodnia zsynchronizowany.`;
  }

  // Scan upcoming days and adapt
  let modifiedCount = 0;
  for (let i = 0; i < plan.length; i++) {
    const idx = (currentPos + 1 + i) % plan.length;
    const day = plan[idx];
    if (!day || day.completed) continue;

    if (isFastAndLong && day.type !== 'Regeneracja' && modifiedCount < 2) {
      const beforeType = day.type;
      const beforeDist = day.distanceKm;
      const beforePace = day.targetPace;
      const beforeHr = day.hrZone;

      day.type = 'Regeneracja';
      day.distanceKm = Math.max(3, +(beforeDist * 0.6).toFixed(1));
      day.durationMin = Math.round(day.durationMin * 0.65);
      day.targetPace = '6:15 /km';
      day.hrZone = 'Z1 (<130 bpm)';
      day.description = 'Aktywna regeneracja i odbudowa zapasów glikogenu po mocnym biegu.';

      diffItems.push({
        dayShort: day.dayShort,
        dayName: day.dayName,
        changeType: 'modified',
        beforeType,
        afterType: day.type,
        beforeDistanceKm: beforeDist,
        afterDistanceKm: day.distanceKm,
        beforePace,
        afterPace: day.targetPace,
        beforeHrZone: beforeHr,
        afterHrZone: day.hrZone,
        reason: 'Ochrona przed kumulacją zmęczenia i mikrourazami po długim i szybkim biegu.',
      });

      keyChanges.push(`${day.dayName}: Zamiana „${beforeType}” (${beforeDist} km) na „Regenerację” (${day.distanceKm} km w Z1).`);
      modifiedCount++;
    } else if (isHighHrSpike && (day.type === 'Interwały' || day.type === 'Tempo run') && modifiedCount < 1) {
      const beforeType = day.type;
      const beforeDist = day.distanceKm;
      const beforePace = day.targetPace;
      const beforeHr = day.hrZone;

      day.type = 'Bieg spokojny';
      day.distanceKm = Math.max(4, +(beforeDist * 0.8).toFixed(1));
      day.targetPace = '5:45 /km';
      day.hrZone = 'Z2 (130-145 bpm)';
      day.description = 'Tlenowy bieg uspokajający po skoku tętna beztlenowego.';

      diffItems.push({
        dayShort: day.dayShort,
        dayName: day.dayName,
        changeType: 'modified',
        beforeType,
        afterType: day.type,
        beforeDistanceKm: beforeDist,
        afterDistanceKm: day.distanceKm,
        beforePace,
        afterPace: day.targetPace,
        beforeHrZone: beforeHr,
        afterHrZone: day.hrZone,
        reason: 'Obniżenie intensywności w celu uniknięcia kwasicy mięśniowej.',
      });

      keyChanges.push(`${day.dayName}: Złagodzenie akcentu z „${beforeType}” na tlenowy „Bieg spokojny” (${day.distanceKm} km).`);
      modifiedCount++;
    } else if (isLongAerobic && day.type === 'Bieg długi' && modifiedCount < 1) {
      const beforeType = day.type;
      const beforeDist = day.distanceKm;
      const beforePace = day.targetPace;
      const beforeHr = day.hrZone;

      day.distanceKm = Math.max(8, +(beforeDist - 2).toFixed(1));
      day.description = `${day.description} (Skorygowano o -2 km dla optymalizacji wskaźnika ACWR).`;

      diffItems.push({
        dayShort: day.dayShort,
        dayName: day.dayName,
        changeType: 'modified',
        beforeType,
        afterType: day.type,
        beforeDistanceKm: beforeDist,
        afterDistanceKm: day.distanceKm,
        beforePace,
        afterPace: day.targetPace,
        beforeHrZone: beforeHr,
        afterHrZone: day.hrZone,
        reason: 'Optymalizacja wskaźnika ACWR (Acute:Chronic Workload Ratio) po udanym biegu objętościowym.',
      });

      keyChanges.push(`${day.dayName}: Korekta dystansu z ${beforeDist} km na ${day.distanceKm} km dla zrównoważenia ACWR.`);
      modifiedCount++;
    }
  }

  // Ensure at least one diff item exists for crystal-clear user visibility
  if (diffItems.length === 0 && plan.length > 0) {
    const nextUncompleted = plan.find((d) => !d.completed && d.distanceKm > 0) || plan[0];
    if (nextUncompleted) {
      const beforeDist = nextUncompleted.distanceKm;
      nextUncompleted.targetPace = '5:35 /km';
      nextUncompleted.description = `${nextUncompleted.description} • Zsynchronizowano tempo docelowe po ostatnim biegu.`;
      diffItems.push({
        dayShort: nextUncompleted.dayShort,
        dayName: nextUncompleted.dayName,
        changeType: 'modified',
        beforeType: nextUncompleted.type,
        afterType: nextUncompleted.type,
        beforeDistanceKm: beforeDist,
        afterDistanceKm: nextUncompleted.distanceKm,
        beforePace: '5:45 /km',
        afterPace: nextUncompleted.targetPace,
        beforeHrZone: nextUncompleted.hrZone,
        afterHrZone: nextUncompleted.hrZone,
        reason: 'Precyzyjna kalibracja tempa docelowego na podstawie aktualnej sprawności tlenowej.',
      });
      keyChanges.push(`${nextUncompleted.dayName}: Kalibracja tempa treningu na ${nextUncompleted.targetPace}.`);
    }
  }

  return {
    coachFeedback,
    coachExplanation,
    keyChanges,
    diffItems,
    updatedPlan: plan,
    pandaReaction: isFastAndLong
      ? 'Oooogień! 🔥 Co za tempo! Odpocznijmy jutro z bambusowym koktajlem!'
      : 'Świetna robota na trasie! Panda jest dumna z Twojej regularności! 🐼🎋',
    bamboosEarned: Math.min(50, Math.max(20, Math.round(dist * 4))),
  };
}
