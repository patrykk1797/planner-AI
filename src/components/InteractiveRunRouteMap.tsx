import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Footprints,
  Clock,
  Heart,
  TrendingUp,
  Image as ImageIcon,
  Map as MapIcon,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import { RunLog } from '../types.ts';

interface InteractiveRunRouteMapProps {
  run: RunLog | null;
  heightClass?: string;
  screenshotUrl?: string;
  cityName?: string;
  title?: string;
  className?: string;
  onUpdateRunRoute?: (runId: string, coords: Array<{ lat: number; lng: number }>) => void;
}

const TILE_LAYERS: Record<
  'dark' | 'osm' | 'satellite',
  { name: string; url: string; referenceUrl?: string; attribution: string; maxZoom: number; subdomains?: string }
> = {
  dark: {
    name: 'Ciemna (Dark Runner)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin',
    maxZoom: 16,
  },
  osm: {
    name: 'OpenStreetMap (Ścieżki & Parki)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
  satellite: {
    name: 'Satelita (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar',
    maxZoom: 19,
  },
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function generateScenicLoop(
  centerLat: number,
  centerLng: number,
  distanceKm: number,
  seed: number = 0
): Array<{ lat: number; lng: number }> {
  const approxRadiusKm = (distanceKm / (2 * Math.PI)) * 0.94;
  const approxRadiusDegLat = approxRadiusKm / 111;
  const approxRadiusDegLng = approxRadiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

  const numPoints = Math.max(36, Math.min(120, Math.round(distanceKm * 9)));
  const coords: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const wobble =
      1 +
      0.18 * Math.sin(angle * 3 + seed) +
      0.1 * Math.cos(angle * 5 + seed * 1.5) +
      0.05 * Math.sin(angle * 7 - seed);
    const lat = centerLat + Math.sin(angle + seed * 0.3) * approxRadiusDegLat * wobble;
    const lng = centerLng + Math.cos(angle + seed * 0.3) * approxRadiusDegLng * wobble;
    coords.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
  }

  coords.push({ ...coords[0] });
  return coords;
}

export const InteractiveRunRouteMap: React.FC<InteractiveRunRouteMapProps> = ({
  run,
  heightClass = 'h-72 sm:h-84',
  screenshotUrl,
  cityName = 'Warszawa',
  title,
  className = '',
  onUpdateRunRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const canvas25dRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const refLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);

  // Available modes: 'trace_25d' | 'map_gps' | 'screenshot'
  const hasScreenshot = Boolean(run?.screenshotUrl || screenshotUrl);
  const [activeMode, setActiveMode] = useState<'trace_25d' | 'map_gps' | 'screenshot'>('trace_25d');
  const [tileStyle, setTileStyle] = useState<'dark' | 'osm' | 'satellite'>('dark');
  const [variantSeed, setVariantSeed] = useState<number>(0);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // City anchors
  const CITY_ANCHORS: Record<string, { lat: number; lng: number }> = {
    zgierz: { lat: 51.8569, lng: 19.4064 },
    warszawa: { lat: 52.2297, lng: 21.0122 },
    kraków: { lat: 50.0647, lng: 19.945 },
    wrocław: { lat: 51.1079, lng: 17.0385 },
    poznań: { lat: 52.4064, lng: 16.9252 },
    gdańsk: { lat: 54.352, lng: 18.6466 },
    łódź: { lat: 51.7592, lng: 19.456 },
  };

  const centerAnchor = useMemo(() => {
    const cleanCity = (cityName || 'warszawa').toLowerCase().trim();
    return CITY_ANCHORS[cleanCity] || CITY_ANCHORS['warszawa'];
  }, [cityName]);

  // Compute GPS coordinates
  const gpsCoords = useMemo(() => {
    if (drawnPoints.length >= 2) return drawnPoints;
    if (run?.routeCoords && run.routeCoords.length >= 2) {
      if (variantSeed === 0) return run.routeCoords;
    }
    const dist = run?.distanceKm || 7.5;
    return generateScenicLoop(centerAnchor.lat, centerAnchor.lng, dist, variantSeed);
  }, [run, centerAnchor, variantSeed, drawnPoints]);

  // Compute 2.5D Normalized Trace Points (0..100 range)
  const normalizedTrace = useMemo(() => {
    if (run?.normalizedTracePoints && run.normalizedTracePoints.length >= 3) {
      return run.normalizedTracePoints;
    }
    if (gpsCoords.length >= 3) {
      const lats = gpsCoords.map((p) => p.lat);
      const lngs = gpsCoords.map((p) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const rangeLat = maxLat - minLat || 0.01;
      const rangeLng = maxLng - minLng || 0.01;

      return gpsCoords.map((p) => ({
        x: Math.round(((p.lng - minLng) / rangeLng) * 80 + 10),
        y: Math.round((1 - (p.lat - minLat) / rangeLat) * 80 + 10),
      }));
    }
    // Default organic loop
    const points: Array<{ x: number; y: number }> = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI;
      const r = 36 + 7 * Math.sin(a * 3) + 4 * Math.cos(a * 4);
      points.push({
        x: Math.round(50 + r * Math.cos(a)),
        y: Math.round(50 + r * Math.sin(a) * 0.85),
      });
    }
    points.push({ ...points[0] });
    return points;
  }, [run, gpsCoords]);

  // RENDER 2.5D VECTOR TRACE CANVAS
  useEffect(() => {
    if (activeMode !== 'trace_25d') return;
    const canvas = canvas25dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Dark Futuristic Grid Background with 2.5D floor perspective
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.7, '#080d1a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle isometric grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      const gridStep = 24;
      for (let x = 0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (normalizedTrace.length < 2) return;

      // Project trace points into canvas space with margin
      const margin = 36;
      const drawW = w - margin * 2;
      const drawH = h - margin * 2;

      const screenPoints = normalizedTrace.map((pt) => ({
        x: margin + (pt.x / 100) * drawW,
        y: margin + (pt.y / 100) * drawH,
      }));

      // 2. Neon Outer Glow Stroke
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      screenPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // 3. Electric Cyan Middle Core
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf8';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 4. White Hot Center Line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f0fdf4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 5. Pulsing Runner Dot moving along the track
      const totalSegs = screenPoints.length - 1;
      if (totalSegs > 0) {
        const progress = (t * 0.4) % 1;
        const currentIdx = Math.floor(progress * totalSegs);
        const nextIdx = Math.min(totalSegs, currentIdx + 1);
        const segProgress = (progress * totalSegs) - currentIdx;
        const p1 = screenPoints[currentIdx];
        const p2 = screenPoints[nextIdx];
        const runnerX = p1.x + (p2.x - p1.x) * segProgress;
        const runnerY = p1.y + (p2.y - p1.y) * segProgress;

        // Glowing runner beacon
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(runnerX, runnerY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(runnerX, runnerY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Start (A) & Finish (B) markers
      const startPt = screenPoints[0];
      const finishPt = screenPoints[screenPoints.length - 1];

      // Start Marker (Green)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', startPt.x, startPt.y);

      // Finish Marker (Orange)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(finishPt.x, finishPt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('B', finishPt.x, finishPt.y);

      // 7. Kilometer Badges along the path
      const totalDist = run?.distanceKm || 7.5;
      const numKm = Math.min(10, Math.floor(totalDist));
      if (numKm >= 2 && totalSegs > 0) {
        for (let k = 1; k <= numKm; k++) {
          const frac = k / totalDist;
          if (frac >= 0.95) continue;
          const idx = Math.floor(frac * totalSegs);
          const pt = screenPoints[idx];
          if (!pt) continue;

          // Km Badge Pill
          const text = `${k}k`;
          ctx.font = 'bold 9px monospace';
          const txtWidth = ctx.measureText(text).width;
          const pillW = txtWidth + 10;
          const pillH = 14;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pt.x - pillW / 2, pt.y - pillH / 2, pillW, pillH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, pt.x, pt.y);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeMode, normalizedTrace, run]);

  // LEAFLET MAP INITIALIZATION & DRAWING MODE
  useEffect(() => {
    if (activeMode !== 'map_gps') return;
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      gpsCoords.length > 0 ? [gpsCoords[0].lat, gpsCoords[0].lng] : [centerAnchor.lat, centerAnchor.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    const layerCfg = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;
    const tileLayer = L.tileLayer(layerCfg.url, {
      attribution: layerCfg.attribution,
      maxZoom: layerCfg.maxZoom,
      subdomains: layerCfg.subdomains || 'abc',
    }).addTo(map);

    let refLayer: L.TileLayer | null = null;
    if (layerCfg.referenceUrl) {
      refLayer = L.tileLayer(layerCfg.referenceUrl, { maxZoom: layerCfg.maxZoom }).addTo(map);
    }

    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const drawGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;
    refLayerRef.current = refLayer;
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = markersGroup;
    drawLayerRef.current = drawGroup;

    // Click handler for finger drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return;
      setDrawnPoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    });

    const observer = new ResizeObserver(() => {
      setTimeout(() => mapRef.current?.invalidateSize(), 80);
    });
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      refLayerRef.current = null;
      routeLayerRef.current = null;
      markersLayerRef.current = null;
      drawLayerRef.current = null;
    };
  }, [activeMode, centerAnchor, tileStyle]);

  // Update Leaflet Route & Markers
  useEffect(() => {
    if (activeMode !== 'map_gps' || !mapRef.current) return;
    const routeGroup = routeLayerRef.current;
    const markersGroup = markersLayerRef.current;
    if (!routeGroup || !markersGroup || gpsCoords.length < 2) return;

    routeGroup.clearLayers();
    markersGroup.clearLayers();

    const latLngs: [number, number][] = gpsCoords.map((p) => [p.lat, p.lng]);

    // Outer dark halo
    L.polyline(latLngs, {
      color: '#020617',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // Glowing cyan line
    L.polyline(latLngs, {
      color: '#38bdf8',
      weight: 5,
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // Start Pin (A)
    const startPt = gpsCoords[0];
    const startHtml = `
      <div style="width:28px;height:28px;border-radius:999px;background:#10b981;border:2.5px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;box-shadow:0 4px 10px rgba(0,0,0,0.5);">A</div>
    `;
    L.marker([startPt.lat, startPt.lng], {
      icon: L.divIcon({ className: '', html: startHtml, iconSize: [28, 28], iconAnchor: [14, 14] }),
    }).addTo(markersGroup);

    // Finish Pin (B)
    const finishPt = gpsCoords[gpsCoords.length - 1];
    const finishHtml = `
      <div style="width:28px;height:28px;border-radius:999px;background:#ea580c;border:2.5px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;box-shadow:0 4px 10px rgba(0,0,0,0.5);">B</div>
    `;
    L.marker([finishPt.lat, finishPt.lng], {
      icon: L.divIcon({ className: '', html: finishHtml, iconSize: [28, 28], iconAnchor: [14, 14] }),
    }).addTo(markersGroup);

    // Fit bounds
    const bounds = L.latLngBounds(latLngs);
    mapRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
  }, [activeMode, gpsCoords]);

  const handleNextVariant = () => {
    setDrawnPoints([]);
    setIsDrawingMode(false);
    setVariantSeed((prev) => prev + 1);
  };

  const handleToggleDraw = () => {
    if (!isDrawingMode) {
      setDrawnPoints([]);
    }
    setIsDrawingMode((prev) => !prev);
  };

  const handleSaveDrawn = () => {
    if (run && drawnPoints.length >= 2 && onUpdateRunRoute) {
      onUpdateRunRoute(run.id, drawnPoints);
    }
    setIsDrawingMode(false);
  };

  return (
    <div
      className={`space-y-2.5 rounded-3xl liquid-glass border border-sky-500/30 p-3.5 sm:p-4 relative overflow-hidden shadow-xl ${className}`}
    >
      {/* Top Header & 3-Mode Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
            <Navigation className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>INTELIGENTNA TRASA BIEGU</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black txt-main truncate">
              {title || run?.title || `Trasa Biegu • ${run?.distanceKm || 0} km`}
            </h3>
          </div>
        </div>

        {/* 3-Mode View Switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMode('trace_25d')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
              activeMode === 'trace_25d'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ślad 2.5D</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('map_gps')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
              activeMode === 'map_gps'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Mapa GPS</span>
          </button>

          {hasScreenshot && (
            <button
              type="button"
              onClick={() => setActiveMode('screenshot')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                activeMode === 'screenshot'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Zrzut ekranu</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Visualizer Container */}
      <div className="relative">
        {/* MODE 1: NEON 2.5D VECTOR TRACE */}
        {activeMode === 'trace_25d' && (
          <div
            className={`w-full ${
              isExpanded ? 'h-[460px]' : heightClass
            } rounded-2xl overflow-hidden border border-sky-500/30 relative shadow-2xl bg-slate-950`}
          >
            <canvas
              ref={canvas25dRef}
              width={700}
              height={380}
              className="w-full h-full object-cover block"
            />
            {/* 2.5D Trace Overlay Badge */}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-bold text-sky-300 flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Wektorowy Ślad Trasy 2.5D</span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-sky-500 hover:text-black transition-all cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* MODE 2: LEAFLET GPS MAP (OSRM Loop + Variant + Draw with Finger) */}
        {activeMode === 'map_gps' && (
          <div
            className={`w-full ${
              isExpanded ? 'h-[480px]' : heightClass
            } rounded-2xl overflow-hidden border-2 border-sky-500/30 relative shadow-2xl bg-slate-950`}
          >
            <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

            {/* GPS Toolbar: Inny wariant pętli & Narysuj palcem */}
            <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleNextVariant}
                className="px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-sky-300 text-[10px] font-black flex items-center gap-1 hover:bg-sky-500 hover:text-black transition-all shadow-md cursor-pointer"
                title="Wygeneruj inną pętlę po alejkach"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Inny wariant pętli</span>
              </button>

              <button
                type="button"
                onClick={handleToggleDraw}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all shadow-md cursor-pointer ${
                  isDrawingMode
                    ? 'bg-amber-500 text-slate-950 border border-amber-300 animate-pulse'
                    : 'bg-black/85 backdrop-blur-md border border-white/20 text-white hover:bg-amber-500/20'
                }`}
              >
                <Edit2 className="w-3 h-3" />
                <span>{isDrawingMode ? 'Rysuj palcem (klikaj mapę)' : 'Narysuj palcem'}</span>
              </button>

              {isDrawingMode && drawnPoints.length >= 2 && (
                <button
                  type="button"
                  onClick={handleSaveDrawn}
                  className="px-2 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Zapisz trasę</span>
                </button>
              )}
            </div>

            {/* Floating Zoom & Expand Controls */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (mapRef.current && gpsCoords.length >= 2) {
                    mapRef.current.fitBounds(L.latLngBounds(gpsCoords.map((p) => [p.lat, p.lng])));
                  }
                }}
                className="w-7 h-7 rounded-lg bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-sky-500 hover:text-black transition-all shadow-md cursor-pointer"
                title="Wyśrodkuj"
              >
                <Navigation className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-7 h-7 rounded-lg bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-sky-500 hover:text-black transition-all shadow-md cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: SCREENSHOT */}
        {activeMode === 'screenshot' && hasScreenshot && (
          <div
            className={`w-full ${
              isExpanded ? 'h-[460px]' : heightClass
            } rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center relative shadow-inner`}
          >
            <img
              src={run?.screenshotUrl || screenshotUrl}
              alt="Zrzut trasy z aplikacji"
              className="max-h-full max-w-full object-contain"
            />
            <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 text-slate-200 px-2.5 py-1 rounded-lg border border-white/15">
              📸 Oryginalny zrzut z aplikacji biegowej
            </span>
          </div>
        )}

        {/* Bottom Floating Stats Pill */}
        <div className="mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between gap-2 shadow-lg flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-sky-400" />
              <span className="font-black text-white font-mono text-sm">{run?.distanceKm || 0} km</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{run?.avgPace || '5:15'}/km</span>
            </div>
            {run?.avgHr && (
              <div className="flex items-center gap-1 text-rose-300 font-mono text-xs">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>{run.avgHr} bpm</span>
              </div>
            )}
            {run?.elevationGainM !== undefined && (
              <div className="hidden sm:flex items-center gap-1 text-emerald-300 font-mono text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>+{run.elevationGainM} m</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-sky-300 font-bold bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
            <span>🟢 Start A</span>
            <span className="opacity-50">•</span>
            <span>🏁 Meta B</span>
          </div>
        </div>
      </div>
    </div>
  );
};
