import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Footprints,
  Save,
  X,
  ChevronDown,
  Info,
  Brain,
  RotateCw,
  Repeat,
  CornerDownLeft,
  Undo2,
  Trash2,
  Search,
  Maximize2,
  Navigation,
  Layers,
  Bookmark,
  Watch,
  Zap,
  Folder,
  MapPin,
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Sliders,
  Droplets,
  AlertTriangle,
  Download,
  Check,
  Compass,
  Moon,
  Globe,
  Map,
  Mountain,
  Milestone,
} from 'lucide-react';
import { soundEngine } from '../../utils/defaults.ts';
import { SavedRoute, SurfaceBreakdown, RunnerProfile } from '../../types.ts';
import { OpenStreetMapRouteCanvas, OsmColoredSegment } from '../maps/OpenStreetMapRouteCanvas.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

interface RoutePoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  ele: number;
  type: 'start' | 'via' | 'finish';
}

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  runnerPaceMinKm?: string; // e.g. "5:20"
  profile?: RunnerProfile;
  showToast: (msg: string) => void;
}

// 6 Komoot-style surface categories matching IMG_4512_f0aa3102.png
interface DetailedSurfaceCategory {
  key: string;
  label: string;
  colorHex: string;
  percent: number;
  meters: number;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  runnerPaceMinKm = '5:20',
  profile,
  showToast,
}) => {
  // Navigation / View modes
  const [isSurfaceMode, setIsSurfaceMode] = useState<boolean>(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showLayersDropdown, setShowLayersDropdown] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Map view controls
  const [tileStyle, setTileStyle] = useState<'osm' | 'topo' | 'dark' | 'satellite'>('dark');
  const [fitBoundsCounter, setFitBoundsCounter] = useState<number>(0);
  const [locateGpsCounter, setLocateGpsCounter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingNominatim, setIsSearchingNominatim] = useState<boolean>(false);

  // Route metadata & configuration
  const [routeName, setRouteName] = useState<string>('Pętla Biegowa Zgierz • Ścieżka Parkowa');
  const [targetPace, setTargetPace] = useState<string>(runnerPaceMinKm || '5:20');
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);

  // Initial trail points initialized with scenic trail loop (Park & Las Zgierz)
  const [points, setPoints] = useState<RoutePoint[]>([
    { id: 'p-start', name: 'Start (A): Park Miejski Zgierz', lat: 51.8561, lon: 19.4062, ele: 192, type: 'start' },
    { id: 'p-via-1', name: 'Punkt 2: Dukt Leśny & Malinka', lat: 51.8685, lon: 19.4210, ele: 228, type: 'via' },
    { id: 'p-finish', name: 'Meta (B): Pętla Parkowa przy Stawie', lat: 51.8580, lon: 19.4010, ele: 195, type: 'finish' },
  ]);

  // Attempt real GPS geolocation for start point when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = Number(pos.coords.latitude.toFixed(5));
          const userLon = Number(pos.coords.longitude.toFixed(5));

          setPoints((prev) => {
            if (prev.length === 0) {
              return [{ id: 'p-start', name: 'Start (A): Twoja Lokalizacja GPS', lat: userLat, lon: userLon, ele: 195, type: 'start' }];
            }
            if (prev[0] && prev[0].type === 'start') {
              const next = [...prev];
              next[0] = { ...next[0], lat: userLat, lon: userLon, name: 'Start (A): Twoja Lokalizacja GPS' };
              return next;
            }
            return prev;
          });
        },
        (err) => {
          console.warn('GPS Geolocation unavailable or denied, using default start location:', err);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [isOpen]);

  // OSRM Path Geometry state (Foot/Pedestrian path coordinates)
  const [pathCoords, setPathCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeSegments, setRouteSegments] = useState<OsmColoredSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [osrmDistanceKm, setOsrmDistanceKm] = useState<number>(4.22);
  const [routeElevationGain, setRouteElevationGain] = useState<number>(30);
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [isSurfaceAnalyzing, setIsSurfaceAnalyzing] = useState<boolean>(false);

  // Surface Preference State ('all' | 'forest_trail' | 'sidewalk' | 'asphalt')
  const [surfacePreference, setSurfacePreference] = useState<'all' | 'forest_trail' | 'sidewalk' | 'asphalt'>('all');

  // Surface breakdown state (Including Forest trails & Sidewalks / Chodniki)
  const [surfaceBreakdown, setSurfaceBreakdown] = useState<{
    lesnaPercent: number;
    chodnikPercent: number;
    asfaltPercent: number;
    szuterPercent: number;
    lesnaKm: number;
    chodnikKm: number;
    asfaltKm: number;
    szuterKm: number;
    dominantSurface: string;
    recommendedShoeCategory: string;
    shoeReason: string;
  }>({
    lesnaPercent: 45,
    chodnikPercent: 30,
    asfaltPercent: 15,
    szuterPercent: 10,
    lesnaKm: 1.9,
    chodnikKm: 1.27,
    asfaltKm: 0.63,
    szuterKm: 0.42,
    dominantSurface: 'Ścieżka leśna / Dukt naturalny',
    recommendedShoeCategory: 'Uniwersalne / Road-to-Trail',
    shoeReason: 'Urozmaicona trasa z dominacją ścieżek leśnych i parkowych oraz chodników miejskich. Buty All-Terrain z umiarkowanym bieżnikiem (3-4 mm) zapewnią świetną amortyzację i pewność kroku.',
  });

  // AI Route Analysis
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<SavedRoute['aiAnalysis'] | null>(null);

  // Saved Routes library
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => {
    try {
      const stored = localStorage.getItem('saved_running_routes_v1');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed loading saved routes', e);
    }
    return [
      {
        id: 'route-preset-1',
        title: 'Trasa Zgierz Malinka & Las Aniołów',
        createdAt: new Date().toISOString().split('T')[0],
        distanceKm: 4.22,
        elevationGainM: 30,
        estimatedTime: '21m 30s',
        difficulty: 'Łatwa (Płaski kros)',
        isRoundTrip: false,
        surface: { asfaltPercent: 5, lesnaPercent: 65, szuterPercent: 30, kostkaPercent: 0, dominantSurface: 'Ścieżka leśna' },
        points: [
          { id: 'p-1', name: 'Start (A): Park Miejski', lat: 51.8561, lon: 19.4062, ele: 192, type: 'start' },
          { id: 'p-2', name: 'Las Malinka', lat: 51.8685, lon: 19.4210, ele: 228, type: 'via' },
          { id: 'p-3', name: 'Meta (B): Staw Miejski', lat: 51.8580, lon: 19.4010, ele: 195, type: 'finish' },
        ],
        aiAnalysis: {
          summary: 'Komfortowa trasa biegowa po utwardzonych i naturalnych traktach parkowych, osłonięta od wiatru.',
          recommendedShoes: 'Uniwersalne treningówki z dobrą stabilizacją',
          hydrationStrategy: 'Woda nie jest konieczna na 4 km przy umiarkowanej temperaturze.',
          safetyTips: 'Dobra widoczność, oświetlone alejki w zachodniej części.',
          difficultyRating: 'Łatwa',
        },
      },
    ];
  });

  // Fetch Footpath Routing via OSRM whenever waypoints change
  useEffect(() => {
    if (!isOpen || points.length === 0) return;

    let isMounted = true;
    setIsRoutingLoading(true);

    if (points.length === 1) {
      setPathCoords([{ lat: points[0].lat, lng: points[0].lon }]);
      setOsrmDistanceKm(0);
      setIsRoutingLoading(false);
      return;
    }

    const fetchRoute = async () => {
      try {
        const coordString = points.map((p) => `${p.lon},${p.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson`;

        let resolvedCoords: { lat: number; lng: number }[] = [];
        let distKm = 4.22;

        try {
          const res = await fetch(osrmUrl);
          const data = await res.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const geometry = route.geometry.coordinates; // [[lon, lat], ...]
            resolvedCoords = geometry.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
            distKm = Math.round((route.distance / 1000) * 100) / 100;
          } else {
            resolvedCoords = points.map((p) => ({ lat: p.lat, lng: p.lon }));
            distKm = calculateFallbackDistanceKm(points);
          }
        } catch (routingErr) {
          console.warn('OSRM routing fetch notice, using direct points:', routingErr);
          resolvedCoords = points.map((p) => ({ lat: p.lat, lng: p.lon }));
          distKm = calculateFallbackDistanceKm(points);
        }

        if (isMounted) {
          setPathCoords(resolvedCoords);
          setOsrmDistanceKm(distKm);
          setIsRoutingLoading(false);
        }

        // Automatic Footpath Routing & Surface Classification
        if (resolvedCoords.length >= 2) {
          if (isMounted) setIsSurfaceAnalyzing(true);
          try {
            const classRes = await fetch('/api/maps/classify-surface', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pathCoords: resolvedCoords,
                waypoints: points,
                snapToFootpaths: true,
                surfacePreference,
              }),
            });

            const classData = await classRes.json();
            if (isMounted && classData && classData.success) {
              // Update route coordinates to snapped footpath/sidewalk path
              if (Array.isArray(classData.snappedPathCoords) && classData.snappedPathCoords.length >= 2) {
                setPathCoords(classData.snappedPathCoords);
              }
              if (typeof classData.totalDistanceKm === 'number' && classData.totalDistanceKm > 0) {
                setOsrmDistanceKm(classData.totalDistanceKm);
              }
              if (Array.isArray(classData.segments)) {
                setRouteSegments(classData.segments);
              }
              if (classData.surfaceBreakdown) {
                setSurfaceBreakdown((prev) => ({
                  ...prev,
                  lesnaPercent: classData.surfaceBreakdown.lesnaPercent ?? prev.lesnaPercent,
                  chodnikPercent: classData.surfaceBreakdown.chodnikPercent ?? prev.chodnikPercent,
                  asfaltPercent: classData.surfaceBreakdown.asfaltPercent ?? prev.asfaltPercent,
                  szuterPercent: classData.surfaceBreakdown.szuterPercent ?? prev.szuterPercent,
                  lesnaKm: classData.surfaceBreakdown.lesnaKm ?? prev.lesnaKm,
                  chodnikKm: classData.surfaceBreakdown.chodnikKm ?? prev.chodnikKm,
                  asfaltKm: classData.surfaceBreakdown.asfaltKm ?? prev.asfaltKm,
                  szuterKm: classData.surfaceBreakdown.szuterKm ?? prev.szuterKm,
                  dominantSurface: classData.dominantSurface || prev.dominantSurface,
                  recommendedShoeCategory: classData.recommendedShoeCategory || prev.recommendedShoeCategory,
                  shoeReason: classData.shoeRecommendationReason || prev.shoeReason,
                }));
              }
              if (typeof classData.elevationGainM === 'number' && classData.elevationGainM > 0) {
                setRouteElevationGain(classData.elevationGainM);
              } else {
                const topoEle = Math.max(15, Math.round(distKm * 7));
                setRouteElevationGain(topoEle);
              }
            }
          } catch (surfaceErr) {
            console.warn('Auto surface classification API notice:', surfaceErr);
            if (isMounted) {
              const topoEle = Math.max(15, Math.round(distKm * 7));
              setRouteElevationGain(topoEle);
            }
          } finally {
            if (isMounted) setIsSurfaceAnalyzing(false);
          }
        }
      } catch (err) {
        console.warn('Route calculation error:', err);
      } finally {
        if (isMounted) {
          setIsRoutingLoading(false);
          setIsSurfaceAnalyzing(false);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [points, isOpen, surfacePreference]);

  // Fallback Haversine distance
  function calculateFallbackDistanceKm(pts: RoutePoint[]): number {
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const R = 6371;
      const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
      const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) *
          Math.cos((p2.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return Math.round(total * 100) / 100 || 4.22;
  }

  // Calculated Metrics
  const rawDistKm = osrmDistanceKm;
  const totalDistanceKm = isRoundTrip ? Math.round(rawDistKm * 2 * 100) / 100 : rawDistKm;
  const totalElevationM = isRoundTrip ? routeElevationGain * 2 : routeElevationGain;

  // Time estimation based on runner pace (e.g. 5:20 min/km)
  const [paceMin, paceSec] = targetPace.split(':').map((n) => parseInt(n, 10) || 5);
  const totalPaceSecPerKm = paceMin * 60 + (paceSec || 0);
  const totalTimeSec = Math.round(totalDistanceKm * totalPaceSecPerKm);
  const hours = Math.floor(totalTimeSec / 3600);
  const mins = Math.floor((totalTimeSec % 3600) / 60);
  const secs = totalTimeSec % 60;
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;

  // Dynamically calculate 6 Komoot surface distances matching totalDistanceKm
  const detailedSurfaces: DetailedSurfaceCategory[] = useMemo(() => {
    const totalMeters = totalDistanceKm * 1000;
    if (totalMeters <= 0) return [];

    const pLesna = (surfaceBreakdown.lesnaPercent || 40) / 100;
    const pChodnik = (surfaceBreakdown.chodnikPercent || 30) / 100;
    const pAsfalt = (surfaceBreakdown.asfaltPercent || 20) / 100;
    const pSzuter = (surfaceBreakdown.szuterPercent || 10) / 100;

    return [
      {
        key: 'lesna',
        label: 'Ścieżka leśna / Dukt naturalny',
        colorHex: '#10b981', // Emerald green
        percent: Math.round(pLesna * 100),
        meters: Math.round(totalMeters * pLesna),
      },
      {
        key: 'chodnik',
        label: 'Chodnik / Ciąg pieszy',
        colorHex: '#06b6d4', // Cyan
        percent: Math.round(pChodnik * 100),
        meters: Math.round(totalMeters * pChodnik),
      },
      {
        key: 'asfalt',
        label: 'Asfalt / Szosa',
        colorHex: '#3b82f6', // Blue
        percent: Math.round(pAsfalt * 100),
        meters: Math.round(totalMeters * pAsfalt),
      },
      {
        key: 'szuter',
        label: 'Szuter / Utwardzona',
        colorHex: '#f59e0b', // Amber
        percent: Math.round(pSzuter * 100),
        meters: Math.round(totalMeters * pSzuter),
      },
    ];
  }, [totalDistanceKm, surfaceBreakdown]);

  // Format meters to Polish label (e.g. 2,03 km or 503 m)
  const formatSurfaceDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Map click handler (Add new waypoint)
  const handleAddPointOnOsm = (lat: number, lng: number, customName?: string) => {
    soundEngine.playClick();
    setPoints((prev) => {
      const idx = prev.length + 1;
      const isFirst = prev.length === 0;
      const name = customName || (isFirst ? 'Start (A)' : `Punkt #${idx}`);
      const type: RoutePoint['type'] = isFirst ? 'start' : 'finish';

      // Change previous finish to via
      const updatedPrev = prev.map((p, i) => (i === prev.length - 1 && i > 0 ? { ...p, type: 'via' as const } : p));
      return [...updatedPrev, { id: `pt-${Date.now()}-${idx}`, name, lat, lon: lng, ele: 195, type }];
    });
  };

  // Move point (drag end)
  const handleMovePointOnOsm = (id: string, lat: number, lng: number) => {
    soundEngine.playClick();
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, lat, lon: lng } : p)));
  };

  // Delete waypoint
  const handleDeleteWaypoint = (id: string) => {
    soundEngine.playClick();
    setPoints((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, idx) => {
        if (idx === 0) return { ...p, type: 'start' as const };
        if (idx === filtered.length - 1) return { ...p, type: 'finish' as const };
        return { ...p, type: 'via' as const };
      });
    });
  };

  // Undo last point
  const handleUndoPoint = () => {
    if (points.length <= 1) return;
    soundEngine.playClick();
    setPoints((prev) => {
      const next = prev.slice(0, -1);
      if (next.length > 0) {
        next[next.length - 1] = { ...next[next.length - 1], type: 'finish' };
      }
      return next;
    });
    showToast('Cofnięto ostatni punkt trasy ↺');
  };

  // Clear map points
  const handleClearPoints = () => {
    soundEngine.playClick();
    setPoints([]);
    setPathCoords([]);
    setRouteSegments([]);
    setOsrmDistanceKm(0);
    showToast('Wyczyszczono punkty z mapy 🗑️');
  };

  // Close loop to start
  const handleCloseLoop = () => {
    if (points.length < 2) return;
    soundEngine.playSuccess();
    const startPt = points[0];
    handleAddPointOnOsm(startPt.lat, startPt.lon, `Meta (B) • Pętla zamknięta`);
    showToast('Połączono trasę ze startem w zamkniętą pętlę! 🔄');
  };

  // Set Start location from search or GPS
  const handleSetStartAtLocation = (lat: number, lng: number, label: string) => {
    setPoints((prev) => {
      if (prev.length === 0) {
        return [{ id: `start-${Date.now()}`, name: label, lat, lon: lng, ele: 195, type: 'start' }];
      }
      const updated = [...prev];
      updated[0] = { ...updated[0], lat, lon: lng, name: label };
      return updated;
    });
  };

  // Search OSM Nominatim
  const handleSearchNominatimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingNominatim(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pl&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const place = data[0];
        const lat = Number(parseFloat(place.lat).toFixed(5));
        const lng = Number(parseFloat(place.lon).toFixed(5));
        const shortName = (place.display_name || searchQuery).split(',')[0];

        handleSetStartAtLocation(lat, lng, `Start: ${shortName}`);
        setFitBoundsCounter((c) => c + 1);
        setShowSearchModal(false);
        setSearchQuery('');
        showToast(`Wycentrowano na: ${shortName} 📍`);
      } else {
        showToast('Nie znaleziono miejsca. Spróbuj innej nazwy.');
      }
    } catch {
      showToast('Błąd wyszukiwania OpenStreetMap.');
    } finally {
      setIsSearchingNominatim(false);
    }
  };

  // Save Route to Library
  const handleSaveRoute = () => {
    soundEngine.playSuccess();
    const newSaved: SavedRoute = {
      id: `route-${Date.now()}`,
      title: routeName,
      createdAt: new Date().toISOString().split('T')[0],
      distanceKm: totalDistanceKm,
      elevationGainM: totalElevationM,
      estimatedTime: timeString,
      difficulty: totalElevationM > 100 ? 'Wymagająca (Podbiegi)' : 'Umiarkowana',
      isRoundTrip,
      surface: {
        asfaltPercent: 15,
        lesnaPercent: 55,
        szuterPercent: 30,
        kostkaPercent: 0,
        dominantSurface: surfaceBreakdown.dominantSurface,
      },
      points,
      aiAnalysis: aiAnalysis || undefined,
    };

    const updated = [newSaved, ...savedRoutes];
    setSavedRoutes(updated);
    try {
      localStorage.setItem('saved_running_routes_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }

    setShowSaveDropdown(false);
    showToast(`Trasa "${routeName}" została zapisana w bibliotece! 💾`);
  };

  // Export GPX
  const handleExportGPX = (routeToExport?: SavedRoute) => {
    soundEngine.playSuccess();

    const exportName = routeToExport ? routeToExport.title : routeName;
    const exportDist = routeToExport ? routeToExport.distanceKm : totalDistanceKm;
    const exportEle = routeToExport ? routeToExport.elevationGainM : totalElevationM;
    const exportPtsList = routeToExport ? routeToExport.points : points;
    const exportRound = routeToExport ? routeToExport.isRoundTrip : isRoundTrip;

    let exportPts = [...exportPtsList];
    if (exportRound) {
      const reversed = [...exportPtsList].slice(0, -1).reverse().map((p, idx) => ({
        ...p,
        id: `rt-${idx}-${p.id}`,
        name: `Powrót: ${p.name}`,
      }));
      exportPts = [...exportPts, ...reversed];
    }

    const gpxPointsXml = exportPts
      .map(
        (p) => `      <trkpt lat="${p.lat}" lon="${p.lon}">
        <ele>${p.ele}</ele>
        <name>${p.name.replace(/&/g, '&amp;')}</name>
      </trkpt>`
      )
      .join('\n');

    const gpxContent = `<?xml version="1.1" encoding="UTF-8"?>
<gpx version="1.1" creator="RunningPlanerPRO" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${exportName.replace(/&/g, '&amp;')}</name>
    <desc>Dystans: ${exportDist} km, Przewyższenie: +${exportEle}m, Nawierzchnia: ${surfaceBreakdown.dominantSurface}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${exportName.replace(/&/g, '&amp;')}</name>
    <type>Running</type>
    <trkseg>
${gpxPointsXml}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFileName = exportName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `${safeFileName}_${exportDist}km.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowSaveDropdown(false);
    showToast(`Pobrano plik GPX (${exportDist} km)! Wgraj na zegarek Garmin / Coros / Polar ⌚`);
  };

  // AI Route Analysis Call
  const handleAnalyzeRouteAI = async () => {
    setIsAnalyzingAI(true);
    soundEngine.playClick();
    setShowAiModal(true);

    try {
      const res = await fetch('/api/gemini/analyze-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeName,
          totalDistanceKm,
          elevationGainM: totalElevationM,
          surfaceType: surfaceBreakdown.dominantSurface,
          points,
          profile,
        }),
      });

      const data = await res.json();
      setAiAnalysis(data);
      showToast('Fizjolog AI przeanalizował trasę! 🧠');
    } catch (err) {
      console.error('AI route analysis error:', err);
      showToast('Wystąpił błąd podczas analizy AI.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Load Saved Route onto Map Editor
  const handleLoadSavedRoute = (route: SavedRoute) => {
    soundEngine.playSuccess();
    setRouteName(route.title);
    setPoints(route.points);
    setIsRoundTrip(route.isRoundTrip);
    if (route.aiAnalysis) setAiAnalysis(route.aiAnalysis);
    setShowSavedDrawer(false);
    setFitBoundsCounter((c) => c + 1);
    showToast(`Załadowano trasę "${route.title}" na pełny ekran! 🗺️`);
  };

  // Delete saved route
  const handleDeleteSavedRoute = (id: string) => {
    soundEngine.playClick();
    const updated = savedRoutes.filter((r) => r.id !== id);
    setSavedRoutes(updated);
    try {
      localStorage.setItem('saved_running_routes_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed updating localStorage', e);
    }
    showToast('Usunięto trasę z zapisanych.');
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* 1. Edge-to-Edge OpenStreetMap Route Canvas */}
      <OpenStreetMapRouteCanvas
        waypoints={points.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lon,
          name: p.name,
          type: p.type,
        }))}
        pathCoords={pathCoords}
        segments={routeSegments}
        selectedSegmentId={selectedSegmentId}
        onSelectSegment={setSelectedSegmentId}
        isRoundTrip={isRoundTrip}
        onAddPoint={handleAddPointOnOsm}
        onMovePoint={handleMovePointOnOsm}
        onDeletePoint={handleDeleteWaypoint}
        onUndoPoint={handleUndoPoint}
        onClearPoints={handleClearPoints}
        onCloseLoop={handleCloseLoop}
        onSetStartAtLocation={handleSetStartAtLocation}
        isFullScreen={true}
        currentTileStyle={tileStyle}
        fitBoundsTrigger={fitBoundsCounter}
        locateGpsTrigger={locateGpsCounter}
      />

      {/* 2. Top Floating Controls Header with Vector Icons */}
      <header className="absolute top-4 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
        {/* Left top controls: Settings & Runner Activity */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowSettingsModal(true);
            }}
            className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center hover:bg-slate-800 shadow-2xl transition-all cursor-pointer active:scale-95"
            title="Ustawienia trasy i tempo"
          >
            <Settings className="w-5 h-5 text-slate-100" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowSettingsModal(true);
            }}
            className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-amber-400 flex items-center justify-center hover:bg-slate-800 shadow-2xl transition-all cursor-pointer active:scale-95"
            title="Profil biegacza i tempo"
          >
            <Footprints className="w-5 h-5 text-amber-400" />
          </button>

          {/* Quick Route Name Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/15 text-xs text-white max-w-xs truncate shadow-xl">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-bold truncate">{routeName}</span>
          </div>
        </div>

        {/* Center: Surface Preference Selector: Prowadź trasę po: Ścieżki leśne / Chodniki / Asfalt / Dowolna */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/15 shadow-2xl">
          <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-slate-300 pl-2.5 pr-1">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>Prowadź po:</span>
          </span>
          {[
            { id: 'all', label: '🔀 Dowolna' },
            { id: 'forest_trail', label: '🌲 Ścieżki leśne' },
            { id: 'sidewalk', label: '🚶 Chodniki' },
            { id: 'asphalt', label: '🛣️ Asfalt' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSurfacePreference(opt.id as any);
                showToast(`Prowadzenie trasy: ${opt.label}`);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                surfacePreference === opt.id
                  ? 'bg-emerald-400 text-slate-950 font-black shadow-lg scale-102'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={`Prowadź trasę po: ${opt.label}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Right top controls: Yellow Save Button + Close Button */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          {/* Yellow "Zapisz ⌵" Button matching IMG_4511_5e920435.png with Vector Icons */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowSaveDropdown((prev) => !prev);
              }}
              className="bg-[#d7df21] hover:bg-[#c8d01d] text-slate-950 font-black px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2 shadow-2xl active:scale-95 transition-all text-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>Zapisz</span>
              <ChevronDown className="w-4 h-4 text-slate-950" />
            </button>

            {/* Save dropdown menu with Vector Icons */}
            {showSaveDropdown && (
              <div className="absolute right-0 top-12 w-64 p-2 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-xs text-slate-100 space-y-1 animate-ios">
                <button
                  type="button"
                  onClick={handleSaveRoute}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 font-bold flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Zapisz w bibliotece tras</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportGPX()}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 font-bold flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Watch className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Pobierz plik GPX (Garmin / Polar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveRoute();
                    handleExportGPX();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-black flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Zapisz i pobierz GPX</span>
                </button>

                <div className="border-t border-white/10 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowSaveDropdown(false);
                    setShowSavedDrawer(true);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 font-bold text-sky-400 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Moje zapisane trasy</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black">
                    {savedRoutes.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Close Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center hover:bg-slate-800 shadow-2xl transition-all cursor-pointer active:scale-95"
            title="Zamknij planer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* 3. Left Floating Tools Column with Pure Vector Icons */}
      <aside className="absolute left-3 top-20 z-40 flex flex-col gap-2.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setShowInfoModal(true);
          }}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-slate-200 flex items-center justify-center hover:bg-slate-800 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Instrukcja planowania i nawierzchnie"
        >
          <Info className="w-5 h-5 text-slate-200" />
        </button>

        <button
          type="button"
          onClick={handleAnalyzeRouteAI}
          disabled={isAnalyzingAI}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-purple-500/40 text-purple-300 flex items-center justify-center hover:bg-purple-900/40 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Analiza AI & Trener Biegowy"
        >
          {isAnalyzingAI ? (
            <RotateCw className="w-5 h-5 animate-spin text-purple-300" />
          ) : (
            <Brain className="w-5 h-5 text-purple-300" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setIsRoundTrip((prev) => !prev);
            showToast(!isRoundTrip ? 'Włączono tryb: W dwie strony (tam i z powrotem) 🔄' : 'Tryb: W jedną stronę');
          }}
          className={`w-11 h-11 rounded-full backdrop-blur-xl border shadow-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isRoundTrip
              ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
              : 'bg-slate-900/85 border-white/15 text-slate-300 hover:bg-slate-800'
          }`}
          title="Tryb w dwie strony (tam i z powrotem)"
        >
          <Repeat className="w-5 h-5" />
        </button>

        {points.length >= 2 && (
          <button
            type="button"
            onClick={handleCloseLoop}
            className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-emerald-500/40 text-emerald-300 flex items-center justify-center hover:bg-emerald-900/40 shadow-xl transition-all cursor-pointer active:scale-95"
            title="Zamknij pętlę do punktu startu (A)"
          >
            <CornerDownLeft className="w-5 h-5 text-emerald-300" />
          </button>
        )}

        <button
          type="button"
          onClick={handleUndoPoint}
          disabled={points.length <= 1}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-slate-200 flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Cofnij ostatni punkt trasy"
        >
          <Undo2 className="w-5 h-5 text-slate-200" />
        </button>

        <button
          type="button"
          onClick={handleClearPoints}
          disabled={points.length === 0}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-rose-500/30 text-rose-300 flex items-center justify-center hover:bg-rose-950/40 disabled:opacity-30 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Wyczyść całą trasę"
        >
          <Trash2 className="w-5 h-5 text-rose-400" />
        </button>
      </aside>

      {/* 4. Right Floating Tools Column with Pure Vector Icons */}
      <aside className="absolute right-3 top-20 z-40 flex flex-col gap-2.5 pointer-events-auto">
        {/* Search City / Trail Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setShowSearchModal(true);
          }}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-slate-200 flex items-center justify-center hover:bg-slate-800 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Szukaj miasta, parku lub lasu"
        >
          <Search className="w-5 h-5 text-slate-200" />
        </button>

        {/* Fit Bounds to entire route */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setFitBoundsCounter((c) => c + 1);
            showToast('Dopasowano trasę do ekranu ⛶');
          }}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-slate-200 flex items-center justify-center hover:bg-slate-800 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Dopasuj trasę do ekranu"
        >
          <Maximize2 className="w-5 h-5 text-slate-200" />
        </button>

        {/* Locate My GPS */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setLocateGpsCounter((c) => c + 1);
            showToast('Lokalizowanie GPS... 📍');
          }}
          className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-sky-400/50 text-sky-400 flex items-center justify-center hover:bg-sky-950/40 shadow-xl transition-all cursor-pointer active:scale-95"
          title="Moja lokalizacja GPS (Ustaw Start)"
        >
          <Navigation className="w-5 h-5 text-sky-400" />
        </button>

        {/* Switch Tile Layers */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowLayersDropdown((prev) => !prev);
            }}
            className="w-11 h-11 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/15 text-slate-200 flex items-center justify-center hover:bg-slate-800 shadow-xl transition-all cursor-pointer active:scale-95"
            title="Zmień styl mapy"
          >
            <Layers className="w-5 h-5 text-slate-200" />
          </button>

          {showLayersDropdown && (
            <div className="absolute right-14 top-0 w-56 p-2 bg-slate-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-xs text-slate-100 space-y-1 animate-ios">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 block mb-1">Styl mapy:</span>
              {[
                { id: 'dark', label: 'Ciemna (Dark Runner)', icon: Moon, color: 'text-purple-400' },
                { id: 'osm', label: 'OpenStreetMap (Ścieżki)', icon: Map, color: 'text-emerald-400' },
                { id: 'satellite', label: 'Satelita (Esri World)', icon: Globe, color: 'text-sky-400' },
                { id: 'topo', label: 'OpenTopoMap (Teren)', icon: Mountain, color: 'text-amber-400' },
              ].map((layer) => {
                const IconComponent = layer.icon;
                const isCurrent = tileStyle === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setTileStyle(layer.id as any);
                      setShowLayersDropdown(false);
                      showToast(`Zmieniono warstwę mapy: ${layer.label}`);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <IconComponent className={`w-4 h-4 ${isCurrent ? 'text-slate-950' : layer.color}`} />
                      <span>{layer.label}</span>
                    </span>
                    {isCurrent && <Check className="w-4 h-4 text-slate-950" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* 5. Floating Bottom Card / Sheet (Matching IMG_4511_5e920435.png and IMG_4512_f0aa3102.png) */}
      <footer className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-auto sm:w-[480px] sm:left-1/2 sm:-translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl text-white transition-all">
          {/* Drag Handle Top Bar */}
          <div
            onClick={() => setIsSurfaceMode((prev) => !prev)}
            className="w-12 h-1 bg-white/20 hover:bg-white/40 rounded-full mx-auto mb-3 cursor-pointer transition-all"
            title="Kliknij, aby przełączyć widok nawierzchni"
          />

          {!isSurfaceMode ? (
            /* MODE 1: Compact 4 Stats View (IMG_4511_5e920435.png) */
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1 text-center items-end">
                {/* 1. Odległość */}
                <div className="space-y-0.5">
                  <div className="text-base sm:text-2xl font-black text-white tracking-tight whitespace-nowrap">
                    {totalDistanceKm.toFixed(2).replace('.', ',')}{' '}
                    <span className="text-[10px] sm:text-xs font-normal text-slate-300">km</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Odległość</div>
                </div>

                {/* 2. Szac. czas */}
                <div className="space-y-0.5">
                  <div className="text-base sm:text-2xl font-black text-white tracking-tight whitespace-nowrap">
                    {timeString}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Szac. czas</div>
                </div>

                {/* 3. Suma przewyższeń */}
                <div className="space-y-0.5">
                  <div className="text-base sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-0.5 whitespace-nowrap">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                    <span>{totalElevationM}</span>
                    <span className="text-[10px] sm:text-xs font-normal text-slate-300 ml-0.5">m</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate" title="Suma przewyższeń">
                    Suma przew...
                  </div>
                </div>

                {/* 4. Utrata wysokości */}
                <div className="space-y-0.5">
                  <div className="text-base sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-0.5 whitespace-nowrap">
                    <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400 shrink-0" />
                    <span>{totalElevationM}</span>
                    <span className="text-[10px] sm:text-xs font-normal text-slate-300 ml-0.5">m</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate" title="Utrata wysokości">
                    Utrata wyso...
                  </div>
                </div>
              </div>

              {/* Surface preview pill button */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsSurfaceMode(true);
                }}
                className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 hover:text-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  {/* Mini segmented preview bar */}
                  <div className="flex h-2 w-28 rounded-full overflow-hidden bg-white/10">
                    {detailedSurfaces.map((s) => (
                      <div
                        key={s.key}
                        style={{ width: `${s.percent}%`, backgroundColor: s.colorHex }}
                        className="h-full"
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-amber-300">
                    Nawierzchnie trasy (6 kategorii)
                  </span>
                </div>

                <span className="text-xs font-black text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Rozwiń</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                </span>
              </button>
            </div>
          ) : (
            /* MODE 2: Detailed Surface Breakdown View (IMG_4512_f0aa3102.png) */
            <div className="space-y-3 relative">
              {/* Floating Breakdown Popover Box directly above the bar */}
              <div className="mb-2 p-3.5 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-2">
                <div className="space-y-1.5 text-xs">
                  {detailedSurfaces.map((surf) => (
                    <div key={surf.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Colored dash matching screenshot */}
                        <span
                          style={{ backgroundColor: surf.colorHex }}
                          className="w-3.5 h-1.5 rounded-full inline-block"
                        />
                        <span className="text-slate-200 font-semibold">{surf.label}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{formatSurfaceDistance(surf.meters)}</span>
                    </div>
                  ))}
                </div>

                {/* Footwear recommendation badge */}
                <div className="pt-2 border-t border-white/10 flex items-start gap-2.5 text-[11px]">
                  <Footprints className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Sugerowane buty:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[10px]">
                        {surfaceBreakdown.recommendedShoeCategory}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {surfaceBreakdown.shoeReason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Header row: Back button, Title & Info with Vector Icons */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsSurfaceMode(false);
                  }}
                  className="flex items-center gap-2 text-white hover:text-amber-300 font-bold text-sm cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                  <span>Nawierzchnie</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowInfoModal(true);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs cursor-pointer"
                  title="Szczegóły kategoryzacji nawierzchni"
                >
                  <Info className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>

              {/* Subtitle row with Vector Icons matching screenshot */}
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium px-1">
                <span className="flex items-center gap-1">
                  <Milestone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{totalDistanceKm.toFixed(2).replace('.', ',')} km</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{timeString}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{totalElevationM} m</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>{totalElevationM} m</span>
                </span>
              </div>

              {/* Full width segmented progress bar matching IMG_4512_f0aa3102.png */}
              <div className="flex h-3.5 w-full rounded-full overflow-hidden shadow-inner border border-white/10">
                {detailedSurfaces.map((surf) => (
                  <div
                    key={surf.key}
                    style={{ width: `${surf.percent}%`, backgroundColor: surf.colorHex }}
                    className="h-full transition-all duration-300"
                    title={`${surf.label}: ${surf.percent}% (${formatSurfaceDistance(surf.meters)})`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* 6. Search Dialog Modal with Vector Icons */}
      {showSearchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 pt-16 animate-ios"
        >
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span>Wyszukaj miasto, las lub park</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleSearchNominatimSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="np. Zgierz Malinka, Park Poniatowskiego, Zakopane..."
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm font-bold text-white outline-none focus:border-amber-400"
              />

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSearchingNominatim || !searchQuery.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchingNominatim ? 'Szukam...' : 'Pokaż na mapie'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Settings / Route Name & Target Pace Modal with Vector Icons */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-ios"
        >
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Ustawienia Trasy & Profilu</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nazwa Trasy:
                </label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Twoje średnie tempo biegowe (min/km):
                </label>
                <input
                  type="text"
                  value={targetPace}
                  onChange={(e) => setTargetPace(e.target.value)}
                  placeholder="5:20"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm font-bold text-white outline-none focus:border-amber-400 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Używane do precyzyjnego wyliczania szacowanego czasu pokonania pętli.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSuccess();
                    setShowSettingsModal(false);
                    showToast('Zaktualizowano parametry trasy! ✓');
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Zastosuj zmiany</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. AI Coach Briefing Modal with Vector Icons */}
      {showAiModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-ios"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-2xl space-y-4 text-white max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-sm flex items-center gap-2 text-purple-400">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Odprawa Trenera AI dla tej trasy</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {isAnalyzingAI ? (
              <div className="py-8 text-center space-y-3">
                <RotateCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                <div className="text-xs font-bold text-purple-300 animate-pulse">
                  Fizjolog AI analizuje nawierzchnie, przewyższenia i podłoże...
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-slate-200 italic leading-relaxed">
                  "{aiAnalysis.summary}"
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5 text-amber-400" />
                      <span>Obuwie:</span>
                    </span>
                    <strong className="text-amber-300 block">{aiAnalysis.recommendedShoes}</strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      <span>Nawodnienie:</span>
                    </span>
                    <strong className="text-sky-300 block">{aiAnalysis.hydrationStrategy}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-[11px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Wskazówki bezpieczeństwa:</span>
                  </span>
                  <p className="text-slate-300">{aiAnalysis.safetyTips}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-400">Kliknij przycisk poniżej, aby wygenerować analizę AI.</p>
                <button
                  type="button"
                  onClick={handleAnalyzeRouteAI}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Rozpocznij analizę AI</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Saved Routes Drawer Modal with Vector Icons */}
      {showSavedDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-ios"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Folder className="w-4 h-4 text-sky-400" />
                <span>Moje Zapisane Trasy ({savedRoutes.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSavedDrawer(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {savedRoutes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Brak zapisanych tras. Stwórz trasę na mapie i kliknij żółty przycisk "Zapisz".
                </div>
              ) : (
                savedRoutes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 space-y-2 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-white">{r.title}</h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-amber-300">{r.distanceKm} km</span>
                          <span>•</span>
                          <span>↗ +{r.elevationGainM} m</span>
                          <span>•</span>
                          <span>⏱ {r.estimatedTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedRoute(r)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Wczytaj</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportGPX(r)}
                          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs"
                          title="Pobierz GPX"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedRoute(r.id)}
                          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs"
                          title="Usuń"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. Info Modal with Vector Icons */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-ios"
        >
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Jak planować trasy biegowe?</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-white/5 space-y-1">
                <strong className="text-white flex items-center gap-2 font-black">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Kliknięcie na mapie</span>
                </strong>
                <p>Dodaje kolejny punkt trasy. Algorytm OSRM automatycznie prowadzi trasę po legalnych ścieżkach pieszych, parkowych i leśnych.</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 space-y-1">
                <strong className="text-white flex items-center gap-2 font-black">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Przeciąganie punktów</span>
                </strong>
                <p>Możesz złapać i przeciągnąć punkt A (Start) lub punkt B (Meta), a trasa natychmiast przeliczy się na nowo.</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 space-y-1">
                <strong className="text-white flex items-center gap-2 font-black">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Klasyfikacja 6 nawierzchni</span>
                </strong>
                <p>System analizuje proporcje utwardzenia, ścieżek naturalnych, szutru i asfaltu, doradzając optymalne obuwie biegowe.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer"
            >
              Rozumiem, ruszajmy w trasę!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
