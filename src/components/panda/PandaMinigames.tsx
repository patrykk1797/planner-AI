import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../../utils/defaults.ts';
import {
  drawPandaOnCanvas,
  drawPerspective25DTrack,
  project25DPoint,
  drawVectorObstacle,
  drawVectorCollectible,
  OutfitConfig,
} from '../../utils/pandaRenderer.ts';

interface PandaMinigamesProps {
  onClose: () => void;
  onReward: (bamboos: number, xp: number, reason: string) => void;
  showToast: (msg: string) => void;
  wardrobe?: OutfitConfig;
}

interface Particle25D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  text?: string;
}

interface TouchTrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export const PandaMinigames: React.FC<PandaMinigamesProps> = ({
  onClose,
  onReward,
  showToast,
  wardrobe = { head: 'opaska', eyes: 'oakley', body: 'koszulka_2027', shoes: 'carbon_orange', skin: 'classic' },
}) => {
  const [activeGame, setActiveGame] = useState<'menu' | 'runner' | 'cadence' | 'fueling'>('menu');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Common Arcade HUD State
  const [score, setScore] = useState<number>(0);
  const [bamboosEarned, setBamboosEarned] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [lastFeedback, setLastFeedback] = useState<string>('DOTKNIJ I PRZESUWAJ PALCEM PO EKRANIE');

  // Touch & Pointer Gesture Tracking Refs
  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 200, y: 300, time: 0 });
  const pointerCurrentPosRef = useRef<{ x: number; y: number }>({ x: 200, y: 380 });
  const touchTrailRef = useRef<TouchTrailPoint[]>([]);
  const particlesRef = useRef<Particle25D[]>([]);

  // =========================================================================
  // GAME 1: ZGIERZ PARK RUNNER 2.5D (3D Perspective Lane Drag & Swipe/Tap Jump)
  // =========================================================================
  const runnerLaneFloat = useRef<number>(1.0); // Continuous 0.0 (left) .. 1.0 (center) .. 2.0 (right)
  const runnerTargetXRatio = useRef<number>(0.5); // 0..1 from finger drag
  const runnerJumpHeight = useRef<number>(0);
  const runnerJumpVel = useRef<number>(0);
  const runnerSquash = useRef<number>(1);
  const runnerGlycogen = useRef<number>(100);
  const runnerDistanceKm = useRef<number>(0);
  const runnerObjects = useRef<
    Array<{
      id: number;
      lane: number; // 0, 1, 2
      z: number; // 0.05 (horizon) -> 1.15 (camera)
      type: 'itbs' | 'smog' | 'wall' | 'bamboo' | 'gel';
      collected?: boolean;
    }>
  >([]);

  const startParkRunner = () => {
    setActiveGame('runner');
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setBamboosEarned(0);
    setLastFeedback('PRZESUWAJ PALCEM LEWO/PRAWO • DOTKNIJ ABY SKOCZYĆ!');
    runnerLaneFloat.current = 1.0;
    runnerTargetXRatio.current = 0.5;
    runnerJumpHeight.current = 0;
    runnerJumpVel.current = 0;
    runnerSquash.current = 1;
    runnerGlycogen.current = 100;
    runnerDistanceKm.current = 0;
    runnerObjects.current = [];
    particlesRef.current = [];
  };

  const triggerRunnerJump = () => {
    if (runnerJumpHeight.current <= 2) {
      runnerJumpVel.current = 13.5;
      runnerSquash.current = 1.22;
      soundEngine.playPandaSound('jump');
    }
  };

  // =========================================================================
  // GAME 2: CADENCE HERO 180 SPM 2.5D (Direct Touch / Finger Slide on 3D Pads)
  // =========================================================================
  const cadenceNotes = useRef<Array<{ id: number; z: number; foot: 'L' | 'P'; hit: boolean }>>([]);
  const lastCadenceSpawn = useRef<number>(0);
  const lastSlidSide = useRef<'L' | 'P' | null>(null);
  const padPulseRef = useRef<{ L: number; P: number }>({ L: 0, P: 0 });

  const startCadenceHero = () => {
    setActiveGame('cadence');
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setBamboosEarned(0);
    setLastFeedback('DOTKNIJ LUB PRZESUWAJ PALEC MIĘDZY ŚLADAMI L / P!');
    cadenceNotes.current = [];
    lastCadenceSpawn.current = Date.now();
    lastSlidSide.current = null;
    particlesRef.current = [];
  };

  const triggerCadenceFoot = (foot: 'L' | 'P', hitX: number, hitY: number) => {
    if (gameState !== 'playing' || activeGame !== 'cadence') return;
    padPulseRef.current[foot] = 1.0;

    // Target hit zone is around z = 0.84
    const idx = cadenceNotes.current.findIndex(
      (n) => !n.hit && n.foot === foot && Math.abs(n.z - 0.84) < 0.22
    );

    if (idx !== -1) {
      const note = cadenceNotes.current[idx];
      note.hit = true;
      const diff = Math.abs(note.z - 0.84);

      if (diff < 0.09) {
        soundEngine.playSuccess();
        setCombo((c) => c + 1);
        setScore((s) => s + 15);
        setBamboosEarned((b) => b + 1);
        setLastFeedback('🎯 PERFEKCYJNIE! 180 SPM • GCT 218 ms');
        spawnCanvasParticles(hitX, hitY, '#22c55e', 'PERFECT +15');
      } else {
        soundEngine.playClick(true);
        setCombo((c) => c + 1);
        setScore((s) => s + 8);
        setLastFeedback('👍 DOBRY KROK! GCT 245 ms');
        spawnCanvasParticles(hitX, hitY, '#38bdf8', 'DOBRZE +8');
      }
    } else {
      soundEngine.playClick(false);
      setCombo(0);
      setLastFeedback('⚠️ ZA WCZEŚNIE / OVERSTRIDING!');
    }
  };

  // =========================================================================
  // GAME 3: FUELING LAB 2.5D (Direct Finger-Drag Panda Catcher)
  // =========================================================================
  const fuelingPandaX = useRef<number>(200);
  const fuelingTargetX = useRef<number>(200);
  const fuelingGlycogen = useRef<number>(35);
  const fuelingEatTimer = useRef<number>(0);
  const fallingFoods = useRef<
    Array<{ id: number; x: number; y: number; vx: number; type: 'bamboo' | 'rice' | 'gel' | 'kebab' }>
  >([]);

  const startFuelingLab = () => {
    setActiveGame('fueling');
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setBamboosEarned(0);
    setLastFeedback('PRZESUWAJ PALCEM PO EKRANIE, ABY PROWADZIĆ PANDĘ!');
    fuelingPandaX.current = 200;
    fuelingTargetX.current = 200;
    fuelingGlycogen.current = 35;
    fuelingEatTimer.current = 0;
    fallingFoods.current = [];
    particlesRef.current = [];
  };

  const spawnCanvasParticles = (x: number, y: number, color: string, label?: string) => {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const speed = 2 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: 3 + Math.random() * 3,
        color,
        alpha: 1,
      });
    }
    if (label) {
      particlesRef.current.push({
        x,
        y: y - 12,
        vx: 0,
        vy: -1.4,
        radius: 0,
        color,
        alpha: 1,
        text: label,
      });
    }
  };

  const handleClaimAndFinish = () => {
    const finalBamboos = Math.max(3, bamboosEarned + Math.floor(score / 25));
    const finalXp = Math.max(15, Math.floor(score / 3) + combo * 2);
    onReward(finalBamboos, finalXp, `Gra 2.5D (${activeGame.toUpperCase()})`);
    setGameState('idle');
    setActiveGame('menu');
  };

  // =========================================================================
  // UNIFIED POINTER / TOUCH GESTURE HANDLERS ON THE 2.5D CANVAS
  // =========================================================================
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 200, y: 240, normX: 0.5, normY: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return {
      x,
      y,
      normX: Math.max(0, Math.min(1, x / canvas.width)),
      normY: Math.max(0, Math.min(1, y / canvas.height)),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y, normX } = getCanvasCoords(e);
    isPointerDownRef.current = true;
    pointerStartPosRef.current = { x, y, time: Date.now() };
    pointerCurrentPosRef.current = { x, y };
    touchTrailRef.current.push({ x, y, alpha: 1.0 });

    if (gameState === 'gameover') {
      return;
    }

    if (activeGame === 'runner') {
      runnerTargetXRatio.current = normX;
      // If user taps upper 65% of screen, jump immediately; or they can swipe up/tap anywhere
      if (y < 330) {
        triggerRunnerJump();
      }
    } else if (activeGame === 'cadence') {
      const side: 'L' | 'P' = x < 200 ? 'L' : 'P';
      lastSlidSide.current = side;
      triggerCadenceFoot(side, x, y);
    } else if (activeGame === 'fueling') {
      fuelingTargetX.current = Math.max(45, Math.min(355, x));
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y, normX } = getCanvasCoords(e);
    pointerCurrentPosRef.current = { x, y };

    if (isPointerDownRef.current) {
      touchTrailRef.current.push({ x, y, alpha: 0.9 });
      if (touchTrailRef.current.length > 16) touchTrailRef.current.shift();
    }

    if (gameState !== 'playing') return;

    if (activeGame === 'runner' && isPointerDownRef.current) {
      // Smoothly map horizontal finger drag across the 3 perspective lanes
      runnerTargetXRatio.current = normX;
      // Check upward flick/swipe to jump!
      const dy = pointerStartPosRef.current.y - y;
      if (dy > 38) {
        triggerRunnerJump();
        pointerStartPosRef.current.y = y;
      }
    } else if (activeGame === 'cadence' && isPointerDownRef.current) {
      // Allow sliding finger left <-> right across the center line to trigger steps!
      const side: 'L' | 'P' = x < 200 ? 'L' : 'P';
      if (side !== lastSlidSide.current) {
        lastSlidSide.current = side;
        triggerCadenceFoot(side, x, y);
      }
    } else if (activeGame === 'fueling') {
      // Follow finger or pointer continuously
      fuelingTargetX.current = Math.max(45, Math.min(355, x));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const dt = Date.now() - pointerStartPosRef.current.time;
    const dx = Math.abs(x - pointerStartPosRef.current.x);
    const dy = Math.abs(y - pointerStartPosRef.current.y);

    // Quick tap in Runner triggers jump!
    if (activeGame === 'runner' && gameState === 'playing' && dt < 240 && dx < 22 && dy < 22) {
      triggerRunnerJump();
    }

    isPointerDownRef.current = false;
    lastSlidSide.current = null;
  };

  // =========================================================================
  // 60 FPS 2.5D CANVAS GAME LOOP
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // =====================================================================
      // 1. ZGIERZ PARK RUNNER 2.5D (3D Perspective Road + Finger Drag + Jump)
      // =====================================================================
      if (activeGame === 'runner') {
        runnerDistanceKm.current = +(runnerDistanceKm.current + 0.012).toFixed(2);
        runnerGlycogen.current = Math.max(0, runnerGlycogen.current - 0.055);
        if (frame % 15 === 0) setScore((s) => s + 2);

        if (runnerGlycogen.current <= 0) {
          setGameState('gameover');
          soundEngine.playClick(false);
        }

        // Draw 3D Perspective Park Track
        drawPerspective25DTrack(ctx, frame, canvas.width, canvas.height, 'park');

        // Smoothly interpolate Panda's continuous lane position from finger X (0..2)
        const targetLane = Math.max(0, Math.min(2, runnerTargetXRatio.current * 3 - 0.5));
        const prevLane = runnerLaneFloat.current;
        runnerLaneFloat.current += (targetLane - runnerLaneFloat.current) * 0.22;
        const leanAngle = (runnerLaneFloat.current - prevLane) * 1.4;

        // Jump Physics
        if (runnerJumpHeight.current > 0 || runnerJumpVel.current !== 0) {
          runnerJumpHeight.current += runnerJumpVel.current;
          runnerJumpVel.current -= 0.78;
          if (runnerJumpHeight.current <= 0) {
            runnerJumpHeight.current = 0;
            runnerJumpVel.current = 0;
            runnerSquash.current = 0.82;
          }
        }
        runnerSquash.current += (1 - runnerSquash.current) * 0.18;

        // Spawn 2.5D Objects at Horizon (z = 0.05)
        if (frame % 44 === 0) {
          const lane = Math.floor(Math.random() * 3);
          const pool: Array<'itbs' | 'smog' | 'wall' | 'bamboo' | 'gel'> = [
            'bamboo',
            'bamboo',
            'gel',
            'itbs',
            'smog',
            'wall',
          ];
          const type = pool[Math.floor(Math.random() * pool.length)];
          runnerObjects.current.push({
            id: Date.now() + Math.random(),
            lane,
            z: 0.04,
            type,
          });
        }

        // Sort objects back-to-front by Z
        runnerObjects.current.sort((a, b) => a.z - b.z);

        // Move & Draw 2.5D Objects
        const pandaZ = 0.84;
        const pandaProj = project25DPoint(runnerLaneFloat.current, pandaZ, canvas.width, canvas.height);

        runnerObjects.current.forEach((obj) => {
          // Perspective acceleration as object gets closer
          obj.z += 0.0085 + obj.z * 0.014;
          const proj = project25DPoint(obj.lane, obj.z, canvas.width, canvas.height);

          if (!obj.collected && obj.z < pandaZ) {
            if (obj.type === 'bamboo' || obj.type === 'gel') {
              drawVectorCollectible(ctx, obj.type, proj.x, proj.y, frame, proj.scale);
            } else {
              drawVectorObstacle(ctx, obj.type, proj.x, proj.y, proj.scale);
            }
          }

          // 2.5D Collision Check around pandaZ (0.80 .. 0.89)
          if (!obj.collected && Math.abs(obj.z - pandaZ) < 0.065) {
            const laneDiff = Math.abs(obj.lane - runnerLaneFloat.current);
            if (laneDiff < 0.48) {
              if (obj.type === 'bamboo') {
                obj.collected = true;
                soundEngine.playPandaSound('crunch');
                setBamboosEarned((b) => b + 3);
                setScore((s) => s + 25);
                setLastFeedback('🎋 ZŁAPANO BAMBUS! +3 🎋');
                spawnCanvasParticles(proj.x, proj.y - 20, '#84cc16', '+3 🎋');
              } else if (obj.type === 'gel') {
                obj.collected = true;
                soundEngine.playSuccess();
                runnerGlycogen.current = Math.min(100, runnerGlycogen.current + 35);
                setScore((s) => s + 40);
                setLastFeedback('⚡ HYDRO-ŻEL 60g! +35% GLIKOGENU');
                spawnCanvasParticles(proj.x, proj.y - 20, '#06b6d4', '+35% GLIKOGEN');
              } else {
                // Obstacle! Can jump over 'itbs' or 'smog' if jumpHeight > 32
                if (runnerJumpHeight.current > 32 && obj.type !== 'wall') {
                  obj.collected = true;
                  setScore((s) => s + 15);
                  setLastFeedback('🏃💨 CZYSTY PRZESKOK NAD PRZESZKODĄ!');
                } else {
                  obj.collected = true;
                  soundEngine.playClick(false);
                  setGameState('gameover');
                }
              }
            }
          }
        });

        // Draw Redesigned 2.5D Panda at Foreground Z = 0.84
        drawPandaOnCanvas(
          ctx,
          pandaProj.x,
          pandaProj.y - 36,
          frame,
          wardrobe,
          'running',
          {
            scale: 0.78,
            leanAngle,
            jumpHeight: runnerJumpHeight.current,
            squashY: runnerSquash.current,
          }
        );

        // Draw any objects that passed in front of Panda (z >= pandaZ)
        runnerObjects.current.forEach((obj) => {
          if (!obj.collected && obj.z >= pandaZ) {
            const proj = project25DPoint(obj.lane, obj.z, canvas.width, canvas.height);
            if (obj.type === 'bamboo' || obj.type === 'gel') {
              drawVectorCollectible(ctx, obj.type, proj.x, proj.y, frame, proj.scale);
            } else {
              drawVectorObstacle(ctx, obj.type, proj.x, proj.y, proj.scale);
            }
          }
        });

        runnerObjects.current = runnerObjects.current.filter((o) => o.z < 1.15 && !o.collected);

        // On-Canvas Interactive Drag Guide Bar at Bottom
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.beginPath();
        ctx.roundRect(40, canvas.height - 28, canvas.width - 80, 14, 7);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pandaProj.x, canvas.height - 21, 9, 0, Math.PI * 2);
        ctx.fill();

        // Top HUD on Canvas
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(14, 14, 185, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.roundRect(18, 18, (177 * runnerGlycogen.current) / 100, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 9.5px sans-serif';
        ctx.fillText(`⚡ GLIKOGEN: ${Math.round(runnerGlycogen.current)}%`, 26, 29);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(canvas.width - 135, 14, 121, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.font = '900 10px sans-serif';
        ctx.fillText(`🏃 ${runnerDistanceKm.current} km • 🎋 ${bamboosEarned}`, canvas.width - 125, 29);
      }

      // =====================================================================
      // 2. CADENCE HERO 180 SPM 2.5D (Perspective Rhythm Track + Touch Pads)
      // =====================================================================
      else if (activeGame === 'cadence') {
        drawPerspective25DTrack(ctx, frame * 1.4, canvas.width, canvas.height, 'stadion');

        // Draw 2.5D Panda running in upper-middle stage
        drawPandaOnCanvas(
          ctx,
          canvas.width / 2,
          145,
          frame * (1 + Math.min(0.6, combo * 0.03)),
          wardrobe,
          'running',
          { scale: 0.72 }
        );

        // Spawn 180 SPM Rhythm Footsteps
        const now = Date.now();
        if (now - lastCadenceSpawn.current > 350) {
          lastCadenceSpawn.current = now;
          const nextFoot: 'L' | 'P' = cadenceNotes.current.length % 2 === 0 ? 'L' : 'P';
          cadenceNotes.current.push({ id: now, z: 0.12, foot: nextFoot, hit: false });
        }

        // Draw Left & Right 2.5D Interactive Touch Pads at z = 0.84
        const leftPadProj = project25DPoint(0.25, 0.84, canvas.width, canvas.height);
        const rightPadProj = project25DPoint(1.75, 0.84, canvas.width, canvas.height);

        padPulseRef.current.L = Math.max(0, padPulseRef.current.L - 0.08);
        padPulseRef.current.P = Math.max(0, padPulseRef.current.P - 0.08);

        [
          { foot: 'L' as const, proj: leftPadProj, color: '#06b6d4', label: 'LEWA STOPA (Dotknij)' },
          { foot: 'P' as const, proj: rightPadProj, color: '#f59e0b', label: 'PRAWA STOPA (Dotknij)' },
        ].forEach(({ foot, proj, color, label }) => {
          const pulse = padPulseRef.current[foot];
          ctx.save();
          ctx.translate(proj.x, proj.y);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 56 + pulse * 12, 24 + pulse * 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 3.5 + pulse * 3;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, 0, 4);
          ctx.restore();
        });

        // Update & Render Approaching 2.5D Footstep Notes
        cadenceNotes.current.forEach((note) => {
          note.z += 0.015;
          if (!note.hit) {
            const lanePos = note.foot === 'L' ? 0.25 : 1.75;
            const proj = project25DPoint(lanePos, note.z, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.scale(proj.scale, proj.scale);
            ctx.fillStyle = note.foot === 'L' ? '#06b6d4' : '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.font = '900 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(note.foot === 'L' ? 'L 👟' : 'P 👟', 0, 4);
            ctx.restore();
          }
        });

        cadenceNotes.current = cadenceNotes.current.filter((n) => n.z < 1.08);
      }

      // =====================================================================
      // 3. FUELING LAB 2.5D (Toca Kitchen Interior + Finger-Drag Panda)
      // =====================================================================
      else if (activeGame === 'fueling') {
        // Cozy 2.5D Kitchen / Aid Station Wall & Perspective Floor
        const wallGrad = ctx.createLinearGradient(0, 0, 0, 330);
        wallGrad.addColorStop(0, '#1e293b');
        wallGrad.addColorStop(1, '#334155');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, canvas.width, 330);

        // 2.5D Perspective Checkered Floor
        const floorGrad = ctx.createLinearGradient(0, 330, 0, canvas.height);
        floorGrad.addColorStop(0, '#78350f');
        floorGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 330, canvas.width, canvas.height - 330);

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.15)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 8; i++) {
          const topX = (canvas.width / 8) * i;
          const botX = (canvas.width / 2) + (topX - canvas.width / 2) * 1.45;
          ctx.beginPath();
          ctx.moveTo(topX, 330);
          ctx.lineTo(botX, canvas.height);
          ctx.stroke();
        }

        // Smoothly move Panda toward finger X
        const prevX = fuelingPandaX.current;
        fuelingPandaX.current += (fuelingTargetX.current - fuelingPandaX.current) * 0.24;
        const lean = (fuelingPandaX.current - prevX) * 0.025;
        if (fuelingEatTimer.current > 0) fuelingEatTimer.current--;

        // Spawn Falling 2.5D Foods
        if (frame % 32 === 0) {
          const types: Array<'bamboo' | 'rice' | 'gel' | 'kebab'> = ['bamboo', 'rice', 'gel', 'kebab'];
          const type = types[Math.floor(Math.random() * types.length)];
          fallingFoods.current.push({
            id: Date.now() + Math.random(),
            x: 45 + Math.random() * (canvas.width - 90),
            y: -20,
            vx: (Math.random() - 0.5) * 0.8,
            type,
          });
        }

        // Draw Panda holding 2.5D Woven Bamboo Tray
        const pandaState = fuelingEatTimer.current > 0 ? 'eating' : Math.abs(lean) > 0.04 ? 'running' : 'idle';
        drawPandaOnCanvas(
          ctx,
          fuelingPandaX.current,
          365,
          frame,
          wardrobe,
          pandaState,
          { scale: 0.78, leanAngle: lean }
        );

        // Draw 2.5D Woven Bamboo Tray in Panda's paws
        ctx.save();
        ctx.translate(fuelingPandaX.current, 382);
        ctx.rotate(lean * 0.8);
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(-38, -8, 76, 16, 8);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Update & Check Falling Foods
        fallingFoods.current.forEach((food) => {
          food.y += 3.5;
          food.x += food.vx;
          drawVectorCollectible(ctx, food.type, food.x, food.y, frame, 1.05);

          // Catch Check with Panda & Tray
          if (food.y > 325 && food.y < 405 && Math.abs(food.x - fuelingPandaX.current) < 46) {
            if (food.type === 'kebab') {
              soundEngine.playClick(false);
              fuelingGlycogen.current = Math.max(0, fuelingGlycogen.current - 16);
              setCombo(0);
              setLastFeedback('🍔 CIĘŻKI KEBAB! -16% GLIKOGENU');
              spawnCanvasParticles(food.x, food.y, '#ef4444', '-16%');
            } else {
              soundEngine.playPandaSound('crunch');
              fuelingEatTimer.current = 18;
              fuelingGlycogen.current = Math.min(100, fuelingGlycogen.current + 12);
              setScore((s) => s + 20);
              setBamboosEarned((b) => b + 2);
              setCombo((c) => c + 1);
              setLastFeedback('🎋 MNIAM! +20 PKT • +2 🎋');
              spawnCanvasParticles(food.x, food.y, '#22c55e', '+2 🎋');
            }
            food.y = 999;
          }
        });

        fallingFoods.current = fallingFoods.current.filter((f) => f.y < 500);

        // Top Glycogen Bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(14, 14, 210, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(18, 18, (202 * fuelingGlycogen.current) / 100, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 9.5px sans-serif';
        ctx.fillText(`🍚 BAK GLIKOGENU: ${Math.round(fuelingGlycogen.current)}%`, 26, 29);
      }

      // =====================================================================
      // RENDER FINGER TOUCH TRAIL & 2.5D PARTICLES ON TOP
      // =====================================================================
      for (let i = 0; i < touchTrailRef.current.length; i++) {
        const pt = touchTrailRef.current[i];
        pt.alpha -= 0.06;
        if (pt.alpha > 0) {
          ctx.save();
          ctx.fillStyle = '#38bdf8';
          ctx.globalAlpha = pt.alpha * 0.55;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6 + (i / touchTrailRef.current.length) * 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      touchTrailRef.current = touchTrailRef.current.filter((pt) => pt.alpha > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.028;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          if (p.text) {
            ctx.fillStyle = p.color;
            ctx.font = '900 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, activeGame, combo, bamboosEarned, wardrobe]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-3 sm:p-4 animate-ios select-none">
      <div className="liquid-glass w-full max-w-xl max-h-[95vh] overflow-y-auto p-4 sm:p-5 space-y-3.5 border border-[var(--accent)]/40 shadow-2xl rounded-3xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider block">
              🎮 RunPanda 2.5D Touch Arcade
            </span>
            <span className="text-[10px] txt-muted">
              Sterowanie dotykiem i przesuwaniem palca bezpośrednio po ekranie 2.5D
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* GAME SELECTION MENU */}
        {activeGame === 'menu' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={startParkRunner}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/40 text-left hover:scale-102 active:scale-98 transition-all space-y-2 shadow-lg"
            >
              <div className="text-2xl">🏃‍♂️🌳</div>
              <h3 className="text-xs font-black text-emerald-300 uppercase">Park Runner 2.5D</h3>
              <p className="text-[10px] txt-sub leading-snug">
                Bieg w perspektywie 3D! Przesuwaj palcem na boki aby zmieniać pas i stuknij w ekran aby przeskoczyć płotek!
              </p>
            </button>

            <button
              type="button"
              onClick={startCadenceHero}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-500/10 border border-amber-500/40 text-left hover:scale-102 active:scale-98 transition-all space-y-2 shadow-lg"
            >
              <div className="text-2xl">👟⚡</div>
              <h3 className="text-xs font-black text-amber-300 uppercase">Rytm Kadencji 2.5D</h3>
              <p className="text-[10px] txt-sub leading-snug">
                Bieżnia 2.5D 180 SPM! Dotykaj śladów buta bezpośrednio na ekranie lub ślizgaj palcem lewo-prawo!
              </p>
            </button>

            <button
              type="button"
              onClick={startFuelingLab}
              className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/25 to-indigo-500/10 border border-sky-500/40 text-left hover:scale-102 active:scale-98 transition-all space-y-2 shadow-lg"
            >
              <div className="text-2xl">🎋🍚</div>
              <h3 className="text-xs font-black text-sky-300 uppercase">Kuchnia Pandy 2.5D</h3>
              <p className="text-[10px] txt-sub leading-snug">
                Trzymaj i przesuwaj palcem po ekranie, aby prowadzić Pandę z tacą i łapać bambusy oraz żele!
              </p>
            </button>
          </div>
        )}

        {/* ACTIVE 2.5D TOUCH CANVAS (ZERO EXTERNAL BUTTONS!) */}
        {activeGame !== 'menu' && (
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-between text-xs gap-2">
              <button
                type="button"
                onClick={handleClaimAndFinish}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-[11px] hover:bg-emerald-500/30 transition-all"
              >
                ✓ Zakończ i Odbierz (+{Math.max(3, bamboosEarned + Math.floor(score / 25))} 🎋)
              </button>

              <div className="flex items-center gap-2 text-[11px] font-black">
                <span className="text-white bg-white/10 px-2.5 py-1 rounded-lg">PKT: {score}</span>
                <span className="text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg">🎋 +{bamboosEarned}</span>
              </div>
            </div>

            <div className="text-[11px] font-black text-sky-300 bg-sky-500/10 border border-sky-500/25 py-1 px-3 rounded-xl">
              👆 {lastFeedback}
            </div>

            {/* Interactive 2.5D Touch Canvas */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={460}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                className="w-full bg-slate-950 rounded-3xl border-2 border-white/15 shadow-2xl touch-none cursor-grab active:cursor-grabbing"
              />

              {/* Game Over Overlay directly inside the 2.5D Viewport */}
              {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 space-y-3 animate-ios">
                  <div className="text-4xl animate-bounce">🐼🏁</div>
                  <h4 className="text-base font-black text-amber-300 uppercase">Koniec Biegu!</h4>
                  <p className="text-xs txt-sub">
                    Wynik: <strong className="text-white">{score} pkt</strong> • Zebrane Bambusy:{' '}
                    <strong className="text-amber-300">+{Math.max(3, bamboosEarned + Math.floor(score / 25))} 🎋</strong>
                  </p>
                  <div className="flex gap-2 w-full max-w-xs pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeGame === 'runner') startParkRunner();
                        else if (activeGame === 'cadence') startCadenceHero();
                        else startFuelingLab();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/15 text-white font-black text-xs uppercase hover:bg-white/25"
                    >
                      Graj Ponownie 🔄
                    </button>
                    <button
                      type="button"
                      onClick={handleClaimAndFinish}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs uppercase shadow-lg"
                    >
                      Odbierz 🎋
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
