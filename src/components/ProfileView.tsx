import React, { useState } from 'react';
import { RunnerProfile, RunLog, WeatherData } from '../types.ts';
import { calculateAge, calculateHeartRateZones, calculateDailyHydration } from '../utils/runningMath.ts';

interface ProfileViewProps {
  profile: RunnerProfile;
  lastRun: RunLog | null;
  weather: WeatherData | null;
  onOpenOnboarding: () => void;
  showToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  lastRun,
  weather,
  onOpenOnboarding,
  showToast,
}) => {
  const [showIgCard, setShowIgCard] = useState<boolean>(false);
  const age = calculateAge(profile.birthdate);
  const zones = calculateHeartRateZones(profile.hrMax, profile.rhr);
  const hydration = calculateDailyHydration(profile.weight, weather?.temp || 20, lastRun?.distanceKm || 0);

  const handleShareIg = () => {
    setShowIgCard(true);
    showToast('Wygenerowano dynamiczną Kartę IG! 📸');
  };

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Athlete Biometric Card */}
      <div className="liquid-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Karta Biegacza & Paszport Wydolności
            </span>
            <h2 className="text-base font-bold txt-main">{profile.name}</h2>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            aria-label="Kalibruj profil"
            className="liquid-pill px-3 py-1.5 text-xs font-bold txt-sub hover:accent-text"
          >
            ⚙️ Edytuj
          </button>
        </div>

        {/* Biometrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Wiek (z daty {profile.birthdate})</span>
            <span className="font-bold txt-main text-sm ios-num">{age} lat</span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Masa ciała</span>
            <span className="font-bold txt-main text-sm ios-num">
              {profile.weight} kg <span className="text-[10px] txt-muted font-normal">(cel: {profile.targetWeight} kg)</span>
            </span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Szacowane VO2 max</span>
            <span className="font-bold accent-text text-sm ios-num">{profile.vo2max} ml/kg/min</span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Czas na 5 km (PB)</span>
            <span className="font-bold txt-main text-sm ios-num">{profile.time5k}</span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Tętno Maks. (HRmax)</span>
            <span className="font-bold txt-main text-sm ios-num">{profile.hrMax} bpm</span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-[10px] txt-muted block">Tętno Spocz. (RHR)</span>
            <span className="font-bold txt-main text-sm ios-num">{profile.rhr} bpm</span>
          </div>
        </div>

        <div className="liquid-pill p-3 space-y-1">
          <div className="text-[10px] uppercase font-bold txt-muted">Aktualny cel sezonu</div>
          <div className="text-xs font-black txt-main">{profile.targetGoal}</div>
          <div className="text-[10px] txt-muted">
            Dni treningowe: {profile.selectedDays.join(', ')} • {profile.weeklyKm} km/tydzień
          </div>
        </div>

        {/* Action button: IG Card */}
        <button
          type="button"
          onClick={handleShareIg}
          className="w-full py-2.5 rounded-full liquid-active font-bold text-xs flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>Wygeneruj Kartę IG do relacji</span>
        </button>
      </div>

      {/* Heart Rate Zones (Karvonen) */}
      <div className="liquid-glass p-4 space-y-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider accent-text">
            Fizjologia Tętna
          </span>
          <h3 className="text-sm font-bold txt-main">Strefy Tętna (Formuła Karvonena)</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="liquid-pill p-2.5 flex items-center justify-between border-l-4 border-emerald-400">
            <div>
              <div className="font-bold txt-main">{zones.zone1.name}</div>
              <div className="text-[10px] txt-muted">{zones.zone1.desc}</div>
            </div>
            <span className="font-bold txt-main ios-num">{zones.zone1.min} - {zones.zone1.max} bpm</span>
          </div>

          <div className="liquid-pill p-2.5 flex items-center justify-between border-l-4 border-green-500">
            <div>
              <div className="font-bold accent-text">{zones.zone2.name}</div>
              <div className="text-[10px] txt-muted">{zones.zone2.desc}</div>
            </div>
            <span className="font-bold accent-text ios-num">{zones.zone2.min} - {zones.zone2.max} bpm</span>
          </div>

          <div className="liquid-pill p-2.5 flex items-center justify-between border-l-4 border-amber-400">
            <div>
              <div className="font-bold txt-main">{zones.zone3.name}</div>
              <div className="text-[10px] txt-muted">{zones.zone3.desc}</div>
            </div>
            <span className="font-bold txt-main ios-num">{zones.zone3.min} - {zones.zone3.max} bpm</span>
          </div>

          <div className="liquid-pill p-2.5 flex items-center justify-between border-l-4 border-orange-500">
            <div>
              <div className="font-bold txt-main">{zones.zone4.name}</div>
              <div className="text-[10px] txt-muted">{zones.zone4.desc}</div>
            </div>
            <span className="font-bold txt-main ios-num">{zones.zone4.min} - {zones.zone4.max} bpm</span>
          </div>

          <div className="liquid-pill p-2.5 flex items-center justify-between border-l-4 border-rose-500">
            <div>
              <div className="font-bold txt-main">{zones.zone5.name}</div>
              <div className="text-[10px] txt-muted">{zones.zone5.desc}</div>
            </div>
            <span className="font-bold txt-main ios-num">{zones.zone5.min} - {zones.zone5.max} bpm</span>
          </div>
        </div>
      </div>

      {/* Hydration Tracker Card */}
      <div className="liquid-glass p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text">
              Kalkulator Nawodnienia
            </span>
            <h3 className="text-sm font-bold txt-main">Zapotrzebowanie na Płyny</h3>
          </div>
          <span className="text-xl">💧</span>
        </div>
        <p className="text-[11px] txt-sub leading-snug">
          Wyliczane na podstawie masy {profile.weight} kg, temperatury powietrza ({weather?.temp || 20}°C) i ostatniego dystansu ({lastRun?.distanceKm || 0} km).
        </p>
        <div className="liquid-pill p-3 flex items-center justify-between text-xs font-bold">
          <span className="txt-muted">Zalecana ilość wody dzisiaj:</span>
          <span className="text-base font-black accent-text ios-num">
            {(hydration / 1000).toFixed(2)} Litra
          </span>
        </div>
      </div>

      {/* MODAL: INSTAGRAM STORY CARD */}
      {showIgCard && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-ios"
        >
          <div className="w-full max-w-xs space-y-3 animate-ios-modal">
            {/* The Visual Story Card */}
            <div className="liquid-glass p-5 rounded-3xl border-2 border-[var(--accent)] space-y-4 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#161a29] to-[#090b10]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏃</span>
                  <div>
                    <div className="text-xs font-black txt-main">{profile.name}</div>
                    <div className="text-[9px] accent-text uppercase font-bold">Running Planer AI</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full accent-badge">
                  {profile.bamboos} 🎋
                </span>
              </div>

              <div className="text-center py-2 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest txt-muted">Ostatni Bieg</span>
                <div className="text-3xl font-black accent-text ios-num">
                  {lastRun ? `${lastRun.distanceKm} KM` : '7.2 KM'}
                </div>
                <div className="text-xs font-semibold txt-sub">
                  Tempo: {lastRun ? `${lastRun.avgPace} min/km` : '5:41 min/km'} • HR: {lastRun ? `${lastRun.avgHr} bpm` : '142 bpm'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="liquid-pill p-2">
                  <span className="text-[9px] txt-muted block">VO2 max</span>
                  <span className="font-black txt-main">{profile.vo2max}</span>
                </div>
                <div className="liquid-pill p-2">
                  <span className="text-[9px] txt-muted block">Kadencja</span>
                  <span className="font-black txt-main">{lastRun ? `${lastRun.avgCadence} spm` : '177 spm'}</span>
                </div>
              </div>

              <div className="text-center text-[10px] txt-muted border-t border-white/10 pt-2">
                „{profile.targetGoal}”
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIgCard(false)}
              className="w-full py-2.5 rounded-full liquid-pill font-bold text-xs txt-main hover:text-white"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
