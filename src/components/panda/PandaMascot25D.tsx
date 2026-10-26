import React, { useEffect, useRef, useState } from 'react';
import { drawPandaOnCanvas, OutfitConfig } from '../../utils/pandaRenderer.ts';
import { soundEngine } from '../../utils/defaults.ts';

export interface WardrobeState {
  head?: 'none' | 'opaska' | 'czapka' | 'korona' | 'sluchawki' | 'czapka_zimowa';
  eyes?: 'none' | 'oakley' | 'thug_life' | 'trail_goggles';
  body?: 'none' | 'koszulka_2027' | 'wiatrowka' | 'bluza_aero' | 'lider_z2' | 'medal';
  legs?: 'none' | 'spodenki_split' | 'legginsy' | 'trail_shorts' | 'dresy';
  shoes?: 'none' | 'kayano_green' | 'carbon_orange' | 'sprint_gold' | 'custom_wardrobe';
  accessory?: 'none' | 'zegarek_gps' | 'pas_biodrowy' | 'kamizelka' | 'opaska_kapitana';
  skin?: 'classic' | 'red_panda' | 'gold_champion' | 'cyber_neon';
  colors?: {
    head?: string;
    body?: string;
    legs?: string;
    shoes?: string;
  };
  customShoe?: {
    name?: string;
    brand?: string;
    color?: string;
  };
}

export const DEFAULT_PANDA_WARDROBE: WardrobeState = {
  head: 'opaska',
  eyes: 'oakley',
  body: 'koszulka_2027',
  legs: 'spodenki_split',
  shoes: 'carbon_orange',
  accessory: 'zegarek_gps',
  skin: 'classic',
};

