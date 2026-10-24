import React, { useState } from 'react';
import { RunnerProfile } from '../types.ts';
import { WardrobeState } from './PandaMascot25D.tsx';
import {
  PandaRoomBuilder,
  RoomSceneId,
  FurnitureObject25D,
  DEFAULT_FURNITURE_POSITIONS,
} from './PandaRoomBuilder.tsx';
import { soundEngine } from '../utils/defaults.ts';

interface PandaRoomSimsStudioProps {
  onClose: () => void;
  sceneId: RoomSceneId;
  onChangeScene: (sceneId: RoomSceneId) => void;
  placedFurniture: string[];
  furniturePositions: Record<string, { x: number; y: number }>;
  onUpdateFurniturePosition: (furnId: string, x: number, y: number) => void;
  onToggleFurniture: (furnId: string) => void;
  onSetRoomLayout: (scene: RoomSceneId, furnitureIds: string[], positions?: Record<string, { x: number; y: number }>) => void;
  profile: RunnerProfile;
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  showToast: (msg: string) => void;
  wardrobe: WardrobeState;
  unlockedItems: string[];
  onUnlockItem: (itemId: string, cost: number) => boolean;
}

type DecorCategoryType = 'training' | 'relax' | 'decor' | 'scenes' | 'presets';

interface DecorCategoryTab {
  id: DecorCategoryType;
  label: string;
  icon: string;
}

const DECOR_TABS: DecorCategoryTab[] = [
  { id: 'training', label: 'Trening', icon: '🏃' },
  { id: 'relax', label: 'Relaks', icon: '🛏️' },
  { id: 'decor', label: 'Trofea', icon: '🏆' },
  { id: 'scenes', label: 'Lokalizacje', icon: '🌆' },
  { id: 'presets', label: 'Gotowe Pokoje', icon: '📁' },
];

interface DecorItem {
  id: string;
  name: string;
  category: 'training' | 'relax' | 'decor';
  cost: number;
  desc: string;
}

const DECOR_ITEMS: DecorItem[] = [
  // Training
  { id: 'furn-1', name: 'Bieżnia Elektryczna PRO 2.5D', category: 'training', cost: 0, desc: 'Bieżnia treningowa z wyświetlaczem tempa i prędkości.' },
  { id: 'furn-icebath', name: 'Lodowa Balia Krioterapii', category: 'training', cost: 70, desc: 'Kąpiel w lodzie przyspieszająca regenerację mięśni.' },
  { id: 'furn-3', name: 'Mata Fizjo & Foam Roller', category: 'training', cost: 45, desc: 'Strefa rolowania powięzi, mobilności i kettlebell.' },
  { id: 'furn-5', name: 'Bar Smoothie & Bidony Izo', category: 'training', cost: 55, desc: 'Blender z napojami węglowodanowo-białkowymi.' },

  // Relax & Entertainment
  { id: 'furn-6', name: 'Łóżko Regeneracyjne King-Size', category: 'relax', cost: 65, desc: 'Głęboki sen odbudowujący glikogen i mięśnie.' },
  { id: 'furn-console', name: 'Stacja Gaming TV & Fotel', category: 'relax', cost: 50, desc: 'Konsola z padem, grami i fotelem kubełkowym.' },
  { id: 'furn-7', name: 'Boombox Kadencji 180 SPM', category: 'relax', cost: 50, desc: 'Głośnik Bluetooth grający w rytmie biegowym.' },

  // Decor & Trophies
  { id: 'furn-2', name: 'Gablota Chwały z Pucharami', category: 'decor', cost: 40, desc: 'Półka na medale maratońskie i puchary PB.' },
  { id: 'furn-8', name: 'Świecący Neon RUN 2027', category: 'decor', cost: 60, desc: 'Loftowy neon LED na ścianę z celem 2027.' },
  { id: 'furn-4', name: 'Żywa Donica z Bambusem', category: 'decor', cost: 0, desc: 'Świeży bambus (+5 🎋 po kliknięciu).' },
];

interface SceneOption {
  id: RoomSceneId;
  name: string;
  icon: string;
  desc: string;
  gradient: string;
}

const SCENE_OPTIONS: SceneOption[] = [
  {
    id: 'park_miejski',
    name: 'Park Miejski',
    icon: '🌳',
    desc: 'Zielone drzewa, słońce i asfaltowa alejka biegowa',
    gradient: 'from-sky-500 via-sky-300 to-emerald-400',
  },
  {
    id: 'las_bambusowy',
    name: 'Bambusowy Las Zen',
    icon: '🎋',
    desc: 'Spokojne dojo zen pośród wysokich pędów bambusa',
    gradient: 'from-emerald-700 via-teal-500 to-emerald-300',
  },
  {
    id: 'nocny_wroclaw',
    name: 'Nocny Loft Miejski',
    icon: '🌃',
    desc: 'Panorama oświetlonego miasta nocą z neonami',
    gradient: 'from-slate-950 via-indigo-950 to-pink-950',
  },
  {
    id: 'stadion_pro',
    name: 'Loża Stadionowa PRO',
    icon: '🏟️',
    desc: 'Widok na czerwoną bieżnię tartanową i reflektory',
    gradient: 'from-slate-900 via-sky-900 to-red-900',
  },
  {
    id: 'gorski_szlak',
    name: 'Górski Szlak Trail',
    icon: '🏔️',
    desc: 'Alpejska panorama szczytów i czyste powietrze',
    gradient: 'from-sky-600 via-sky-300 to-amber-200',
  },
];

