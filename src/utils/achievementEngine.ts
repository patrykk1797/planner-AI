import type { RunLog, RunnerProfile, AchievementBadge, RunningStreakStats } from '../types.ts';

const SEEN_BADGES_KEY = 'treda_seen_badges_v1';

/**
 * Converts pace string "MM:SS" into total seconds per kilometer.
 */
export function parsePaceToSeconds(paceStr?: string): number {
  if (!paceStr) return 9999;
  const clean = paceStr.replace('/km', '').replace('min/km', '').trim();
  const parts = clean.split(':');
  if (parts.length < 2) return 9999;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s)) return 9999;
  return m * 60 + s;
}

/**
 * Computes running streak from an array of run logs.
 */
export function computeRunningStreak(runs: RunLog[]): RunningStreakStats {
  if (!runs || runs.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      totalRunningDays: 0,
      lastRunDate: null,
      activeLast14Days: [],
      streakStatusMessage: 'Dodaj swój pierwszy bieg, aby rozpocząć serię!',
    };
  }

  // Extract unique run dates sorted ascending
  const dateSet = new Set<string>();
  const runsByDate = new Map<string, number>();

  runs.forEach((r) => {
    if (r.date) {
      const dStr = r.date.split('T')[0];
      dateSet.add(dStr);
      const curr = runsByDate.get(dStr) || 0;
      runsByDate.set(dStr, curr + (Number(r.distanceKm) || 0));
    }
  });

  const sortedDates = Array.from(dateSet).sort();
  const totalRunningDays = sortedDates.length;
  const lastRunDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  // Calculate longest streak in history
  let longestStreak = 0;
  let tempStreak = 0;
  let prevTime: number | null = null;

  sortedDates.forEach((dStr) => {
    const curTime = new Date(dStr + 'T12:00:00Z').getTime();
    if (prevTime === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((curTime - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevTime = curTime;
  });

  // Calculate current active streak
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const mostRecentDate = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00Z');
    const daysSinceLast = Math.round((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Active if run today (0) or yesterday (1)
    if (daysSinceLast <= 1) {
      currentStreak = 1;
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const d1 = new Date(sortedDates[i] + 'T12:00:00Z').getTime();
        const d0 = new Date(sortedDates[i - 1] + 'T12:00:00Z').getTime();
        const diff = Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      // Streak broken but user had recent momentum
      currentStreak = 0;
    }
  }

  // Build 14-day history window for the visual calendar
  const activeLast14Days: RunningStreakStats['activeLast14Days'] = [];
  const dayLabels = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const baseDate = new Date();
  baseDate.setHours(12, 0, 0, 0);

  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const hasRun = dateSet.has(dateStr);
    const distance = runsByDate.get(dateStr) || 0;
    const dayLabel = dayLabels[d.getDay()];

    activeLast14Days.push({
      date: dateStr,
      dayLabel,
      hasRun,
      distanceKm: Number(distance.toFixed(1)),
    });
  }

  let streakStatusMessage = 'Ogień płonie! Utrzymaj rytm biegowy 🔥';
  if (currentStreak >= 7) {
    streakStatusMessage = 'Niesamowita seria! Jesteś w żelaznym rytmie treningowym 🏆';
  } else if (currentStreak >= 3) {
    streakStatusMessage = 'Świetna konsekwencja! Jeszcze chwila do odznaki 7-dniowej!';
  } else if (currentStreak === 0 && lastRunDate) {
    streakStatusMessage = 'Czas na kolejny bieg, aby podtrzymać formę!';
  }

  return {
    currentStreakDays: currentStreak,
    longestStreakDays: Math.max(longestStreak, currentStreak),
    totalRunningDays,
    lastRunDate,
    activeLast14Days,
    streakStatusMessage,
  };
}

/**
 * Computes all achievement badges based on runs and profile.
 */
export function computeAchievements(runs: RunLog[], profile?: RunnerProfile) {
  const streak = computeRunningStreak(runs);

  // Compute aggregated stats
  const totalKm = runs.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);
  const totalRuns = runs.length;

  // Single run maximums
  const maxSingleDistance = runs.reduce((max, r) => Math.max(max, Number(r.distanceKm) || 0), 0);
  const maxCadence = runs.reduce((max, r) => Math.max(max, Number(r.avgCadence) || 0), 0);
  const minGct = runs.reduce((min, r) => {
    const val = Number(r.gctMs);
    return val > 100 ? Math.min(min, val) : min;
  }, 999);
  const maxElevation = runs.reduce((max, r) => Math.max(max, Number(r.elevationGainM) || 0), 0);

  // Fastest pace
  const fastestPaceSec = runs.reduce((fastest, r) => {
    const sec = parsePaceToSeconds(r.avgPace);
    return sec < fastest ? sec : fastest;
  }, 9999);

  // Vo2Max
  const currentVo2 = Number(profile?.vo2max) || 48;

  // Find earliest dates for milestones
  const findDateWhenTotalKmExceeded = (target: number): string | undefined => {
    let accumulated = 0;
    // Sort chronological
    const sorted = [...runs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const r of sorted) {
      accumulated += Number(r.distanceKm) || 0;
      if (accumulated >= target) {
        return r.date;
      }
    }
    return undefined;
  };

  const findDateWhenSingleDistanceExceeded = (target: number): string | undefined => {
    const match = runs.find((r) => (Number(r.distanceKm) || 0) >= target);
    return match?.date;
  };

  const findDateWhenPaceBroken = (targetSec: number): string | undefined => {
    const match = runs.find((r) => parsePaceToSeconds(r.avgPace) <= targetSec);
    return match?.date;
  };

  const findDateWhenCadenceReached = (targetSpm: number): string | undefined => {
    const match = runs.find((r) => (Number(r.avgCadence) || 0) >= targetSpm);
    return match?.date;
  };

  // Define badges catalog
  const badgesCatalog: Omit<AchievementBadge, 'currentValue' | 'isUnlocked' | 'progressPercent' | 'unlockedAt'>[] = [
    // 1. TOTAL DISTANCE
    {
      id: 'dist-first-step',
      title: 'Pierwszy Krok',
      description: 'Zarejestruj swój pierwszy bieg w dzienniku Treda.',
      category: 'distance',
      tier: 'bronze',
      icon: '👟',
      targetValue: 1,
      unit: 'bieg',
      rewardBamboos: 25,
      tip: 'Każda wielka podróż zaczyna się od pierwszego wybiegania.',
    },
    {
      id: 'dist-50k',
      title: 'Klub 50 KM',
      description: 'Przebiegnij łącznie 50 kilometrów w treningach.',
      category: 'distance',
      tier: 'bronze',
      icon: '🥉',
      targetValue: 50,
      unit: 'km',
      rewardBamboos: 50,
      tip: 'Regularne wybiegania budują niezniszczalną bazę tlenową.',
    },
    {
      id: 'dist-100k',
      title: 'Setka Pękła (100 KM Total)',
      description: 'Osiągnij magiczną barierę 100 kilometrów łącznego przebiegu!',
      category: 'distance',
      tier: 'silver',
      icon: '🥈',
      targetValue: 100,
      unit: 'km',
      rewardBamboos: 100,
      tip: 'Sto kilometrów w nogach to dowód na prawdziwe biegowe zaangażowanie.',
    },
    {
      id: 'dist-250k',
      title: 'Mistrz Szosy 250 KM',
      description: 'Pokonaj łącznie 250 kilometrów na trasach.',
      category: 'distance',
      tier: 'gold',
      icon: '🥇',
      targetValue: 250,
      unit: 'km',
      rewardBamboos: 200,
      tip: 'Twoja pojemność tlenowa i gęstość mitochondriów są na elitarnym poziomie.',
    },
    {
      id: 'dist-500k',
      title: 'Biegowy Tytan 500 KM',
      description: 'Przebiegnij łącznie 500 kilometrów – dystans z Warszawy do Gdańska i z powrotem!',
      category: 'distance',
      tier: 'diamond',
      icon: '💎',
      targetValue: 500,
      unit: 'km',
      rewardBamboos: 500,
      tip: 'Prawdziwy tytan szosy. Jesteś inspiracją dla całej społeczności.',
    },

    // 2. STREAKS & CONSISTENCY
    {
      id: 'streak-3d',
      title: 'Iskra Regularności',
      description: 'Utrzymaj serię 3 dni z zarejestrowanym biegiem.',
      category: 'streak',
      tier: 'bronze',
      icon: '🔥',
      targetValue: 3,
      unit: 'dni',
      rewardBamboos: 30,
      tip: 'Trzy dni z rzędu tworzą zalążek trwałego nawyku.',
    },
    {
      id: 'streak-7d',
      title: 'Żelazna Konsekwencja (7-Day Streak)',
      description: 'Zarejestruj 7 dni nieprzerwanej aktywności biegowej z rzędu!',
      category: 'streak',
      tier: 'silver',
      icon: '⚡',
      targetValue: 7,
      unit: 'dni',
      rewardBamboos: 150,
      tip: 'Pełny tydzień bez odpuszczania. Pamiętaj o lekkich biegach regeneracyjnych.',
    },
    {
      id: 'streak-14d',
      title: 'Rytm Mistrza (14-Day Streak)',
      description: 'Utrzymaj niesamowitą serię 14 kolejnych dni biegowych.',
      category: 'streak',
      tier: 'gold',
      icon: '🛡️',
      targetValue: 14,
      unit: 'dni',
      rewardBamboos: 300,
      tip: 'Dwutygodniowa seria wymaga perfekcyjnego zarządzania snem i odżywianiem.',
    },
    {
      id: 'streak-30d',
      title: 'Legenda Miesiąca (30-Day Streak)',
      description: 'Ukończ 30 dni z rzędu w treningowym reżimie.',
      category: 'streak',
      tier: 'diamond',
      icon: '👑',
      targetValue: 30,
      unit: 'dni',
      rewardBamboos: 750,
      tip: 'Niewielu biegaczy na świecie może pochwalić się 30-dniową serią.',
    },

    // 3. SINGLE RUN DISTANCE
    {
      id: 'single-5k',
      title: 'Klasyczna Piątka (5 KM)',
      description: 'Pokonaj minimum 5.0 km w ramach jednego treningu.',
      category: 'distance',
      tier: 'bronze',
      icon: '🎯',
      targetValue: 5,
      unit: 'km',
      rewardBamboos: 40,
      tip: '5 km to uniwersalny poligon sprawdzianu wydolności tlenowej.',
    },
    {
      id: 'single-10k',
      title: 'Mocna Dyszka (10 KM)',
      description: 'Ukończ pojedynczy bieg na dystansie co najmniej 10.0 km.',
      category: 'distance',
      tier: 'silver',
      icon: '🏅',
      targetValue: 10,
      unit: 'km',
      rewardBamboos: 80,
      tip: 'Dyszka to kamień milowy każdego ambitnego biegacza długodystansowego.',
    },
    {
      id: 'single-half',
      title: 'Półmaratończyk (21.1 KM)',
      description: 'Pokonaj dystans półmaratonu (21.097 km) w jednym biegu.',
      category: 'distance',
      tier: 'gold',
      icon: '🎖️',
      targetValue: 21.1,
      unit: 'km',
      rewardBamboos: 250,
      tip: 'Półmaraton wymaga strategicznego carboloadingu i dyscypliny tempa.',
    },
    {
      id: 'single-marathon',
      title: 'Królewski Dystans (Maraton 42.2 KM)',
      description: 'Zdobądź koronę i przebiegnij pełny maraton (42.195 km).',
      category: 'distance',
      tier: 'diamond',
      icon: '🏛️',
      targetValue: 42.2,
      unit: 'km',
      rewardBamboos: 1000,
      tip: 'Historyczny dystans z Maratonu do Aten. Wieczna chwała!',
    },

    // 4. SPEED & VO2MAX
    {
      id: 'speed-sub5',
      title: 'Przełamanie Bariery Sub-5:00',
      description: 'Ukończ bieg ze średnim tempem poniżej 5:00 min/km.',
      category: 'speed',
      tier: 'silver',
      icon: '🚀',
      targetValue: 300, // 5:00 = 300 sec
      unit: 'min/km',
      rewardBamboos: 120,
      tip: 'Tempo 12 km/h. Świetna kadencja i praca kolana w fazie lotu.',
    },
    {
      id: 'speed-sub430',
      title: 'Błyskawica Sub-4:30',
      description: 'Ukończ bieg ze średnim tempem poniżej 4:30 min/km.',
      category: 'speed',
      tier: 'gold',
      icon: '💨',
      targetValue: 270, // 4:30 = 270 sec
      unit: 'min/km',
      rewardBamboos: 250,
      tip: 'Dynamika i wysokie tętno progowe. Osiągasz czasy czołówki biegów masowych!',
    },
    {
      id: 'vo2-elite',
      title: 'Elitarny Silnik VO2max 50+',
      description: 'Osiągnij pułap tlenowy VO2max równy lub wyższy niż 50 ml/kg/min.',
      category: 'speed',
      tier: 'gold',
      icon: '🫀',
      targetValue: 50,
      unit: 'ml/kg',
      rewardBamboos: 180,
      tip: 'Wydajność Twojego układu krążenia pozwala na walkę o wysokie lokaty.',
    },

    // 5. BIOMECHANICS & CHALLENGES
    {
      id: 'bio-cadence-180',
      title: 'Rytm Metronomu 180 SPM',
      description: 'Utrzymaj średnią kadencję co najmniej 180 kroków na minutę.',
      category: 'biomechanics',
      tier: 'silver',
      icon: '⏱️',
      targetValue: 180,
      unit: 'spm',
      rewardBamboos: 90,
      tip: 'Kadencja 180 spm drastycznie zmniejsza obciążenie stawów kolanowych.',
    },
    {
      id: 'bio-gct-light',
      title: 'Sprężysty Krok GTC < 230ms',
      description: 'Zanotuj ultra-krótki czas kontaktu stopy z podłożem poniżej 230 ms.',
      category: 'biomechanics',
      tier: 'gold',
      icon: '🪶',
      targetValue: 230,
      unit: 'ms',
      rewardBamboos: 140,
      tip: 'Krótki kontakt to sprężyste oddawanie energii przez ścięgno Achillesa.',
    },
    {
      id: 'elev-mountain',
      title: 'Górski Koziorożec (+100m)',
      description: 'Pokonaj ponad 100 metrów przewyższenia w jednym treningu.',
      category: 'special',
      tier: 'silver',
      icon: '🏔️',
      targetValue: 100,
      unit: 'm',
      rewardBamboos: 110,
      tip: 'Podbiegi to najlepsza siła biegowa budująca moc mięśni czworogłowych.',
    },
  ];

  // Map and evaluate actual progress for each badge
  const badges: AchievementBadge[] = badgesCatalog.map((item) => {
    let currentValue = 0;
    let isUnlocked = false;
    let unlockedAt: string | undefined = undefined;

    switch (item.id) {
      case 'dist-first-step':
        currentValue = totalRuns;
        isUnlocked = totalRuns >= 1;
        unlockedAt = runs.length > 0 ? runs[runs.length - 1].date : undefined;
        break;

      case 'dist-50k':
        currentValue = Number(totalKm.toFixed(1));
        isUnlocked = totalKm >= 50;
        unlockedAt = isUnlocked ? findDateWhenTotalKmExceeded(50) : undefined;
        break;

      case 'dist-100k':
        currentValue = Number(totalKm.toFixed(1));
        isUnlocked = totalKm >= 100;
        unlockedAt = isUnlocked ? findDateWhenTotalKmExceeded(100) : undefined;
        break;

      case 'dist-250k':
        currentValue = Number(totalKm.toFixed(1));
        isUnlocked = totalKm >= 250;
        unlockedAt = isUnlocked ? findDateWhenTotalKmExceeded(250) : undefined;
        break;

      case 'dist-500k':
        currentValue = Number(totalKm.toFixed(1));
        isUnlocked = totalKm >= 500;
        unlockedAt = isUnlocked ? findDateWhenTotalKmExceeded(500) : undefined;
        break;

      case 'streak-3d':
        currentValue = streak.longestStreakDays;
        isUnlocked = streak.longestStreakDays >= 3;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'streak-7d':
        currentValue = streak.longestStreakDays;
        isUnlocked = streak.longestStreakDays >= 7;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'streak-14d':
        currentValue = streak.longestStreakDays;
        isUnlocked = streak.longestStreakDays >= 14;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'streak-30d':
        currentValue = streak.longestStreakDays;
        isUnlocked = streak.longestStreakDays >= 30;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'single-5k':
        currentValue = Number(maxSingleDistance.toFixed(1));
        isUnlocked = maxSingleDistance >= 5.0;
        unlockedAt = isUnlocked ? findDateWhenSingleDistanceExceeded(5.0) : undefined;
        break;

      case 'single-10k':
        currentValue = Number(maxSingleDistance.toFixed(1));
        isUnlocked = maxSingleDistance >= 10.0;
        unlockedAt = isUnlocked ? findDateWhenSingleDistanceExceeded(10.0) : undefined;
        break;

      case 'single-half':
        currentValue = Number(maxSingleDistance.toFixed(1));
        isUnlocked = maxSingleDistance >= 21.097;
        unlockedAt = isUnlocked ? findDateWhenSingleDistanceExceeded(21.097) : undefined;
        break;

      case 'single-marathon':
        currentValue = Number(maxSingleDistance.toFixed(1));
        isUnlocked = maxSingleDistance >= 42.195;
        unlockedAt = isUnlocked ? findDateWhenSingleDistanceExceeded(42.195) : undefined;
        break;

      case 'speed-sub5':
        currentValue = fastestPaceSec < 9999 ? fastestPaceSec : 360;
        isUnlocked = fastestPaceSec <= 300; // <= 5:00
        unlockedAt = isUnlocked ? findDateWhenPaceBroken(300) : undefined;
        break;

      case 'speed-sub430':
        currentValue = fastestPaceSec < 9999 ? fastestPaceSec : 360;
        isUnlocked = fastestPaceSec <= 270; // <= 4:30
        unlockedAt = isUnlocked ? findDateWhenPaceBroken(270) : undefined;
        break;

      case 'vo2-elite':
        currentValue = Number(currentVo2.toFixed(1));
        isUnlocked = currentVo2 >= 50;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'bio-cadence-180':
        currentValue = maxCadence;
        isUnlocked = maxCadence >= 180;
        unlockedAt = isUnlocked ? findDateWhenCadenceReached(180) : undefined;
        break;

      case 'bio-gct-light':
        currentValue = minGct < 999 ? minGct : 260;
        isUnlocked = minGct <= 230;
        unlockedAt = isUnlocked ? streak.lastRunDate || undefined : undefined;
        break;

      case 'elev-mountain':
        currentValue = maxElevation;
        isUnlocked = maxElevation >= 100;
        unlockedAt = isUnlocked ? runs.find((r) => (Number(r.elevationGainM) || 0) >= 100)?.date : undefined;
        break;

      default:
        currentValue = 0;
        isUnlocked = false;
    }

    // Compute progress percentage
    let progressPercent = 0;
    if (item.category === 'speed' && item.unit === 'min/km') {
      // Inverse for speed: lower seconds is better
      const targetSec = item.targetValue;
      if (isUnlocked) {
        progressPercent = 100;
      } else {
        // e.g. target 300s, current 340s -> progress
        const diff = Math.max(0, 390 - currentValue); // baseline 6:30
        const totalReq = 390 - targetSec;
        progressPercent = Math.min(99, Math.max(5, Math.round((diff / totalReq) * 100)));
      }
    } else if (item.id === 'bio-gct-light') {
      // Inverse for GCT: lower ms is better
      if (isUnlocked) {
        progressPercent = 100;
      } else {
        const diff = Math.max(0, 270 - currentValue);
        progressPercent = Math.min(99, Math.max(5, Math.round((diff / 40) * 100)));
      }
    } else {
      progressPercent = isUnlocked ? 100 : Math.min(99, Math.max(0, Math.round((currentValue / item.targetValue) * 100)));
    }

    return {
      ...item,
      currentValue,
      isUnlocked,
      unlockedAt,
      progressPercent,
    };
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalPoints = badges.filter((b) => b.isUnlocked).reduce((sum, b) => sum + b.rewardBamboos, 0);

  return {
    badges,
    streak,
    totalKm: Number(totalKm.toFixed(1)),
    totalRuns,
    unlockedCount,
    totalBadgesCount: badges.length,
    totalPoints,
  };
}

/**
 * Checks localStorage to find which earned badges are newly unlocked and haven't been shown in a celebration yet.
 */
export function getNewlyUnlockedBadges(allBadges: AchievementBadge[]): AchievementBadge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEEN_BADGES_KEY);
    const seenIds = new Set<string>(raw ? JSON.parse(raw) : []);

    const newlyUnlocked = allBadges.filter((b) => b.isUnlocked && !seenIds.has(b.id));
    return newlyUnlocked;
  } catch {
    return [];
  }
}

/**
 * Marks badges as seen so the celebration isn't repeated indefinitely.
 */
export function markBadgesAsSeen(badgeIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SEEN_BADGES_KEY);
    const seenIds = new Set<string>(raw ? JSON.parse(raw) : []);
    badgeIds.forEach((id) => seenIds.add(id));
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(Array.from(seenIds)));
  } catch {}
}
