import React, { useState, useEffect } from 'react';
import {
  Settings,
  Heart,
  Scale,
  Calendar,
  User,
  Crown,
  Smartphone,
  Check,
  Trash2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { RunnerProfile, AccentColor, RunLog, TrainingDay, SyncAppStatus, UserAccount, Shoe, PersonalBest } from '../types.ts';
import { NotificationSettingsModal } from './NotificationSettingsModal.tsx';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../utils/notificationEngine.ts';
import { DEFAULT_HEALTH_BRIDGE_DATA } from '../utils/healthBridgeParser.ts';
import { IntegrationBrandLogo } from './IntegrationBrandLogo.tsx';

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
  onOpenAdminPanel?: () => void;
  showToast: (msg: string) => void;
  onClose?: () => void;
  onClearDataNewUser?: () => void;
  onLoadDemoProfile?: () => void;
  onTriggerAdminPin?: () => void;
  isAdminMode?: boolean;
  runs: RunLog[];
  shoes: Shoe[];
  personalBests: PersonalBest[];
  onImportAllData: (data: any) => void;
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
    id: 'huawei',
    name: 'Huawei Health',
    icon: '🔴',
    connected: true,
    lastSync: 'Połączono (TruSport™)',
    autoSync: true,
    athleteName: 'Watch GT Runner / GT 4',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: '🔵',
    connected: true,
    lastSync: 'Połączono (Firstbeat)',
    autoSync: true,
    athleteName: 'Forerunner / Fenix',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: '🟧',
    connected: true,
    lastSync: 'Połączono (GPS)',
    autoSync: true,
    athleteName: 'Strava Sync',
  },
  {
    id: 'apple',
    name: 'Apple Zdrowie',
    icon: '🍎',
    connected: true,
    lastSync: 'Połączono (HealthKit)',
    autoSync: true,
    athleteName: 'Apple Watch Ultra',
  },
  {
    id: 'zepp',
    name: 'Zepp (Amazfit)',
    icon: '🟢',
    connected: true,
    lastSync: 'Połączono (Waga & Treningi)',
    autoSync: true,
    athleteName: 'Amazfit & Smart Waga',
  },
  {
    id: 'komoot',
    name: 'Komoot',
    icon: '🌲',
    connected: true,
    lastSync: 'Połączono (Trasy)',
    autoSync: true,
    athleteName: 'Trasy Trail & GPX',
  },
];

