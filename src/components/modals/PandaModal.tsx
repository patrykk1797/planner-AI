import React, { useState, useEffect } from 'react';
import { RunnerProfile, TabType, Shoe } from '../../types.ts';
import { soundEngine } from '../../utils/defaults.ts';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';
import { PandaMascot25D, WardrobeState } from '../panda/PandaMascot25D.tsx';
import {
  PandaRoomBuilder,
  RoomSceneId,
  FurnitureObject25D,
  DEFAULT_FURNITURE_POSITIONS,
} from '../panda/PandaRoomBuilder.tsx';
import { PandaMinigames } from '../panda/PandaMinigames.tsx';
import { PandaSimsStudio } from '../panda/PandaSimsStudio.tsx';
import { PandaRoomSimsStudio } from '../panda/PandaRoomSimsStudio.tsx';

interface PandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  onUpdateProfile: (updated: Partial<RunnerProfile>) => void;
  showToast: (msg: string) => void;
  onSelectTab?: (tab: TabType) => void;
  shoes?: Shoe[];
  initialOverlay?: 'none' | 'minigames' | 'sims_studio' | 'sims_room';
}

interface ShopItem {
  id: string;
  name: string;
  cost: number;
  category: 'head' | 'eyes' | 'body' | 'shoes' | 'skin' | 'bg' | 'furniture' | 'treat';
  desc: string;
}

import { TocaActionState } from '../panda/PandaTocaScene25D.tsx';

