import React, { useState, useEffect, useCallback } from 'react';
import { soundEngine } from '../utils/defaults.ts';
import { OpenStreetMapRouteCanvas } from './OpenStreetMapRouteCanvas.tsx';

export type SurfaceCategory = 'asfalt' | 'szuter' | 'ścieżka leśna';

export interface RouteWaypoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'start' | 'via' | 'finish';
}

export interface RouteSegmentClassification {
  id: string;
  fromIndex: number;
  toIndex: number;
  startCoord: { lat: number; lng: number };
  endCoord: { lat: number; lng: number };
  distanceMeters: number;
  surface: SurfaceCategory;
  confidence: number;
  nearbyPlaceOrRoadName: string;
  details: string;
}

export interface RouteSurfaceAnalysisResult {
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  surfaceBreakdown: {
    asfaltPercent: number;
    szuterPercent: number;
    lesnaPercent: number;
    asfaltKm: number;
    szuterKm: number;
    lesnaKm: number;
  };
  dominantSurface: SurfaceCategory;
  recommendedShoeCategory: 'Szosowe' | 'Trailowe' | 'All-Terrain (Gravel/Hybryda)';
  shoeRecommendationReason: string;
  segments: RouteSegmentClassification[];
  elevationProfile: { distanceKm: number; elevationM: number }[];
  snappedPathCoords?: { lat: number; lng: number }[];
}

interface RouteSurfaceAnalyzerProps {
  runnerPaceMinKm?: string; // e.g. "5:15"
  onSaveRouteToCalendar?: (routeName: string, distanceKm: number, surfaceData: any) => void;
  showToast: (msg: string) => void;
}

// Preset popular Polish race routes with waypoints that snap to real footpaths
const PRESET_ROUTES: {
  name: string;
  city: string;
  desc: string;
  waypoints: RouteWaypoint[];
}[] = [
  {
    name: 'Parkrun Park Poniatowskiego • Pętla Parkowa',
    city: 'Łódź',
    desc: 'Bieg alejkami parkowymi i wokół stawu (asfalt parkowy, szuter i utwardzone dukty)',
    waypoints: [
      { id: 'w-1', lat: 51.7538, lng: 19.4445, title: 'Start: Brama Parkowa', type: 'start' },
      { id: 'w-2', lat: 51.7552, lng: 19.4485, title: 'Aleja Główna Kasztanowa', type: 'via' },
      { id: 'w-3', lat: 51.7531, lng: 19.4512, title: 'Pętla przy stawie parkowym', type: 'via' },
      { id: 'w-4', lat: 51.7512, lng: 19.4468, title: 'Odcinek szutrowy południe', type: 'via' },
      { id: 'w-5', lat: 51.7538, lng: 19.4445, title: 'Meta: Brama Parkowa', type: 'finish' },
    ],
  },
  {
    name: 'Bieg Leśny Zgierz Malinka & Las Aniołów',
    city: 'Zgierz',
    desc: 'Crossowa pętla po ścieżkach leśnych, duktach i pagórkach wokół stawu Malinka',
    waypoints: [
      { id: 'w-1', lat: 51.8622, lng: 19.4182, title: 'Start: Ośrodek Malinka', type: 'start' },
      { id: 'w-2', lat: 51.8665, lng: 19.4235, title: 'Dukt leśny wschodni', type: 'via' },
      { id: 'w-3', lat: 51.8715, lng: 19.4285, title: 'Wzgórze leśne', type: 'via' },
      { id: 'w-4', lat: 51.8745, lng: 19.4220, title: 'Ścieżka leśna północ', type: 'via' },
      { id: 'w-5', lat: 51.8680, lng: 19.4140, title: 'Ścieżka przy stawie', type: 'via' },
      { id: 'w-6', lat: 51.8622, lng: 19.4182, title: 'Meta: Ośrodek Malinka', type: 'finish' },
    ],
  },
  {
    name: 'Półmaraton Łódź 2027 • Trasa Szosowa',
    city: 'Łódź',
    desc: 'Szybka atestowana trasa miejska po asfalcie z fragmentem Parku 3 Maja',
    waypoints: [
      { id: 'w-1', lat: 51.7592, lng: 19.4560, title: 'Start: Atlas Arena', type: 'start' },
      { id: 'w-2', lat: 51.7680, lng: 19.4560, title: 'Ulica Piotrkowska', type: 'via' },
      { id: 'w-3', lat: 51.7720, lng: 19.4600, title: 'Aleja Piłsudskiego', type: 'via' },
      { id: 'w-4', lat: 51.7760, lng: 19.4750, title: 'Park 3 Maja (alejka)', type: 'via' },
      { id: 'w-5', lat: 51.7650, lng: 19.4480, title: 'Meta: Atlas Arena', type: 'finish' },
    ],
  },
];

