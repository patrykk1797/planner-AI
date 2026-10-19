import React, { useState } from 'react';
import { RunnerProfile, AccentColor, RunLog, TrainingDay, SyncAppStatus, UserAccount, Shoe } from '../types.ts';
import { AppIntegrationModal } from './AppIntegrationModal.tsx';

interface SettingsViewProps {
  profile: RunnerProfile;
  plan: TrainingDay[];
  currentUser: UserAccount | null;
  onUpdateProfile: (up: Partial<RunnerProfile>) => void;
  onAddSyncedRun: (newRun: RunLog, updatedPlan?: TrainingDay[], bamboos?: number) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenAuth: () => void;
  onOpenOnboarding: () => void;
  showToast: (msg: string) => void;
  shoes?: Shoe[];
  onClose?: () => void;
}

export const ACCENT_COLORS: { id: AccentColor; name: string; hex: string; desc: string }[] = [
  { id: 'orange', name: 'Ultra Orange', hex: '#ff7a00', desc: 'Klasyczny dynamiczny akcent biegowy' },
  { id: 'emerald', name: 'Emerald PRO', hex: '#10b981', desc: 'Regeneracja, tlen i spokój' },
  { id: 'cyan', name: 'iOS Cyan', hex: '#06b6d4', desc: 'Nowoczesny neonowy chłód' },
  { id: 'purple', name: 'Electric Purple', hex: '#a855f7', desc: 'Maksymalna energia i moc' },
  { id: 'coral', name: 'Sunset Coral', hex: '#f43f5e', desc: 'Ciepły koralowy zachód słońca' },
  { id: 'lime', name: 'Neon Lime', hex: '#84cc16', desc: 'Wysoka widoczność i dynamika' },
  { id: 'sapphire', name: 'Sapphire Blue', hex: '#3b82f6', desc: 'Głęboki błękit i precyzja' },
  { id: 'amber', name: 'Golden Amber', hex: '#f59e0b', desc: 'Złoty bursztyn i ciepło' },
  { id: 'magenta', name: 'Cyber Magenta', hex: '#ec4899', desc: 'Cyfrowa magenta i styl' },
  { id: 'teal', name: 'Glacier Teal', hex: '#14b8a6', desc: 'Lodowy morski turkus' },
  { id: 'ruby', name: 'Crimson Red', hex: '#ef4444', desc: 'Czysta adrenalina i prędkość' },
  { id: 'silver', name: 'Titanium Silver', hex: '#94a3b8', desc: 'Minimalizm i elegancja tytanu' },
];