const SHOP_ITEMS: ShopItem[] = [
  // Furniture (10 Real 2.5D Toca Boca Interactive Objects)
  { id: 'furn-1', name: 'Bieżnia PRO 2.5D', cost: 0, category: 'furniture', desc: 'Postaw Pandę na bieżni, aby biegała!' },
  { id: 'furn-6', name: 'Łóżko King-Size', cost: 65, category: 'furniture', desc: 'Drzemka pod kołdrą przywraca 100% regeneracji.' },
  { id: 'furn-console', name: 'Stacja Gaming TV', cost: 50, category: 'furniture', desc: 'Konsola z padem i fotelem gamingowym.' },
  { id: 'furn-3', name: 'Mata & Wałek Fizjo', cost: 45, category: 'furniture', desc: 'Strefa rolowania powięzi i kettlebell.' },
  { id: 'furn-5', name: 'Bar Smoothie & Izo', cost: 55, category: 'furniture', desc: 'Blender i owocowe koktajle regeneracyjne.' },
  { id: 'furn-icebath', name: 'Lodowa Balia PRO', cost: 70, category: 'furniture', desc: 'Krioterapia w lodowatej wodzie z kostkami lodu.' },
  { id: 'furn-2', name: 'Półka z Pucharami', cost: 40, category: 'furniture', desc: 'Gablota chwały z pucharem i medalami.' },
  { id: 'furn-4', name: 'Donica z Bambusem', cost: 0, category: 'furniture', desc: 'Żywy bambus w donicy (+5 🎋 po kliknięciu).' },
  { id: 'furn-7', name: 'Głośnik 180 SPM', cost: 50, category: 'furniture', desc: 'Boombox grający rytm kadencji biegowej.' },
  { id: 'furn-8', name: 'Neon RUN 2027', cost: 60, category: 'furniture', desc: 'Świecący neon ścienny w stylu loft.' },

  // Wardrobe - Head
  { id: 'head-opaska', name: 'Opaska Aero PRO', cost: 0, category: 'head', desc: 'Czerwona opaska techniczna.' },
  { id: 'head-czapka', name: 'Czapka z Daszkiem', cost: 45, category: 'head', desc: 'Lekka czapka biegowa 2.5D.' },
  { id: 'head-sluchawki', name: 'Słuchawki Bezprzew.', cost: 75, category: 'head', desc: 'Sportowe słuchawki nauszne z LED.' },
  { id: 'head-korona', name: 'Złota Korona PB', cost: 140, category: 'head', desc: 'Królewska korona z klejnotami.' },
  { id: 'head-none', name: 'Bez Nakrycia', cost: 0, category: 'head', desc: 'Naturalne puszyste uszka.' },

  // Wardrobe - Eyes
  { id: 'eyes-oakley', name: 'Okulary Szybkości', cost: 0, category: 'eyes', desc: 'Lustrzane soczewki z gradientem.' },
  { id: 'eyes-thug_life', name: 'Okulary Pixel Pro', cost: 70, category: 'eyes', desc: 'Czarne okulary mistrza finiszu.' },
  { id: 'eyes-none', name: 'Bez Okularów', cost: 0, category: 'eyes', desc: 'Błyszczące oczy Pandy.' },

  // Wardrobe - Body
  { id: 'body-koszulka_2027', name: 'Singlet #2027', cost: 0, category: 'body', desc: 'Koszulka startowa z przypiętym numerem.' },
  { id: 'body-wiatrowka', name: 'Kurtka Odblaskowa', cost: 65, category: 'body', desc: 'Zielona wiatrówka z pasami 3M.' },
  { id: 'body-medal', name: 'Złoty Medal PB', cost: 95, category: 'body', desc: 'Złoty medal na biało-czerwonej szarfie.' },
  { id: 'body-none', name: 'Naturalne Futerko', cost: 0, category: 'body', desc: 'Miękkie futerko bez koszulki.' },

  // Wardrobe - Shoes
  { id: 'shoes-carbon_orange', name: 'Karbonowe Startówki', cost: 0, category: 'shoes', desc: 'Pomarańczowe buty z płytką karbonową.' },
  { id: 'shoes-kayano_green', name: 'Zielone Kayano Gel', cost: 50, category: 'shoes', desc: 'Stabilizujące buty treningowe.' },
  { id: 'shoes-sprint_gold', name: 'Złote Kolce Sprint', cost: 110, category: 'shoes', desc: 'Mistrzowskie złote buty stadionowe.' },
  { id: 'shoes-none', name: 'Boso (Poduszki Łap)', cost: 0, category: 'shoes', desc: 'Różowe poduszeczki na łapkach.' },

  // Wardrobe - Skins
  { id: 'skin-classic', name: 'Klasyczna Panda', cost: 0, category: 'skin', desc: 'Czarno-biała puszysta panda.' },
  { id: 'skin-red_panda', name: 'Ruda Panda (Kitka)', cost: 80, category: 'skin', desc: 'Rude futerko i puszysty pasiasty ogon!' },
  { id: 'skin-gold_champion', name: 'Złota Panda', cost: 160, category: 'skin', desc: 'Mistrzowskie złote futerko.' },
  { id: 'skin-cyber_neon', name: 'Cyber-Neon Panda', cost: 190, category: 'skin', desc: 'Futurystyczna neonowa stylizacja.' },

  // Treats
  { id: 'treat-bamboo', name: 'Świeży Pęd Bambusa', cost: 10, category: 'treat', desc: 'Chrupiący bambus (+30% Glikogenu).' },
  { id: 'treat-gel', name: 'Hydro-Żel 60g Carbs', cost: 20, category: 'treat', desc: 'Błyskawiczna energia (+50% Glikogenu).' },
  { id: 'treat-smoothie', name: 'Koktajl Regeneracyjny', cost: 25, category: 'treat', desc: 'Pełna odnowa glikogenu i tarczy GCT!' },

  // Room Architecture Themes
  { id: 'bg-park', name: 'Park Miejski', cost: 0, category: 'bg', desc: 'Słoneczny pokój z dębowym parkietem.' },
  { id: 'bg-las', name: 'Las Bambusowy', cost: 60, category: 'bg', desc: 'Szmaragdowe wnętrze z widokiem na gaj.' },
  { id: 'bg-wroclaw', name: 'Nocny Wrocław', cost: 90, category: 'bg', desc: 'Wieczorny apartament z neonami.' },
  { id: 'bg-stadion', name: 'Stadion PRO', cost: 110, category: 'bg', desc: 'Tartanowa podłoga i jupitery za oknem.' },
];

/**
 * Renders a crisp 2.5D Vector Miniature Preview for Wardrobe & Treat Items
 */
