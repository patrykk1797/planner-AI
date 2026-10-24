export type TabType = 'plan' | 'trainings' | 'races' | 'body_gear' | 'settings' | 'live' | 'strength' | 'gear' | 'panda';

export type AccentColor =
  | 'orange'
  | 'emerald'
  | 'cyan'
  | 'purple'
  | 'coral'
  | 'lime'
  | 'sapphire'
  | 'amber'
  | 'magenta'
  | 'teal'
  | 'ruby'
  | 'silver';

export interface PersonalBest {
  distanceId: '1k' | '1mile' | '3k' | '5k' | '10k' | 'half' | 'marathon';
  distanceName: string;
  time: string; // "mm:ss" or "h:mm:ss"
  pace: string; // "m:ss /km"
  date: string;
  raceOrRunName?: string;
  gapToTarget?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google' | 'facebook' | 'apple';
  linkedProviders?: Array<'email' | 'google' | 'facebook' | 'apple'>;
  avatar?: string;
  createdAt: string;
  onboardingCompleted: boolean;
  isPro?: boolean;
  subscriptionTier?: 'PRO' | 'LITE';
}

export interface SyncAppStatus {
  id: 'apple' | 'google_fit' | 'huawei' | 'komoot' | 'strava' | 'garmin' | 'polar' | 'coros' | 'zepp';
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
  autoSync: boolean;
  athleteName?: string;
  deviceModel?: string;
  authMethod?: 'oauth' | 'terra' | 'bridge' | 'gpx_manual' | 'direct_api';
  apiKeyOrAccount?: string;
  connectedAt?: string;
}

