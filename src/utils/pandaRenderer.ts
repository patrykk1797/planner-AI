// High-Fidelity 60 FPS HTML5 Canvas 2.5D Renderer for RunPanda & Toca-Style World

export interface OutfitConfig {
  head?: 'none' | 'opaska' | 'czapka' | 'korona' | 'sluchawki' | 'czapka_zimowa';
  eyes?: 'none' | 'oakley' | 'thug_life' | 'trail_goggles';
  body?: 'none' | 'koszulka_2027' | 'wiatrowka' | 'bluza_aero' | 'lider_z2' | 'medal';
  legs?: 'none' | 'spodenki_split' | 'legginsy' | 'trail_shorts' | 'dresy';
  shoes?: 'none' | 'kayano_green' | 'carbon_orange' | 'sprint_gold' | 'custom_wardrobe';
  accessory?: 'none' | 'zegarek_gps' | 'pas_biodrowy' | 'kamizelka' | 'opaska_kapitana';
  skin?: 'classic' | 'red_panda' | 'gold_champion' | 'cyber_neon';
  colors?: {
    body?: string;
    legs?: string;
    head?: string;
    shoes?: string;
    accessory?: string;
  };
  customShoe?: {
    name?: string;
    brand?: string;
    color?: string;
    primaryColor?: string;
    accentColor?: string;
  };
}

export interface PandaRenderOptions {
  scale?: number;
  leanAngle?: number;
  lookX?: number;
  lookY?: number;
  jumpHeight?: number;
  squashY?: number;
  rotationAngle?: number;
}

/**
 * Renders the Redesigned 2.5D Multilayer Panda Mascot on Canvas with 60 FPS skeletal & secondary physics animations
 */
