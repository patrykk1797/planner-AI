import test from 'node:test';
import assert from 'node:assert';
import { computeRunningStreak, computeAchievements } from './achievementEngine.ts';
import type { RunLog, RunnerProfile } from '../types.ts';

const mockRuns: RunLog[] = [
  {
    id: 'run-1',
    date: '2026-10-18T08:00:00Z',
    distanceKm: 10.5,
    durationMin: 55,
    avgPace: '5:14 /km',
    avgHr: 154,
    avgCadence: 178,
    shoeName: 'Nike Pegasus',
  },
  {
    id: 'run-2',
    date: '2026-10-19T08:00:00Z',
    distanceKm: 21.2,
    durationMin: 110,
    avgPace: '5:11 /km',
    avgHr: 160,
    avgCadence: 182,
    gctMs: 228,
    shoeName: 'Saucony Endorphin',
  },
  {
    id: 'run-3',
    date: '2026-10-20T08:00:00Z',
    distanceKm: 70.0,
    durationMin: 360,
    avgPace: '4:28 /km',
    avgHr: 168,
    avgCadence: 185,
    elevationGainM: 120,
    shoeName: 'Asics Metaspeed',
  },
];

const mockProfile: RunnerProfile = {
  name: 'Patryk',
  birthdate: '15.05.1995',
  gender: 'M',
  weight: 74,
  targetWeight: 71,
  city: 'Zgierz',
  weeklyKm: 45,
  time5k: '21:30',
  hrMax: 192,
  rhr: 50,
  vo2max: 52,
  targetGoal: 'Sub-40 min na 10k',
  selectedDays: ['wtorek', 'czwartek', 'sobota', 'niedziela'],
  bamboos: 350,
  levelXp: 12,
  activePandaGear: { gear: 'czapka', skin: 'classic', bg: 'park' },
  coachTone: 'naukowy',
  accentColor: 'orange',
  theme: 'dark',
};

test('computeRunningStreak calculates active streak and total days', () => {
  const streak = computeRunningStreak(mockRuns);
  assert.ok(streak.totalRunningDays >= 3);
  assert.ok(streak.longestStreakDays >= 3);
  assert.strictEqual(typeof streak.currentStreakDays, 'number');
  assert.strictEqual(streak.activeLast14Days.length, 14);
});

test('computeAchievements unlocks 100km total milestone when total distance exceeds 100km', () => {
  const result = computeAchievements(mockRuns, mockProfile);
  // Total km = 10.5 + 21.2 + 70.0 = 101.7 km!
  assert.ok(result.totalKm >= 100);

  const badge100k = result.badges.find((b) => b.id === 'dist-100k');
  assert.ok(badge100k, 'dist-100k badge must exist');
  assert.strictEqual(badge100k?.isUnlocked, true, 'dist-100k must be unlocked when totalKm >= 100');
  assert.strictEqual(badge100k?.progressPercent, 100);

  const badgeHalf = result.badges.find((b) => b.id === 'single-half');
  assert.ok(badgeHalf, 'single-half badge must exist');
  assert.strictEqual(badgeHalf?.isUnlocked, true, 'single-half must be unlocked for 21.2 km run');

  const badgeSub430 = result.badges.find((b) => b.id === 'speed-sub430');
  assert.ok(badgeSub430, 'speed-sub430 badge must exist');
  assert.strictEqual(badgeSub430?.isUnlocked, true, 'speed-sub430 unlocked for 4:28 pace');

  const badgeStreak3d = result.badges.find((b) => b.id === 'streak-3d');
  assert.ok(badgeStreak3d, 'streak-3d badge must exist');
  assert.strictEqual(badgeStreak3d?.isUnlocked, true, 'streak-3d unlocked');

  assert.ok(result.unlockedCount > 0);
  assert.ok(result.totalPoints > 0);
});
