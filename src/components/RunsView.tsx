import React, { useState } from 'react';
import { RunLog, PersonalBest, RunnerProfile } from '../types.ts';

interface RunsViewProps {
  runs: RunLog[];
  profile: RunnerProfile;
  personalBests?: PersonalBest[];
  onOpenAddRun: () => void;
  onUpdatePersonalBest?: (pb: PersonalBest) => void;
  onSelectRunForDetail?: (run: RunLog) => void;
}

const DEFAULT_PERSONAL_BESTS: PersonalBest[] = [
  { distanceId: '1k', distanceName: '1 km', time: '4:15', pace: '4:15 /km', date: '12.09.2026', raceOrRunName: 'Trening interwałowy Zgierz', gapToTarget: '-15s do celu' },
  { distanceId: '1mile', distanceName: '1 mila (1.61 km)', time: '7:08', pace: '4:26 /km', date: '04.10.2026', raceOrRunName: 'Sprawdzian na bieżni', gapToTarget: '-20s do celu' },
  { distanceId: '3k', distanceName: '3 km', time: '13:50', pace: '4:36 /km', date: '28.08.2026', raceOrRunName: 'Test Coopera Park Miejski', gapToTarget: '-35s do celu' },
  { distanceId: '5k', distanceName: '5 km', time: '25:00', pace: '5:00 /km', date: '14.10.2026', raceOrRunName: 'Parkrun Park Poniatowskiego', gapToTarget: 'Cel: Sub-25 min!' },
  { distanceId: '10k', distanceName: '10 km', time: '53:40', pace: '5:22 /km', date: '20.09.2026', raceOrRunName: 'Bieg Fabrykanta Łódź', gapToTarget: 'Cel: Sub-50 min' },
  { distanceId: 'half', distanceName: 'Półmaraton (21.1 km)', time: '1:59:30', pace: '5:39 /km', date: '15.05.2026', raceOrRunName: 'Półmaraton Łódź 2026', gapToTarget: 'Cel 2027: 1:52:00' },
  { distanceId: 'marathon', distanceName: 'Maraton (42.2 km)', time: '4:28:15', pace: '6:21 /km', date: '08.10.2025', raceOrRunName: 'Silesia Marathon', gapToTarget: 'Cel: Sub-4h w 2027' },
];

