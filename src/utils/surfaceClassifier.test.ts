import test from 'node:test';
import assert from 'node:assert';
import { computeSurfaceBreakdown, calculateElevationGainLoss } from './surfaceClassifier.ts';

test('computeSurfaceBreakdown correctly classifies road race as asphalt', () => {
  const result = computeSurfaceBreakdown({
    asfaltMeters: 8000,
    szuterMeters: 1000,
    lesnaMeters: 1000,
  });

  assert.strictEqual(result.asfaltPercent, 80);
  assert.strictEqual(result.szuterPercent, 10);
  assert.strictEqual(result.lesnaPercent, 10);
  assert.strictEqual(result.dominantSurface, 'asfalt');
  assert.strictEqual(result.recommendedShoeCategory, 'Szosowe');
  assert.strictEqual(result.totalKm, 10.0);
});

test('computeSurfaceBreakdown correctly classifies forest trail race as trail', () => {
  const result = computeSurfaceBreakdown({
    asfaltMeters: 500,
    szuterMeters: 1500,
    lesnaMeters: 8000,
  });

  assert.strictEqual(result.dominantSurface, 'ścieżka leśna');
  assert.strictEqual(result.recommendedShoeCategory, 'Trailowe');
  assert.strictEqual(result.lesnaPercent, 80);
});

test('computeSurfaceBreakdown classifies gravel/mixed path as All-Terrain', () => {
  const result = computeSurfaceBreakdown({
    asfaltMeters: 2000,
    szuterMeters: 4500,
    lesnaMeters: 3500,
  });

  assert.strictEqual(result.dominantSurface, 'szuter');
  assert.strictEqual(result.recommendedShoeCategory, 'All-Terrain (Gravel/Hybryda)');
});

test('calculateElevationGainLoss computes correct cumulative gain and loss', () => {
  const profile = [
    { elevationM: 190 },
    { elevationM: 205 }, // +15
    { elevationM: 200 }, // -5
    { elevationM: 220 }, // +20
    { elevationM: 210 }, // -10
  ];

  const { gainM, lossM } = calculateElevationGainLoss(profile);
  assert.strictEqual(gainM, 35);
  assert.strictEqual(lossM, 15);
});
