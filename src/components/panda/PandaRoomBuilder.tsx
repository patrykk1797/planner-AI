import React, { useState, useRef } from 'react';
import { soundEngine } from '../../utils/defaults.ts';
import { PandaTocaScene25D, TocaActionState } from './PandaTocaScene25D.tsx';
import { WardrobeState } from './PandaMascot25D.tsx';

export type RoomSceneId = 'park_miejski' | 'las_bambusowy' | 'nocny_wroclaw' | 'stadion_pro' | 'gorski_szlak';

export interface PlacedRoomItem {
  id: string;
  x: number; // percentage 12..88
  y: number; // percentage 18..84
}

interface PandaRoomBuilderProps {
  sceneId?: string;
  userCity?: string;
  placedFurniture?: string[];
  furniturePositions?: Record<string, { x: number; y: number }>;
  onUpdateFurniturePosition?: (furnId: string, x: number, y: number) => void;
  onInteractFurniture?: (furnId: string) => void;
  pandaPosition?: { x: number; y: number };
  onUpdatePandaPosition?: (x: number, y: number, snappedFurnId?: string | null) => void;
  actionState?: TocaActionState;
  onActionStateChange?: (state: TocaActionState) => void;
  wardrobe?: WardrobeState;
}

export const DEFAULT_FURNITURE_POSITIONS: Record<string, { x: number; y: number }> = {
  'furn-1': { x: 22, y: 74 }, // Bieżnia Elektryczna PRO
  'furn-2': { x: 20, y: 28 }, // Gablota z Trofeami
  'furn-3': { x: 78, y: 78 }, // Mata & Foam Roller
  'furn-4': { x: 84, y: 56 }, // Donica Bambusowa
  'furn-5': { x: 22, y: 52 }, // Bar Izotoniczny & Blender
  'furn-6': { x: 76, y: 64 }, // Łóżko Regeneracyjne King-Size
  'furn-console': { x: 50, y: 50 }, // Konsola do Gier + TV
  'furn-icebath': { x: 48, y: 80 }, // Lodowa Balia
  'furn-7': { x: 36, y: 50 }, // Głośnik 180 SPM
  'furn-8': { x: 80, y: 24 }, // Neon Ścienny RUN 2027
};

/**
 * Maps furniture ID to its corresponding Toca Boca animation action state
 */
export function getFurnitureActionState(furnId: string): TocaActionState | null {
  if (furnId === 'furn-1' || furnId === 'treadmill') return 'treadmill';
  if (furnId === 'furn-6' || furnId === 'bed') return 'bed';
  if (furnId === 'furn-console' || furnId === 'console') return 'console';
  if (furnId === 'furn-3' || furnId === 'mat') return 'mat';
  if (furnId === 'furn-5' || furnId === 'kitchen') return 'kitchen';
  if (furnId === 'furn-icebath' || furnId === 'icebath') return 'icebath';
  if (furnId === 'furn-2' || furnId === 'shelf') return 'shelf';
  return null;
}

/**
 * 2.5D Isometric Vector Object for standalone furniture (when Panda is NOT occupying it)
 */
