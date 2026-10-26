import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAgeCategory,
  calculateJackDanielsVdot,
  computeRunnerTelemetry,
  checkAndUpdatePersonalBests,
  calculateRunRewards,
} from './physiologicalEngine.ts';
import type { RunLog, RunnerProfile, PersonalBest } from '../types.ts';

test('calculateAgeCategory assigns correct categories for men and women', () => {
  // Birthdate 1995-05-14 (around 31 years old)
  assert.equal(calculateAgeCategory('M', '14.05.1995'), 'M30');
  assert.equal(calculateAgeCategory('F', '14.05.1995'), 'K30');
  // Birthdate 2002-01-01 (around 24 years old)
  assert.equal(calculateAgeCategory('M', '01.01.2002'), 'M20');
  assert.equal(calculateAgeCategory('F', '01.01.2002'), 'K20');
  // Birthdate 1980-01-01 (around 46 years old)
  assert.equal(calculateAgeCategory('M', '01.01.1980'), 'M40');
});

test('calculateJackDanielsVdot computes realistic VDOT from race distance and time', () => {
  // 5k in 25:00 (1500s) -> ~38.5 VDOT
  const vdot5k = calculateJackDanielsVdot(5000, 1500);
  assert.ok(vdot5k >= 37 && vdot5k <= 40, `Expected ~38.5, got ${vdot5k}`);

  // 10k in 45:00 (2700s) -> ~45 VDOT
  const vdot10k = calculateJackDanielsVdot(10000, 2700);
  assert.ok(vdot10k >= 43 && vdot10k <= 47, `Expected ~45, got ${vdot10k}`);
});

test('computeRunnerTelemetry handles empty workouts gracefully with no hardcoded fallback metrics', () => {
  const profile: RunnerProfile = {
    name: 'Jan',
    birthdate: '10.10.1990',
    gender: 'M',
    weight: 75,
    targetWeight: 70,
    height: 180,
    city: 'Łódź',
    weeklyKm: 20,
    time5k: '25:00',
    hrMax: 190,
    rhr: 60,
    vo2max: 38,
    targetGoal: '5 km',
    selectedDays: ['Wt', 'Czw'],
    bamboos: 100,
    levelXp: 200,
    activePandaGear: { gear: '', skin: '', bg: '' },
    coachTone: 'naukowy',
    accentColor: 'orange',
    theme: 'dark',
  };

  const emptyTelemetry = computeRunnerTelemetry(profile, []);
  assert.equal(emptyTelemetry.hasWorkouts, false);
  assert.equal(emptyTelemetry.totalWorkouts, 0);
  assert.equal(emptyTelemetry.totalKm, 0);
  assert.equal(emptyTelemetry.avgCadence, null);
  assert.equal(emptyTelemetry.avgGctMs, null);
  assert.equal(emptyTelemetry.avgHeartRate, null);
  assert.ok(emptyTelemetry.vdot > 30);
  // Karvonen zones Z1-Z5
  assert.equal(emptyTelemetry.hrZones.zone1.min, 125); // 60 + 130 * 0.5
  assert.equal(emptyTelemetry.hrZones.zone5.max, 190);
});

test('computeRunnerTelemetry computes real averages when workouts exist', () => {
  const profile: RunnerProfile = {
    name: 'Jan',
    birthdate: '10.10.1990',
    gender: 'M',
    weight: 75,
    targetWeight: 70,
    height: 180,
    city: 'Łódź',
    weeklyKm: 20,
    time5k: '25:00',
    hrMax: 190,
    rhr: 60,
    vo2max: 38,
    targetGoal: '5 km',
    selectedDays: ['Wt', 'Czw'],
    bamboos: 100,
    levelXp: 200,
    activePandaGear: { gear: '', skin: '', bg: '' },
    coachTone: 'naukowy',
    accentColor: 'orange',
    theme: 'dark',
  };

  const workouts: RunLog[] = [
    {
      id: 'w1',
      date: new Date().toISOString().split('T')[0],
      distanceKm: 5,
      durationMin: 25,
      avgPace: '5:00',
      avgHr: 155,
      avgCadence: 176,
      gctMs: 230,
      shoeName: 'Nike Pegasus',
    },
    {
      id: 'w2',
      date: new Date().toISOString().split('T')[0],
      distanceKm: 10,
      durationMin: 52,
      avgPace: '5:12',
      avgHr: 165,
      avgCadence: 180,
      gctMs: 240,
      shoeName: 'Nike Pegasus',
    },
  ];

  const telemetry = computeRunnerTelemetry(profile, workouts);
  assert.equal(telemetry.hasWorkouts, true);
  assert.equal(telemetry.totalWorkouts, 2);
  assert.equal(telemetry.totalKm, 15);
  assert.equal(telemetry.avgCadence, 178); // (176 + 180) / 2
  assert.equal(telemetry.avgGctMs, 235); // (230 + 240) / 2
  assert.equal(telemetry.avgHeartRate, 160); // (155 + 165) / 2
});

test('checkAndUpdatePersonalBests detects new PB on qualifying distances', () => {
  const currentPbs: PersonalBest[] = [
    {
      distanceId: '5k',
      distanceName: '5 km',
      time: '26:00',
      pace: '5:12 /km',
      date: '2026-01-01',
    },
  ];

  // A 5km run in 24:30 (faster!)
  const newFastRun: RunLog = {
    id: 'run-fast',
    date: '2026-10-21',
    distanceKm: 5.0,
    durationMin: 24.5,
    avgPace: '4:54',
    avgHr: 168,
    avgCadence: 182,
    shoeName: 'Puma Deviate',
  };

  const result = checkAndUpdatePersonalBests(newFastRun, currentPbs);
  assert.ok(result.beatenDistances.includes('5 km'));
  const updated5k = result.updatedPbs.find((p) => p.distanceId === '5k');
  assert.ok(updated5k);
  assert.equal(updated5k?.time, '24:30');
});

test('calculateRunRewards awards 15 bamboos per km and 50 bonus for cadence >= 162', () => {
  const runHighCadence: RunLog = {
    id: 'r1',
    date: '2026-10-21',
    distanceKm: 10,
    durationMin: 50,
    avgPace: '5:00',
    avgHr: 155,
    avgCadence: 178, // >= 162
    shoeName: 'Hoka',
  };

  const rewards = calculateRunRewards(runHighCadence);
  assert.equal(rewards.bamboos, 10 * 15 + 50); // 150 + 50 = 200
  assert.equal(rewards.xp, 200);

  const runLowCadence: RunLog = {
    id: 'r2',
    date: '2026-10-21',
    distanceKm: 4,
    durationMin: 24,
    avgPace: '6:00',
    avgHr: 140,
    avgCadence: 155, // < 162
    shoeName: 'Hoka',
  };

  const lowRewards = calculateRunRewards(runLowCadence);
  assert.equal(lowRewards.bamboos, 4 * 15); // 60
});
