import React from 'react';
import {
  MapPin,
  Sparkles,
  UserCheck,
  User,
  Settings,
} from 'lucide-react';
import { RunnerProfile, WeatherData, RunLog, UserAccount, PersonalBest } from '../types.ts';
import { SvgChatAiIcon, SvgPandaFace } from './SvgIcons.tsx';

interface DynamicHeaderProps {
  profile: RunnerProfile;
  weather: WeatherData | null;
  lastRun?: RunLog | null;
  runs?: RunLog[];
  personalBests?: PersonalBest[];
  onRefreshGps: () => void;
  isWeatherLoading: boolean;
  currentUser: UserAccount | null;
  onOpenPandaModal: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenChat?: () => void;
  onLogWater?: (amountMl: number) => void;
  onTriggerAdminPin?: () => void;
  isAdminMode?: boolean;
  onOpenAdminPanel?: () => void;
  onOpenAcwrModal?: () => void;
  onOpenAchievements?: () => void;
  onOpenIntegrationsHub?: (appId?: string) => void;
  onOpenPbsModal?: () => void;
  onOpenAppleHealth?: () => void;
}

export const DynamicHeader: React.FC<DynamicHeaderProps> = ({
  profile,
  weather,
  onRefreshGps,
  isWeatherLoading,
  currentUser,
  onOpenPandaModal,
  onOpenSettings,
  onOpenAuth,
  onOpenChat,
  onTriggerAdminPin,
  isAdminMode,
  onOpenAdminPanel,
}) => {
  const temp = weather?.temp ?? 18;

  return (
    <header
      style={{ background: 'var(--header-bg)' }}
      className="dynamic-header-container sticky top-0 z-40 w-full backdrop-blur-2xl border-b border-[var(--border-subtle)] px-2 sm:px-4 py-2 min-h-14 flex items-center justify-between gap-1.5 sm:gap-3 shadow-[var(--shadow-card)] relative overflow-hidden transition-all"
    >
      {/* Premium Ambient Lighting Accents - Isolated in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-70 dark:opacity-100">
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />
        <div className="absolute -top-10 left-6 w-56 h-20 bg-[var(--accent)]/15 rounded-full blur-3xl" />
        <div className="absolute -top-10 right-10 w-64 h-20 bg-emerald-500/12 rounded-full blur-3xl" />
      </div>

      {/* Left: TREDA in athletic condensed font + PRO AI badge + Panda Bamboos */}
      <div className="flex items-center gap-1.5 shrink-0 relative z-10 min-w-0">
        <div
          onClick={onTriggerAdminPin}
          className="flex items-center gap-1 cursor-pointer select-none shrink-0 group"
          title="Treda PRO AI"
        >
          <span className="font-brand-gondens text-[25px] sm:text-[32px] font-black txt-main leading-none drop-shadow-sm group-hover:text-[var(--accent)] transition-colors select-none inline-block">
            TREDA
          </span>
          <span className="text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] accent-text border border-[var(--accent-border)] font-black tracking-wider leading-none shadow-sm shrink-0">
            PRO AI
          </span>
        </div>

        {/* Panda Bamboo Counter - hidden on small mobile (< 460px) to give plenty of room */}
        <button
          type="button"
          onClick={onOpenPandaModal}
          aria-label="Otwórz profil Pandy i Bambusy"
          className="hidden min-[460px]:flex px-2 py-1 rounded-full bg-[var(--surface-tile)] border border-amber-400/50 text-amber-500 dark:text-amber-300 font-bold text-[10px] items-center gap-1 hover:border-amber-400 active:scale-95 transition-all shadow-sm shrink-0"
          title="Twój towarzysz RunPanda 2.5D — kliknij!"
        >
          <SvgPandaFace size={13} />
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span className="font-mono">{profile.bamboos}</span>
        </button>
      </div>

      {/* Right: Weather GPS + Profile Avatar + Fizjo AI + Settings */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative z-10">
        {/* Weather & City GPS Pill */}
        <button
          type="button"
          onClick={onRefreshGps}
          disabled={isWeatherLoading}
          aria-label="Odśwież pogodę GPS"
          className="liquid-pill px-1.5 sm:px-2 py-1 flex items-center gap-1 text-xs hover:border-[var(--accent)] transition-all cursor-pointer active:scale-95 shrink-0"
          title="Kliknij, aby odświeżyć lokalną pogodę GPS i AQI"
        >
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="font-black txt-main text-[10px] sm:text-[11px] ios-num leading-none">
            {isWeatherLoading ? '...' : `${temp}°`}
          </span>
          <span className="text-[9px] txt-muted max-w-[65px] truncate hidden md:block">
            {weather?.city || profile.city || 'Polska'}
          </span>
        </button>

        {/* Profile Avatar / Login Icon */}
        <button
          type="button"
          onClick={onOpenAuth}
          aria-label="Konto użytkownika"
          className={`h-7 w-7 sm:h-8 sm:w-auto sm:px-2.5 rounded-full flex items-center justify-center gap-1.5 text-[10px] font-black transition-all active:scale-95 shrink-0 ${
            currentUser
              ? 'bg-[var(--accent-soft)] accent-text border border-[var(--accent-border)]'
              : 'liquid-pill text-gray-300 hover:text-white'
          }`}
          title={currentUser ? `Zalogowano jako ${currentUser.name}` : 'Zaloguj lub utwórz konto'}
        >
          {currentUser ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[65px] hidden md:inline">{currentUser.name.split(' ')[0]}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Profil</span>
            </>
          )}
        </button>

        {/* Fizjo AI Quick Button */}
        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            aria-label="Otwórz Czat z Fizjologiem AI"
            className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black flex items-center justify-center gap-1 text-[10px] sm:text-[10.5px] shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 whitespace-nowrap"
            title="Czat z Fizjologiem AI TREDA"
          >
            <SvgChatAiIcon size={13} className="shrink-0" />
            <span className="leading-none font-black tracking-tight">Fizjo AI</span>
          </button>
        )}

        {/* Settings Gear */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Otwórz Ustawienia i Opcje"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-pill flex items-center justify-center text-sm hover:rotate-45 transition-transform txt-main active:scale-95 shrink-0"
          title="Ustawienia profilu, motywu i opcje aplikacji"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
