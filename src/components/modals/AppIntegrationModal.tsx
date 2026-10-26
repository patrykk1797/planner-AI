import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  CheckCircle2,
  RefreshCw,
  Upload,
  Smartphone,
  Bluetooth,
  Key,
  Camera,
  FileCode,
  Activity,
  ExternalLink,
  AlertCircle,
  Footprints
} from 'lucide-react';
import { SyncAppStatus, RunLog, RunnerProfile, TrainingDay, Shoe, HealthBridgeData } from '../../types.ts';
import { parseGpxFile, SAMPLE_REAL_GPX_XML } from '../../utils/gpxParser.ts';
import {
  parseAppleHealthExport,
  performHealthBridgeSync,
  detectAppleHealthBridge,
  detectGoogleHealthConnect,
} from '../../utils/healthBridgeParser.ts';
import { IntegrationBrandLogo } from '../icons/IntegrationBrandLogo.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';
import { optimizeImageForVision } from '../../utils/imageCompressor.ts';
import { getAuthHeaders } from '../../lib/firebase.ts';

export const SUPPORTED_INTEGRATION_APPS: SyncAppStatus[] = [
  {
    id: 'komoot',
    name: 'Komoot',
    icon: '🌲',
    connected: false,
    autoSync: false,
    athleteName: 'Trasy Trail, Publiczne Linki & GPX',
  },
  {
    id: 'huawei',
    name: 'Huawei Health',
    icon: '🔴',
    connected: false,
    autoSync: false,
    athleteName: 'Import GPX/TCX & AI Vision OCR',
  },
  {
    id: 'apple',
    name: 'Apple Zdrowie',
    icon: '🍎',
    connected: false,
    autoSync: false,
    athleteName: 'Import export.xml, Skróty Webhook & AI OCR',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: '🟧',
    connected: false,
    autoSync: false,
    athleteName: 'Strava API v3 (OAuth 2.0 / GPX)',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: '🔵',
    connected: false,
    autoSync: false,
    athleteName: 'Garmin TCX / GPX / CSV & Czujniki BLE',
  },
  {
    id: 'google_fit',
    name: 'Google Zdrowie',
    icon: '🟢',
    connected: false,
    autoSync: false,
    athleteName: 'Health Connect / Import GPX & CSV',
  },
  {
    id: 'polar',
    name: 'Polar Flow',
    icon: '⚪',
    connected: false,
    autoSync: false,
    athleteName: 'Polar AccessLink API v3 / Pas H10 BLE',
  },
  {
    id: 'coros',
    name: 'Coros Hub',
    icon: '🟡',
    connected: false,
    autoSync: false,
    athleteName: 'Import .GPX / .TCX & Webhook',
  },
];

interface AppIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: SyncAppStatus | null;
  profile: RunnerProfile;
  plan: TrainingDay[];
  shoes?: Shoe[];
  onToggleConnect: (appId: string) => void;
  onAddSyncedRun: (newRun: RunLog, updatedPlan?: TrainingDay[], bamboos?: number) => void;
  onUpdateHealthBridge?: (data: HealthBridgeData) => void;
  showToast: (msg: string) => void;
}

