import React from 'react';
import { UserAccount } from '../types.ts';
import { AppIcon } from '../components/icons/AppIcon.tsx';

interface WelcomeScreenProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onSelectSavedAccount: (account: UserAccount) => void;
  onContinueAsGuest: () => void;
  savedAccounts: UserAccount[];
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onOpenAuth,
  onSelectSavedAccount,
  onContinueAsGuest,
  savedAccounts,
}) => {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-5 relative overflow-x-hidden animate-ios">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-[var(--accent)] opacity-15 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-20 left-10 w-60 h-60 bg-emerald-500 opacity-10 blur-[90px] pointer-events-none rounded-full" />

      {/* Top Bar / Logo */}
      <header className="relative z-10 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AppIcon size="lg" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider accent-text block">
              Fizjologia & Biomechanika 2027
            </span>
            <h1 className="text-lg font-black txt-main tracking-tight flex items-center gap-1.5">
              <span>Treda</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] accent-text border border-[var(--accent-border)] font-bold">
                PRO AI
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl liquid-pill txt-main hover:text-white transition-all active:scale-95 border border-white/10"
        >
          Zaloguj się
        </button>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 py-6 space-y-5">
        <div className="space-y-2 text-center pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] txt-sub">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gotowy do analizy Garmin, Strava, Polar i Apple</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black txt-main tracking-tight leading-tight">
            Twój Osobisty Trener Biegowy & Laboratorium Ruchu
          </h2>

          <p className="text-xs txt-sub max-w-xs mx-auto leading-relaxed">
            Spersonalizowana periodyzacja pod VO2max, tętno i zawody. Kompletna telemetria: kadencja, GTC i wirtualna szafa butów.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1 hover:border-white/20 transition-all">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-black">
              🧠
            </div>
            <h3 className="text-xs font-bold txt-main">Mikrocykle AI</h3>
            <p className="text-[10px] txt-muted leading-snug">
              Treningi Z2/Z4 dopasowane do Twojego VO2max i regeneracji.
            </p>
          </div>

          <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1 hover:border-white/20 transition-all">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-black">
              📊
            </div>
            <h3 className="text-xs font-bold txt-main">GTC & Kadencja</h3>
            <p className="text-[10px] txt-muted leading-snug">
              Czas kontaktu z ziemią (ms), oscylacja pionowa i bilans L/P.
            </p>
          </div>

          <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1 hover:border-white/20 transition-all">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black">
              👟
            </div>
            <h3 className="text-xs font-bold txt-main">Szafa Biegowa</h3>
            <p className="text-[10px] txt-muted leading-snug">
              Liczniki kilometrów pianki, rotacja dropu i dobór pod tempo.
            </p>
          </div>

          <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1 hover:border-white/20 transition-all">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-black">
              ⚡
            </div>
            <h3 className="text-xs font-bold txt-main">Eko-Hub Zegarków</h3>
            <p className="text-[10px] txt-muted leading-snug">
              Import ze Strava, Garmin Connect, Polar oraz plików GPX/FIT.
            </p>
          </div>
        </div>

        {/* Saved Accounts Switcher (if any exists on this device) */}
        {savedAccounts.length > 0 && (
          <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-bold txt-muted uppercase block">
              Zaloguj na tym urządzeniu:
            </span>
            <div className="space-y-1.5">
              {savedAccounts.slice(0, 3).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectSavedAccount(acc)}
                  className="w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.email}`}
                      alt={acc.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold txt-main truncate">{acc.name}</div>
                      <div className="text-[10px] txt-muted truncate">{acc.email}</div>
                    </div>
                  </div>
                  <span className="text-xs accent-text font-bold">Wejdź →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Action Footer */}
      <footer className="relative z-10 pt-2 pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => onOpenAuth('register')}
          className="w-full py-3.5 px-4 rounded-2xl accent-btn-gradient text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 transition-all"
        >
          <span>🚀</span>
          <span>Załóż Nowe Konto Biegacza</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="py-2.5 px-3 rounded-xl liquid-pill text-xs font-bold txt-main hover:text-white border border-white/15 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <span>🔑</span>
            <span>Mam już konto</span>
          </button>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold txt-sub hover:text-white flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <span>👀</span>
            <span>Tryb Demo (Gość)</span>
          </button>
        </div>

        <p className="text-[10px] text-center txt-muted pt-1">
          Bezpieczne szyfrowanie w chmurze Cloud SQL • Pełna izolacja danych użytkowników
        </p>
      </footer>
    </div>
  );
};
