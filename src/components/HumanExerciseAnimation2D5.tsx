import React, { useEffect, useRef } from 'react';

interface HumanExerciseAnimationProps {
  exerciseId: string;
  exerciseName: string;
}

export const HumanExerciseAnimation2D5: React.FC<HumanExerciseAnimationProps> = ({
  exerciseId,
  exerciseName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;

    const width = canvas.width;
    const height = canvas.height;

    const render = () => {
      time += 0.032;
      ctx.clearRect(0, 0, width, height);

      // Dark athletic background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Perspective floor grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const groundY = height - 22;

      for (let x = 10; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + (x - width / 2) * 0.35, height);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Motion phase (smooth 0 to 1 with slight pause at peak effort)
      const rawSine = Math.sin(time);
      const phase = (rawSine + 1) / 2; // 0 to 1

      const exIdLower = (exerciseId || '').toLowerCase();
      const exNameLower = (exerciseName || '').toLowerCase();

      ctx.save();

      // Helper: Draw realistic athletic limb segment with muscle volume
      const drawRealisticLimb = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        w1: number,
        w2: number,
        skinColor: string,
        gearColor?: string,
        isTarget = false
      ) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        const nx = -dy / len;
        const ny = dx / len;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * w1, p1.y + ny * w1);
        ctx.lineTo(p2.x + nx * w2, p2.y + ny * w2);
        ctx.arc(p2.x, p2.y, w2, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
        ctx.lineTo(p1.x - nx * w1, p1.y - ny * w1);
        ctx.arc(p1.x, p1.y, w1, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        ctx.closePath();

        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        if (gearColor) {
          grad.addColorStop(0, gearColor);
          grad.addColorStop(1, gearColor);
        } else {
          grad.addColorStop(0, skinColor);
          grad.addColorStop(0.5, '#f1f5f9');
          grad.addColorStop(1, skinColor);
        }
        ctx.fillStyle = grad;
        ctx.fill();

        if (isTarget) {
          ctx.strokeStyle = '#f59e0b'; // Amber glow for target muscle
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      };

      // Helper: Draw realistic head
      const drawRealisticHead = (center: { x: number; y: number }, faceAngle = 0) => {
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(faceAngle);

        // Head
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Athletic hair/visor
        ctx.beginPath();
        ctx.arc(0, -1, 6.5, Math.PI * 0.8, Math.PI * 2.1);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Nose profile
        ctx.beginPath();
        ctx.moveTo(4.5, 0);
        ctx.lineTo(7, 1.5);
        ctx.lineTo(4.5, 2.5);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();

        ctx.restore();
      };

      // Helper: Draw running shoe
      const drawShoe = (ankle: { x: number; y: number }, toe: { x: number; y: number }) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ankle.x - 2.5, ankle.y);
        ctx.lineTo(toe.x, toe.y);
        ctx.lineTo(toe.x, toe.y + 2.5);
        ctx.lineTo(ankle.x - 3.5, ankle.y + 2.5);
        ctx.closePath();
        ctx.fillStyle = '#ff7a00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      };

      // --- EXERCISE BIOMECHANICS SIMULATION ---
      if (exIdLower.includes('str-1') || exNameLower.includes('martwy ciąg') || exNameLower.includes('rdl')) {
        // 1. Single-Leg RDL (Martwy Ciąg Jednonóż)
        // Scaled to fit comfortably inside window
        const hinge = phase * 1.30; // 0 to ~75 degrees
        const scale = 0.52;
        const centerX = 160;
        const centerY = 138;

        // Support leg (Left)
        const lAnkle = { x: centerX, y: centerY };
        const lKnee = { x: centerX - 2 * scale, y: centerY - 28 * scale };
        const lHip = { x: centerX - 4 * scale, y: centerY - 58 * scale };

        // Spine hinges forward at lHip
        const spineLen = 34 * scale;
        const spineAngle = -Math.PI / 2 + hinge;
        const neck = {
          x: lHip.x + Math.cos(spineAngle) * spineLen,
          y: lHip.y + Math.sin(spineAngle) * spineLen,
        };
        const head = {
          x: neck.x + Math.cos(spineAngle) * (10 * scale),
          y: neck.y + Math.sin(spineAngle) * (10 * scale),
        };

        // Free leg extends behind in line with spine
        const rHip = { x: lHip.x + 3 * scale, y: lHip.y - 2 * scale };
        const rLegAngle = spineAngle + Math.PI;
        const rKnee = {
          x: rHip.x + Math.cos(rLegAngle) * (26 * scale),
          y: rHip.y + Math.sin(rLegAngle) * (26 * scale),
        };
        const rAnkle = {
          x: rKnee.x + Math.cos(rLegAngle) * (24 * scale),
          y: rKnee.y + Math.sin(rLegAngle) * (24 * scale),
        };

        // Arms hang vertically
        const shoulder = {
          x: neck.x - Math.cos(spineAngle) * (5 * scale),
          y: neck.y - Math.sin(spineAngle) * (5 * scale),
        };
        const hand = { x: shoulder.x, y: shoulder.y + 30 * scale };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 3, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Render back leg
        drawRealisticLimb(rHip, rKnee, 4.5, 3.5, '#94a3b8');
        drawRealisticLimb(rKnee, rAnkle, 3.5, 2.8, '#64748b');
        drawShoe(rAnkle, { x: rAnkle.x + 6, y: rAnkle.y });

        // Render support leg (Hamstring/Glute target)
        drawRealisticLimb(lHip, lKnee, 5.8, 4.8, '#cbd5e1', '#3b82f6', true);
        drawRealisticLimb(lKnee, lAnkle, 4.8, 3.5, '#cbd5e1', undefined, true);
        drawShoe(lAnkle, { x: lAnkle.x + 7, y: lAnkle.y });

        // Render Torso & Head
        drawRealisticLimb(lHip, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, spineAngle + Math.PI / 2);

        // Arms
        drawRealisticLimb(shoulder, hand, 3, 2, '#94a3b8');

      } else if (exIdLower.includes('str-2') || exNameLower.includes('bułgarski') || exNameLower.includes('bulgarian')) {
        // 2. Bulgarian Split Squat (Przysiad Bułgarski)
        const squatDepth = phase * 28;
        const scale = 0.52;
        const centerX = 160;
        const ground = 140;

        // Bench behind
        ctx.fillStyle = '#334155';
        ctx.fillRect(85, ground - 24, 38, 24);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(88, ground - 27, 32, 5);

        // Front foot (Left)
        const lAnkle = { x: centerX + 22, y: ground };
        const lKnee = {
          x: lAnkle.x - (8 - phase * 5) * scale,
          y: lAnkle.y - (34 - squatDepth * 0.4) * scale,
        };
        const lHip = {
          x: lKnee.x - 10 * scale,
          y: lKnee.y - (34 - squatDepth * 0.6) * scale,
        };

        // Torso
        const neck = { x: lHip.x + 3 * scale, y: lHip.y - 32 * scale };
        const head = { x: neck.x, y: neck.y - 10 * scale };

        // Rear leg
        const rHip = { x: lHip.x - 5 * scale, y: lHip.y };
        const rKnee = {
          x: rHip.x - 16 * scale,
          y: rHip.y + (18 + squatDepth * 0.3) * scale,
        };
        const rAnkle = { x: 104, y: ground - 27 };

        // Arms
        const shoulder = { x: neck.x, y: neck.y + 7 * scale };
        const elbow = { x: shoulder.x + 6 * scale, y: shoulder.y + 14 * scale };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(lAnkle.x, ground + 2, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rear leg
        drawRealisticLimb(rHip, rKnee, 4.5, 3.5, '#94a3b8');
        drawRealisticLimb(rKnee, rAnkle, 3.5, 2.8, '#64748b');

        // Working leg (Quad & Glute target)
        drawRealisticLimb(lHip, lKnee, 6.2, 5, '#e2e8f0', '#3b82f6', true);
        drawRealisticLimb(lKnee, lAnkle, 5, 3.8, '#e2e8f0', undefined, true);
        drawShoe(lAnkle, { x: lAnkle.x + 7, y: lAnkle.y });

        // Torso & Head
        drawRealisticLimb(lHip, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, 0);
        drawRealisticLimb(shoulder, elbow, 3, 2, '#cbd5e1');

      } else if (exIdLower.includes('str-3') || exNameLower.includes('monster') || exNameLower.includes('band')) {
        // 3. Monster Walk z taśmą Mini Band
        const sideStep = Math.sin(time * 1.5) * 14;
        const scale = 0.52;
        const centerX = 160 + sideStep * 0.4;
        const ground = 140;

        const lAnkle = { x: centerX - 16 - sideStep * 0.35, y: ground };
        const rAnkle = { x: centerX + 16 + sideStep * 0.35, y: ground };

        const lKnee = { x: lAnkle.x - 3, y: ground - 26 * scale };
        const rKnee = { x: rAnkle.x + 3, y: ground - 26 * scale };
        const hips = { x: centerX, y: ground - 50 * scale };
        const neck = { x: centerX, y: hips.y - 30 * scale };
        const head = { x: centerX, y: neck.y - 10 * scale };

        const bandLeft = { x: lKnee.x + 2, y: lKnee.y - 5 };
        const bandRight = { x: rKnee.x - 2, y: rKnee.y - 5 };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, ground + 2, 30, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        drawRealisticLimb({ x: hips.x - 5, y: hips.y }, lKnee, 5.8, 4.5, '#e2e8f0', '#3b82f6', true);
        drawRealisticLimb({ x: hips.x + 5, y: hips.y }, rKnee, 5.8, 4.5, '#e2e8f0', '#3b82f6', true);
        drawRealisticLimb(lKnee, lAnkle, 4.5, 3.5, '#e2e8f0');
        drawRealisticLimb(rKnee, rAnkle, 4.5, 3.5, '#e2e8f0');
        drawShoe(lAnkle, { x: lAnkle.x + 6, y: lAnkle.y });
        drawShoe(rAnkle, { x: rAnkle.x + 6, y: rAnkle.y });

        // Mini Band
        ctx.beginPath();
        ctx.moveTo(bandLeft.x, bandLeft.y);
        ctx.lineTo(bandRight.x, bandRight.y);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Torso & Head
        drawRealisticLimb(hips, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, 0);

      } else if (exIdLower.includes('str-4') || exNameLower.includes('alfredson') || exNameLower.includes('achilles')) {
        // 4. Alfredson Protocol (Opuszczanie na stopniu)
        const heelDrop = phase * 18;
        const scale = 0.52;
        const stepX = 145;
        const stepY = 120;

        // Step
        ctx.fillStyle = '#334155';
        ctx.fillRect(stepX, stepY, 70, 40);
        ctx.fillStyle = '#475569';
        ctx.fillRect(stepX, stepY, 70, 5);

        // Working foot
        const lForefoot = { x: stepX + 12, y: stepY };
        const lAnkle = { x: lForefoot.x - 5, y: stepY + (heelDrop - 5) * scale };
        const lKnee = { x: lAnkle.x + 2, y: lAnkle.y - 30 * scale };
        const lHip = { x: lKnee.x - 2, y: lKnee.y - 32 * scale };
        const neck = { x: lHip.x, y: lHip.y - 30 * scale };
        const head = { x: neck.x, y: neck.y - 10 * scale };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(stepX + 35, stepY + 42, 35, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Torso & Head
        drawRealisticLimb(lHip, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, 0);

        // Working leg & Achilles
        drawRealisticLimb(lHip, lKnee, 5.8, 4.5, '#e2e8f0');
        drawRealisticLimb(lKnee, lAnkle, 4.5, 3.2, '#e2e8f0', '#f59e0b', true);
        drawShoe(lAnkle, lForefoot);

      } else if (exIdLower.includes('str-5') || exNameLower.includes('soleus') || exNameLower.includes('płaszczkowaty')) {
        // 5. Seated Soleus Calf Raise
        const heelRaise = phase * 15;
        const scale = 0.52;
        const benchX = 120;
        const benchY = 112;

        // Bench
        ctx.fillStyle = '#334155';
        ctx.fillRect(benchX, benchY, 45, 32);

        const hips = { x: benchX + 22, y: benchY - 4 };
        const neck = { x: hips.x, y: hips.y - 32 * scale };
        const head = { x: neck.x, y: neck.y - 10 * scale };

        const forefoot = { x: hips.x + 30 * scale, y: 142 };
        const ankle = { x: forefoot.x - 5, y: forefoot.y - heelRaise * scale };
        const knee = { x: forefoot.x, y: hips.y + 6 * scale };

        // Dumbbell
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(knee.x, knee.y - 6, 6, 0, Math.PI * 2);
        ctx.fill();

        // Torso & Head
        drawRealisticLimb(hips, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, 0);

        // Leg & Soleus highlight
        drawRealisticLimb(hips, knee, 6, 4.8, '#e2e8f0');
        drawRealisticLimb(knee, ankle, 4.8, 3.5, '#e2e8f0', '#f59e0b', true);
        drawShoe(ankle, forefoot);

      } else if (exIdLower.includes('str-6') || exNameLower.includes('pogo') || exNameLower.includes('wieloskoki')) {
        // 6. Pogo Hops
        const hopHeight = Math.max(0, Math.sin(time * 3) * 16);
        const scale = 0.52;
        const centerX = 160;
        const ground = 142;

        const ankles = { x: centerX, y: ground - hopHeight };
        const knees = { x: centerX, y: ankles.y - 30 * scale };
        const hips = { x: centerX, y: knees.y - 30 * scale };
        const neck = { x: centerX, y: hips.y - 30 * scale };
        const head = { x: centerX, y: neck.y - 10 * scale };

        if (hopHeight < 2) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(centerX, ground + 2, 16, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(centerX, ground + 2, Math.max(6, 18 - hopHeight * 0.4), 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        drawRealisticLimb(hips, knees, 6, 4.8, '#e2e8f0');
        drawRealisticLimb(knees, ankles, 4.8, 3.5, '#e2e8f0', '#38bdf8', true);
        drawShoe(ankles, { x: ankles.x + 6, y: ankles.y + 3 });

        drawRealisticLimb(hips, neck, 7, 6, '#e2e8f0', '#1e293b');
        drawRealisticHead(head, 0);

      } else if (exIdLower.includes('str-7') || exNameLower.includes('dead') || exNameLower.includes('robak')) {
        // 7. Dead Bug
        const scale = 0.50;
        const matY = 125;
        const centerX = 160;

        // Mat
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(90, matY + 6, 140, 5);

        const head = { x: centerX - 48 * scale, y: matY };
        const neck = { x: centerX - 36 * scale, y: matY + 2 };
        const hips = { x: centerX + 8 * scale, y: matY + 2 };

        const extPhase = Math.sin(time * 1.5);

        const lKnee = { x: hips.x + 12 * scale, y: matY - 24 * scale };
        const lAnkle = { x: lKnee.x + 18 * scale, y: lKnee.y };

        const rLegExt = Math.max(0, extPhase) * 30 * scale;
        const rKnee = { x: hips.x + (12 + rLegExt * 0.6) * scale, y: matY - (24 - rLegExt * 0.6) * scale };
        const rAnkle = { x: rKnee.x + (18 + rLegExt * 0.5) * scale, y: rKnee.y + rLegExt * 0.3 * scale };

        const lArmExt = Math.max(0, extPhase) * 30 * scale;
        const lShoulder = { x: neck.x - 2, y: matY - 4 };
        const lHand = { x: lShoulder.x - (8 + lArmExt) * scale, y: matY - (24 - lArmExt * 0.4) * scale };

        const rHand = { x: lShoulder.x + 4 * scale, y: matY - 26 * scale };

        // Torso
        drawRealisticLimb(hips, neck, 6.5, 6.5, '#e2e8f0', '#3b82f6', true);
        drawRealisticHead(head, -Math.PI / 2);

        // Limbs
        drawRealisticLimb(hips, lKnee, 5, 4, '#e2e8f0');
        drawRealisticLimb(lKnee, lAnkle, 4, 3, '#e2e8f0');

        drawRealisticLimb(hips, rKnee, 5, 4, '#cbd5e1');
        drawRealisticLimb(rKnee, rAnkle, 4, 3, '#cbd5e1');

        drawRealisticLimb(lShoulder, lHand, 3.5, 2.5, '#cbd5e1');
        drawRealisticLimb(lShoulder, rHand, 3.5, 2.5, '#e2e8f0');

      } else {
        // 8. Bird-Dog
        const scale = 0.50;
        const matY = 128;
        const centerX = 160;

        // Mat
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(90, matY + 4, 140, 5);

        const hips = { x: centerX - 22 * scale, y: matY - 24 * scale };
        const neck = { x: centerX + 22 * scale, y: matY - 24 * scale };
        const head = { x: neck.x + 10 * scale, y: neck.y };

        const extAmount = phase * 28 * scale;

        const lHip = { x: hips.x - 2, y: hips.y };
        const lKnee = { x: lHip.x - (22 + extAmount * 0.6) * scale, y: lHip.y + (24 - extAmount * 0.8) * scale };
        const lAnkle = { x: lKnee.x - (22 + extAmount * 0.6) * scale, y: lKnee.y + (24 - extAmount * 0.8) * scale };

        const rKnee = { x: hips.x, y: matY };
        const rShoulder = { x: neck.x + 2, y: neck.y };
        const rHand = { x: rShoulder.x + (22 + extAmount) * scale, y: rShoulder.y + (24 - extAmount * 0.8) * scale };
        const lHand = { x: neck.x, y: matY };

        // Torso
        drawRealisticLimb(hips, neck, 6.5, 6.5, '#e2e8f0', '#3b82f6', true);
        drawRealisticHead(head, 0);

        // Planted limbs
        drawRealisticLimb(hips, rKnee, 5, 4, '#cbd5e1');
        drawRealisticLimb(neck, lHand, 3.5, 2.8, '#cbd5e1');

        // Extended limbs
        drawRealisticLimb(lHip, lKnee, 5, 4, '#e2e8f0', '#f59e0b', true);
        drawRealisticLimb(lKnee, lAnkle, 4, 3, '#e2e8f0');
        drawRealisticLimb(rShoulder, rHand, 3.5, 2.5, '#e2e8f0');
      }

      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [exerciseId, exerciseName]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/80 shadow-md">
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        className="w-full h-36 object-cover block"
      />
    </div>
  );
};
