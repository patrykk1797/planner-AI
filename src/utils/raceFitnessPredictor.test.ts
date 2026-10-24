import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveRaceTimeFromVo2Max,
  analyzeRecentTrainingPace,
  calculateRaceFitnessPrediction,
} from './raceFitnessPredictor.ts';
import type { RunnerProfile, RunLog } from './runningMath.ts';

const mockProfile: RunnerProfile = {
  name: 'Patryk',
  birthdate: '14.05.1995',
  gender: 'M',
  weight: 74,
  targetWeight: 70,
  city: 'Zgierz',
  weeklyKm: 35,
  time5k: '24:00',
  hrMax: 190,
  rhr: 55,
  vo2max: 52.0,
  targetGoal: 'Sub-45 na 10 km',
  selectedDays: ['Wt', 'Czw', 'Sob', 'Niedz'],
  bamboos: 150,
  activePandaGear: { gear: 'none', skin: 'default', bg: 'dojo' },
};

const mockRuns: RunLog[] = [
  {
    id: 'run-1',
    date: '2026-10-18',
    distanceKm: 10.0,
    durationMin: 49,
    avgPace: '4:54',
    avgHr: 158,
    avgCadence: 176,
    shoeName: 'Nike Pegasus 41',
  },
  {
    id: 'run-2',
    date: '2026-10-15',
    distanceKm: 6.0,
    durationMin: 28,
    avgPace: '4:40',
    avgHr: 165,
    avgCadence: 178,
    shoeName: 'Nike Pegasus 41',
  },
  {
    id: 'run-3',
    date: '2026-10-12',
    distanceKm: 14.0,
    durationMin: 77,
    avgPace: '5:30',
    avgHr: 145,
    avgCadence: 172,
    shoeName: 'Nike Pegasus 41',
  },
];

test('solveRaceTimeFromVo2Max produces realistic times across distances', () => {
  // VO2Max 52 for 5k should be around 20-22 min
  const time5k = solveRaceTimeFromVo2Max(5.0, 52.0);
  assert.ok(time5k >= 1150 && time5k <= 1400, `Expected 5k between 1150s and 1400s, got ${time5k}`);

  // VO2Max 52 for 10k should be around 39-47 min (2340s - 2820s)
  const time10k = solveRaceTimeFromVo2Max(10.0, 52.0);
  assert.ok(time10k >= 2200 && time10k <= 2900, `Expected 10k between 2200s and 2900s, got ${time10k}`);

  // VO2Max 52 for half marathon should be around 1h28m (5320s)
  const timeHalf = solveRaceTimeFromVo2Max(21.0975, 52.0);
  assert.ok(timeHalf >= 5000 && timeHalf <= 6200, `Expected Half between 5000s and 6200s, got ${timeHalf}`);
});

test('analyzeRecentTrainingPace correctly computes pace and longest run', () => {
  const analysis = analyzeRecentTrainingPace(mockRuns, mockProfile, 10.0);
  assert.equal(analysis.recentRunsCount, 3);
  assert.equal(analysis.longestRunKm, 14.0);
  assert.ok(analysis.avgPaceSec > 280 && analysis.avgPaceSec < 340);
  assert.ok(analysis.tempoPaceSec <= analysis.avgPaceSec);
});

test('calculateRaceFitnessPrediction compares VO2Max with recent training pace', () => {
  const result = calculateRaceFitnessPrediction(mockProfile, mockRuns, 10.0);

  assert.equal(result.targetDistanceKm, 10.0);
  assert.ok(result.currentVo2Max >= 45);
  assert.ok(result.vo2PredictedTimeSec > 0);
  assert.ok(result.trainingPredictedTimeSec > 0);
  assert.ok(result.hybridPredictedTimeSec > 0);
  assert.ok(result.splits.length > 0);

  // Check that strings are formatted correctly
  assert.match(result.hybridPredictedTimeStr, /^\d+:\d{2}(:\d{2})?$/);
  assert.match(result.hybridPredictedPaceStr, /^\d+:\d{2}$/);
  assert.ok(result.readinessIndexPercent >= 60 && result.readinessIndexPercent <= 100);
});

test('calculateRaceFitnessPrediction detects missing long run on half/marathon', () => {
  const shortRuns: RunLog[] = [
    {
      id: 'short-1',
      date: '2026-10-18',
      distanceKm: 5.0,
      durationMin: 25,
      avgPace: '5:00',
      avgHr: 150,
      avgCadence: 170,
      shoeName: 'Shoe',
    },
  ];

  const result = calculateRaceFitnessPrediction(mockProfile, shortRuns, 21.0975);
  assert.equal(result.formStatus, 'brak_bazy_dlugiej');
  assert.ok(result.readinessIndexPercent < 80);
});
