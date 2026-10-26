import React, { useEffect, useRef, useState } from 'react';
import { AchievementBadge } from '../../types.ts';
import { soundEngine } from '../../utils/defaults.ts';

interface AchievementCelebrationModalProps {
  badge: AchievementBadge | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimReward?: (bamboos: number) => void;
}

export const AchievementCelebrationModal: React.FC<AchievementCelebrationModalProps> = ({
  badge,
  isOpen,
  onClose,
  onClaimReward,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  useEffect(() => {
    if (!isOpen || !badge) return;

    // Play fanfare celebratory sound
    if (!isSoundMuted) {
      soundEngine.playFanfare();
    }

    // Particle Confetti Engine
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Particle pool
    const particleCount = 140;
    const colors = ['#f59e0b', '#fbbf24', '#38bdf8', '#10b981', '#ec4899', '#8b5cf6', '#ffffff'];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      shape: 'rect' | 'circle' | 'star';
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const originX = width / 2;
    const originY = height * 0.42;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 14;
      const shapes: ('rect' | 'circle' | 'star')[] = ['rect', 'circle', 'star'];

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5, // slight upward bias
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        alpha: 1,
        decay: 0.006 + Math.random() * 0.008,
      });
    }

    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let activeCount = 0;
      particles.forEach((p) => {
        if (p.alpha <= 0) return;
        activeCount++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.985; // air resistance
        p.rotation += p.rotationSpeed;
        p.alpha = Math.max(0, p.alpha - p.decay);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(0, 0, 5, p.size, p.size / 2);
        }

        ctx.restore();
      });

      if (activeCount > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, badge, isSoundMuted]);

  if (!isOpen || !badge) return null;

  const tierColors = {
    bronze: 'from-amber-700 via-amber-600 to-amber-800 text-amber-200 border-amber-600',
    silver: 'from-slate-400 via-slate-200 to-slate-500 text-slate-100 border-slate-300',
    gold: 'from-yellow-400 via-amber-300 to-amber-500 text-yellow-950 border-yellow-300',
    platinum: 'from-cyan-400 via-teal-200 to-sky-500 text-cyan-950 border-cyan-300',
    diamond: 'from-purple-400 via-pink-300 to-indigo-500 text-purple-950 border-pink-300',
  };

  const tierNamePL = {
    bronze: 'Brązowa Odznaka',
    silver: 'Srebrna Odznaka',
    gold: 'Złota Odznaka',
    platinum: 'Platynowa Odznaka',
    diamond: 'Diamentowa Korona',
  };

  const handleClaim = () => {
    if (onClaimReward && badge.rewardBamboos) {
      onClaimReward(badge.rewardBamboos);
    }
    soundEngine.playClick(true);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      {/* Background celebration Canvas Confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 w-full h-full"
      />

      {/* Main Card with Sunburst aura */}
      <div
        className="relative z-20 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 liquid-glass border border-white/20 shadow-2xl shadow-amber-500/20 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sunburst background rays */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-orange-500/30 blur-2xl pointer-events-none -z-10" />

        {/* Top Celebration Kicker */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            Nowe Osiągnięcie Odblokowane!
          </span>
          <div className="text-xs text-white/60">
            {tierNamePL[badge.tier]}
          </div>
        </div>

        {/* Bouncing 3D-styled Badge Emblem */}
        <div className="relative py-2 flex justify-center">
          <div className="relative group">
            {/* Outer spinning ring */}
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 animate-spin-slow shadow-xl">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border border-white/20">
                <span className="text-4xl filter drop-shadow-lg transform transition-transform group-hover:scale-110">
                  {badge.icon}
                </span>
              </div>
            </div>

            {/* Sparkle badge */}
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-black shadow-md border border-white">
              ✓
            </div>
          </div>
        </div>

        {/* Badge Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-white tracking-tight">
            {badge.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed px-2">
            {badge.description}
          </p>
        </div>

        {/* Milestone Achievement Metrics */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Wynik</span>
            <span className="text-base font-black text-emerald-400 tabular-nums">
              {badge.currentValue} {badge.unit}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Nagroda</span>
            <span className="text-base font-black text-amber-300 tabular-nums flex items-center justify-center gap-1">
              <span>🎋</span>
              <span>+{badge.rewardBamboos}</span>
            </span>
          </div>
        </div>

        {/* Tip / Coach Quote */}
        <p className="text-[11px] italic text-slate-400 px-2">
          „{badge.tip}”
        </p>

        {/* Action Controls */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>🎉</span>
            <span>Odbierz Nagrodę & Kontynuuj</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>{isSoundMuted ? '🔇' : '🔊'}</span>
              <span>{isSoundMuted ? 'Dźwięk wyłączony' : 'Dźwięk włączony'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="hover:text-white font-medium transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