export const ALL_SUPPORTED_APPS: SyncAppStatus[] = [
  {
    id: 'apple',
    name: 'Apple Zdrowie',
    icon: '🍎',
    connected: true,
    lastSync: 'Dzisiaj, 08:30',
    autoSync: true,
    athleteName: 'Apple Watch Ultra 2 (HealthKit)',
  },
  {
    id: 'google_fit',
    name: 'Google Zdrowie',
    icon: '🟢',
    connected: true,
    lastSync: 'Wczoraj, 19:40',
    autoSync: true,
    athleteName: 'Health Connect / Google Pixel',
  },
  {
    id: 'huawei',
    name: 'Huawei Health',
    icon: '🔴',
    connected: false,
    autoSync: false,
    athleteName: 'Huawei Watch GT Runner',
  },
  {
    id: 'komoot',
    name: 'Komoot',
    icon: '🌲',
    connected: true,
    lastSync: '3 dni temu',
    autoSync: true,
    athleteName: 'Trasy & Segmenty Trail',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: '🟧',
    connected: true,
    lastSync: 'Dzisiaj, 10:14',
    autoSync: true,
    athleteName: 'Patryk (Klub Biegowy)',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: '🔵',
    connected: true,
    lastSync: 'Dzisiaj, 09:30',
    autoSync: true,
    athleteName: 'Forerunner 265 / HRM-Dual',
  },
  {
    id: 'polar',
    name: 'Polar Flow',
    icon: '⚪',
    connected: false,
    autoSync: false,
    athleteName: 'Polar Vantage V3 / H10',
  },
  {
    id: 'coros',
    name: 'Coros Hub',
    icon: '🟡',
    connected: false,
    autoSync: false,
    athleteName: 'Coros Pace 3 / Apex 2 Pro',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  plan,
  currentUser,
  onUpdateProfile,
  onAddSyncedRun,
  onLogout,
  onDeleteAccount,
  onOpenAuth,
  onOpenOnboarding,
  showToast,
  shoes,
  onClose,
}) => {
  const [apps, setApps] = useState<SyncAppStatus[]>(() => {
    if (profile.connectedApps && profile.connectedApps.length > 0) {
      // Merge with all 6 supported apps so none is missing
      return ALL_SUPPORTED_APPS.map((defaultApp) => {
        const found = profile.connectedApps?.find((a) => a.id === defaultApp.id);
        return found ? { ...defaultApp, ...found } : defaultApp;
      });
    }
    return ALL_SUPPORTED_APPS;
  });

  const [activeIntegrationApp, setActiveIntegrationApp] = useState<SyncAppStatus | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Switch accent color
  const handleSelectAccent = (colorId: AccentColor) => {
    document.documentElement.setAttribute('data-accent', colorId);
    onUpdateProfile({ accentColor: colorId });
    showToast(`Zmieniono akcent na: ${ACCENT_COLORS.find((c) => c.id === colorId)?.name}`);
  };

  // Toggle theme dark/light
  const handleToggleTheme = (theme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', theme);
    onUpdateProfile({ theme });
    showToast(`Przełączono na motyw: ${theme === 'dark' ? 'Ciemny (OLED)' : 'Jasny (Liquid Light)'}`);
  };

  // Toggle app connection
  const handleToggleApp = (appId: string) => {
    const updated = apps.map((a) => {
      if (a.id === appId) {
        const nextState = !a.connected;
        return {
          ...a,
          connected: nextState,
          lastSync: nextState ? 'Właśnie teraz' : undefined,
        };
      }
      return a;
    });
    setApps(updated);
    onUpdateProfile({ connectedApps: updated });
    showToast(`Zaktualizowano status połączenia: ${apps.find((a) => a.id === appId)?.name}`);
  };

  // Trigger sync across all connected services
  const handleSyncAll = () => {
    const connectedList = apps.filter((a) => a.connected);
    if (connectedList.length === 0) {
      showToast('Brak połączonych aplikacji. Połącz przynajmniej jedną!');
      return;
    }

    setIsSyncingAll(true);
    setTimeout(() => {
      const picked = connectedList[Math.floor(Math.random() * connectedList.length)];
      const dist = +(Math.random() * 3 + 7).toFixed(2);
      const dur = Math.round(dist * 5.3);

      const syncedRun: RunLog = {
        id: `sync-all-${Date.now()}`,
        title: `Bieg Tlenowy (${picked.name}) • ${dist} km`,
        sourceApp: picked.id as any,
        date: new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        distanceKm: dist,
        durationMin: dur,
        avgPace: '5:18',
        avgHr: 148,
        maxHr: 169,
        avgCadence: 174,
        elevationGainM: 35,
        calories: Math.round(dist * 66),
        shoeName: profile.selectedShoeId ? 'Asics Novablast 4' : 'Nike Pegasus 41',
        notes: `Zsynchronizowano automatycznie przez agregator API (${picked.name}).`,
      };

      onAddSyncedRun(syncedRun, undefined, 30);
      setIsSyncingAll(false);
      showToast(`Pobrano nowy trening (${dist} km) z ${picked.name}! +30 🎋`);
    }, 1200);
  };

  return (
    <div className="space-y-4 animate-ios pb-28">
      {/* 0. Top Bar / Breadcrumb */}
      <div className="liquid-glass p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <div>
            <h2 className="text-sm font-black txt-main">Centrum Ustawień & Konta</h2>
            <p className="text-[10px] txt-muted">
              Profil biegacza, motyw, kolory, konto oraz 6 platform sportowych
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 rounded-full text-xs font-bold liquid-pill txt-sub hover:text-white"
          >
            ← Wróć do Planu
          </button>
        )}
      </div>

      {/* 1. Konto Biegacza & Logowanie (Wyloguj / Usuń konto) */}
      <div className="liquid-glass p-4 space-y-3.5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider accent-text">
              Konto Użytkownika
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full accent-badge uppercase font-bold">
              {currentUser?.provider || 'Aktywny'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="text-[11px] font-bold accent-text hover:underline"
          >
            Zmień konto / Zaloguj
          </button>
        </div>

        {currentUser ? (
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 accent-border shadow-md"
              />
              <div>
                <div className="text-sm font-bold txt-main flex items-center gap-2">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 txt-sub font-mono">
                    ID: {currentUser.id.slice(0, 10)}
                  </span>
                </div>
                <div className="text-xs txt-sub">{currentUser.email}</div>
                <div className="text-[10px] txt-muted mt-0.5">
                  Członek RunPanda od: {currentUser.createdAt || '2026-01-15'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="py-1.5 px-3 rounded-xl accent-badge text-xs font-bold text-center transition-all hover:brightness-110"
              >
                🎯 Panel Celów
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold txt-sub text-center transition-all"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold txt-main">Tryb gościa (Niezalogowany)</div>
              <div className="text-[11px] txt-muted">Zaloguj się, aby zsynchronizować dane w chmurze.</div>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="py-2 px-4 rounded-xl accent-btn-gradient text-xs font-black uppercase"
            >
              Zaloguj / Załóż konto
            </button>
          </div>
        )}

        {/* Danger zone: Delete Account */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] txt-muted">
            Bezpieczeństwo danych RODO / GDPR:
          </div>
          <button
            type="button"
            onClick={() => setIsDeletingAccount(true)}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1"
          >
            <span>🗑️</span>
            <span>Usuń konto</span>
          </button>
        </div>
      </div>

      {/* 2. Personalizacja Kolorów Akcentu (12 Barw) & Motyw */}
      <div className="liquid-glass p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Styl Wizualny & Kolorystyka
            </span>
            <h3 className="text-sm font-bold txt-main">12 Barw Akcentu Biegowego</h3>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full accent-badge">
            {ACCENT_COLORS.find((c) => c.id === profile.accentColor)?.name || 'Ultra Orange'}
          </span>
        </div>

        {/* Motyw Dark / Light */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/30 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleToggleTheme('dark')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              profile.theme === 'dark'
                ? 'accent-badge font-black'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>🌙</span>
            <span>Ciemny (OLED 2027)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleTheme('light')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              profile.theme === 'light'
                ? 'accent-badge font-black'
                : 'txt-sub hover:text-white'
            }`}
          >
            <span>☀️</span>
            <span>Jasny (Liquid Light)</span>
          </button>
        </div>

        {/* 12 Color Swatches Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
          {ACCENT_COLORS.map((col) => {
            const isSelected = profile.accentColor === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelectAccent(col.id)}
                className={`p-2.5 rounded-2xl text-left transition-all border ${
                  isSelected
                    ? 'accent-ring border-white shadow-lg bg-white/10 scale-102'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:scale-101'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-5 h-5 rounded-full shadow-md border border-white/30"
                    style={{ backgroundColor: col.hex }}
                  />
                  {isSelected && (
                    <span className="text-[10px] font-black accent-text">✓ Aktywny</span>
                  )}
                </div>
                <div className="text-[11px] font-bold txt-main truncate">{col.name}</div>
                <div className="text-[9px] txt-muted truncate">{col.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Integracja z 8 Oficjalnymi Aplikacjami Sportowymi & Hub Terra */}
      <div className="liquid-glass p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Platformy Treningowe & Urządzenia
            </span>
            <h3 className="text-sm font-bold txt-main">8 Oficjalnych Integracji Sportowych</h3>
          </div>
          <button
            type="button"
            disabled={isSyncingAll}
            onClick={handleSyncAll}
            className="py-1.5 px-3 rounded-xl accent-btn-gradient text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
          >
            {isSyncingAll ? (
              <>
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>Pobieranie...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Synchronizuj wszystkie</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs txt-sub leading-relaxed">
          Kliknij w wybraną platformę, aby otworzyć panel autoryzacji, pobrać najnowsze biegi,
          lub wgrać plik treningu <strong>(.gpx / .fit / .tcx)</strong>:
        </p>

        {/* 6 App Cards */}
        <div className="space-y-2.5">
          {apps.map((app) => (
            <div
              key={app.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                app.connected
                  ? 'bg-white/5 border-white/15 hover:border-white/30'
                  : 'bg-black/30 border-white/5 opacity-75 hover:opacity-100'
              }`}
              onClick={() => setActiveIntegrationApp(app)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10">
                  {app.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold txt-main">{app.name}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        app.connected
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/10 txt-muted'
                      }`}
                    >
                      {app.connected ? 'Połączono' : 'Rozłączono'}
                    </span>
                  </div>
                  <div className="text-[10px] txt-muted mt-0.5">
                    {app.athleteName || (app.connected ? 'Aktywna wymiana danych' : 'Kliknij, aby połączyć')}
                  </div>
                  {app.connected && app.lastSync && (
                    <div className="text-[9px] accent-text mt-0.5">
                      Ostatnia synchronizacja: {app.lastSync}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleApp(app.id);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    app.connected
                      ? 'bg-white/10 text-white/70 hover:bg-white/20'
                      : 'accent-badge font-black'
                  }`}
                >
                  {app.connected ? 'Rozłącz' : 'Połącz'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIntegrationApp(app);
                  }}
                  className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center txt-sub hover:text-white"
                >
                  ⚙️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Metryka Zawodnika & Szybka Edycja */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold txt-main">Podstawowa Metryka Biegacza</h3>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-xs font-bold accent-text hover:underline"
          >
            Otwórz pełny kreator celów →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] txt-muted block mb-1">Imię zawodnika</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => onUpdateProfile({ name: e.target.value })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] txt-muted block mb-1">Miasto bazowe (Pogoda GPS)</label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => onUpdateProfile({ city: e.target.value })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] txt-muted block mb-1">Masa ciała (kg)</label>
            <input
              type="number"
              value={profile.weight}
              step="0.1"
              onChange={(e) => onUpdateProfile({ weight: parseFloat(e.target.value) || 70 })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] txt-muted block mb-1">Masa docelowa (kg)</label>
            <input
              type="number"
              value={profile.targetWeight}
              step="0.1"
              onChange={(e) => onUpdateProfile({ targetWeight: parseFloat(e.target.value) || 68 })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold"
            />
          </div>
        </div>
      </div>

      {/* App Integration Modal for detailed sync & GPX file import */}
      <AppIntegrationModal
        isOpen={!!activeIntegrationApp}
        onClose={() => setActiveIntegrationApp(null)}
        app={activeIntegrationApp}
        profile={profile}
        plan={plan}
        shoes={shoes}
        onToggleConnect={(appId) => {
          handleToggleApp(appId);
          setActiveIntegrationApp((prev) => (prev ? { ...prev, connected: !prev.connected } : null));
        }}
        onAddSyncedRun={(newRun, updatedPlan, bamboos) => {
          onAddSyncedRun(newRun, updatedPlan, bamboos);
          setActiveIntegrationApp(null);
        }}
        showToast={showToast}
      />

      {/* Delete Account Confirmation Dialog */}
      {isDeletingAccount && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-60 flex items-center justify-center p-4">
          <div className="liquid-glass w-full max-w-sm p-6 space-y-4 border border-rose-500/40 animate-ios-modal text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">
              Usuwanie Konta Biegacza
            </h3>
            <p className="text-xs txt-sub leading-relaxed">
              Czy na pewno chcesz bezpowrotnie usunąć konto <strong>{currentUser?.email || profile.name}</strong>?
              Wszystkie zarejestrowane biegi, przebieg butów w szafie oraz historia 2027 zostaną trwale wykasowane.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeletingAccount(false)}
                className="py-2.5 rounded-xl liquid-pill text-xs font-bold txt-sub"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeletingAccount(false);
                  onDeleteAccount();
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-lg"
              >
                Tak, usuń trwale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