export interface RunnerProfile {
  name: string;
  birthdate: string; // "DD.MM.YYYY"
  gender: 'M' | 'F' | 'Other';
  weight: number;
  targetWeight: number;
  height?: number;
  city: string;
  weeklyKm: number;
  time5k: string; // "mm:ss"
  hrMax: number;
  rhr: number;
  vo2max: number;
  targetGoal: string;
  selectedDays: string[];
  selectedShoeId?: string;
  bamboos: number;
  levelXp: number;
  activePandaGear: {
    gear: string;
    skin: string;
    bg: string;
  };
  coachTone: 'naukowy' | 'motywacyjny' | 'minimalistyczny';
  lifestyleMode?: 'siedzący' | 'umiarkowany' | 'aktywny_praca_fizyczna';
  smokingStatus?: 'niepali' | 'pali' | 'vape' | 'okazjonalnie';
  dailySittingHours?: number;
  alcoholUsage?: 'brak' | 'okazjonalnie' | 'regularnie';
  medications?: string;
  smokeFreeDays?: number;
  activePainZones?: string[];
  runningExperience?: string;
  cooperTestDistanceMeters?: number;
  footType?: 'Neutralna' | 'Pronująca' | 'Supinująca';
  injuryProne?: string;
  currentCadence?: number;
  selectedShoeName?: string;
  accentColor: AccentColor;
  theme: 'dark' | 'light';
  connectedApps?: SyncAppStatus[];
  notifications?: NotificationSettings;
  healthBridge?: HealthBridgeData;
  planGeneratedAt?: string; // "YYYY-MM-DD" date when current plan was generated or created
  createdAt?: string; // "YYYY-MM-DD" account creation date
  isPro?: boolean;
  subscriptionTier?: 'PRO' | 'LITE';
  pandaState?: {
    unlockedItems?: string[];
    wardrobe?: any;
    sceneId?: string;
    placedFurniture?: any;
    furniturePositions?: any;
    glycogenPercent?: number;
    gctShieldPercent?: number;
    outfitPresets?: Array<{
      id?: string;
      name: string;
      icon?: string;
      wardrobe: any;
      colors?: Record<string, string>;
    }>;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  permissionStatus: 'default' | 'granted' | 'denied';
  workoutReminderTime: string; // "07:00" or "18:00"
  notifyOnWorkoutDays: boolean;
  notifyOnRestDays: boolean;
  notifyOnParamImprovement: boolean; // VO2max, RHR, PB, etc.
  notifyOnRecoveryComplete: boolean; // 100% regeneracja
  notifyOnWeatherAndAqi: boolean; // Pogoda + jakość powietrza
  weatherNotifyTime: string; // "07:30"
  soundEnabled: boolean;
  lastNotified?: {
    workout?: string; // YYYY-MM-DD
    improvement?: string;
    recovery?: string;
    weather?: string; // YYYY-MM-DD
  };
}

export interface HealthSyncMetrics {
  stepsToday: number;
  restingHeartRate: number;
  sleepHours: number;
  activeCalories: number;
  vo2MaxEst: number;
  lastSyncTime: string;
  sourceDevice: string;
}

export interface HealthBridgeSyncRecord {
  id: string;
  timestamp: string;
  source: 'apple' | 'google_fit';
  type: 'steps' | 'workout' | 'rhr' | 'sleep' | 'full';
  summary: string;
  runsAdded?: number;
}

export interface HealthBridgeData {
  appleHealthConnected: boolean;
  googleHealthConnected: boolean;
  autoSyncIntervalMinutes: number;
  isSyncing: boolean;
  metrics: HealthSyncMetrics;
  syncHistory: HealthBridgeSyncRecord[];
}

export interface SurfaceBreakdown {
  asfaltPercent: number;
  lesnaPercent: number;
  szuterPercent: number;
  kostkaPercent: number;
  dominantSurface: string;
}

export interface SavedRoute {
  id: string;
  title: string;
  createdAt: string; // YYYY-MM-DD
  distanceKm: number;
  elevationGainM: number;
  estimatedTime: string;
  difficulty: string;
  isRoundTrip: boolean;
  surface: SurfaceBreakdown;
  points: { id: string; name: string; lat: number; lon: number; ele: number; type: 'start' | 'via' | 'finish' }[];
  pathCoords?: { lat: number; lng: number }[];
  aiAnalysis?: {
    summary: string;
    recommendedShoes: string;
    hydrationStrategy: string;
    safetyTips: string;
    difficultyRating: string;
  };
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
  completedKm?: number;
}

export type DayPlan = TrainingDay;

export interface RunSplit {
  km: number;
  pace: string;
  hr: number;
  elevation: number;
}

export interface RunLog {
  id: string;
  title?: string;
  sourceApp?: 'strava' | 'garmin' | 'polar' | 'coros' | 'apple' | 'google_fit' | 'huawei' | 'komoot' | 'zepp' | 'manual';
  date: string;
  distanceKm: number;
  durationMin: number;
  avgPace: string;
  avgHr: number;
  maxHr?: number;
  avgCadence: number;
  elevationGainM?: number;
  calories?: number;
  powerW?: number;
  strideLengthM?: number;
  shoeName: string;
  notes?: string;
  coachFeedback?: string;
  analysis?: {
    whatWentWell: string[];
    whatWentWrong: string[];
    planAdaptation: string;
    cardiacDriftPercent?: number;
    trainingLoad?: number;
    readinessImpact?: string;
  };
  splits?: RunSplit[];
  hrZones?: Array<{ zone: string; percentage: number; timeMin: number }>;
  vo2MaxEst?: number;
  gctMs?: number;
  verticalOscillationCm?: number;
  groundContactBalancePercent?: string;
  verticalRatioPercent?: number;
  routeCoords?: Array<{ lat: number; lng: number }>;
  normalizedTracePoints?: Array<{ x: number; y: number }>;
  screenshotUrl?: string;
  gpxData?: string;
}

export type ShoeTrainingPurpose =
  | 'wolne_wybieganie'
  | 'tempo'
  | 'long_run'
  | 'startowe'
  | 'treningowo_startowe'
  | 'terenowe';

export interface Shoe {
  id: string;
  name: string;
  brand: string;
  footType: 'Neutralna' | 'Pronująca' | 'Supinująca';
  mileageKm: number;
  initialMileageKm?: number;
  maxMileageKm: number;
  dropMm: number;
  weightG: number;
  energyReturn: number; // 1-10 (dynamika)
  cushionRating: number; // 1-10 (amortyzacja)
  stabilityRating: number; // 1-10 (stabilność)
  cushion: string;
  idealFor: string;
  // Zaawansowane parametry techniczno-biomechaniczne
  cushionLevel?: 'Maksymalna (Max Cushion)' | 'Wysoka' | 'Średnia' | 'Niska / Minimalistyczna' | string;
  dynamicsLevel?: 'Maksymalna (Płytka Karbonowa)' | 'Wysoka (Superfoam)' | 'Umiarkowana' | 'Naturalna' | string;
  stabilityType?: 'Stopa Neutralna' | 'Stabilizująca (Wsparcie Pronacji)' | 'Lekka stabilizacja' | 'Poszerzona platforma' | string;
  trainingPurposes?: ShoeTrainingPurpose[];
  recommendedDistance?: string; // np. "5 km - 10 km", "Półmaraton - Maraton (21-42 km)", "Ultra (>50 km)"
  plateType?: 'Karbon' | 'Nylon / Pręty z włókna' | 'Płytka Pebax' | 'Brak płytki' | string;
  surfaceType?: 'Asfalt / Twarde nawierzchnie' | 'Mieszana (Asfalt + Szuter)' | 'Teren / Trail' | 'Bieżnia lekkoatletyczna' | string;
  foamTechnology?: string; // np. "ZoomX", "FF Blast+ ECO", "PWRRUN PB", "Fresh Foam X", "DNA LOFT v3"
  dropDescription?: string; // Biomechaniczne wyjaśnienie dropu
  aiNotes?: string;
  aiVerdict?: string;
  brandLogoSvg?: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  brandTagline?: string;
}

export interface RaceSlot {
  id: string;
  distanceCategory: '5k' | '10k' | 'half' | 'marathon' | 'ultra';
  name: string;
  city: string;
  voivodeship?: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  role: 'Główny Cel Sezonu A' | 'Start Kontrolny B' | 'Sprawdzian Szybkości' | string;
  profile: 'Płaska/Atestowana' | 'Pofałdowana/Górska' | string;
  elevationM?: number;
  targetTime?: string;
  predictedTime?: string;
  registrationUrl?: string;
  isRegistered?: boolean;
  aiVerdict?: {
    recommendation: 'rekomendowany' | 'wymaga_przygotowan' | 'wysokie_ryzyko';
    recommendationLabel: string;
    analysis: string;
    successChancePercent: number;
    weeksToPrep: number;
    minWeeklyKmNeeded: number;
    estimatedFinishTime: string;
  };
}

export interface StrengthExercise {
  id: string;
  name: string;
  package: 'itbs' | 'achilles' | 'core';
  targetMuscle: string;
  gctBenefit: string;
  equipment: 'dom' | 'band' | 'gym';
  repsSets: string;
  instructions: string[];
  animationType: 'rdl' | 'bulgarian' | 'monster-walk' | 'alfredson' | 'soleus' | 'pogo' | 'deadbug' | 'birddog';
}

export interface PainZone {
  id: string;
  label: string;
  bodyPart: 'knee' | 'calf' | 'shin' | 'plantar' | 'hip' | 'lumbar';
  name: string;
  severity: 'lekki' | 'umiarkowany' | 'ostry';
  protocol: string;
  planAdjustment: string;
}

export interface WeatherData {
  city: string;
  lat: number;
  lon: number;
  temp: number;
  windSpeed: number;
  humidity: number;
  pm2_5: number;
  pm10: number;
  aqi: number;
  condition: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type AchievementCategory = 'distance' | 'streak' | 'speed' | 'biomechanics' | 'special';

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercent: number;
  rewardBamboos: number;
  tip: string;
}

export interface RunningStreakStats {
  currentStreakDays: number;
  longestStreakDays: number;
  totalRunningDays: number;
  lastRunDate: string | null;
  activeLast14Days: { date: string; dayLabel: string; hasRun: boolean; distanceKm: number }[];
  streakStatusMessage: string;
}