export const RunsView: React.FC<RunsViewProps> = ({
  runs,
  profile,
  personalBests = DEFAULT_PERSONAL_BESTS,
  onOpenAddRun,
  onUpdatePersonalBest,
  onSelectRunForDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'pbs' | 'list'>('stats');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [editingPb, setEditingPb] = useState<PersonalBest | null>(null);

  const totalKm = runs.reduce((acc, r) => acc + r.distanceKm, 0);
  const avgPaceSec = runs.length > 0
    ? Math.round(runs.reduce((acc, r) => {
        const parts = r.avgPace.split(':');
        return acc + (parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0));
      }, 0) / runs.length)
    : 330;
  const pMin = Math.floor(avgPaceSec / 60);
  const pSec = avgPaceSec % 60;
  const avgPaceOverall = `${pMin}:${pSec < 10 ? '0' : ''}${pSec}`;

  const avgHeartRate = runs.length > 0
    ? Math.round(runs.reduce((acc, r) => acc + (r.avgHr || 150), 0) / runs.length)
    : 152;

  // Chart data points
  const recentRuns = [...runs].reverse().slice(-7);
  const pacePoints = recentRuns.map((r) => {
    const parts = r.avgPace.split(':');
    return parseFloat((parseInt(parts[0], 10) + (parseInt(parts[1], 10) || 0) / 60).toFixed(2));
  });
  const hrPoints = recentRuns.map((r) => r.avgHr);
  const hrMaxPoints = recentRuns.map((r) => r.maxHr || r.avgHr + 14);
  const distancePoints = recentRuns.map((r) => r.distanceKm);
  const cadencePoints = recentRuns.map((r) => r.avgCadence || 176);
  const gctPoints = recentRuns.map((r) => r.gctMs || 234);
  const vertOscPoints = recentRuns.map((r) => r.verticalOscillationCm || 8.0);
  const vertRatioPoints = recentRuns.map((r) => r.verticalRatioPercent || 7.5);

  // VO2 max trend projection
  const vo2Trend = [31.2, 31.6, 32.1, 32.4, 32.7, 33.0, (profile.vo2max || 33.0)];

  return (
    <div className="space-y-4 px-4 pb-28 animate-ios">
      {/* Top Header Card */}
      <div className="liquid-glass p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider accent-text">
            Analityka Formy & Telemetria
          </span>
          <h2 className="text-xl font-black txt-main">Biegi & Statystyki</h2>
          <div className="text-[11px] txt-muted mt-0.5">
            Łącznie: <strong className="txt-main">{totalKm.toFixed(1)} km</strong> • Śr. tempo: <strong className="txt-main">{avgPaceOverall}/km</strong> • Śr. tętno: <strong className="txt-main">{avgHeartRate} bpm</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddRun}
          aria-label="Dodaj bieg"
          className="liquid-active px-3.5 py-2 text-xs font-black shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Dodaj bieg</span>
        </button>
      </div>

      {/* Sub-Navigation: Statystyki/Wykresy vs Rekordy Życiowe PB vs Dziennik */}
      <div className="grid grid-cols-3 gap-1.5 p-1 liquid-glass rounded-2xl text-center text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'stats'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>📊</span>
          <span>Wykresy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pbs')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'pbs'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>🏆</span>
          <span>Rekordy PB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`py-2 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'list'
              ? 'accent-tab-active font-black shadow-sm'
              : 'txt-sub hover:text-white'
          }`}
        >
          <span>📋</span>
          <span>Dziennik ({runs.length})</span>
        </button>
      </div>

      {/* 1. TAB: WYKRESY & STATYSTYKI */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Wykres 1: Tempo w czasie (min/km) */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Krzywa Prędkości
                </span>
                <h3 className="text-sm font-black txt-main">Trend Tempa (min/km)</h3>
              </div>
              <span className="text-xs font-black txt-main ios-num bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                Śr: {avgPaceOverall} /km
              </span>
            </div>

            {/* SVG Interactive Line Chart for Pace */}
            <div className="relative h-40 w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 340 120">
                <defs>
                  <linearGradient id="paceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal guide lines */}
                <line x1="0" y1="20" x2="340" y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="340" y2="60" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="340" y2="100" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                {/* Path line */}
                {recentRuns.length > 1 && (
                  <>
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const paceVal = pacePoints[i] || 5.5;
                        const y = Math.min(105, Math.max(15, (paceVal - 4.8) * 100));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d={`${recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const paceVal = pacePoints[i] || 5.5;
                        const y = Math.min(105, Math.max(15, (paceVal - 4.8) * 100));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')} L ${(recentRuns.length - 1) * (320 / (recentRuns.length - 1)) + 10} 115 L 10 115 Z`}
                      fill="url(#paceGrad)"
                    />
                  </>
                )}

                {/* Data Points */}
                {recentRuns.map((r, i) => {
                  const x = (i / (recentRuns.length - 1 || 1)) * 320 + 10;
                  const paceVal = pacePoints[i] || 5.5;
                  const y = Math.min(105, Math.max(15, (paceVal - 4.8) * 100));
                  return (
                    <g key={r.id}>
                      <circle cx={x} cy={y} r="5" fill="var(--accent)" stroke="#000" strokeWidth="2" />
                      <text x={x} y={y - 8} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {r.avgPace}
                      </text>
                      <text x={x} y="118" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">
                        {r.date.slice(0, 5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] txt-muted pt-1">
              <span>Szybciej (5:00/km)</span>
              <span>Spokojniej (6:00/km)</span>
            </div>
          </div>

          {/* Wykres 2: Średnie i Maksymalne Tętno (HR bpm) */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Kardiologia Wysiłkowa
                </span>
                <h3 className="text-sm font-black txt-main">Tętno Średnie & Maksymalne (bpm)</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Max
                </span>
                <span className="flex items-center gap-1 accent-text font-bold">
                  <span className="w-2 h-2 rounded-full accent-bg"></span> Średnie
                </span>
              </div>
            </div>

            <div className="relative h-36 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 340 110">
                <line x1="0" y1="25" x2="340" y2="25" stroke="rgba(244,63,94,0.2)" strokeDasharray="2 2" />
                <line x1="0" y1="75" x2="340" y2="75" stroke="rgba(16,185,129,0.2)" strokeDasharray="2 2" />

                {/* Avg HR path */}
                {recentRuns.length > 1 && (
                  <>
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const y = 100 - ((r.avgHr - 120) / 70) * 85;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Max HR path */}
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const maxVal = r.maxHr || r.avgHr + 14;
                        const y = 100 - ((maxVal - 120) / 70) * 85;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {recentRuns.map((r, i) => {
                  const x = (i / (recentRuns.length - 1 || 1)) * 320 + 10;
                  const y = 100 - ((r.avgHr - 120) / 70) * 85;
                  return (
                    <g key={r.id}>
                      <circle cx={x} cy={y} r="4" fill="#10b981" stroke="#000" strokeWidth="1.5" />
                      <text x={x} y={y - 7} fill="#10b981" fontSize="9" fontWeight="black" textAnchor="middle">
                        {r.avgHr}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] txt-muted">
              <span>Próg beztlenowy: ~165 bpm</span>
              <span>HRmax: {profile.hrMax} bpm</span>
            </div>
          </div>

          {/* Wykres 3: Progresja VO2 Max */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Wydolność Tlenowa
                </span>
                <h3 className="text-sm font-black txt-main">Krzywa Wzrostu VO2 Max</h3>
              </div>
              <span className="text-xs font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                +1.8 ml/kg/min w 6 tyg.
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2 items-end h-28">
              {vo2Trend.map((val, idx) => {
                const heightPct = Math.round(((val - 28) / 10) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-black txt-main ios-num">{val}</span>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        idx === vo2Trend.length - 1
                          ? 'bg-gradient-to-t from-sky-500 to-indigo-400 shadow-lg'
                          : 'bg-white/10'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] txt-muted">T{idx + 1}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] txt-muted text-center pt-1">
              Estymacja na podstawie stosunku prędkości do tętna w Strefie 2.
            </p>
          </div>

          {/* Wykres 4: Rozkład Stref Tętna (Strefy 1 - 5) */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                  Model Spolaryzowany 80/20
                </span>
                <h3 className="text-sm font-black txt-main">Rozkład Stref Tętna</h3>
              </div>
              <span className="text-[10px] font-bold accent-text">Zdrowa baza tlenowa</span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="txt-sub">Strefa 1 • Regeneracja (do 130 bpm)</span>
                  <span className="font-bold txt-main">22% (48 min)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-400 h-full rounded-full" style={{ width: '22%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="accent-text font-bold">Strefa 2 • Baza Tlenowa (131–148 bpm)</span>
                  <span className="font-bold accent-text">58% (128 min)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="accent-bg h-full rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="txt-sub">Strefa 3 • Tempo (149–162 bpm)</span>
                  <span className="font-bold txt-main">12% (26 min)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="txt-sub">Strefa 4 • Próg Mleczanowy (163–175 bpm)</span>
                  <span className="font-bold txt-main">6% (13 min)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full rounded-full" style={{ width: '6%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="txt-sub">Strefa 5 • Anaerobowa (&gt;175 bpm)</span>
                  <span className="font-bold txt-main">2% (4 min)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: '2%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Wykres 5: Kadencja Biegu (Cadence - Rytm Kroków spm) */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  Rytm i Ekonomia Kroku
                </span>
                <h3 className="text-sm font-black txt-main">Kadencja Biegowa (spm)</h3>
              </div>
              <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Śr: {Math.round(cadencePoints.reduce((a, b) => a + b, 0) / (cadencePoints.length || 1))} spm
              </span>
            </div>

            <div className="relative h-36 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 340 110">
                <defs>
                  <linearGradient id="cadenceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Optimal 170-185 spm Corridor Band */}
                <rect x="0" y="20" width="340" height="50" fill="rgba(34, 211, 238, 0.07)" rx="4" />
                <line x1="0" y1="20" x2="340" y2="20" stroke="rgba(34,211,238,0.25)" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="340" y2="70" stroke="rgba(34,211,238,0.25)" strokeDasharray="3 3" />
                <text x="335" y="17" fill="rgba(34,211,238,0.7)" fontSize="7.5" fontWeight="bold" textAnchor="end">
                  185 spm
                </text>
                <text x="335" y="67" fill="rgba(34,211,238,0.7)" fontSize="7.5" fontWeight="bold" textAnchor="end">
                  170 spm (optimum)
                </text>

                {/* Cadence Curve */}
                {recentRuns.length > 1 && (
                  <>
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const cad = r.avgCadence || 176;
                        // Map 165 -> 95, 185 -> 20
                        const y = Math.min(100, Math.max(15, 95 - ((cad - 165) / 22) * 75));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={`${recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const cad = r.avgCadence || 176;
                        const y = Math.min(100, Math.max(15, 95 - ((cad - 165) / 22) * 75));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')} L ${(recentRuns.length - 1) * (320 / (recentRuns.length - 1)) + 10} 105 L 10 105 Z`}
                      fill="url(#cadenceGrad)"
                    />
                  </>
                )}

                {/* Cadence Data Points */}
                {recentRuns.map((r, i) => {
                  const x = (i / (recentRuns.length - 1 || 1)) * 320 + 10;
                  const cad = r.avgCadence || 176;
                  const y = Math.min(100, Math.max(15, 95 - ((cad - 165) / 22) * 75));
                  return (
                    <g key={`cad-${r.id}`}>
                      <circle cx={x} cy={y} r="4" fill="#22d3ee" stroke="#000" strokeWidth="1.5" />
                      <text x={x} y={y - 7} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {cad}
                      </text>
                      <text x={x} y="108" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">
                        {r.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] txt-muted pt-1">
              <span>Rekomendacja: 175-182 spm chroni stawy kolanowe</span>
              <span className="text-cyan-400 font-bold">Kroki/min</span>
            </div>
          </div>

          {/* Wykres 6: Czas Kontaktu z Podłożem (GTC - Ground Contact Time w ms) */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Dynamika i Sprężystość Odbicia
                </span>
                <h3 className="text-sm font-black txt-main">Czas Kontaktu z Podłożem (GTC)</h3>
              </div>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Śr: {Math.round(gctPoints.reduce((a, b) => a + b, 0) / (gctPoints.length || 1))} ms
              </span>
            </div>

            <div className="relative h-36 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 340 110">
                <defs>
                  <linearGradient id="gctGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Elite stiffness line: <240 ms */}
                <line x1="0" y1="50" x2="340" y2="50" stroke="rgba(16,185,129,0.3)" strokeDasharray="3 3" />
                <text x="335" y="46" fill="rgba(16,185,129,0.8)" fontSize="7.5" fontWeight="bold" textAnchor="end">
                  235 ms (strefa sprężysta)
                </text>

                {/* GTC Curve */}
                {recentRuns.length > 1 && (
                  <>
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const gct = r.gctMs || 234;
                        // Lower GTC = better = higher point
                        // Map 215ms -> 20, 260ms -> 95
                        const y = Math.min(100, Math.max(15, 20 + ((gct - 215) / 45) * 75));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={`${recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const gct = r.gctMs || 234;
                        const y = Math.min(100, Math.max(15, 20 + ((gct - 215) / 45) * 75));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')} L ${(recentRuns.length - 1) * (320 / (recentRuns.length - 1)) + 10} 105 L 10 105 Z`}
                      fill="url(#gctGrad)"
                    />
                  </>
                )}

                {/* GTC Points */}
                {recentRuns.map((r, i) => {
                  const x = (i / (recentRuns.length - 1 || 1)) * 320 + 10;
                  const gct = r.gctMs || 234;
                  const y = Math.min(100, Math.max(15, 20 + ((gct - 215) / 45) * 75));
                  return (
                    <g key={`gct-${r.id}`}>
                      <circle cx={x} cy={y} r="4" fill="#10b981" stroke="#000" strokeWidth="1.5" />
                      <text x={x} y={y - 7} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {gct} ms
                      </text>
                      <text x={x} y="108" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">
                        {r.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Asymmetry L/P Balance Bar */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold txt-muted">Bilans Symetrii Lewa / Prawa Strona:</span>
                <span className="text-emerald-400 font-black">
                  {recentRuns[0]?.groundContactBalancePercent || '50.1% L / 49.9% P (Idealna)'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 flex overflow-hidden">
                <div style={{ width: '50.1%' }} className="bg-emerald-400" title="Lewa stopa 50.1%" />
                <div style={{ width: '49.9%' }} className="bg-teal-400" title="Prawa stopa 49.9%" />
              </div>
              <div className="flex justify-between text-[8px] txt-muted">
                <span>Lewa noga (50.1%)</span>
                <span>Margines normy: ±1.5%</span>
                <span>Prawa noga (49.9%)</span>
              </div>
            </div>
          </div>

          {/* Wykres 7: Odchylenie Pionowe (Vertical Oscillation w cm) & Vertical Ratio */}
          <div className="liquid-glass p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                  Biomechanika Ruchu Wertykalnego
                </span>
                <h3 className="text-sm font-black txt-main">Odchylenie Pionowe & Stosunek do Kroku</h3>
              </div>
              <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                Śr: {(vertOscPoints.reduce((a, b) => a + b, 0) / (vertOscPoints.length || 1)).toFixed(1)} cm
              </span>
            </div>

            <div className="relative h-36 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 340 110">
                <defs>
                  <linearGradient id="vertGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Optimal zone guide: 6.5 - 8.5 cm */}
                <rect x="0" y="30" width="340" height="40" fill="rgba(192, 132, 252, 0.08)" rx="4" />
                <line x1="0" y1="50" x2="340" y2="50" stroke="rgba(192,132,252,0.3)" strokeDasharray="3 3" />
                <text x="335" y="46" fill="rgba(192,132,252,0.8)" fontSize="7.5" fontWeight="bold" textAnchor="end">
                  8.0 cm (idealny pułap)
                </text>

                {/* Vertical Oscillation Line */}
                {recentRuns.length > 1 && (
                  <>
                    <path
                      d={recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const osc = r.verticalOscillationCm || 8.0;
                        // Map 6.5 cm -> 85, 9.5 cm -> 20
                        const y = Math.min(100, Math.max(15, 85 - ((osc - 6.5) / 3.0) * 65));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={`${recentRuns.map((r, i) => {
                        const x = (i / (recentRuns.length - 1)) * 320 + 10;
                        const osc = r.verticalOscillationCm || 8.0;
                        const y = Math.min(100, Math.max(15, 85 - ((osc - 6.5) / 3.0) * 65));
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')} L ${(recentRuns.length - 1) * (320 / (recentRuns.length - 1)) + 10} 105 L 10 105 Z`}
                      fill="url(#vertGrad)"
                    />
                  </>
                )}

                {/* Points */}
                {recentRuns.map((r, i) => {
                  const x = (i / (recentRuns.length - 1 || 1)) * 320 + 10;
                  const osc = r.verticalOscillationCm || 8.0;
                  const y = Math.min(100, Math.max(15, 85 - ((osc - 6.5) / 3.0) * 65));
                  return (
                    <g key={`vert-${r.id}`}>
                      <circle cx={x} cy={y} r="4" fill="#c084fc" stroke="#000" strokeWidth="1.5" />
                      <text x={x} y={y - 7} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {osc} cm
                      </text>
                      <text x={x} y="108" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">
                        {r.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Vertical Ratio Summary Pill */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
              <div className="p-2 rounded-xl liquid-pill">
                <span className="text-[9px] txt-muted block uppercase">Współczynnik Odchylenia (VR)</span>
                <span className="text-sm font-black text-purple-400 ios-num">
                  {(vertRatioPoints.reduce((a, b) => a + b, 0) / (vertRatioPoints.length || 1)).toFixed(1)}%
                </span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">&lt;8.0% (Ekonomiczny bieg)</span>
              </div>
              <div className="p-2 rounded-xl liquid-pill">
                <span className="text-[9px] txt-muted block uppercase">Wektor Energii</span>
                <span className="text-sm font-black txt-main ios-num">Poziomy 92.4%</span>
                <span className="text-[9px] text-cyan-400 block mt-0.5">Minimalne straty w pionie</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: REKORDY ŻYCIOWE (PB) */}
      {activeTab === 'pbs' && (
        <div className="space-y-4">
          <div className="liquid-glass p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Oficjalne Życiówki Zawodnika
              </span>
              <h3 className="text-base font-black txt-main">Ściana Rekordów PB</h3>
              <p className="text-[11px] txt-muted">
                Zarejestrowane oficjalne rekordy życiowe na dystansach od 1 km do maratonu.
              </p>
            </div>
            <span className="text-2xl">🥇</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personalBests.map((pb) => (
              <div
                key={pb.distanceId}
                className="liquid-glass p-4 space-y-2 border border-white/10 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {pb.distanceName}
                  </span>
                  <span className="text-[10px] txt-muted font-medium">{pb.date}</span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-black txt-main ios-num tracking-tight">
                    {pb.time}
                  </span>
                  <span className="text-xs font-bold txt-sub">
                    tempo {pb.pace}
                  </span>
                </div>

                {pb.raceOrRunName && (
                  <div className="text-[11px] txt-sub truncate">
                    📍 {pb.raceOrRunName}
                  </div>
                )}

                {pb.gapToTarget && (
                  <div className="p-2 rounded-xl bg-white/5 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>{pb.gapToTarget}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setEditingPb(pb)}
                  className="w-full py-1.5 rounded-xl liquid-pill text-[10px] font-bold txt-sub hover:text-white hover:border-amber-400 transition-all mt-1"
                >
                  ✏️ Edytuj Rekord
                </button>
              </div>
            ))}
          </div>

          {/* Edit PB Modal */}
          {editingPb && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="liquid-glass max-w-sm w-full p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black txt-main">Edytuj Rekord: {editingPb.distanceName}</h4>
                  <button type="button" onClick={() => setEditingPb(null)} className="text-xs txt-sub hover:text-white">✕</button>
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Czas oficjalny (np. 24:45)</label>
                  <input
                    type="text"
                    value={editingPb.time}
                    onChange={(e) => setEditingPb({ ...editingPb, time: e.target.value })}
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] txt-muted block mb-1">Miejsce / Zawody</label>
                  <input
                    type="text"
                    value={editingPb.raceOrRunName || ''}
                    onChange={(e) => setEditingPb({ ...editingPb, raceOrRunName: e.target.value })}
                    className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdatePersonalBest) onUpdatePersonalBest(editingPb);
                    setEditingPb(null);
                  }}
                  className="w-full py-2.5 rounded-xl accent-bg text-black font-black text-xs shadow-lg mt-2"
                >
                  Zapisz Rekord PB
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: PEŁNY DZIENNIK BIEGÓW */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="liquid-glass p-8 text-center space-y-3">
              <div className="text-4xl">👟</div>
              <h3 className="text-sm font-bold txt-main">Brak zarejestrowanych biegów</h3>
              <p className="text-xs txt-sub max-w-xs mx-auto">
                Kliknij "+ Dodaj bieg" lub zsynchronizuj konto Strava w Ustawieniach, aby zaimportować aktywności.
              </p>
            </div>
          ) : (
            runs.map((run) => {
              const isSelected = selectedRunId === run.id;
              return (
                <div
                  key={run.id}
                  className="liquid-glass p-4 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full accent-bg/20 border border-[var(--accent)] flex items-center justify-center text-sm shrink-0">
                        🏃
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black txt-main ios-num">
                            {run.distanceKm} km
                          </span>
                          {run.sourceApp && run.sourceApp !== 'manual' && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full accent-badge uppercase">
                              {run.sourceApp}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] txt-muted">
                          {run.date} {run.title ? `• ${run.title}` : ''}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black accent-text ios-num">
                      {run.avgPace} min/km
                    </span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 rounded-xl liquid-pill text-center text-xs">
                    <div>
                      <span className="text-[9px] txt-muted block uppercase">Czas</span>
                      <span className="font-bold txt-main ios-num">{run.durationMin} min</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block uppercase">Tętno</span>
                      <span className="font-bold text-rose-400 ios-num">{run.avgHr} bpm</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block uppercase">Kadencja</span>
                      <span className="font-bold text-cyan-400 ios-num">{run.avgCadence} spm</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block uppercase">GTC</span>
                      <span className="font-bold text-emerald-400 ios-num">{run.gctMs || 232} ms</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block uppercase">Odchylenie</span>
                      <span className="font-bold text-purple-400 ios-num">{run.verticalOscillationCm || 8.0} cm</span>
                    </div>
                  </div>

                  {/* AI Analysis Badges & Dropdown */}
                  {run.analysis && (
                    <div className="p-3 rounded-2xl border accent-soft-border accent-soft-bg space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black accent-text flex items-center gap-1 text-[11px]">
                          <span>🤖</span>
                          <span>Diagnoza Trenera AI</span>
                        </span>
                        <span className="text-[10px] font-bold text-white/80">
                          Dryf tętna: {run.analysis.cardiacDriftPercent || 3.4}%
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div>
                          <strong className="accent-text block">✅ Co poszło super:</strong>
                          <ul className="list-disc list-inside text-white/90 space-y-0.5">
                            {run.analysis.whatWentWell.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong className="text-amber-300 block">⚠️ Co poszło nie tak:</strong>
                          <ul className="list-disc list-inside text-white/90 space-y-0.5">
                            {run.analysis.whatWentWrong.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2 rounded-xl bg-black/40 border border-white/10 mt-1">
                          <span className="text-[10px] font-black accent-text uppercase block">
                            🔄 Adaptacja Planu Treningowego:
                          </span>
                          <p className="text-[11px] txt-sub mt-0.5">
                            {run.analysis.planAdaptation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Km Splits Toggle */}
                  {run.splits && run.splits.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                        className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>{isSelected ? '▲ Ukryj międzyczasy' : '▼ Pokaż międzyczasy (km po km)'}</span>
                      </button>

                      {isSelected && (
                        <div className="mt-2 space-y-1 text-[10px] animate-ios">
                          {run.splits.map((s) => (
                            <div key={s.km} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                              <span className="font-bold txt-main">KM {s.km}</span>
                              <span className="txt-sub">Tempo: <strong>{s.pace}</strong></span>
                              <span className="text-rose-400">Tętno: <strong>{s.hr} bpm</strong></span>
                              <span className="txt-muted">+{s.elevation}m</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] txt-muted pt-1">
                    <span>Obuwie: <strong className="txt-sub">{run.shoeName}</strong></span>
                    {onSelectRunForDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectRunForDetail(run)}
                        className="text-[10px] font-black accent-text hover:underline flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--accent)]"
                      >
                        <span>🗺️</span>
                        <span>Mapa & Pełna Telemetria ›</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
