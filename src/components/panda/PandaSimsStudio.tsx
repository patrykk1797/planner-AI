import React, { useState, useEffect, useRef } from 'react';
import { RunnerProfile, Shoe } from '../../types.ts';
import { WardrobeState } from './PandaMascot25D.tsx';
import { drawPandaOnCanvas } from '../../utils/pandaRenderer.ts';
import { soundEngine } from '../../utils/defaults.ts';

interface PandaSimsStudioProps {
  onClose: () => void;
  wardrobe: WardrobeState;
  onUpdateWardrobe: (newWardrobe: WardrobeState) => void;
  profile: RunnerProfile;
  shoes?: Shoe[];
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  showToast: (msg: string) => void;
}

type CategoryType = 'head' | 'eyes' | 'body' | 'legs' | 'shoes' | 'accessory' | 'skin';

interface CategoryTab {
  id: CategoryType;
  label: string;
  icon: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'head', label: 'Głowa', icon: '🧢' },
  { id: 'eyes', label: 'Oczy', icon: '🕶️' },
  { id: 'body', label: 'Tułów', icon: '👕' },
  { id: 'legs', label: 'Nogi', icon: '🩳' },
  { id: 'shoes', label: 'Stopy', icon: '👟' },
  { id: 'accessory', label: 'Dodatki', icon: '⌚' },
  { id: 'skin', label: 'Futerko', icon: '🎨' },
];

const COLOR_SWATCHES = [
  { label: 'Czerwień Racing', hex: '#ef4444' },
  { label: 'Neon Pomarańcz', hex: '#f97316' },
  { label: 'Złoto Mistrzowskie', hex: '#eab308' },
  { label: 'Zieleń Świeża', hex: '#10b981' },
  { label: 'Błękit Aero', hex: '#0ea5e9' },
  { label: 'Indygo Royal', hex: '#6366f1' },
  { label: 'Fuksja Energetyczna', hex: '#ec4899' },
  { label: 'Grafit Carbon', hex: '#0f172a' },
  { label: 'Czysta Biel', hex: '#ffffff' },
];

const DEFAULT_PRESETS: Array<{ name: string; icon: string; wardrobe: WardrobeState }> = [
  {
    name: 'Zestaw Startowy',
    icon: '⚡',
    wardrobe: {
      head: 'opaska',
      eyes: 'oakley',
      body: 'koszulka_2027',
      legs: 'spodenki_split',
      shoes: 'carbon_orange',
      accessory: 'zegarek_gps',
      skin: 'classic',
    },
  },
  {
    name: 'Zestaw Zimowy',
    icon: '❄️',
    wardrobe: {
      head: 'czapka_zimowa',
      eyes: 'trail_goggles',
      body: 'wiatrowka',
      legs: 'legginsy',
      shoes: 'kayano_green',
      accessory: 'kamizelka',
      skin: 'classic',
    },
  },
  {
    name: 'Zestaw Regeneracyjny',
    icon: '🧘‍♂️',
    wardrobe: {
      head: 'sluchawki',
      eyes: 'none',
      body: 'bluza_aero',
      legs: 'dresy',
      shoes: 'none',
      accessory: 'pas_biodrowy',
      skin: 'red_panda',
    },
  },
];