export const LOGIN_PROVIDERS_META = [
  { id: 'google', name: 'Google', icon: '🇬', desc: 'Logowanie kontem Google' },
  { id: 'facebook', name: 'Facebook', icon: '🇫', desc: 'Logowanie przez Meta / Facebook' },
  { id: 'apple', name: 'Apple ID', icon: '🍎', desc: 'Sign in with Apple' },
  { id: 'email', name: 'E-mail i Hasło', icon: '✉️', desc: 'Klasyczne logowanie hasłem' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  plan,
  currentUser,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onOpenAuth,
  onOpenOnboarding,
  onOpenAdminPanel,
  showToast,
  onClose,
  onClearDataNewUser,
  onLoadDemoProfile,
  onTriggerAdminPin,
  isAdminMode,
  runs,
  shoes,
  personalBests,
  onImportAllData,
}) => {
  const [apps, setApps] = useState<SyncAppStatus[]>(() => {
    return profile.connectedApps && profile.connectedApps.length > 0
      ? profile.connectedApps
      : ALL_SUPPORTED_APPS;
  });

  const [weightInput, setWeightInput] = useState<string>(String(profile.weight ?? 74.5));
  const [targetWeightInput, setTargetWeightInput] = useState<string>(String(profile.targetWeight ?? 70.0));
  const [heightInput, setHeightInput] = useState<string>(String(profile.height ?? 178));
  const [birthdateInput, setBirthdateInput] = useState<string>(profile.birthdate || '14.05.1995');
  const [time5kInput, setTime5kInput] = useState<string>(profile.time5k || '25:00');
  const [hrMaxInput, setHrMaxInput] = useState<string>(String(profile.hrMax || 185));
  const [rhrInput, setRhrInput] = useState<string>(String(profile.rhr || 60));

  // 5-click secret admin panel trigger
  const [headerClickCount, setHeaderClickCount] = useState<number>(0);

  // Modals state
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationSettings, setNotificationSettings] = useState(
    profile.notifications || DEFAULT_NOTIFICATION_SETTINGS
  );

  const healthBridge = profile.healthBridge || DEFAULT_HEALTH_BRIDGE_DATA;

  useEffect(() => {
    setWeightInput(String(profile.weight ?? 74.5));
  }, [profile.weight]);

  useEffect(() => {
    setTargetWeightInput(String(profile.targetWeight ?? 70.0));
  }, [profile.targetWeight]);

  useEffect(() => {
    setHeightInput(String(profile.height ?? 178));
  }, [profile.height]);

  useEffect(() => {
    setBirthdateInput(profile.birthdate || '14.05.1995');
  }, [profile.birthdate]);

  useEffect(() => {
    setTime5kInput(profile.time5k || '25:00');
  }, [profile.time5k]);

  // Calculate runner age from birthdate
  const calculateAge = (bdate: string) => {
    if (!bdate) return 30;
    const parts = bdate.split(/[.-/]/).map(Number);
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      if (year < 100) year += 1900;
      if (parts[0] > 1900) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
      const birth = new Date(year, month - 1, day);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970) || 30;
    }
    return 30;
  };

  const handleHeaderSecretClick = () => {
    const nextCount = headerClickCount + 1;
    setHeaderClickCount(nextCount);
    if (nextCount >= 5) {
      setHeaderClickCount(0);
      if (isAdminMode && onOpenAdminPanel) {
        onOpenAdminPanel();
      } else if (onTriggerAdminPin) {
        onTriggerAdminPin();
      }
      showToast('👑 Odblokowano Panel Administracyjny Treda!');
    } else if (nextCount >= 2) {
      showToast(`Jeszcze ${5 - nextCount} kliknięć do Panelu Admina`);
    }
  };

  const handleSelectAccent = (colorId: AccentColor) => {
    document.documentElement.setAttribute('data-accent', colorId);
    onUpdateProfile({ accentColor: colorId });
    showToast(`Zmieniono kolor akcentu na: ${ACCENT_COLORS.find((c) => c.id === colorId)?.name}`);
  };

  const handleToggleTheme = (theme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', theme);
    onUpdateProfile({ theme });
    showToast(`Przełączono motyw na: ${theme === 'dark' ? 'Ciemny (OLED)' : 'Jasny'}`);
  };

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

  const handleExportData = () => {
    const dataToExport = {
      profile,
      plan,
      runs,
      shoes,
      personalBests,
      exportedAt: new Date().toISOString(),
      appVersion: '2.0.0-PRO',
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treda-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pomyślnie wyeksportowano kopię zapasową (.json)! 📥');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && (imported.profile || imported.runs)) {
          onImportAllData(imported);
          showToast('Pomyślnie przywrócono dane z kopii zapasowej! 📤');
        } else {
          showToast('Błędna struktura pliku kopii zapasowej.');
        }
      } catch {
        showToast('Błąd parsowania pliku JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 px-4 pb-36 animate-ios">
      {/* Header bar */}
      <div className="liquid-glass p-4 rounded-3xl flex items-center justify-between shadow-lg">
        <div
          onClick={handleHeaderSecretClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="Kliknij 5 razy, aby wejść do Panelu Admina"
        >
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
            ⚙️
          </div>
          <div>
            <h2 className="text-sm font-black txt-main flex items-center gap-1.5">
              <span>Centrum Opcji & Profilu</span>
              {isAdminMode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  ADMIN
                </span>
              )}
            </h2>
            <p className="text-[10px] txt-muted">
              Profil biegacza, motywy, kopia zapasowa i połączone urządzenia
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-3 rounded-full text-xs font-bold liquid-pill txt-sub hover:text-white flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Wróć</span>
          </button>
        )}
      </div>

      {/* 1. CZYSTA KARTA POŁĄCZONYCH URZĄDZEŃ W STYLU iOS */}
      <div className="liquid-glass p-4 sm:p-5 rounded-3xl space-y-3.5 border border-white/10 shadow-lg animate-ios">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black txt-main tracking-tight">
                  Połączone Urządzenia i Aplikacje
                </h3>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  iOS Style
                </span>
              </div>
              <p className="text-[11px] txt-muted leading-tight mt-0.5">
                Zarządzaj integracjami z zegarkami i platformami biegowymi
              </p>
            </div>
          </div>
        </div>

        {/* Grouped iOS-style device list */}
        <div className="rounded-2xl border border-white/10 bg-black/40 divide-y divide-white/10 overflow-hidden shadow-inner">
          {apps.map((app) => (
            <div
              key={app.id}
              className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <IntegrationBrandLogo appId={app.id} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black txt-main truncate">{app.name}</span>
                    {app.connected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-sm shadow-emerald-400/50" />
                    )}
                  </div>
                  <div className="text-[10px] txt-muted truncate">
                    {app.athleteName || 'Zsynchronizowano'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono txt-sub hidden sm:inline-block">
                  {app.connected ? (app.lastSync || 'Aktywny') : 'Odłączono'}
                </span>

                {/* Clean iOS Style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggleApp(app.id)}
                  role="switch"
                  aria-checked={app.connected}
                  aria-label={`Przełącz stan połączenia dla ${app.name}`}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    app.connected ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      app.connected ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Live Biometrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted flex items-center gap-1.5 truncate">
              <IntegrationBrandLogo appId="apple" size="xs" />
              <span className="truncate">Kroki (HealthKit)</span>
            </span>
            <span className="font-mono font-black text-emerald-400 text-sm block">
              {healthBridge.metrics.stepsToday.toLocaleString('pl-PL')}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted flex items-center gap-1.5 truncate">
              <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Tętno Spocz. (RHR)</span>
            </span>
            <span className="font-mono font-black text-rose-400 text-sm block">
              {healthBridge.metrics.restingHeartRate} bpm
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted flex items-center gap-1.5 truncate">
              <IntegrationBrandLogo appId="huawei" size="xs" />
              <span className="truncate">RAI (Huawei)</span>
            </span>
            <span className="font-mono font-black text-amber-300 text-sm block">51.8 pkt</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <span className="text-[9px] txt-muted flex items-center gap-1.5 truncate">
              <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Waga (Profil)</span>
            </span>
            <span className="font-mono font-black text-cyan-300 text-sm block">{profile.weight} kg</span>
          </div>
        </div>
      </div>

      {/* 2. PROFIL BIEGACZA & EDYCJA DATY URODZENIA */}
      <div className="liquid-glass p-4 sm:p-5 rounded-3xl space-y-3.5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏃</span>
            <div>
              <h3 className="text-sm font-black txt-main">Profil Biegacza & Metryka Fizjologiczna</h3>
              <p className="text-[10px] txt-muted">Wpływ na strefy tętna, VO2max i tempo w planie AI</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-xs font-bold accent-text hover:underline"
          >
            Kreator celów →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Imię zawodnika</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => onUpdateProfile({ name: e.target.value })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none"
              placeholder="np. Patryk"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Płeć</label>
            <select
              value={profile.gender || 'M'}
              onChange={(e) => onUpdateProfile({ gender: e.target.value as any })}
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none bg-black/40"
            >
              <option value="M">Mężczyzna</option>
              <option value="F">Kobieta</option>
              <option value="Other">Inna</option>
            </select>
          </div>

          {/* Edycja Daty Urodzenia */}
          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold flex items-center justify-between">
              <span>Data urodzenia</span>
              <span className="text-[9px] text-amber-300 font-normal">
                {calculateAge(birthdateInput)} lat
              </span>
            </label>
            <input
              type="text"
              value={birthdateInput}
              onChange={(e) => {
                setBirthdateInput(e.target.value);
                onUpdateProfile({ birthdate: e.target.value });
              }}
              placeholder="DD.MM.YYYY"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Masa ciała (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => {
                setWeightInput(e.target.value);
                const val = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(val) && val > 20 && val < 300) {
                  onUpdateProfile({ weight: val });
                }
              }}
              placeholder="74.5"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Masa docelowa (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetWeightInput}
              onChange={(e) => {
                setTargetWeightInput(e.target.value);
                const val = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(val) && val > 20 && val < 300) {
                  onUpdateProfile({ targetWeight: val });
                }
              }}
              placeholder="70.0"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Wzrost (cm)</label>
            <input
              type="text"
              inputMode="numeric"
              value={heightInput}
              onChange={(e) => {
                setHeightInput(e.target.value);
                const val = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(val) && val > 50 && val < 260) {
                  onUpdateProfile({ height: val });
                }
              }}
              placeholder="178"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Czas na 5 km</label>
            <input
              type="text"
              value={time5kInput}
              onChange={(e) => {
                setTime5kInput(e.target.value);
                onUpdateProfile({ time5k: e.target.value });
              }}
              placeholder="25:00"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Tętno Max (HRmax bpm)</label>
            <input
              type="number"
              value={hrMaxInput}
              onChange={(e) => {
                setHrMaxInput(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 100 && val < 240) {
                  onUpdateProfile({ hrMax: val });
                }
              }}
              placeholder="185"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1 font-bold">Tętno Spocz. (RHR bpm)</label>
            <input
              type="number"
              value={rhrInput}
              onChange={(e) => {
                setRhrInput(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 30 && val < 120) {
                  onUpdateProfile({ rhr: val });
                }
              }}
              placeholder="60"
              className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. MOTYW & 12 KOLORÓW AKCENTU */}
      <div className="liquid-glass p-4 sm:p-5 rounded-3xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Styl Wizualny & Kolorystyka
            </span>
            <h3 className="text-sm font-bold txt-main">Motyw Jasny/Ciemny oraz 12 Barw Akcentu</h3>
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

      {/* 4. KOPIA ZAPASOWA & PORTOWALNOŚĆ DANYCH (.JSON) */}
      <div className="liquid-glass p-4 sm:p-5 rounded-3xl space-y-3 border border-white/10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            Kopia zapasowa & Portowalność
          </span>
          <h3 className="text-sm font-black txt-main">Zarządzanie plikiem danych (.json)</h3>
          <p className="text-[11px] txt-muted mt-0.5">Eksportuj swój cały postęp lub wczytaj kopię z innego urządzenia</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportData}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span>📥</span>
            <span>Eksportuj Profil & Biegi</span>
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              aria-label="Importuj kopię zapasową"
            />
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>📤</span>
              <span>Importuj kopię (.json)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <button
            type="button"
            onClick={onClearDataNewUser}
            className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Wyczyść dane / Reset</span>
          </button>

          <button
            type="button"
            onClick={onLoadDemoProfile}
            className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Wczytaj profil demo (Zgierz)</span>
          </button>
        </div>
      </div>

      {/* 5. KONTO BIEGACZA */}
      <div className="liquid-glass p-4 rounded-3xl space-y-3 border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black uppercase tracking-wider accent-text truncate">
              Konto Użytkownika
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full accent-badge uppercase font-bold shrink-0">
              {currentUser?.provider || 'Lokalne'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="text-[11px] font-bold accent-text hover:underline shrink-0"
          >
            {currentUser ? 'Zmień konto' : 'Zaloguj się'}
          </button>
        </div>

        {currentUser ? (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center font-black text-xs accent-text shrink-0 shadow-sm">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold txt-main text-xs truncate">{currentUser.name}</div>
                <div className="text-[10px] txt-muted truncate">{currentUser.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={onLogout}
                className="py-1 px-3 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white transition-all active:scale-95"
              >
                Wyloguj
              </button>
              <button
                type="button"
                onClick={() => setIsDeletingAccount(true)}
                className="py-1 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all active:scale-95"
              >
                Usuń
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs min-w-0">
              <div className="font-bold txt-main">Profil Gościa (Pamięć lokalna)</div>
              <div className="text-[10px] txt-muted">Zaloguj się, aby zsynchronizować dane z chmurą</div>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="py-1.5 px-3.5 rounded-xl accent-btn-gradient text-xs font-black text-slate-950 uppercase shrink-0 self-end sm:self-center"
            >
              Zaloguj
            </button>
          </div>
        )}

        {/* Powiązane opcje logowania (Multi-Provider Account Linking) */}
        {currentUser && (
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <span>🔗</span> Powiązane Opcje Logowania
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                Wspólne konto na każdym urządzeniu
              </span>
            </div>

            <p className="text-[10px] txt-muted leading-relaxed">
              Poniżej widzisz metody logowania powiązane z Twoim kontem. Możesz zalogować się za pomocą dowolnej z nich (np. Google lub Facebook) i mieć dostęp do tego samego konta i tych samych treningów.
            </p>

            <div className="space-y-1.5">
              {LOGIN_PROVIDERS_META.map((prov) => {
                const isPrimary = currentUser.provider === prov.id;
                const isLinked = isPrimary || (currentUser.linkedProviders || []).includes(prov.id as any);

                return (
                  <div
                    key={prov.id}
                    className={`p-2.5 rounded-2xl flex items-center justify-between gap-2 text-xs border transition-all ${
                      isLinked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-black/30 border-white/5 txt-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-sm">
                        {prov.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className={isLinked ? 'text-white' : 'text-slate-400'}>{prov.name}</span>
                          {isPrimary && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-black">
                              Główna
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] txt-muted truncate">
                          {isLinked ? 'Powiązane • Dostęp z każdego urządzenia' : prov.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLinked ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Połączone</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAuth();
                            showToast(`Wybierz ${prov.name} w oknie logowania, aby połączyć to logowanie z Twoim kontem.`);
                          }}
                          className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 active:scale-95 transition-all cursor-pointer"
                        >
                          + Powiąż
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Admin Mode Card if Active */}
      {isAdminMode && (
        <div className="liquid-glass p-3.5 sm:p-4 rounded-3xl border border-amber-500/50 bg-amber-500/10 space-y-2 animate-ios">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">👑</span>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Tryb Administratora Aktywny
                </h3>
                <p className="text-[10px] txt-sub leading-tight">Dostęp Autoryzowany dla Właściciela Aplikacji</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all shrink-0 whitespace-nowrap self-stretch sm:self-auto text-center"
            >
              Otwórz Panel 👑
            </button>
          </div>
        </div>
      )}

      {/* Discrete Version / Admin Trigger Button */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            if (isAdminMode && onOpenAdminPanel) {
              onOpenAdminPanel();
            } else if (onTriggerAdminPin) {
              onTriggerAdminPin();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-pill text-[10px] font-bold txt-muted hover:txt-main hover:border-[var(--accent)]/40 transition-all active:scale-95 group shadow-sm cursor-pointer"
          title="Kliknij, aby otworzyć panel administratora"
        >
          <span className="w-2 h-2 rounded-full accent-bg group-hover:scale-125 transition-transform" />
          <span>Treda Running • Wersja 2027 PRO</span>
          <span className="opacity-60 text-[9px]">⚡</span>
        </button>
      </div>

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
