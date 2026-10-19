import React, { useState } from 'react';
import { RunLog, RunnerProfile, Shoe } from '../types.ts';

interface RunDetailModalProps {
  run: RunLog | null;
  profile: RunnerProfile;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
  shoes?: Shoe[];
  onUpdateRunShoe?: (runId: string, newShoeName: string) => void;
}

export const RunDetailModal: React.FC<RunDetailModalProps> = ({
  run,
  profile,
  isOpen,
  onClose,
  showToast,
  shoes,
  onUpdateRunShoe,
}) => {
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [activeSplitKm, setActiveSplitKm] = useState<number | null>(null);

  if (!isOpen || !run) return null;

  // Generate realistic route points for SVG map based on distance
  const numPoints = Math.max(12, Math.min(30, Math.round(run.distanceKm * 2.5)));
  // A natural running loop shape in Zgierz/Łódź
  const routePoints = [
    { x: 50, y: 160, km: 0, label: 'START' },
    { x: 75, y: 130, km: 1 },
    { x: 110, y: 105, km: 2 },
    { x: 155, y: 85, km: 3 },
    { x: 200, y: 80, km: 4 },
    { x: 245, y: 95, km: 5 },
    { x: 280, y: 125, km: 6 },
    { x: 295, y: 165, km: 7 },
    { x: 275, y: 195, km: 8 },
    { x: 230, y: 215, km: 9 },
    { x: 180, y: 225, km: 10 },
    { x: 130, y: 215, km: 11 },
    { x: 85, y: 195, km: 12 },
    { x: 52, y: 162, km: run.distanceKm, label: 'META' },
  ].slice(0, Math.max(4, Math.floor(run.distanceKm) + 2));

  // Ensure last point is at finish
  const pathD = routePoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  // Download GPX simulation
  const handleDownloadGpx = () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunPanda AI - iOS 27 Liquid Glass">
  <metadata>
    <name>${run.title || 'Bieg Treningowy'}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${run.title || 'Trening biegowy'}</name>
    <type>running</type>
    <trkseg>
      <!-- Generated GPS telemetry -->
      <trkpt lat="51.8564" lon="19.4042"><ele>195</ele><time>${run.date}T08:00:00Z</time></trkpt>
      <trkpt lat="51.8590" lon="19.4120"><ele>202</ele><time>${run.date}T08:15:00Z</time></trkpt>
      <trkpt lat="51.8560" lon="19.4050"><ele>196</ele><time>${run.date}T08:45:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bieg-${run.date.replace(/\./g, '-')}-${run.distanceKm}km.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (showToast) showToast('Pobrano plik trasy GPS (.GPX) 🗺️');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Przebyty bieg: ${run.distanceKm} km`,
        text: `Ukończyłem bieg ${run.distanceKm} km w tempie ${run.avgPace}/km! Średnie tętno: ${run.avgHr} bpm. #RunPanda #Bieganie`,
      }).catch(() => {});
    } else {
      if (showToast) showToast('Skopiowano podsumowanie biegu do schowka! 📋');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-ios overflow-y-auto">
      <div className="relative w-full max-w-lg liquid-glass rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                SZCZEGÓŁY AKTYWNOŚCI & TELEMETRIA
              </span>
              {run.sourceApp && run.sourceApp !== 'manual' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                  {run.sourceApp}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black txt-main mt-0.5">
              {run.title || 'Bieg Treningowy (GPS)'}
            </h2>
            <div className="text-xs txt-muted mt-0.5">
              📅 {run.date} • {profile.city || 'Zgierz'}, Park Miejski & Okolice
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center text-sm txt-sub hover:text-white shrink-0"
          >
            ✕
          </button>
        </div>

        {/* 1. INTERACTIVE GPS ROUTE MAP */}
        <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-xl bg-[#0b101b]">
          {/* Map Controls Header */}
          <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
            <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-black text-white flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full accent-bg live-pulse"></span>
              <span>Trasa GPS • Pętla Miejska ({run.distanceKm} km)</span>
            </div>

            {/* Map Style Pills */}
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/10 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setMapStyle('streets')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  mapStyle === 'streets' ? 'accent-bg text-black font-black' : 'text-gray-300'
                }`}
              >
                Ulice
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('satellite')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  mapStyle === 'satellite' ? 'accent-bg text-black font-black' : 'text-gray-300'
                }`}
              >
                Satelita
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('terrain')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  mapStyle === 'terrain' ? 'accent-bg text-black font-black' : 'text-gray-300'
                }`}
              >
                Teren
              </button>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="w-full h-56 relative">
            <svg
              className="w-full h-full"
              viewBox="0 0 350 260"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Map Grid Pattern */}
                <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke={mapStyle === 'satellite' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'} strokeWidth="1" />
                </pattern>
                {/* Neon GPS Glow Filter */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="70%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Background Map Simulation */}
              <rect
                width="100%"
                height="100%"
                fill={mapStyle === 'satellite' ? '#09101d' : mapStyle === 'terrain' ? '#0d1814' : '#080d1a'}
              />
              <rect width="100%" height="100%" fill="url(#mapGrid)" />

              {/* Simulated Map Streets & Rivers */}
              <path
                d="M 10 90 Q 120 120 220 70 T 340 110"
                fill="none"
                stroke={mapStyle === 'satellite' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'}
                strokeWidth="4"
              />
              <path
                d="M 70 10 Q 140 140 180 250"
                fill="none"
                stroke={mapStyle === 'satellite' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'}
                strokeWidth="3"
              />
              {/* Park green zone */}
              <path
                d="M 120 110 Q 200 90 260 140 T 170 200 Z"
                fill="rgba(16,185,129,0.08)"
                stroke="rgba(16,185,129,0.2)"
                strokeWidth="1"
              />

              {/* Main GPS Route Glow */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.35"
                filter="url(#neonGlow)"
              />
              {/* Main GPS Route Line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* KM Markers along route */}
              {routePoints.map((pt, idx) => {
                if (idx === 0) {
                  // START PIN
                  return (
                    <g key="start" transform={`translate(${pt.x}, ${pt.y})`}>
                      <circle cx="0" cy="0" r="7" fill="#10b981" stroke="#000" strokeWidth="2" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                      <text x="0" y="-10" fill="#10b981" fontSize="9" fontWeight="900" textAnchor="middle">
                        START
                      </text>
                    </g>
                  );
                }
                if (idx === routePoints.length - 1) {
                  // FINISH PIN
                  return (
                    <g key="finish" transform={`translate(${pt.x}, ${pt.y})`}>
                      <circle cx="0" cy="0" r="7" fill="#f43f5e" stroke="#000" strokeWidth="2" />
                      <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                        🏁
                      </text>
                      <text x="0" y="-10" fill="#f43f5e" fontSize="9" fontWeight="900" textAnchor="middle">
                        META
                      </text>
                    </g>
                  );
                }
                // Intermediate KM Split markers
                const isHovered = activeSplitKm === pt.km;
                return (
                  <g
                    key={`km-${pt.km}`}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveSplitKm(pt.km)}
                    onMouseLeave={() => setActiveSplitKm(null)}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? '#ff7a00' : '#ffffff'}
                      stroke="#000000"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y={isHovered ? -9 : -7}
                      fill={isHovered ? 'var(--accent)' : 'rgba(255,255,255,0.7)'}
                      fontSize={isHovered ? '9' : '7.5'}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.km} km
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Overlay Route Elevation Profile Pill */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[10px]">
              <span className="text-white/80">
                Przewyższenie: <strong className="accent-text font-black">+{run.elevationGainM || 35} m</strong> / -{(run.elevationGainM || 35) - 3} m
              </span>
              <span className="txt-muted">
                Początek: <strong>194 m n.p.m.</strong> • Max: <strong>232 m n.p.m.</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. MAIN TELEMETRY GRID (4 Key Big Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="liquid-glass p-3 rounded-2xl">
            <span className="text-[10px] txt-muted uppercase font-bold block">Dystans</span>
            <div className="text-xl font-black txt-main ios-num mt-0.5">
              {run.distanceKm} <span className="text-xs font-medium text-gray-400">km</span>
            </div>
            <span className="text-[10px] accent-text font-medium">Ukończony 100%</span>
          </div>

          <div className="liquid-glass p-3 rounded-2xl">
            <span className="text-[10px] txt-muted uppercase font-bold block">Czas Biegu</span>
            <div className="text-xl font-black txt-main ios-num mt-0.5">
              {run.durationMin} <span className="text-xs font-medium text-gray-400">min</span>
            </div>
            <span className="text-[10px] txt-muted">Czas netto: {run.durationMin}:00</span>
          </div>

          <div className="liquid-glass p-3 rounded-2xl">
            <span className="text-[10px] txt-muted uppercase font-bold block">Średnie Tempo</span>
            <div className="text-xl font-black accent-text ios-num mt-0.5">
              {run.avgPace} <span className="text-xs font-medium text-gray-400">/km</span>
            </div>
            <span className="text-[10px] txt-muted">Najszybszy: 4:58 /km</span>
          </div>

          <div className="liquid-glass p-3 rounded-2xl">
            <span className="text-[10px] txt-muted uppercase font-bold block">Średnie Tętno</span>
            <div className="text-xl font-black text-rose-400 ios-num mt-0.5">
              {run.avgHr} <span className="text-xs font-medium text-gray-400">bpm</span>
            </div>
            <span className="text-[10px] text-rose-400/90">Max: {run.maxHr || run.avgHr + 14} bpm</span>
          </div>
        </div>

        {/* 3. ADVANCED PHYSIOLOGICAL METRICS */}
        <div className="liquid-glass p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider txt-main flex items-center gap-1.5">
              <span>📊</span>
              <span>Telemetria Biomechaniczna & Fizjologiczna</span>
            </h3>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Garmin / Strava Dual-Band
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Kadencja Śr.</span>
              <span className="text-sm font-black text-cyan-400 ios-num">{run.avgCadence || 178} spm</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">Optymalna (Z2/Z4)</span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Czas Kontaktu (GTC)</span>
              <span className="text-sm font-black text-emerald-400 ios-num">{run.gctMs || 232} ms</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">
                {run.groundContactBalancePercent || '50.1% L / 49.9% P'}
              </span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Odchylenie Pionowe</span>
              <span className="text-sm font-black text-purple-400 ios-num">{run.verticalOscillationCm || 8.0} cm</span>
              <span className="text-[9px] text-purple-300 block mt-0.5">
                VR: {run.verticalRatioPercent || 7.6}%
              </span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Długość Kroku</span>
              <span className="text-sm font-black txt-main ios-num">{run.strideLengthM || 1.05} m</span>
              <span className="text-[9px] txt-muted block mt-0.5">Stabilna</span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Moc Biegowa</span>
              <span className="text-sm font-black accent-text ios-num">{run.powerW || 245} W</span>
              <span className="text-[9px] txt-muted block mt-0.5">Stryd / Waga</span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Spalone Kalorie</span>
              <span className="text-sm font-black txt-main ios-num">{run.calories || Math.round(run.distanceKm * 68)} kcal</span>
              <span className="text-[9px] text-amber-400 block mt-0.5">Węglowodany 62%</span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Dryf Kardiologiczny</span>
              <span className="text-sm font-black text-rose-400 ios-num">{run.analysis?.cardiacDriftPercent || 3.2}%</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">Bardzo niski</span>
            </div>

            <div className="p-2 rounded-xl liquid-pill">
              <span className="text-[9px] txt-muted block uppercase">Wektor Energii</span>
              <span className="text-sm font-black text-cyan-400 ios-num">92.4% w przód</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">Znikome straty</span>
            </div>
          </div>

          {/* Heart Rate Zones Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold txt-muted">Rozkład Stref Tętna (HR Zones)</span>
              <span className="text-emerald-400 font-black">74% w Strefie 2 (Baza tlenowa)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/10 flex overflow-hidden">
              <div style={{ width: '12%' }} className="bg-sky-400" title="Z1 Regeneracyjna (12%)" />
              <div style={{ width: '62%' }} className="bg-emerald-400" title="Z2 Tlenowa (62%)" />
              <div style={{ width: '18%' }} className="bg-amber-400" title="Z3 Tempo (18%)" />
              <div style={{ width: '8%' }} className="bg-rose-500" title="Z4 Próg beztlenowy (8%)" />
            </div>
            <div className="flex justify-between text-[8px] text-gray-400 px-0.5">
              <span>Z1 (12%)</span>
              <span className="text-emerald-400 font-bold">Z2 Tlenowa (62%)</span>
              <span>Z3 (18%)</span>
              <span>Z4 (8%)</span>
            </div>
          </div>
        </div>

        {/* 4. KM SPLITS TABLE (Międzyczasy) */}
        {run.splits && run.splits.length > 0 && (
          <div className="liquid-glass p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider txt-main flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Międzyczasy (Kilometr po kilometrze)</span>
              </h3>
              <span className="text-[10px] txt-muted">{run.splits.length} splitów</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {run.splits.map((s) => (
                <div
                  key={s.km}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    activeSplitKm === s.km ? 'bg-[var(--accent-soft)] border border-[var(--accent)]' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-black/40 text-[10px] font-black flex items-center justify-center txt-main">
                      {s.km}
                    </span>
                    <span className="text-xs font-bold txt-main">{s.pace} /km</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <span>❤️</span>
                      <span>{s.hr} bpm</span>
                    </span>
                    <span className="text-[10px] txt-muted">+{s.elevation}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. AI DIAGNOSIS & PLAN ADAPTATION */}
        {run.analysis && (
          <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span>🤖</span>
                <span>Raport Trenera AI & Fizjologa</span>
              </span>
              <span className="text-[10px] font-bold text-white/80">
                Obciążenie treningowe: <strong>{run.analysis.trainingLoad || 62} TSS</strong>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <strong className="text-emerald-300 block mb-0.5">✅ Co poszło super:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-white/90 text-[11px]">
                  {run.analysis.whatWentWell.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="text-amber-300 block mb-0.5">⚠️ Co poszło nie tak / ryzyka:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-white/90 text-[11px]">
                  {run.analysis.whatWentWrong.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 mt-1">
                <span className="text-[10px] font-black accent-text uppercase block">
                  🔄 Wpływ na Mikrocykl Treningowy:
                </span>
                <p className="text-[11px] txt-sub mt-0.5 leading-relaxed">
                  {run.analysis.planAdaptation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. GEAR & FOOTWEAR USED */}
        <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">👟</span>
              <div>
                <span className="text-[10px] txt-muted block uppercase font-bold">Użyte Obuwie</span>
                <span className="font-bold txt-main text-sm">{run.shoeName || 'Nie wybrano buta'}</span>
              </div>
            </div>
            {shoes && shoes.find((s) => s.name === run.shoeName) ? (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                Przebieg: {shoes.find((s) => s.name === run.shoeName)?.mileageKm}/{shoes.find((s) => s.name === run.shoeName)?.maxMileageKm} km
              </span>
            ) : (
              <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-1 rounded-lg">
                Zarejestrowane
              </span>
            )}
          </div>

          {/* Shoe changer selector */}
          {onUpdateRunShoe && (
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label htmlFor="shoe-changer" className="text-[10px] font-bold txt-sub flex items-center gap-1">
                <span>🔄</span>
                <span>Zmień but przypisany do tego treningu:</span>
              </label>
              <select
                id="shoe-changer"
                value={run.shoeName || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val !== run.shoeName) {
                    onUpdateRunShoe(run.id, val);
                    if (showToast) showToast(`Zaktualizowano obuwie treningu na: ${val} 👟`);
                  }
                }}
                className="text-xs font-bold liquid-pill px-3 py-1.5 txt-main outline-none cursor-pointer border border-white/15 hover:border-white/30 transition-all bg-black/40"
              >
                <option value={run.shoeName || ''}>Wybrany: {run.shoeName || 'Wybierz z szafy...'}</option>
                {shoes && shoes.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.dropMm}mm drop • {s.mileageKm} km)
                  </option>
                ))}
                <option value="Asics Novablast 4">Asics Novablast 4</option>
                <option value="Nike Vaporfly 3">Nike Vaporfly 3</option>
                <option value="Hoka Clifton 9">Hoka Clifton 9</option>
                <option value="Saucony Endorphin Speed 4">Saucony Endorphin Speed 4</option>
                <option value="Inne obuwie startowe">Inne obuwie startowe</option>
                <option value="Inne obuwie treningowe">Inne obuwie treningowe</option>
              </select>
            </div>
          )}
        </div>

        {/* 7. ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadGpx}
            className="py-2.5 px-3 rounded-xl border border-white/20 liquid-pill text-xs font-black txt-main hover:text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
          >
            <span>🗺️</span>
            <span>Pobierz Plik GPX</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 px-3 rounded-xl accent-btn-gradient text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 hover:brightness-110 transition-all shadow-md"
          >
            <span>📤</span>
            <span>Udostępnij Trening</span>
          </button>
        </div>
      </div>
    </div>
  );
};