export function loadSavedPandaWardrobe(): WardrobeState {
  if (typeof window === 'undefined') return DEFAULT_PANDA_WARDROBE;
  try {
    const saved = localStorage.getItem('treda_panda_wardrobe_v2');
    if (saved) {
      return { ...DEFAULT_PANDA_WARDROBE, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PANDA_WARDROBE;
}

export function loadSavedPandaScene(): string {
  if (typeof window === 'undefined') return 'park_zgierz';
  try {
    return localStorage.getItem('treda_panda_scene_v2') || 'park_zgierz';
  } catch {
    return 'park_zgierz';
  }
}

export function getWardrobeSummaryBadges(
  wardrobe: WardrobeState
): Array<{ icon: string; label: string }> {
  const badges: Array<{ icon: string; label: string }> = [];

  // Skin
  if (wardrobe.skin === 'red_panda') badges.push({ icon: '🦊', label: 'Ruda Panda' });
  else if (wardrobe.skin === 'gold_champion') badges.push({ icon: '✨', label: 'Złota Panda' });
  else if (wardrobe.skin === 'cyber_neon') badges.push({ icon: '⚡', label: 'Cyber-Neon' });

  // Head
  if (wardrobe.head === 'opaska') badges.push({ icon: '🎽', label: 'Opaska Aero' });
  else if (wardrobe.head === 'czapka') badges.push({ icon: '🧢', label: 'Czapka 2.5D' });
  else if (wardrobe.head === 'czapka_zimowa') badges.push({ icon: '❄️', label: 'Czapka Ice-Run' });
  else if (wardrobe.head === 'sluchawki') badges.push({ icon: '🎧', label: 'Słuchawki LED' });
  else if (wardrobe.head === 'korona') badges.push({ icon: '👑', label: 'Korona PB' });

  // Eyes
  if (wardrobe.eyes === 'oakley') badges.push({ icon: '🕶️', label: 'Okulary Szybkości' });
  else if (wardrobe.eyes === 'thug_life') badges.push({ icon: '😎', label: 'Pixel Pro' });
  else if (wardrobe.eyes === 'trail_goggles') badges.push({ icon: '🥽', label: 'Gogle Trailowe' });

  // Body
  if (wardrobe.body === 'koszulka_2027') badges.push({ icon: '👕', label: 'Singlet #2027' });
  else if (wardrobe.body === 'wiatrowka') badges.push({ icon: '🧥', label: 'Kurtka 3M' });
  else if (wardrobe.body === 'bluza_aero') badges.push({ icon: '🎽', label: 'Bluza Aero' });
  else if (wardrobe.body === 'lider_z2') badges.push({ icon: '⭐', label: 'Koszulka Lidera Z2' });
  else if (wardrobe.body === 'medal') badges.push({ icon: '🥇', label: 'Złoty Medal' });

  // Legs
  if (wardrobe.legs === 'spodenki_split') badges.push({ icon: '🩳', label: 'Spodenki Split' });
  else if (wardrobe.legs === 'legginsy') badges.push({ icon: '👖', label: 'Legginsy' });
  else if (wardrobe.legs === 'trail_shorts') badges.push({ icon: '🩳', label: 'Szorty Trail' });
  else if (wardrobe.legs === 'dresy') badges.push({ icon: '🏃', label: 'Dresy' });

  // Shoes
  if (wardrobe.shoes === 'carbon_orange') badges.push({ icon: '👟', label: 'Karbonowe Startówki' });
  else if (wardrobe.shoes === 'kayano_green') badges.push({ icon: '👟', label: 'Kayano Gel' });
  else if (wardrobe.shoes === 'sprint_gold') badges.push({ icon: '👟', label: 'Złote Kolce' });
  else if (wardrobe.shoes === 'custom_wardrobe') badges.push({ icon: '👟', label: wardrobe.customShoe?.name || 'Moje Buty' });

  // Accessory
  if (wardrobe.accessory === 'zegarek_gps') badges.push({ icon: '⌚', label: 'Zegarek GPS' });
  else if (wardrobe.accessory === 'pas_biodrowy') badges.push({ icon: '👝', label: 'Pas z żelami' });
  else if (wardrobe.accessory === 'kamizelka') badges.push({ icon: '🦺', label: 'Kamizelka' });
  else if (wardrobe.accessory === 'opaska_kapitana') badges.push({ icon: '🎖️', label: 'Opaska C' });

  return badges;
}

interface PandaMascot25DProps {
  wardrobe?: WardrobeState;
  stateMode?: 'proud' | 'recovery' | 'worried' | 'idle' | 'running' | 'eating' | 'sleeping';
  userName?: string;
  onPoke?: (part: 'head' | 'paw' | 'belly') => void;
  className?: string;
  compact?: boolean;
}

export const PandaMascot25D: React.FC<PandaMascot25DProps> = ({
  wardrobe,
  stateMode = 'idle',
  onPoke,
  className = 'w-64 h-64',
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [syncedWardrobe, setSyncedWardrobe] = useState<WardrobeState>(() =>
    wardrobe || loadSavedPandaWardrobe()
  );
  const [floatingParticles, setFloatingParticles] = useState<
    Array<{ id: number; text: string; x: number; y: number }>
  >([]);

  // Sync wardrobe from prop or live game events
  useEffect(() => {
    if (wardrobe) {
      setSyncedWardrobe(wardrobe);
    } else {
      setSyncedWardrobe(loadSavedPandaWardrobe());
    }
  }, [wardrobe]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      if (wardrobe) return;
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.wardrobe) {
        setSyncedWardrobe(customEvt.detail.wardrobe);
      } else {
        setSyncedWardrobe(loadSavedPandaWardrobe());
      }
    };
    window.addEventListener('treda_panda_wardrobe_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('treda_panda_wardrobe_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [wardrobe]);

  const activeWardrobe = wardrobe || syncedWardrobe;

  // Interactive 2.5D Physics refs (eye tracking, spring squash, jump, petting)
  const lookRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const jumpRef = useRef<{ y: number; vy: number; squash: number }>({ y: 0, vy: 0, squash: 1 });
  const isPettingRef = useRef<boolean>(false);
  const lastPetParticleRef = useRef<number>(0);

  // Smooth 2.5D Eye Tracking towards cursor across the room
  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      lookRef.current = {
        x: Math.max(-50, Math.min(50, (e.clientX - centerX) * 0.22)),
        y: Math.max(-35, Math.min(35, (e.clientY - centerY) * 0.22)),
      };
    };
    window.addEventListener('pointermove', handleGlobalMove);
    return () => window.removeEventListener('pointermove', handleGlobalMove);
  }, []);

  // 60 FPS HTML5 Canvas Animation Loop with Spring Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update jump & squash-stretch spring physics
      if (jumpRef.current.y > 0 || jumpRef.current.vy !== 0) {
        jumpRef.current.y += jumpRef.current.vy;
        jumpRef.current.vy -= 1.1; // gravity
        if (jumpRef.current.y <= 0) {
          jumpRef.current.y = 0;
          jumpRef.current.vy = 0;
          jumpRef.current.squash = 0.82; // landing squash
        }
      }
      // Recover squash smoothly toward 1.0
      jumpRef.current.squash += (1 - jumpRef.current.squash) * 0.16;

      drawPandaOnCanvas(
        ctx,
        canvas.width / 2,
        compact ? canvas.height / 2 + 18 : canvas.height / 2 + 22,
        frame,
        activeWardrobe as OutfitConfig,
        isPettingRef.current ? 'proud' : stateMode,
        {
          scale: compact ? 0.92 : 1.08,
          lookX: lookRef.current.x,
          lookY: lookRef.current.y,
          jumpHeight: Math.max(0, jumpRef.current.y),
          squashY: jumpRef.current.squash,
          leanAngle: lookRef.current.x * 0.0012,
        }
      );

      frame++;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeWardrobe, stateMode, compact]);

  const spawnParticle = (text: string, x: number, y: number) => {
    if (compact) return;
    const pId = Date.now() + Math.random();
    setFloatingParticles((prev) => [...prev.slice(-6), { id: pId, text, x, y }]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 1100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    isPettingRef.current = true;
    lookRef.current = {
      x: clickX - rect.width / 2,
      y: clickY - rect.height / 2,
    };

    let part: 'head' | 'paw' | 'belly' = 'head';
    let text = '✨ +5 XP';

    if (clickY < rect.height * 0.44) {
      part = 'head';
      text = '✨ +5 XP';
      jumpRef.current.vy = 13;
      jumpRef.current.squash = 1.18;
      if (!compact) soundEngine.playPandaSound('cheer');
    } else if (clickY < rect.height * 0.72) {
      part = 'paw';
      text = '⚡ +5 XP';
      jumpRef.current.squash = 0.86;
      if (!compact) soundEngine.playPandaSound('jump');
    } else {
      part = 'belly';
      text = '🎋 +2 🎋';
      jumpRef.current.squash = 0.88;
      if (!compact) soundEngine.playPandaSound('crunch');
    }

    spawnParticle(text, clickX, clickY);
    if (onPoke) onPoke(part);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;

    lookRef.current = {
      x: moveX - rect.width / 2,
      y: moveY - rect.height / 2,
    };

    if (isPettingRef.current && Date.now() - lastPetParticleRef.current > 260) {
      lastPetParticleRef.current = Date.now();
      jumpRef.current.squash = 0.94 + Math.random() * 0.12;
      spawnParticle('❤️', moveX, moveY);
    }
  };

  const handlePointerUp = () => {
    isPettingRef.current = false;
    lookRef.current = { x: 0, y: 0 };
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none touch-none ${className}`}>
      {floatingParticles.map((p) => (
        <div
          key={p.id}
          className="absolute text-xs font-black text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] animate-bounce pointer-events-none z-30"
          style={{ top: Math.max(0, p.y - 42), left: Math.max(4, p.x - 20) }}
        >
          {p.text}
        </div>
      ))}

      <canvas
        ref={canvasRef}
        width={compact ? 220 : 280}
        height={compact ? 230 : 300}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full cursor-pointer transition-transform"
      />
    </div>
  );
};
