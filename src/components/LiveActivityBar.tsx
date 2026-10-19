import React from 'react';
import { RunLog, RunnerProfile } from '../types.ts';

interface LiveActivityBarProps {
  lastRun: RunLog | null;
  profile: RunnerProfile;
  onOpenAddRun: () => void;
  onOpenChat: () => void;
  onOpenRunDetail?: (run: RunLog) => void;
}

export const LiveActivityBar: React.FC<LiveActivityBarProps> = ({
  lastRun,
  profile,
  onOpenAddRun,
  onOpenChat,
  onOpenRunDetail,
}) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-40 animate-ios flex items-center gap-2">
      <div className="flex-1 ios27-live-bar px-3.5 py-2.5 flex items-center justify-between shadow-2xl min-w-0">
        <div
          onClick={() => {
            if (lastRun && onOpenRunDetail) {
              onOpenRunDetail(lastRun);
            }
          }}
          className={`flex items-center gap-2 min-w-0 ${
            lastRun && onOpenRunDetail ? 'cursor-pointer hover:opacity-90 active:scale-98 transition-all' : ''
          }`}
          title={lastRun ? "Kliknij, aby otworzyć szczegóły i mapę biegu GPS 🗺️" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-black/60 border border-[var(--accent)] flex items-center justify-center text-sm shrink-0">
            🏃
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                LIVE ACTIVITY
              </span>
              <span className="w-1.5 h-1.5 rounded-full accent-bg live-pulse"></span>
              {lastRun && (
                <span className="text-[9px] font-bold text-sky-400">🗺️ Mapa</span>
              )}
            </div>
            {lastRun ? (
              <div className="text-[11px] txt-main truncate font-medium">
                <span className="font-bold">{lastRun.distanceKm} km</span> • {lastRun.avgPace}/km • {lastRun.avgHr} bpm • {lastRun.avgCadence} spm
              </div>
            ) : (
              <div className="text-[11px] txt-sub truncate">
                Brak aktywnego biegu • Cel: {profile.targetGoal.slice(0, 20)}...
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddRun}
          aria-label="Dodaj bieg do dziennika"
          className="liquid-active px-2.5 py-1 text-xs font-black shrink-0 hover:scale-105 active:scale-95 ml-2"
        >
          + Bieg
        </button>
      </div>

      {/* Floating Chat Drawer Trigger */}
      <button
        type="button"
        onClick={onOpenChat}
        aria-label="Czat z Fizjologiem AI"
        className="w-11 h-11 rounded-full accent-bg text-black shadow-2xl flex items-center justify-center font-black shrink-0 hover:scale-110 active:scale-95 transition-all ring-2 ring-white/30"
        title="Czat z Fizjologiem AI"
      >
        <span className="text-xl">🧑‍⚕️</span>
      </button>
    </div>
  );
};
