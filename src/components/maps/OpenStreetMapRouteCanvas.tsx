import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface OsmWaypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'start' | 'via' | 'finish';
}

export interface OsmColoredSegment {
  id: string;
  startCoord: { lat: number; lng: number };
  endCoord: { lat: number; lng: number };
  surface: 'asfalt' | 'szuter' | 'ścieżka leśna' | 'chodnik';
  distanceMeters: number;
  nearbyPlaceOrRoadName?: string;
}

interface OpenStreetMapRouteCanvasProps {
  waypoints: OsmWaypoint[];
  pathCoords: { lat: number; lng: number }[];
  segments?: OsmColoredSegment[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (id: string | null) => void;
  isRoundTrip?: boolean;
  snapToFootpaths?: boolean;
  onAddPoint: (lat: number, lng: number, customName?: string) => void;
  onMovePoint: (id: string, lat: number, lng: number) => void;
  onDeletePoint: (id: string) => void;
  onUndoPoint: () => void;
  onClearPoints: () => void;
  onCloseLoop?: () => void;
  onSetStartAtLocation?: (lat: number, lng: number, label: string) => void;
  heightClass?: string;
  isFullScreen?: boolean;
  currentTileStyle?: 'osm' | 'topo' | 'dark' | 'satellite';
  onTileStyleChange?: (style: 'osm' | 'topo' | 'dark' | 'satellite') => void;
  fitBoundsTrigger?: number;
  locateGpsTrigger?: number;
}

const TILE_LAYERS: Record<
  'osm' | 'topo' | 'dark' | 'satellite',
  { name: string; url: string; referenceUrl?: string; attribution: string; maxZoom: number; subdomains?: string }
> = {
  dark: {
    name: 'Ciemna (Dark Runner)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap',
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
    name: 'Satelita (Esri World Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  topo: {
    name: 'Teren & Poziomice (Esri Topo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, OpenStreetMap',
    maxZoom: 19,
  },
};

const SURFACE_HEX: Record<string, string> = {
  asfalt: '#3b82f6',
  szuter: '#f59e0b',
  'ścieżka leśna': '#10b981',
  chodnik: '#06b6d4',
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

export const OpenStreetMapRouteCanvas: React.FC<OpenStreetMapRouteCanvasProps> = ({
  waypoints,
  pathCoords,
  segments,
  selectedSegmentId,
  onSelectSegment,
  isRoundTrip = false,
  onAddPoint,
  onMovePoint,
  onDeletePoint,
  onUndoPoint,
  onClearPoints,
  onCloseLoop,
  onSetStartAtLocation,
  heightClass = 'h-80 sm:h-96',
  isFullScreen = false,
  currentTileStyle,
  onTileStyleChange,
  fitBoundsTrigger,
  locateGpsTrigger,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const refLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [tileStyle, setTileStyle] = useState<'osm' | 'topo' | 'dark' | 'satellite'>(
    currentTileStyle || 'dark'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Sync external tileStyle prop
  useEffect(() => {
    if (currentTileStyle && currentTileStyle !== tileStyle) {
      setTileStyle(currentTileStyle);
    }
  }, [currentTileStyle]);

  // Keep latest callbacks in refs so Leaflet event listeners always invoke fresh functions
  const onAddPointRef = useRef(onAddPoint);
  const onMovePointRef = useRef(onMovePoint);
  const onDeletePointRef = useRef(onDeletePoint);
  const onSelectSegmentRef = useRef(onSelectSegment);

  useEffect(() => {
    onAddPointRef.current = onAddPoint;
    onMovePointRef.current = onMovePoint;
    onDeletePointRef.current = onDeletePoint;
    onSelectSegmentRef.current = onSelectSegment;
  }, [onAddPoint, onMovePoint, onDeletePoint, onSelectSegment]);

  // 1. Initialize OpenStreetMap (Leaflet) instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [51.8569, 19.4064];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false, // Cleaner UI with custom floating controls
    });

    const layerCfg = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;
    const tileLayer = L.tileLayer(layerCfg.url, {
      attribution: layerCfg.attribution,
      maxZoom: layerCfg.maxZoom,
      subdomains: layerCfg.subdomains || 'abc',
    }).addTo(map);

    let refLayer: L.TileLayer | null = null;
    if (layerCfg.referenceUrl) {
      refLayer = L.tileLayer(layerCfg.referenceUrl, {
        maxZoom: layerCfg.maxZoom,
      }).addTo(map);
    }

    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(5));
      const lng = Number(e.latlng.lng.toFixed(5));
      onAddPointRef.current(lat, lng);
    });

    mapRef.current = map;
    tileLayerRef.current = tileLayer;
    refLayerRef.current = refLayer;
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = markersGroup;

    // Ensure proper tile sizing inside modals + ResizeObserver
    const observer = new ResizeObserver(() => {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    });
    observer.observe(mapContainerRef.current);

    // Staggered invalidateSize to guarantee tile loading across all view transitions
    [50, 150, 300, 600, 1200].forEach((ms) => {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, ms);
    });

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      refLayerRef.current = null;
      routeLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // 2. Switch OpenStreetMap tile style
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }
    if (refLayerRef.current) {
      refLayerRef.current.remove();
      refLayerRef.current = null;
    }

    const cfg = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
    }).addTo(mapRef.current);

    if (cfg.referenceUrl) {
      refLayerRef.current = L.tileLayer(cfg.referenceUrl, {
        maxZoom: cfg.maxZoom,
      }).addTo(mapRef.current);
    }

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);
  }, [tileStyle]);

  // 3. Render Waypoint Markers & Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersLayerRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !markersGroup || !routeGroup) return;

    markersGroup.clearLayers();
    routeGroup.clearLayers();

    // A) Draw route polylines
    if (pathCoords.length >= 2) {
      if (segments && segments.length > 0) {
        segments.forEach((seg) => {
          const color = SURFACE_HEX[seg.surface] || '#3b82f6';
          const isSelected = selectedSegmentId === seg.id;
          const poly = L.polyline(
            [
              [seg.startCoord.lat, seg.startCoord.lng],
              [seg.endCoord.lat, seg.endCoord.lng],
            ],
            {
              color,
              weight: isSelected ? 8 : 6,
              opacity: isSelected ? 1 : 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }
          );

          poly.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            if (onSelectSegmentRef.current) {
              onSelectSegmentRef.current(seg.id);
            }
          });

          poly.addTo(routeGroup);
        });
      } else {
        const latLngs: [number, number][] = pathCoords.map((p) => [p.lat, p.lng]);
        // Outer dark glow/halo line
        L.polyline(latLngs, {
          color: '#090d16',
          weight: 9,
          opacity: 0.75,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        // Vibrant Komoot-style electric blue path
        L.polyline(latLngs, {
          color: '#3b82f6',
          weight: 5.5,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        if (isRoundTrip) {
          const reversed = [...latLngs].reverse();
          L.polyline(reversed, {
            color: '#38bdf8',
            weight: 3,
            opacity: 0.8,
            dashArray: '6, 6',
          }).addTo(routeGroup);
        }
      }

      // Draw kilometer badges along route (1 km, 2 km, 3 km...)
      let accMeters = 0;
      let nextKmTarget = 1;
      for (let i = 0; i < pathCoords.length - 1; i++) {
        const d = haversineMeters(pathCoords[i], pathCoords[i + 1]);
        accMeters += d;
        if (accMeters >= nextKmTarget * 1000 && nextKmTarget <= 42) {
          const kmPoint = pathCoords[i + 1];
          const kmIcon = L.divIcon({
            className: 'osm-km-badge',
            html: `<div style="background:#0f172a;color:#60a5fa;border:1.5px solid #3b82f6;border-radius:999px;padding:1px 5px;font-size:9px;font-weight:900;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6);">${nextKmTarget} km</div>`,
            iconSize: [34, 18],
            iconAnchor: [17, 9],
          });
          L.marker([kmPoint.lat, kmPoint.lng], { icon: kmIcon, interactive: false }).addTo(routeGroup);
          nextKmTarget += 1;
        }
      }
    }

    // B) Draw Draggable Waypoint Markers (Matching Screenshot: Start A = Blue Vector, Finish B = Orange Vector)
    waypoints.forEach((wp, idx) => {
      const isStart = idx === 0;
      const isFinish = idx === waypoints.length - 1 && waypoints.length > 1;

      let markerHtml = '';
      if (isStart) {
        // Start: Blue marker with crisp SVG vector circle & letter A
        markerHtml = `
          <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:grab;">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="17" cy="17" r="16" fill="#2563eb" fill-opacity="0.3" />
              <circle cx="17" cy="17" r="13" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" />
              <text x="17" y="21.5" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="900" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">A</text>
            </svg>
          </div>
        `;
      } else if (isFinish) {
        // Finish: Orange marker with crisp SVG vector circle & letter B
        markerHtml = `
          <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:grab;">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="17" cy="17" r="16" fill="#ea580c" fill-opacity="0.3" />
              <circle cx="17" cy="17" r="13" fill="#ea580c" stroke="#ffffff" stroke-width="2.5" />
              <text x="17" y="21.5" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="900" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">B</text>
            </svg>
          </div>
        `;
      } else {
        // Intermediate waypoint: Amber numbered SVG pin
        markerHtml = `
          <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:grab;">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="11" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
              <text x="14" y="18" text-anchor="middle" fill="#090b10" font-size="10" font-weight="900" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">${idx + 1}</text>
            </svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'osm-custom-waypoint',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([wp.lat, wp.lng], {
        icon: customIcon,
        draggable: true,
        title: `${wp.name} (Przeciągnij, aby przesunąć)`,
      });

      marker.on('dragend', (ev) => {
        const newPos = (ev.target as L.Marker).getLatLng();
        onMovePointRef.current(
          wp.id,
          Number(newPos.lat.toFixed(5)),
          Number(newPos.lng.toFixed(5))
        );
      });

      // Popup with point info and delete button
      const popupDiv = document.createElement('div');
      popupDiv.style.fontSize = '11px';
      popupDiv.style.color = '#0f172a';
      popupDiv.style.minWidth = '140px';
      popupDiv.innerHTML = `
        <div style="font-weight:800;margin-bottom:2px;">${isStart ? '🟢 Start (A)' : isFinish ? '🏁 Meta (B)' : `#${idx + 1}`} ${wp.name}</div>
        <div style="font-family:monospace;font-size:10px;color:#475569;margin-bottom:6px;">${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}</div>
      `;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '🗑️ Usuń ten punkt';
      delBtn.style.cssText =
        'width:100%;padding:4px 8px;border-radius:6px;background:#ef4444;color:#fff;font-weight:800;font-size:10px;border:none;cursor:pointer;';
      delBtn.onclick = (ev) => {
        ev.stopPropagation();
        map.closePopup();
        onDeletePointRef.current(wp.id);
      };
      popupDiv.appendChild(delBtn);

      marker.bindPopup(popupDiv);
      marker.addTo(markersGroup);
    });
  }, [waypoints, pathCoords, segments, selectedSegmentId, isRoundTrip]);

  // Helper: Fly to current route bounds
  const handleFitBounds = () => {
    if (!mapRef.current) return;
    const pts = pathCoords.length >= 2 ? pathCoords : waypoints;
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  };

  // Helper: Locate user via GPS and set Start
  const handleLocateGps = () => {
    if (!('geolocation' in navigator)) {
      setSearchMessage('Brak wsparcia geolokalizacji GPS w przeglądarce.');
      return;
    }
    setSearchMessage('Pobieranie pozycji GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 15);
        }
        if (onSetStartAtLocation) {
          onSetStartAtLocation(lat, lng, 'Start: Moja Lokalizacja GPS');
        } else {
          onAddPoint(lat, lng, 'Start: Moja Lokalizacja GPS');
        }
        setSearchMessage('Ustawiono mapę na Twojej lokalizacji GPS 📍');
      },
      () => {
        setSearchMessage('Nie udało się pobrać GPS. Wpisz nazwę miejscowości w wyszukiwarce.');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Triggers from parent
  useEffect(() => {
    if (fitBoundsTrigger && fitBoundsTrigger > 0) {
      handleFitBounds();
    }
  }, [fitBoundsTrigger]);

  useEffect(() => {
    if (locateGpsTrigger && locateGpsTrigger > 0) {
      handleLocateGps();
    }
  }, [locateGpsTrigger]);

  // Search place on OpenStreetMap Nominatim
  const handleSearchNominatim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingPlace(true);
    setSearchMessage(null);

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

        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 15);
        }
        if (onSetStartAtLocation) {
          onSetStartAtLocation(lat, lng, `Start: ${shortName}`);
        } else {
          onAddPoint(lat, lng, shortName);
        }
        setSearchMessage(`Przeniesiono na: ${shortName} (${lat}, ${lng})`);
      } else {
        setSearchMessage('Nie znaleziono miejsca na OpenStreetMap. Spróbuj innej nazwy.');
      }
    } catch {
      setSearchMessage('Błąd wyszukiwania OpenStreetMap Nominatim.');
    } finally {
      setIsSearchingPlace(false);
    }
  };

  // If in fullscreen mode, render clean edge-to-edge canvas
  if (isFullScreen) {
    return (
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Top Search & Layer Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchNominatim} className="flex-1 flex items-center gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Szukaj miasta, parku lub lasu na OpenStreetMap (np. Zgierz Malinka)..."
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs txt-main font-bold outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={isSearchingPlace}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 transition-all cursor-pointer"
          >
            {isSearchingPlace ? '...' : 'Szukaj OSM'}
          </button>
        </form>

        {/* Map Layer Selector */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['osm', 'topo', 'dark'] as const).map((styleKey) => (
            <button
              key={styleKey}
              type="button"
              onClick={() => setTileStyle(styleKey)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                tileStyle === styleKey
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {styleKey === 'osm' ? '🗺️ OSM Ścieżki' : styleKey === 'topo' ? '⛰️ Topo' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      {searchMessage && (
        <div className="text-[10px] text-emerald-300 font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
          <span>{searchMessage}</span>
          <button
            type="button"
            onClick={() => setSearchMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Point-Setting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleLocateGps}
            className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer"
            title="Wyśrodkuj na moim GPS i ustaw Start"
          >
            <span>📍</span>
            <span>Mój GPS (Start)</span>
          </button>

          {onCloseLoop && waypoints.length >= 2 && (
            <button
              type="button"
              onClick={onCloseLoop}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer"
              title="Połącz ostatni punkt z punktem Startu, tworząc zamkniętą pętlę"
            >
              <span>🔄</span>
              <span>Zamknij pętlę do Startu</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFitBounds}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>🔍</span>
            <span>Dopasuj widok</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUndoPoint}
            disabled={waypoints.length === 0}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-black disabled:opacity-40 transition-all cursor-pointer"
          >
            ↩️ Cofnij punkt
          </button>
          <button
            type="button"
            onClick={onClearPoints}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-black transition-all cursor-pointer"
          >
            🗑️ Wyczyść mapę
          </button>
        </div>
      </div>

      {/* Interactive OpenStreetMap Canvas */}
      <div className={`w-full ${heightClass} rounded-2xl overflow-hidden border-2 border-emerald-500/30 relative shadow-xl bg-slate-900`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Instruction Overlay Pill */}
        <div className="absolute top-2.5 right-2.5 z-[400] bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-[10px] font-bold text-emerald-300 shadow-lg pointer-events-none">
          👆 Kliknij na mapie = Dodaj punkt • ✋ Przeciągnij punkt = Przesuń trasę
        </div>

        {/* Surface Legend */}
        <div className="absolute bottom-2.5 left-2.5 z-[400] p-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-[10px] space-y-1 shadow-xl pointer-events-none">
          <div className="font-black text-slate-300 text-[9px] uppercase tracking-wider">
            OpenStreetMap + OSRM Footpath:
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Ścieżka leśna</span>
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Chodnik / Piesi</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Szuter</span>
            </span>
            <span className="flex items-center gap-1 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Asfalt</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