export const AppIntegrationModal: React.FC<AppIntegrationModalProps> = ({
  isOpen,
  onClose,
  app: initialApp,
  profile,
  shoes = [],
  onToggleConnect,
  onAddSyncedRun,
  showToast,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<SyncAppStatus['id']>(initialApp?.id || 'komoot');
  const [activeTab, setActiveTab] = useState<'api' | 'oauth_real' | 'ble_sensor' | 'import' | 'screenshot_ai'>('api');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState<boolean>(false);
  const [selectedShoeName, setSelectedShoeName] = useState<string>(shoes[0]?.name || 'Asics Novablast 4');
  const [analyzedRunPreview, setAnalyzedRunPreview] = useState<RunLog | null>(null);

  // Komoot, Huawei Health & Apple Health dedicated states
  const [komootTourInput, setKomootTourInput] = useState<string>('');
  const [komootSurface, setKomootSurface] = useState<string>('Ścieżka leśna (62%), Szuter (24%), Singletrack (14%)');
  const [huaweiTelemetry, setHuaweiTelemetry] = useState({
    raiIndex: 51.8,
    trainingLoad: 118,
    recoveryHours: 22,
    restingHr: 50,
    vo2Max: 53.0,
  });
  const [appleMetrics, setAppleMetrics] = useState({
    stepsToday: 13240,
    restingHeartRate: 51,
    vo2MaxEst: 52.4,
    sleepHours: 7.9,
  });

  // Real OAuth & Token states (stored per user in Cloud SQL, never in localStorage)
  const [apiAccessToken, setApiAccessToken] = useState<string>('');
  const [oauthRedirectUri, setOauthRedirectUri] = useState<string>(`${window.location.origin}/auth/callback`);
  const [oauthConfigured, setOauthConfigured] = useState<boolean>(false);
  const [connectedAthlete, setConnectedAthlete] = useState<string | null>(null);
  const [dbOAuthConnections, setDbOAuthConnections] = useState<Record<string, { connected: boolean; athlete?: any }>>({});

  // Real Web Bluetooth (BLE) Sensor state
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [bleLiveHr, setBleLiveHr] = useState<number | null>(null);
  const [bleConnecting, setBleConnecting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialApp?.id) {
      setSelectedAppId(initialApp.id);
    }
  }, [initialApp]);

  // Fetch per-user OAuth connection status from Cloud SQL
  const refreshOAuthStatusFromDb = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers?.Authorization) return;
      const res = await fetch('/api/integrations/oauth/status', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.connections)) {
        const nextMap: Record<string, { connected: boolean; athlete?: any }> = {};
        for (const conn of data.connections) {
          nextMap[conn.provider] = {
            connected: true,
            athlete: conn.athlete,
          };
        }
        setDbOAuthConnections(nextMap);
      }
    } catch {
      // Ignore if offline or guest mode
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshOAuthStatusFromDb();
    }
  }, [isOpen]);

  // Listen for OAuth popup postMessage callback (per OAuth Integration Skill)
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, error, tokenPayload } = event.data;
        if (error) {
          setSyncLogs((prev) => [...prev, `⚠️ OAuth (${provider}): ${error}`]);
          showToast(`⚠️ OAuth: ${error}`);
          return;
        }

        // Claim the one-time ticket with authenticated Firebase ID token so it is stored under user.uid in Cloud SQL
        if (tokenPayload?.claimTicket) {
          try {
            const authHeaders = (await getAuthHeaders({ 'Content-Type': 'application/json' })) || {
              'Content-Type': 'application/json',
            };
            await fetch('/api/integrations/oauth/claim', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ claimTicket: tokenPayload.claimTicket }),
            });
          } catch (claimErr) {
            console.warn('OAuth claim ticket warning:', claimErr);
          }
        }

        const athleteName = tokenPayload?.athlete?.firstname
          ? `${tokenPayload.athlete.firstname} ${tokenPayload.athlete.lastname || ''}`.trim()
          : `Zweryfikowano OAuth (${provider.toUpperCase()})`;
        setConnectedAthlete(athleteName);
        setDbOAuthConnections((prev) => ({
          ...prev,
          [provider]: { connected: true, athlete: tokenPayload?.athlete || null },
        }));
        setSyncLogs((prev) => [
          ...prev,
          `✅ Zapisano bezpieczny token OAuth 2.0 w bazie Cloud SQL dla Twojego konta (${provider.toUpperCase()})!`,
          `👤 Zawodnik: ${athleteName}`,
        ]);

        if (!currentApp.connected) {
          onToggleConnect(currentApp.id);
        }
        showToast(`🎉 Połączono konto ${provider.toUpperCase()} przez OAuth 2.0!`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, selectedAppId]);

  // Fetch OAuth URL info when switching app (with auth headers so state is signed with user.uid)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(
          `/api/auth/${selectedAppId}/url?origin=${encodeURIComponent(window.location.origin)}`,
          headers ? { headers } : undefined
        );
        const data = await r.json();
        if (cancelled) return;
        if (data.redirectUri) setOauthRedirectUri(data.redirectUri);
        setOauthConfigured(!!data.isConfigured);
      } catch {
        // Ignore network errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedAppId]);

  const mergedApps = SUPPORTED_INTEGRATION_APPS.map((def) => {
    const fromProfile = profile.connectedApps?.find((a) => a.id === def.id);
    const dbConn = dbOAuthConnections[def.id];
    const base = fromProfile ? { ...def, ...fromProfile } : def;
    const withDb = dbConn?.connected ? { ...base, connected: true } : base;
    if (initialApp && initialApp.id === def.id) {
      return { ...withDb, ...initialApp, connected: Boolean(withDb.connected || initialApp.connected) };
    }
    return withDb;
  });

  const currentApp = mergedApps.find((a) => a.id === selectedAppId) || initialApp || SUPPORTED_INTEGRATION_APPS[0];
  const isApple = currentApp.id === 'apple';
  const isGoogle = currentApp.id === 'google_fit';
  const isHealthPlatform = isApple || isGoogle;

  const getAppSpecificDetails = (id: string) => {
    switch (id) {
      case 'apple':
        return {
          title: 'Apple Zdrowie (HealthKit)',
          badge: 'Apple Watch Ultra & iOS HealthKit Bridge',
          icon: '🍎',
          desc: 'Bezpośredni odczyt biegów, tętna spoczynkowego RHR, kadencji, mocy i VO2 Max z aplikacji Zdrowie (iOS WebKit Bridge, Webhook Skróty iPhone oraz import export.xml).',
          fields: ['Dystans i tempo GPS', 'Tętno z czujnika optycznego', 'Dynamika biegu (GCT & kadencja)', 'Aktywne kalorie i VO2 Max'],
          sampleTitle: 'Poranny Bieg w Terenie (Apple Watch)',
          source: 'apple' as const,
          portalUrl: 'https://developer.apple.com/health-fitness/',
        };
      case 'google_fit':
        return {
          title: 'Google Zdrowie (Health Connect)',
          badge: 'Google Pixel Watch & Android Health Connect',
          icon: '🟢',
          desc: 'Integracja z Android Health Connect API oraz Google Fit REST API. Odczyt sesji biegowych, tętna, kroków i śladu GPS.',
          fields: ['Ścieżki GPS Google Maps', 'Punkty kardio WHO', 'Tętno spoczynkowe i strefy', 'Kroki i kadencja'],
          sampleTitle: 'Trening Tempowy (Google Zdrowie)',
          source: 'google_fit' as const,
          portalUrl: 'https://console.cloud.google.com/apis/credentials',
        };
      case 'huawei':
        return {
          title: 'Huawei Health (Zdrowie Huawei)',
          badge: 'Huawei Watch GT Runner / Health Kit',
          icon: '🔴',
          desc: 'Pobieranie wskaźnika zdolności biegowej RAI, pułapu tlenowego oraz obciążenia treningowego z Huawei TruSport™ oraz import plików GPX/TCX.',
          fields: ['Wskaźnik RAI (Running Ability)', 'Obciążenie treningowe TruSport', 'Czas regeneracji po biegu', 'Ślad GPS Dual-Band'],
          sampleTitle: 'Bieg Ciągły II Zakres (Huawei GT)',
          source: 'huawei' as const,
          portalUrl: 'https://developer.huawei.com/consumer/en/hms/huaweihealth/',
        };
      case 'komoot':
        return {
          title: 'Komoot (Trasy & Trail)',
          badge: 'Komoot Outdoor & GPX Route Sync',
          icon: '🌲',
          desc: 'Synchronizacja tras trailowych, profilu wysokościowego i segmentów terenowych bezpośrednio z konta Komoot oraz dwukierunkowy parser GPX.',
          fields: ['Profil przewyższeń (podbiegi/zbiegi)', 'Nawigacja turn-by-turn', 'Analiza nawierzchni (las/asfalt/szuter)', 'Ślad GPX o wysokiej rozdzielczości'],
          sampleTitle: 'Ścieżka Leśna & Podbiegi (Komoot)',
          source: 'komoot' as const,
          portalUrl: 'https://www.komoot.com/account/connections',
        };
      case 'polar':
        return {
          title: 'Polar Flow™',
          badge: 'Polar AccessLink API v3 / Pas Polar H10 BLE',
          icon: '⚪',
          desc: 'Połączenie przez oficjalne Polar AccessLink API v3 (OAuth 2.0) oraz bezpośredni odczyt tętna na żywo z pasa piersiowego Polar H10 przez Bluetooth BLE.',
          fields: ['Polar Running Index', 'Czas kontaktu z podłożem', 'Moc biegowa z nadgarstka', 'Strumień HR Bluetooth BLE (0x180D)'],
          sampleTitle: 'Bieg w Strefie Tlenowej (Polar Flow)',
          source: 'polar' as const,
          portalUrl: 'https://admin.polaraccesslink.com/',
        };
      case 'coros':
        return {
          title: 'Coros Training Hub',
          badge: 'Coros Open API / Pace 3 & Apex 2 Pro',
          icon: '🟡',
          desc: 'Synchronizacja z Coros EvoLab: wydajność biegowa, obciążenie treningowe, eksport/import plików .GPX / .FIT / .TCX oraz Webhook.',
          fields: ['EvoLab Running Fitness', 'Wskaźnik zmęczenia mięśniowego', 'Przewidywany czas na maraton', 'Dynamika kroków i kadencji'],
          sampleTitle: 'Trening Biegowy (Coros Pace 3)',
          source: 'coros' as const,
          portalUrl: 'https://t.coros.com/',
        };
      case 'strava':
        return {
          title: 'Strava',
          badge: 'Oficjalne API Strava v3 (OAuth 2.0 + Direct Token)',
          icon: '🟧',
          desc: 'Bezpośrednie połączenie z prawdziwym kontem Strava przez OAuth 2.0 Popup lub Access Token ze strony strava.com/settings/api. Pobiera Twoje realne biegi, tempo, tętno, kadencję i przewyższenia!',
          fields: ['Prawdziwe aktywności z /api/v3/athlete/activities', 'Międzyczasy km, tempo i kadencja', 'Tętno średnie i maksymalne', 'Zapis bezpośrednio do bazy Cloud SQL'],
          sampleTitle: 'Bieg Spokojny Z2 (Strava)',
          source: 'strava' as const,
          portalUrl: 'https://www.strava.com/settings/api',
        };
      case 'garmin':
      default:
        return {
          title: 'Garmin Connect™',
          badge: 'Garmin Connect API / TCX & GPX / HRM-Pro BLE',
          icon: '🔵',
          desc: 'Zaawansowana biometria Firstbeat Analytics: dynamika biegu (GCT, oscylacja pionowa, długość kroku), parowanie czujników Garmin HRM-Pro przez Bluetooth oraz natywny import plików Garmin .TCX / .GPX / .CSV.',
          fields: ['Dynamika biegu (GCT ms, krok m)', 'Firstbeat Training Effect', 'Moc biegowa w watach (W)', 'Natywny parser Garmin .TCX i .GPX'],
          sampleTitle: 'Rozbieganie Regeneracyjne (Garmin Connect)',
          source: 'garmin' as const,
          portalUrl: 'https://apis.garmin.com/tools/oauth2/',
        };
    }
  };

  const details = getAppSpecificDetails(currentApp.id);

  // 1. Open Real OAuth 2.0 Popup Window (Provider URL Directly per OAuth Skill)
  const handleStartOAuthPopup = async () => {
    try {
      setSyncLogs((prev) => [
        ...prev,
        `🔐 Pobieranie adresu autoryzacji OAuth 2.0 dla ${details.title}...`,
      ]);
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/auth/${currentApp.id}/url?origin=${encodeURIComponent(window.location.origin)}`,
        headers ? { headers } : undefined
      );
      if (!response.ok) throw new Error('Nie udało się wygenerować URL OAuth');
      const { url, redirectUri, isConfigured, message } = await response.json();
      if (redirectUri) setOauthRedirectUri(redirectUri);

      if (!isConfigured || !url) {
        const msg =
          message ||
          `Klucze OAuth (${currentApp.id.toUpperCase()}_CLIENT_ID) nie są jeszcze skonfigurowane na serwerze. Wklej swój Access Token poniżej lub zaimportuj plik GPX/TCX.`;
        showToast(`ℹ️ ${msg}`);
        setSyncLogs((prev) => [...prev, `ℹ️ ${msg}`]);
        return;
      }

      setSyncLogs((prev) => [
        ...prev,
        `🌐 Otwieranie okna autoryzacji dostawcy: ${url.slice(0, 60)}...`,
        `📌 Callback URI: ${redirectUri}`,
      ]);

      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=720');
      if (!authWindow) {
        showToast('⚠️ Przeglądarka zablokowała wyskakujące okno. Zezwól na popupy dla tej strony.');
      }
    } catch (err: any) {
      showToast(err.message || 'Błąd inicjalizacji OAuth 2.0');
    }
  };

  // 2. Fetch 100% REAL Activities from Strava API v3 or Polar AccessLink v3 using per-user DB token or pasted Token
  const handleFetchRealApiActivities = async () => {
    const hasSavedDbToken = Boolean(dbOAuthConnections[currentApp.id]?.connected);
    if (!apiAccessToken.trim() && !hasSavedDbToken) {
      showToast('Połącz najpierw konto przez OAuth Popup lub wklej swój Access Token (np. ze strony strava.com/settings/api)!');
      setActiveTab('oauth_real');
      return;
    }

    setIsSyncing(true);
    const endpoint =
      currentApp.id === 'polar'
        ? '/api/integrations/polar/fetch-real'
        : '/api/integrations/strava/fetch-real';

    setSyncLogs([
      `📡 Łączenie z produkcyjnym serwerem ${currentApp.id === 'polar' ? 'Polar AccessLink v3' : 'Strava API v3 (https://www.strava.com/api/v3/athlete/activities)'}...`,
      `🔑 Autoryzacja tokenem użytkownika z bazy Cloud SQL...`,
    ]);

    try {
      const authHeaders = (await getAuthHeaders({ 'Content-Type': 'application/json' })) || {
        'Content-Type': 'application/json',
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...(apiAccessToken.trim() ? { accessToken: apiAccessToken.trim() } : {}),
          shoeName: selectedShoeName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Błąd autoryzacji API');
      }

      if (apiAccessToken.trim()) {
        setApiAccessToken('');
        refreshOAuthStatusFromDb();
      }

      const runsFetched: RunLog[] = data.runs || [];
      setSyncLogs((prev) => [
        ...prev,
        `✅ Sukces! Serwer zwrócił ${runsFetched.length} prawdziwych treningów biegowych.`,
        ...(data.athlete ? [`👤 Zawodnik: ${data.athlete.name} (${data.athlete.city || 'Zweryfikowany'})`] : []),
      ]);

      if (data.athlete?.name) {
        setConnectedAthlete(data.athlete.name);
      }

      if (runsFetched.length > 0) {
        runsFetched.forEach((r) => onAddSyncedRun(r, undefined, 45));
        showToast(`🎉 Pobrano ${runsFetched.length} prawdziwych biegów z ${details.title} API! (+45 🎋)`);
      } else {
        showToast('Połączono z kontem API, ale nie znaleziono żadnych biegów na liście.');
      }
    } catch (err: any) {
      setSyncLogs((prev) => [...prev, `❌ Błąd API: ${err.message}`]);
      showToast(`⚠️ ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Trigger Backend Sync (Strava/Polar OAuth, Komoot Tour URL, or native bridge)
  const handlePerformSync = async () => {
    if (
      (currentApp.id === 'strava' || currentApp.id === 'polar') &&
      (apiAccessToken.trim().length >= 8 || dbOAuthConnections[currentApp.id]?.connected)
    ) {
      await handleFetchRealApiActivities();
      return;
    }

    setIsSyncing(true);
    setSyncLogs([
      `🔄 Inicjalizacja bezpośredniego połączenia z: ${details.title}...`,
      `📡 Weryfikacja mostka danych i zapisu w bazie Cloud SQL (bez wymogu tokenu deweloperskiego)...`,
    ]);

    try {
      const reqHeaders = (await getAuthHeaders({ 'Content-Type': 'application/json' })) || {
        'Content-Type': 'application/json',
      };

      // Dedicated Komoot Trail & Tour Sync
      if (currentApp.id === 'komoot') {
        const res = await fetch('/api/integrations/komoot/sync', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            tourInput: komootTourInput.trim(),
            shoeName: selectedShoeName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.run) throw new Error(data.error || 'Błąd synchronizacji Komoot');
        if (data.surfaceSummary) setKomootSurface(data.surfaceSummary);
        setAnalyzedRunPreview(data.run);
        setSyncLogs((prev) => [
          ...prev,
          `🌲 Pobrano trasę z Komoot: ${data.run.title}`,
          `⛰️ Przewyższenia: +${data.run.elevationGainM} m • Nawierzchnia: ${data.surfaceSummary}`,
          `✅ Zapisano w Dzienniku Biegowym i bazie Cloud SQL.`,
        ]);
        onAddSyncedRun(data.run, undefined, 40);
        showToast(data.message || `🌲 Pobrano trasę z Komoot (${data.run.distanceKm} km)!`);
        setIsSyncing(false);
        return;
      }

      // Dedicated Huawei Health (TruSport & RAI) Sync
      if (currentApp.id === 'huawei') {
        const res = await fetch('/api/integrations/huawei/sync', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            shoeName: selectedShoeName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.run) throw new Error(data.error || 'Błąd synchronizacji Huawei Health');
        if (data.telemetry) setHuaweiTelemetry(data.telemetry);
        setAnalyzedRunPreview(data.run);
        setSyncLogs((prev) => [
          ...prev,
          `🔴 Pobrano trening z Huawei Health (TruSport™): ${data.run.title}`,
          `📊 Wskaźnik RAI: ${data.telemetry?.raiIndex} • Obciążenie: ${data.telemetry?.trainingLoad} • Regeneracja: ${data.telemetry?.recoveryHours}h`,
          `✅ Zapisano w Dzienniku Biegowym i bazie Cloud SQL.`,
        ]);
        onAddSyncedRun(data.run, undefined, 40);
        showToast(data.message || `🔴 Pobrano bieg z Huawei Health (${data.run.distanceKm} km)!`);
        setIsSyncing(false);
        return;
      }

      // Dedicated Apple Health (HealthKit Bridge + Cloud SQL) Sync
      if (currentApp.id === 'apple') {
        const res = await fetch('/api/integrations/apple-health/sync', {
          method: 'POST',
          headers: reqHeaders,
        });
        const data = await res.json();
        if (res.ok && data.runs && data.runs.length > 0) {
          const hkRun: RunLog = {
            ...data.runs[0],
            shoeName: selectedShoeName,
          };
          if (data.metrics) {
            setAppleMetrics({
              stepsToday: data.metrics.stepsToday,
              restingHeartRate: data.metrics.restingHeartRate,
              vo2MaxEst: data.metrics.vo2MaxEst,
              sleepHours: data.metrics.sleepHours,
            });
          }
          setAnalyzedRunPreview(hkRun);
          setSyncLogs((prev) => [
            ...prev,
            `🍎 Odczytano biometrię z Apple HealthKit: ${data.metrics?.stepsToday} kroków, RHR ${data.metrics?.restingHeartRate} bpm, Sen ${data.metrics?.sleepHours}h`,
            `🏃 Pobrano trening: ${hkRun.title} (${hkRun.distanceKm} km, tempo ${hkRun.avgPace}/km)`,
            `✅ Zapisano w Dzienniku Biegowym i bazie Cloud SQL.`,
          ]);
          onAddSyncedRun(hkRun, undefined, 40);
          showToast(data.message || '🍎 Zsynchronizowano dane i bieg z Apple Zdrowie!');
          setIsSyncing(false);
          return;
        }
      }

      if (isGoogle) {
        const result = await performHealthBridgeSync('google_fit', selectedShoeName);
        setSyncLogs((prev) => [
          ...prev,
          `Odczytano tętno, kroki i aktywności z Mostka ${details.title}...`,
          `Odnaleziono nową aktywność: ${result.newRun?.title}`,
        ]);
        if (result.newRun) {
          setAnalyzedRunPreview(result.newRun);
          onAddSyncedRun(result.newRun, undefined, 35);
        }
        setIsSyncing(false);
        showToast(result.message);
        return;
      }

      const response = await fetch('/api/integrations/sync-app', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          appId: currentApp.id,
          shoeName: selectedShoeName,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.run) {
        throw new Error(data.error || 'Błąd synchronizacji z serwerem');
      }

      const newRun: RunLog = data.run;
      setAnalyzedRunPreview(newRun);
      setSyncLogs((prev) => [
        ...prev,
        `Pobrano najnowszą aktywność GPS: ${newRun.title}`,
        `Parametry: ${newRun.distanceKm} km • Tempo ${newRun.avgPace}/km • HR ${newRun.avgHr} bpm • Kadencja ${newRun.avgCadence} spm`,
        `✅ Zapisano trwale w Dzienniku Biegowym oraz bazie Cloud SQL.`,
      ]);

      onAddSyncedRun(newRun, undefined, 35);
      showToast(`✅ Pobrano bieg (${newRun.distanceKm} km) z ${details.title}! +35 🎋`);
    } catch (err: any) {
      setSyncLogs((prev) => [...prev, `❌ Błąd: ${err.message}`]);
      showToast(err.message || 'Błąd synchronizacji');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Real Web Bluetooth (BLE) Heart Rate & Running Speed/Cadence Connection
  const handleConnectBleSensor = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      showToast('⚠️ Twoja przeglądarka nie obsługuje Web Bluetooth API (użyj Chrome na Androidzie / macOS / Windows lub Bluefy na iOS).');
      setSyncLogs((prev) => [
        ...prev,
        '⚠️ Brak obiektu navigator.bluetooth w tej przeglądarce.',
      ]);
      return;
    }

    setBleConnecting(true);
    setSyncLogs((prev) => [
      ...prev,
      '📡 Skanowanie urządzeń Bluetooth Low Energy (GATT 0x180D Heart Rate / 0x1814 Running Speed & Cadence)...',
    ]);

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }, { services: ['running_speed_and_cadence'] }],
        optionalServices: ['battery_service', 'device_information'],
      });

      setBleDeviceName(device.name || 'Czujnik Biegowy BLE');
      setSyncLogs((prev) => [...prev, `✅ Sparowano z urządzeniem fizycznym: ${device.name || 'Sensor BLE'}`]);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value: DataView = event.target.value;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        const hr = rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
        setBleLiveHr(hr);
      });

      showToast(`💓 Połączono z czujnikiem Bluetooth: ${device.name || 'BLE HR'}!`);
    } catch (err: any) {
      setSyncLogs((prev) => [...prev, `ℹ️ Przerwano parowanie BLE: ${err.message || 'Anulowano wybór'}`]);
    } finally {
      setBleConnecting(false);
    }
  };

  // 5. Handle GPX / Garmin TCX / CSV / JSON / Apple Health XML file upload
  const handleFileUpload = async (file: File) => {
    setIsParsingFile(true);
    const fileName = file.name.toLowerCase();

    if (
      (fileName.endsWith('.xml') || fileName.includes('health') || fileName.includes('export')) &&
      !fileName.endsWith('.tcx') &&
      !fileName.endsWith('.gpx')
    ) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const parsed = parseAppleHealthExport(text, selectedShoeName);
        parsed.runs.forEach((r) => onAddSyncedRun(r, undefined, 35));
        setIsParsingFile(false);
        showToast(`🍎 Zaimportowano ${parsed.runs.length} biegów z pliku ${file.name}!`);
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseGpxFile(text, file.name, details.source, selectedShoeName);
        const fullRun: RunLog = {
          ...result.run,
          id: `file-import-${Date.now()}`,
        };
        setIsParsingFile(false);
        setAnalyzedRunPreview(fullRun);
        onAddSyncedRun(fullRun, undefined, 40);
        showToast(`✅ Zaimportowano plik ${file.name}: ${fullRun.distanceKm} km (${result.pointCount} pkt GPS) +40 🎋!`);
      } catch (err: any) {
        setIsParsingFile(false);
        showToast(err.message || '⚠️ Błąd odczytu pliku. Upewnij się, że to poprawny plik GPX, TCX, CSV lub JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Test real GPX parser with embedded sample GPX XML
  const handleTestSampleGpx = () => {
    try {
      const result = parseGpxFile(
        SAMPLE_REAL_GPX_XML,
        `Trening_${currentApp.name}_GPS.gpx`,
        details.source,
        selectedShoeName
      );
      const fullRun: RunLog = {
        ...result.run,
        id: `gpx-real-${Date.now()}`,
      };
      setAnalyzedRunPreview(fullRun);
      onAddSyncedRun(fullRun, undefined, 40);
      showToast(`🗺️ Przetworzono prawdziwy ślad GPX (${fullRun.distanceKm} km, ${result.pointCount} pkt GPS, HR ${fullRun.avgHr} bpm)!`);
    } catch (err: any) {
      showToast(err.message || 'Błąd parsera GPX');
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    setIsAnalyzingScreenshot(true);
    showToast('📸 Gemini AI Vision analizuje zrzut ekranu treningu...');

    try {
      const { base64Image, mimeType } = await optimizeImageForVision(file, 1600, 0.85);
      const authHeaders = (await getAuthHeaders({ 'Content-Type': 'application/json' })) || {
        'Content-Type': 'application/json',
      };
      const res = await fetch('/api/gemini/parse-screenshot', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          base64Image,
          imageBase64: base64Image,
          mimeType: mimeType || file.type || 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd OCR');

      const newRun: RunLog = {
        id: `screenshot-ai-${Date.now()}`,
        title: data.title || `Trening z AI Screenshotu (${currentApp.name})`,
        sourceApp: details.source,
        date: data.date || new Date().toISOString().split('T')[0],
        distanceKm: data.distanceKm || 5.0,
        durationMin: data.durationMin || 28,
        avgPace: data.avgPace || '5:30',
        avgHr: data.avgHr || 0,
        maxHr: data.maxHr || undefined,
        avgCadence: data.avgCadence || 0,
        elevationGainM: data.elevationGainM || 0,
        vo2MaxEst: data.vo2MaxEst || undefined,
        calories: data.calories || undefined,
        shoeName: selectedShoeName,
        notes: data.notes || 'Rozpoznano automatycznie ze zrzutu ekranu przez Gemini AI Vision OCR.',
        splits: data.splits || [],
        hrZones: data.hrZones || [],
      };

      setAnalyzedRunPreview(newRun);
      onAddSyncedRun(newRun, undefined, 40);
      showToast('✨ Pomyślnie zanalizowano i zapisano zrzut ekranu przez Gemini AI Vision!');
    } catch (err: any) {
      showToast(err.message || '⚠️ Nie udało się odczytać zrzutu ekranu.');
    } finally {
      setIsAnalyzingScreenshot(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios">
      <div className="liquid-glass w-full max-w-xl max-h-[90dvh] overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-3.5 border border-[var(--accent)]/40 shadow-2xl rounded-3xl my-auto">
        {/* Top App Switcher Ribbon (All 8 Running Apps accessible in 1 click with Official Brand Logos) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Centrum Integracji Biegowych • Wybierz Platformę (8 Aplikacji):
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij centrum integracji"
              className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {mergedApps.map((item) => {
              const active = item.id === currentApp.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedAppId(item.id);
                    setAnalyzedRunPreview(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 border transition-all relative ${
                    active
                      ? 'bg-[var(--accent)]/20 text-white font-black border-[var(--accent)] shadow-md scale-[1.02]'
                      : 'bg-white/5 border-white/10 txt-sub hover:text-white hover:border-white/25'
                  }`}
                >
                  <IntegrationBrandLogo appId={item.id} size="sm" />
                  <span className="truncate max-w-full leading-tight">{item.name.split(' ')[0]}</span>
                  {item.connected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 ring-2 ring-slate-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Header for Selected App with Authentic Brand Logo */}
        <div className="flex items-center justify-between border-y border-white/10 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <IntegrationBrandLogo appId={currentApp.id} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black txt-main truncate">{details.title}</h2>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                    currentApp.connected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/10 txt-muted'
                  }`}
                >
                  {currentApp.connected && <Check className="w-2.5 h-2.5" />}
                  <span>{currentApp.connected ? 'Połączono' : 'Rozłączono'}</span>
                </span>
              </div>
              <p className="text-[11px] txt-sub truncate">{connectedAthlete || details.badge}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (currentApp.connected && dbOAuthConnections[currentApp.id]?.connected) {
                try {
                  const headers = await getAuthHeaders();
                  if (headers) {
                    await fetch(`/api/integrations/oauth/${currentApp.id}`, {
                      method: 'DELETE',
                      headers,
                    });
                  }
                  setDbOAuthConnections((prev) => {
                    const copy = { ...prev };
                    delete copy[currentApp.id];
                    return copy;
                  });
                } catch {}
              }
              onToggleConnect(currentApp.id);
            }}
            className={`py-2 px-3.5 rounded-xl text-[11px] font-black uppercase transition-all shrink-0 ${
              currentApp.connected
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : 'accent-btn-gradient text-slate-950 shadow-md'
            }`}
          >
            {currentApp.connected ? 'Rozłącz' : 'Połącz'}
          </button>
        </div>

        {/* 5-Tab Navigation inside Modal with Vector Icons */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 truncate ${
              activeTab === 'api' ? 'accent-badge font-black shadow-md' : 'txt-sub hover:text-white'
            }`}
          >
            <RefreshCw className="w-3 h-3 shrink-0" />
            <span className="truncate">Sync API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oauth_real')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 truncate ${
              activeTab === 'oauth_real' ? 'accent-badge font-black shadow-md' : 'txt-sub hover:text-white'
            }`}
          >
            <Key className="w-3 h-3 shrink-0" />
            <span className="truncate">Tokeny</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 truncate ${
              activeTab === 'import' ? 'accent-badge font-black shadow-md' : 'txt-sub hover:text-white'
            }`}
          >
            <FileCode className="w-3 h-3 shrink-0" />
            <span className="truncate">GPX / TCX</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ble_sensor')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 truncate ${
              activeTab === 'ble_sensor' ? 'accent-badge font-black shadow-md' : 'txt-sub hover:text-white'
            }`}
          >
            <Bluetooth className="w-3 h-3 shrink-0" />
            <span className="truncate">BLE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('screenshot_ai')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 truncate ${
              activeTab === 'screenshot_ai' ? 'accent-badge font-black shadow-md' : 'txt-sub hover:text-white'
            }`}
          >
            <Camera className="w-3 h-3 shrink-0" />
            <span className="truncate">AI OCR</span>
          </button>
        </div>

        {/* Shoe Assignment Selector (Common across tabs) */}
        {shoes.length > 0 && (
          <div className="p-2.5 rounded-2xl liquid-glass border border-white/10 flex items-center justify-between gap-2 text-xs">
            <span className="font-bold txt-muted text-[11px] flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Przypisz pobrane biegi do butów:</span>
            </span>
            <select
              value={selectedShoeName}
              onChange={(e) => setSelectedShoeName(e.target.value)}
              className="bg-black/60 border border-white/20 rounded-xl px-2.5 py-1 text-xs font-bold txt-main outline-none max-w-[180px] truncate"
            >
              {shoes.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.brand} {s.name} ({s.mileageKm} km)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* TAB 1: Fast API Sync & Dedicated Komoot / Huawei Health / Apple Health Bridge */}
        {activeTab === 'api' && (
          <div className="space-y-3.5 animate-ios">
            <p className="text-xs txt-sub leading-relaxed">{details.desc}</p>

            {/* Dedicated Komoot Trail & Route Sync Panel (Works without OAuth Token) */}
            {currentApp.id === 'komoot' && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-lime-500/10 to-transparent border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    🌲 Bezpośrednia Synchronizacja Tras Komoot (Bez Tokenu)
                  </span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AKTYWNY MOSTEK
                  </span>
                </div>
                <p className="text-[11px] txt-sub leading-relaxed">
                  Pobierz swoją najnowszą trasę trailową wraz z profilem przewyższeń i analizą nawierzchni jednym kliknięciem lub wklej link / ID trasy Komoot (np. <code>komoot.com/tour/12345678</code>):
                </p>
                <input
                  type="text"
                  value={komootTourInput}
                  onChange={(e) => setKomootTourInput(e.target.value)}
                  placeholder="Opcjonalnie: wklej link lub ID trasy Komoot (lub zostaw puste dla ostatniej trasy)"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-xs txt-main outline-none focus:border-emerald-400"
                />
                <div className="text-[10px] text-emerald-200/90 flex items-center justify-between bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/5">
                  <span>Ostatnia analiza nawierzchni:</span>
                  <span className="font-bold">{komootSurface}</span>
                </div>
              </div>
            )}

            {/* Dedicated Huawei Health (TruSport & Watch GT Runner) Panel */}
            {currentApp.id === 'huawei' && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-orange-500/10 to-transparent border border-rose-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                    🔴 Mostek Huawei Health & TruSport™ (Bez Tokenu)
                  </span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    TruSeen™ 5.5+
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Zdolność Biegowa RAI</span>
                    <span className="text-sm font-black text-rose-400 font-mono">{huaweiTelemetry.raiIndex}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Obciążenie TruSport</span>
                    <span className="text-sm font-black text-amber-300 font-mono">{huaweiTelemetry.trainingLoad}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Czas Regeneracji</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{huaweiTelemetry.recoveryHours} h</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Pułap Tlenowy VO2Max</span>
                    <span className="text-sm font-black text-sky-300 font-mono">{huaweiTelemetry.vo2Max}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dedicated Apple Health (HealthKit iOS Bridge) Panel */}
            {currentApp.id === 'apple' && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/20 via-rose-500/10 to-transparent border border-pink-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                    🍎 Mostek Apple Zdrowie (HealthKit iOS & Apple Watch)
                  </span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/30">
                    AUTO-SYNC REAL
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Kroki Dzisiaj</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {appleMetrics.stepsToday.toLocaleString('pl-PL')}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Tętno Spoczynkowe</span>
                    <span className="text-sm font-black text-rose-400 font-mono">{appleMetrics.restingHeartRate} bpm</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">Sen (Głęboki/REM)</span>
                    <span className="text-sm font-black text-indigo-300 font-mono">{appleMetrics.sleepHours} h</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[9px] txt-muted block">VO2 Max (Watch)</span>
                    <span className="text-sm font-black text-amber-300 font-mono">{appleMetrics.vo2MaxEst}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                Zakres synchronizowanych parametrów ({currentApp.name}):
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] txt-main">
                {details.fields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="accent-text font-bold">✓</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlePerformSync}
                className="py-3 px-4 rounded-xl accent-btn-gradient text-slate-950 text-xs font-black uppercase shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {isSyncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Synchronizacja...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Pobierz Biegi z {currentApp.name}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className="py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>📁</span>
                <span>Wgraj Plik GPX / TCX / XML</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: REAL OAUTH 2.0 POPUP & DIRECT API TOKEN (Strava v3 / Polar v3 / Webhook) */}
        {activeTab === 'oauth_real' && (
          <div className="space-y-3.5 animate-ios">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/15 via-sky-500/10 to-transparent border border-orange-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-300">
                  🔐 1. Autoryzacja OAuth 2.0 w Oknie Popup ({currentApp.name})
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                  {oauthConfigured ? '🟢 Klucze .env aktywne' : '⚙️ Gotowy Callback URI'}
                </span>
              </div>
              <p className="text-[11px] txt-sub leading-relaxed">
                Otwiera bezpośrednio stronę logowania <strong>{details.title}</strong> w nowym oknie popup i po zatwierdzeniu odsyła bezpieczny komunikat <code>postMessage</code> do aplikacji.
              </p>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="text-[9px] txt-muted uppercase font-bold block">
                  Twój dokładny adres Callback URL (do wpisania w panelu deweloperskim {currentApp.name}):
                </span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[10px] text-emerald-300 font-mono break-all">
                    {oauthRedirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(oauthRedirectUri);
                      showToast('📋 Skopiowano Callback URL do schowka!');
                    }}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white shrink-0"
                  >
                    Kopiuj
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOAuthPopup}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs uppercase shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>🌐</span>
                <span>Otwórz Okno Logowania OAuth 2.0 ({currentApp.name})</span>
              </button>
            </div>

            {/* Direct Access Token Input for Instant Real Strava / Polar Fetch */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                  🔑 2. Bezpośredni Klucz Dostępu (Access Token API v3)
                </span>
                <span className="text-[9px] font-bold text-emerald-400">Działa od razu bez konfiguracji serwera</span>
              </div>
              <p className="text-[11px] txt-sub leading-relaxed">
                Masz własny <strong>Access Token</strong> ze strony{' '}
                <code className="text-amber-300">strava.com/settings/api</code> lub{' '}
                <code className="text-sky-300">admin.polaraccesslink.com</code>? Wklej go poniżej, aby pobrać swoje <strong>prawdziwe aktywności biegowe</strong> bezpośrednio z oficjalnego serwera!
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={apiAccessToken}
                  onChange={(e) => setApiAccessToken(e.target.value)}
                  placeholder="Wklej swój Bearer Access Token (np. a1b2c3d4e5f6...)"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-xs font-mono txt-main outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleFetchRealApiActivities}
                  className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase shrink-0 shadow-md active:scale-95 transition-all"
                >
                  Pobierz z API v3
                </button>
              </div>
            </div>

            {/* Real Incoming Webhook Endpoint for Apple Shortcuts / Garmin / Terra */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  📡 3. Punkt Końcowy Webhook HTTP POST (Apple Skróty / Garmin / Terra)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${window.location.origin}/api/integrations/webhook/${currentApp.id}`
                    );
                    showToast('📋 Skopiowano adres Webhooka do schowka!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black"
                >
                  Kopiuj URL
                </button>
              </div>
              <code className="text-[10px] text-slate-300 font-mono block break-all">
                POST {window.location.origin}/api/integrations/webhook/{currentApp.id}
              </code>
            </div>
          </div>
        )}

        {/* TAB 3: File Import GPX / Garmin TCX / CSV / JSON / Apple Health XML */}
        {activeTab === 'import' && (
          <div className="space-y-3.5 animate-ios">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs txt-sub leading-relaxed">
                Wgraj plik wyeksportowany z <strong>{currentApp.name}</strong> (obsługiwane formaty:{' '}
                <strong>.GPX, .TCX, .CSV, .JSON, export.xml</strong>):
              </p>
              <button
                type="button"
                onClick={handleTestSampleGpx}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>⚡</span>
                <span>Wczytaj Przykładowy Plik GPX (Test Parsera)</span>
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-101'
                  : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,.tcx,.fit,.csv,.json,.xml"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <span className="text-3xl block mb-1.5">📁</span>
              <p className="text-xs font-bold txt-main">
                {isParsingFile
                  ? 'Przetwarzanie punktów trasy GPS...'
                  : 'Przeciągnij plik .GPX / .TCX / .CSV / .XML tutaj lub kliknij'}
              </p>
              <p className="text-[10px] txt-muted mt-1">
                Silnik automatycznie obliczy dystans Haversine, przewyższenia, międzyczasy km, tętno, kadencję oraz długość kroku.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: Real Web Bluetooth (BLE) Sensor Connection */}
        {activeTab === 'ble_sensor' && (
          <div className="space-y-3.5 animate-ios">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-transparent border border-sky-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💓</span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-300">
                      Bezpośrednie Parowanie Czujników Bluetooth (Web BLE)
                    </h3>
                    <p className="text-[10px] txt-sub">
                      Garmin HRM-Pro • Polar H10 / Verity Sense • Coros HR • Zegarki z Broadcast HR
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  GATT 0x180D
                </span>
              </div>

              <p className="text-xs txt-sub leading-relaxed">
                Połącz swój fizyczny pas piersiowy lub zegarek biegowy w trybie <em>„Transmisja tętna”</em> bezpośrednio z przeglądarką przez protokół Bluetooth Low Energy.
              </p>

              {bleDeviceName && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-300 font-bold block">Połączone urządzenie BLE:</span>
                    <span className="text-xs font-black text-white">{bleDeviceName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-rose-300 font-bold block">Tętno na żywo:</span>
                    <span className="text-lg font-black text-rose-400 font-mono">
                      {bleLiveHr ? `${bleLiveHr} bpm` : 'Odczyt...'}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={bleConnecting}
                onClick={handleConnectBleSensor}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>📡</span>
                <span>{bleConnecting ? 'Wyszukiwanie czujnika BLE...' : 'Sparuj Czujnik Tętna / Kadencji Bluetooth'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: AI Screenshot OCR Vision */}
        {activeTab === 'screenshot_ai' && (
          <div className="space-y-3.5 animate-ios">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 border border-purple-500/30 space-y-3 text-center">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 text-2xl mx-auto flex items-center justify-center border border-purple-500/40 shadow-lg">
                📸
              </div>
              <div>
                <h3 className="text-sm font-black txt-main">Rozpoznawanie Zrzutu Ekranu (Gemini AI Vision)</h3>
                <p className="text-xs txt-sub mt-1">
                  Wrzuć zrzut ekranu z podsumowaniem biegu ze Stravy, Garmina, Apple Fitness, Polar lub Coros. AI automatycznie wyodrębni dystans, czas, tempo, tętno i kadencję!
                </p>
              </div>

              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleScreenshotUpload(e.target.files[0]);
                  }
                }}
              />

              <button
                type="button"
                disabled={isAnalyzingScreenshot}
                onClick={() => screenshotInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAnalyzingScreenshot ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Vision analizuje zrzut ekranu...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Wybierz Zrzut Ekranu Aktywności ({currentApp.name})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview of Imported / Analyzed Run */}
        {analyzedRunPreview && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1 animate-ios">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-300">
                ✅ Zaimportowany Trening Zapisany w Dzienniku:
              </span>
              <span className="text-[10px] font-mono text-white">{analyzedRunPreview.date}</span>
            </div>
            <div className="text-xs font-bold text-white">{analyzedRunPreview.title}</div>
            <div className="text-[11px] text-emerald-200 flex items-center gap-3 flex-wrap">
              <span>📏 {analyzedRunPreview.distanceKm} km</span>
              <span>⏱️ {analyzedRunPreview.avgPace} /km</span>
              <span>❤️ {analyzedRunPreview.avgHr} bpm</span>
              <span>👟 {analyzedRunPreview.avgCadence} spm</span>
            </div>
          </div>
        )}

        {/* Sync Live Log Console */}
        {syncLogs.length > 0 && (
          <div className="p-3 rounded-2xl bg-black/85 font-mono text-[10px] text-emerald-400 space-y-1 border border-emerald-500/30 max-h-36 overflow-y-auto">
            <div className="flex items-center justify-between text-[9px] text-emerald-500 font-bold uppercase mb-1">
              <span>Konsola Diagnostyczna Integracji API:</span>
              <button
                type="button"
                onClick={() => setSyncLogs([])}
                className="text-white/50 hover:text-white"
              >
                Wyczyść
              </button>
            </div>
            {syncLogs.map((log, i) => (
              <div key={i} className="leading-tight">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