export const drawPandaOnCanvas = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  outfit: OutfitConfig = {},
  stateMode: string = 'idle',
  options: PandaRenderOptions = {}
) => {
  const {
    scale = 1,
    leanAngle = 0,
    lookX = 0,
    lookY = 0,
    jumpHeight = 0,
    squashY = 1,
    rotationAngle = 0,
  } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (rotationAngle !== 0) {
    // 2.5D pseudo-3D rotation (horizontal scale/perspective squash)
    ctx.scale(Math.cos(rotationAngle), 1);
  }

  // 1. STATES & SECONDARY PHYSICS
  const isRunning = stateMode === 'running';
  const isWalking = stateMode === 'walking';
  const isWorried = stateMode === 'worried';
  const isProud = stateMode === 'proud' || stateMode === 'happy' || stateMode === 'jump';
  const isRecovery = stateMode === 'recovery';
  const isSleeping = stateMode === 'sleeping';
  const isEating = stateMode === 'eating';
  const isBiceps = stateMode === 'biceps';

  const breath = Math.sin(frame * 0.06) * 0.028;
  const idleBob = isRunning
    ? Math.abs(Math.sin(frame * 0.28)) * -10
    : isProud
    ? Math.abs(Math.sin(frame * 0.18)) * -14
    : Math.sin(frame * 0.06) * 2.5;

  const legPhase = isRunning ? frame * 0.28 : isWalking ? frame * 0.15 : 0;
  const legSwing = isRunning ? Math.sin(legPhase) * 24 : isWalking ? Math.sin(legPhase) * 13 : 0;
  const legLiftL = isRunning ? Math.max(0, -Math.cos(legPhase)) * 14 : 0;
  const legLiftR = isRunning ? Math.max(0, Math.cos(legPhase)) * 14 : 0;
  const armSwing = isRunning ? -Math.sin(legPhase) * 22 : isWalking ? -Math.sin(legPhase) * 11 : Math.sin(frame * 0.05) * 3;

  // Skin Palette (Volumetric 2.5D Shading)
  const skin = outfit.skin || 'classic';
  const isGold = skin === 'gold_champion';
  const isRed = skin === 'red_panda';
  const isCyber = skin === 'cyber_neon';

  const furHighlight = isGold ? '#fef08a' : isRed ? '#fb923c' : isCyber ? '#38bdf8' : '#ffffff';
  const furMid = isGold ? '#f59e0b' : isRed ? '#ea580c' : isCyber ? '#1e293b' : '#f8fafc';
  const furShadow = isGold ? '#b45309' : isRed ? '#9a3412' : isCyber ? '#0f172a' : '#cbd5e1';
  const limbDark = isGold ? '#78350f' : isRed ? '#431407' : isCyber ? '#0284c7' : '#18181b';
  const limbHighlight = isGold ? '#d97706' : isRed ? '#7c2d12' : isCyber ? '#38bdf8' : '#3f3f46';

  // --- 2. 2.5D GROUND CONTACT SHADOW (Reacts to jumpHeight & breathing) ---
  ctx.save();
  const shadowFactor = Math.max(0.35, 1 - jumpHeight / 140) * (1 + Math.sin(frame * 0.06) * 0.04);
  const shadowGrad = ctx.createRadialGradient(0, 86, 6, 0, 86, 68 * shadowFactor);
  shadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0.48)');
  shadowGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0.22)');
  shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 86, 66 * shadowFactor, 15 * shadowFactor, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Apply Jump & Squash/Stretch Transform
  ctx.translate(0, -jumpHeight + idleBob);
  const stretchX = 1 / Math.sqrt(squashY);
  const rot = options.rotationAngle ?? 0;
  const cosRot = Math.cos(rot);
  const rotScaleX = Math.abs(cosRot) < 0.15 ? (cosRot >= 0 ? 0.15 : -0.15) : cosRot;
  ctx.scale(stretchX * rotScaleX, squashY);
  ctx.rotate((isRunning ? 0.07 : 0) + leanAngle);

  // --- 3. ARTICULATED 2.5D TAIL (Behind Body) ---
  ctx.save();
  const tailWag = Math.sin(frame * (isRunning ? 0.25 : 0.09)) * 0.25;
  ctx.translate(38, 42);
  ctx.rotate(tailWag);
  if (isRed) {
    // Bushy Red Panda Striped Tail!
    for (let i = 4; i >= 0; i--) {
      ctx.beginPath();
      ctx.ellipse(10 + i * 7, 4 - i * 3, 16 - i * 1.2, 11 - i * 0.8, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ea580c' : '#fde68a';
      ctx.fill();
    }
  } else {
    // Cute Fluffy Round Panda Tail with 3D Shading
    const tailGrad = ctx.createRadialGradient(8, -2, 2, 10, 0, 16);
    tailGrad.addColorStop(0, furHighlight);
    tailGrad.addColorStop(1, furShadow);
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.arc(10, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Helper to draw a detailed 2.5D Foot + Shoe
  const drawFootAndShoe = (
    footX: number,
    footY: number,
    liftY: number,
    swingOffset: number,
    isLeft: boolean
  ) => {
    ctx.save();
    ctx.translate(footX + swingOffset * 0.35, footY - liftY + swingOffset * 0.65);
    ctx.rotate((swingOffset * 0.012) * (isLeft ? 1 : -1));

    // Leg Cylinder with 3D Gradient or Compression Leggings/Trackpants
    if (outfit.legs === 'legginsy' || outfit.legs === 'dresy') {
      const legColor = outfit.colors?.legs || (outfit.legs === 'legginsy' ? '#18181b' : '#334155');
      ctx.fillStyle = legColor;
      ctx.beginPath();
      ctx.roundRect(-14, -8, 28, 30, 14);
      ctx.fill();
      if (outfit.legs === 'legginsy') {
        // Neon compression seam
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 20);
        ctx.stroke();
      }
    } else {
      const legGrad = ctx.createRadialGradient(-4, 4, 2, 0, 10, 22);
      legGrad.addColorStop(0, limbHighlight);
      legGrad.addColorStop(1, limbDark);
      ctx.fillStyle = legGrad;
      ctx.beginPath();
      ctx.roundRect(-14, -8, 28, 30, 14);
      ctx.fill();
    }

    // Shoe or Natural Paw with Pads
    if (outfit.shoes === 'carbon_orange' || outfit.shoes === 'kayano_green' || outfit.shoes === 'sprint_gold' || outfit.shoes === 'custom_wardrobe') {
      const isCarbon = outfit.shoes === 'carbon_orange';
      const isSprint = outfit.shoes === 'sprint_gold';
      const isCustom = outfit.shoes === 'custom_wardrobe';
      const customColor = outfit.customShoe?.color || outfit.colors?.shoes || '#06b6d4';
      const shoePrimary = isCustom ? customColor : isCarbon ? '#f97316' : isSprint ? '#eab308' : '#10b981';
      const shoeAccent = isCustom ? '#fde047' : isCarbon ? '#fde047' : isSprint ? '#fef08a' : '#38bdf8';

      // 3D Sculpted Upper
      ctx.fillStyle = shoePrimary;
      ctx.beginPath();
      ctx.moveTo(-16, 12);
      ctx.quadraticCurveTo(0, 6, 18, 15);
      ctx.quadraticCurveTo(22, 24, 16, 28);
      ctx.lineTo(-16, 28);
      ctx.quadraticCurveTo(-20, 20, -16, 12);
      ctx.closePath();
      ctx.fill();

      // Laces & Tongue Detail
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, 13);
      ctx.lineTo(4, 13);
      ctx.moveTo(-2, 16);
      ctx.lineTo(6, 16);
      ctx.stroke();

      // Vector Speed Stripe
      ctx.strokeStyle = shoeAccent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, 21);
      ctx.quadraticCurveTo(2, 17, 14, 22);
      ctx.stroke();

      // Thick 2.5D ZoomX / Gel Midsole with Carbon Plate Line
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-19, 25, 39, 9, 5);
      ctx.fill();

      ctx.strokeStyle = isCarbon ? '#06b6d4' : '#059669';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 29.5);
      ctx.lineTo(17, 29.5);
      ctx.stroke();
    } else {
      // Natural Plush Paw with Cute Pink Paw Pads
      ctx.fillStyle = limbDark;
      ctx.beginPath();
      ctx.ellipse(0, 22, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(0, 24, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.arc(-6, 18, 2.5, 0, Math.PI * 2);
      ctx.arc(0, 16.5, 2.5, 0, Math.PI * 2);
      ctx.arc(6, 18, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw Left & Right Legs
  drawFootAndShoe(-26, 48, legLiftL, legSwing, true);
  drawFootAndShoe(26, 48, legLiftR, -legSwing, false);

  // --- 4. VOLUMETRIC 2.5D TORSO & CLOTHING ---
  ctx.save();
  ctx.scale(1 - breath * 0.4, 1 + breath);

  // Main 3D Torso Sphere/Egg with Specular + Shadow
  const bodyGrad = ctx.createRadialGradient(-16, -6, 8, 0, 16, 68);
  bodyGrad.addColorStop(0, furHighlight);
  bodyGrad.addColorStop(0.55, furMid);
  bodyGrad.addColorStop(1, furShadow);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 15, 56, 52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark Panda Shoulder Bolero Band (Classic / Gold / Cyber)
  ctx.fillStyle = limbDark;
  ctx.beginPath();
  ctx.ellipse(0, -10, 48, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft Cream/White Plush Belly with Fur Tufts
  const bellyGrad = ctx.createRadialGradient(-8, 12, 4, 0, 22, 42);
  bellyGrad.addColorStop(0, isCyber ? '#1e293b' : '#ffffff');
  bellyGrad.addColorStop(1, isCyber ? '#0f172a' : '#e2e8f0');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 22, 41, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Cute Belly Button / Fur Swirl
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 34, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // --- WARDROBE: BODY LAYER (Toca Boca Tangible Style) ---
  if (outfit.body === 'koszulka_2027') {
    // 2.5D Athletic Singlet Tank Top
    const jerseyGrad = ctx.createLinearGradient(-40, -15, 40, 50);
    jerseyGrad.addColorStop(0, '#0ea5e9');
    jerseyGrad.addColorStop(0.5, '#0284c7');
    jerseyGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = jerseyGrad;

    ctx.beginPath();
    ctx.moveTo(-36, -16);
    ctx.quadraticCurveTo(0, -4, 36, -16);
    ctx.lineTo(44, 38);
    ctx.quadraticCurveTo(0, 54, -44, 38);
    ctx.closePath();
    ctx.fill();

    // Neon Trim on Collar & Sides
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-35, -15);
    ctx.quadraticCurveTo(0, -3, 35, -15);
    ctx.stroke();

    // Pinned Race Bib #2027 with 3D Paper Shadow & Safety Pins
    ctx.save();
    ctx.translate(0, 17);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-21, -11, 44, 26);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-22, -12, 44, 25, 3);
    ctx.fill();

    // Red Header Strip on Bib
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -12, 44, 5);

    // Gold Safety Pins in 4 corners
    ctx.fillStyle = '#f59e0b';
    [
      [-18, -9],
      [18, -9],
      [-18, 9],
      [18, 9],
    ].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2027', 0, 7);
    ctx.restore();
  } else if (outfit.body === 'wiatrowka') {
    // 2.5D Reflective Marathon Windbreaker Jacket
    const jacketGrad = ctx.createLinearGradient(-45, -18, 45, 50);
    jacketGrad.addColorStop(0, '#22c55e');
    jacketGrad.addColorStop(0.6, '#16a34a');
    jacketGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = jacketGrad;

    ctx.beginPath();
    ctx.ellipse(0, 16, 50, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3M Glowing Reflective Chest Chevrons
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-42, 10);
    ctx.lineTo(0, 20);
    ctx.lineTo(42, 10);
    ctx.stroke();

    // Center Zipper
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 54);
    ctx.stroke();
  } else if (outfit.body === 'bluza_aero') {
    const aeroColor = outfit.colors?.body || '#4338ca';
    ctx.fillStyle = aeroColor;
    ctx.beginPath();
    ctx.ellipse(0, 16, 48, 39, 0, 0, Math.PI * 2);
    ctx.fill();
    // High aerodynamic collar
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.roundRect(-18, -19, 36, 10, 4);
    ctx.fill();
    // Aero mesh seam accents
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, -6);
    ctx.quadraticCurveTo(-15, 20, -28, 42);
    ctx.moveTo(32, -6);
    ctx.quadraticCurveTo(15, 20, 28, 42);
    ctx.stroke();
  } else if (outfit.body === 'lider_z2') {
    const leaderColor = outfit.colors?.body || '#eab308';
    ctx.fillStyle = leaderColor;
    ctx.beginPath();
    ctx.ellipse(0, 16, 49, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // White chest panel with "Z2 LEADER"
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-34, 4, 68, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#854d0e';
    ctx.font = '900 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ LIDER Z2 ★', 0, 16);
  } else if (outfit.body === 'medal') {
    // 2.5D Finisher Medal on Ribbon
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-22, -18);
    ctx.lineTo(0, 18);
    ctx.lineTo(22, -18);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, -18);
    ctx.lineTo(0, 18);
    ctx.lineTo(22, -18);
    ctx.stroke();

    // Swinging Gold Medal Disc
    const medalSwing = Math.sin(frame * 0.1) * 3;
    ctx.save();
    ctx.translate(medalSwing, 24);
    const medalGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
    medalGrad.addColorStop(0, '#fef08a');
    medalGrad.addColorStop(0.6, '#f59e0b');
    medalGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = medalGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PB #1', 0, 3);
    ctx.restore();
  }

  // --- WARDROBE: LEGS LAYER (Hips, Shorts & Tights) ---
  if (outfit.legs && outfit.legs !== 'none') {
    ctx.save();
    const legColor = outfit.colors?.legs || (
      outfit.legs === 'spodenki_split' ? '#0f172a' :
      outfit.legs === 'legginsy' ? '#18181b' :
      outfit.legs === 'trail_shorts' ? '#365314' :
      '#334155'
    );
    ctx.fillStyle = legColor;
    ctx.beginPath();
    ctx.moveTo(-36, 26);
    ctx.quadraticCurveTo(0, 32, 36, 26);
    ctx.lineTo(38, 48);
    ctx.quadraticCurveTo(20, 52, 6, 44);
    ctx.lineTo(0, 36);
    ctx.lineTo(-6, 44);
    ctx.quadraticCurveTo(-20, 52, -38, 48);
    ctx.closePath();
    ctx.fill();

    // Elastic waistband
    ctx.strokeStyle = outfit.legs === 'spodenki_split' ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-35, 27);
    ctx.quadraticCurveTo(0, 33, 35, 27);
    ctx.stroke();

    if (outfit.legs === 'spodenki_split') {
      // Split side cutouts
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-36, 36);
      ctx.lineTo(-30, 48);
      ctx.moveTo(36, 36);
      ctx.lineTo(30, 48);
      ctx.stroke();
    } else if (outfit.legs === 'trail_shorts') {
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(-26, 36, 12, 8);
      ctx.fillRect(14, 36, 12, 8);
    } else if (outfit.legs === 'dresy') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 32);
      ctx.lineTo(-4, 40);
      ctx.moveTo(3, 32);
      ctx.lineTo(4, 40);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- WARDROBE: ACCESSORY LAYER ON TORSO (Hydration Vest / Gel Belt) ---
  if (outfit.accessory === 'kamizelka') {
    ctx.save();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(-34, -14, 18, 48, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(16, -14, 18, 48, 4);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(18, 4);
    ctx.moveTo(-18, 20);
    ctx.lineTo(18, 20);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-3, 2, 6, 4);
    ctx.fillRect(-3, 18, 6, 4);
    [-25, 25].forEach(fx => {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(fx - 5, 8, 10, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(fx - 2, 5, 4, 3);
    });
    ctx.restore();
  } else if (outfit.accessory === 'pas_biodrowy') {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-38, 20, 76, 11, 4);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    [-16, 16].forEach((gx, idx) => {
      ctx.fillStyle = idx === 0 ? '#ea580c' : '#eab308';
      ctx.beginPath();
      ctx.roundRect(gx - 6, 17, 12, 16, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - 4, 15, 8, 3);
    });
    ctx.restore();
  }

  ctx.restore(); // end torso

  // --- 5. ARTICULATED 2.5D ARMS & PAWS ---
  // Left Arm
  ctx.save();
  const leftArmAngle = isProud || isBiceps
    ? -2.2 + Math.sin(frame * 0.2) * 0.25
    : isEating
    ? -0.85
    : -0.28 + armSwing * 0.025;
  ctx.translate(-46, 0 + (isRunning ? armSwing * 0.45 : 0));
  ctx.rotate(leftArmAngle);
  const armGradL = ctx.createRadialGradient(-3, 6, 2, 0, 14, 24);
  armGradL.addColorStop(0, limbHighlight);
  armGradL.addColorStop(1, limbDark);
  ctx.fillStyle = armGradL;
  ctx.beginPath();
  ctx.roundRect(-12, -6, 24, 38, 12);
  ctx.fill();
  // Cute Pink Paw Pad on Left Hand
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.arc(0, 23, 5, 0, Math.PI * 2);
  ctx.fill();

  // Accessory on left arm: GPS Watch or Captain Band
  if (outfit.accessory === 'zegarek_gps') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, 8, 24, 7);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-7, 7, 14, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('4:15', 0, 14);
  } else if (outfit.accessory === 'opaska_kapitana') {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-12, 1, 24, 9);
    ctx.fillStyle = '#000000';
    ctx.font = '900 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C', 0, 8);
  }

  ctx.restore();

  // Right Arm
  ctx.save();
  const rightArmAngle = isProud || isBiceps
    ? 2.2 - Math.sin(frame * 0.2) * 0.25
    : isEating
    ? 0.85
    : 0.28 - armSwing * 0.025;
  ctx.translate(46, 0 - (isRunning ? armSwing * 0.45 : 0));
  ctx.rotate(rightArmAngle);
  const armGradR = ctx.createRadialGradient(-3, 6, 2, 0, 14, 24);
  armGradR.addColorStop(0, limbHighlight);
  armGradR.addColorStop(1, limbDark);
  ctx.fillStyle = armGradR;
  ctx.beginPath();
  ctx.roundRect(-12, -6, 24, 38, 12);
  ctx.fill();
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.arc(0, 23, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Held 3D Bamboo Shoot when eating
  if (isEating) {
    ctx.save();
    ctx.translate(0, 8 + Math.sin(frame * 0.35) * 3);
    ctx.rotate(0.25);
    // Bamboo segments
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.roundRect(-7, -22, 14, 44, 5);
    ctx.fill();
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.moveTo(-7, 8);
    ctx.lineTo(7, 8);
    ctx.stroke();
    // Leaves
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(-13, -16, 10, 4.5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(13, -10, 10, 4.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- 6. REDESIGNED 2.5D HEAD GROUP (Toca Boca / Pixar Expressive Style) ---
  ctx.save();
  const headBob = Math.sin(frame * 0.06 - 0.4) * 2.2;
  ctx.translate(0, -48 + headBob);
  ctx.rotate(Math.sin(frame * 0.04) * 0.03 + lookX * 0.002);

  // EARS with 3D Inner Pink Cushion & Independent Bounce
  const earTwitchL = Math.sin(frame * 0.09) * 0.09;
  const earTwitchR = -Math.sin(frame * 0.09 + 0.5) * 0.09;

  // Left Ear
  ctx.save();
  ctx.translate(-42, -33);
  ctx.rotate(-0.25 + earTwitchL);
  ctx.fillStyle = limbDark;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isRed ? '#fed7aa' : '#fda4af';
  ctx.beginPath();
  ctx.arc(2, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right Ear
  ctx.save();
  ctx.translate(42, -33);
  ctx.rotate(0.25 + earTwitchR);
  ctx.fillStyle = limbDark;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isRed ? '#fed7aa' : '#fda4af';
  ctx.beginPath();
  ctx.arc(-2, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head Base with Fluffy Cheek Silhouettes (Pear/Bean 2.5D Shape)
  const headGrad = ctx.createRadialGradient(-14, -18, 6, 0, 2, 62);
  headGrad.addColorStop(0, furHighlight);
  headGrad.addColorStop(0.65, furMid);
  headGrad.addColorStop(1, furShadow);

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -2, 53, 44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Extra Fluffy Cheek Pouches (Left & Right)
  ctx.beginPath();
  ctx.ellipse(-40, 10, 19, 15, 0.15, 0, Math.PI * 2);
  ctx.ellipse(40, 10, 19, 15, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Cute Forehead Fur Tuft
  ctx.beginPath();
  ctx.moveTo(-8, -44);
  ctx.quadraticCurveTo(-2, -53, 2, -45);
  ctx.quadraticCurveTo(8, -51, 10, -43);
  ctx.fill();

  // Red Panda White Facial Mask Markings
  if (isRed) {
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.ellipse(-22, -2, 17, 19, -0.2, 0, Math.PI * 2);
    ctx.ellipse(22, -2, 17, 19, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iconic Panda Dark Eye Patches
  ctx.fillStyle = limbDark;
  ctx.beginPath();
  ctx.ellipse(-22, -2, 15, 18, -0.24, 0, Math.PI * 2);
  ctx.ellipse(22, -2, 15, 18, 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Warm Subsurface Rosy Cheeks
  const cheekGradL = ctx.createRadialGradient(-35, 13, 1, -35, 13, 12);
  cheekGradL.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
  cheekGradL.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = cheekGradL;
  ctx.beginPath();
  ctx.arc(-35, 13, 12, 0, Math.PI * 2);
  ctx.fill();

  const cheekGradR = ctx.createRadialGradient(35, 13, 1, 35, 13, 12);
  cheekGradR.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
  cheekGradR.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = cheekGradR;
  ctx.beginPath();
  ctx.arc(35, 13, 12, 0, Math.PI * 2);
  ctx.fill();

  // EXPRESSIVE 2.5D EYES WITH IRIS & SPECULAR GLINTS
  const isBlinking = frame % 210 < 10 || isRecovery || isSleeping;
  const eyeOffsetX = Math.max(-4, Math.min(4, lookX * 0.04));
  const eyeOffsetY = Math.max(-3, Math.min(3, lookY * 0.04));

  if (!isBlinking) {
    [-21, 21].forEach((ex) => {
      // White sclera rim
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + eyeOffsetX * 0.5, -3 + eyeOffsetY * 0.5, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Warm Amber/Emerald Iris Ring
      ctx.fillStyle = isCyber ? '#06b6d4' : '#334155';
      ctx.beginPath();
      ctx.arc(ex + eyeOffsetX, -3 + eyeOffsetY, 6.8, 0, Math.PI * 2);
      ctx.fill();

      // Deep Pupil
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(ex + eyeOffsetX, -3 + eyeOffsetY, 4.8, 0, Math.PI * 2);
      ctx.fill();

      // Big Kawaii Specular Highlight + Secondary Bottom Glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 2.4 + eyeOffsetX, -5.5 + eyeOffsetY, 2.7, 0, Math.PI * 2);
      ctx.arc(ex + 2.2 + eyeOffsetX, -0.5 + eyeOffsetY, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Peaceful / Happy Closed Eyelids
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-21, -2, 7, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(21, -2, 7, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // 3D Protruding Muzzle / Snout
  const snoutGrad = ctx.createRadialGradient(0, 7, 2, 0, 12, 18);
  snoutGrad.addColorStop(0, '#ffffff');
  snoutGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = snoutGrad;
  ctx.beginPath();
  ctx.ellipse(0, 12, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Glossy Button Nose
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.ellipse(0, 7.5, 6.8, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-2, 6, 2.2, 1.1, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Animated Mouth & Chewing
  const chewOffset = isEating ? Math.sin(frame * 0.45) * 2.5 : 0;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  if (isWorried) {
    ctx.beginPath();
    ctx.arc(0, 20, 6.5, Math.PI + 0.4, -0.4);
    ctx.stroke();
  } else if (isProud || isEating) {
    ctx.fillStyle = '#9f1239';
    ctx.beginPath();
    ctx.arc(0, 12 + chewOffset * 0.3, 7.5, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute Pink Tongue inside Mouth
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(0, 16 + chewOffset * 0.3, 4.5, Math.PI, 0);
    ctx.fill();
  } else if (isSleeping) {
    // Tiny 'o' sleeping mouth
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(0, 15, 3 + Math.sin(frame * 0.08) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Classic Cat/Panda 'w' Smile
    ctx.beginPath();
    ctx.moveTo(-7, 13);
    ctx.quadraticCurveTo(-3.5, 17.5, 0, 13.5);
    ctx.quadraticCurveTo(3.5, 17.5, 7, 13);
    ctx.stroke();
  }

  // --- WARDROBE: GLASSES LAYER ---
  if (outfit.eyes === 'oakley') {
    ctx.save();
    const oakleyGrad = ctx.createLinearGradient(-38, -10, 38, 10);
    oakleyGrad.addColorStop(0, '#06b6d4');
    oakleyGrad.addColorStop(0.5, '#a855f7');
    oakleyGrad.addColorStop(1, '#f43f5e');

    ctx.beginPath();
    ctx.moveTo(-38, -10);
    ctx.quadraticCurveTo(0, -18, 38, -10);
    ctx.lineTo(34, 8);
    ctx.quadraticCurveTo(18, 14, 5, 4);
    ctx.quadraticCurveTo(0, 1, -5, 4);
    ctx.quadraticCurveTo(-18, 14, -34, 8);
    ctx.closePath();
    ctx.fillStyle = oakleyGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Specular Lens Sheen
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, -7);
    ctx.lineTo(-14, 5);
    ctx.moveTo(12, -7);
    ctx.lineTo(24, 5);
    ctx.stroke();
    ctx.restore();
  } else if (outfit.eyes === 'thug_life') {
    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-38, -10, 76, 6);
    ctx.fillRect(-34, -4, 28, 12);
    ctx.fillRect(6, -4, 28, 12);
    // White Pixel Glints
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-30, -2, 4, 4);
    ctx.fillRect(-24, 2, 4, 4);
    ctx.fillRect(10, -2, 4, 4);
    ctx.fillRect(16, 2, 4, 4);
    ctx.restore();
  } else if (outfit.eyes === 'trail_goggles') {
    ctx.save();
    // Goggle head strap
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -2, 53, Math.PI + 0.35, -0.35);
    ctx.stroke();
    // Polarized orange/gold lens shield
    const lensGrad = ctx.createLinearGradient(-36, -8, 36, 10);
    lensGrad.addColorStop(0, '#f97316');
    lensGrad.addColorStop(0.5, '#eab308');
    lensGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.roundRect(-36, -8, 72, 18, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Specular Glint
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-25, -5);
    ctx.lineTo(-12, 7);
    ctx.stroke();
    ctx.restore();
  }

  // --- WARDROBE: HEADWEAR LAYER ---
  if (outfit.head === 'opaska') {
    const bandGrad = ctx.createLinearGradient(-46, -26, 46, -26);
    bandGrad.addColorStop(0, '#dc2626');
    bandGrad.addColorStop(0.5, '#ef4444');
    bandGrad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.roundRect(-46, -30, 92, 13, 6);
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AERO PRO', 0, -21);
  } else if (outfit.head === 'czapka') {
    // 2.5D Running Aero Cap
    const capGrad = ctx.createLinearGradient(-40, -48, 40, -20);
    capGrad.addColorStop(0, '#38bdf8');
    capGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.arc(0, -24, 42, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Visor brim
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.ellipse(16, -24, 34, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit.head === 'czapka_zimowa') {
    // Winter Beanie with pompom
    const hatColor = outfit.colors?.head || '#dc2626';
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.arc(0, -28, 44, Math.PI, 0);
    ctx.fill();
    // Ribbed fold
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.roundRect(-46, -32, 92, 14, 5);
    ctx.fill();
    // Snowflake pattern
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❄ ❄ ❄', 0, -22);
    // Fluffy Pom-Pom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -68, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit.head === 'korona') {
    const crownGrad = ctx.createLinearGradient(-28, -56, 28, -28);
    crownGrad.addColorStop(0, '#fef08a');
    crownGrad.addColorStop(0.5, '#f59e0b');
    crownGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(-26, -28);
    ctx.lineTo(-30, -52);
    ctx.lineTo(-14, -39);
    ctx.lineTo(0, -58);
    ctx.lineTo(14, -39);
    ctx.lineTo(30, -52);
    ctx.lineTo(26, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Gems on Crown
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -37, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(-14, -35, 2.5, 0, Math.PI * 2);
    ctx.arc(14, -35, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit.head === 'sluchawki') {
    // 2.5D Wireless Over-Ear Running Headphones
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -4, 54, Math.PI + 0.25, -0.25);
    ctx.stroke();
    // Ear Cups
    [-52, 52].forEach((hx) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(hx, 0, 9, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  }

  // Floating Zzz if sleeping
  if (isSleeping) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 14px sans-serif';
    const zOffset = (frame % 90) * 0.4;
    ctx.globalAlpha = Math.max(0, 1 - (frame % 90) / 90);
    ctx.fillText('Zzz...', 34, -40 - zOffset);
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // end head group
  ctx.restore(); // end panda
};

/**
 * Renders 3 Parallax Layers (Sky, Mid Trees/City, Path)
 */
export const drawParallaxBackground = (
  ctx: CanvasRenderingContext2D,
  scrollX: number,
  w: number = ctx.canvas.width,
  h: number = ctx.canvas.height,
  sceneType: string = 'park'
) => {
  ctx.save();

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (sceneType === 'wroclaw') {
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(1, '#1e1b4b');
  } else if (sceneType === 'stadion') {
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.6, '#1e293b');
    skyGrad.addColorStop(1, '#7f1d1d');
  } else {
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(0.65, '#bae6fd');
    skyGrad.addColorStop(1, '#86efac');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun / Moon
  ctx.fillStyle = sceneType === 'wroclaw' ? '#fef08a' : '#fde047';
  ctx.beginPath();
  ctx.arc(w - 60, 48, 26, 0, Math.PI * 2);
  ctx.fill();

  // Midground Rolling Hills & Trees
  ctx.fillStyle = sceneType === 'wroclaw' ? '#312e81' : '#15803d';
  const treeStep = 150;
  const treeOffset = (scrollX * 0.45) % treeStep;
  for (let x = -treeStep; x < w + treeStep; x += treeStep) {
    const px = x - treeOffset;
    ctx.beginPath();
    ctx.arc(px, h - 75, 44, 0, Math.PI * 2);
    ctx.arc(px + 28, h - 90, 36, 0, Math.PI * 2);
    ctx.arc(px - 28, h - 85, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Path
  ctx.fillStyle = sceneType === 'stadion' ? '#dc2626' : '#334155';
  ctx.fillRect(0, h - 68, w, 68);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);
  const stripeOffset = (scrollX * 1.0) % 35;
  ctx.beginPath();
  ctx.moveTo(-stripeOffset, h - 34);
  ctx.lineTo(w + 35, h - 34);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
};

/**
 * Renders a True 2.5D Perspective Running Track / Park Road receding to the horizon
 */
export const drawPerspective25DTrack = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  w: number,
  h: number,
  theme: 'park' | 'stadion' | 'kitchen' = 'park'
) => {
  ctx.save();
  const horizonY = Math.round(h * 0.28);

  // 1. Sky & Distant Horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  if (theme === 'stadion') {
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(1, '#1e1b4b');
  } else {
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY + 4);

  // Sun / Stadium Floodlights
  if (theme === 'stadion') {
    [w * 0.2, w * 0.8].forEach((lx) => {
      const glow = ctx.createRadialGradient(lx, 35, 2, lx, 35, 55);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
      glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, 35, 55, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    const sunGrad = ctx.createRadialGradient(w * 0.8, 45, 4, w * 0.8, 45, 45);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#fde047');
    sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.8, 45, 45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant Mountains / Park Silhouette at Horizon
  ctx.fillStyle = theme === 'stadion' ? '#1e293b' : '#15803d';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.quadraticCurveTo(w * 0.25, horizonY - 28, w * 0.5, horizonY - 8);
  ctx.quadraticCurveTo(w * 0.75, horizonY - 34, w, horizonY);
  ctx.closePath();
  ctx.fill();

  // 2. Ground Meadow / Stadium Surround
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  if (theme === 'stadion') {
    groundGrad.addColorStop(0, '#064e3b');
    groundGrad.addColorStop(1, '#022c22');
  } else {
    groundGrad.addColorStop(0, '#4ade80');
    groundGrad.addColorStop(0.5, '#22c55e');
    groundGrad.addColorStop(1, '#15803d');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // 3. 3D Perspective Trapezoid Road / Tartan Track (3 Lanes)
  const topWidth = w * 0.24;
  const bottomWidth = w * 0.94;
  const centerX = w * 0.5;

  const trackGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  if (theme === 'stadion') {
    trackGrad.addColorStop(0, '#991b1b');
    trackGrad.addColorStop(0.5, '#dc2626');
    trackGrad.addColorStop(1, '#b91c1c');
  } else {
    trackGrad.addColorStop(0, '#475569');
    trackGrad.addColorStop(0.5, '#334155');
    trackGrad.addColorStop(1, '#1e293b');
  }

  ctx.fillStyle = trackGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - topWidth / 2, horizonY);
  ctx.lineTo(centerX + topWidth / 2, horizonY);
  ctx.lineTo(centerX + bottomWidth / 2, h);
  ctx.lineTo(centerX - bottomWidth / 2, h);
  ctx.closePath();
  ctx.fill();

  // Perspective Kerb Edges
  ctx.strokeStyle = theme === 'stadion' ? '#ffffff' : '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX - topWidth / 2, horizonY);
  ctx.lineTo(centerX - bottomWidth / 2, h);
  ctx.moveTo(centerX + topWidth / 2, horizonY);
  ctx.lineTo(centerX + bottomWidth / 2, h);
  ctx.stroke();

  // Animated Perspective Depth Ties & 3-Lane Dividers
  const numRows = 10;
  const speedOffset = (frame * 0.035) % 1;
  for (let i = 0; i < numRows; i++) {
    const t = (i + speedOffset) / numRows;
    const z = t * t; // Exponential perspective depth!
    const rowY = horizonY + z * (h - horizonY);
    const rowW = topWidth + z * (bottomWidth - topWidth);

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + z * 0.25})`;
    ctx.lineWidth = 1 + z * 2;
    ctx.beginPath();
    ctx.moveTo(centerX - rowW / 2, rowY);
    ctx.lineTo(centerX + rowW / 2, rowY);
    ctx.stroke();

    // Roadside 2.5D Trees scaling with perspective Z
    if (theme === 'park' && i % 2 === 0) {
      const treeScale = 0.2 + z * 0.95;
      const leftTreeX = centerX - rowW / 2 - 28 * treeScale;
      const rightTreeX = centerX + rowW / 2 + 28 * treeScale;

      [leftTreeX, rightTreeX].forEach((tx) => {
        ctx.save();
        ctx.translate(tx, rowY);
        ctx.scale(treeScale, treeScale);
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-5, -24, 10, 24);
        // 3D Crown Spheres
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, -38, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(-5, -42, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  // 2 Inner Lane Divider Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([14, 12]);
  [-1 / 6, 1 / 6].forEach((laneFrac) => {
    ctx.beginPath();
    ctx.moveTo(centerX + topWidth * laneFrac, horizonY);
    ctx.lineTo(centerX + bottomWidth * laneFrac, h);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  ctx.restore();
};

/**
 * Helper to project (lane: 0..2, z: 0..1) into 2.5D screen coordinates (x, y, scale)
 */
export const project25DPoint = (
  laneFloat: number, // 0 = left, 1 = center, 2 = right
  z: number, // 0 = horizon, 1 = bottom
  w: number,
  h: number
) => {
  const horizonY = h * 0.28;
  const topWidth = w * 0.24;
  const bottomWidth = w * 0.94;
  const centerX = w * 0.5;

  const rowY = horizonY + z * (h - horizonY);
  const rowW = topWidth + z * (bottomWidth - topWidth);
  const normalizedLane = (laneFloat - 1) / 3; // -1/3, 0, +1/3
  const screenX = centerX + rowW * normalizedLane;
  const scale = 0.28 + z * 0.82;

  return { x: screenX, y: rowY, scale };
};

/**
 * Draws 2.5D Obstacles with perspective scale & ground shadow
 */
export const drawVectorObstacle = (
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  scale: number = 1
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ground Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'itbs' || type === 'hurdle') {
    // 2.5D Track Hurdle with Side Posts & Striped Bar
    ctx.fillStyle = '#334155';
    ctx.fillRect(-26, -42, 5, 44);
    ctx.fillRect(21, -42, 5, 44);

    // Top Striped Bar
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-28, -44, 56, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -44, 10, 14);
    ctx.fillRect(8, -44, 10, 14);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PŁOTEK ITBS', 0, -20);
  } else if (type === 'smog') {
    // Volumetric 2.5D Toxic Smog Cloud
    const smogGrad = ctx.createRadialGradient(0, -24, 4, 0, -24, 30);
    smogGrad.addColorStop(0, '#94a3b8');
    smogGrad.addColorStop(1, '#334155');
    ctx.fillStyle = smogGrad;
    ctx.beginPath();
    ctx.arc(-14, -22, 18, 0, Math.PI * 2);
    ctx.arc(14, -22, 18, 0, Math.PI * 2);
    ctx.arc(0, -34, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMOG PM2.5', 0, -22);
  } else if (type === 'wall') {
    // 2.5D Marathon 32KM Brick Wall
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(-26, -52, 52, 52, 5);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-26, -52, 52, 52);
    ctx.beginPath();
    ctx.moveTo(-26, -34);
    ctx.lineTo(26, -34);
    ctx.moveTo(-26, -17);
    ctx.lineTo(26, -17);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ŚCIANA 32KM', 0, -23);
  }

  ctx.restore();
};

/**
 * Draws 2.5D Collectibles with glowing aura & perspective scale
 */
export const drawVectorCollectible = (
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  animFrame: number = 0,
  scale: number = 1
) => {
  ctx.save();
  ctx.translate(x, y + Math.sin(animFrame * 0.12) * 4);
  ctx.scale(scale, scale);

  // Ground Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'bamboo') {
    // 2.5D Glowing Bamboo Shoot
    const glow = ctx.createRadialGradient(0, -10, 2, 0, -10, 24);
    glow.addColorStop(0, 'rgba(132, 204, 22, 0.45)');
    glow.addColorStop(1, 'rgba(132, 204, 22, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -10, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.roundRect(-7, -26, 14, 32, 5);
    ctx.fill();
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(-12, -18, 10, 4.5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(12, -12, 10, 4.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'gel') {
    // 2.5D Hydro-Gel Sachet
    const glow = ctx.createRadialGradient(0, -8, 2, 0, -8, 24);
    glow.addColorStop(0, 'rgba(6, 182, 212, 0.55)');
    glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -8, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(-12, -24, 24, 30, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.fillRect(-5, -29, 10, 5);
    ctx.font = '900 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HYDRO', 0, -9);
    ctx.fillText('60g', 0, 1);
  } else if (type === 'rice') {
    // 2.5D Porcelain Bowl of Fluffy White Rice
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -12, 14, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(0, -12, 16, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (type === 'kebab' || type === 'junk') {
    // Heavy Greasy Burger / Rock with Red Danger Ring
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, -14, 15, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-15, -14, 30, 6);
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CIĘŻKIE!', 0, 4);
  }

  ctx.restore();
};