const WardrobePreview25D: React.FC<{ itemId: string }> = ({ itemId }) => {
  switch (itemId) {
    case 'head-opaska':
      return (
        <svg viewBox="0 0 64 48" className="w-12 h-10 drop-shadow">
          <rect x="6" y="16" width="52" height="16" rx="8" fill="#ef4444" stroke="#fecaca" strokeWidth="2" />
          <text x="32" y="27" fill="#ffffff" fontSize="8" fontWeight="900" textAnchor="middle">
            AERO PRO
          </text>
        </svg>
      );
    case 'head-czapka':
      return (
        <svg viewBox="0 0 64 48" className="w-12 h-10 drop-shadow">
          <path d="M12,32 A20,18 0 0,1 52,32 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <ellipse cx="42" cy="32" rx="18" ry="5" fill="#0369a1" />
        </svg>
      );
    case 'head-sluchawki':
      return (
        <svg viewBox="0 0 64 48" className="w-12 h-10 drop-shadow">
          <path d="M14,34 A18,18 0 0,1 50,34" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="14" cy="34" rx="6" ry="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <ellipse cx="50" cy="34" rx="6" ry="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        </svg>
      );
    case 'head-korona':
      return (
        <svg viewBox="0 0 64 48" className="w-12 h-10 drop-shadow">
          <polygon points="10,38 14,14 26,26 32,10 38,26 50,14 54,38" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
          <circle cx="32" cy="28" r="3.5" fill="#ef4444" />
        </svg>
      );
    case 'eyes-oakley':
      return (
        <svg viewBox="0 0 64 40" className="w-12 h-9 drop-shadow">
          <path d="M6,14 Q32,6 58,14 L54,28 Q32,34 10,28 Z" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
          <line x1="18" y1="14" x2="26" y2="26" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
      );
    case 'eyes-thug_life':
      return (
        <svg viewBox="0 0 64 40" className="w-12 h-9 drop-shadow">
          <rect x="6" y="12" width="52" height="5" fill="#090d16" />
          <rect x="10" y="17" width="18" height="11" fill="#090d16" />
          <rect x="36" y="17" width="18" height="11" fill="#090d16" />
          <rect x="14" y="19" width="4" height="4" fill="#ffffff" />
          <rect x="40" y="19" width="4" height="4" fill="#ffffff" />
        </svg>
      );
    case 'body-koszulka_2027':
      return (
        <svg viewBox="0 0 64 56" className="w-12 h-10 drop-shadow">
          <path d="M16,8 L48,8 L52,48 L12,48 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <rect x="20" y="20" width="24" height="16" rx="2" fill="#ffffff" />
          <text x="32" y="31" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">
            2027
          </text>
        </svg>
      );
    case 'body-wiatrowka':
      return (
        <svg viewBox="0 0 64 56" className="w-12 h-10 drop-shadow">
          <rect x="12" y="8" width="40" height="40" rx="10" fill="#16a34a" stroke="#4ade80" strokeWidth="2" />
          <polyline points="14,24 32,32 50,24" fill="none" stroke="#fef08a" strokeWidth="3.5" />
        </svg>
      );
    case 'body-medal':
      return (
        <svg viewBox="0 0 64 56" className="w-12 h-10 drop-shadow">
          <polyline points="18,6 32,28 46,6" fill="none" stroke="#ef4444" strokeWidth="5" />
          <circle cx="32" cy="36" r="12" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
        </svg>
      );
    case 'shoes-carbon_orange':
    case 'shoes-kayano_green':
    case 'shoes-sprint_gold': {
      const col =
        itemId === 'shoes-carbon_orange' ? '#f97316' : itemId === 'shoes-sprint_gold' ? '#eab308' : '#10b981';
      return (
        <svg viewBox="0 0 64 44" className="w-12 h-9 drop-shadow">
          <path d="M10,28 Q24,14 48,22 L54,32 L10,32 Z" fill={col} />
          <rect x="8" y="31" width="48" height="7" rx="3.5" fill="#ffffff" />
        </svg>
      );
    }
    case 'treat-bamboo':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow">
          <rect x="20" y="8" width="8" height="32" rx="3" fill="#84cc16" stroke="#365314" strokeWidth="1.5" />
          <ellipse cx="14" cy="18" rx="8" ry="3.5" transform="rotate(-25 14 18)" fill="#4ade80" />
          <ellipse cx="34" cy="24" rx="8" ry="3.5" transform="rotate(25 34 24)" fill="#4ade80" />
        </svg>
      );
    case 'treat-gel':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow">
          <rect x="14" y="10" width="20" height="28" rx="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <text x="24" y="27" fill="#fde047" fontSize="7" fontWeight="900" textAnchor="middle">
            GEL
          </text>
        </svg>
      );
    case 'treat-smoothie':
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow">
          <polygon points="14,14 34,14 30,40 18,40" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
          <line x1="26" y1="6" x2="22" y2="18" stroke="#fde047" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow">
          <circle cx="24" cy="24" r="16" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="24" cy="24" r="7" fill="#ffffff" />
        </svg>
      );
  }
};