interface RoomPreset {
  name: string;
  icon: string;
  desc: string;
  scene: RoomSceneId;
  furniture: string[];
}

const DEFAULT_ROOM_PRESETS: RoomPreset[] = [
  {
    name: 'Baza Mistrza 2027',
    icon: '⚡',
    desc: 'Bieżnia, Balia krio, Gablota PB i Neon',
    scene: 'park_miejski',
    furniture: ['furn-1', 'furn-icebath', 'furn-2', 'furn-8', 'furn-4'],
  },
  {
    name: 'Strefa Krio & Zen',
    icon: '🧘‍♂️',
    desc: 'Las bambusowy, Łóżko, Mata, Bar izo',
    scene: 'las_bambusowy',
    furniture: ['furn-6', 'furn-3', 'furn-5', 'furn-4', 'furn-icebath'],
  },
  {
    name: 'Apartament Nocny',
    icon: '🎮',
    desc: 'Nocny Loft, Gaming TV, Głośnik 180 SPM, Bieżnia',
    scene: 'nocny_wroclaw',
    furniture: ['furn-console', 'furn-7', 'furn-8', 'furn-1', 'furn-2'],
  },
];

export const PandaRoomSimsStudio: React.FC<PandaRoomSimsStudioProps> = ({
  onClose,
  sceneId,
  onChangeScene,
  placedFurniture,
  furniturePositions,
  onUpdateFurniturePosition,
  onToggleFurniture,
  onSetRoomLayout,
  profile,
  showToast,
  wardrobe,
  unlockedItems,
  onUnlockItem,
}) => {
  const [activeTab, setActiveTab] = useState<DecorCategoryType>('training');

  // Handle Preset Application
  const handleApplyPreset = (preset: RoomPreset) => {
    onSetRoomLayout(preset.scene, preset.furniture, DEFAULT_FURNITURE_POSITIONS);
    soundEngine.playSuccess();
    showToast(`Wczytano wystrój: ${preset.name}!`);
  };

  // Randomize complete room layout
  const handleRandomizeRoom = () => {
    const randomScene = SCENE_OPTIONS[Math.floor(Math.random() * SCENE_OPTIONS.length)].id;
    const allFurnIds = DECOR_ITEMS.map((d) => d.id);
    // Shuffle and pick 4 to 6 items
    const shuffled = [...allFurnIds].sort(() => 0.5 - Math.random());
    const pickedCount = 4 + Math.floor(Math.random() * 3);
    const pickedFurniture = shuffled.slice(0, pickedCount);

    onSetRoomLayout(randomScene, pickedFurniture, DEFAULT_FURNITURE_POSITIONS);
    soundEngine.playSuccess();
    showToast('Wylosowano nową aranżację pokoju Pandy!');
  };

  // Stow all furniture (clean floor)
  const handleStowAllFurniture = () => {
    onSetRoomLayout(sceneId, [], furniturePositions);
    soundEngine.playPandaSound('cheer');
    showToast('Schowano wszystkie meble do schowka!');
  };

  // Reset positions to default
  const handleResetPositions = () => {
    onSetRoomLayout(sceneId, placedFurniture, DEFAULT_FURNITURE_POSITIONS);
    soundEngine.playSuccess();
    showToast('Przywrócono domyślne ustawienie mebli.');
  };

  const handleItemClick = (item: DecorItem) => {
    const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;
    if (!isUnlocked) {
      const success = onUnlockItem(item.id, item.cost);
      if (!success) return;
    }
    onToggleFurniture(item.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl animate-fade-in text-white select-none overflow-hidden h-full max-h-screen">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-base sm:text-lg shadow-lg shadow-amber-500/20 shrink-0">
            🛋️
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-200 to-white bg-clip-text text-transparent truncate">
              Kreator Wystroju Pokoju
            </h2>
            <p className="text-[10px] text-slate-400 font-medium truncate">Sims Room Decor • Meble & Scenerie 2.5D</p>
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

      {/* 2. MAIN SPLIT STUDIO VIEW (Room Preview Left/Top, Catalog Right/Bottom) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* A. LIVE 2.5D ROOM DIORAMA PREVIEW */}
        <div className="relative h-52 sm:h-60 md:h-auto md:w-5/12 lg:w-1/2 shrink-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/90 to-slate-950 border-b md:border-b-0 md:border-r border-white/10 p-2 overflow-hidden">
          {/* Room Frame with rounded corners & shadow */}
          <div className="relative w-full h-full max-h-[380px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
            <PandaRoomBuilder
              sceneId={sceneId}
              userCity={profile.city}
              placedFurniture={placedFurniture}
              furniturePositions={furniturePositions}
              onUpdateFurniturePosition={onUpdateFurniturePosition}
              pandaPosition={{ x: 50, y: 70 }}
              actionState="idle"
              wardrobe={wardrobe}
            />
          </div>

          {/* Floating Room Controls Bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 shadow-xl text-[10px] font-bold">
              <span className="text-slate-400">Meble:</span>
              <span className="text-amber-300 font-black">{placedFurniture.length} w pokoju</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRandomizeRoom}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                title="Wylosuj aranżację pokoju"
              >
                <span>🎲</span>
                <span className="hidden sm:inline">Losuj</span>
              </button>
              <button
                type="button"
                onClick={handleResetPositions}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 text-[11px] font-bold active:scale-95 transition-all"
                title="Przywróć domyślne pozycje"
              >
                Uporządkuj
              </button>
              <button
                type="button"
                onClick={handleStowAllFurniture}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 text-[11px] font-bold active:scale-95 transition-all"
                title="Schowaj wszystkie meble"
              >
                Schowaj
              </button>
            </div>
          </div>
        </div>

        {/* B. CATALOG OF DECOR CATEGORIES, SCENES & PRESETS */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-900/50 overflow-hidden">
          {/* Category Tabs (Horizontal Scroll) */}
          <div className="shrink-0 p-1.5 sm:p-2 border-b border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {DECOR_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    soundEngine.playClick(false);
                  }}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 shrink-0 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm sm:text-base">{tab.icon}</span>
                  <span className="leading-none whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Items Grid for Current Tab */}
          <div className="flex-1 min-h-0 p-2.5 sm:p-3 overflow-y-auto overscroll-contain space-y-2">
            {/* 1. TRAINING FURNITURE */}
            {activeTab === 'training' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                {DECOR_ITEMS.filter((i) => i.category === 'training').map((item) => {
                  const isPlaced = placedFurniture.includes(item.id);
                  const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer active:scale-98 ${
                        isPlaced
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5">
                        <FurnitureObject25D furnId={item.id} size="sm" isActive={isPlaced} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              isPlaced
                                ? 'bg-amber-400 text-slate-950'
                                : isUnlocked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-amber-300'
                            }`}
                          >
                            {isPlaced ? 'W pokoju ✓' : isUnlocked ? '+ Postaw' : `${item.cost} 🎋`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. RELAX FURNITURE */}
            {activeTab === 'relax' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                {DECOR_ITEMS.filter((i) => i.category === 'relax').map((item) => {
                  const isPlaced = placedFurniture.includes(item.id);
                  const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer active:scale-98 ${
                        isPlaced
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5">
                        <FurnitureObject25D furnId={item.id} size="sm" isActive={isPlaced} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              isPlaced
                                ? 'bg-amber-400 text-slate-950'
                                : isUnlocked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-amber-300'
                            }`}
                          >
                            {isPlaced ? 'W pokoju ✓' : isUnlocked ? '+ Postaw' : `${item.cost} 🎋`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. TROPHIES & DECOR */}
            {activeTab === 'decor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                {DECOR_ITEMS.filter((i) => i.category === 'decor').map((item) => {
                  const isPlaced = placedFurniture.includes(item.id);
                  const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer active:scale-98 ${
                        isPlaced
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5">
                        <FurnitureObject25D furnId={item.id} size="sm" isActive={isPlaced} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              isPlaced
                                ? 'bg-amber-400 text-slate-950'
                                : isUnlocked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-amber-300'
                            }`}
                          >
                            {isPlaced ? 'W pokoju ✓' : isUnlocked ? '+ Postaw' : `${item.cost} 🎋`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. SCENES & LOCATIONS */}
            {activeTab === 'scenes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                {SCENE_OPTIONS.map((sc) => {
                  const isSelected = sceneId === sc.id;

                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        onChangeScene(sc.id);
                        soundEngine.playSuccess();
                        showToast(`Zmieniono lokalizację: ${sc.name}!`);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 active:scale-98 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${sc.gradient} flex items-center justify-center text-2xl shadow-md shrink-0`}
                      >
                        {sc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{sc.name}</span>
                          {isSelected && (
                            <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                              Aktywne ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{sc.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 5. PRESETS (Sims Complete Room Blueprints) */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-1 gap-2 pb-4">
                {DEFAULT_ROOM_PRESETS.map((preset) => (
                  <div
                    key={preset.name}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-md shrink-0">
                        {preset.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-amber-300/80">
                          <span>{preset.furniture.length} mebli</span>
                          <span>•</span>
                          <span>Sceneria: {SCENE_OPTIONS.find((s) => s.id === preset.scene)?.name}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all"
                    >
                      Wczytaj pokój
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="shrink-0 p-2.5 sm:p-3 border-t border-white/10 bg-black/80 backdrop-blur-md flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-medium truncate">
              Możesz swobodnie przeciągać meble palcem w pokoju.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all shrink-0"
            >
              Gotowe ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
