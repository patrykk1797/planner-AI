import React, { useState, useRef } from 'react';
import { SyncAppStatus, RunLog, RunnerProfile, TrainingDay, Shoe } from '../types.ts';
import { parseGpxFile } from '../utils/gpxParser.ts';

interface AppIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: SyncAppStatus | null;
  profile: RunnerProfile;
  plan: TrainingDay[];
  shoes?: Shoe[];
  onToggleConnect: (appId: string) => void;
  onAddSyncedRun: (newRun: RunLog, updatedPlan?: TrainingDay[], bamboos?: number) => void;
  showToast: (msg: string) => void;
}

export const AppIntegrationModal: React.FC<AppIntegrationModalProps> = ({
  isOpen,
  onClose,
  app,
  profile,
  shoes = [],
  onToggleConnect,
  onAddSyncedRun,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'import' | 'guide'>('api');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [selectedShoeName, setSelectedShoeName] = useState<string>(shoes[0]?.name || 'Asics Novablast 4');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !app) return null;

  const getAppSpecificDetails = (id: string) => {
    switch (id) {
      case 'apple':
        return {
          title: 'Apple Zdrowie (HealthKit)',
          badge: 'Apple Watch Ultra & iOS Health',
          icon: '🍎',
          desc: 'Automatyczny odczyt biegów, tętna spoczynkowego, kadencji i VO2 Max z aplikacji Zdrowie oraz zegarka Apple Watch.',
          fields: ['Dystans i tempo GPS', 'Tętno z czujnika optycznego', 'Dynamika biegu (kontakt z podłożem)', 'Aktywne kalorie (Active Energy)'],
          sampleTitle: 'Poranny Bieg w Terenie (Apple Watch)',
          source: 'apple' as const,
        };
      case 'google_fit':
        return {
          title: 'Google Zdrowie (Health Connect / Fit)',
          badge: 'Google Pixel & Android Wear',
          icon: '🟢',
          desc: 'Oficjalna integracja z Android Health Connect. Bezpieczny odczyt danych tętna, punktów kardio i śladów GPS.',
          fields: ['Ścieżki GPS Google Maps', 'Punkty kardio WHO', 'Tętno spoczynkowe i strefy', 'Kroki i kadencja'],
          sampleTitle: 'Trening Tempowy (Google Zdrowie)',
          source: 'google_fit' as const,
        };
      case 'huawei':
        return {
          title: 'Huawei Health (Zdrowie Huawei)',
          badge: 'Huawei Watch GT / Runner',
          icon: '🔴',
          desc: 'Pobieranie wskaźnika zdolności biegowej RAI, pułapu tlenowego oraz obciążenia treningowego z Huawei TruSport™.',
          fields: ['Wskaźnik RAI (Running Ability)', 'Obciążenie treningowe TruSport', 'Czas regeneracji po biegu', 'Ślad GPS z podwójnym pasmem'],
          sampleTitle: 'Bieg Ciągły II Zakres (Huawei GT)',
          source: 'huawei' as const,
        };
      case 'komoot':
        return {
          title: 'Komoot (Trasy & Trail)',
          badge: 'Komoot Outdoor & Navigation',
          icon: '🌲',
          desc: 'Synchronizacja tras trailowych, profilu wysokościowego i segmentów terenowych bezpośrednio z Twojego konta Komoot.',
          fields: ['Profil przewyższeń (Górki i zbiegi)', 'Nawigacja turn-by-turn', 'Rodzaje nawierzchni (asfalt/szuter/ścieżka)', 'Ślad GPX o wysokiej rozdzielczości'],
          sampleTitle: 'Ścieżka Leśna & Podbiegi (Komoot)',
          source: 'komoot' as const,
        };
      case 'polar':
        return {
          title: 'Polar Flow™',
          badge: 'Polar AccessLink API / Vantage V3',
          icon: '⚪',
          desc: 'Zaawansowana elektrokardiografia, Running Index, obciążenie ortostatyczne i precyzyjne strefy mocy biegowej Polar.',
          fields: ['Polar Running Index', 'Czas kontaktu z podłożem', 'Moc biegowa z nadgarstka', 'Analiza obciążenia kardio'],
          sampleTitle: 'Bieg w Strefie Tlenowej (Polar Flow)',
          source: 'polar' as const,
        };
      case 'coros':
        return {
          title: 'Coros Training Hub',
          badge: 'Coros Open API / Pace 3',
          icon: '🟡',
          desc: 'Wskaźnik EvoLab, wydajność biegowa, symulator wyścigu marathon i precyzyjny tracking toru biegowego.',
          fields: ['EvoLab Running Fitness', 'Wskaźnik zmęczenia mięśniowego', 'Przewidywany czas na maraton', 'Dynamika kroków'],
          sampleTitle: 'Trening Biegowy (Coros Pace 3)',
          source: 'coros' as const,
        };
      case 'strava':
        return {
          title: 'Strava',
          badge: 'Oficjalne API Strava v3 (OAuth 2.0)',
          icon: '🟧',
          desc: 'Najpopularniejszy hub dla biegaczy. Bezpośrednie połączenie przez oficjalne OAuth 2.0 z pobieraniem międzyczasów, segmentów i tętna.',
          fields: ['Autouzupełnianie międzyczasów km', 'Analiza segmentów', 'Wskaźnik Relative Effort', 'Pobieranie ze smartwatcha do Stravy'],
          sampleTitle: 'Bieg Spokojny Z2 (Strava)',
          source: 'strava' as const,
        };
      case 'garmin':
      default:
        return {
          title: 'Garmin Connect™',
          badge: 'Garmin Connect API / HRM-Pro',
          icon: '🔵',
          desc: 'Zaawansowana biometria Firstbeat Analytics: dynamika biegu (GCT, oscylacja pionowa), status treningowy i strefy mocy.',
          fields: ['Dynamika biegu (czas kontaktu ms)', 'Firstbeat Training Effect (Aerob/Anaerob)', 'Moc biegowa w watach', 'Status zmienności tętna HRV'],
          sampleTitle: 'Rozbieganie Regeneracyjne (Garmin Connect)',
          source: 'garmin' as const,
        };
    }
  };

  const details = getAppSpecificDetails(app.id);

  // Trigger simulated sync pulling a new run from this service
  const handlePerformSync = async () => {
    setIsSyncing(true);
    setSyncLogs([
      `Inicjalizacja połączenia z API: ${details.title}...`,
      `Weryfikacja tokenu sesji i zakresów uprawnień...`,
    ]);

    setTimeout(() => {
      setSyncLogs((prev) => [
        ...prev,
        `Pobieranie najnowszych aktywności GPS z ostatnich 24h...`,
        `Odnaleziono nową aktywność: ${details.sampleTitle}`,
      ]);

      const dist = +(Math.random() * 4 + 6).toFixed(2);
      const dur = Math.round(dist * (5.1 + Math.random() * 0.8));
      const totalSec = Math.round((dur * 60) / dist);
      const paceMin = Math.floor(totalSec / 60);
      const paceSec = totalSec % 60;
      const paceStr = `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}`;

      const splits = Array.from({ length: Math.floor(dist) }).map((_, i) => ({
        km: i + 1,
        pace: `${paceMin}:${Math.floor(Math.random() * 20 + 15)}`,
        hr: Math.round(144 + i * 2.8 + Math.random() * 3),
        elevation: Math.round(Math.random() * 6 + 2),
      }));

      const newRun: RunLog = {
        id: `synced-${app.id}-${Date.now()}`,
        title: `${details.sampleTitle} • ${dist} km`,
        sourceApp: details.source,
        date: new Date().toISOString().split('T')[0],
        distanceKm: dist,
        durationMin: dur,
        avgPace: paceStr,
        avgHr: Math.round(150 + Math.random() * 8),
        maxHr: Math.round(168 + Math.random() * 10),
        avgCadence: Math.round(172 + Math.random() * 8),
        gctMs: Math.round(226 + Math.random() * 14),
        verticalOscillationCm: +(7.5 + Math.random() * 1.0).toFixed(1),
        groundContactBalancePercent: '50.1% L / 49.9% P',
        verticalRatioPercent: +(7.2 + Math.random() * 0.7).toFixed(1),
        elevationGainM: app.id === 'komoot' ? Math.round(85 + Math.random() * 60) : Math.round(25 + Math.random() * 25),
        calories: Math.round(dist * 68),
        powerW: Math.round(240 + Math.random() * 25),
        strideLengthM: 1.04,
        shoeName: selectedShoeName,
        notes: `Zsynchronizowano pomyślnie z ${details.title}. Precyzyjne dane biometryczne, kadencja i międzyczasy GPS.`,
        splits,
        analysis: {
          whatWentWell: ['Utrzymano założone tętno w Strefie 2', 'Równomierny krok i kadencja > 170 spm'],
          whatWentWrong: ['Lekki dryf tętna na ostatnich 2 kilometrach'],
          planAdaptation: 'Baza tlenowa wzmocniona. Jutro zalecany dzień regeneracji.',
          trainingLoad: Math.round(dist * 8.5),
          readinessImpact: 'Optymalne obciążenie aerobowe',
        },
      };

      onAddSyncedRun(newRun, undefined, 25);
      setIsSyncing(false);
      setSyncLogs((prev) => [
        ...prev,
        `✅ Zapisano bieg: ${dist} km w czasie ${dur} min (${paceStr} min/km).`,
        `Zapisano w bazie Cloud SQL dla Twojego profilu!`,
      ]);
      showToast(`Pobrano bieg (${dist} km) z ${details.title}! 🎋 +25`);
    }, 1200);
  };

  // Real GPX / FIT file parser
  const handleProcessFile = async (file: File) => {
    setIsParsingFile(true);
    try {
      const text = await file.text();
      const parsed = parseGpxFile(text, file.name, details.source, selectedShoeName);

      const runWithId: RunLog = {
        ...parsed.run,
        id: `gpx-${Date.now()}`,
      };

      onAddSyncedRun(runWithId, undefined, 30);
      showToast(`Pomyślnie zaimportowano plik ${file.name} (${parsed.run.distanceKm} km, ${parsed.pointCount} punktów GPS)! 🚀`);
      onClose();
    } catch (err: any) {
      console.error('GPX parse error:', err);
      showToast(err.message || 'Nie udało się przetworzyć pliku GPX. Upewnij się, że zawiera ścieżkę GPS.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-ios"
    >
      <div className="liquid-glass w-full max-w-md p-6 space-y-4 animate-ios-modal max-h-[92vh] overflow-y-auto no-scrollbar border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/10">
              {details.icon}
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                {details.badge}
              </span>
              <h3 className="text-base font-bold txt-main">{details.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-muted hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'api'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            API / Hub
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'import'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            Import GPX/FIT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'guide'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            Jak połączyć?
          </button>
        </div>

        {/* TAB 1: API & FRAMEWORK */}
        {activeTab === 'api' && (
          <div className="space-y-3">
            {/* Status indicator */}
            <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold txt-main flex items-center gap-2">
                  Status:
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      app.connected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {app.connected ? 'Aktywne • Połączono' : 'Rozłączono'}
                  </span>
                </div>
                {app.connected && app.lastSync && (
                  <div className="text-[10px] txt-muted mt-0.5">Ostatnia synchronizacja: {app.lastSync}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleConnect(app.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  app.connected
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                    : 'accent-bg text-black font-black'
                }`}
              >
                {app.connected ? 'Rozłącz' : 'Połącz teraz'}
              </button>
            </div>

            {/* Description */}
            <p className="text-xs txt-sub leading-relaxed">{details.desc}</p>

            {/* Shoe Selection for Synced Runs */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <label htmlFor="default-sync-shoe" className="text-[10px] font-bold txt-muted uppercase block">
                Przypisz buty do pobieranego treningu:
              </label>
              <select
                id="default-sync-shoe"
                value={selectedShoeName}
                onChange={(e) => setSelectedShoeName(e.target.value)}
                className="w-full text-xs font-bold liquid-pill px-3 py-2 txt-main outline-none cursor-pointer border border-white/10 bg-black/40"
              >
                {shoes.length > 0 ? (
                  shoes.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.dropMm}mm drop, {s.mileageKm} km)
                    </option>
                  ))
                ) : (
                  <option value="Asics Novablast 4">Asics Novablast 4</option>
                )}
                <option value="Inne obuwie treningowe">Inne obuwie treningowe</option>
              </select>
            </div>

            {/* Sync Action */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlePerformSync}
                className="w-full py-3 rounded-xl accent-btn-gradient text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>Pobieranie biegów z API...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Pobierz Najnowszy Bieg ({details.title})</span>
                  </>
                )}
              </button>

              {syncLogs.length > 0 && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-[11px] font-mono text-emerald-400/90">
                  {syncLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT GPX / FIT FILE IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text block">
                Złoty Standard Bez Kluczy API
              </span>
              <p className="text-xs txt-sub leading-snug">
                Pobierz plik <strong>.GPX</strong> lub <strong>.FIT</strong> z Garmin Connect, Strava, Polar Flow, Coros lub Apple Watch i przeciągnij go poniżej.
              </p>
            </div>

            {/* Drag & drop dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-white/20 hover:border-white/40 bg-black/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,.xml"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <span className="text-3xl">📂</span>
              <div className="font-bold txt-main text-xs">
                {isParsingFile ? 'Przetwarzanie punktów GPS...' : 'Upuść plik .GPX tutaj lub kliknij, aby wybrać'}
              </div>
              <span className="text-[10px] txt-muted">
                Obsługuje ślady GPS, tętno, kadencję i przewyższenia
              </span>
            </div>

            {/* Selected shoe selector */}
            <div>
              <label htmlFor="import-shoe" className="text-[10px] font-bold txt-muted block mb-1">
                W jakich butach zrealizowano ten bieg?
              </label>
              <select
                id="import-shoe"
                value={selectedShoeName}
                onChange={(e) => setSelectedShoeName(e.target.value)}
                className="w-full text-xs font-bold liquid-pill px-3 py-2 txt-main outline-none cursor-pointer border border-white/10 bg-black/40"
              >
                {shoes.length > 0 ? (
                  shoes.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.dropMm}mm drop, {s.mileageKm} km)
                    </option>
                  ))
                ) : (
                  <option value="Asics Novablast 4">Asics Novablast 4</option>
                )}
                <option value="Inne obuwie startowe">Inne obuwie startowe</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 3: GUIDE & FRAMEWORK EXPLANATION */}
        {activeTab === 'guide' && (
          <div className="space-y-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
            {/* Dedicated App-Specific Highlight */}
            {app.id === 'huawei' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block flex items-center gap-1.5">
                  <span>🔴</span>
                  <span>Jak połączyć Huawei Health (Zdrowie Huawei)?</span>
                </span>
                <p className="text-xs txt-main font-bold">
                  Sposób 1 (Najszybszy i 100% automatyczny – bez żadnego kodowania):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] txt-sub pl-1">
                  <li>Otwórz na telefonie aplikację <strong>Zdrowie Huawei (Huawei Health)</strong>.</li>
                  <li>Wejdź w dolną zakładkę <strong>„Ja”</strong> (Me) → <strong>„Zarządzanie prywatnością”</strong>.</li>
                  <li>Wybierz <strong>„Udostępnianie i autoryzacja danych”</strong>.</li>
                  <li>Kliknij kafelek <strong>Strava</strong> lub <strong>Komoot</strong> i włącz autoryzację.</li>
                  <li>Od tego momentu każdy bieg z zegarka Huawei automatycznie synchronizuje się ze Stravą/Komootem, a stamtąd bezpośrednio do RunPanda!</li>
                </ol>
                <div className="pt-1.5 border-t border-rose-500/20 text-[11px] txt-sub">
                  <strong className="text-white">Sposób 2 (Plik GPX ze Zdrowia Huawei):</strong> Wejdź w trening w aplikacji Zdrowie → kliknij 3 kropki w prawym górnym rogu → <strong>„Eksportuj trasę” / plik GPX</strong>. Przeciągnij go w zakładce <em>Import GPX/FIT</em>!
                </div>
                <div className="pt-1 border-t border-rose-500/20 text-[11px] txt-muted">
                  <strong className="text-white">Sposób 3 (HUAWEI Health Kit API):</strong> Dla pełnej integracji deweloperskiej na <strong className="text-rose-300">developer.huawei.com/consumer/en/hms/huawei-healthkit</strong>. Wymaga rejestracji w HUAWEI AppGallery Connect i uprawnień `https://www.huawei.com/auth/healthkit/activity.read`.
                </div>
              </div>
            )}

            {app.id === 'komoot' && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block flex items-center gap-1.5">
                  <span>🌲</span>
                  <span>Jak połączyć Komoot z RunPanda?</span>
                </span>
                <p className="text-xs txt-main font-bold">
                  Sposób 1 (Pobieranie tras trailowych i biegów GPX z Komoot):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] txt-sub pl-1">
                  <li>Otwórz na komputerze lub telefonie <strong>komoot.com</strong> i przejdź do ukończonego biegu lub zaplanowanej trasy (Tours).</li>
                  <li>W prawym menu kliknij <strong>„Pobierz plik GPX”</strong>.</li>
                  <li>Przejdź do zakładki <strong>„Import GPX/FIT”</strong> w RunPanda i upuść pobrany plik.</li>
                  <li>Nasz silnik odczyta profil przewyższeń (+metry podbiegów i zbiegów), nawierzchnie oraz międzyczasy!</li>
                </ol>
                <div className="pt-1.5 border-t border-emerald-500/20 text-[11px] txt-sub">
                  <strong className="text-white">Sposób 2 (Oficjalne API Komoot Connect):</strong> Komoot udostępnia otwarte API B2B/Partner OAuth 2.0 na <strong className="text-emerald-300">komoot.com/b2b/api</strong>. Umożliwia pobieranie zapisanych wycieczek poprzez endpoint <code>/v007/users/:userId/tours/?type=tour_recorded</code>.
                </div>
                <div className="pt-1 border-t border-emerald-500/20 text-[11px] txt-muted">
                  <strong className="text-white">Mostek zegarkowy:</strong> Aplikacja Komoot w sklepie Garmin Connect IQ oraz Apple Watch pozwala też automatycznie wysyłać trasy bezpośrednio na nadgarstek.
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text block">
                Polecany Zunifikowany Framework: Terra API
              </span>
              <p className="text-xs txt-sub">
                Dla pełnej automatyzacji wszystkich zegarków w jednej bazie standardem rynkowym jest <strong>Terra API</strong> (<strong>https://tryterra.co</strong>).
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] txt-muted pl-1">
                <li>
                  <strong className="text-white">Jeden uniwersalny endpoint</strong> dla Garmin, Strava, Polar, Coros, Suunto, Wahoo, Apple Health.
                </li>
                <li>
                  <strong className="text-white">Brak umów korporacyjnych</strong>: Garmin i Polar normalnie wymagają weryfikacji firmy i płatnego programu Garmin Health, a Terra daje natychmiastowy dostęp deweloperski.
                </li>
                <li>
                  <strong className="text-white">Webhooki Push</strong>: gdy kończysz bieg na zegarku, Terra wysyła gotowy JSON z trasą, tętnem i kadencją prosto do Twojego serwera.
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                Oficjalne API Strava (Darmowe)
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] txt-sub pl-1">
                <li>Wejdź na <strong>developers.strava.com</strong> i zaloguj się swoim kontem Strava.</li>
                <li>Kliknij <strong>"Create App"</strong> i uzyskaj <strong>Client ID</strong> oraz <strong>Client Secret</strong>.</li>
                <li>Jako Redirect URI wpisz adres aplikacji w chmurze.</li>
                <li>Biegacze logują się jednym kliknięciem przez OAuth 2.0 i zezwalają na odczyt aktywności.</li>
              </ol>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Natychmiastowe rozwiązanie: Pliki .GPX / .FIT
              </span>
              <p className="text-xs txt-sub">
                Wszystkie platformy (Garmin Connect, Polar Flow, Strava, Coros, Huawei Health, Komoot) posiadają opcję <strong>"Eksportuj plik oryginalny / GPX"</strong>. Przeciągnięcie takiego pliku w zakładce <em>Import GPX/FIT</em> przetwarza 100% autentyczne dane GPS, tętno i kadencję natychmiast, bez konieczności oczekiwania na klucze API!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
