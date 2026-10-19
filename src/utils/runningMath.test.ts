import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  isBirthdayToday,
  time5kToSeconds,
  formatSecondsToTime,
  estimateVO2MaxFrom5k,
  runWhatIfSimulator,
  calculateCarbLoading,
  calculateFuelingPlan,
  calculateWeatherAdjustment,
  calculateNicotineRecovery,
  calculateDailyHydration,
  calculateHeartRateZones,
  evaluateAirQuality,
  generateCoachingFeedback,
} from './runningMath.ts';

test('calculateAge calculates correct age from DD.MM.YYYY string', () => {
  const ref = new Date(2026, 9, 18);
  assert.equal(calculateAge('14.05.1995', ref), 31);
  assert.equal(calculateAge('20.12.2000', ref), 25);
});

test('isBirthdayToday flags user birthday correctly', () => {
  const today = new Date(2026, 4, 14); // May 14
  assert.equal(isBirthdayToday('14.05.1995', today), true);
  assert.equal(isBirthdayToday('15.05.1995', today), false);
});

test('time5kToSeconds and formatSecondsToTime convert correctly', () => {
  assert.equal(time5kToSeconds('25:00'), 1500);
  assert.equal(formatSecondsToTime(1500), '25:00');
  assert.equal(formatSecondsToTime(3665), '1:01:05');
});

test('runWhatIfSimulator predicts faster times when losing weight or improving cadence', () => {
  const base = runWhatIfSimulator({
    baseWeightKg: 75,
    simWeightKg: 75,
    base5kSeconds: 1500, // 25:00
    cadenceSpm: 160,
    aerobicZ2Pct: 50,
    strengthWeekly: 1,
    sleepScore: 7,
    raceTempC: 15,
    shoeWeightG: 250,
    shoeEnergyReturn: 7,
    isCarbonShoe: false,
  });

  const lighter = runWhatIfSimulator({
    baseWeightKg: 75,
    simWeightKg: 71, // -4 kg
    base5kSeconds: 1500,
    cadenceSpm: 176, // +16 spm
    aerobicZ2Pct: 80,
    strengthWeekly: 2,
    sleepScore: 8,
    raceTempC: 12,
    shoeWeightG: 210,
    shoeEnergyReturn: 9,
    isCarbonShoe: true,
  });

  assert.ok(time5kToSeconds(lighter.predicted5kTime) < time5kToSeconds(base.predicted5kTime));
  assert.ok(lighter.gctMs < base.gctMs, 'Higher cadence shortens ground contact time');
  assert.ok(lighter.vo2RelativeGain > 0, 'Weight loss increases relative VO2 max');
  assert.equal(lighter.roadmapStages.length, 4, 'Includes 4-stage roadmap');
});

test('calculateCarbLoading computes protocol for half and full marathon', () => {
  const half = calculateCarbLoading(70, 'half');
  const full = calculateCarbLoading(70, 'marathon');
  assert.ok(full.dailyCarbsG > half.dailyCarbsG);
  assert.equal(full.durationHours, 72);
  assert.equal(half.durationHours, 48);
  assert.ok(full.foodList.length >= 5);
});

test('calculateFuelingPlan provides race day schedule and gel stations', () => {
  const fueling = calculateFuelingPlan('marathon', 210);
  assert.deepEqual(fueling.gelCheckpointsKm, [6, 12, 18, 24, 30, 36]);
  assert.ok(fueling.morningSchedule.length >= 3);
  assert.match(fueling.strategyName, /Negative Split/);
});

test('calculateWeatherAdjustment applies pace penalty for heat and wind', () => {
  const mild = calculateWeatherAdjustment(14, 10);
  const hot = calculateWeatherAdjustment(28, 30);
  assert.equal(mild.paceCorrectionSecPerKm, 0);
  assert.ok(hot.paceCorrectionSecPerKm > 10);
  assert.match(mild.clothingAdvice, /krótkim rękawem/i);
});

test('calculateNicotineRecovery tracks health milestones and RHR reduction', () => {
  const early = calculateNicotineRecovery(5);
  const veteran = calculateNicotineRecovery(90);
  assert.ok(veteran.rhrReductionBpm > early.rhrReductionBpm);
  assert.ok(veteran.vo2Gain > early.vo2Gain);
  assert.match(veteran.healthMilestone, /Funkcja płuc/i);
});

test('calculateDailyHydration and calculateHeartRateZones', () => {
  const hydro = calculateDailyHydration(75, 25, 10);
  assert.ok(hydro > 2500);
  const zones = calculateHeartRateZones(190, 55);
  assert.ok(zones.zone2.min > 120 && zones.zone2.max < 160);
});