export const FurnitureObject25D: React.FC<{
  furnId: string;
  isActive?: boolean;
  size?: 'sm' | 'md';
}> = ({ furnId, isActive = false, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-14 h-14' : 'w-24 h-24 sm:w-28 sm:h-28';

  switch (furnId) {
    case 'furn-1':
    case 'treadmill':
      // Bieżnia PRO 2.5D
      return (
        <svg viewBox="0 0 120 120" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="60" cy="104" rx="48" ry="12" fill="rgba(0,0,0,0.4)" />
          <polygon points="16,92 78,74 108,88 46,106" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
          <polygon points="22,90 76,75 100,86 46,101" fill="#0f172a" />
          <line x1="36" y1="94" x2="54" y2="82" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="56" y1="89" x2="74" y2="77" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
          <polygon points="16,92 46,106 46,111 16,97" fill="#334155" />
          <polygon points="46,106 108,88 108,93 46,111" fill="#0ea5e9" />
          <path d="M76,75 L82,28 M102,87 L98,36" stroke="#334155" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M58,52 L80,34 M82,62 L98,42" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />
          <polygon points="70,28 106,36 100,50 66,42" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
          <text x="85" y="41" fill="#4ade80" fontSize="7.5" fontWeight="900" textAnchor="middle">
            {isActive ? '15.4 KM/H' : '14.2 KM/H'}
          </text>
        </svg>
      );

    case 'furn-6':
    case 'bed':
      // Łóżko King-Size
      return (
        <svg viewBox="0 0 130 110" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="65" cy="96" rx="54" ry="12" fill="rgba(0,0,0,0.38)" />
          <rect x="14" y="34" width="16" height="56" rx="6" fill="#92400e" stroke="#451a03" strokeWidth="2" />
          <rect x="22" y="58" width="94" height="32" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="40" cy="54" rx="15" ry="9" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M52,52 L110,52 Q118,52 118,62 L118,86 L52,86 Z" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <rect x="20" y="88" width="8" height="10" rx="2" fill="#78350f" />
          <rect x="104" y="88" width="8" height="10" rx="2" fill="#78350f" />
        </svg>
      );

    case 'furn-console':
    case 'console':
      // Konsola do gier + TV
      return (
        <svg viewBox="0 0 120 110" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="60" cy="98" rx="44" ry="10" fill="rgba(0,0,0,0.36)" />
          <rect x="20" y="66" width="48" height="28" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="14" y="24" width="60" height="42" rx="5" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
          <rect x="18" y="28" width="52" height="34" rx="2" fill="#0f172a" />
          <polygon points="26,52 38,40 50,52" fill="#10b981" />
          <circle cx="58" cy="38" r="4" fill="#facc15" />
          {/* Gaming beanbag */}
          <ellipse cx="88" cy="84" rx="20" ry="16" fill="#7c3aed" stroke="#6d28d9" strokeWidth="2" />
          <rect x="78" y="70" width="16" height="8" rx="3" fill="#0f172a" stroke="#a78bfa" strokeWidth="1" />
        </svg>
      );

    case 'furn-3':
    case 'mat':
      // Mata & Wałek
      return (
        <svg viewBox="0 0 120 110" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="60" cy="88" rx="50" ry="14" fill="rgba(0,0,0,0.32)" />
          <polygon points="12,82 74,64 110,82 48,100" fill="#10b981" stroke="#059669" strokeWidth="2.5" />
          <polygon points="18,81 73,66 103,81 48,96" fill="#34d399" fillOpacity="0.4" />
          <g transform="translate(42, 66) rotate(-14)">
            <rect x="0" y="0" width="42" height="15" rx="7" fill="#06b6d4" stroke="#0e7490" strokeWidth="2" />
            <ellipse cx="40" cy="7.5" rx="4" ry="7.5" fill="#67e8f9" />
          </g>
          <path d="M80,58 Q80,46 90,46 Q100,46 100,58" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <circle cx="90" cy="67" r="12" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          <text x="90" y="70" fill="#fbbf24" fontSize="6.5" fontWeight="900" textAnchor="middle">
            16KG
          </text>
        </svg>
      );

    case 'furn-5':
    case 'kitchen':
      // Lodówka & Blender Smoothie
      return (
        <svg viewBox="0 0 120 115" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="60" cy="104" rx="46" ry="10" fill="rgba(0,0,0,0.38)" />
          <rect x="20" y="56" width="80" height="46" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
          <line x1="60" y1="60" x2="60" y2="100" stroke="#d97706" strokeWidth="2" />
          <circle cx="53" cy="78" r="2.5" fill="#b45309" />
          <circle cx="67" cy="78" r="2.5" fill="#b45309" />
          <polygon points="14,56 106,56 100,46 20,46" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
          <rect x="30" y="38" width="18" height="14" rx="3" fill="#334155" />
          <polygon points="28,18 50,18 46,38 32,38" fill="rgba(244,63,94,0.85)" stroke="#ffffff" strokeWidth="2" />
          <rect x="27" y="14" width="24" height="5" rx="2" fill="#0f172a" />
          <rect x="64" y="26" width="13" height="24" rx="4" fill="#06b6d4" stroke="#0e7490" strokeWidth="1.5" />
        </svg>
      );

    case 'furn-icebath':
    case 'icebath':
      // Lodowa Balia
      return (
        <svg viewBox="0 0 120 110" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="60" cy="98" rx="46" ry="10" fill="rgba(0,0,0,0.36)" />
          <polygon points="18,52 102,52 94,94 26,94" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          <line x1="22" y1="62" x2="98" y2="62" stroke="#94a3b8" strokeWidth="2.5" />
          <line x1="24" y1="84" x2="96" y2="84" stroke="#94a3b8" strokeWidth="2.5" />
          <ellipse cx="60" cy="52" rx="42" ry="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Floating Ice */}
          <polygon points="36,50 42,47 46,50 40,53" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="76,50 82,47 86,50 80,53" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8" />
        </svg>
      );

    case 'furn-2':
    case 'shelf':
      // Półka z Pucharami
      return (
        <svg viewBox="0 0 120 110" className={`${dim} drop-shadow-xl overflow-visible`}>
          <rect x="16" y="62" width="88" height="14" rx="5" fill="rgba(0,0,0,0.35)" />
          <polygon points="12,56 108,56 114,66 18,66" fill="#d97706" stroke="#92400e" strokeWidth="2" />
          <rect x="18" y="66" width="96" height="7" rx="2" fill="#78350f" />
          <rect x="24" y="20" width="32" height="36" rx="3" fill="#fef3c7" stroke="#b45309" strokeWidth="3" />
          <text x="40" y="42" fill="#78350f" fontSize="7" fontWeight="900" textAnchor="middle">
            PB 2027
          </text>
          <path d="M68,24 L94,24 L90,44 Q81,52 72,44 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
          <circle cx="38" cy="91" r="7" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="62" cy="89" r="7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        </svg>
      );

    case 'furn-4':
    case 'bamboo':
      // Donica z Bambusem
      return (
        <svg viewBox="0 0 110 120" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="55" cy="108" rx="34" ry="9" fill="rgba(0,0,0,0.38)" />
          <rect x="38" y="20" width="8" height="62" rx="3" fill="#65a30d" stroke="#365314" strokeWidth="1.5" />
          <rect x="52" y="12" width="9" height="70" rx="3.5" fill="#84cc16" stroke="#3f6212" strokeWidth="1.5" />
          <ellipse cx="28" cy="28" rx="13" ry="5" transform="rotate(-25 28 28)" fill="#4ade80" />
          <ellipse cx="72" cy="18" rx="14" ry="5" transform="rotate(20 72 18)" fill="#4ade80" />
          <polygon points="28,76 82,76 74,108 36,108" fill="#ea580c" stroke="#9a3412" strokeWidth="2" />
          <ellipse cx="55" cy="76" rx="28" ry="7" fill="#451a03" stroke="#c2410c" strokeWidth="3" />
        </svg>
      );

    case 'furn-7':
      // Głośnik 180 SPM
      return (
        <svg viewBox="0 0 110 100" className={`${dim} drop-shadow-xl overflow-visible`}>
          <ellipse cx="55" cy="88" rx="42" ry="9" fill="rgba(0,0,0,0.38)" />
          <rect x="16" y="34" width="78" height="50" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="34" cy="60" r="14" fill="#090d16" stroke="#06b6d4" strokeWidth="2.5" />
          <circle cx="76" cy="60" r="14" fill="#090d16" stroke="#06b6d4" strokeWidth="2.5" />
          <rect x="48" y="42" width="14" height="12" rx="2" fill="#090d16" />
        </svg>
      );

    case 'furn-8':
    default:
      // Neon RUN 2027
      return (
        <svg viewBox="0 0 120 90" className={`${dim} drop-shadow-xl overflow-visible`}>
          <rect x="10" y="18" width="100" height="52" rx="14" fill="rgba(15,23,42,0.85)" stroke="#f43f5e" strokeWidth="3" />
          <text x="60" y="44" fill="#fb7185" fontSize="13" fontWeight="900" textAnchor="middle">
            RUN 2027
          </text>
          <text x="60" y="58" fill="#38bdf8" fontSize="9" fontWeight="900" textAnchor="middle">
            ⚡ 180 SPM ⚡
          </text>
        </svg>
      );
  }
};

export const PandaRoomBuilder: React.FC<PandaRoomBuilderProps> = ({
  sceneId = 'park_miejski',
  userCity,
  placedFurniture = ['furn-1', 'furn-6', 'furn-console', 'furn-4'],
  furniturePositions = DEFAULT_FURNITURE_POSITIONS,
  onUpdateFurniturePosition,
  onInteractFurniture,
  pandaPosition = { x: 50, y: 70 },
  onUpdatePandaPosition,
  actionState = 'idle',
  onActionStateChange,
  wardrobe = {},
}) => {
  const roomRef = useRef<HTMLDivElement>(null);
  const [draggingTarget, setDraggingTarget] = useState<'panda' | string | null>(null);
  const [hoveredSnapFurnId, setHoveredSnapFurnId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });

  // Universal architectural room styles (no rigid local names!)
  const roomTheme = {
    park_miejski: {
      wallTop: '#fef3c7',
      wallBottom: '#fde68a',
      wainscot: '#f59e0b',
      floorTop: '#d97706',
      floorBottom: '#92400e',
      rugColor: '#0284c7',
      rugBorder: '#38bdf8',
      windowSky: 'from-sky-400 via-sky-200 to-lime-300',
      label: userCity ? `Dom Pandy • ${userCity}` : 'Dom Pandy • Park Miejski',
    },
    las_bambusowy: {
      wallTop: '#d1fae5',
      wallBottom: '#a7f3d0',
      wainscot: '#059669',
      floorTop: '#65a30d',
      floorBottom: '#3f6212',
      rugColor: '#fef3c7',
      rugBorder: '#f59e0b',
      windowSky: 'from-emerald-700 via-teal-500 to-emerald-300',
      label: 'Dojo Zen • Las Bambusowy',
    },
    nocny_wroclaw: {
      wallTop: '#1e1b4b',
      wallBottom: '#312e81',
      wainscot: '#4338ca',
      floorTop: '#334155',
      floorBottom: '#0f172a',
      rugColor: '#be185d',
      rugBorder: '#f472b6',
      windowSky: 'from-slate-950 via-indigo-950 to-pink-900',
      label: 'Loft Nocny • Panorama Miasta',
    },
    stadion_pro: {
      wallTop: '#1e293b',
      wallBottom: '#334155',
      wainscot: '#dc2626',
      floorTop: '#b91c1c',
      floorBottom: '#7f1d1d',
      rugColor: '#0f172a',
      rugBorder: '#fbbf24',
      windowSky: 'from-slate-900 via-sky-900 to-red-800',
      label: 'Loża Stadionowa PRO',
    },
    gorski_szlak: {
      wallTop: '#e0f2fe',
      wallBottom: '#bae6fd',
      wainscot: '#0284c7',
      floorTop: '#78350f',
      floorBottom: '#451a03',
      rugColor: '#10b981',
      rugBorder: '#34d399',
      windowSky: 'from-sky-600 via-sky-300 to-amber-200',
      label: 'Górski Szlak • Panorama Szczytów',
    },
  }[sceneId] || {
    wallTop: '#fef3c7',
    wallBottom: '#fde68a',
    wainscot: '#f59e0b',
    floorTop: '#d97706',
    floorBottom: '#92400e',
    rugColor: '#0284c7',
    rugBorder: '#38bdf8',
    windowSky: 'from-sky-400 via-sky-200 to-lime-300',
    label: userCity ? `Dom Pandy • ${userCity}` : 'Dom Pandy • Park Miejski',
  };

  const getRelativePercent = (clientX: number, clientY: number) => {
    const el = roomRef.current;
    if (!el) return { x: 50, y: 70 };
    const rect = el.getBoundingClientRect();
    const x = Math.max(12, Math.min(88, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(22, Math.min(86, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  // 1. POINTER DOWN (Panda or Furniture)
  const handlePointerDown = (targetId: 'panda' | string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingTarget(targetId);
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };

    if (targetId === 'panda') {
      soundEngine.playPandaSound('jump');
      if (onActionStateChange) onActionStateChange('lifted');
    } else {
      soundEngine.playClick(true);
    }
  };

  // 2. POINTER MOVE (Hitbox Snapping Detection like Toca Boca)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTarget) return;
    const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (dist > 5) {
      dragStartRef.current.moved = true;
    }

    const pos = getRelativePercent(e.clientX, e.clientY);

    if (draggingTarget === 'panda') {
      // Check collision/distance to all placed furniture hitboxes
      let closestFurn: string | null = null;
      let minDistance = 16; // Hitbox radius %

      placedFurniture.forEach((fid) => {
        const fpos = furniturePositions[fid] || DEFAULT_FURNITURE_POSITIONS[fid];
        if (!fpos) return;
        const d = Math.hypot(fpos.x - pos.x, fpos.y - pos.y);
        if (d < minDistance) {
          minDistance = d;
          closestFurn = fid;
        }
      });

      setHoveredSnapFurnId(closestFurn);
      if (onUpdatePandaPosition) {
        onUpdatePandaPosition(pos.x, pos.y, closestFurn);
      }
    } else if (onUpdateFurniturePosition) {
      onUpdateFurniturePosition(draggingTarget, pos.x, pos.y);
    }
  };

  // 3. POINTER UP (Snap to Object or drop on floor)
  const handlePointerUp = () => {
    if (!draggingTarget) return;
    const currentTarget = draggingTarget;
    const wasMoved = dragStartRef.current.moved;
    setDraggingTarget(null);
    const snapId = hoveredSnapFurnId;
    setHoveredSnapFurnId(null);

    if (currentTarget === 'panda') {
      if (snapId) {
        // SNAP PANDA TO OBJECT!
        const targetPos = furniturePositions[snapId] || DEFAULT_FURNITURE_POSITIONS[snapId];
        if (targetPos && onUpdatePandaPosition) {
          onUpdatePandaPosition(targetPos.x, targetPos.y, snapId);
        }
        const nextState = getFurnitureActionState(snapId) || 'idle';
        if (onActionStateChange) onActionStateChange(nextState);
        if (onInteractFurniture) onInteractFurniture(snapId);
      } else {
        // Dropped on empty floor/rug -> return to IDLE!
        if (onActionStateChange) onActionStateChange('idle');
        soundEngine.playClick(false);
      }
    } else if (!wasMoved && onInteractFurniture) {
      // Tapped furniture directly
      onInteractFurniture(currentTarget);
    }
  };

  const isOccupiedByPanda = (furnId: string): boolean => {
    const act = getFurnitureActionState(furnId);
    return act !== null && act === actionState;
  };

  return (
    <div
      ref={roomRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full h-full min-h-[410px] sm:min-h-[440px] rounded-3xl overflow-hidden select-none touch-none border-2 border-white/20 shadow-2xl"
    >
      {/* ================================================================= */}
      {/* 1. ARCHITECTURAL ROOM INTERIOR (Toca Boca 2.5D Cutaway Style)     */}
      {/* ================================================================= */}
      <svg
        viewBox="0 0 400 420"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={roomTheme.wallTop} />
            <stop offset="100%" stopColor={roomTheme.wallBottom} />
          </linearGradient>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={roomTheme.floorTop} />
            <stop offset="100%" stopColor={roomTheme.floorBottom} />
          </linearGradient>
        </defs>

        {/* Back Wall */}
        <rect x="0" y="0" width="400" height="235" fill="url(#wallGrad)" />

        {/* Vertical Wallpaper Stripes */}
        {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((wx) => (
          <line key={wx} x1={wx} y1="0" x2={wx} y2="235" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
        ))}

        {/* 2.5D Corner Depth */}
        <polygon points="0,0 28,25 28,235 0,265" fill="rgba(0,0,0,0.1)" />
        <polygon points="400,0 372,25 372,235 400,265" fill="rgba(0,0,0,0.14)" />

        {/* Wainscoting Baseboard */}
        <rect x="28" y="223" width="344" height="12" fill={roomTheme.wainscot} />
        <line x1="28" y1="223" x2="372" y2="223" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

        {/* 2.5D Floor Planks */}
        <polygon points="0,265 28,235 372,235 400,265 400,420 0,420" fill="url(#floorGrad)" />
        {[60, 115, 170, 230, 285, 340].map((fx, idx) => (
          <line
            key={idx}
            x1={fx}
            y1="235"
            x2={(fx - 200) * 1.45 + 200}
            y2="420"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="2"
          />
        ))}

        {/* Cozy Center Rug */}
        <ellipse cx="200" cy="336" rx="122" ry="46" fill={roomTheme.rugColor} stroke={roomTheme.rugBorder} strokeWidth="5" />
        <ellipse cx="200" cy="336" rx="100" ry="35" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeDasharray="6 4" />
      </svg>

      {/* ================================================================= */}
      {/* 2. CLEAN UNOBSTRUCTED PANORAMIC WINDOW (NO BLACK BARS ON TOP!)    */}
      {/* ================================================================= */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-30 rounded-2xl border-4 border-amber-900/90 shadow-2xl overflow-hidden pointer-events-none z-10">
        <div className={`w-full h-full bg-gradient-to-b ${roomTheme.windowSky} relative`}>
          {/* Sun / Moon with soft atmospheric glow */}
          <div
            className={`w-9 h-9 rounded-full absolute top-3 right-6 ${
              sceneId === 'nocny_wroclaw' || sceneId === 'stadion_pro'
                ? 'bg-amber-100 shadow-[0_0_20px_#fef08a]'
                : 'bg-yellow-300 shadow-[0_0_20px_#fde047]'
            }`}
          />
          {/* Mountain / Park Silhouette */}
          <div className="absolute bottom-0 inset-x-0 h-9 bg-emerald-700/85 rounded-t-3xl" />
          {/* Subtle Window Crossbars */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-amber-900/75" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-amber-900/75" />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. PLACED FURNITURE WITH ACTIVE HITBOX SNAPPING                   */}
      {/* ================================================================= */}
      {placedFurniture.map((furnId) => {
        const pos = furniturePositions[furnId] || DEFAULT_FURNITURE_POSITIONS[furnId] || { x: 50, y: 65 };
        const isHoveredSnap = hoveredSnapFurnId === furnId;
        const isOccupied = isOccupiedByPanda(furnId);
        const isDraggingThisFurn = draggingTarget === furnId;
        const zIndex = Math.round(pos.y) + (isDraggingThisFurn ? 90 : 10);

        // If Panda is currently snapped onto this object, render the full integrated animation scene!
        if (isOccupied && actionState !== 'lifted') {
          return (
            <div
              key={furnId}
              onPointerDown={(e) => handlePointerDown('panda', e)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                zIndex: zIndex + 20,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
              title="Chwyć Pandę, aby zdjąć ją z mebla na podłogę!"
            >
              <PandaTocaScene25D actionState={actionState} wardrobe={wardrobe} />
            </div>
          );
        }

        return (
          <div
            key={furnId}
            onPointerDown={(e) => handlePointerDown(furnId, e)}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              zIndex,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-all ${
              isHoveredSnap
                ? 'scale-120 drop-shadow-[0_0_18px_rgba(251,191,36,0.9)] ring-4 ring-amber-400 ring-offset-2 rounded-2xl animate-pulse'
                : isDraggingThisFurn
                ? 'scale-115 drop-shadow-[0_16px_22px_rgba(0,0,0,0.65)]'
                : 'hover:scale-105'
            }`}
            title="Przeciągaj mebel lub upuść na niego Pandę!"
          >
            <FurnitureObject25D furnId={furnId} isActive={isHoveredSnap} />
          </div>
        );
      })}

      {/* ================================================================= */}
      {/* 4. PANDA CHARACTER ON EMPTY FLOOR OR LIFTED IN THE AIR             */}
      {/* ================================================================= */}
      {(!Object.keys(DEFAULT_FURNITURE_POSITIONS).some((fid) => isOccupiedByPanda(fid)) || actionState === 'lifted') && (
        <div
          onPointerDown={(e) => handlePointerDown('panda', e)}
          style={{
            left: `${pandaPosition.x}%`,
            top: `${pandaPosition.y}%`,
            zIndex: Math.round(pandaPosition.y) + (actionState === 'lifted' ? 120 : 25),
          }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-transform ${
            actionState === 'lifted' ? 'scale-115' : 'hover:scale-105'
          }`}
          title="Chwyć Pandę palcem i przeciągnij na dowolny mebel!"
        >
          <PandaTocaScene25D
            actionState={actionState === 'lifted' ? 'lifted' : 'idle'}
            wardrobe={wardrobe}
          />
        </div>
      )}
    </div>
  );
};
