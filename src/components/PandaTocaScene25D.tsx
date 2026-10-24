import React from 'react';
import { PandaMascot25D, WardrobeState } from './PandaMascot25D.tsx';

export type TocaActionState =
  | 'idle'
  | 'lifted'
  | 'treadmill'
  | 'bed'
  | 'console'
  | 'mat'
  | 'kitchen'
  | 'icebath'
  | 'shelf';

interface PandaTocaScene25DProps {
  actionState: TocaActionState;
  wardrobe?: WardrobeState;
  onTap?: () => void;
  className?: string;
}

/**
 * 2.5D Interactive Furniture Scene Wrapper
 * Houses the authentic HTML5 Canvas Panda Mascot (PandaMascot25D) with its rich 60 FPS
 * skeletal animations, eye-tracking, spring squash-and-stretch, and equipped wardrobe layers,
 * integrated into 2.5D isometric furniture environments.
 */
export const PandaTocaScene25D: React.FC<PandaTocaScene25DProps> = ({
  actionState,
  wardrobe = {},
  onTap,
  className = '',
}) => {
  // 1. TREADMILL (Bieżnia PRO 2.5D) - Panda running in 60 FPS canvas with pumping shoes & singlet
  if (actionState === 'treadmill') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Treadmill Base Structure */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <linearGradient id="treadBelt" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Floor Contact Shadow */}
            <ellipse cx="80" cy="144" rx="64" ry="14" fill="rgba(0,0,0,0.38)" />

            {/* Motorized Frame */}
            <polygon points="14,130 96,110 146,126 64,146" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
            {/* Running Belt with moving stripes */}
            <polygon points="22,128 94,111 138,124 66,141" fill="url(#treadBelt)" />
            <g className="animate-pulse">
              <line x1="38" y1="134" x2="62" y2="119" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 6" />
              <line x1="68" y1="130" x2="92" y2="115" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 6" />
              <line x1="98" y1="126" x2="122" y2="111" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 6" />
            </g>

            {/* Side Rails */}
            <polygon points="14,130 64,146 64,151 14,135" fill="#0ea5e9" />
            <polygon points="64,146 146,126 146,131 64,151" fill="#0284c7" />

            {/* Console Columns */}
            <path d="M104,112 L112,62 M138,124 L132,72" stroke="#334155" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M84,88 L110,68 M114,98 L132,78" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Running on the Belt */}
          <div className="relative z-10 -mt-6">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="running"
              compact
              className="w-36 h-36 sm:w-40 sm:h-40 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: LED Display & Speedometer */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* LED Console Display */}
            <polygon points="98,60 144,70 138,84 94,74" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
            <text x="119" y="74" fill="#4ade80" fontSize="8" fontWeight="900" textAnchor="middle" className="font-mono">
              15.4 KM/H
            </text>

            {/* Flying Sweat Droplets */}
            <circle cx="44" cy="54" r="2.5" fill="#38bdf8" className="animate-ping" />
            <circle cx="38" cy="66" r="2" fill="#38bdf8" className="animate-ping" />

            {/* Floating Action Badge */}
            <g className="animate-bounce">
              <rect x="36" y="8" width="88" height="18" rx="9" fill="rgba(2,6,23,0.88)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="80" y="20" fill="#38bdf8" fontSize="8" fontWeight="900" textAnchor="middle">
                ⚡ +XP KADENCJA 180!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 2. RECOVERY BED (Łóżko King-Size) - Panda sleeping peacefully tucked in with pillow & blanket
  if (actionState === 'bed') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-44 sm:w-60 sm:h-52 flex items-center justify-center">
          {/* Bed Base SVG */}
          <svg viewBox="0 0 170 150" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Shadow */}
            <ellipse cx="85" cy="132" rx="72" ry="14" fill="rgba(0,0,0,0.36)" />
            {/* Wooden Headboard */}
            <rect x="18" y="44" width="20" height="74" rx="8" fill="#92400e" stroke="#451a03" strokeWidth="2.5" />
            {/* Mattress Foundation */}
            <polygon points="36,78 142,78 154,118 48,118" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            {/* Bed Legs */}
            <rect x="46" y="118" width="10" height="12" rx="2" fill="#78350f" />
            <rect x="142" y="118" width="10" height="12" rx="2" fill="#78350f" />
            {/* Fluffy Pillow */}
            <ellipse cx="58" cy="74" rx="18" ry="12" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Sleeping Peacefully */}
          <div className="relative z-10 -mt-2 -rotate-6">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="sleeping"
              compact
              className="w-32 h-32 sm:w-36 sm:h-36 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Quilted Blanket & Floating Zzz */}
          <svg viewBox="0 0 170 150" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Cozy Emerald Blanket Covering Lower Body */}
            <path
              d="M72,74 L146,74 Q154,74 154,84 L148,118 L76,118 Z"
              fill="#10b981"
              stroke="#047857"
              strokeWidth="2"
            />
            {/* Blanket Quilted Diamond Stitching */}
            <line x1="88" y1="78" x2="136" y2="114" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="120" y1="76" x2="146" y2="98" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="104" y1="76" x2="80" y2="116" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />

            {/* Floating Zzz */}
            <g className="animate-pulse">
              <text x="68" y="44" fill="#a7f3d0" fontSize="11" fontWeight="900">
                z
              </text>
              <text x="78" y="34" fill="#6ee7b7" fontSize="14" fontWeight="900">
                Z
              </text>
              <text x="92" y="24" fill="#34d399" fontSize="18" fontWeight="900">
                Z
              </text>
            </g>

            {/* Floating Action Pill */}
            <g>
              <rect x="22" y="6" width="126" height="18" rx="9" fill="rgba(6,78,59,0.88)" stroke="#34d399" strokeWidth="1.2" />
              <text x="85" y="18" fill="#ecfdf5" fontSize="7.5" fontWeight="900" textAnchor="middle">
                🛌 DRZEMKA: 100% REGENERACJI!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 3. GAMING CONSOLE (Stacja TV & Fotel) - Panda sitting on beanbag with game controller
  if (actionState === 'console') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Background TV & Gaming beanbag */}
          <svg viewBox="0 0 170 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Shadow */}
            <ellipse cx="85" cy="144" rx="70" ry="12" fill="rgba(0,0,0,0.36)" />
            {/* Media Cabinet */}
            <rect x="18" y="72" width="70" height="42" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            {/* Big LED Screen */}
            <rect x="12" y="20" width="82" height="54" rx="6" fill="#020617" stroke="#38bdf8" strokeWidth="2.5" />
            <rect x="16" y="24" width="74" height="46" rx="3" fill="#0f172a" />
            {/* Running Video Game Graphics on TV */}
            <polygon points="26,58 40,42 54,58" fill="#10b981" />
            <polygon points="46,58 60,38 74,58" fill="#059669" />
            <circle cx="72" cy="34" r="5" fill="#facc15" />
            <rect x="20" y="56" width="66" height="10" fill="#22c55e" />
            {/* Glowing Neon Backlight */}
            <circle cx="53" cy="47" r="28" fill="#38bdf8" fillOpacity="0.12" />
            {/* Console Unit & Cable */}
            <rect x="36" y="78" width="34" height="8" rx="2" fill="#020617" stroke="#818cf8" strokeWidth="1" />
            <line x1="53" y1="86" x2="114" y2="108" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Cozy Purple Gaming Beanbag */}
            <ellipse cx="120" cy="116" rx="32" ry="26" fill="#7c3aed" stroke="#6d28d9" strokeWidth="2" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Cheering on Beanbag */}
          <div className="relative z-10 ml-16 mt-4">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="proud"
              compact
              className="w-30 h-30 sm:w-34 sm:h-34 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Gamepad & Action Badge */}
          <svg viewBox="0 0 170 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Held Wireless Gamepad */}
            <rect x="108" y="108" width="22" height="12" rx="4" fill="#090d16" stroke="#c084fc" strokeWidth="1.5" />
            <circle cx="114" cy="114" r="2" fill="#38bdf8" />
            <circle cx="124" cy="112" r="1.5" fill="#ef4444" />
            <circle cx="124" cy="116" r="1.5" fill="#22c55e" />

            {/* Sparkles */}
            <g className="animate-pulse">
              <text x="144" y="80" fontSize="13">
                ⭐
              </text>
              <text x="96" y="74" fontSize="11">
                ⚡
              </text>
            </g>

            {/* Floating Action Pill */}
            <g>
              <rect x="25" y="6" width="120" height="18" rx="9" fill="rgba(88,28,135,0.88)" stroke="#c084fc" strokeWidth="1.2" />
              <text x="85" y="18" fill="#faf5ff" fontSize="7.5" fontWeight="900" textAnchor="middle">
                🎮 ESPORT BIEGOWY: RELAKS PB!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 4. RECOVERY MAT & ROLLER (Mata & Wałek) - Panda on recovery mat doing mobility
  if (actionState === 'mat') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-48 sm:w-56 sm:h-52 flex items-center justify-center">
          {/* Background SVG: Stretching Mat & Props */}
          <svg viewBox="0 0 160 150" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Shadow */}
            <ellipse cx="80" cy="126" rx="64" ry="14" fill="rgba(0,0,0,0.32)" />
            {/* Textured Foam Exercise Mat */}
            <polygon points="14,106 88,86 142,108 68,130" fill="#10b981" stroke="#059669" strokeWidth="2.5" />
            <polygon points="20,105 87,88 135,107 68,126" fill="#34d399" fillOpacity="0.4" />
            {/* Cyan Textured Foam Roller */}
            <g transform="translate(18, 92) rotate(-14)">
              <rect x="0" y="0" width="38" height="14" rx="7" fill="#06b6d4" stroke="#0e7490" strokeWidth="2" />
              <ellipse cx="36" cy="7" rx="3.5" ry="7" fill="#67e8f9" />
              <line x1="8" y1="2" x2="8" y2="12" stroke="#0e7490" strokeWidth="1.2" />
              <line x1="16" y1="2" x2="16" y2="12" stroke="#0e7490" strokeWidth="1.2" />
              <line x1="24" y1="2" x2="24" y2="12" stroke="#0e7490" strokeWidth="1.2" />
            </g>
            {/* 16KG Kettlebell */}
            <path d="M120,86 Q120,74 130,74 Q140,74 140,86" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
            <circle cx="130" cy="98" r="13" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            <text x="130" y="101" fill="#fbbf24" fontSize="7" fontWeight="900" textAnchor="middle">
              16KG
            </text>
          </svg>

          {/* Authentic 2.5D Canvas Panda Relaxing on the Mat */}
          <div className="relative z-10 -mt-2">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="recovery"
              compact
              className="w-34 h-34 sm:w-38 sm:h-38 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Action Badge */}
          <svg viewBox="0 0 160 150" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Floating Sparkles */}
            <g className="animate-pulse">
              <text x="36" y="52" fontSize="12">
                ✨
              </text>
              <text x="126" y="48" fontSize="13">
                🌿
              </text>
            </g>
            {/* Action Pill */}
            <g>
              <rect x="18" y="6" width="124" height="18" rx="9" fill="rgba(6,95,70,0.88)" stroke="#34d399" strokeWidth="1.2" />
              <text x="80" y="18" fill="#ecfdf5" fontSize="7.5" fontWeight="900" textAnchor="middle">
                🧘 ROLOWANIE: +20% TARCZY GCT!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 5. SMOOTHIE BAR & KITCHEN (Bar Smoothie & Blender) - Panda enjoying carbs & fresh treat
  if (actionState === 'kitchen') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Background SVG: Kitchen Bar & Blender */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Shadow */}
            <ellipse cx="80" cy="142" rx="64" ry="12" fill="rgba(0,0,0,0.36)" />
            {/* Wooden Counter */}
            <rect x="16" y="74" width="128" height="54" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
            <line x1="80" y1="78" x2="80" y2="124" stroke="#d97706" strokeWidth="2" />
            <circle cx="72" cy="98" r="3" fill="#b45309" />
            <circle cx="88" cy="98" r="3" fill="#b45309" />
            {/* Marble Top */}
            <polygon points="10,74 150,74 142,62 18,62" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
            {/* High-speed Smoothie Blender */}
            <rect x="26" y="52" width="22" height="14" rx="3" fill="#334155" />
            <polygon points="24,28 50,28 46,52 28,52" fill="rgba(244,63,94,0.88)" stroke="#ffffff" strokeWidth="1.8" />
            <rect x="23" y="24" width="28" height="6" rx="2" fill="#0f172a" />
            <circle cx="37" cy="40" r="4" fill="#fde047" className="animate-spin" />
            {/* Fresh Fruit Bowl */}
            <ellipse cx="126" cy="62" rx="14" ry="6" fill="#0284c7" />
            <circle cx="122" cy="58" r="4" fill="#ef4444" />
            <circle cx="130" cy="58" r="4" fill="#fbbf24" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Enjoying Treat / Shake */}
          <div className="relative z-10 -mt-2">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="eating"
              compact
              className="w-34 h-34 sm:w-38 sm:h-38 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Shaker Bottle & Floating Hearts */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Sports Bidon / Shaker on counter */}
            <rect x="94" y="64" width="14" height="24" rx="3" fill="#06b6d4" stroke="#0e7490" strokeWidth="1.5" />
            <rect x="98" y="60" width="6" height="5" fill="#fde047" />
            <line x1="101" y1="60" x2="108" y2="68" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
            {/* Floating Hearts */}
            <g className="animate-bounce">
              <text x="124" y="44" fontSize="13">
                ❤️
              </text>
              <text x="136" y="32" fontSize="10">
                ❤️
              </text>
            </g>
            {/* Action Pill */}
            <g>
              <rect x="18" y="6" width="124" height="18" rx="9" fill="rgba(180,83,9,0.9)" stroke="#fbbf24" strokeWidth="1.2" />
              <text x="80" y="18" fill="#fef3c7" fontSize="7" fontWeight="900" textAnchor="middle">
                🥤 CARB-LOADING: GLIKOGEN 100%!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 6. ICE BATH (Lodowa Balia Krioterapii) - Panda shivering in cold plunge tub
  if (actionState === 'icebath') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Background SVG: Tub Back Wall & Cold Water */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Floor Shadow */}
            <ellipse cx="80" cy="144" rx="62" ry="12" fill="rgba(0,0,0,0.36)" />
            {/* Tub Base Structure */}
            <polygon points="24,84 136,84 126,138 34,138" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
            {/* Cold Water Body */}
            <ellipse cx="80" cy="84" rx="54" ry="12" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <ellipse cx="80" cy="84" rx="46" ry="8" fill="#38bdf8" fillOpacity="0.75" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Submerged & Shivering */}
          <div className="relative z-10 -mt-2 animate-[pulse_0.4s_infinite]">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="worried"
              compact
              className="w-30 h-30 sm:w-34 sm:h-34 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Front of Tub, Floating Ice Cubes & Snowflakes */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Front Cedar Wood Planks */}
            <polygon points="24,96 136,96 126,138 34,138" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
            {[46, 66, 86, 106].map((px) => (
              <line key={px} x1={px} y1="96" x2={(px - 80) * 0.88 + 80} y2="138" stroke="#451a03" strokeWidth="1.5" />
            ))}
            {/* Steel Reinforcement Bands */}
            <line x1="30" y1="104" x2="130" y2="104" stroke="#94a3b8" strokeWidth="3" />
            <line x1="34" y1="126" x2="126" y2="126" stroke="#94a3b8" strokeWidth="3" />

            {/* Floating Ice Cubes resting at water line */}
            <polygon points="40,92 48,88 54,92 46,96" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
            <polygon points="106,92 114,88 120,92 112,96" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
            <polygon points="74,94 82,90 86,94 78,97" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />

            {/* Frost Sparkles */}
            <text x="32" y="58" fill="#bae6fd" fontSize="13" className="animate-spin">
              ❄️
            </text>
            <text x="118" y="52" fill="#bae6fd" fontSize="13" className="animate-bounce">
              ❄️
            </text>

            {/* Action Pill */}
            <g>
              <rect x="18" y="6" width="124" height="18" rx="9" fill="rgba(2,132,199,0.9)" stroke="#7dd3fc" strokeWidth="1.2" />
              <text x="80" y="18" fill="#f0f9ff" fontSize="7" fontWeight="900" textAnchor="middle">
                🧊 ICE BATH: ODNOWA MIKROURAZÓW ❄️
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 7. TROPHY SHELF (Gablota Trofeów) - Panda celebrating PB record under medals and golden cup
  if (actionState === 'shelf') {
    return (
      <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Background SVG: Shelf Unit, PB Certificate & Medals */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Shadow */}
            <ellipse cx="80" cy="144" rx="60" ry="12" fill="rgba(0,0,0,0.36)" />
            {/* Wall Shelf Unit */}
            <polygon points="16,68 114,68 120,78 22,78" fill="#d97706" stroke="#92400e" strokeWidth="2" />
            <rect x="22" y="78" width="98" height="6" rx="2" fill="#78350f" />
            {/* Framed Sub-25 Certificate */}
            <rect x="28" y="32" width="28" height="34" rx="3" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
            <text x="42" y="52" fill="#78350f" fontSize="6.5" fontWeight="900" textAnchor="middle">
              PB 2027
            </text>
            {/* Hanging Medals */}
            <circle cx="44" cy="94" r="6" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
            <circle cx="68" cy="92" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          </svg>

          {/* Authentic 2.5D Canvas Panda Proudly Cheering */}
          <div className="relative z-10 ml-12 mt-2">
            <PandaMascot25D
              wardrobe={wardrobe}
              stateMode="proud"
              compact
              className="w-34 h-34 sm:w-38 sm:h-38 pointer-events-none"
            />
          </div>

          {/* Foreground Overlay: Golden Trophy Cup & Confetti */}
          <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
            {/* Gleaming Golden Trophy Cup */}
            <g transform="translate(6, 0)">
              <path d="M84,32 L112,32 L108,50 Q98,58 88,50 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
              <path d="M84,36 Q76,36 80,44 Q84,48 87,46" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
              <path d="M112,36 Q120,36 116,44 Q112,48 109,46" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
              <rect x="95" y="52" width="6" height="6" fill="#d97706" />
              <rect x="90" y="58" width="16" height="4" rx="1" fill="#78350f" />
            </g>

            {/* Falling Golden Confetti & Stars */}
            <g className="animate-pulse">
              <text x="68" y="24" fontSize="11">
                ✨
              </text>
              <text x="122" y="28" fontSize="13">
                ⭐
              </text>
              <text x="82" y="16" fontSize="10">
                🎉
              </text>
            </g>

            {/* Action Pill */}
            <g>
              <rect x="22" y="6" width="116" height="18" rx="9" fill="rgba(180,83,9,0.9)" stroke="#fde047" strokeWidth="1.2" />
              <text x="80" y="18" fill="#fef08a" fontSize="7.5" fontWeight="900" textAnchor="middle">
                🏆 NOWY REKORD ŻYCIOWY!
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // 8. LIFTED (Panda podniesiona palcem / kursorem w powietrzu)
  if (actionState === 'lifted') {
    return (
      <div className={`relative pointer-events-none select-none scale-110 drop-shadow-2xl ${className}`}>
        <div className="relative w-36 h-40 sm:w-44 sm:h-48 flex flex-col items-center justify-center">
          {/* Floating Drop Indicator */}
          <div className="mb-2 px-3 py-1 rounded-full bg-slate-900/90 border border-sky-400 text-sky-300 text-[10px] font-black tracking-wide shadow-lg animate-bounce">
            🐾 UPUŚĆ NA MEBEL!
          </div>
          {/* Authentic 2.5D Canvas Panda dangling/jumping in air */}
          <PandaMascot25D
            wardrobe={wardrobe}
            stateMode="proud"
            compact
            className="w-32 h-32 sm:w-36 sm:h-36 pointer-events-none"
          />
        </div>
      </div>
    );
  }

  // 9. IDLE STANDING ON FLOOR (Domyślny stan Pandy na podłodze)
  return (
    <div onClick={onTap} className={`relative cursor-pointer select-none ${className}`}>
      <div className="relative w-36 h-40 sm:w-44 sm:h-48 flex items-center justify-center drop-shadow-xl">
        <PandaMascot25D
          wardrobe={wardrobe}
          stateMode="idle"
          compact
          className="w-36 h-36 sm:w-40 sm:h-40 pointer-events-none"
        />
      </div>
    </div>
  );
};
