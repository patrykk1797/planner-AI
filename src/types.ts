export type TabType = 'plan' | 'live' | 'strength' | 'gear' | 'panda' | 'settings';

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
  avatar?: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface SyncAppStatus {
  id: 'apple' | 'google_fit' | 'huawei' | 'komoot' | 'strava' | 'garmin' | 'polar' | 'coros';
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
  medications?: string;
  smokeFreeDays?: number;
  activePainZones?: string[];
  accentColor: AccentColor;
  theme: 'dark' | 'light';
  connectedApps?: SyncAppStatus[];
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
}

export interface RunSplit {
  km: number;
  pace: string;
  hr: number;
  elevation: number;
}

export interface RunLog {
  id: string;
  title?: string;
  sourceApp?: 'strava' | 'garmin' | 'polar' | 'coros' | 'apple' | 'google_fit' | 'huawei' | 'komoot' | 'manual';
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
  gctMs?: number;
  verticalOscillationCm?: number;
  groundContactBalancePercent?: string;
  verticalRatioPercent?: number;
}

export interface Shoe {
  id: string;
  name: string;
  brand: string;
  footType: 'Neutralna' | 'Pronująca' | 'Supinująca';
  mileageKm: number;
  maxMileageKm: number;
  dropMm: number;
  weightG: number;
  energyReturn: number; // 1-10
  cushionRating: number; // 1-10
  stabilityRating: number; // 1-10
  cushion: string;
  idealFor: string;
  aiNotes?: string;
  aiVerdict?: string;
}

export interface RaceSlot {
  id: string;
  distanceCategory: '5k' | '10k' | 'half' | 'marathon' | 'ultra';
  name: string;
  city: string;
  voivodeship?: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  role: 'Główny Cel Sezonu A' | 'Start Kontrolny B' | 'Sprawdzian Szybkości';
  profile: 'Płaska/Atestowana' | 'Pofałdowana/Górska';
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
