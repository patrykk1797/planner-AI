import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDisplayTimeMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDisplayTimeMs = 1200,
}) => {
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, minDisplayTimeMs);

    const removeTimer = setTimeout(() => {
      setRemoved(true);
      if (onFinish) onFinish();
    }, minDisplayTimeMs + 650);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [minDisplayTimeMs, onFinish]);

  const handleSkip = () => {
    setFading(true);
    setTimeout(() => {
      setRemoved(true);
      if (onFinish) onFinish();
    }, 300);
  };

  if (removed) return null;

  return (
    <div
      onClick={handleSkip}
      role="banner"
      aria-label="Treda Splash Screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090b10] select-none cursor-pointer overflow-hidden transition-all duration-700 ease-out ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #181d2c 0%, #090b10 65%, #050608 100%)',
      }}
    >
      {/* Dynamic ambient lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Animated circular logo */}
        <div className="relative mb-6">
          {/* Subtle pulse aura ring */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[var(--accent)] via-amber-400 to-emerald-400 opacity-40 blur-md animate-pulse" />
          
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-b from-white/20 via-white/5 to-transparent shadow-2xl backdrop-blur-xl border border-white/15 overflow-hidden flex items-center justify-center">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_hfyazthfyazthfya_bec0c212.jpg"
              alt="Treda Logo"
              className="w-full h-full object-cover rounded-2xl shadow-inner transform transition-transform duration-1000 ease-out hover:scale-105"
            />
          </div>
        </div>

        {/* Treda brand text matching header font */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span
              className="font-brand-gondens text-6xl sm:text-7xl font-black text-white tracking-wide uppercase leading-none drop-shadow-[0_4px_24px_rgba(255,122,0,0.35)]"
              style={{
                fontFamily: "'Saira Extra Condensed', 'Big Shoulders Display', 'Antonio', 'Teko', Impact, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              TREDA
            </span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] accent-text border border-[var(--accent-border)] font-black tracking-wider uppercase leading-none self-start mt-1.5 shadow-sm">
              PRO
            </span>
          </div>

          {/* Subtitle */}
          <div className="mt-3 flex items-center gap-2">
            <span className="w-6 h-[1px] bg-gradient-to-r from-transparent to-[var(--accent)] opacity-60" />
            <span className="text-xs sm:text-sm font-semibold tracking-[0.28em] uppercase text-slate-300 drop-shadow-sm">
              AI Running App
            </span>
            <span className="w-6 h-[1px] bg-gradient-to-l from-transparent to-[var(--accent)] opacity-60" />
          </div>
        </div>

        {/* Sleek dynamic loader bar */}
        <div className="mt-10 w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-[var(--accent)] to-emerald-400 rounded-full w-full animate-[shimmer_1.4s_infinite_linear]"
            style={{
              animation: 'tredaLoader 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Skip hint */}
        <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-500 font-medium">
          Dotknij, aby przejść
        </p>
      </div>

      <style>{`
        @keyframes tredaLoader {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(30%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
