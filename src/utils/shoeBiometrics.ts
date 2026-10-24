import { Shoe, ShoeTrainingPurpose } from '../types.ts';

export interface ShoeTrainingBadgeInfo {
  id: ShoeTrainingPurpose;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

export const SHOE_TRAINING_PURPOSE_MAP: Record<ShoeTrainingPurpose, ShoeTrainingBadgeInfo> = {
  wolne_wybieganie: {
    id: 'wolne_wybieganie',
    label: 'Wolne wybieganie (Easy / Regeneracja)',
    shortLabel: 'Wolne wybieganie',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    description: 'Biegi w 1. i 2. strefie tlenowej (Z1/Z2), regeneracja powysiłkowa, budowanie bazy aerobowej.',
  },
  tempo: {
    id: 'tempo',
    label: 'Tempo Run (Biegi progowe)',
    shortLabel: 'Tempo run',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    description: 'Biegi w strefie przemian beztlenowych (próg mleczanowy Z3/Z4), interwały VO2Max, rytmy.',
  },
  long_run: {
    id: 'long_run',
    label: 'Long Run (Długie wybiegania)',
    shortLabel: 'Long run',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    description: 'Niedzielne długie wybiegania >15-35 km. Wymaga wysokiej amortyzacji i ochrony stawów.',
  },
  startowe: {
    id: 'startowe',
    label: 'Startowe (Zawody / Race Day)',
    shortLabel: 'Startowe',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    description: 'Dni startowe, bicie rekordów PB. Płytka karbonowa, ultra-lekka konstrukcja i maksymalny zwrot energii.',
  },
  treningowo_startowe: {
    id: 'treningowo_startowe',
    label: 'Treningowo-startowe (Speed & Tempo)',
    shortLabel: 'Treningowo-startowe',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    description: 'Wszechstronny but do mocnych akcentów treningowych, sprawdzianów oraz startów kontrolnych.',
  },
  terenowe: {
    id: 'terenowe',
    label: 'Terenowe / Trail (Las & Góry)',
    shortLabel: 'Terenowe / Trail',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    description: 'Bieżnik z wypustkami, zabezpieczona cholewka, stabilność na błocie, korzeniach i szutrze.',
  },
};

/**
 * Returns biomechanical explanation of shoe heel-to-toe drop
 */
export function explainShoeDrop(dropMm: number): {
  category: string;
  strikeStyle: string;
  biomechanics: string;
  muscleTension: string;
} {
  if (dropMm === 0) {
    return {
      category: 'Drop Zerowy (0 mm / Zero Drop)',
      strikeStyle: 'Naturalne lądowanie na śródstopiu i przodostopiu',
      biomechanics: 'Maksymalnie angażuje naturalną biomechanikę stopy, rozcięgno podeszwowe i ścięgno Achillesa.',
      muscleTension: 'Wymaga silnych mięśni łydek; odciąża kolana i stawy biodrowe.',
    };
  }
  if (dropMm <= 4) {
    return {
      category: 'Niski Drop (1 - 4 mm)',
      strikeStyle: 'Lądowanie na śródstopiu (Midfoot Strike)',
      biomechanics: 'Sprzyja wysokiej kadencji (>175 spm) i krótkiemu czasowi kontaktu z podłożem (GCT).',
      muscleTension: 'Zwiększone napięcie na łydki i ścięgno Achillesa; mniejsze obciążenie rzepki kolanowej.',
    };
  }
  if (dropMm <= 8) {
    return {
      category: 'Średni / Uniwersalny Drop (5 - 8 mm)',
      strikeStyle: 'Wszechstronne (śródstopie lub płynne przetoczenie)',
      biomechanics: 'Złoty środek współczesnego biegania: optymalna kołyska bez wymuszania nienaturalnej postawy.',
      muscleTension: 'Zrównoważone rozłożenie obciążeń między staw skokowy a staw kolanowy.',
    };
  }
  return {
    category: 'Wysoki Drop (9 - 12+ mm)',
    strikeStyle: 'Lądowanie na pięcie (Heel Strike)',
    biomechanics: 'Gruba poduszka pod piętą amortyzuje uderzenie przy wolniejszym biegu i dłuższym kroku.',
    muscleTension: 'Mocno odciąża ścięgno Achillesa i łydki; większe siły przenoszone na staw kolanowy.',
  };
}

/**
 * Returns textual description and rating breakdown for Cushioning
 */
export function explainShoeCushion(cushionRating: number = 8, customName?: string): {
  levelLabel: string;
  impactAbsorption: string;
  groundFeel: string;
} {
  if (cushionRating >= 9) {
    return {
      levelLabel: 'Maksymalna Amortyzacja (Max Cushion)',
      impactAbsorption: 'Pochłania do 85% energii uderzenia o twardy asfalt i beton.',
      groundFeel: 'Niskie czucie podłoża, maksymalna izolacja i komfort na biegach >20 km.',
    };
  }
  if (cushionRating >= 7) {
    return {
      levelLabel: 'Wysoka Amortyzacja (Daily Trainer)',
      impactAbsorption: 'Optymalna ochrona stawów przy zachowaniu dobrego sprzężenia zwrotnego.',
      groundFeel: 'Umiarkowane czucie podłoża, stabilna baza do codziennych wybiegań.',
    };
  }
  if (cushionRating >= 5) {
    return {
      levelLabel: 'Umiarkowana / Responsywna',
      impactAbsorption: 'Skupiona na zwrocie energii i szybkości niż miękkości "poduszkowej".',
      groundFeel: 'Dobre czucie podłoża, świetna kontrola w zakrętach i na bieżni.',
    };
  }
  return {
    levelLabel: 'Minimalistyczna / Naturalna',
    impactAbsorption: 'Niska amortyzacja — mięśnie stopy same absorbują siłę uderzenia.',
    groundFeel: 'Bezpośredni kontakt z nawierzchnią, pełna propriocepcja.',
  };
}

/**
 * Returns textual description and rating breakdown for Dynamics (Energy Return)
 */
export function explainShoeDynamics(energyReturn: number = 8, plateType?: string): {
  dynamicsLabel: string;
  propulsion: string;
  recommendedCadence: string;
} {
  if (energyReturn >= 9 || (plateType && plateType.toLowerCase().includes('karbon'))) {
    return {
      dynamicsLabel: 'Maksymalna Dynamika (Płytka Karbonowa / Superfoam)',
      propulsion: 'Efekt katapulty — pianka PEBA i włókno węglowe oddają do 85% włożonej energii.',
      recommendedCadence: 'Zalecana kadencja: >172 SPM. But nagradza szybkie przetoczenie.',
    };
  }
  if (energyReturn >= 7) {
    return {
      dynamicsLabel: 'Wysoka Sprężystość (Nowoczesna Pianka)',
      propulsion: 'Wyraźne odbicie ułatwiające utrzymanie tempa bez nadmiernego usztywnienia stopy.',
      recommendedCadence: 'Zalecana kadencja: 165 - 175 SPM. Uniwersalny na każdy trening.',
    };
  }
  return {
    dynamicsLabel: 'Umiarkowana / Liniowa',
    propulsion: 'Przewidywalna praca pianki EVA, brak agresywnego wybicia w przód.',
    recommendedCadence: 'Zalecana kadencja: 155 - 168 SPM. Spokojne tempo regeneracyjne.',
  };
}

/**
 * Returns Stability and Foot Type breakdown
 */
export function explainShoeStability(stabilityRating: number = 7, footType: string = 'Neutralna'): {
  stabilityLabel: string;
  footTypeAdvice: string;
  supportMechanism: string;
} {
  const isProne = footType.toLowerCase().includes('pron');
  const isSup = footType.toLowerCase().includes('supin');

  if (stabilityRating >= 8 || isProne) {
    return {
      stabilityLabel: 'Wysoka Stabilność / Wsparcie Pronacji',
      footTypeAdvice: 'Dla biegaczy z nadpronacją (opadaniem łuku stopy do wewnątrz) oraz cięższych biegaczy (>78 kg).',
      supportMechanism: 'Poszerzona platforma, szyny prowadzące GuideRails lub twardsza pianka od strony przyśrodkowej.',
    };
  }
  if (isSup) {
    return {
      stabilityLabel: 'Neutralna z amortyzacją boczną (Supinacja)',
      footTypeAdvice: 'Dla biegaczy lądujących na zewnętrznej krawędzi stopy.',
      supportMechanism: 'Miękka podeszwa redukująca siły uderzenia po zewnętrznej stronie.',
    };
  }
  return {
    stabilityLabel: 'Stabilność Neutralna',
    footTypeAdvice: 'Dla stóp neutralnych o prawidłowej biomechanice i stabilnym stawie skokowym.',
    supportMechanism: 'Swobodne przetoczenie stopy bez wymuszonych ograniczeń ruchu skrętnego.',
  };
}

/**
 * Smart automatic enrichment for any shoe object to guarantee full detailed specs
 */
export function enrichShoeSpecs(shoe: Partial<Shoe> & { name: string; brand: string }): Shoe {
  const nameLower = (shoe.name || '').toLowerCase();
  const brandLower = (shoe.brand || '').toLowerCase();

  // 1. Drop & Foot type
  const dropMm = typeof shoe.dropMm === 'number' ? shoe.dropMm : 8;
  const footType = shoe.footType || 'Neutralna';

  // 2. Ratings
  const cushionRating = typeof shoe.cushionRating === 'number' ? shoe.cushionRating : 8;
  const energyReturn = typeof shoe.energyReturn === 'number' ? shoe.energyReturn : 8;
  const stabilityRating = typeof shoe.stabilityRating === 'number' ? shoe.stabilityRating : 7;

  // 3. Plate Type detection
  let plateType = shoe.plateType;
  if (!plateType) {
    if (nameLower.includes('vaporfly') || nameLower.includes('alphafly') || nameLower.includes('metaspeed') || nameLower.includes('deviate') || nameLower.includes('pro 3') || nameLower.includes('carbon')) {
      plateType = 'Karbon (Włókno węglowe)';
    } else if (nameLower.includes('boston') || nameLower.includes('speed') || nameLower.includes('magic speed') || nameLower.includes('cloudmonster')) {
      plateType = 'Nylon / Pręty szklane (EnergyRods)';
    } else {
      plateType = 'Brak płytki (Elastyczna podeszwa)';
    }
  }

  // 4. Training purposes detection
  let trainingPurposes = shoe.trainingPurposes;
  if (!trainingPurposes || trainingPurposes.length === 0) {
    if (plateType.includes('Karbon') || nameLower.includes('vaporfly') || nameLower.includes('alphafly')) {
      trainingPurposes = ['startowe', 'tempo'];
    } else if (nameLower.includes('speed') || nameLower.includes('boston') || nameLower.includes('deviate')) {
      trainingPurposes = ['tempo', 'treningowo_startowe', 'long_run'];
    } else if (nameLower.includes('clifton') || nameLower.includes('1080') || nameLower.includes('nimbus') || nameLower.includes('ghost')) {
      trainingPurposes = ['wolne_wybieganie', 'long_run'];
    } else if (nameLower.includes('glide max tr') || nameLower.includes('speedcross') || nameLower.includes('peregrine') || nameLower.includes('trail')) {
      trainingPurposes = ['terenowe', 'wolne_wybieganie', 'long_run'];
    } else if (nameLower.includes('torin') || nameLower.includes('escalante')) {
      trainingPurposes = ['wolne_wybieganie', 'tempo'];
    } else {
      trainingPurposes = ['wolne_wybieganie', 'tempo', 'long_run'];
    }
  }

  // 5. Recommended Distance
  let recommendedDistance = shoe.recommendedDistance;
  if (!recommendedDistance) {
    if (trainingPurposes.includes('startowe')) {
      recommendedDistance = '5 km - Maraton (21 - 42.2 km)';
    } else if (trainingPurposes.includes('long_run')) {
      recommendedDistance = '10 km - Maraton (10 - 42 km)';
    } else if (trainingPurposes.includes('terenowe')) {
      recommendedDistance = '5 km - Ultra (>50 km w terenie)';
    } else {
      recommendedDistance = '5 km - Półmaraton (5 - 21.1 km)';
    }
  }

  // 6. Surface Type
  let surfaceType = shoe.surfaceType;
  if (!surfaceType) {
    if (trainingPurposes.includes('terenowe') || nameLower.includes('tr') || nameLower.includes('trail')) {
      surfaceType = 'Teren / Trail & Ścieżki leśne';
    } else if (plateType.includes('Karbon')) {
      surfaceType = 'Asfalt & Atestowane trasy uliczne';
    } else {
      surfaceType = 'Asfalt, Chodnik & Park miejski';
    }
  }

  // 7. Foam Technology
  let foamTechnology = shoe.foamTechnology;
  if (!foamTechnology) {
    if (brandLower.includes('asics')) foamTechnology = 'FF BLAST+ ECO / PureGEL';
    else if (brandLower.includes('nike')) foamTechnology = nameLower.includes('vapor') ? 'Pełna pianka ZoomX (Pebax)' : 'ReactX / Zoom Air';
    else if (brandLower.includes('adidas')) foamTechnology = 'Lightstrike Pro + Lightstrike 2.0';
    else if (brandLower.includes('hoka')) foamTechnology = 'Sprężysta formowana pianka CMEVA';
    else if (brandLower.includes('saucony')) foamTechnology = 'PWRRUN PB (Superfoam PEBA)';
    else if (brandLower.includes('new balance')) foamTechnology = 'Fresh Foam X (Injected EVA)';
    else if (brandLower.includes('brooks')) foamTechnology = 'DNA LOFT v3 (Nasycana azotem)';
    else if (brandLower.includes('puma')) foamTechnology = 'Nitro Elite (Pianka PEBA nasycana azotem)';
    else if (brandLower.includes('on')) foamTechnology = 'Helion Superfoam + Chmury CloudTec®';
    else if (brandLower.includes('mizuno')) foamTechnology = 'Enerzy NXT + Płytka Wave';
    else if (brandLower.includes('altra')) foamTechnology = 'Altra EGO™ MAX (Pianka Dual-Nature)';
    else if (brandLower.includes('salomon')) foamTechnology = 'Energy Foam + Contagrip';
    else foamTechnology = shoe.cushion || 'Nowoczesna responsywna pianka amortyzująca';
  }

  // 8. Drop description
  const dropInfo = explainShoeDrop(dropMm);
  const dropDescription = shoe.dropDescription || `${dropInfo.category} — ${dropInfo.strikeStyle}. ${dropInfo.muscleTension}`;

  const cushionInfo = explainShoeCushion(cushionRating, shoe.cushion);
  const dynamicsInfo = explainShoeDynamics(energyReturn, plateType);
  const stabilityInfo = explainShoeStability(stabilityRating, footType);

  return {
    id: shoe.id || `shoe-${Date.now()}`,
    name: shoe.name,
    brand: shoe.brand,
    footType: (shoe.footType as any) || 'Neutralna',
    mileageKm: shoe.mileageKm || 0,
    maxMileageKm: shoe.maxMileageKm || 700,
    dropMm,
    weightG: shoe.weightG || 260,
    energyReturn,
    cushionRating,
    stabilityRating,
    cushion: shoe.cushion || cushionInfo.levelLabel,
    idealFor: shoe.idealFor || 'Codzienne wybiegania i treningi w tlenie',
    cushionLevel: shoe.cushionLevel || cushionInfo.levelLabel,
    dynamicsLevel: shoe.dynamicsLevel || dynamicsInfo.dynamicsLabel,
    stabilityType: shoe.stabilityType || stabilityInfo.stabilityLabel,
    trainingPurposes,
    recommendedDistance,
    plateType,
    surfaceType,
    foamTechnology,
    dropDescription,
    aiNotes: shoe.aiNotes || shoe.aiVerdict,
    aiVerdict: shoe.aiVerdict || shoe.aiNotes,
    brandLogoSvg: shoe.brandLogoSvg,
    brandLogoUrl: shoe.brandLogoUrl,
    brandPrimaryColor: shoe.brandPrimaryColor,
    brandAccentColor: shoe.brandAccentColor,
    brandTagline: shoe.brandTagline,
  };
}
