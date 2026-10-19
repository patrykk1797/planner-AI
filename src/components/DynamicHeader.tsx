import React from 'react';
import { RunnerProfile, WeatherData, RunLog } from '../types.ts';
import { calculateDailyHydration, evaluateAirQuality } from '../utils/runningMath.ts';

interface DynamicHeaderProps {
  profile: RunnerProfile;
  weather: WeatherData | null;
  lastRun: RunLog | null;
  currentUser?: { name: string; avatar?: string; email: string; provider: string } | null;
  onRefreshGps: () => void;
  isWeatherLoading: boolean;
  onOpenPandaModal: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  onLogWater: (amountMl: number) => void;
}

export const DynamicHeader: React.FC<DynamicHeaderProps> = ({
  profile,
  weather,
  lastRun,
  currentUser,
  onRefreshGps,
  isWeatherLoading,
  onOpenPandaModal,
  onOpenAuth,
  onLogWater,
}) => {
  const hydrationTarget = calculateDailyHydration(
    profile.weight,
    weather?.temp || 20,
    lastRun ? lastRun.distanceKm : 0
  );

  const aqiInfo = weather ? evaluateAirQuality(weather.pm2_5) : null;

  // Readiness calculation based on last run HR and fatigue
  const readinessScore = lastRun
    ? Math.max(65, Math.min(96, Math.round(100 - (lastRun.avgHr / profile.hrMax) * 25 - lastRun.distanceKm * 0.8)))
    : 88;

  // ACWR calculation (Acute to Chronic Workload Ratio)
  const acwr = 1.08;

  // Weekly progress
  const weeklyTarget = profile.weeklyKm || 35;
  const currentWeeklyKm = 28.5;
  const weeklyPercent = Math.min(100, Math.round((currentWeeklyKm / weeklyTarget) * 100));

  return (
    <header className="space-y-2 pt-2.5 px-3.5">
      {/* 1. Slim Top Bar: User Greeting & Direct Quick Action Shortcuts */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenAuth}
          className="flex items-center gap-2 text-left hover:opacity-90 transition-all active:scale-98"
          title="Konto biegacza • Zaloguj / Zmień profil"
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border-2 accent-border shadow-md shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full accent-bg flex items-center justify-center font-black text-black shadow-md shrink-0 text-xs">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider accent-text truncate">
                Baza 2027 {currentUser ? `• ${currentUser.provider}` : ''}
              </span>
              <span className="w-1.5 h-1.5 rounded-full accent-bg live-pulse"></span>
            </div>
            <h1 className="text-sm font-black txt-main leading-tight truncate">
              Cześć, {profile.name}!
            </h1>
          </div>
        </button>

        {/* Quick Top Shortcuts */}
        <div className="flex items-center gap-1.5">
          {/* Panda Bamboo Shop Pill */}
          <button
            type="button"
            onClick={onOpenPandaModal}
            aria-label="Świat Pandy"
            className="h-7 px-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-black flex items-center gap-1 hover:border-amber-400 hover:bg-amber-500/20 shadow-sm active:scale-95"
            title="Garderoba Pandy i Sklep Bambusów"
          >
            <span>🎋</span>
            <span className="ios-num text-white text-[11px]">{profile.bamboos}</span>
          </button>
        </div>
      </div>

      {/* 2. Narrow Horizontal Shortcuts Ribbon (Interactive Mini-Chips instead of full boxes) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        {/* Weather & Smog GPS Shortcut */}
        <button
          type="button"
          onClick={onRefreshGps}
          disabled={isWeatherLoading}
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 hover:border-white/20 active:scale-95 transition-all text-left shadow-sm"
          title="Kliknij, aby odświeżyć pogodę i smog GPS"
        >
          <span className="text-xs">
            {weather ? (weather.temp > 22 ? '☀️' : weather.temp > 10 ? '⛅' : '🌦️') : '🌦️'}
          </span>
          <span className="txt-main font-bold">
            {weather?.city || profile.city || 'Zgierz'} {weather ? `${weather.temp}°` : '8°'}
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full accent-badge">
            AQI {aqiInfo?.status || 'OK'}
          </span>
          {isWeatherLoading && <span className="animate-spin text-[10px]">⟳</span>}
        </button>

        {/* Readiness Shortcut */}
        <div
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-sm"
          title="Gotowość fizjologiczna do treningu"
        >
          <span className="text-xs">⚡</span>
          <span className="txt-muted text-[10px]">Forma:</span>
          <span className="font-black accent-text ios-num">{readinessScore}%</span>
        </div>

        {/* ACWR Workload Shortcut */}
        <div
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-sm"
          title="Acute-to-Chronic Workload Ratio"
        >
          <span className="text-xs">📈</span>
          <span className="txt-muted text-[10px]">ACWR:</span>
          <span className="font-black accent-text ios-num">{acwr}</span>
        </div>

        {/* Weekly Target Shortcut */}
        <div
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-sm"
          title="Tygodniowy kilometraż zrealizowany"
        >
          <span className="text-xs">🎯</span>
          <span className="font-bold txt-main ios-num">
            {currentWeeklyKm}/{weeklyTarget} km
          </span>
          <span className="text-[9px] txt-muted">({weeklyPercent}%)</span>
        </div>

        {/* VO2 Max Shortcut */}
        <div
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-sm"
          title="Estymowany wskaźnik VO2 Max"
        >
          <span className="text-xs">🫀</span>
          <span className="txt-muted text-[10px]">VO2:</span>
          <span className="font-black txt-main ios-num">{profile.vo2max}</span>
        </div>

        {/* Hydration Shortcut with Quick Tap to Add Water */}
        <button
          type="button"
          onClick={() => onLogWater(250)}
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 hover:border-sky-400/40 active:scale-95 transition-all shadow-sm"
          title="Kliknij, aby wypić szklankę wody +250ml"
        >
          <span className="text-xs">💧</span>
          <span className="font-bold text-sky-400 ios-num">
            {(hydrationTarget / 1000).toFixed(1)}L
          </span>
          <span className="text-[9px] font-black text-sky-300 bg-sky-500/20 px-1 py-0.2 rounded">
            +250ml
          </span>
        </button>

        {/* Weight Shortcut */}
        <div
          className="liquid-pill px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-sm"
          title="Masa ciała i cel redukcyjny"
        >
          <span className="text-xs">⚖️</span>
          <span className="font-bold txt-main ios-num">{profile.weight} kg</span>
          <span className="text-[9px] accent-text font-bold">cel {profile.targetWeight}</span>
        </div>
      </div>
    </header>
  );
};
