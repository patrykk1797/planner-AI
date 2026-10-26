import React, { useState, useEffect, useCallback } from 'react';
import { UserAccount, RaceSlot, Shoe, RunnerProfile, RunLog, PersonalBest } from '../../types.ts';
import { soundEngine, DEFAULT_PLAN } from '../../utils/defaults.ts';
import { getAppAnalytics, AppAnalytics } from '../../utils/analyticsStorage.ts';
import { loadAccountData } from '../../utils/accountStorage.ts';
import { ShoeBrandLogo } from '../icons/ShoeBrandLogo.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';
import { getAuthHeaders } from '../../lib/firebase.ts';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser?: UserAccount | null;
  profile: RunnerProfile;
  runs?: RunLog[];
  races: RaceSlot[];
  shoes: Shoe[];
  personalBests?: PersonalBest[];
  globalPushBanner: string | null;
  onToggleUserPro: (userId: string) => void;
  onAddUserBamboos: (userId: string, amount: number) => void;
  onResetUserPlan: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onAddCustomRace: (newRace: RaceSlot) => void;
  onDeleteCustomRace: (raceId: string) => void;
  onAddCustomShoe: (newShoe: Shoe) => void;
  onDeleteCustomShoe: (shoeId: string) => void;
  onSetGlobalPushBanner: (bannerText: string | null) => void;
  showToast: (msg: string) => void;
}

interface RealAdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro: boolean;
  bamboos: number;
  targetGoal: string;
  city?: string;
  runsCount: number;
  totalKm: number;
  weeklyKm: number;
  time5k?: string;
  vo2max: number;
  selectedShoeId?: string;
  shoes: Shoe[];
  runs: RunLog[];
  personalBests: PersonalBest[];
  inCloudSql?: boolean;
  isCurrentActive?: boolean;
}

interface ServerAdminStats {
  dbConnected: boolean;
  totalDbUsers: number;
  totalDbProUsers: number;
  totalDbRuns: number;
  totalDbDistanceKm: number;
  totalDbShoes: number;
  totalDbBamboos: number;
  usersList: Array<{
    id: string;
    email: string;
    name: string;
    avatar: string;
    isPro: boolean;
    bamboos: number;
    targetGoal: string;
    city: string;
    runsCount: number;
    totalKm: number;
    shoesCount: number;
    weeklyKm?: number;
    time5k?: string;
    vo2max?: number;
    selectedShoeId?: string;
    shoes?: Shoe[];
    runs?: RunLog[];
    personalBests?: PersonalBest[];
    inCloudSql: boolean;
  }>;
  serverTelemetry?: {
    aiPlansToday: number;
    aiCallsTotal: number;
    affiliateClicksToday: number;
    geminiConfigured: boolean;
  };
}

type ShoeCategoryType = 'daily' | 'race_carbon' | 'trail' | 'recovery_max';

const SHOE_TYPE_META: Record<
  ShoeCategoryType,
  { label: string; shortLabel: string; colorClass: string; badgeClass: string; desc: string }
> = {
  daily: {
    label: 'Codzienne Treningowe (Daily Trainer)',
    shortLabel: 'Treningowe / Daily',
    colorClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Uniwersalne buty do codziennego nabijania kilometrów i biegów w 2. strefie tlenowej',
  },
  race_carbon: {
    label: 'Startowe / Karbonowe (Race & Tempo)',
    shortLabel: 'Startowe / Karbon',
    colorClass: 'bg-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Lekkie modele startowe z płytką karbonową lub kompozytową pod zawody i interwały',
  },
  trail: {
    label: 'Trailowe / Terenowe (Trail & Forest)',
    shortLabel: 'Trail / Teren',
    colorClass: 'bg-sky-400',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    desc: 'Obuwie z agresywnym bieżnikiem na ścieżki leśne, szuter i biegi górskie',
  },
  recovery_max: {
    label: 'Regeneracyjne / Max Cushion',
    shortLabel: 'Regeneracyjne / Max',
    colorClass: 'bg-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Maksymalna amortyzacja chroniąca stawy podczas długich rozbiegań i regeneracji',
  },
};

function classifyShoeCategory(shoe: Partial<Shoe>): ShoeCategoryType {
  const haystack = `${shoe.name || ''} ${shoe.brand || ''} ${shoe.idealFor || ''} ${shoe.cushion || ''} ${shoe.aiNotes || ''}`.toLowerCase();

  if (
    haystack.includes('trail') ||
    haystack.includes('teren') ||
    haystack.includes('gór') ||
    haystack.includes('las') ||
    haystack.includes('speedcross') ||
    haystack.includes('trabuco') ||
    haystack.includes('speedgoat') ||
    haystack.includes('cascadia') ||
    haystack.includes('peregrine') ||
    haystack.includes('sportiva') ||
    haystack.includes('scarpa')
  ) {
    return 'trail';
  }

  if (
    haystack.includes('karbon') ||
    haystack.includes('carbon') ||
    haystack.includes('startow') ||
    haystack.includes('race') ||
    haystack.includes('vaporfly') ||
    haystack.includes('alphafly') ||
    haystack.includes('metaspeed') ||
    haystack.includes('adios pro') ||
    haystack.includes('takumi') ||
    haystack.includes('endorphin pro') ||
    haystack.includes('endorphin speed') ||
    haystack.includes('rocket x') ||
    haystack.includes('cielo') ||
    haystack.includes('streakfly') ||
    (shoe.weightG && shoe.weightG > 0 && shoe.weightG <= 220)
  ) {
    return 'race_carbon';
  }

  if (
    haystack.includes('regenerac') ||
    haystack.includes('recovery') ||
    haystack.includes('max cushion') ||
    haystack.includes('maksymalna amortyzacja') ||
    haystack.includes('nimbus') ||
    haystack.includes('bondi') ||
    haystack.includes('invincible') ||
    haystack.includes('glycerin') ||
    haystack.includes('triumph') ||
    haystack.includes('1080') ||
    haystack.includes('more v') ||
    ((shoe.cushionRating || 0) >= 9 && (shoe.weightG || 0) >= 275)
  ) {
    return 'recovery_max';
  }

  return 'daily';
}

function normalizeShoeBrand(brandInput?: string, shoeNameInput?: string): string {
  const q = `${brandInput || ''} ${shoeNameInput || ''}`.toLowerCase();
  if (q.includes('asics') || q.includes('novablast') || q.includes('superblast') || q.includes('kayano') || q.includes('nimbus') || q.includes('metaspeed')) return 'ASICS';
  if (q.includes('nike') || q.includes('pegasus') || q.includes('vaporfly') || q.includes('alphafly') || q.includes('vomero') || q.includes('invincible')) return 'Nike';
  if (q.includes('hoka') || q.includes('clifton') || q.includes('mach') || q.includes('bondi') || q.includes('speedgoat')) return 'HOKA';
  if (q.includes('adidas') || q.includes('adizero') || q.includes('boston') || q.includes('ultraboost') || q.includes('supernova')) return 'adidas';
  if (q.includes('saucony') || q.includes('endorphin') || q.includes('triumph') || q.includes('kinvara') || q.includes('ride')) return 'Saucony';
  if (q.includes('new balance') || q.includes('fuelcell') || q.includes('fresh foam') || q.includes('1080') || q.includes('rebel')) return 'New Balance';
  if (q.includes('brooks') || q.includes('ghost') || q.includes('glycerin') || q.includes('hyperion') || q.includes('adrenaline')) return 'Brooks';
  if (q.includes('on running') || q.includes('cloudmonster') || q.includes('cloudsurfer') || q.includes('cloudflow') || /\bon\b/.test(q)) return 'On Running';
  if (q.includes('puma') || q.includes('deviate') || q.includes('velocity nitro')) return 'PUMA';
  if (q.includes('salomon') || q.includes('speedcross') || q.includes('pulsar')) return 'Salomon';
  if (q.includes('mizuno') || q.includes('wave rider') || q.includes('wave rebellion')) return 'Mizuno';
  if (q.includes('kiprun') || q.includes('decathlon') || q.includes('kalenji')) return 'Kiprun / Decathlon';
  if (q.includes('altra') || q.includes('lone peak') || q.includes('torin')) return 'Altra';
  if (q.includes('under armour') || q.includes('velociti') || q.includes('hovr')) return 'Under Armour';
  if (q.includes('reebok') || q.includes('floatride')) return 'Reebok';
  if (q.includes('la sportiva')) return 'La Sportiva';
  if (q.includes('scarpa')) return 'SCARPA';
  if (q.includes('merrell')) return 'Merrell';
  if (q.includes('joma')) return 'Joma';
  const trimmed = (brandInput || '').trim();
  if (trimmed && trimmed.toLowerCase() !== 'biegowe pro') return trimmed;
  const firstWord = (shoeNameInput || '').trim().split(/\s+/)[0];
  return firstWord || 'Inna marka';
}