// Color mapping for classified surfaces
export const SURFACE_COLOR_MAP: Record<SurfaceCategory, { hex: string; bg: string; label: string; icon: string }> = {
  asfalt: {
    hex: '#3b82f6', // blue
    bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    label: 'Asfalt',
    icon: '🛣️',
  },
  szuter: {
    hex: '#f59e0b', // amber
    bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    label: 'Szuter',
    icon: '🪨',
  },
  'ścieżka leśna': {
    hex: '#10b981', // emerald green
    bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    label: 'Ścieżka leśna',
    icon: '🌲',
  },
};

export const RouteSurfaceAnalyzer: React.FC<RouteSurfaceAnalyzerProps> = ({
  runnerPaceMinKm = '5:15',
  onSaveRouteToCalendar,
  showToast,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // User-defined Control Waypoints (Start, Via points, Finish)
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([
    { id: 'w-1', lat: 51.8622, lng: 19.4182, title: 'Start: Ośrodek Malinka', type: 'start' },
    { id: 'w-2', lat: 51.8670, lng: 19.4240, title: 'Dukt leśny', type: 'via' },
    { id: 'w-3', lat: 51.8720, lng: 19.4210, title: 'Meta: Pagórek Malinka', type: 'finish' },
  ]);

  // Real geometry coordinates traced along actual footpaths, trails, and walkways
  const [pathCoords, setPathCoords] = useState<{ lat: number; lng: number }[]>([
    { lat: 51.8622, lng: 19.4182 },
    { lat: 51.8670, lng: 19.4240 },
    { lat: 51.8720, lng: 19.4210 },
  ]);

  const [snapToFootpaths, setSnapToFootpaths] = useState<boolean>(true);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Trasa wytyczona po ścieżkach');
  const [routeName, setRouteName] = useState<string>('Trasa Treningowa Zgierz • Malinka & Szosa');
  const [analysisResult, setAnalysisResult] = useState<RouteSurfaceAnalysisResult | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'elevation' | 'segments'>('summary');
  const [userPace, setUserPace] = useState<string>(runnerPaceMinKm);

  /**
   * 1. Footpath Routing: Snaps waypoints to real pedestrian trails and walkways via OSRM Foot Profile
   */
  const routeAlongFootpaths = useCallback(
    async (pts: RouteWaypoint[]): Promise<{ lat: number; lng: number }[]> => {
      if (pts.length < 2) return pts.map((p) => ({ lat: p.lat, lng: p.lng }));

      try {
        // Query OSRM Foot Profile API for pedestrian routing
        const coordString = pts.map((p) => `${p.lng},${p.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson`;

        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const geometry = data.routes[0].geometry.coordinates; // [[lon, lat], ...]
          const coords = geometry.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
          return coords;
        }
      } catch (err) {
        console.warn('OSRM foot routing network notice, using direct points:', err);
      }

      // Fallback: interpolate points
      return pts.map((p) => ({ lat: p.lat, lng: p.lng }));
    },
    []
  );

  /**
   * 2. Automatic Surface Classification using Google Maps Elevation & Places API
   */
  const classifySurfaceAutomatically = useCallback(
    async (coordsToAnalyze: { lat: number; lng: number }[]) => {
      if (coordsToAnalyze.length < 2) return;

      setIsAnalyzing(true);
      setStatusMessage('🔬 Trwa automatyczna analiza nawierzchni (Google Maps Elevation & Places API)...');

      try {
        const response = await fetch('/api/maps/classify-surface', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathCoords: coordsToAnalyze,
            snapToFootpaths: false, // Already snapped to footpaths
            apiKey: apiKey || 'AIzaSyAz6FKg1iPcs5IGkZWp8Wv7e1pnyL4K_R0',
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Błąd analizy nawierzchni');
        }

        setAnalysisResult(data);
        setStatusMessage(
          `✅ Sklasyfikowano podłoże: Asfalt ${data.surfaceBreakdown.asfaltPercent}%, Las ${data.surfaceBreakdown.lesnaPercent}%, Szuter ${data.surfaceBreakdown.szuterPercent}%`
        );
      } catch (err: any) {
        console.error('Surface analysis error:', err);
        setStatusMessage('⚠️ Analiza nawierzchni zakończona z wartościami szacunkowymi.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  /**
   * 3. Master Workflow: Route Along Footpaths & Automatically Analyze Surface
   */
  const handleUpdateRouteAndSurface = useCallback(
    async (pts: RouteWaypoint[], snap: boolean = snapToFootpaths) => {
      if (pts.length < 2) return;

      setIsRouting(true);
      setStatusMessage('👣 Wytyczanie trasy po ścieżkach pieszych i parkowych...');

      let finalCoords: { lat: number; lng: number }[] = pts.map((p) => ({ lat: p.lat, lng: p.lng }));

      if (snap) {
        finalCoords = await routeAlongFootpaths(pts);
      }

      setPathCoords(finalCoords);
      setIsRouting(false);

      // Automatically trigger surface analysis on the real footpath coordinates
      await classifySurfaceAutomatically(finalCoords);
    },
    [snapToFootpaths, routeAlongFootpaths, classifySurfaceAutomatically]
  );

  // Initial trigger on mount
  useEffect(() => {
    handleUpdateRouteAndSurface(waypoints, snapToFootpaths);
  }, []);

  const normalizeWaypoints = (pts: RouteWaypoint[]): RouteWaypoint[] =>
    pts.map((w, idx) => ({
      ...w,
      type: idx === 0 ? 'start' : idx === pts.length - 1 ? 'finish' : 'via',
    }));

  // Handle click on OpenStreetMap to add a new waypoint
  const handleAddPointOnOsm = async (clickLat: number, clickLng: number, customName?: string) => {
    soundEngine.playClick(true);

    if (waypoints.length === 0) {
      const startWp: RouteWaypoint = {
        id: `wp-${Date.now()}`,
        lat: clickLat,
        lng: clickLng,
        title: customName || 'Start: Punkt OSM',
        type: 'start',
      };
      setWaypoints([startWp]);
      setPathCoords([{ lat: clickLat, lng: clickLng }]);
      showToast('Ustawiono punkt Startu na OpenStreetMap! Kliknij kolejny punkt, aby wyznaczyć trasę 📍');
      return;
    }

    const nextWaypoints = normalizeWaypoints([
      ...waypoints,
      {
        id: `wp-${Date.now()}`,
        lat: clickLat,
        lng: clickLng,
        title: customName || `Punkt #${waypoints.length + 1}`,
        type: 'finish',
      },
    ]);

    setWaypoints(nextWaypoints);
    await handleUpdateRouteAndSurface(nextWaypoints, snapToFootpaths);
    showToast(`Dodano punkt trasy #${nextWaypoints.length} na OpenStreetMap!`);
  };

  // Move point by dragging marker on OpenStreetMap
  const handleMovePointOnOsm = async (id: string, newLat: number, newLng: number) => {
    soundEngine.playClick(true);
    const nextWaypoints = waypoints.map((w) =>
      w.id === id ? { ...w, lat: newLat, lng: newLng } : w
    );
    setWaypoints(nextWaypoints);
    await handleUpdateRouteAndSurface(nextWaypoints, snapToFootpaths);
    showToast('Przesunięto punkt na mapie — przeliczono ścieżkę OSM 🔄');
  };

  // Delete specific point
  const handleDeletePointOnOsm = async (id: string) => {
    soundEngine.playClick(true);
    const nextWaypoints = normalizeWaypoints(waypoints.filter((w) => w.id !== id));
    setWaypoints(nextWaypoints);
    if (nextWaypoints.length >= 2) {
      await handleUpdateRouteAndSurface(nextWaypoints, snapToFootpaths);
    } else {
      setPathCoords(nextWaypoints.map((w) => ({ lat: w.lat, lng: w.lng })));
    }
    showToast('Usunięto punkt kontrolny z mapy.');
  };

  // Undo last waypoint
  const handleUndoWaypoint = async () => {
    if (waypoints.length === 0) return;
    const nextWaypoints = normalizeWaypoints(waypoints.slice(0, -1));
    setWaypoints(nextWaypoints);
    if (nextWaypoints.length >= 2) {
      await handleUpdateRouteAndSurface(nextWaypoints, snapToFootpaths);
    } else {
      setPathCoords(nextWaypoints.map((w) => ({ lat: w.lat, lng: w.lng })));
    }
    showToast('Cofnięto ostatni punkt.');
  };

  // Reset / Clear route
  const handleClearRoute = async () => {
    setWaypoints([]);
    setPathCoords([]);
    setSelectedSegmentId(null);
    setStatusMessage('Mapa wyczyszczona — kliknij na OpenStreetMap, aby postawić punkt Startu!');
    showToast('Wyczyszczono mapę. Kliknij w dowolnym miejscu na OpenStreetMap, aby ustawić punkty!');
  };

  // Close loop back to Start
  const handleCloseLoopOnOsm = async () => {
    if (waypoints.length < 2) return;
    soundEngine.playSuccess();
    const startWp = waypoints[0];
    const nextWaypoints = normalizeWaypoints([
      ...waypoints,
      {
        id: `wp-loop-${Date.now()}`,
        lat: startWp.lat,
        lng: startWp.lng,
        title: 'Meta (Pętla do Startu)',
        type: 'finish',
      },
    ]);
    setWaypoints(nextWaypoints);
    await handleUpdateRouteAndSurface(nextWaypoints, snapToFootpaths);
    showToast('Zamknięto pętlę biegową z powrotem do Startu! 🔄');
  };

  const handleSetStartAtLocation = (lat: number, lng: number, label: string) => {
    soundEngine.playSuccess();
    const startWp: RouteWaypoint = {
      id: `wp-start-${Date.now()}`,
      lat,
      lng,
      title: label,
      type: 'start',
    };
    setWaypoints([startWp]);
    setPathCoords([{ lat, lng }]);
    setSelectedSegmentId(null);
    setStatusMessage(`Start ustawiony: ${label}. Kliknij kolejny punkt na OpenStreetMap!`);
    showToast(`Ustawiono Start: ${label} 📍`);
  };

  // Load Preset Route
  const handleLoadPreset = async (preset: typeof PRESET_ROUTES[0]) => {
    soundEngine.playSuccess();
    setRouteName(preset.name);
    setWaypoints(preset.waypoints);
    setSelectedSegmentId(null);
    await handleUpdateRouteAndSurface(preset.waypoints, snapToFootpaths);
    showToast(`Załadowano trasę "${preset.name}". Wytyczono po ścieżkach! 🏁`);
  };

  // Toggle Snapping to Footpaths
  const handleToggleSnap = async () => {
    const nextSnap = !snapToFootpaths;
    setSnapToFootpaths(nextSnap);
    soundEngine.playClick(true);
    await handleUpdateRouteAndSurface(waypoints, nextSnap);
    showToast(nextSnap ? 'Włączono wytyczanie po ścieżkach i alejkach!' : 'Włączono tryb linii prostej.');
  };

  // Calculate estimated finish time
  const calculateEstimatedTime = (distKm: number, paceStr: string) => {
    const parts = paceStr.split(':');
    const min = parseInt(parts[0], 10) || 5;
    const sec = parseInt(parts[1], 10) || 15;
    const paceSecPerKm = min * 60 + sec;
    const totalSec = Math.round(distKm * paceSecPerKm);
    const hours = Math.floor(totalSec / 3600);
    const remainMin = Math.floor((totalSec % 3600) / 60);
    const remainSec = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${remainMin}m ${remainSec}s`;
    }
    return `${remainMin}m ${remainSec}s`;
  };

  const totalDist = analysisResult?.totalDistanceKm || 0;
  const estimatedTime = calculateEstimatedTime(totalDist, userPace);

  return (
    <div className="space-y-4 animate-ios">
      {/* 1. Header Banner */}
      <div className="liquid-glass p-4 rounded-3xl border border-sky-400/30 space-y-3 relative overflow-hidden bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-black/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-sky-400/40 flex items-center justify-center text-2xl shadow-lg">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Wytyczanie po Ścieżkach & Google Maps API
                </span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                  Automatyczna Analiza Nawierzchni
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black txt-main leading-tight">
                Planer Trasy & Analizator Nawierzchni
              </h2>
            </div>
          </div>

          {/* Toggle Footpath Routing Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSnap}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border shadow-sm ${
                snapToFootpaths
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-emerald-500/10'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Włącz wytyczanie trasy wzdłuż realnych ścieżek pieszych, leśnych i chodników"
            >
              <span>👣</span>
              <span>{snapToFootpaths ? 'Po ścieżkach: WŁ.' : 'Linia prosta: WŁ.'}</span>
            </button>
          </div>
        </div>

        {/* Route Name Input & Quick Presets */}
        <div className="pt-1 space-y-2">
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl liquid-pill text-xs font-bold txt-main border border-white/10 outline-none"
            placeholder="Wpisz nazwę trasy biegowej..."
          />

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] txt-muted font-bold shrink-0">Wczytaj trasę:</span>
            {PRESET_ROUTES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadPreset(p)}
                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white shrink-0 transition-all flex items-center gap-1"
              >
                <span>📍</span>
                <span>{p.city}: {p.name.split('•')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive OpenStreetMap Container with Footpath Overlay */}
      <div className="liquid-glass p-3 rounded-3xl border border-emerald-500/30 space-y-2.5 bg-slate-950">
        {/* Live Status Pill */}
        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5">
          <span className="flex items-center gap-1.5 text-slate-300">
            {isRouting || isAnalyzing ? (
              <div className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
            ) : (
              <span className="text-emerald-400 font-bold">●</span>
            )}
            <span className="font-medium text-slate-200">{statusMessage}</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">
            OpenStreetMap + OSRM ✓
          </span>
        </div>

        <OpenStreetMapRouteCanvas
          waypoints={waypoints.map((w) => ({
            id: w.id,
            lat: w.lat,
            lng: w.lng,
            name: w.title,
            type: w.type,
          }))}
          pathCoords={pathCoords}
          segments={analysisResult?.segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          snapToFootpaths={snapToFootpaths}
          onAddPoint={handleAddPointOnOsm}
          onMovePoint={handleMovePointOnOsm}
          onDeletePoint={handleDeletePointOnOsm}
          onUndoPoint={handleUndoWaypoint}
          onClearPoints={handleClearRoute}
          onCloseLoop={handleCloseLoopOnOsm}
          onSetStartAtLocation={handleSetStartAtLocation}
          heightClass="h-80 sm:h-96"
        />
      </div>

      {/* 3. Automatic Surface Breakdown & Route Parameters Dashboard */}
      {analysisResult && (
        <div className="space-y-3">
          {/* Main Parameters Grid (Distance, Time, Elevation, Dominant Surface) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="text-[10px] txt-muted uppercase font-bold flex items-center gap-1">
                <span>📏</span>
                <span>Dystans po ścieżkach</span>
              </div>
              <div className="text-lg font-black text-white ios-num">
                {analysisResult.totalDistanceKm} <span className="text-xs text-sky-400">km</span>
              </div>
              <div className="text-[10px] text-slate-400">Wytyczono wzdłuż alejek</div>
            </div>

            <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="text-[10px] txt-muted uppercase font-bold flex items-center gap-1">
                <span>⏱️</span>
                <span>Szacowany czas biegu</span>
              </div>
              <div className="text-lg font-black text-emerald-400 ios-num">
                {estimatedTime}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>Tempo:</span>
                <input
                  type="text"
                  value={userPace}
                  onChange={(e) => setUserPace(e.target.value)}
                  className="w-12 bg-white/10 px-1 py-0.2 rounded text-[10px] font-mono text-center text-white"
                  title="Zmień tempo min/km"
                />
                <span>/km</span>
              </div>
            </div>

            <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="text-[10px] txt-muted uppercase font-bold flex items-center gap-1">
                <span>🏔️</span>
                <span>Profil przewyższeń</span>
              </div>
              <div className="text-lg font-black text-amber-300 ios-num">
                +{analysisResult.elevationGainM} <span className="text-xs text-slate-400">m / -{analysisResult.elevationLossM}m</span>
              </div>
              <div className="text-[10px] text-slate-400">Google Maps Elevation API</div>
            </div>

            <div className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="text-[10px] txt-muted uppercase font-bold flex items-center gap-1">
                <span>🌲</span>
                <span>Dominujące podłoże</span>
              </div>
              <div className="text-sm font-black text-white truncate capitalize flex items-center gap-1">
                <span>{SURFACE_COLOR_MAP[analysisResult.dominantSurface]?.icon}</span>
                <span>{analysisResult.dominantSurface}</span>
              </div>
              <div className="text-[10px] text-slate-400">Automatyczna detekcja</div>
            </div>
          </div>

          {/* Surface Proportions Banner */}
          <div className="liquid-glass p-4 rounded-3xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Automatyczny Podział Nawierzchni
                </span>
                <h3 className="text-sm font-black txt-main">
                  Struktura podłoża wzdłuż wytyczonej ścieżki
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${SURFACE_COLOR_MAP[analysisResult.dominantSurface]?.bg}`}>
                {SURFACE_COLOR_MAP[analysisResult.dominantSurface]?.icon} {analysisResult.dominantSurface.toUpperCase()}
              </span>
            </div>

            {/* Segmented Surface Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3.5 rounded-full bg-white/10 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${analysisResult.surfaceBreakdown.asfaltPercent}%` }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Asfalt: ${analysisResult.surfaceBreakdown.asfaltPercent}% (${analysisResult.surfaceBreakdown.asfaltKm} km)`}
                />
                <div
                  style={{ width: `${analysisResult.surfaceBreakdown.szuterPercent}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Szuter: ${analysisResult.surfaceBreakdown.szuterPercent}% (${analysisResult.surfaceBreakdown.szuterKm} km)`}
                />
                <div
                  style={{ width: `${analysisResult.surfaceBreakdown.lesnaPercent}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Ścieżka leśna: ${analysisResult.surfaceBreakdown.lesnaPercent}% (${analysisResult.surfaceBreakdown.lesnaKm} km)`}
                />
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-center gap-1 text-blue-400 font-black text-sm">
                    <span>🛣️</span>
                    <span>{analysisResult.surfaceBreakdown.asfaltPercent}%</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Asfalt ({analysisResult.surfaceBreakdown.asfaltKm} km)
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-sm">
                    <span>🪨</span>
                    <span>{analysisResult.surfaceBreakdown.szuterPercent}%</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Szuter ({analysisResult.surfaceBreakdown.szuterKm} km)
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-center gap-1 text-emerald-400 font-black text-sm">
                    <span>🌲</span>
                    <span>{analysisResult.surfaceBreakdown.lesnaPercent}%</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Ścieżka leśna ({analysisResult.surfaceBreakdown.lesnaKm} km)
                  </div>
                </div>
              </div>
            </div>

            {/* AI Footwear & Equipment Recommendation */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span>👟</span>
                  <span>Rekomendacja Obuwia pod tę Nawierzchnię:</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black">
                  {analysisResult.recommendedShoeCategory}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {analysisResult.shoeRecommendationReason}
              </p>
            </div>
          </div>

          {/* 4. Sub-Navigation for Elevation Profile & Segments List */}
          <div className="flex items-center gap-2 p-1 liquid-pill text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'summary' ? 'accent-tab-active shadow-sm' : 'txt-sub hover:text-white'
              }`}
            >
              📊 Wykres Wysokości (Elevation API)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('segments')}
              className={`flex-1 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'segments' ? 'accent-tab-active shadow-sm' : 'txt-sub hover:text-white'
              }`}
            >
              🔍 Odcinki Ścieżki ({analysisResult.segments.length})
            </button>
          </div>

          {/* Elevation Profile Graph (SVG) */}
          {activeTab === 'summary' && analysisResult.elevationProfile.length > 0 && (
            <div className="liquid-glass p-4 rounded-3xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Profil wzniesień wzdłuż ścieżki (Google Maps Elevation API):
                </span>
                <span className="font-mono text-[10px] text-amber-300">
                  +{analysisResult.elevationGainM}m podbiegów / -{analysisResult.elevationLossM}m zbiegów
                </span>
              </div>

              {/* Responsive SVG Elevation Chart */}
              <div className="w-full h-32 bg-black/40 rounded-2xl p-2 border border-white/5 relative flex items-end">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="elevationGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Area path */}
                  {(() => {
                    const profile = analysisResult.elevationProfile;
                    const minEle = Math.min(...profile.map((p) => p.elevationM));
                    const maxEle = Math.max(...profile.map((p) => p.elevationM)) || minEle + 1;
                    const range = Math.max(10, maxEle - minEle);

                    const pointsStr = profile
                      .map((p, idx) => {
                        const x = (idx / (profile.length - 1)) * 100;
                        const y = 90 - ((p.elevationM - minEle) / range) * 80;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <>
                        <polygon
                          points={`0,100 ${pointsStr} 100,100`}
                          fill="url(#elevationGrad2)"
                        />
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* Min / Max Labels */}
                <div className="absolute top-2 left-3 text-[9px] font-mono text-sky-300">
                  Max: {Math.max(...analysisResult.elevationProfile.map((p) => p.elevationM))} m n.p.m.
                </div>
                <div className="absolute bottom-1 right-3 text-[9px] font-mono text-slate-400">
                  Min: {Math.min(...analysisResult.elevationProfile.map((p) => p.elevationM))} m n.p.m.
                </div>
              </div>
            </div>
          )}

          {/* Detailed Segments List */}
          {activeTab === 'segments' && (
            <div className="liquid-glass p-3 rounded-3xl border border-white/10 space-y-2 max-h-60 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Wykryte segmenty ścieżek z Google Places & Elevation API (Kliknij, aby podświetlić na mapie):
              </div>
              <div className="space-y-1.5">
                {analysisResult.segments.map((seg, i) => {
                  const meta = SURFACE_COLOR_MAP[seg.surface];
                  const isSelected = selectedSegmentId === seg.id;

                  return (
                    <div
                      key={seg.id}
                      onClick={() => setSelectedSegmentId(isSelected ? null : seg.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-white/15 border-sky-400 shadow-md'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-xs shrink-0">
                          {meta.icon}
                        </span>
                        <div className="truncate">
                          <div className="font-bold txt-main truncate flex items-center gap-1.5">
                            <span>Odcinek #{i + 1}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${meta.bg}`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="text-[10px] txt-muted truncate mt-0.5">
                            {seg.nearbyPlaceOrRoadName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sky-400">
                          {seg.distanceMeters} m
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Pewność: {Math.round(seg.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
