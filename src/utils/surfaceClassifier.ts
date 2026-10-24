export type SurfaceCategory = 'asfalt' | 'szuter' | 'ścieżka leśna';

export interface SurfaceBreakdownInput {
  asfaltMeters: number;
  szuterMeters: number;
  lesnaMeters: number;
}

export interface ComputedSurfaceBreakdown {
  asfaltPercent: number;
  szuterPercent: number;
  lesnaPercent: number;
  asfaltKm: number;
  szuterKm: number;
  lesnaKm: number;
  totalKm: number;
  dominantSurface: SurfaceCategory;
  recommendedShoeCategory: 'Szosowe' | 'Trailowe' | 'All-Terrain (Gravel/Hybryda)';
  shoeRecommendationReason: string;
}

/**
 * Calculates surface percentages and dominant category from distances
 */
export function computeSurfaceBreakdown(input: SurfaceBreakdownInput): ComputedSurfaceBreakdown {
  const totalMeters = input.asfaltMeters + input.szuterMeters + input.lesnaMeters;
  const totalKm = Number((totalMeters / 1000).toFixed(2));
  const asfaltKm = Number((input.asfaltMeters / 1000).toFixed(2));
  const szuterKm = Number((input.szuterMeters / 1000).toFixed(2));
  const lesnaKm = Number((input.lesnaMeters / 1000).toFixed(2));

  const asfaltPercent = totalMeters > 0 ? Math.round((input.asfaltMeters / totalMeters) * 100) : 100;
  const szuterPercent = totalMeters > 0 ? Math.round((input.szuterMeters / totalMeters) * 100) : 0;
  const lesnaPercent = totalMeters > 0 ? Math.max(0, 100 - asfaltPercent - szuterPercent) : 0;

  let dominantSurface: SurfaceCategory = 'asfalt';
  if (lesnaPercent >= asfaltPercent && lesnaPercent >= szuterPercent) {
    dominantSurface = 'ścieżka leśna';
  } else if (szuterPercent >= asfaltPercent && szuterPercent >= lesnaPercent) {
    dominantSurface = 'szuter';
  }

  let recommendedShoeCategory: 'Szosowe' | 'Trailowe' | 'All-Terrain (Gravel/Hybryda)' = 'Szosowe';
  let shoeRecommendationReason = '';

  if (lesnaPercent >= 45) {
    recommendedShoeCategory = 'Trailowe';
    shoeRecommendationReason = `Dominacja ścieżek leśnych (${lesnaPercent}%). Wybierz buty trailowe z agresywnym bieżnikiem (3.5-5mm), aby zapewnić optymalną przyczepność na korzeniach i miękkim podłożu.`;
  } else if (szuterPercent >= 35 || lesnaPercent + szuterPercent >= 45) {
    recommendedShoeCategory = 'All-Terrain (Gravel/Hybryda)';
    shoeRecommendationReason = `Trasa mieszana (szuter ${szuterPercent}%, las ${lesnaPercent}%). Najlepiej sprawdzi się uniwersalne obuwie hybrydowe (door-to-trail) z umiarkowanym bieżnikiem i pianką tłumiącą nierówności.`;
  } else {
    recommendedShoeCategory = 'Szosowe';
    shoeRecommendationReason = `Główna nawierzchnia to asfalt (${asfaltPercent}%). Zalecane klasyczne buty szosowe z responsywną amortyzacją (lub startowe z płytką carbonową dla maksymalnego zwrotu energii).`;
  }

  return {
    asfaltPercent,
    szuterPercent,
    lesnaPercent,
    asfaltKm,
    szuterKm,
    lesnaKm,
    totalKm,
    dominantSurface,
    recommendedShoeCategory,
    shoeRecommendationReason,
  };
}

/**
 * Calculates total climb and descent from an array of elevation points
 */
export function calculateElevationGainLoss(profile: { elevationM: number }[]): {
  gainM: number;
  lossM: number;
} {
  let gainM = 0;
  let lossM = 0;

  for (let i = 1; i < profile.length; i++) {
    const diff = profile[i].elevationM - profile[i - 1].elevationM;
    if (diff > 0) gainM += diff;
    else lossM += Math.abs(diff);
  }

  return {
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
  };
}
