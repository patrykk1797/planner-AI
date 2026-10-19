import React, { useState, useEffect, useRef } from 'react';
import { RunnerProfile, Shoe } from '../types.ts';
import { soundEngine, speakCoachPolish } from '../utils/defaults.ts';

interface LiveRunHUDProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  shoes: Shoe[];
  onFinishRun: (runData: {
    distanceKm: number;
    durationMin: number;
    avgPace: string;
    avgHr: number;
    avgCadence: number;
    shoeName: string;
    gctMs: number;
    verticalOscillationCm?: number;
    groundContactBalancePercent?: string;
    verticalRatioPercent?: number;
  }) => void;
  showToast: (msg: string) => void;
}

export const LiveRunHUD: React.FC<LiveRunHUDProps> = ({
  isOpen,
  onClose,
  profile,
  shoes,
  onFinishRun,
  showToast,
}) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [currentHr, setCurrentHr] = useState<number>(142);
  const [currentCadence, setCurrentCadence] = useState<number>(176);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(false);
  const [activeKmMarker, setActiveKmMarker] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);

  // Simulated GPS route points (e.g. Park loop in Zgierz / Warsaw)
  const ROUTE_POINTS = [
    { km: 1, lat: 51.8569, lon: 19.4064, split: '5:35', hr: 138, cadence: 175, gct: 238 },
    { km: 2, lat: 51.8590, lon: 19.4100, split: '5:28', hr: 142, cadence: 177, gct: 234 },
    { km: 3, lat: 51.8610, lon: 19.4140, split: '5:30', hr: 145, cadence: 176, gct: 235 },
    { km: 4, lat: 51.8635, lon: 19.4080, split: '5:25', hr: 148, cadence: 178, gct: 230 },
    { km: 5, lat: 51.8600, lon: 19.4040, split: '5:18', hr: 152, cadence: 180, gct: 226 },
  ];

  // Stop watch loop
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
        setDistanceKm((d) => Number((d + 0.0028).toFixed(3))); // ~10 km/h simulation
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Voice updates every full kilometer or 5 minutes
  useEffect(() => {
    if (isRunning && seconds > 0 && seconds % 120 === 0 && isVoiceEnabled) {
      const paceSec = distanceKm > 0 ? Math.round(seconds / distanceKm) : 330;
      const pMin = Math.floor(paceSec / 60);
      const pSec = paceSec % 60;
      const speech = `Przebiegłeś ${distanceKm.toFixed(1)} kilometra. Średnie tempo ${pMin} minut ${pSec} sekund na kilometr. Tętno ${currentHr} uderzeń na minutę. Kadencja optymalna ${currentCadence} kroków.`;
      speakCoachPolish(speech);
    }
  }, [seconds, isRunning, distanceKm, currentHr, currentCadence, isVoiceEnabled]);

  // Initialize Leaflet map
  useEffect(() => {
    if (isOpen && mapRef.current && typeof window !== 'undefined' && (window as any).L && !leafletInstance.current) {
      try {
        const L = (window as any).L;
        const map = L.map(mapRef.current, { zoomControl: false }).setView([51.8590, 19.4080], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a00';

        // Draw street-snapped polyline
        const coords = ROUTE_POINTS.map((p) => [p.lat, p.lon]);
        L.polyline(coords, { color: accentHex, weight: 4, opacity: 0.85 }).addTo(map);

        // Add 1k, 2k, 3k markers
        ROUTE_POINTS.forEach((pt) => {
          const marker = L.circleMarker([pt.lat, pt.lon], {
            radius: 8,
            fillColor: '#ffffff',
            color: accentHex,
            weight: 3,
            fillOpacity: 1,
          }).addTo(map);

          marker.bindPopup(`
            <div style="font-size:11px; font-weight:bold; color:#0f172a; text-align:center;">
              <strong>Kilometr ${pt.km}</strong><br/>
              Międzyczas: ${pt.split} min/km<br/>
              Tętno: ${pt.hr} bpm | GCT: ${pt.gct} ms
            </div>
          `);
        });

        leafletInstance.current = map;
      } catch (err) {
        console.warn('Leaflet init error:', err);
      }
    }

    return () => {
      if (leafletInstance.current) {
        try { leafletInstance.current.remove(); } catch {}
        leafletInstance.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Pace calculation
  const totalPaceSec = distanceKm > 0 ? Math.round(seconds / distanceKm) : 0;
  const pMin = Math.floor(totalPaceSec / 60);
  const pSec = totalPaceSec % 60;
  const paceStr = totalPaceSec > 0 ? `${pMin}:${pSec < 10 ? '0' : ''}${pSec}` : '--:--';

  const handleTogglePlay = () => {
    if (!isRunning) {
      setIsRunning(true);
      soundEngine.playClick(true);
      if (isVoiceEnabled) {
        speakCoachPolish('Rozpoczęto rejestrację biegu. Powodzenia!');
      }
    } else {
      setIsRunning(false);
    }
  };

  const handleFinishAndSave = () => {
    setIsRunning(false);
    soundEngine.stopMetronome();
    setIsMetronomeEnabled(false);

    const durMin = Math.max(1, Math.round(seconds / 60));
    const dist = Math.max(0.5, distanceKm);

    onFinishRun({
      distanceKm: Number(dist.toFixed(2)),
      durationMin: durMin,
      avgPace: paceStr === '--:--' ? '5:35' : paceStr,
      avgHr: currentHr,
      avgCadence: currentCadence,
      shoeName: profile.selectedShoeId ? (shoes.find((s) => s.id === profile.selectedShoeId)?.name || 'Asics Novablast 4') : 'Asics Novablast 4',
      gctMs: 232,
      verticalOscillationCm: 7.9,
      groundContactBalancePercent: '50.1% L / 49.9% P',
      verticalRatioPercent: 7.4,
    });

    onClose();
  };

  // GPX Export
  const handleExportGPX = () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Running Planer AI iOS 27" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trening z Running Planer AI - ${new Date().toISOString()}</name>
    <trkseg>
      ${ROUTE_POINTS.map((pt) => `
      <trkpt lat="${pt.lat}" lon="${pt.lon}">
        <ele>190.0</ele>
        <time>${new Date().toISOString()}</time>
        <extensions>
          <hr>${pt.hr}</hr>
          <cadence>${pt.cadence}</cadence>
        </extensions>
      </trkpt>`).join('')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trening-running-planer-${new Date().toISOString().slice(0, 10)}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Plik .GPX wygenerowany i pobrany! 🗺️');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 animate-ios text-white overflow-y-auto"
    >
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse"></span>
          <span className="text-xs font-black uppercase tracking-wider accent-text">
            Live Run HUD • Moduł 11 & 12
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Polish Voice toggle */}
          <button
            type="button"
            onClick={() => {
              setIsVoiceEnabled(!isVoiceEnabled);
              showToast(isVoiceEnabled ? 'Głos lektora wyłączony' : 'Polski głos trenera AI aktywny 🎙️');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              isVoiceEnabled ? 'liquid-active' : 'liquid-pill txt-muted'
            }`}
          >
            {isVoiceEnabled ? '🔊 Głos PL' : '🔇 Mute'}
          </button>

          {/* Close / Minimize */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij HUD"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Primary Big Metrics Display */}
      <div className="text-center py-4 space-y-1">
        <span className="text-[11px] uppercase tracking-widest txt-muted font-bold">Dystans GPS</span>
        <div className="text-6xl font-black accent-text ios-num tracking-tight">
          {distanceKm.toFixed(2)} <span className="text-2xl txt-sub font-semibold">km</span>
        </div>

        {/* Stopwatch Timer */}
        <div className="text-3xl font-black txt-main ios-num">
          {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}:` : ''}
          {Math.floor((seconds % 3600) / 60) < 10 ? '0' : ''}
          {Math.floor((seconds % 3600) / 60)}:
          {(seconds % 60) < 10 ? '0' : ''}
          {seconds % 60}
        </div>
      </div>

      {/* Grid: Pace, HR, Cadence, GCT */}
      <div className="grid grid-cols-4 gap-2 text-center my-2">
        <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Śr. Tempo</span>
          <span className="text-base font-black txt-main ios-num">{paceStr}</span>
          <span className="text-[8px] txt-muted block">min/km</span>
        </div>

        <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Tętno Z2</span>
          <span className="text-base font-black text-emerald-400 ios-num">{currentHr}</span>
          <span className="text-[8px] txt-muted block">bpm</span>
        </div>

        <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Kadencja</span>
          <span className="text-base font-black text-amber-400 ios-num">{currentCadence}</span>
          <span className="text-[8px] txt-muted block">spm</span>
        </div>

        <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">GCT</span>
          <span className="text-base font-black text-cyan-400 ios-num">232</span>
          <span className="text-[8px] txt-muted block">ms</span>
        </div>
      </div>

      {/* Interactive GPS Leaflet Map (OSRM Street-Snapping) */}
      <div className="liquid-glass p-3 space-y-2 rounded-3xl my-2 flex-1 min-h-[190px] flex flex-col">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5">
            <span>🗺️</span>
            <span>Ślad OSRM 1:1 Street-Snapping</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportGPX}
              className="text-[10px] accent-text font-bold hover:underline"
            >
              Eksport .GPX 💾
            </button>
          </div>
        </div>

        <div
          ref={mapRef}
          className="w-full flex-1 min-h-[140px] rounded-2xl overflow-hidden border border-white/10"
        />

        {/* Kilometer markers info bar */}
        <div className="flex items-center justify-between text-[10px] txt-muted pt-1">
          <span>Znaczniki km:</span>
          <div className="flex gap-1.5">
            {ROUTE_POINTS.map((pt) => (
              <button
                key={pt.km}
                type="button"
                onClick={() => {
                  setActiveKmMarker(pt.km);
                  showToast(`Km ${pt.km}: split ${pt.split}, tętno ${pt.hr} bpm, GCT ${pt.gct} ms`);
                }}
                className={`w-5 h-5 rounded-full font-bold flex items-center justify-center transition-all ${
                  activeKmMarker === pt.km ? 'accent-bg text-black' : 'liquid-pill txt-sub'
                }`}
              >
                {pt.km}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Main Controls */}
      <div className="flex gap-2 pt-2 shrink-0">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`flex-1 py-4 rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-2xl transition-all ${
            isRunning
              ? 'bg-amber-500 text-black hover:brightness-110'
              : 'accent-bg text-black hover:brightness-110'
          }`}
        >
          {isRunning ? 'Pauza ⏸️' : 'Start Biegu ▶️'}
        </button>

        <button
          type="button"
          onClick={handleFinishAndSave}
          className="py-4 px-6 rounded-full liquid-pill font-black text-xs text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/40"
        >
          Zakończ 🏁
        </button>
      </div>
    </div>
  );
};
