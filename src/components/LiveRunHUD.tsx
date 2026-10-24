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

// Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface RoutePoint {
  km: number;
  lat: number;
  lon: number;
  split: string;
  hr: number;
}

const ROUTE_POINTS: RoutePoint[] = [
  { km: 1, lat: 51.8564, lon: 19.4042, split: '5:12', hr: 138 },
  { km: 2, lat: 51.8578, lon: 19.4065, split: '5:08', hr: 142 },
  { km: 3, lat: 51.8590, lon: 19.4095, split: '5:04', hr: 146 },
  { km: 4, lat: 51.8605, lon: 19.4120, split: '5:10', hr: 145 },
  { km: 5, lat: 51.8618, lon: 19.4150, split: '4:58', hr: 151 },
];

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
  const [activeKmMarker, setActiveKmMarker] = useState<number | null>(null);
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // New state for reliability
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0);
  const [isPocketLocked, setIsPocketLocked] = useState<boolean>(false);
  const [unlockProgress, setUnlockProgress] = useState<number>(0);

  const wakeLockRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const liveCoords = useRef<[number, number][]>([]);
  const lastPos = useRef<{ lat: number; lon: number } | null>(null);
  const unlockTimer = useRef<any>(null);

  // 1. Screen Wake Lock handler
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('WakeLock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // 2. Timer Loop (Timestamp-based)
  useEffect(() => {
    let interval: any = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime + accumulatedTime) / 1000);
        setSeconds(diff);
      }, 100); // Higher frequency for smooth UI, but logic is based on Date.now()
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, accumulatedTime]);

  // 3. Geolocation WatchPosition
  useEffect(() => {
    let gpsWatchId: number | null = null;

    if (isRunning) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        gpsWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setGpsActive(true);

            if (lastPos.current) {
              const dMeters = haversineMeters(lastPos.current.lat, lastPos.current.lon, lat, lon);
              if (dMeters > 3) {
                setDistanceKm((prev) => Number((prev + dMeters / 1000).toFixed(3)));
                liveCoords.current.push([lat, lon]);

                if (polylineRef.current) {
                  polylineRef.current.setLatLngs(liveCoords.current);
                }
                if (leafletInstance.current) {
                  leafletInstance.current.panTo([lat, lon]);
                }
              }
            } else {
              liveCoords.current.push([lat, lon]);
            }
            lastPos.current = { lat, lon };
          },
          () => {
            setGpsActive(false);
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
      }

      // Fallback timer increment simulation
      const fallbackInterval = setInterval(() => {
        if (!gpsActive) {
          setDistanceKm((d) => Number((d + 0.0028).toFixed(3)));
        }
      }, 1000);

      return () => {
        clearInterval(fallbackInterval);
        if (gpsWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(gpsWatchId);
        }
      };
    }
  }, [isRunning, gpsActive]);

  // Voice updates
  useEffect(() => {
    if (isRunning && seconds > 0 && seconds % 120 === 0 && isVoiceEnabled) {
      const paceSec = distanceKm > 0 ? Math.round(seconds / distanceKm) : 330;
      const pMin = Math.floor(paceSec / 60);
      const pSec = paceSec % 60;
      const speech = `Dystans ${(Number(distanceKm) || 0).toFixed(1)} km. Tempo ${pMin} minut ${pSec} sekund. Tętno ${currentHr} bpm.`;
      speakCoachPolish(speech);
    }
  }, [seconds, isRunning, distanceKm, currentHr, isVoiceEnabled]);

  // Leaflet Map Init + ResizeObserver
  useEffect(() => {
    if (isOpen && mapRef.current && typeof window !== 'undefined' && (window as any).L && !leafletInstance.current) {
      try {
        const L = (window as any).L;
        const map = L.map(mapRef.current, { zoomControl: false }).setView([51.8590, 19.4080], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a00';
        const coords = ROUTE_POINTS.map((p) => [p.lat, p.lon]);
        polylineRef.current = L.polyline(coords, { color: accentHex, weight: 4, opacity: 0.85 }).addTo(map);

        leafletInstance.current = map;

        // ResizeObserver to handle map invalidation
        const observer = new ResizeObserver(() => {
          setTimeout(() => {
            if (leafletInstance.current) {
              leafletInstance.current.invalidateSize();
            }
          }, 150);
        });
        observer.observe(mapRef.current);

        return () => observer.disconnect();
      } catch (err) {
        console.warn('Leaflet init error:', err);
      }
    }

    return () => {
      if (leafletInstance.current) {
        try {
          leafletInstance.current.remove();
        } catch {}
        leafletInstance.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const paceSec = distanceKm > 0 ? Math.round(seconds / distanceKm) : 0;
  const pMin = Math.floor(paceSec / 60);
  const pSec = paceSec % 60;
  const paceStr = paceSec > 0 ? `${pMin}:${pSec < 10 ? '0' : ''}${pSec}` : '--:--';

  const handleTogglePlay = () => {
    // iOS Audio/Speech Unlock on first start
    if (!isRunning && seconds === 0) {
      soundEngine.playClick(true);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }
    }

    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
      requestWakeLock();
      soundEngine.playSuccess();
      showToast('Bieg rozpoczęty! 🚀');
    } else {
      setIsRunning(false);
      if (startTime) {
        setAccumulatedTime((prev) => prev + (Date.now() - startTime));
      }
      setStartTime(null);
      releaseWakeLock();
      soundEngine.playClick(false);
      showToast('Bieg wstrzymany ⏸️');
    }
  };

  const handleFinishAndSave = () => {
    setIsRunning(false);
    releaseWakeLock();
    const finalDistance = Math.max(0.1, Number(distanceKm.toFixed(2)));
    const finalDuration = Math.max(1, Math.round(seconds / 60));
    const selectedShoe = shoes && shoes.length > 0 ? shoes[0].name : 'Asics Novablast 4';

    onFinishRun({
      distanceKm: finalDistance,
      durationMin: finalDuration,
      avgPace: paceStr !== '--:--' ? paceStr : '5:20',
      avgHr: currentHr,
      avgCadence: currentCadence,
      shoeName: selectedShoe,
      gctMs: 232,
      verticalOscillationCm: 8.2,
    });

    soundEngine.playPandaSound('cheer');
    showToast(`Ukończono bieg ${finalDistance} km! 🎉`);
    onClose();
  };

  // Pocket Lock Handlers
  const handleUnlockStart = () => {
    let progress = 0;
    unlockTimer.current = setInterval(() => {
      progress += 5;
      setUnlockProgress(progress);
      if (progress >= 100) {
        clearInterval(unlockTimer.current);
        setIsPocketLocked(false);
        setUnlockProgress(0);
        soundEngine.playClick(true);
      }
    }, 100);
  };

  const handleUnlockEnd = () => {
    if (unlockTimer.current) {
      clearInterval(unlockTimer.current);
      setUnlockProgress(0);
    }
  };

  const handleExportGPX = () => {
    const coordsToExport: [number, number][] = liveCoords.current.length > 0 ? liveCoords.current : ROUTE_POINTS.map((p) => [p.lat, p.lon] as [number, number]);
    const gpxXml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="TREDA Running" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>TREDA Run ${new Date().toISOString().split('T')[0]}</name>
    <trkseg>
${coordsToExport.map(([lat, lon]: [number, number]) => `      <trkpt lat="${lat}" lon="${lon}"><time>${new Date().toISOString()}</time></trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxXml], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treda_run_${Date.now()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pobrano plik .GPX! 💾');
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col p-4 animate-ios max-w-md mx-auto">
      {/* Pocket Lock Overlay */}
      {isPocketLocked && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-8 transition-opacity duration-500">
          <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center relative mb-8">
            <svg className="w-full h-full absolute inset-0 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * unlockProgress) / 100}
                className="transition-all duration-100"
              />
            </svg>
            <span className="text-4xl">🔒</span>
          </div>
          <h3 className="text-xl font-black text-white mb-2">Blokada Kieszonkowa</h3>
          <p className="text-sm text-white/50 text-center mb-12">Przytrzymaj przycisk poniżej przez 2 sekundy, aby odblokować</p>
          
          <button
            onMouseDown={handleUnlockStart}
            onMouseUp={handleUnlockEnd}
            onTouchStart={handleUnlockStart}
            onTouchEnd={handleUnlockEnd}
            className="w-full py-5 rounded-full bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Odblokuj 🔓
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            LIVE RUN GPS HUD
          </h2>
          {gpsActive && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              🛰️ GPS 1:1
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPocketLocked(true)}
            className="px-3 py-1 rounded-full liquid-pill text-[10px] font-bold text-white/70"
          >
            🔒 Blokada
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center text-xs text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Distance Counter */}
      <div className="text-center my-3 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Przebyty Dystans
        </span>
        <div className="text-5xl font-black txt-main ios-num tracking-tight">
          {distanceKm.toFixed(2)} <span className="text-xl text-emerald-400">km</span>
        </div>

        {/* Stopwatch Timer */}
        <div className="text-2xl font-black txt-main ios-num pt-1">
          {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}:` : ''}
          {Math.floor((seconds % 3600) / 60) < 10 ? '0' : ''}
          {Math.floor((seconds % 3600) / 60)}:
          {(seconds % 60) < 10 ? '0' : ''}
          {seconds % 60}
        </div>
      </div>

      {/* Grid: Pace, HR, Cadence, GCT */}
      <div className="grid grid-cols-4 gap-2 text-center my-1">
        <div className="liquid-glass p-2 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Tempo</span>
          <span className="text-sm font-black txt-main ios-num">{paceStr}</span>
          <span className="text-[8px] txt-muted block">min/km</span>
        </div>

        <div className="liquid-glass p-2 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Tętno Z2</span>
          <span className="text-sm font-black text-emerald-400 ios-num">{currentHr}</span>
          <span className="text-[8px] txt-muted block">bpm</span>
        </div>

        <div className="liquid-glass p-2 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">Kadencja</span>
          <span className="text-sm font-black text-amber-400 ios-num">{currentCadence}</span>
          <span className="text-[8px] txt-muted block">spm</span>
        </div>

        <div className="liquid-glass p-2 rounded-2xl border border-white/10">
          <span className="text-[9px] txt-muted block uppercase font-bold">GCT</span>
          <span className="text-sm font-black text-cyan-400 ios-num">232</span>
          <span className="text-[8px] txt-muted block">ms</span>
        </div>
      </div>

      {/* Interactive GPS Leaflet Map */}
      <div className="liquid-glass p-3 space-y-2 rounded-3xl my-2 flex-1 min-h-[180px] flex flex-col">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5">
            <span>🗺️</span>
            <span>Trasa GPS na żywo</span>
          </span>
          <button
            type="button"
            onClick={handleExportGPX}
            className="text-[10px] accent-text font-bold hover:underline"
          >
            Eksport .GPX 💾
          </button>
        </div>

        <div
          ref={mapRef}
          className="w-full flex-1 min-h-[130px] rounded-2xl overflow-hidden border border-white/10"
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
                  showToast(`Km ${pt.km}: split ${pt.split}, tętno ${pt.hr} bpm`);
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
          className={`flex-1 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-2xl transition-all ${
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
          className="py-3.5 px-6 rounded-full liquid-pill font-black text-xs text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/40"
        >
          Zakończ 🏁
        </button>
      </div>
    </div>
  );
};