export const PandaSimsStudio: React.FC<PandaSimsStudioProps> = ({
  onClose,
  wardrobe,
  onUpdateWardrobe,
  profile,
  shoes = [],
  onUpdateProfile,
  showToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('body');
  const [poseMode, setPoseMode] = useState<'idle' | 'running' | 'proud'>('idle');
  const [podiumAngle, setPodiumAngle] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Read selected shoe from user shoes array
  const currentSelectedShoe: Shoe | undefined =
    shoes.find((s) => s.id === profile.selectedShoeId) || shoes[0];

  // Presets from profile or default
  const [presets, setPresets] = useState<Array<{ name: string; icon: string; wardrobe: WardrobeState }>>(() => {
    if (profile.pandaState?.outfitPresets && profile.pandaState.outfitPresets.length === 3) {
      return profile.pandaState.outfitPresets.map((p, idx) => ({
        name: p.name || DEFAULT_PRESETS[idx].name,
        icon: p.icon || DEFAULT_PRESETS[idx].icon,
        wardrobe: (p.wardrobe as WardrobeState) || DEFAULT_PRESETS[idx].wardrobe,
      }));
    }
    return DEFAULT_PRESETS;
  });

  // Podium Animation Loop
  useEffect(() => {
    let animId: number;
    let frame = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw illuminated 2.5D presentation circular podium
      const centerX = rect.width / 2;
      const centerY = rect.height * 0.76;
      const podiumW = Math.min(130, rect.width * 0.42);
      const podiumH = 32;

      // Glow floor ring
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, podiumW + 20);
      glowGrad.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
      glowGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.15)');
      glowGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, podiumW + 20, podiumH + 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Podium Base Cylinder
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, podiumW, podiumH * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Upper Lit Stage
      const stageGrad = ctx.createRadialGradient(centerX, centerY - 4, 8, centerX, centerY, podiumW);
      stageGrad.addColorStop(0, '#1e293b');
      stageGrad.addColorStop(0.7, '#0f172a');
      stageGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = stageGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, podiumW - 6, podiumH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Speed Ring Line on Stage
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 1, podiumW - 14, (podiumH - 14) * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Stage Light Beam Cone
      const beamGrad = ctx.createLinearGradient(centerX, 0, centerX, centerY);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      beamGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.05)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(centerX - 40, 0);
      ctx.lineTo(centerX + 40, 0);
      ctx.lineTo(centerX + podiumW - 8, centerY);
      ctx.lineTo(centerX - podiumW + 8, centerY);
      ctx.closePath();
      ctx.fill();

      // Render Panda in fixed front view
      drawPandaOnCanvas(
        ctx,
        centerX,
        centerY - 46,
        frame,
        {
          head: wardrobe.head,
          eyes: wardrobe.eyes,
          body: wardrobe.body,
          legs: wardrobe.legs,
          shoes: wardrobe.shoes,
          accessory: wardrobe.accessory,
          skin: wardrobe.skin,
          colors: wardrobe.colors,
          customShoe: wardrobe.shoes === 'custom_wardrobe' ? {
            name: currentSelectedShoe?.name || 'Moje Buty',
            brand: currentSelectedShoe?.brand || 'Nike',
            color: wardrobe.colors?.shoes || '#06b6d4',
          } : undefined,
        },
        poseMode,
        {
          lookX: 0,
          lookY: 0,
          scale: 1.15,
          rotationAngle: podiumAngle,
        }
      );

      ctx.restore();
      frame++;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [wardrobe, poseMode, currentSelectedShoe, podiumAngle]);

  // Dynamic Camera Zoom Transform
  const getCameraTransform = () => {
    if (activeCategory === 'head' || activeCategory === 'eyes') {
      return 'scale(1.22) translateY(12%)';
    }
    if (activeCategory === 'shoes') {
      return 'scale(1.22) translateY(-12%)';
    }
    return 'scale(1) translateY(0)';
  };

  const handleApplyPreset = (presetWardrobe: WardrobeState, name: string) => {
    onUpdateWardrobe({ ...presetWardrobe });
    soundEngine.playSuccess();
    showToast(`Założono: ${name}!`);
  };

  const handleSaveCurrentToPreset = (index: number) => {
    const updated = [...presets];
    updated[index] = {
      ...updated[index],
      wardrobe: { ...wardrobe },
    };
    setPresets(updated);
    // Sync to profile.pandaState
    const currentPandaState = profile.pandaState || {};
    onUpdateProfile({
      pandaState: {
        ...currentPandaState,
        outfitPresets: updated.map((p, i) => ({
          id: `preset-${i}`,
          name: p.name,
          icon: p.icon,
          wardrobe: p.wardrobe,
        })),
        wardrobe: { ...wardrobe },
      },
    });
    soundEngine.playSuccess();
    showToast(`Zapisano strój do "${updated[index].name}"!`);
  };

  const handleRandomizeOutfit = () => {
    const heads: WardrobeState['head'][] = ['opaska', 'czapka', 'czapka_zimowa', 'sluchawki', 'korona', 'none'];
    const eyesArr: WardrobeState['eyes'][] = ['oakley', 'thug_life', 'trail_goggles', 'none'];
    const bodies: WardrobeState['body'][] = ['koszulka_2027', 'wiatrowka', 'bluza_aero', 'lider_z2', 'medal', 'none'];
    const legsArr: WardrobeState['legs'][] = ['spodenki_split', 'legginsy', 'trail_shorts', 'dresy', 'none'];
    const shoesArr: WardrobeState['shoes'][] = ['carbon_orange', 'kayano_green', 'sprint_gold', 'custom_wardrobe', 'none'];
    const accessories: WardrobeState['accessory'][] = ['zegarek_gps', 'pas_biodrowy', 'kamizelka', 'opaska_kapitana', 'none'];
    const skins: WardrobeState['skin'][] = ['classic', 'red_panda', 'gold_champion', 'cyber_neon'];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const randomized: WardrobeState = {
      head: pick(heads),
      eyes: pick(eyesArr),
      body: pick(bodies),
      legs: pick(legsArr),
      shoes: pick(shoesArr),
      accessory: pick(accessories),
      skin: pick(skins),
      colors: {
        body: pick(COLOR_SWATCHES).hex,
        legs: pick(COLOR_SWATCHES).hex,
        shoes: pick(COLOR_SWATCHES).hex,
      },
      customShoe: {
        name: currentSelectedShoe?.name || 'Szafa Biegacza',
        color: pick(COLOR_SWATCHES).hex,
      },
    };

    onUpdateWardrobe(randomized);
    soundEngine.playSuccess();
    showToast('Wylosowano nową stylizację Pandy!');
  };

  const handleClearOutfit = () => {
    onUpdateWardrobe({
      head: 'none',
      eyes: 'none',
      body: 'none',
      legs: 'none',
      shoes: 'none',
      accessory: 'none',
      skin: wardrobe.skin || 'classic',
    });
    soundEngine.playPandaSound('cheer');
    showToast('Zdjęto wszystkie ubrania (naturalne futerko)!');
  };

  const handleColorSwatchSelect = (hex: string) => {
    const updatedColors = { ...(wardrobe.colors || {}) };
    if (activeCategory === 'head') updatedColors.head = hex;
    else if (activeCategory === 'body') updatedColors.body = hex;
    else if (activeCategory === 'legs') updatedColors.legs = hex;
    else if (activeCategory === 'shoes') updatedColors.shoes = hex;

    onUpdateWardrobe({
      ...wardrobe,
      colors: updatedColors,
    });
    soundEngine.playPandaSound('jump');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl animate-fade-in text-white select-none overflow-hidden h-full max-h-screen">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-base sm:text-lg shadow-lg shadow-sky-500/20 shrink-0">
            👗
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-black tracking-wide bg-gradient-to-r from-sky-300 via-teal-200 to-white bg-clip-text text-transparent truncate">
              Kreator Stylu Pandy
            </h2>
            <p className="text-[10px] text-slate-400 font-medium truncate">Garderoba i akcesoria 2.5D</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
            <span>🎋</span>
            <span>{profile.bamboos}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij kreator"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center font-bold text-slate-300 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT STUDIO VIEW (Podium Left/Top, Catalog Right/Bottom) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* A. 2.5D PRESENTATION PODIUM WITH DYNAMIC CAMERA ZOOM */}
        <div className="relative h-44 sm:h-52 md:h-auto md:w-5/12 lg:w-1/2 shrink-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/80 to-slate-950 border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
          {/* Camera container with dynamic zoom */}
          <div
            className="relative h-full max-h-[160px] sm:max-h-[190px] md:max-h-[360px] aspect-square flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: getCameraTransform() }}
          >
            <canvas ref={canvasRef} className="w-full h-full drop-shadow-2xl" />
          </div>

          {/* Podium Floating Controls Bar: Rotation + Pose + Actions */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-1 pointer-events-auto flex-wrap sm:flex-nowrap">
            {/* Rotating Podium (⟲ / ⟳) and Pose Switch */}
            <div className="flex items-center gap-1.5">
              {/* Podium Rotate Controls */}
              <div className="flex items-center gap-0.5 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs font-bold shadow-lg">
                <button
                  type="button"
                  onClick={() => setPodiumAngle((prev) => prev - Math.PI / 4)}
                  className="w-7 h-6 rounded-lg bg-white/10 hover:bg-sky-500 hover:text-slate-950 text-white font-black flex items-center justify-center transition-all active:scale-90"
                  title="Obróć podium w lewo"
                >
                  ⟲
                </button>
                <button
                  type="button"
                  onClick={() => setPodiumAngle((prev) => prev + Math.PI / 4)}
                  className="w-7 h-6 rounded-lg bg-white/10 hover:bg-sky-500 hover:text-slate-950 text-white font-black flex items-center justify-center transition-all active:scale-90"
                  title="Obróć podium w prawo"
                >
                  ⟳
                </button>
              </div>

              {/* Quick Pose Switch */}
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 text-[10px] font-bold shadow-lg">
                <button
                  type="button"
                  onClick={() => setPoseMode('idle')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${poseMode === 'idle' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Postawa
                </button>
                <button
                  type="button"
                  onClick={() => setPoseMode('running')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${poseMode === 'running' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Bieg 🏃
                </button>
                <button
                  type="button"
                  onClick={() => setPoseMode('proud')}
                  className={`px-2 py-0.5 rounded-lg transition-all ${poseMode === 'proud' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Duma ⚡
                </button>
              </div>
            </div>

            {/* Random & Reset buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRandomizeOutfit}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                title="Wylosuj stylizację"
              >
                <span>🎲</span>
                <span className="hidden sm:inline">Losuj</span>
              </button>
              <button
                type="button"
                onClick={handleClearOutfit}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1"
                title="Zdejmij wszystko"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Zdejmij</span>
              </button>
            </div>
          </div>
        </div>

        {/* B. CATALOG OF 7 ANATOMICAL SECTIONS + SWATCHES + PRESETS */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-900/50 overflow-hidden">
          {/* 7 Anatomic Tabs (Smooth Horizontal Scroll) */}
          <div className="shrink-0 p-1.5 sm:p-2 border-b border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.id);
                    soundEngine.playClick(false);
                  }}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1.5 shrink-0 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm sm:text-base">{tab.icon}</span>
                  <span className="leading-none whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color Swatches Bar (When applicable) */}
          {['head', 'body', 'legs', 'shoes'].includes(activeCategory) && (
            <div className="shrink-0 px-3 py-1.5 sm:py-2 border-b border-white/5 bg-slate-950/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Kolor tkaniny:</span>
              <div className="flex items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => {
                  const currentCategoryColor =
                    activeCategory === 'head'
                      ? wardrobe.colors?.head
                      : activeCategory === 'body'
                      ? wardrobe.colors?.body
                      : activeCategory === 'legs'
                      ? wardrobe.colors?.legs
                      : wardrobe.colors?.shoes;
                  const isSelected = currentCategoryColor === swatch.hex;

                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleColorSwatchSelect(swatch.hex)}
                      className={`w-6 h-6 rounded-full border transition-all shrink-0 ${
                        isSelected ? 'ring-2 ring-sky-400 scale-125 border-white' : 'border-black/50 hover:scale-110'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.label}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Items Grid for Current Category */}
          <div className="flex-1 min-h-0 p-2.5 sm:p-3 overflow-y-auto overscroll-contain space-y-2">
            {/* 1. HEAD ITEMS */}
            {activeCategory === 'head' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'opaska', name: 'Opaska Aero PRO', icon: '🎽', desc: 'Techniczna opaska startowa' },
                  { id: 'czapka', name: 'Czapka z daszkiem', icon: '🧢', desc: 'Lekka czapka biegowa' },
                  { id: 'sluchawki', name: 'Słuchawki LED', icon: '🎧', desc: 'Nauszne bezprzewodowe' },
                  { id: 'czapka_zimowa', name: 'Czapka Ice-Run', icon: '❄️', desc: 'Ciepła czapka zimowa' },
                  { id: 'korona', name: 'Złota Korona PB', icon: '👑', desc: 'Królewska korona z rubinami' },
                  { id: 'none', name: 'Bez nakrycia', icon: '🐾', desc: 'Naturalne uszka Pandy' },
                ].map((item) => {
                  const isEquipped = (wardrobe.head || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, head: item.id as WardrobeState['head'] });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. EYES ITEMS */}
            {activeCategory === 'eyes' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'oakley', name: 'Okulary Oakley', icon: '🕶️', desc: 'Lustrzane soczewki szybkie' },
                  { id: 'thug_life', name: 'Okulary Pixel Pro', icon: '😎', desc: 'Czarne pikselowe okulary' },
                  { id: 'trail_goggles', name: 'Gogle Trailowe', icon: '🥽', desc: 'Szeroka soczewka z paskiem' },
                  { id: 'none', name: 'Bez okularów', icon: '👀', desc: 'Naturalne błyszczące oczy' },
                ].map((item) => {
                  const isEquipped = (wardrobe.eyes || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, eyes: item.id as WardrobeState['eyes'] });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. BODY ITEMS */}
            {activeCategory === 'body' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'koszulka_2027', name: 'Singlet #2027', icon: '🎽', desc: 'Koszulka startowa z numerem' },
                  { id: 'wiatrowka', name: 'Wiatrówka 3M', icon: '🧥', desc: 'Kurtka z odblaskowymi pasami' },
                  { id: 'bluza_aero', name: 'Bluza Aero PRO', icon: '🥋', desc: 'Termoaktywna ze stójką' },
                  { id: 'lider_z2', name: 'Lider Strefy Z2', icon: '🟡', desc: 'Żółta koszulka mistrza tlenu' },
                  { id: 'medal', name: 'Złoty Medal Finiszera', icon: '🥇', desc: 'Na czerwono-białej wstędze' },
                  { id: 'none', name: 'Brak (Futerko)', icon: '🐼', desc: 'Naturalne futerko Pandy' },
                ].map((item) => {
                  const isEquipped = (wardrobe.body || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, body: item.id as WardrobeState['body'] });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. LEGS ITEMS */}
            {activeCategory === 'legs' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'spodenki_split', name: 'Spodenki Split', icon: '🩳', desc: 'Krótkie spodenki maratońskie' },
                  { id: 'legginsy', name: 'Legginsy Termo', icon: '👖', desc: 'Długie kompresyjne legginsy' },
                  { id: 'trail_shorts', name: 'Spodenki Trail', icon: '🚵', desc: 'Z kieszeniami na żele' },
                  { id: 'dresy', name: 'Dresy Relax', icon: '🛋️', desc: 'Spodnie regeneracyjne' },
                  { id: 'none', name: 'Bez spodenek', icon: '🐾', desc: 'Naturalne łapki Pandy' },
                ].map((item) => {
                  const isEquipped = (wardrobe.legs || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, legs: item.id as WardrobeState['legs'] });
                        soundEngine.playPandaSound('jump');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 5. SHOES ITEMS (WITH MY WARDROBE SHOES OPTION) */}
            {activeCategory === 'shoes' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'carbon_orange', name: 'Karbonowe Startówki', icon: '👟', desc: 'Pianka ZoomX i płytka karbonowa' },
                  { id: 'kayano_green', name: 'Zielone Kayano Gel', icon: '👟', desc: 'Maksymalna amortyzacja' },
                  { id: 'sprint_gold', name: 'Złote Kolce Sprint', icon: '👟', desc: 'Mistrzowskie kolce na bieżnię' },
                  {
                    id: 'custom_wardrobe',
                    name: `Moje buty: ${currentSelectedShoe?.name || 'Szafa Biegacza'}`,
                    icon: '🌟',
                    desc: currentSelectedShoe
                      ? `${currentSelectedShoe.brand} ${currentSelectedShoe.name} (${currentSelectedShoe.mileageKm} km)`
                      : 'Aktualnie wybrane buty z Szafy Biegacza',
                  },
                  { id: 'none', name: 'Boso (Poduszki Łapek)', icon: '🐾', desc: 'Różowe miękkie poduszeczki łapek' },
                ].map((item) => {
                  const isEquipped = (wardrobe.shoes || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({
                          ...wardrobe,
                          shoes: item.id as WardrobeState['shoes'],
                          customShoe: item.id === 'custom_wardrobe' ? {
                            name: currentSelectedShoe?.name || 'Moje Buty',
                            brand: currentSelectedShoe?.brand || 'TREDA',
                            color: wardrobe.colors?.shoes || '#0ea5e9',
                          } : undefined,
                        });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 6. ACCESSORIES ITEMS */}
            {activeCategory === 'accessory' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'zegarek_gps', name: 'Zegarek GPS HR', icon: '⌚', desc: 'Smartwatch z pomiarem tętna' },
                  { id: 'pas_biodrowy', name: 'Pas Biodrowy', icon: '👝', desc: 'Elastyczny pas na softflaski i żele' },
                  { id: 'kamizelka', name: 'Kamizelka Ultra', icon: '🦺', desc: 'Kamizelka biegowa 5L z gwizdkiem' },
                  { id: 'opaska_kapitana', name: 'Opaska Kapitana', icon: '🎗️', desc: 'Opaska lidera na ramię' },
                  { id: 'none', name: 'Brak akcesoriów', icon: '✨', desc: 'Brak dodatkowego ekwipunku' },
                ].map((item) => {
                  const isEquipped = (wardrobe.accessory || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, accessory: item.id as WardrobeState['accessory'] });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 7. SKIN ITEMS */}
            {activeCategory === 'skin' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
                {[
                  { id: 'classic', name: 'Klasyczna Panda', icon: '🐼', desc: 'Czarno-białe puszyste futerko' },
                  { id: 'red_panda', name: 'Ruda Panda', icon: '🦊', desc: 'Cynamonowe futro z puszystym ogonem' },
                  { id: 'gold_champion', name: 'Złoty Mistrz', icon: '✨', desc: 'Złote futro dla rekordzistów' },
                  { id: 'cyber_neon', name: 'Cyber-Neon', icon: '⚡', desc: 'Ciemny strój z cyjanowym neonem' },
                ].map((item) => {
                  const isEquipped = (wardrobe.skin || 'classic') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onUpdateWardrobe({ ...wardrobe, skin: item.id as WardrobeState['skin'] });
                        soundEngine.playPandaSound('cheer');
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-95 ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{item.icon}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                            ✓ Założono
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3 PRESETS BAR (Compact single-row 3 presets) */}
          <div className="shrink-0 p-2 sm:p-2.5 border-t border-white/10 bg-black/75 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span>📁</span>
                <span>Zestawy stylizacji:</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {presets.map((preset, idx) => (
                <div
                  key={preset.name}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
                >
                  <div className="text-[10px] sm:text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.name}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset.wardrobe, preset.name)}
                      className="flex-1 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-black text-[9px] sm:text-[10px] transition-all"
                    >
                      Załóż
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCurrentToPreset(idx)}
                      className="px-1.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 font-semibold text-[9px] sm:text-[10px] transition-all"
                      title="Zapisz obecną stylizację"
                    >
                      💾
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