export const PandaModal: React.FC<PandaModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  showToast,
  shoes = [],
  initialOverlay = 'none',
}) => {
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'minigames' | 'sims_studio' | 'sims_room'>(initialOverlay);
  const [drawerTab, setDrawerTab] = useState<'furniture' | 'wardrobe' | 'treat' | 'bg'>('furniture');

  useEffect(() => {
    if (isOpen) {
      setActiveOverlay(initialOverlay || 'none');
    }
  }, [isOpen, initialOverlay]);

  // Persisted Unlocked Items (All 7 Toca Boca stations unlocked for immediate Drag & Drop play)
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => {
    const coreStations = [
      'furn-1',
      'furn-2',
      'furn-3',
      'furn-4',
      'furn-5',
      'furn-6',
      'furn-console',
      'furn-icebath',
    ];
    try {
      const saved = localStorage.getItem('treda_panda_unlocked_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...coreStations, ...parsed]));
      }
    } catch {}
    return [
      ...coreStations,
      'head-opaska',
      'head-none',
      'eyes-oakley',
      'eyes-none',
      'body-koszulka_2027',
      'body-none',
      'shoes-carbon_orange',
      'shoes-none',
      'skin-classic',
      'bg-park',
    ];
  });

  // Persisted 2.5D Wardrobe State
  const [wardrobe, setWardrobe] = useState<WardrobeState>(() => {
    try {
      const saved = localStorage.getItem('treda_panda_wardrobe_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      head: 'opaska',
      eyes: 'oakley',
      body: 'koszulka_2027',
      legs: 'spodenki_split',
      shoes: 'carbon_orange',
      accessory: 'zegarek_gps',
      skin: 'classic',
    };
  });

  // Persisted Room Scene & Placed Furniture + Free Drag Coordinates
  const [sceneId, setSceneId] = useState<RoomSceneId>(() => {
    const saved = localStorage.getItem('treda_panda_scene_v2') as RoomSceneId;
    if (saved && saved !== ('park_zgierz' as any)) return saved;
    return 'park_miejski';
  });

  const [placedFurniture, setPlacedFurniture] = useState<string[]>(() => {
    const tocaStations = ['furn-1', 'furn-6', 'furn-console', 'furn-3', 'furn-5', 'furn-icebath', 'furn-2'];
    try {
      const saved = localStorage.getItem('treda_panda_furniture_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...tocaStations, ...parsed]));
      }
    } catch {}
    return tocaStations;
  });

  const [furniturePositions, setFurniturePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('treda_panda_furn_pos_v2');
      if (saved) return { ...DEFAULT_FURNITURE_POSITIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_FURNITURE_POSITIONS;
  });

  const [pandaPosition, setPandaPosition] = useState<{ x: number; y: number }>({ x: 52, y: 66 });
  const [actionState, setActionState] = useState<TocaActionState>('idle');

  // Condition Health Bars
  const [glycogenPercent, setGlycogenPercent] = useState<number>(88);
  const [gctShieldPercent, setGctShieldPercent] = useState<number>(94);

  // Mascot mood & speech
  const [stateMode, setStateMode] = useState<
    'proud' | 'recovery' | 'worried' | 'idle' | 'running' | 'eating' | 'sleeping'
  >('proud');
  const [speech, setSpeech] = useState<string>(
    `Cześć ${profile.name}! Chwyć mnie palcem i postaw na meblach, aby zacząć trening lub relaks!`
  );

  // Persist room & wardrobe changes automatically and notify all RunPanda panels
  useEffect(() => {
    localStorage.setItem('treda_panda_unlocked_v2', JSON.stringify(unlockedItems));
    localStorage.setItem('treda_panda_wardrobe_v2', JSON.stringify(wardrobe));
    localStorage.setItem('treda_panda_scene_v2', sceneId);
    localStorage.setItem('treda_panda_furniture_v2', JSON.stringify(placedFurniture));
    localStorage.setItem('treda_panda_furn_pos_v2', JSON.stringify(furniturePositions));

    // Sync full state into profile.pandaState for Cloud SQL database persistence
    onUpdateProfile({
      pandaState: {
        unlockedItems,
        wardrobe,
        sceneId,
        placedFurniture,
        furniturePositions,
        glycogenPercent,
        gctShieldPercent,
      },
    });

    window.dispatchEvent(
      new CustomEvent('treda_panda_wardrobe_changed', {
        detail: { wardrobe, sceneId, placedFurniture },
      })
    );
  }, [unlockedItems, wardrobe, sceneId, placedFurniture, furniturePositions, glycogenPercent, gctShieldPercent]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const currentLevel = Math.floor(profile.levelXp / 250) + 1;

  const handleActionStateChange = (nextState: TocaActionState) => {
    setActionState(nextState);
    if (nextState === 'treadmill') {
      setStateMode('running');
      soundEngine.playPandaSound('cheer');
      setSpeech(`${profile.name}! Trenuję kadencję 180 SPM na bieżni PRO! 🏃⚡`);
      onUpdateProfile({ levelXp: profile.levelXp + 15 });
      showToast('Bieżnia PRO: +15 XP Kadencja!');
    } else if (nextState === 'bed') {
      setStateMode('sleeping');
      setGctShieldPercent(100);
      setSpeech('Zzz... Drzemka w łóżku King-Size przywraca 100% regeneracji! 😴');
      onUpdateProfile({ levelXp: profile.levelXp + 10 });
      showToast('100% Regeneracji w łóżku!');
    } else if (nextState === 'console') {
      setStateMode('proud');
      soundEngine.playSuccess();
      setSpeech('Konsola gamingowa! Refleks i relaks przed zawodami! 🎮');
      onUpdateProfile({ levelXp: profile.levelXp + 10 });
      showToast('Gaming po treningu: +10 XP!');
    } else if (nextState === 'mat') {
      setStateMode('recovery');
      setGctShieldPercent((s) => Math.min(100, s + 20));
      setSpeech('Rolowanie powięzi i ćwiczenia siłowe na macie! 🧘‍♂️');
      onUpdateProfile({ levelXp: profile.levelXp + 10 });
      showToast('Mata i wałek: +20% Tarczy GCT!');
    } else if (nextState === 'kitchen') {
      setStateMode('eating');
      soundEngine.playPandaSound('crunch');
      setGlycogenPercent(100);
      setSpeech('Świeże smoothie regeneracyjne z blendera! Glikogen 100%! 🥤');
      onUpdateProfile({ levelXp: profile.levelXp + 10, bamboos: profile.bamboos + 1 });
      showToast('Smoothie z blendera: 100% Glikogenu!');
    } else if (nextState === 'icebath') {
      setStateMode('recovery');
      setGctShieldPercent(100);
      setSpeech('Brrr! Zimna woda i lód! Błyskawiczna krioterapia nóg! 🧊');
      onUpdateProfile({ levelXp: profile.levelXp + 15 });
      showToast('Lodowa balia: Pełna krioterapia nóg!');
    } else if (nextState === 'shelf') {
      setStateMode('proud');
      soundEngine.playSuccess();
      setSpeech('Gablota chwały! Puchar PB wzniesiony do góry! 🏆');
      onUpdateProfile({ levelXp: profile.levelXp + 10 });
      showToast('Wzniesiono puchar: +10 XP!');
    } else if (nextState === 'lifted') {
      setSpeech('Hopa! Nóżki machają w powietrzu! Gdzie mnie postawisz? 🐾');
    } else if (nextState === 'idle') {
      setStateMode('idle');
      setSpeech('Spaceruję po pokoju! Chwyć mnie i upuść na dowolny mebel!');
    }
  };

  const handlePokePart = (part: 'head' | 'paw' | 'belly') => {
    if (part === 'head') {
      setStateMode('proud');
      setSpeech(`${profile.name}! Sprężysty podskok 2.5D! Gotowi na nowy rekord! ⚡`);
      onUpdateProfile({ levelXp: profile.levelXp + 5, bamboos: profile.bamboos + 1 });
    } else if (part === 'paw') {
      setStateMode('running');
      setSpeech('Rozgrzewam łapki do kadencji 180 SPM! 💪');
      onUpdateProfile({ levelXp: profile.levelXp + 5 });
    } else if (part === 'belly') {
      setStateMode('eating');
      soundEngine.playPandaSound('crunch');
      setSpeech('Mniam! Chrupiący pęd bambusa ładuje glikogen! 🎋');
      setGlycogenPercent((g) => Math.min(100, g + 12));
      onUpdateProfile({ bamboos: profile.bamboos + 2 });
    }
  };

  const handleInteractFurniture = (furnId: string) => {
    if (furnId === 'furn-1') {
      handleActionStateChange('treadmill');
    } else if (furnId === 'furn-2') {
      handleActionStateChange('shelf');
    } else if (furnId === 'furn-3') {
      handleActionStateChange('mat');
    } else if (furnId === 'furn-4') {
      setStateMode('eating');
      soundEngine.playPandaSound('crunch');
      onUpdateProfile({ bamboos: profile.bamboos + 5 });
      setSpeech('Świeży pęd prosto z donicy bambusowej! +5 🎋');
      showToast('Zebrano świeży bambus z donicy! +5 🎋');
    } else if (furnId === 'furn-5') {
      handleActionStateChange('kitchen');
    } else if (furnId === 'furn-6') {
      handleActionStateChange('bed');
    } else if (furnId === 'furn-console') {
      handleActionStateChange('console');
    } else if (furnId === 'furn-icebath') {
      handleActionStateChange('icebath');
    } else if (furnId === 'furn-7') {
      setStateMode('running');
      soundEngine.playSuccess();
      setSpeech('Boombox gra rytm 180 BPM! Nóżki same podskakują! 🎵');
      showToast('Włączono muzykę biegową 180 BPM!');
    } else if (furnId === 'furn-8') {
      setStateMode('proud');
      setSpeech('Neon RUN 2027 rozświetla cały pokój! ✨');
    }
  };

  const handleSelectItem = (item: ShopItem) => {
    const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;

    if (item.category === 'treat') {
      if (profile.bamboos < item.cost) {
        showToast(`Brakuje Ci ${item.cost - profile.bamboos} 🎋 bambusów! Zagraj w gry 2.5D.`);
        return;
      }
      onUpdateProfile({ bamboos: profile.bamboos - item.cost, levelXp: profile.levelXp + 25 });
      setGlycogenPercent((g) => Math.min(100, g + 35));
      setStateMode('eating');
      soundEngine.playPandaSound('crunch');
      setSpeech(`Mniam! ${item.name} smakuje wybornie! +25 XP 🎋`);
      showToast(`Nakarmiono Pandę: ${item.name}!`);
      return;
    }

    if (!isUnlocked) {
      if (profile.bamboos < item.cost) {
        showToast(`Brakuje Ci ${item.cost - profile.bamboos} 🎋! Zagraj w gry 2.5D lub wykonaj bieg.`);
        return;
      }
      onUpdateProfile({ bamboos: profile.bamboos - item.cost });
      setUnlockedItems((prev) => [...prev, item.id]);
      soundEngine.playSuccess();
    } else {
      soundEngine.playClick(true);
    }

    if (item.category === 'head') {
      setWardrobe((w) => ({ ...w, head: item.id.replace('head-', '') as any }));
      setStateMode('proud');
    } else if (item.category === 'eyes') {
      setWardrobe((w) => ({ ...w, eyes: item.id.replace('eyes-', '') as any }));
      setStateMode('proud');
    } else if (item.category === 'body') {
      setWardrobe((w) => ({ ...w, body: item.id.replace('body-', '') as any }));
      setStateMode('proud');
    } else if (item.category === 'shoes') {
      setWardrobe((w) => ({ ...w, shoes: item.id.replace('shoes-', '') as any }));
      setStateMode('running');
    } else if (item.category === 'skin') {
      setWardrobe((w) => ({ ...w, skin: item.id.replace('skin-', '') as any }));
      setStateMode('proud');
    } else if (item.category === 'bg') {
      if (item.id === 'bg-las') setSceneId('las_bambusowy');
      else if (item.id === 'bg-wroclaw') setSceneId('nocny_wroclaw');
      else if (item.id === 'bg-stadion') setSceneId('stadion_pro');
      else setSceneId('park_miejski');
    } else if (item.category === 'furniture') {
      if (placedFurniture.includes(item.id)) {
        setPlacedFurniture((prev) => prev.filter((id) => id !== item.id));
        showToast(`Schowano do pudełka: ${item.name}`);
      } else {
        setPlacedFurniture((prev) => [...prev, item.id]);
        setSpeech(`Super! Postawiono ${item.name} w pokoju! Możesz go przesuwać palcem! 🛋️`);
        showToast(`Dodano do pokoju: ${item.name} (Przeciągnij, aby ustawić)`);
      }
    }
  };

  const isItemActive = (item: ShopItem): boolean => {
    if (item.category === 'furniture') return placedFurniture.includes(item.id);
    if (item.category === 'head') return wardrobe.head === item.id.replace('head-', '');
    if (item.category === 'eyes') return wardrobe.eyes === item.id.replace('eyes-', '');
    if (item.category === 'body') return wardrobe.body === item.id.replace('body-', '');
    if (item.category === 'shoes') return wardrobe.shoes === item.id.replace('shoes-', '');
    if (item.category === 'skin') return wardrobe.skin === item.id.replace('skin-', '');
    if (item.category === 'bg') {
      if (item.id === 'bg-park') return sceneId === 'park_miejski' || (sceneId as string) === 'park_zgierz';
      if (item.id === 'bg-las') return sceneId === 'las_bambusowy';
      if (item.id === 'bg-wroclaw') return sceneId === 'nocny_wroclaw';
      if (item.id === 'bg-stadion') return sceneId === 'stadion_pro';
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-between select-none animate-ios font-sans bg-slate-950/95">
      {/* 1. COMPACT TOP HEADER BAR */}
      <div className="relative z-30 pt-2.5 px-3">
        <div className="mx-auto max-w-xl liquid-glass rounded-3xl p-2.5 px-3.5 border border-white/20 shadow-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🐼</span>
            <div className="truncate">
              <h2 className="text-xs font-black txt-main truncate">Świat Pandy 2.5D • {profile.name}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-amber-300">Poz. {currentLevel}</span>
                <span className="text-emerald-300">⚡ {Math.round(glycogenPercent)}%</span>
                <span className="text-sky-300">🦵 {Math.round(gctShieldPercent)}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveOverlay('sims_studio')}
              className="py-1 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 text-white font-black text-[10px] sm:text-[11px] shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
              title="Kreator Stylu i Szafa Pandy"
            >
              <span>👗</span>
              <span className="hidden xs:inline">Styl</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveOverlay('sims_room')}
              className="py-1 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
              title="Kreator Wystroju Pokoju"
            >
              <span>🛋️</span>
              <span className="hidden xs:inline">Wystrój</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveOverlay('minigames')}
              className="py-1 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
              title="Mini Gry 2.5D"
            >
              <span>🎮</span>
              <span className="hidden xs:inline">Gry</span>
            </button>

            <span className="text-[10px] sm:text-xs font-black text-amber-300 bg-black/60 px-2 py-0.5 sm:py-1 rounded-full border border-amber-500/40 flex items-center gap-0.5">
              <span>🎋</span>
              <span>{profile.bamboos}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE 2.5D TOCA BOCA ROOM DIORAMA */}
      <div className="relative z-10 flex-1 px-3 py-1 flex flex-col max-w-xl mx-auto w-full min-h-0">
        <div className="mb-1 self-center max-w-[300px] bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-2xl border border-white/20 text-center shadow-xl pointer-events-none">
          <p className="text-[10px] sm:text-[11px] font-bold text-white leading-snug">"{speech}"</p>
        </div>
        <div className="flex-1 min-h-[380px] sm:min-h-[420px] relative">
          <PandaRoomBuilder
            sceneId={sceneId}
            userCity={profile.city}
            placedFurniture={placedFurniture}
            furniturePositions={furniturePositions}
            onUpdateFurniturePosition={(fid, x, y) =>
              setFurniturePositions((prev) => ({ ...prev, [fid]: { x, y } }))
            }
            onInteractFurniture={handleInteractFurniture}
            pandaPosition={pandaPosition}
            onUpdatePandaPosition={(x, y) => setPandaPosition({ x, y })}
            actionState={actionState}
            onActionStateChange={handleActionStateChange}
            wardrobe={wardrobe}
          />
        </div>
      </div>

      {/* 3. LIVE TOCA BOCA CREATOR DRAWER (Real 2.5D Objects & Wardrobe Tray) */}
      <div className="relative z-30 pb-3 px-3">
        <div className="mx-auto max-w-xl liquid-glass rounded-3xl p-2.5 border border-white/20 shadow-2xl space-y-2">
          {/* Quick Sims Studio launcher in bottom drawer */}
          <div className="flex items-center justify-between pb-0.5 px-1">
            <span className="text-[10px] font-bold text-slate-400">Garderoba i Pokoje Pandy</span>
            <button
              type="button"
              onClick={() => setActiveOverlay('sims_studio')}
              className="py-1 px-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-black text-[10px] flex items-center gap-1 shadow-md transition-all active:scale-95"
            >
              <span>👗</span>
              <span>Kreator Stylu (Sims Studio)</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/50 border border-white/10 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDrawerTab('furniture')}
              className={`py-1.5 rounded-xl transition-all ${
                drawerTab === 'furniture' ? 'accent-badge font-black shadow' : 'txt-sub hover:text-white'
              }`}
            >
              🛋️ Meble ({placedFurniture.length})
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('wardrobe')}
              className={`py-1.5 rounded-xl transition-all ${
                drawerTab === 'wardrobe' ? 'accent-badge font-black shadow' : 'txt-sub hover:text-white'
              }`}
            >
              🎽 Wygląd
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('treat')}
              className={`py-1.5 rounded-xl transition-all ${
                drawerTab === 'treat' ? 'accent-badge font-black shadow' : 'txt-sub hover:text-white'
              }`}
            >
              🎋 Kuchnia
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('bg')}
              className={`py-1.5 rounded-xl transition-all ${
                drawerTab === 'bg' ? 'accent-badge font-black shadow' : 'txt-sub hover:text-white'
              }`}
            >
              🏠 Styl Domu
            </button>
          </div>

          {/* Horizontal Toca-Style Item Carousel with Real 2.5D Previews */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {SHOP_ITEMS.filter((item) => {
              if (drawerTab === 'wardrobe') {
                return ['head', 'eyes', 'body', 'shoes', 'skin'].includes(item.category);
              }
              return item.category === drawerTab;
            }).map((item) => {
              const isUnlocked = unlockedItems.includes(item.id) || item.cost === 0;
              const active = isItemActive(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`shrink-0 w-28 sm:w-32 p-2 rounded-2xl border text-left transition-all flex flex-col items-center justify-between active:scale-95 ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Real 2.5D Object / Outfit Miniature Preview */}
                  <div className="h-14 flex items-center justify-center">
                    {item.category === 'furniture' ? (
                      <FurnitureObject25D furnId={item.id} size="sm" isActive={active} />
                    ) : (
                      <WardrobePreview25D itemId={item.id} />
                    )}
                  </div>

                  <div className="w-full text-center mt-1 flex flex-col items-center">
                    <div className="font-bold text-[10px] txt-main line-clamp-2 leading-tight min-h-[26px] flex items-center justify-center text-center px-0.5">
                      {item.name}
                    </div>
                    <div className="mt-1 flex items-center justify-center">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          active
                            ? 'bg-amber-400 text-slate-950'
                            : isUnlocked
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-white/10 text-amber-300'
                        }`}
                      >
                        {active
                          ? item.category === 'furniture'
                            ? 'W pokoju ✓'
                            : 'Założono ✓'
                          : isUnlocked
                          ? item.category === 'furniture'
                            ? '+ Postaw'
                            : 'Załóż'
                          : `${item.cost} 🎋`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Quick Sims Decor & Bottom Close Button */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setActiveOverlay('sims_room')}
              className="py-1.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>🛋️</span>
              <span>Kreator Wystroju (Sims)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 max-w-[200px] py-2 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white border border-white/15 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>✕</span>
              <span>Zamknij</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5D TOUCH MINIGAMES OVERLAY */}
      {activeOverlay === 'minigames' && (
        <PandaMinigames
          onClose={() => setActiveOverlay('none')}
          wardrobe={wardrobe}
          onReward={(bamboos, xp, reason) => {
            onUpdateProfile({
              bamboos: profile.bamboos + bamboos,
              levelXp: profile.levelXp + xp,
            });
            showToast(`Nagroda za ${reason}: +${bamboos} 🎋 Bambusów, +${xp} XP!`);
          }}
          showToast={showToast}
        />
      )}

      {/* 2.5D SIMS STUDIO OUTFIT CREATOR OVERLAY */}
      {activeOverlay === 'sims_studio' && (
        <PandaSimsStudio
          onClose={() => setActiveOverlay('none')}
          wardrobe={wardrobe}
          shoes={shoes}
          onUpdateWardrobe={(newWardrobe) => {
            setWardrobe(newWardrobe);
            localStorage.setItem('treda_panda_wardrobe_v2', JSON.stringify(newWardrobe));
            window.dispatchEvent(
              new CustomEvent('treda_panda_wardrobe_changed', {
                detail: { wardrobe: newWardrobe },
              })
            );
            const currentPanda = profile.pandaState || {};
            onUpdateProfile({
              pandaState: {
                ...currentPanda,
                wardrobe: newWardrobe,
              },
            });
          }}
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          showToast={showToast}
        />
      )}

      {/* 2.5D SIMS ROOM DECOR CREATOR OVERLAY */}
      {activeOverlay === 'sims_room' && (
        <PandaRoomSimsStudio
          onClose={() => setActiveOverlay('none')}
          sceneId={sceneId}
          onChangeScene={(newScene) => {
            setSceneId(newScene);
            localStorage.setItem('treda_panda_scene_v2', newScene);
          }}
          placedFurniture={placedFurniture}
          furniturePositions={furniturePositions}
          onUpdateFurniturePosition={(fid, x, y) => {
            const next = { ...furniturePositions, [fid]: { x, y } };
            setFurniturePositions(next);
            localStorage.setItem('treda_panda_furn_pos_v2', JSON.stringify(next));
          }}
          onToggleFurniture={(furnId) => {
            let next: string[];
            if (placedFurniture.includes(furnId)) {
              next = placedFurniture.filter((id) => id !== furnId);
              showToast('Schowano mebel do schowka.');
            } else {
              next = [...placedFurniture, furnId];
              showToast('Postawiono mebel w pokoju!');
            }
            setPlacedFurniture(next);
            localStorage.setItem('treda_panda_furniture_v2', JSON.stringify(next));
          }}
          onSetRoomLayout={(newScene, newFurniture, newPositions) => {
            setSceneId(newScene);
            localStorage.setItem('treda_panda_scene_v2', newScene);
            setPlacedFurniture(newFurniture);
            localStorage.setItem('treda_panda_furniture_v2', JSON.stringify(newFurniture));
            if (newPositions) {
              setFurniturePositions(newPositions);
              localStorage.setItem('treda_panda_furn_pos_v2', JSON.stringify(newPositions));
            }
          }}
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          showToast={showToast}
          wardrobe={wardrobe}
          unlockedItems={unlockedItems}
          onUnlockItem={(itemId, cost) => {
            if (profile.bamboos < cost) {
              showToast(`Brakuje Ci ${cost - profile.bamboos} 🎋 bambusów!`);
              return false;
            }
            onUpdateProfile({ bamboos: profile.bamboos - cost });
            setUnlockedItems((prev) => {
              const next = [...prev, itemId];
              localStorage.setItem('treda_panda_unlocked_v2', JSON.stringify(next));
              return next;
            });
            soundEngine.playSuccess();
            return true;
          }}
        />
      )}
    </div>
  );
};