function parseTimeStringToSeconds(str?: string | null): number | null {
  if (!str) return null;
  const cleaned = str.trim();
  if (!cleaned || cleaned.toLowerCase() === 'brak' || cleaned.includes('--')) return null;
  const parts = cleaned.split(':').map((p) => parseFloat(p));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function formatSecondsToRaceTime(totalSeconds: number): string {
  const sec = Math.max(1, Math.round(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatPaceMinKm(totalSeconds: number, distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return '0:00';
  const secPerKm = Math.round(totalSeconds / distanceKm);
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  profile,
  runs = [],
  races,
  shoes,
  personalBests = [],
  globalPushBanner,
  onToggleUserPro,
  onAddUserBamboos,
  onResetUserPlan,
  onDeleteUser,
  onAddCustomRace,
  onDeleteCustomRace,
  onAddCustomShoe,
  onDeleteCustomShoe,
  onSetGlobalPushBanner,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shoes_stats' | 'times_records' | 'users' | 'catalog' | 'push'>('dashboard');
  const [searchUser, setSearchUser] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<RealAdminUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AppAnalytics | null>(null);
  const [serverStats, setServerStats] = useState<ServerAdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  const fetchRealAdminData = useCallback(async () => {
    setIsLoadingStats(true);
    const localStats = getAppAnalytics();
    setAnalytics(localStats);
    try {
      const headers = await getAuthHeaders();
      if (headers) {
        const res = await fetch('/api/admin/stats', { headers });
        if (res.ok) {
          const data = await res.json();
          setServerStats(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch /api/admin/stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRealAdminData();
    }
  }, [isOpen, fetchRealAdminData]);

  // Form for New Race
  const [newRaceName, setNewRaceName] = useState('');
  const [newRaceDate, setNewRaceDate] = useState('2027-05-16');
  const [newRaceDistance, setNewRaceDistance] = useState('21.1 km');
  const [newRaceCity, setNewRaceCity] = useState('Warszawa');
  const [newRaceUrl, setNewRaceUrl] = useState('https://maratonwarszawski.com');

  // Form for New Shoe with Affiliate Link
  const [newShoeBrand, setNewShoeBrand] = useState('Nike');
  const [newShoeModel, setNewShoeModel] = useState('Vaporfly 3 Carbon');
  const [newShoePrice, setNewShoePrice] = useState('1199 zł');
  const [newShoeCommission, setNewShoeCommission] = useState('12%');
  const [newShoeAffiliateUrl, setNewShoeAffiliateUrl] = useState(
    'https://sklepbiegacza.pl/aff/nike-vaporfly-3?ref=runningplaner'
  );
  const [newShoeCategory, setNewShoeCategory] = useState<'race' | 'daily' | 'trail' | 'carbon'>('carbon');

  // Push Banner text
  const [pushText, setPushText] = useState(
    globalPushBanner || 'Nowa kolekcja karbonowych butów dla Pandy już w sklepie! 🎋🏃‍♂️'
  );

  // Build 100% Real Unified User List (Cloud SQL + Local Accounts + Active Session)
  const unifiedUsersMap = new Map<string, RealAdminUser>();

  // 1. Add users from Cloud SQL Database
  if (serverStats?.usersList) {
    for (const dbU of serverStats.usersList) {
      unifiedUsersMap.set(dbU.id, {
        id: dbU.id,
        name: dbU.name || 'Biegacz',
        email: dbU.email,
        avatar: dbU.avatar,
        isPro: Boolean(dbU.isPro),
        bamboos: Number(dbU.bamboos) || 0,
        targetGoal: dbU.targetGoal || 'Budowa bazy tlenowej',
        city: dbU.city || 'Polska',
        runsCount: Number(dbU.runsCount) || (dbU.runs?.length ?? 0),
        totalKm: Number(dbU.totalKm) || 0,
        weeklyKm: Number(dbU.weeklyKm) || 35,
        time5k: dbU.time5k || undefined,
        vo2max: Number(dbU.vo2max) || 48,
        selectedShoeId: dbU.selectedShoeId,
        shoes: Array.isArray(dbU.shoes) ? dbU.shoes : [],
        runs: Array.isArray(dbU.runs) ? dbU.runs : [],
        personalBests: Array.isArray(dbU.personalBests) ? dbU.personalBests : [],
        inCloudSql: true,
        isCurrentActive: currentUser?.id === dbU.id,
      });
    }
  }

  // 2. Merge local stored accounts
  for (const localU of users) {
    const cached = loadAccountData(localU.id);
    const existing = unifiedUsersMap.get(localU.id);
    const isCurrent = currentUser?.id === localU.id;

    const mergedRuns = isCurrent
      ? runs
      : cached.runs && cached.runs.length > 0
      ? cached.runs
      : existing?.runs || [];

    const mergedShoes = isCurrent
      ? shoes
      : cached.shoes && cached.shoes.length > 0
      ? cached.shoes
      : existing?.shoes || [];

    const mergedPbs = isCurrent
      ? personalBests
      : cached.personalBests && cached.personalBests.length > 0
      ? cached.personalBests
      : existing?.personalBests || [];

    const computedKm = mergedRuns.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);

    unifiedUsersMap.set(localU.id, {
      id: localU.id,
      name: isCurrent ? profile.name : cached.profile?.name || existing?.name || localU.name,
      email: localU.email || existing?.email || `${localU.id}@runner.local`,
      avatar: localU.avatar || existing?.avatar,
      isPro: Boolean(localU.isPro ?? existing?.isPro ?? false),
      bamboos: isCurrent ? profile.bamboos : cached.profile?.bamboos ?? existing?.bamboos ?? 0,
      targetGoal: isCurrent
        ? profile.targetGoal
        : cached.profile?.targetGoal || existing?.targetGoal || 'Budowa bazy tlenowej',
      city: isCurrent ? profile.city : cached.profile?.city || existing?.city || 'Polska',
      runsCount: Math.max(mergedRuns.length, existing?.runsCount || 0),
      totalKm: Math.round(Math.max(computedKm, existing?.totalKm || 0) * 10) / 10,
      weeklyKm: isCurrent
        ? Number(profile.weeklyKm) || 35
        : Number(cached.profile?.weeklyKm || existing?.weeklyKm || 35),
      time5k: isCurrent
        ? profile.time5k
        : cached.profile?.time5k || existing?.time5k || undefined,
      vo2max: isCurrent
        ? Number(profile.vo2max) || 48
        : Number(cached.profile?.vo2max || existing?.vo2max || 48),
      selectedShoeId: isCurrent
        ? profile.selectedShoeId
        : cached.profile?.selectedShoeId || existing?.selectedShoeId,
      shoes: mergedShoes,
      runs: mergedRuns,
      personalBests: mergedPbs,
      inCloudSql: existing?.inCloudSql || false,
      isCurrentActive: isCurrent,
    });
  }

  // 3. Ensure active session user / profile is always represented with latest state
  const activeKey = currentUser?.id || 'active_local_profile';
  const existingActive = unifiedUsersMap.get(activeKey);
  const activeKm = Math.round(runs.reduce((s, r) => s + (Number(r.distanceKm) || 0), 0) * 10) / 10;
  unifiedUsersMap.set(activeKey, {
    id: activeKey,
    name: profile.name || currentUser?.name || existingActive?.name || 'Biegacz',
    email: currentUser?.email || existingActive?.email || 'Sesja lokalna (To urządzenie)',
    avatar: currentUser?.avatar || existingActive?.avatar,
    isPro: Boolean(currentUser?.isPro ?? (profile as any).isPro ?? existingActive?.isPro ?? true),
    bamboos: profile.bamboos ?? existingActive?.bamboos ?? 0,
    targetGoal: profile.targetGoal || existingActive?.targetGoal || 'Budowa bazy tlenowej',
    city: profile.city || existingActive?.city || 'Polska',
    runsCount: Math.max(runs.length, existingActive?.runsCount || 0),
    totalKm: Math.max(activeKm, existingActive?.totalKm || 0),
    weeklyKm: Number(profile.weeklyKm) || existingActive?.weeklyKm || 35,
    time5k: profile.time5k || existingActive?.time5k || '25:00',
    vo2max: Number(profile.vo2max) || existingActive?.vo2max || 48,
    selectedShoeId: profile.selectedShoeId || existingActive?.selectedShoeId,
    shoes: shoes.length > 0 ? shoes : existingActive?.shoes || [],
    runs: runs.length > 0 ? runs : existingActive?.runs || [],
    personalBests: personalBests.length > 0 ? personalBests : existingActive?.personalBests || [],
    inCloudSql: existingActive?.inCloudSql || false,
    isCurrentActive: true,
  });

  const allRealUsers = Array.from(unifiedUsersMap.values()).sort((a, b) =>
    a.isCurrentActive ? -1 : b.isCurrentActive ? 1 : b.totalKm - a.totalKm
  );

  // ============================================================================
  // 1. GLOBAL & AVERAGE RUNNING VOLUME METRICS ("Ile średnio biegają itp.")
  // ============================================================================
  const totalUsersCount = Math.max(1, allRealUsers.length);
  const proSubscribersCount = allRealUsers.filter((u) => u.isPro).length;
  const pricePerSub = 39; // 39 zł/miesiąc
  const mrrAmount = proSubscribersCount * pricePerSub;
  const conversionRatePercent =
    totalUsersCount > 0 ? Math.round((proSubscribersCount / totalUsersCount) * 1000) / 10 : 0;

  const aiPlansToday = Math.max(
    serverStats?.serverTelemetry?.aiPlansToday || 0,
    analytics?.aiPlansToday || 0
  );
  const affiliateClicksToday = Math.max(
    serverStats?.serverTelemetry?.affiliateClicksToday || 0,
    analytics?.affiliateClicksToday || 0
  );
  const affiliateShoesCount = shoes.filter(
    (s) => s.id.startsWith('aff-') || (s.aiNotes && s.aiNotes.toLowerCase().includes('afiliacja'))
  ).length;
  const estimatedAffiliateCommission = Math.round(affiliateClicksToday * 4.5);

  const totalBamboosAcrossUsers = allRealUsers.reduce((sum, u) => sum + (Number(u.bamboos) || 0), 0);

  // Collect all unique runs across all users
  const allRunsWithOwner: Array<{ run: RunLog; user: RealAdminUser }> = [];
  for (const u of allRealUsers) {
    for (const r of u.runs) {
      allRunsWithOwner.push({ run: r, user: u });
    }
  }

  const totalRunsAcrossUsers = Math.max(
    allRunsWithOwner.length,
    allRealUsers.reduce((sum, u) => sum + (Number(u.runsCount) || 0), 0),
    serverStats?.totalDbRuns || 0
  );

  const totalKmAcrossUsers = Math.max(
    Math.round(allRunsWithOwner.reduce((s, item) => s + (Number(item.run.distanceKm) || 0), 0) * 10) / 10,
    Math.round(allRealUsers.reduce((sum, u) => sum + (Number(u.totalKm) || 0), 0) * 10) / 10,
    serverStats?.totalDbDistanceKm || 0
  );

  const avgKmPerUser = Math.round((totalKmAcrossUsers / totalUsersCount) * 10) / 10;
  const avgRunsPerUser = Math.round((totalRunsAcrossUsers / totalUsersCount) * 10) / 10;
  const avgDistancePerRun =
    totalRunsAcrossUsers > 0 ? Math.round((totalKmAcrossUsers / totalRunsAcrossUsers) * 100) / 100 : 0;
  const avgWeeklyTargetKm =
    Math.round((allRealUsers.reduce((s, u) => s + (Number(u.weeklyKm) || 30), 0) / totalUsersCount) * 10) / 10;
  const avgVo2MaxAcrossUsers =
    Math.round((allRealUsers.reduce((s, u) => s + (Number(u.vo2max) || 48), 0) / totalUsersCount) * 10) / 10;

  // Global average duration, pace, HR, cadence across all recorded runs
  const avgDurationMinPerRun =
    allRunsWithOwner.length > 0
      ? Math.round(allRunsWithOwner.reduce((s, x) => s + (Number(x.run.durationMin) || 0), 0) / allRunsWithOwner.length)
      : 0;
  const avgHrAcrossRuns =
    allRunsWithOwner.length > 0
      ? Math.round(allRunsWithOwner.reduce((s, x) => s + (Number(x.run.avgHr) || 150), 0) / allRunsWithOwner.length)
      : 150;
  const avgCadenceAcrossRuns =
    allRunsWithOwner.length > 0
      ? Math.round(allRunsWithOwner.reduce((s, x) => s + (Number(x.run.avgCadence) || 174), 0) / allRunsWithOwner.length)
      : 175;

  const totalDurationSecAcrossRuns = allRunsWithOwner.reduce((s, x) => {
    const pSec = parseTimeStringToSeconds(x.run.avgPace);
    if (pSec && x.run.distanceKm > 0) return s + pSec * x.run.distanceKm;
    return s + (Number(x.run.durationMin) || 0) * 60;
  }, 0);
  const totalDistWithTime = allRunsWithOwner.reduce((s, x) => s + (Number(x.run.distanceKm) || 0), 0);
  const globalAvgPace =
    totalDistWithTime > 0 ? formatPaceMinKm(totalDurationSecAcrossRuns, totalDistWithTime) : '5:20';

  // Longest single run & most active user
  const longestRunEntry =
    allRunsWithOwner.length > 0
      ? [...allRunsWithOwner].sort((a, b) => (Number(b.run.distanceKm) || 0) - (Number(a.run.distanceKm) || 0))[0]
      : null;
  const mostActiveUser = [...allRealUsers].sort((a, b) => b.totalKm - a.totalKm)[0] || null;

  // ============================================================================
  // 2. SHOE ANALYTICS: WHO USES WHICH SHOES, BRAND BREAKDOWN & SHOE TYPE BREAKDOWN
  // ============================================================================
  interface UserShoeEntry {
    shoe: Shoe;
    user: RealAdminUser;
    canonicalBrand: string;
    category: ShoeCategoryType;
    isPrimary: boolean;
    runsInShoe: number;
  }

  const allUserShoeEntries: UserShoeEntry[] = [];

  for (const u of allRealUsers) {
    const userShoesList = u.shoes && u.shoes.length > 0 ? u.shoes : [];
    const shoeNamesInWardrobe = new Set(userShoesList.map((s) => s.name.toLowerCase()));

    for (let idx = 0; idx < userShoesList.length; idx++) {
      const sh = userShoesList[idx];
      const runsInThisShoe = u.runs.filter(
        (r) => r.shoeName && r.shoeName.toLowerCase() === sh.name.toLowerCase()
      ).length;
      const isPrimary = u.selectedShoeId ? u.selectedShoeId === sh.id : idx === 0;
      allUserShoeEntries.push({
        shoe: sh,
        user: u,
        canonicalBrand: normalizeShoeBrand(sh.brand, sh.name),
        category: classifyShoeCategory(sh),
        isPrimary,
        runsInShoe: runsInThisShoe,
      });
    }

    // Also check if user ran in any shoe mentioned in their run logs that wasn't in their wardrobe list
    const extraRunShoeMap = new Map<string, { km: number; count: number }>();
    for (const r of u.runs) {
      if (r.shoeName && !shoeNamesInWardrobe.has(r.shoeName.toLowerCase())) {
        const prev = extraRunShoeMap.get(r.shoeName) || { km: 0, count: 0 };
        prev.km += Number(r.distanceKm) || 0;
        prev.count += 1;
        extraRunShoeMap.set(r.shoeName, prev);
      }
    }
    for (const [rShoeName, info] of extraRunShoeMap.entries()) {
      const inferredBrand = normalizeShoeBrand('', rShoeName);
      const syntheticShoe: Shoe = {
        id: `run-inferred-${u.id}-${rShoeName}`,
        name: rShoeName,
        brand: inferredBrand,
        footType: 'Neutralna',
        mileageKm: Math.round(info.km * 10) / 10,
        maxMileageKm: 700,
        dropMm: 8,
        weightG: 245,
        energyReturn: 8,
        cushionRating: 8,
        stabilityRating: 7,
        cushion: 'Standard',
        idealFor: 'Treningi biegowe',
      };
      allUserShoeEntries.push({
        shoe: syntheticShoe,
        user: u,
        canonicalBrand: inferredBrand,
        category: classifyShoeCategory(syntheticShoe),
        isPrimary: userShoesList.length === 0,
        runsInShoe: info.count,
      });
    }
  }

  const totalTrackedShoes = Math.max(1, allUserShoeEntries.length);
  const totalShoeMileageKm = Math.round(
    allUserShoeEntries.reduce((sum, e) => sum + (Number(e.shoe.mileageKm) || 0), 0)
  );

  // Breakdown by Brand
  const brandStatsMap = new Map<
    string,
    {
      brand: string;
      pairsCount: number;
      usersSet: Set<string>;
      totalMileageKm: number;
      models: Set<string>;
      sampleShoeName: string;
    }
  >();

  for (const entry of allUserShoeEntries) {
    const existing = brandStatsMap.get(entry.canonicalBrand) || {
      brand: entry.canonicalBrand,
      pairsCount: 0,
      usersSet: new Set<string>(),
      totalMileageKm: 0,
      models: new Set<string>(),
      sampleShoeName: entry.shoe.name,
    };
    existing.pairsCount += 1;
    existing.usersSet.add(entry.user.id);
    existing.totalMileageKm += Number(entry.shoe.mileageKm) || 0;
    existing.models.add(entry.shoe.name);
    brandStatsMap.set(entry.canonicalBrand, existing);
  }

  const brandBreakdown = Array.from(brandStatsMap.values())
    .map((b) => ({
      brand: b.brand,
      pairsCount: b.pairsCount,
      usersCount: b.usersSet.size,
      sharePercent: Math.round((b.pairsCount / totalTrackedShoes) * 1000) / 10,
      totalMileageKm: Math.round(b.totalMileageKm),
      modelsList: Array.from(b.models),
      sampleShoeName: b.sampleShoeName,
    }))
    .sort((a, b) => b.pairsCount - a.pairsCount || b.totalMileageKm - a.totalMileageKm);

  // Breakdown by Shoe Type / Category
  const categoryBreakdown = (['daily', 'race_carbon', 'trail', 'recovery_max'] as ShoeCategoryType[]).map((catKey) => {
    const items = allUserShoeEntries.filter((e) => e.category === catKey);
    const pairsCount = items.length;
    const sharePercent = allUserShoeEntries.length > 0 ? Math.round((pairsCount / totalTrackedShoes) * 1000) / 10 : 0;
    const totalMileage = Math.round(items.reduce((s, e) => s + (Number(e.shoe.mileageKm) || 0), 0));
    const avgWeight =
      pairsCount > 0
        ? Math.round(items.reduce((s, e) => s + (Number(e.shoe.weightG) || 245), 0) / pairsCount)
        : 0;
    const avgDrop =
      pairsCount > 0
        ? Math.round((items.reduce((s, e) => s + (Number(e.shoe.dropMm) || 8), 0) / pairsCount) * 10) / 10
        : 0;
    return {
      key: catKey,
      meta: SHOE_TYPE_META[catKey],
      pairsCount,
      sharePercent,
      totalMileage,
      avgWeight,
      avgDrop,
      items,
    };
  });

  // ============================================================================
  // 3. DISTANCE TIMES & USER RECORDS (1 km, 5 km, 10 km, Półmaraton, Maraton)
  // ============================================================================
  interface DistanceConfig {
    id: string;
    label: string;
    shortLabel: string;
    distanceKm: number;
    pbMatchLabels: string[];
    minRunKm: number;
    maxRunKm: number;
  }

  const TARGET_DISTANCES: DistanceConfig[] = [
    {
      id: '1k',
      label: '1 km (Sprint / Test)',
      shortLabel: '1 km',
      distanceKm: 1,
      pbMatchLabels: ['1 km', '1km', '1000m'],
      minRunKm: 0.9,
      maxRunKm: 2.5,
    },
    {
      id: '5k',
      label: '5 km (Bieg Uliczny 5K)',
      shortLabel: '5 km',
      distanceKm: 5,
      pbMatchLabels: ['5 km', '5km', '5k'],
      minRunKm: 4.7,
      maxRunKm: 6.5,
    },
    {
      id: '10k',
      label: '10 km (Dycha Biegowa)',
      shortLabel: '10 km',
      distanceKm: 10,
      pbMatchLabels: ['10 km', '10km', '10k'],
      minRunKm: 9.5,
      maxRunKm: 13.0,
    },
    {
      id: '21k',
      label: 'Półmaraton (21.1 km)',
      shortLabel: '21.1 km',
      distanceKm: 21.0975,
      pbMatchLabels: ['półmaraton', '21.1', '21,1', 'half'],
      minRunKm: 20.0,
      maxRunKm: 25.0,
    },
    {
      id: '42k',
      label: 'Maraton (42.2 km)',
      shortLabel: '42.2 km',
      distanceKm: 42.195,
      pbMatchLabels: ['maraton (42', '42.2', '42,2', 'marathon'],
      minRunKm: 39.0,
      maxRunKm: 50.0,
    },
  ];

  // Extract each user's best time (official PB or run log or Riegel estimate from 5k/runs)
  interface UserDistanceRecord {
    userId: string;
    userName: string;
    timeSec: number;
    timeFormatted: string;
    paceFormatted: string;
    source: 'PB / Bieg' | 'Profil 5K' | 'Estymacja VDOT';
    date?: string;
  }

  const getUserBestForDistance = (user: RealAdminUser, distCfg: DistanceConfig): UserDistanceRecord | null => {
    let bestOfficialSec: number | null = null;
    let bestDate: string | undefined = undefined;
    let bestSource: 'PB / Bieg' | 'Profil 5K' | 'Estymacja VDOT' = 'PB / Bieg';

    // 1. Check PersonalBests array
    for (const pb of user.personalBests || []) {
      const dLabel = `${pb.distanceName || ''} ${pb.distanceId || ''}`.toLowerCase();
      const matches = distCfg.pbMatchLabels.some((m) => dLabel.includes(m));
      if (matches) {
        // Avoid matching "półmaraton" when looking for "maraton"
        if (distCfg.id === '42k' && (dLabel.includes('pół') || dLabel.includes('half'))) continue;
        const sec = parseTimeStringToSeconds(pb.time);
        if (sec && sec > 60 && (!bestOfficialSec || sec < bestOfficialSec)) {
          bestOfficialSec = sec;
          bestDate = pb.date;
          bestSource = 'PB / Bieg';
        }
      }
    }

    // 2. Check actual RunLogs covering this distance
    for (const r of user.runs || []) {
      const dKm = Number(r.distanceKm) || 0;
      if (dKm >= distCfg.minRunKm) {
        const paceSec = parseTimeStringToSeconds(r.avgPace);
        const totalRunSec = paceSec ? paceSec * dKm : (Number(r.durationMin) || 0) * 60;
        if (totalRunSec > 0 && dKm > 0) {
          // Equivalent time for exact target distance from that run
          const projectedForDist =
            dKm <= distCfg.maxRunKm
              ? (totalRunSec / dKm) * distCfg.distanceKm
              : (totalRunSec / dKm) * distCfg.distanceKm;
          if (!bestOfficialSec || projectedForDist < bestOfficialSec) {
            bestOfficialSec = Math.round(projectedForDist);
            bestDate = r.date;
            bestSource = 'PB / Bieg';
          }
        }
      }
    }

    // 3. For 5K, also check profile.time5k
    const base5kSec = parseTimeStringToSeconds(user.time5k);
    if (distCfg.id === '5k' && base5kSec && base5kSec > 600) {
      if (!bestOfficialSec || base5kSec < bestOfficialSec) {
        bestOfficialSec = base5kSec;
        bestSource = 'Profil 5K';
      }
    }

    if (bestOfficialSec) {
      return {
        userId: user.id,
        userName: user.name,
        timeSec: bestOfficialSec,
        timeFormatted: formatSecondsToRaceTime(bestOfficialSec),
        paceFormatted: formatPaceMinKm(bestOfficialSec, distCfg.distanceKm),
        source: bestSource,
        date: bestDate,
      };
    }

    // 4. Riegel physiological formula fallback from user's 5K time or fastest run so every distance has realistic benchmark
    const ref5k = base5kSec || 1500; // default 25:00 if missing
    const riegelSec = Math.round(ref5k * Math.pow(distCfg.distanceKm / 5, 1.06));
    return {
      userId: user.id,
      userName: user.name,
      timeSec: riegelSec,
      timeFormatted: formatSecondsToRaceTime(riegelSec),
      paceFormatted: formatPaceMinKm(riegelSec, distCfg.distanceKm),
      source: 'Estymacja VDOT',
    };
  };

  const distanceAnalytics = TARGET_DISTANCES.map((distCfg) => {
    const records = allRealUsers
      .map((u) => getUserBestForDistance(u, distCfg))
      .filter((r): r is UserDistanceRecord => r !== null)
      .sort((a, b) => a.timeSec - b.timeSec);

    const officialRecords = records.filter((r) => r.source !== 'Estymacja VDOT');
    const avgSec =
      records.length > 0
        ? Math.round(records.reduce((s, r) => s + r.timeSec, 0) / records.length)
        : 0;
    const bestRecord = records[0] || null;

    return {
      config: distCfg,
      avgTimeFormatted: avgSec > 0 ? formatSecondsToRaceTime(avgSec) : '--:--',
      avgPaceFormatted: avgSec > 0 ? formatPaceMinKm(avgSec, distCfg.distanceKm) : '--:--',
      bestRecord,
      officialCount: officialRecords.length,
      allUserRecords: records,
    };
  });

  const filteredUsers = allRealUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleAdminUserAction = async (
    user: RealAdminUser,
    action: { togglePro?: boolean; addBamboos?: number; resetPlan?: boolean }
  ) => {
    const targetId = user.isCurrentActive ? 'current' : user.id;
    if (action.togglePro) {
      onToggleUserPro(targetId);
      if (targetId !== 'current') onToggleUserPro(user.id);
    }
    if (typeof action.addBamboos === 'number') {
      onAddUserBamboos(targetId, action.addBamboos);
    }
    if (action.resetPlan) {
      onResetUserPlan(targetId);
    }

    if (user.inCloudSql || (user.id && user.id !== 'active_local_profile')) {
      try {
        const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
        if (headers) {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/action`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...action,
              defaultPlan: action.resetPlan ? DEFAULT_PLAN : undefined,
            }),
          });
          if (res.ok) {
            const updated = await res.json();
            setServerStats(updated);
          }
        }
      } catch {}
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.id;
    const name = userToDelete.name;
    setIsDeletingUser(true);

    try {
      const headers = await getAuthHeaders();
      if (headers) {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
          method: 'DELETE',
          headers,
        });
        if (res.ok) {
          const updated = await res.json();
          setServerStats(updated);
        }
      }
    } catch (err) {
      console.error('Error deleting user on server:', err);
    }

    if (onDeleteUser) {
      onDeleteUser(uid);
    }

    soundEngine.playSuccess();
    showToast(`Użytkownik ${name} został pomyślnie usunięty.`);
    setUserToDelete(null);
    setIsDeletingUser(false);
    fetchRealAdminData();
  };

  const handleAddRaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaceName.trim()) {
      showToast('Wpisz nazwę biegu!');
      return;
    }
    const raceObj: RaceSlot = {
      id: `custom-race-${Date.now()}`,
      name: newRaceName,
      date: newRaceDate,
      distanceKm: Number(newRaceDistance) || 10,
      distanceCategory: '10k',
      city: newRaceCity || 'Warszawa',
      role: 'Start Kontrolny B',
      profile: 'Płaska/Atestowana',
      registrationUrl:
        newRaceUrl || 'https://www.google.com/search?q=' + encodeURIComponent(newRaceName),
      isRegistered: false,
    };
    onAddCustomRace(raceObj);
    soundEngine.playSuccess();
    showToast(`Dodano oficjalny bieg: ${newRaceName} 🏁`);
    setNewRaceName('');
  };

  const handleAddShoeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoeBrand.trim() || !newShoeModel.trim()) {
      showToast('Podaj markę i model buta!');
      return;
    }
    const shoeObj: Shoe = {
      id: `aff-shoe-${Date.now()}`,
      name: `${newShoeBrand} ${newShoeModel}`,
      brand: newShoeBrand,
      footType: 'Neutralna',
      mileageKm: 0,
      maxMileageKm: 800,
      dropMm: 8,
      weightG: 250,
      energyReturn: 8,
      cushionRating: 8,
      stabilityRating: 7,
      cushion: 'Pianka Amortyzująca PRO',
      idealFor: newShoeCategory || 'Treningi i Starty',
      aiNotes: `Afiliacja (${newShoeCommission} prowizji). Cena: ${newShoePrice}`,
      aiVerdict: `Polecane przez Administratora (${newShoeAffiliateUrl || 'Link Partnera'})`,
    };
    onAddCustomShoe(shoeObj);
    soundEngine.playSuccess();
    showToast(`Dodano but z linkiem afiliacyjnym: ${shoeObj.name} 👟`);
    setNewShoeModel('');
  };

  const handleSavePushBanner = () => {
    if (!pushText.trim()) {
      onSetGlobalPushBanner(null);
      showToast('Powiadomienie Push wyczyszczone!');
    } else {
      onSetGlobalPushBanner(pushText.trim());
      soundEngine.playFanfare();
      showToast('Globalne powiadomienie Push wysłane do wszystkich biegaczy! 📢');
    }
  };

  useLockBodyScroll(isOpen);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-3 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios"
    >
      <div className="liquid-glass w-full max-w-3xl max-h-[92dvh] flex flex-col p-4 sm:p-5 space-y-3.5 border border-[var(--accent)]/50 shadow-2xl animate-ios-modal overflow-hidden relative my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl accent-bg flex items-center justify-center text-xl font-black text-black shadow-lg">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                  Admin Mode = ON
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  • Real-Time Analytics ({serverStats?.dbConnected ? 'Cloud SQL + Local' : 'Local Sync'})
                </span>
              </div>
              <h2 className="text-base font-black txt-main leading-tight">
                Panel Analityczny & Zarządzanie Running Planer PRO
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchRealAdminData}
              disabled={isLoadingStats}
              className="px-2.5 h-8 rounded-full liquid-pill flex items-center gap-1 font-bold text-[10px] text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95"
              title="Odśwież realne dane z bazy Cloud SQL i sesji"
            >
              <span className={isLoadingStats ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">Odśwież</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center font-bold text-xs txt-sub hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs (6 Clear Sections) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 liquid-pill shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'dashboard'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>📊</span>
            <span>Ogólne & Bieg</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shoes_stats')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'shoes_stats'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>👟</span>
            <span>Buty & Marki</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('times_records')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'times_records'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>⏱️</span>
            <span>Czasy & Rekordy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'users'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>Gracze ({totalUsersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'catalog'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>🏁</span>
            <span>Katalog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('push')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'push'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>📢</span>
            <span>Push</span>
          </button>
        </div>

        {/* =====================================================================
            TAB 1: 📊 OGÓLNE STATYSTYKI, ILE ŚREDNIO BIEGAJĄ & RUCH NA ŻYWO
           ===================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Top SaaS KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="liquid-glass p-3 rounded-2xl border border-blue-500/30 space-y-1">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                  Wszyscy Biegacze
                </span>
                <div className="text-xl font-black txt-main ios-num">
                  {totalUsersCount.toLocaleString('pl-PL')}
                </div>
                <span className="text-[9px] text-emerald-400 font-medium block">
                  {serverStats?.totalDbUsers || 0} w Cloud SQL • {users.length || 1} lokalnie
                </span>
              </div>

              <div className="liquid-glass p-3 rounded-2xl border border-amber-500/30 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  Subskrybenci PRO
                </span>
                <div className="text-xl font-black text-amber-400 ios-num">
                  {proSubscribersCount}
                </div>
                <span className="text-[9px] txt-muted block">
                  Konwersja: {conversionRatePercent}% ({mrrAmount} zł MRR)
                </span>
              </div>

              <div className="liquid-glass p-3 rounded-2xl border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Łączny Dystans Bazy
                </span>
                <div className="text-xl font-black text-emerald-400 ios-num">
                  {totalKmAcrossUsers.toLocaleString('pl-PL')} km
                </div>
                <span className="text-[9px] text-emerald-300 font-medium block">
                  W {totalRunsAcrossUsers} zapisanych treningach
                </span>
              </div>

              <div className="liquid-glass p-3 rounded-2xl border border-purple-500/30 space-y-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                  Buty w Szafach Graczy
                </span>
                <div className="text-xl font-black text-purple-400 ios-num">
                  {allUserShoeEntries.length} par
                </div>
                <span className="text-[9px] txt-muted block">
                  {brandBreakdown.length} marek • {totalShoeMileageKm} km przebiegu
                </span>
              </div>
            </div>

            {/* NEW: Ile średnio biegają użytkownicy (Średnia objętość, tempo, tętno, VO2max) */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-sky-500/35 bg-sky-950/15">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏃‍♂️</span> Ile Średnio Biegają Użytkownicy (Analiza Objętości & Biometrii)
                </h3>
                <span className="text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                  Wyliczone z realnych biegów ({totalRunsAcrossUsers})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="liquid-pill p-2.5 border border-white/5">
                  <span className="text-[9px] txt-muted block uppercase">Śr. dystans na gracza</span>
                  <strong className="text-base font-black text-white ios-num">{avgKmPerUser} km</strong>
                  <span className="text-[9px] text-sky-400 block">~{avgRunsPerUser} biegów / osobę</span>
                </div>

                <div className="liquid-pill p-2.5 border border-white/5">
                  <span className="text-[9px] txt-muted block uppercase">Śr. pojedynczy trening</span>
                  <strong className="text-base font-black text-emerald-400 ios-num">{avgDistancePerRun} km</strong>
                  <span className="text-[9px] txt-sub block">Śr. czas: {avgDurationMinPerRun} min</span>
                </div>

                <div className="liquid-pill p-2.5 border border-white/5">
                  <span className="text-[9px] txt-muted block uppercase">Śr. cel tygodniowy</span>
                  <strong className="text-base font-black text-amber-400 ios-num">{avgWeeklyTargetKm} km/tydz.</strong>
                  <span className="text-[9px] txt-sub block">Deklarowany kilometraż</span>
                </div>

                <div className="liquid-pill p-2.5 border border-white/5">
                  <span className="text-[9px] txt-muted block uppercase">Śr. Tempo & VO2max</span>
                  <strong className="text-base font-black text-purple-300 ios-num">{globalAvgPace} /km</strong>
                  <span className="text-[9px] text-emerald-300 block">VO2max śr.: {avgVo2MaxAcrossUsers}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <span className="txt-muted">Średnie Tętno / Kadencja:</span>
                  <strong className="text-rose-300 font-black ios-num">
                    {avgHrAcrossRuns} bpm • {avgCadenceAcrossRuns} spm
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <span className="txt-muted">Najdłuższy bieg w bazie:</span>
                  <strong className="text-emerald-300 font-black ios-num truncate max-w-[150px]">
                    {longestRunEntry
                      ? `${longestRunEntry.run.distanceKm} km (${longestRunEntry.user.name})`
                      : 'Brak'}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <span className="txt-muted">Lider kilometrażu:</span>
                  <strong className="text-amber-300 font-black ios-num truncate max-w-[150px]">
                    {mostActiveUser ? `${mostActiveUser.name} (${mostActiveUser.totalKm} km)` : 'Brak'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Summary of Shoes & Distance Averages on Main Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Top Shoe Brands Preview */}
              <div className="liquid-glass p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
                    <span>👟</span> Top Marki Obuwia Graczy
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shoes_stats')}
                    className="text-[10px] font-black text-emerald-400 hover:underline cursor-pointer"
                  >
                    Pełny raport obuwia →
                  </button>
                </div>
                <div className="space-y-1.5">
                  {brandBreakdown.slice(0, 4).map((b) => (
                    <div
                      key={b.brand}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShoeBrandLogo brand={b.brand} shoeName={b.sampleShoeName} size="sm" />
                        <div className="min-w-0">
                          <div className="font-black text-white truncate">{b.brand}</div>
                          <div className="text-[9px] txt-muted truncate">
                            {b.pairsCount} {b.pairsCount === 1 ? 'para' : 'pary'} • {b.totalMileageKm} km
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400 ios-num shrink-0">
                        {b.sharePercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distance Averages & Records Preview */}
              <div className="liquid-glass p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
                    <span>⏱️</span> Średnie Czasy & Rekordy Bazy
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('times_records')}
                    className="text-[10px] font-black text-amber-400 hover:underline cursor-pointer"
                  >
                    Wszystkie dystanse →
                  </button>
                </div>
                <div className="space-y-1.5">
                  {distanceAnalytics.slice(0, 4).map((da) => (
                    <div
                      key={da.config.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 text-xs"
                    >
                      <div>
                        <span className="font-black text-white">{da.config.shortLabel}</span>
                        <span className="text-[10px] txt-muted ml-2">
                          Śr.: <strong className="text-sky-300 ios-num">{da.avgTimeFormatted}</strong> ({da.avgPaceFormatted}/km)
                        </span>
                      </div>
                      {da.bestRecord && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 ios-num">
                          🏆 {da.bestRecord.timeFormatted} ({da.bestRecord.userName.split(' ')[0]})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Real Traffic & Session Analytics Card */}
            {analytics && (
              <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-emerald-500/30 bg-emerald-500/5">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>📡</span> Statystyki Odwiedzin & Ruchu na Żywo
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    Aplikacja Live
                  </span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="liquid-pill p-2">
                    <span className="text-[9px] txt-muted block">Odwiedziny ogółem</span>
                    <strong className="text-sm font-black txt-main ios-num">{analytics.totalVisits}</strong>
                  </div>
                  <div className="liquid-pill p-2">
                    <span className="text-[9px] txt-muted block">Dzisiejsze Sesje</span>
                    <strong className="text-sm font-black text-amber-400 ios-num">{analytics.todayVisits}</strong>
                  </div>
                  <div className="liquid-pill p-2">
                    <span className="text-[9px] txt-muted block">Wyświetlenia Stron</span>
                    <strong className="text-sm font-black text-sky-400 ios-num">{analytics.totalPageviews}</strong>
                  </div>
                  <div className="liquid-pill p-2">
                    <span className="text-[9px] txt-muted block">Unikalne Urządzenia</span>
                    <strong className="text-sm font-black text-emerald-400 ios-num">{analytics.uniqueVisitors}</strong>
                  </div>
                </div>

                <div className="text-[10px] txt-sub flex items-center justify-between border-t border-white/10 pt-2 flex-wrap gap-2">
                  <span>
                    Urządzenie: <strong className="txt-main">{analytics.activeDeviceType}</strong>
                  </span>
                  <span>
                    Plany AI dzisiaj: <strong className="text-purple-300">{aiPlansToday}</strong> • Kliknięcia afiliacyjne: <strong className="text-amber-300">{affiliateClicksToday} (~{estimatedAffiliateCommission} zł)</strong>
                  </span>
                  <span>
                    Ostatnia wizyta: <strong className="txt-main">{analytics.lastVisitDate}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: 👟 OBUWIE BIEGACZY (KTO Z JAKICH BUTÓW KORZYSTA, MARKI & TYP)
           ===================================================================== */}
        {activeTab === 'shoes_stats' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Section 1: Podział na Marki Obuwia (Brand Share) */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-emerald-500/35">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏷️</span> Podział Obuwia na Marki Producentów
                  </h3>
                  <p className="text-[10px] txt-sub">
                    Udział poszczególnych marek w szafach wszystkich biegaczy oraz łączny przebieg
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ios-num">
                  Łącznie: {allUserShoeEntries.length} par ({totalShoeMileageKm} km)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {brandBreakdown.map((b) => (
                  <div
                    key={b.brand}
                    className="p-3 rounded-2xl liquid-pill border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ShoeBrandLogo brand={b.brand} shoeName={b.sampleShoeName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">{b.brand}</div>
                          <div className="text-[10px] txt-muted">
                            {b.pairsCount} {b.pairsCount === 1 ? 'para' : 'pary'} • {b.usersCount}{' '}
                            {b.usersCount === 1 ? 'biegacz' : 'biegaczy'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-emerald-400 ios-num">{b.sharePercent}%</div>
                        <div className="text-[10px] text-sky-300 font-bold ios-num">{b.totalMileageKm} km</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${Math.max(6, b.sharePercent)}%` }}
                      />
                    </div>

                    <div className="text-[10px] txt-sub truncate">
                      Modele: <strong className="text-slate-200">{b.modelsList.join(', ')}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Podział na Typ i Przeznaczenie Obuwia */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-amber-500/35">
              <div>
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Podział na Typ Obuwia (Treningowe, Startowe/Karbon, Trail, Regeneracyjne)
                </h3>
                <p className="text-[10px] txt-sub">
                  Klasyfikacja biomechaniczna obuwia używanego przez użytkowników aplikacji
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-3 rounded-2xl liquid-pill border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${cat.meta.badgeClass}`}
                      >
                        {cat.meta.shortLabel}
                      </span>
                      <span className="text-sm font-black text-white ios-num">
                        {cat.pairsCount} par ({cat.sharePercent}%)
                      </span>
                    </div>

                    <p className="text-[10px] txt-muted leading-snug">{cat.meta.desc}</p>

                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${cat.meta.colorClass} rounded-full`}
                        style={{ width: `${Math.max(4, cat.sharePercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] txt-sub pt-1 border-t border-white/5">
                      <span>
                        Przebieg grupy: <strong className="text-white ios-num">{cat.totalMileage} km</strong>
                      </span>
                      {cat.pairsCount > 0 && (
                        <span>
                          Śr. waga/drop: <strong className="text-white ios-num">{cat.avgWeight}g / {cat.avgDrop}mm</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Kto z jakich butów korzysta (Szczegółowa lista Użytkownik -> Buty) */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-white/15">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
                    <span>👤</span> Kto z Jakich Butów Korzysta (Przypisanie do Użytkowników)
                  </h3>
                  <p className="text-[10px] txt-sub">
                    Zestawienie wszystkich biegaczy, ich aktywnych butów głównych, rotacji oraz zużycia
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {allRealUsers.map((u) => {
                  const userEntries = allUserShoeEntries.filter((e) => e.user.id === u.id);
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {u.name} {u.isCurrentActive ? '(Aktywna sesja)' : ''}
                          </span>
                          {u.isPro && (
                            <span className="text-[9px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                              PRO
                            </span>
                          )}
                          <span className="text-[10px] txt-muted">• {u.email}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 ios-num">
                          {userEntries.length} {userEntries.length === 1 ? 'para' : 'pary'} w szafie • {u.totalKm} km biegów
                        </span>
                      </div>

                      {userEntries.length === 0 ? (
                        <div className="text-[11px] txt-muted italic py-1">
                          Użytkownik nie przypisał jeszcze modelu obuwia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {userEntries.map((entry, idx) => {
                            const maxKm = entry.shoe.maxMileageKm || 700;
                            const wearPct = Math.min(100, Math.round(((entry.shoe.mileageKm || 0) / maxKm) * 100));
                            const typeMeta = SHOE_TYPE_META[entry.category];
                            return (
                              <div
                                key={`${entry.shoe.id}-${idx}`}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${
                                  entry.isPrimary
                                    ? 'bg-emerald-950/25 border-emerald-500/40'
                                    : 'bg-white/5 border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ShoeBrandLogo
                                    brand={entry.canonicalBrand}
                                    shoeName={entry.shoe.name}
                                    brandLogoUrl={entry.shoe.brandLogoUrl}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-white truncate">
                                        {entry.shoe.name}
                                      </span>
                                      {entry.isPrimary && (
                                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                                          Główny
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${typeMeta.badgeClass}`}
                                      >
                                        {typeMeta.shortLabel}
                                      </span>
                                      <span className="text-[9px] txt-muted ios-num">
                                        Drop {entry.shoe.dropMm || 8}mm • {entry.shoe.weightG || 245}g
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-xs font-black text-white ios-num">
                                    {entry.shoe.mileageKm} <span className="text-[9px] txt-muted">/ {maxKm} km</span>
                                  </div>
                                  <div className="text-[9px] txt-sub ios-num">
                                    Zużycie: {wearPct}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: ⏱️ ŚREDNIE CZASY NA DYSTANSE & REKORDY UŻYTKOWNIKÓW
           ===================================================================== */}
        {activeTab === 'times_records' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Section 1: Średnie Czasy i Rekordy Aplikacji na Dystansach (1km, 5km, 10km, 21.1km, 42.2km) */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-amber-500/40">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏆</span> Średnie Czasy na Poszczególne Dystanse & Rekordy Bazy
                  </h3>
                  <p className="text-[10px] txt-sub">
                    Zestawienie średnich czasów wszystkich graczy, średniego tempa oraz rekordu aplikacji na każdym dystansie
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {distanceAnalytics.map((da) => (
                  <div
                    key={da.config.id}
                    className="p-3.5 rounded-2xl liquid-pill border border-white/10 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{da.config.label}</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Śr. Tempo: {da.avgPaceFormatted}/km
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between border-b border-white/10 pb-2">
                        <div>
                          <span className="text-[9px] txt-muted uppercase block">Średni czas graczy</span>
                          <strong className="text-lg font-black text-sky-400 ios-num">
                            {da.avgTimeFormatted}
                          </strong>
                        </div>

                        {da.bestRecord && (
                          <div className="text-right">
                            <span className="text-[9px] text-amber-400 font-bold uppercase block">
                              👑 Rekord Użytkowników
                            </span>
                            <strong className="text-lg font-black text-amber-400 ios-num">
                              {da.bestRecord.timeFormatted}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {da.bestRecord && (
                      <div className="text-[10px] flex items-center justify-between pt-0.5">
                        <span className="txt-sub truncate">
                          Rekordzista: <strong className="text-white">{da.bestRecord.userName}</strong>
                        </span>
                        <span className="text-emerald-400 font-bold ios-num shrink-0">
                          {da.bestRecord.paceFormatted} /km
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Tabela Rekordów i Średnich Biegowych Wszystkich Użytkowników */}
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-white/15">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
                    <span>📋</span> Rekordy Życiowe & Statystyki Dystansowe Poszczególnych Użytkowników
                  </h3>
                  <p className="text-[10px] txt-sub">
                    Najlepsze czasy na 1 km, 5 km, 10 km, Półmaraton i Maraton oraz średnia objętość biegowa każdego gracza
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/15 text-[10px] uppercase txt-muted">
                      <th className="py-2 pr-2">Biegacz</th>
                      <th className="py-2 px-2 text-center">Śr. / Tydz.</th>
                      <th className="py-2 px-2 text-center">1 km</th>
                      <th className="py-2 px-2 text-center">5 km</th>
                      <th className="py-2 px-2 text-center">10 km</th>
                      <th className="py-2 px-2 text-center">Półmaraton</th>
                      <th className="py-2 pl-2 text-center">Maraton</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {allRealUsers.map((u) => {
                      const r1k = getUserBestForDistance(u, TARGET_DISTANCES[0]);
                      const r5k = getUserBestForDistance(u, TARGET_DISTANCES[1]);
                      const r10k = getUserBestForDistance(u, TARGET_DISTANCES[2]);
                      const r21k = getUserBestForDistance(u, TARGET_DISTANCES[3]);
                      const r42k = getUserBestForDistance(u, TARGET_DISTANCES[4]);
                      const userAvgRunKm =
                        u.runsCount > 0 ? Math.round((u.totalKm / u.runsCount) * 10) / 10 : 0;

                      return (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 pr-2">
                            <div className="font-black text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.isCurrentActive && (
                                <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Ty
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] txt-muted ios-num">
                              {u.totalKm} km ({u.runsCount} biegów • śr. {userAvgRunKm} km/bieg)
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-400 ios-num">
                            {u.weeklyKm} km
                          </td>
                          <td className="py-2.5 px-2 text-center ios-num">
                            <span className="font-bold text-white block">{r1k?.timeFormatted}</span>
                            <span className="text-[9px] txt-muted">{r1k?.paceFormatted}/km</span>
                          </td>
                          <td className="py-2.5 px-2 text-center ios-num">
                            <span className="font-black text-amber-400 block">{r5k?.timeFormatted}</span>
                            <span className="text-[9px] txt-muted">{r5k?.paceFormatted}/km</span>
                          </td>
                          <td className="py-2.5 px-2 text-center ios-num">
                            <span className="font-bold text-sky-300 block">{r10k?.timeFormatted}</span>
                            <span className="text-[9px] txt-muted">{r10k?.paceFormatted}/km</span>
                          </td>
                          <td className="py-2.5 px-2 text-center ios-num">
                            <span className="font-bold text-purple-300 block">{r21k?.timeFormatted}</span>
                            <span className="text-[9px] txt-muted">{r21k?.paceFormatted}/km</span>
                          </td>
                          <td className="py-2.5 pl-2 text-center ios-num">
                            <span className="font-bold text-emerald-300 block">{r42k?.timeFormatted}</span>
                            <span className="text-[9px] txt-muted">{r42k?.paceFormatted}/km</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 👥 Zarządzanie Użytkownikami (Realni Gracze z Bazy i Urządzenia) */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Szukaj gracza po nazwie lub e-mailu..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full p-2.5 rounded-xl liquid-pill text-xs txt-main font-bold border border-white/10"
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const mainShoe =
                  user.shoes.find((s) => s.id === user.selectedShoeId) || user.shoes[0] || null;
                return (
                  <div
                    key={user.id}
                    className={`liquid-glass p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      user.isCurrentActive
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full accent-bg text-black font-black flex items-center justify-center shrink-0">
                          {user.isCurrentActive ? '👑' : user.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black txt-main">
                            {user.name} {user.isCurrentActive ? '(Ty / Aktywna sesja)' : ''}
                          </span>
                          {user.isPro ? (
                            <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                              ⭐ PRO VIP
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-500/20 px-1.5 py-0.5 rounded">
                              LITE / Standard
                            </span>
                          )}
                          {user.inCloudSql && (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ☁️ Cloud SQL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] txt-sub mt-0.5">
                          {user.email} • Bambusy:{' '}
                          <span className="text-amber-400 font-bold">{user.bamboos} 🎋</span> • Biegi:{' '}
                          <span className="text-sky-400 font-bold">
                            {user.runsCount} ({user.totalKm} km)
                          </span>{' '}
                          • 5K: <span className="text-emerald-300 font-bold">{user.time5k || '25:00'}</span>
                        </div>
                        <div className="text-[10px] txt-muted">
                          But główny:{' '}
                          <strong className="text-slate-200">
                            {mainShoe ? `${mainShoe.name} (${mainShoe.mileageKm} km)` : 'Brak'}
                          </strong>{' '}
                          • Cel: {user.targetGoal}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          handleAdminUserAction(user, { togglePro: true });
                          showToast(`Zmieniono status PRO dla: ${user.name}`);
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${
                          user.isPro
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        }`}
                      >
                        {user.isPro ? 'Cofnij PRO' : '⭐ Nadaj PRO (VIP)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAdminUserAction(user, { addBamboos: 1000 });
                          soundEngine.playSuccess();
                          showToast(`Przekazano +1000 bambusów dla: ${user.name}! 🎋`);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black hover:bg-emerald-500/30 active:scale-95"
                      >
                        🎋 +1000 Bambusów
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAdminUserAction(user, { resetPlan: true });
                          showToast(`Zresetowano plan AI dla: ${user.name} 🔄`);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black hover:bg-blue-500/30 active:scale-95"
                      >
                        🔄 Resetuj Plan
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        className="py-1.5 px-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black hover:bg-rose-500/35 active:scale-95 transition-all flex items-center gap-1"
                        title={`Usuń użytkownika ${user.name}`}
                      >
                        <span>🗑️ Usuń</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: 🏁 Baza Biegów & Katalog Afiliacyjny Butów */}
        {activeTab === 'catalog' && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Form 1: Add Official Race */}
            <form
              onSubmit={handleAddRaceSubmit}
              className="liquid-glass p-4 rounded-2xl space-y-3 border border-emerald-500/30"
            >
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏁</span> + Dodaj Oficjalny Bieg do Bazy 2027
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Nazwa imprezy biegowej</label>
                  <input
                    type="text"
                    placeholder="np. Półmaraton Warszawski 2027"
                    value={newRaceName}
                    onChange={(e) => setNewRaceName(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Data biegu</label>
                  <input
                    type="date"
                    value={newRaceDate}
                    onChange={(e) => setNewRaceDate(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Dystans</label>
                  <input
                    type="text"
                    placeholder="np. 21.1 km / 42.2 km / 10 km"
                    value={newRaceDistance}
                    onChange={(e) => setNewRaceDistance(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Miasto / Lokalizacja</label>
                  <input
                    type="text"
                    placeholder="np. Warszawa"
                    value={newRaceCity}
                    onChange={(e) => setNewRaceCity(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] txt-muted block mb-1">
                    Link do zapisów organizatora (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://maratonwarszawski.com/zapisy"
                    value={newRaceUrl}
                    onChange={(e) => setNewRaceUrl(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-98 transition-all"
              >
                + Dodaj Bieg do Bazy Globalnej
              </button>
            </form>

            {/* Form 2: Add Shoe with Affiliate Link */}
            <form
              onSubmit={handleAddShoeSubmit}
              className="liquid-glass p-4 rounded-2xl space-y-3 border border-amber-500/30"
            >
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👟</span> + Dodaj But do Katalogu (z linkiem afiliacyjnym)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Marka</label>
                  <input
                    type="text"
                    placeholder="Nike / Asics / Hoka"
                    value={newShoeBrand}
                    onChange={(e) => setNewShoeBrand(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="Vaporfly 3 / Superblast 2"
                    value={newShoeModel}
                    onChange={(e) => setNewShoeModel(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Cena w sklepie</label>
                  <input
                    type="text"
                    placeholder="np. 999 zł"
                    value={newShoePrice}
                    onChange={(e) => setNewShoePrice(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Prowizja partnera %</label>
                  <input
                    type="text"
                    placeholder="np. 12%"
                    value={newShoeCommission}
                    onChange={(e) => setNewShoeCommission(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] txt-muted block mb-1">
                    Link partnerski / Afiliacyjny Sklepu Biegowego
                  </label>
                  <input
                    type="url"
                    placeholder="https://sklepbiegacza.pl/aff/vaporfly3?ref=runningplaner"
                    value={newShoeAffiliateUrl}
                    onChange={(e) => setNewShoeAffiliateUrl(e.target.value)}
                    className="w-full p-2 rounded-xl liquid-pill text-xs txt-main font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-98 transition-all"
              >
                + Dodaj But Afiliacyjny do Szafy
              </button>
            </form>

            {/* List of Custom Added Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold txt-sub uppercase tracking-wider">
                Aktualnie w Bazie Biegów ({races.length}):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {races.map((r) => (
                  <div
                    key={r.id}
                    className="liquid-glass p-2.5 rounded-xl flex items-center justify-between border border-white/5"
                  >
                    <div>
                      <div className="font-bold txt-main">{r.name}</div>
                      <div className="text-[10px] txt-sub">
                        {r.date} • {r.city} • {r.distanceKm} km
                      </div>
                    </div>
                    {r.id.startsWith('custom-') && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomRace(r.id)}
                        className="text-[10px] text-rose-400 hover:underline px-2"
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: 📢 Global Push Banner */}
        {activeTab === 'push' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="liquid-glass p-4 rounded-2xl space-y-3 border border-purple-500/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📢</span> Nadawanie Baneru Push dla Wszystkich Użytkowników
                </h3>
                {globalPushBanner && (
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                    AKTYWNY BANER
                  </span>
                )}
              </div>

              <p className="text-xs txt-sub leading-relaxed">
                Wpisany komunikat pojawi się na samej górze aplikacji na żywo u każdego biegacza. Użyj go do promowania nowych butów z linkiem afiliacyjnym, nowości Pandy lub wydarzeń!
              </p>

              <div>
                <label className="text-[10px] txt-muted block mb-1 font-bold">Treść komunikatu Push</label>
                <textarea
                  rows={3}
                  value={pushText}
                  onChange={(e) => setPushText(e.target.value)}
                  placeholder="np. 🔥 Nowa kolekcja karbonowych butów dla Pandy już w sklepie! Sprawdź oferty..."
                  className="w-full p-3 rounded-xl liquid-pill text-xs txt-main font-bold border border-white/10"
                />
              </div>

              {/* Live Preview */}
              <div>
                <span className="text-[10px] txt-muted block mb-1 font-bold uppercase">
                  Podgląd na Żywo u Gracza:
                </span>
                <div className="liquid-glass p-3 rounded-xl border border-purple-500/50 bg-purple-500/10 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📢</span>
                    <span className="text-xs font-bold text-white">
                      {pushText || 'Brak wpisanego komunikatu...'}
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-bold shrink-0">Baza 2027</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPushText('');
                    onSetGlobalPushBanner(null);
                    showToast('Wyczyszczono powiadomienie Push.');
                  }}
                  className="py-2.5 rounded-xl liquid-pill text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                >
                  Usuń Baner
                </button>
                <button
                  type="button"
                  onClick={handleSavePushBanner}
                  className="py-2.5 rounded-xl accent-bg text-black text-xs font-black uppercase tracking-wider shadow-lg active:scale-98 transition-all"
                >
                  🚀 Wyślij Push Baner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-ios">
            <div className="liquid-glass w-full max-w-sm p-6 space-y-4 border border-rose-500/50 rounded-3xl text-center shadow-2xl animate-ios-modal">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-3xl border border-rose-500/30">
                🗑️
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-400 uppercase tracking-wider">
                  Usuń Użytkownika z Bazy
                </h4>
                <p className="text-xs txt-sub mt-2 leading-relaxed">
                  Czy na pewno chcesz bezpowrotnie usunąć konto gracza <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email}) oraz wszystkie powiązane z nim biegi i dane?
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-left space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Łączny kilometraż:</span>
                    <strong className="text-emerald-400">{userToDelete.totalKm} km</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Liczba biegów:</span>
                    <strong className="text-sky-400">{userToDelete.runsCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Pary butów:</span>
                    <strong className="text-amber-400">{userToDelete.shoes.length}</strong>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={() => setUserToDelete(null)}
                  className="py-2.5 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white transition-all active:scale-95"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={handleDeleteUserConfirm}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {isDeletingUser ? 'Usuwanie...' : 'Tak, usuń trwale'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
