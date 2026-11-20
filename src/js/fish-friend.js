/**
 * FISH FRIEND INTERACTIVE TANK SIMULATION
 * Inspired by "I Built an AI Aquarium with ESP32 🐟" and "Fish food for my fish friend"
 *
 * Features:
 * - Fluid Craig Reynolds Boids behavior: separation, wandering, soft border avoidance
 * - Realistic water drag & food sinking physics with interactive surface ripples
 * - Smooth lerped turning with angular velocity limits for organic swimming curves
 * - Animated aquatic caustics, swaying multi-segment aquatic plants & rising gravel bubbles
 * - 5 Unique Creature Species with distinct physics, visuals, and animations:
 *   1. Clownfish (Nemo): energetic, vibrant stripes, excited darting
 *   2. Japanese Koi (Kohaku): majestic, large torpedo body, scarlet spots, graceful turns
 *   3. Pink Axolotl (Lottie): bottom dweller, feathery waving gills, smiling face, paddling feet
 *   4. Pufferfish (Puffy): cautious hover, fluttering fins, inflates with spikes when excited
 *   5. Bioluminescent Jellyfish: rhythmic bell pulsing, glowing mantle, flowing tendrils
 * - Multi-fish support (1 to 3 companions swimming together)
 * - Complete backward-compatible Public API
 */

// ============================================================================
// 1. MATH & VECTOR UTILITIES
// ============================================================================
const MathUtils = {
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  rand(min, max) {
    return min + Math.random() * (max - min);
  },
  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },
  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  },
  angleDiff(from, to) {
    let diff = (to - from) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  },
  stepAngle(current, target, maxStep) {
    const diff = MathUtils.angleDiff(current, target);
    if (Math.abs(diff) <= maxStep) return target;
    return current + Math.sign(diff) * maxStep;
  }
};

// ============================================================================
// 2. SPECIES CONFIGURATIONS & BEHAVIORS
// ============================================================================
const SPECIES_CONFIG = {
  clownfish: {
    name: 'Nemo the Clownfish',
    size: 42,
    baseSpeed: 1.8,
    maxSpeed: 3.2,
    dashSpeed: 3.8,
    turnRate: 0.055, // ~3.1 deg/frame
    preferredDepth: 0.5, // middle
    depthWeight: 0.002,
    foodSenseRadius: 160,
    flutterFreq: 0.22,
    colors: {
      body: '#ff6b2b',
      accent: '#f97316',
      belly: '#ff8a4c',
      stripe: '#ffffff',
      stripeBorder: '#1e293b',
      finRim: '#0f172a'
    }
  },
  koi: {
    name: 'Kohaku Japanese Koi',
    size: 52,
    baseSpeed: 1.2,
    maxSpeed: 2.3,
    dashSpeed: 2.8,
    turnRate: 0.035, // ~2.0 deg/frame graceful gliding
    preferredDepth: 0.55,
    depthWeight: 0.003,
    foodSenseRadius: 180,
    flutterFreq: 0.12,
    colors: {
      body: '#fdfbf7',
      belly: '#f1f5f9',
      pattern1: '#e11d48', // Scarlet Kohaku
      pattern2: '#f59e0b', // Gold Hi
      finTrans: 'rgba(255, 255, 255, 0.7)'
    }
  },
  axolotl: {
    name: 'Lottie the Pink Axolotl',
    size: 44,
    baseSpeed: 1.0,
    maxSpeed: 2.2,
    dashSpeed: 2.7,
    turnRate: 0.045,
    preferredDepth: 0.88, // Bottom dweller near sand bed
    depthWeight: 0.015,
    foodSenseRadius: 140,
    flutterFreq: 0.15,
    colors: {
      body: '#fbcfe8',
      belly: '#fff1f2',
      gills: '#f43f5e',
      gillFrills: '#fb7185',
      eye: '#0f172a',
      blush: 'rgba(244, 63, 94, 0.45)'
    }
  },
  puffer: {
    name: 'Puffy Pufferfish',
    size: 38,
    baseSpeed: 1.1,
    maxSpeed: 2.4,
    dashSpeed: 2.9,
    turnRate: 0.05,
    preferredDepth: 0.48,
    depthWeight: 0.002,
    foodSenseRadius: 150,
    flutterFreq: 0.35, // Rapid pectoral flutter
    colors: {
      body: '#a3e635',
      back: '#65a30d',
      belly: '#fef08a',
      spots: '#4d7c0f',
      beak: '#78350f'
    }
  },
  jellyfish: {
    name: 'Aurelia Bioluminescent Jelly',
    size: 40,
    baseSpeed: 0.9,
    maxSpeed: 2.2,
    dashSpeed: 2.4,
    turnRate: 0.038,
    preferredDepth: 0.4,
    depthWeight: 0.001,
    foodSenseRadius: 170,
    flutterFreq: 0.08,
    colors: {
      bellOuter: 'rgba(192, 132, 252, 0.7)',
      bellInner: 'rgba(236, 72, 153, 0.4)',
      glow: 'rgba(168, 85, 247, 0.35)',
      rim: '#e879f9',
      tendril: 'rgba(244, 114, 182, 0.65)'
    }
  }
};

// ============================================================================
// 3. CREATURE ACTOR CLASS
// ============================================================================
class AquaticCreature {
  constructor(speciesType = 'clownfish', x = 200, y = 150, id = 0) {
    this.id = id;
    this.species = speciesType;
    this.cfg = SPECIES_CONFIG[speciesType] || SPECIES_CONFIG.clownfish;

    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.angle = Math.atan2(this.vy, this.vx);
    this.targetAngle = this.angle;
    this.speed = this.cfg.baseSpeed;
    this.targetSpeed = this.cfg.baseSpeed;
    this.size = this.cfg.size + (Math.random() - 0.5) * 6;

    // Animation phases
    this.tailPhase = Math.random() * Math.PI * 2;
    this.finPhase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.wanderPhase = Math.random() * 100;

    // Interactive states
    this.eyeLookX = 0;
    this.eyeLookY = 0;
    this.mouthOpen = 0; // 0 to 1
    this.isEating = false;
    this.eatingTimer = 0;
    this.excited = false;
    this.excitedTimer = 0;
    this.inflation = 0; // For pufferfish (0 to 1)

    // Jellyfish pulsation mechanics
    this.pulseThrust = 0;

    // Emotes queue
    this.emotes = [];
  }

  setSpecies(type) {
    if (!SPECIES_CONFIG[type]) return;
    this.species = type;
    this.cfg = SPECIES_CONFIG[type];
    this.size = this.cfg.size;
  }

  triggerEmote(text) {
    this.emotes.push({
      text,
      x: 0,
      y: -this.size * 0.75,
      alpha: 1.0,
      scale: 0.5,
      vy: -0.65,
      life: 90
    });
  }

  update(tank, foods, allCreatures) {
    const cfg = this.cfg;
    const width = tank.width;
    const height = tank.height;

    // 1. Timers & State Decays
    if (this.excitedTimer > 0) {
      this.excitedTimer--;
      if (this.excitedTimer <= 0) this.excited = false;
    }
    if (this.eatingTimer > 0) {
      this.eatingTimer--;
      if (this.eatingTimer <= 0) this.isEating = false;
    }

    // Puffer inflation animation
    if (this.species === 'puffer') {
      const targetInflation = this.excited ? 1.0 : 0.0;
      this.inflation = MathUtils.lerp(this.inflation, targetInflation, 0.08);
    } else {
      this.inflation = 0;
    }

    // 2. Food Seeking Behavior
    let closestFood = null;
    let minDist = cfg.foodSenseRadius;
    for (const food of foods) {
      const d = MathUtils.dist(this.x, this.y, food.x, food.y);
      if (d < minDist) {
        minDist = d;
        closestFood = food;
      }
    }

    // Desired steering angle and speed
    let desiredAngle = this.angle;
    let desiredSpeed = cfg.baseSpeed;

    if (closestFood) {
      // Steer smoothly towards food
      desiredAngle = Math.atan2(closestFood.y - this.y, closestFood.x - this.x);
      desiredSpeed = this.excited ? cfg.dashSpeed : cfg.maxSpeed;

      // Eye tracking towards food
      const eyeAngle = desiredAngle - this.angle;
      this.eyeLookX = Math.cos(eyeAngle) * 3;
      this.eyeLookY = Math.sin(eyeAngle) * 3;

      // Open mouth as creature approaches food
      if (minDist < this.size * 0.9) {
        this.mouthOpen = Math.min(1.0, this.mouthOpen + 0.25);
      } else {
        this.mouthOpen = Math.max(0.0, this.mouthOpen - 0.1);
      }

      // Munch / Eat food
      if (minDist < this.size * 0.45) {
        const idx = foods.indexOf(closestFood);
        if (idx !== -1) {
          foods.splice(idx, 1);
          this.isEating = true;
          this.eatingTimer = 40;
          this.excited = true;
          this.excitedTimer = 120;
          this.mouthOpen = 1.0;

          const nomPhrases = ['Nom!', '♥', 'Yum!', '✨', '😋'];
          this.triggerEmote(nomPhrases[Math.floor(Math.random() * nomPhrases.length)]);

          // Spurt tiny eating bubbles
          for (let i = 0; i < 4; i++) {
            tank.addBubble(
              this.x + Math.cos(this.angle) * (this.size * 0.5),
              this.y + Math.sin(this.angle) * (this.size * 0.5),
              MathUtils.rand(1.5, 3.2),
              MathUtils.rand(0.8, 1.6)
            );
          }
        }
      }
    } else {
      // Idle Swimming & Natural Craig Reynolds Boids Steering
      this.mouthOpen = Math.max(0.0, this.mouthOpen - 0.08);

      // Eye follows mouse if active and nearby
      if (tank.mouse.active) {
        const mouseDist = MathUtils.dist(this.x, this.y, tank.mouse.x, tank.mouse.y);
        if (mouseDist < 160) {
          const ma = Math.atan2(tank.mouse.y - this.y, tank.mouse.x - this.x) - this.angle;
          this.eyeLookX = Math.cos(ma) * 3.2;
          this.eyeLookY = Math.sin(ma) * 3.2;
        } else {
          this.eyeLookX *= 0.9;
          this.eyeLookY *= 0.9;
        }
      } else {
        this.eyeLookX *= 0.9;
        this.eyeLookY *= 0.9;
      }

      // Smooth wandering using sinusoidal noise
      this.wanderPhase += 0.018;
      const wanderJitter = Math.sin(this.wanderPhase * 1.7) * 0.35 + Math.cos(this.wanderPhase * 0.9) * 0.25;

      // Flocking / Boids: Separation & Alignment with other fish
      let sepX = 0;
      let sepY = 0;
      let alignAngle = 0;
      let neighbors = 0;

      for (const other of allCreatures) {
        if (other === this) continue;
        const d = MathUtils.dist(this.x, this.y, other.x, other.y);
        const minDistSep = (this.size + other.size) * 0.75;
        if (d < minDistSep && d > 0.1) {
          // Push away
          const force = (minDistSep - d) / minDistSep;
          sepX += ((this.x - other.x) / d) * force * 1.5;
          sepY += ((this.y - other.y) / d) * force * 1.5;
        } else if (d < 180) {
          alignAngle += other.angle;
          neighbors++;
        }
      }

      desiredAngle = this.angle + wanderJitter * 0.08;

      if (neighbors > 0) {
        const avgAlign = alignAngle / neighbors;
        desiredAngle = MathUtils.lerp(desiredAngle, avgAlign, 0.05);
      }

      if (sepX !== 0 || sepY !== 0) {
        const sepAngle = Math.atan2(sepY, sepX);
        desiredAngle = MathUtils.lerp(desiredAngle, sepAngle, 0.15);
      }

      // Preferred Depth Attraction (e.g. Axolotl stays near bottom sand)
      const targetY = height * cfg.preferredDepth;
      const depthBias = (targetY - this.y) * cfg.depthWeight;
      desiredAngle += MathUtils.clamp(depthBias, -0.06, 0.06);

      desiredSpeed = cfg.baseSpeed + Math.sin(this.wanderPhase * 2.5) * 0.25;
      if (this.excited) desiredSpeed *= 1.4;
    }

    // 3. Smooth Soft Border Avoidance (Curving away before hitting tank walls)
    const marginX = this.size * 1.3;
    const marginTop = this.size * 1.2 + 25;
    const marginBottom = this.size * 1.2 + 35; // substrate barrier

    let borderSteerX = 0;
    let borderSteerY = 0;

    if (this.x < marginX) {
      borderSteerX = (marginX - this.x) / marginX;
    } else if (this.x > width - marginX) {
      borderSteerX = -(this.x - (width - marginX)) / marginX;
    }

    if (this.y < marginTop) {
      borderSteerY = (marginTop - this.y) / marginTop;
    } else if (this.y > height - marginBottom) {
      borderSteerY = -(this.y - (height - marginBottom)) / marginBottom;
    }

    if (borderSteerX !== 0 || borderSteerY !== 0) {
      const avoidAngle = Math.atan2(borderSteerY, borderSteerX);
      const steerStrength = Math.min(1.0, Math.hypot(borderSteerX, borderSteerY) * 1.2);
      desiredAngle = MathUtils.lerp(desiredAngle, avoidAngle, steerStrength * 0.25);
    }

    // 4. Smooth Turning with Maximum Angular Step (Organic Swimming Arc)
    this.targetAngle = desiredAngle;
    this.angle = MathUtils.stepAngle(this.angle, this.targetAngle, cfg.turnRate);

    // 5. Species-specific locomotion
    if (this.species === 'jellyfish') {
      // Rhythmic bell contraction / propulsion
      this.pulsePhase += cfg.flutterFreq;
      const cycle = Math.sin(this.pulsePhase);
      if (cycle > 0.6 && this.pulseThrust <= 0.1) {
        // Bell contraction pulse
        this.pulseThrust = 1.0;
        tank.addBubble(this.x, this.y + this.size * 0.5, 1.8, 0.4);
      }
      this.pulseThrust *= 0.92;
      this.speed = MathUtils.lerp(this.speed, cfg.baseSpeed * (0.3 + this.pulseThrust * 1.8), 0.15);
    } else {
      this.speed = MathUtils.lerp(this.speed, desiredSpeed, 0.08);
    }

    // 6. Integrate Position
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    // Hard boundary containment clamp
    this.x = MathUtils.clamp(this.x, this.size * 0.6, width - this.size * 0.6);
    this.y = MathUtils.clamp(this.y, this.size * 0.6 + 15, height - this.size * 0.6 - 22);

    // 7. Update Animation Phases
    const swimEnergy = Math.max(0.4, this.speed / cfg.baseSpeed);
    this.tailPhase += cfg.flutterFreq * swimEnergy * 2.8;
    this.finPhase += cfg.flutterFreq * 2.2;

    // 8. Update Creature Emotes
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const em = this.emotes[i];
      em.y += em.vy;
      em.scale = Math.min(1.15, em.scale + 0.05);
      em.alpha -= 0.015;
      em.life--;
      if (em.alpha <= 0 || em.life <= 0) {
        this.emotes.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Subtle soft bottom shadow if swimming near substrate
    this.drawWaterShadow(ctx);

    // Orient creature (flip horizontally if facing left for natural profile rendering)
    const facingLeft = Math.cos(this.angle) < 0;
    ctx.scale(facingLeft ? -1 : 1, 1);
    const renderAngle = facingLeft ? MathUtils.normalizeAngle(Math.PI - this.angle) : this.angle;
    ctx.rotate(renderAngle);

    const s = this.size;
    const tailWiggle = Math.sin(this.tailPhase);

    // Render species-specific body
    switch (this.species) {
      case 'clownfish':
        this.drawClownfish(ctx, s, tailWiggle);
        break;
      case 'koi':
        this.drawKoi(ctx, s, tailWiggle);
        break;
      case 'axolotl':
        this.drawAxolotl(ctx, s, tailWiggle);
        break;
      case 'puffer':
        this.drawPuffer(ctx, s, tailWiggle);
        break;
      case 'jellyfish':
        this.drawJellyfish(ctx, s, tailWiggle);
        break;
      default:
        this.drawClownfish(ctx, s, tailWiggle);
        break;
    }

    ctx.restore();

    // Draw floating emotes in world space above creature
    this.drawEmotes(ctx);
  }

  drawWaterShadow(ctx) {
    // Subtle drop shadow cast downwards
    ctx.save();
    ctx.translate(0, this.size * 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 10, 25, 0.16)';
    ctx.fill();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SPECIES 1: CLOWNFISH (Nemo)
  // --------------------------------------------------------------------------
  drawClownfish(ctx, s, tailWiggle) {
    const tailOffset = tailWiggle * (s * 0.32);

    // 1. Caudal Fin (Tail) with elegant curves & black borders
    ctx.beginPath();
    ctx.moveTo(-s * 0.65, 0);
    ctx.quadraticCurveTo(-s * 1.05, tailOffset * 0.5, -s * 1.38, tailOffset - s * 0.32);
    ctx.quadraticCurveTo(-s * 1.1, tailOffset * 0.5, -s * 1.38, tailOffset + s * 0.32);
    ctx.closePath();
    ctx.fillStyle = '#ff6b2b';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Tail fin outer dark trim
    ctx.beginPath();
    ctx.arc(-s * 1.35, tailOffset, s * 0.28, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Dorsal Fin (Top)
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.35);
    ctx.quadraticCurveTo(s * 0.05, -s * 0.72, s * 0.25, -s * 0.38);
    ctx.fillStyle = '#ff7a3d';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Pelvic & Anal Fins (Bottom)
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, s * 0.35);
    ctx.quadraticCurveTo(-s * 0.05, s * 0.68, s * 0.15, s * 0.38);
    ctx.fillStyle = '#ff6b2b';
    ctx.fill();
    ctx.stroke();

    // 4. Chubby Chubby Orange Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.75, s * 0.46, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
    bodyGrad.addColorStop(0, '#ff7d3b');
    bodyGrad.addColorStop(0.6, '#ff6321');
    bodyGrad.addColorStop(1, '#e8500e');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 5. Curved White Stripes with Dark Outlines
    this.drawClownStripe(ctx, s * 0.28, 0, s * 0.15, s * 0.44); // Head stripe
    this.drawClownStripe(ctx, -s * 0.08, 0, s * 0.14, s * 0.46); // Middle stripe with bulge
    this.drawClownStripe(ctx, -s * 0.48, 0, s * 0.1, s * 0.32); // Tail base stripe

    // 6. Fluttering Pectoral Fin
    const finRot = Math.sin(this.finPhase) * 0.38;
    ctx.save();
    ctx.translate(s * 0.08, s * 0.14);
    ctx.rotate(finRot);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.24, s * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 125, 60, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 7. Expressive Eye
    const eyeX = s * 0.44;
    const eyeY = -s * 0.12;
    this.drawExpressiveEye(ctx, eyeX, eyeY, s * 0.16);

    // 8. Cute Snapping Mouth
    const mouthGap = this.mouthOpen * 7;
    ctx.beginPath();
    ctx.moveTo(s * 0.72, s * 0.02 - mouthGap);
    ctx.lineTo(s * 0.62, s * 0.08);
    ctx.lineTo(s * 0.72, s * 0.14 + mouthGap);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawClownStripe(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // SPECIES 2: JAPANESE KOI (Kohaku)
  // --------------------------------------------------------------------------
  drawKoi(ctx, s, tailWiggle) {
    const tailOffset = tailWiggle * (s * 0.26);

    // 1. Flowing Translucent Caudal Fin with Ray Lines
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.bezierCurveTo(-s * 1.25, tailOffset * 0.4, -s * 1.6, tailOffset - s * 0.36, -s * 1.7, tailOffset - s * 0.18);
    ctx.quadraticCurveTo(-s * 1.35, tailOffset * 0.5, -s * 1.7, tailOffset + s * 0.18);
    ctx.bezierCurveTo(-s * 1.6, tailOffset + s * 0.36, -s * 1.25, tailOffset * 0.4, -s * 0.8, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 2. Large Torpedo Body (Ivory Pearl)
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.88, s * 0.36, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.35);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.5, '#f8fafc');
    bodyGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3. Kohaku Scarlet & Gold Markings (Distinct Organic Patches)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.88, s * 0.36, 0, 0, Math.PI * 2);
    ctx.clip(); // Keep patches inside fish body

    // Head Crimson Crown
    ctx.beginPath();
    ctx.ellipse(s * 0.36, -s * 0.04, s * 0.28, s * 0.18, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();

    // Mid-body Scarlet Patch
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, -s * 0.08, s * 0.38, s * 0.22, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();

    // Golden Accent Patch near caudal
    ctx.beginPath();
    ctx.ellipse(-s * 0.48, s * 0.02, s * 0.22, s * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.restore();

    // 4. Flowing Pectoral Fins (Pair)
    const finAngle = Math.sin(this.finPhase) * 0.25;
    ctx.save();
    ctx.translate(s * 0.18, s * 0.18);
    ctx.rotate(finAngle + 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.38, s * 0.14, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 5. Snout Whiskers (Barbels)
    ctx.beginPath();
    ctx.moveTo(s * 0.82, s * 0.08);
    ctx.quadraticCurveTo(s * 0.95, s * 0.18, s * 1.05, s * 0.15);
    ctx.moveTo(s * 0.82, -s * 0.08);
    ctx.quadraticCurveTo(s * 0.95, -s * 0.18, s * 1.05, -s * 0.15);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 6. Calm, Noble Dark Eye
    const eyeX = s * 0.58;
    const eyeY = -s * 0.12;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + this.eyeLookX * 0.6, eyeY + this.eyeLookY * 0.6, s * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // 7. Gentle Mouth
    ctx.beginPath();
    const mouthGap = this.mouthOpen * 5;
    ctx.arc(s * 0.85, 0, 3 + mouthGap, 0, Math.PI * 2);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // SPECIES 3: PINK AXOLOTL (Lottie)
  // --------------------------------------------------------------------------
  drawAxolotl(ctx, s, tailWiggle) {
    const tailOffset = tailWiggle * (s * 0.25);

    // 1. Flat paddle tail with dorsal fin crest
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.95, tailOffset * 0.5 - s * 0.25, -s * 1.4, tailOffset);
    ctx.quadraticCurveTo(-s * 0.95, tailOffset * 0.5 + s * 0.25, -s * 0.5, s * 0.15);
    ctx.fillStyle = 'rgba(251, 207, 232, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Cute Chubby Pink Salamander Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.76, s * 0.44, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
    bodyGrad.addColorStop(0, '#fce7f3');
    bodyGrad.addColorStop(0.6, '#fbcfe8');
    bodyGrad.addColorStop(1, '#f9a8d4');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 3. Stubby Little Salamander Legs (Front & Back)
    const legPhase = Math.sin(this.finPhase);
    this.drawAxolotlLeg(ctx, s * 0.2, s * 0.38, 0.4 + legPhase * 0.2, s);
    this.drawAxolotlLeg(ctx, -s * 0.32, s * 0.36, 0.2 - legPhase * 0.2, s);

    // 4. 6 Feathery External Gills (3 pairs on head that sway smoothly)
    const gillWave = Math.sin(this.tailPhase * 0.8) * 0.18;
    const gillX = s * 0.32;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const baseAngle = (side * (0.6 + i * 0.35)) + gillWave;
        const len = s * (0.42 + i * 0.08);
        ctx.save();
        ctx.translate(gillX, side * (s * 0.18 + i * s * 0.06));
        ctx.rotate(baseAngle);

        // Main gill stalk
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, side * 6, len, 0);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Feathery branch frills
        for (let f = 0.2; f <= 0.9; f += 0.25) {
          ctx.beginPath();
          ctx.moveTo(len * f, 0);
          ctx.lineTo(len * f + 4, side * 6);
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 5. Blush Cheeks
    ctx.beginPath();
    ctx.arc(s * 0.45, -s * 0.22, s * 0.1, 0, Math.PI * 2);
    ctx.arc(s * 0.45, s * 0.22, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.fill();

    // 6. Shiny Button Eyes
    const eyeX = s * 0.52;
    ctx.beginPath();
    ctx.arc(eyeX, -s * 0.14, s * 0.09, 0, Math.PI * 2);
    ctx.arc(eyeX, s * 0.14, s * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Eye catchlight sparkles
    ctx.beginPath();
    ctx.arc(eyeX + 1.5, -s * 0.14 - 1.5, 2, 0, Math.PI * 2);
    ctx.arc(eyeX + 1.5, s * 0.14 - 1.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 7. Signature Axolotl Sweet Smiling Face
    const mouthGap = this.mouthOpen * 6;
    ctx.beginPath();
    if (mouthGap > 1) {
      ctx.arc(s * 0.68, 0, 4 + mouthGap, 0, Math.PI * 2);
      ctx.fillStyle = '#be123c';
      ctx.fill();
    } else {
      ctx.arc(s * 0.62, 0, s * 0.14, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }

  drawAxolotlLeg(ctx, x, y, rot, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.12, s * 0.08, s * 0.16, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fbcfe8';
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SPECIES 4: PUFFERFISH (Puffy)
  // --------------------------------------------------------------------------
  drawPuffer(ctx, s, tailWiggle) {
    const inflateFactor = 1.0 + this.inflation * 0.65;
    const bodyRadiusX = (s * 0.65) * inflateFactor;
    const bodyRadiusY = (s * 0.55) * inflateFactor;

    // 1. Tiny fluttering caudal fin
    const tailOffset = tailWiggle * (s * 0.25);
    ctx.beginPath();
    ctx.moveTo(-bodyRadiusX * 0.9, 0);
    ctx.quadraticCurveTo(-bodyRadiusX * 1.3, tailOffset * 0.5, -bodyRadiusX * 1.5, tailOffset - s * 0.22);
    ctx.quadraticCurveTo(-bodyRadiusX * 1.25, tailOffset * 0.5, -bodyRadiusX * 1.5, tailOffset + s * 0.22);
    ctx.closePath();
    ctx.fillStyle = 'rgba(163, 230, 53, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 2. Round Chubby Body (Expands when excited)
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.1, 0, 0, bodyRadiusX);
    bodyGrad.addColorStop(0, '#bef264');
    bodyGrad.addColorStop(0.65, '#a3e635');
    bodyGrad.addColorStop(1, '#65a30d');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Cream Belly
    ctx.beginPath();
    ctx.ellipse(0, bodyRadiusY * 0.35, bodyRadiusX * 0.85, bodyRadiusY * 0.55, 0, 0, Math.PI);
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    // 3. Spikes when inflated!
    if (this.inflation > 0.15) {
      const spikeCount = 16;
      ctx.fillStyle = '#4d7c0f';
      for (let i = 0; i < spikeCount; i++) {
        const spikeAngle = (i / spikeCount) * Math.PI * 2;
        const sx = Math.cos(spikeAngle) * bodyRadiusX;
        const sy = Math.sin(spikeAngle) * bodyRadiusY;
        const spikeLen = 6 * this.inflation;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(spikeAngle) * spikeLen, sy + Math.sin(spikeAngle) * spikeLen);
        ctx.strokeStyle = '#365314';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 4. Spotted Texture on Back
    ctx.fillStyle = 'rgba(77, 124, 15, 0.55)';
    for (let i = 0; i < 5; i++) {
      const spotX = -bodyRadiusX * 0.4 + i * (bodyRadiusX * 0.18);
      const spotY = -bodyRadiusY * 0.45 + (i % 2) * 6;
      ctx.beginPath();
      ctx.arc(spotX, spotY, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Rapid Fluttering Pectoral Fin (Hummingbird style)
    const flutterAngle = Math.sin(this.finPhase * 1.8) * 0.45;
    ctx.save();
    ctx.translate(s * 0.08, s * 0.1);
    ctx.rotate(flutterAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.2, s * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 6. Big Surprised Wide Eyes
    const eyeSize = s * (0.16 + this.inflation * 0.04);
    const eyeX = bodyRadiusX * 0.55;
    const eyeY = -bodyRadiusY * 0.28;
    this.drawExpressiveEye(ctx, eyeX, eyeY, eyeSize);

    // 7. Cute Parrot-like Pouty Beak
    const beakX = bodyRadiusX * 0.95;
    const beakOpen = this.mouthOpen * 5;
    ctx.beginPath();
    ctx.moveTo(beakX - 4, -4 - beakOpen);
    ctx.lineTo(beakX + 4, 0);
    ctx.lineTo(beakX - 4, 4 + beakOpen);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // SPECIES 5: BIOLUMINESCENT JELLYFISH (Aurelia)
  // --------------------------------------------------------------------------
  drawJellyfish(ctx, s, tailWiggle) {
    const pulseScale = 1.0 + Math.sin(this.pulsePhase) * 0.15;
    const bellW = s * 0.85 * pulseScale;
    const bellH = s * 0.7 / pulseScale;

    // 1. Ethereal Bioluminescent Ambient Glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -bellH * 0.2, s * 1.1, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(0, -bellH * 0.2, s * 0.2, 0, -bellH * 0.2, s * 1.1);
    glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    glowGrad.addColorStop(0.7, 'rgba(236, 72, 153, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();

    // 2. Trailing Tentacles & Ruffled Oral Arms with Water Drag
    const tendrilCount = 6;
    for (let i = 0; i < tendrilCount; i++) {
      const offsetX = -bellW * 0.65 + (i / (tendrilCount - 1)) * (bellW * 1.3);
      const waveLag = this.pulsePhase + i * 0.8;
      ctx.beginPath();
      ctx.moveTo(offsetX, 0);
      const wave1 = Math.sin(waveLag) * 12;
      const wave2 = Math.cos(waveLag * 1.2) * 16;
      ctx.bezierCurveTo(
        offsetX + wave1, s * 0.6,
        offsetX + wave2, s * 1.2,
        offsetX + wave1 * 0.5, s * 1.8
      );
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(232, 121, 249, 0.7)' : 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = i === 2 || i === 3 ? 2.5 : 1.4;
      ctx.stroke();
    }

    // 3. Translucent Outer Bell Umbrella Dome
    ctx.beginPath();
    ctx.moveTo(-bellW, 0);
    ctx.bezierCurveTo(-bellW, -bellH * 1.35, bellW, -bellH * 1.35, bellW, 0);
    // Scalloped / Ruffled lower rim
    ctx.quadraticCurveTo(bellW * 0.5, bellH * 0.2, 0, 0);
    ctx.quadraticCurveTo(-bellW * 0.5, bellH * 0.2, -bellW, 0);
    ctx.closePath();

    const bellGrad = ctx.createLinearGradient(0, -bellH, 0, bellH * 0.2);
    bellGrad.addColorStop(0, 'rgba(244, 114, 182, 0.7)');
    bellGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.55)');
    bellGrad.addColorStop(1, 'rgba(236, 72, 153, 0.35)');
    ctx.fillStyle = bellGrad;
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 4. Inner Bioluminescent Bell Organs (Clover/Horseshoe canals)
    ctx.beginPath();
    ctx.arc(-bellW * 0.25, -bellH * 0.45, s * 0.14, 0, Math.PI * 2);
    ctx.arc(bellW * 0.25, -bellH * 0.45, s * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    // 5. Cute Shimmering Sparkles
    ctx.beginPath();
    ctx.arc(0, -bellH * 0.6, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // SHARED EYE & EMOTE HELPERS
  // --------------------------------------------------------------------------
  drawExpressiveEye(ctx, eyeX, eyeY, eyeRadius) {
    // Sclera
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Dark Pupil tracking target
    const px = eyeX + MathUtils.clamp(this.eyeLookX, -eyeRadius * 0.5, eyeRadius * 0.5);
    const py = eyeY + MathUtils.clamp(this.eyeLookY, -eyeRadius * 0.5, eyeRadius * 0.5);
    ctx.beginPath();
    ctx.arc(px, py, eyeRadius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Dual Cute Catchlight Highlights
    ctx.beginPath();
    ctx.arc(px - eyeRadius * 0.2, py - eyeRadius * 0.2, eyeRadius * 0.22, 0, Math.PI * 2);
    ctx.arc(px + eyeRadius * 0.18, py + eyeRadius * 0.15, eyeRadius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  drawEmotes(ctx) {
    for (const em of this.emotes) {
      ctx.save();
      ctx.translate(this.x + em.x, this.y + em.y);
      ctx.scale(em.scale, em.scale);

      ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Soft glow backing
      ctx.shadowColor = 'rgba(255, 107, 129, 0.7)';
      ctx.shadowBlur = 8;

      ctx.fillStyle = `rgba(255, 240, 245, ${em.alpha})`;
      ctx.fillText(em.text, 0, 0);

      ctx.strokeStyle = `rgba(225, 29, 72, ${em.alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeText(em.text, 0, 0);

      ctx.restore();
    }
  }
}

// ============================================================================
// 4. SIMULATION ENVIRONMENT ELEMENTS
// ============================================================================

class FoodParticle {
  constructor(x, y) {
    this.x = x + MathUtils.rand(-14, 14);
    this.y = y + MathUtils.rand(-10, 10);
    this.vx = MathUtils.rand(-0.4, 0.4);
    this.vy = MathUtils.rand(0.5, 1.2); // Sinking with water resistance
    this.width = MathUtils.rand(4, 7);
    this.height = MathUtils.rand(2.5, 4.5);
    this.rot = MathUtils.rand(0, Math.PI * 2);
    this.rotSpeed = MathUtils.rand(-0.06, 0.06);
    this.life = 650; // Sits on floor before dissolving
    this.isSettled = false;
    this.color = ['#f59e0b', '#ef4444', '#10b981', '#fbbf24', '#f97316'][Math.floor(Math.random() * 5)];
  }

  update(height) {
    if (!this.isSettled) {
      // Gentle water drag physics
      this.vx *= 0.98;
      this.vy = Math.min(1.2, this.vy + 0.015);
      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.rotSpeed;

      // Settle on gravel bed
      if (this.y >= height - 20) {
        this.y = height - 20;
        this.isSettled = true;
        this.vx = 0;
        this.vy = 0;
      }
    }
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.beginPath();
    ctx.ellipse(0, 0, this.width, this.height, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.fill();

    ctx.restore();
  }
}

class WaterBubble {
  constructor(x, y, r = MathUtils.rand(1.5, 4.0), speed = MathUtils.rand(0.7, 1.6)) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.speed = speed;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = MathUtils.rand(0.04, 0.09);
    this.life = 350;
  }

  update() {
    this.y -= this.speed;
    this.wobblePhase += this.wobbleSpeed;
    this.x += Math.sin(this.wobblePhase) * 0.45;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bubble catchlight
    ctx.beginPath();
    ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    ctx.restore();
  }
}

class SurfaceRipple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = MathUtils.rand(24, 48);
    this.alpha = 0.8;
  }

  update() {
    this.radius += 0.85;
    this.alpha -= 0.02;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 242, 254, ${this.alpha * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// 5. MAIN AQUARIUM TANK CONTROLLER
// ============================================================================
class FishFriendTank {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.width = 360;
    this.height = 280;
    this.dpr = window.devicePixelRatio || 1;

    // Simulation collections
    this.creatures = [];
    this.foods = [];
    this.bubbles = [];
    this.ripples = [];
    this.plants = [];

    // User settings
    this.companionType = 'clownfish';
    this.fishCount = 1;

    // Interactive state
    this.mouse = { x: 0, y: 0, active: false };
    this.destroyed = false;
    this.animId = null;

    // Caustics shimmer clock
    this.causticTime = 0;

    // Initialize systems
    this.initCanvas();
    this.initCreatures();
    this.initPlants();
    this.bindEvents();
    this.loop();
  }

  // --------------------------------------------------------------------------
  // Canvas Lifecycle & HiDPI Setup
  // --------------------------------------------------------------------------
  initCanvas() {
    this.resize();
    this.resizeHandler = () => {
      this.resize();
      this.initPlants();
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = parent ? parent.clientWidth || 360 : 360;
    this.height = parent ? parent.clientHeight || 280 : 280;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    if (this.canvas.style) {
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }

    this.ctx.resetTransform?.();
    this.ctx.scale(this.dpr, this.dpr);
  }

  destroy() {
    this.destroyed = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeHandler && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------
  setCompanion(type) {
    if (!SPECIES_CONFIG[type]) type = 'clownfish';
    this.companionType = type;
    if (this.creatures.length > 0) {
      this.creatures[0].setSpecies(type);
      this.creatures[0].triggerEmote('✨');
    }
  }

  setFishCount(n) {
    this.fishCount = MathUtils.clamp(parseInt(n, 10) || 1, 1, 3);
    this.syncCreatureCount();
  }

  triggerEmote(text, fishIndex = 0) {
    const target = this.creatures[fishIndex] || this.creatures[0];
    if (target) {
      target.triggerEmote(text);
    }
  }

  addFood(x, y) {
    this.dropFood(x, y);
  }

  dropFood(x, y) {
    const flakeCount = Math.floor(MathUtils.rand(3, 6));
    for (let i = 0; i < flakeCount; i++) {
      this.foods.push(new FoodParticle(x, y));
    }

    // Surface splash ripples & bubbles
    this.ripples.push(new SurfaceRipple(x, Math.min(y, 25)));
    for (let b = 0; b < 3; b++) {
      this.addBubble(x + MathUtils.rand(-10, 10), Math.min(y, 30), MathUtils.rand(2, 4), 0.5);
    }

    // Excite all fish in tank!
    for (const fish of this.creatures) {
      fish.excited = true;
      fish.excitedTimer = 180;
      fish.triggerEmote(Math.random() > 0.4 ? '♥' : '!');
    }
  }

  addBubble(x, y, r, speed) {
    this.bubbles.push(new WaterBubble(x, y, r, speed));
  }

  // --------------------------------------------------------------------------
  // Initialization Helpers
  // --------------------------------------------------------------------------
  initCreatures() {
    this.creatures = [];
    this.syncCreatureCount();
  }

  syncCreatureCount() {
    while (this.creatures.length < this.fishCount) {
      const idx = this.creatures.length;
      let species = this.companionType;
      // If multiple fish, add complementary companion species
      if (idx === 1) species = this.companionType === 'koi' ? 'clownfish' : 'koi';
      if (idx === 2) species = this.companionType === 'axolotl' ? 'puffer' : 'axolotl';

      const posX = 80 + idx * 90;
      const posY = 90 + idx * 50;
      this.creatures.push(new AquaticCreature(species, posX, posY, idx));
    }
    while (this.creatures.length > this.fishCount) {
      this.creatures.pop();
    }
    if (this.creatures[0]) {
      this.creatures[0].setSpecies(this.companionType);
    }
  }

  initPlants() {
    this.plants = [];
    const count = Math.max(5, Math.floor(this.width / 42));
    for (let i = 0; i < count; i++) {
      const segCount = Math.floor(MathUtils.rand(4, 7));
      this.plants.push({
        x: 15 + i * 38 + MathUtils.rand(-10, 10),
        height: MathUtils.rand(65, 125),
        swaySpeed: MathUtils.rand(1.2, 2.2),
        swayPhase: MathUtils.rand(0, Math.PI * 2),
        segments: segCount,
        color: i % 2 === 0 ? '#10b981' : '#059669',
        leafHue: i % 3 === 0 ? '#34d399' : '#047857'
      });
    }
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.active = false;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.dropFood(clickX, clickY);
    });

    // Touch support for secondary touchscreens
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;
        this.dropFood(touchX, touchY);
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // Update Loop
  // --------------------------------------------------------------------------
  update() {
    this.causticTime += 0.025;

    // 1. Update Fish Creatures
    for (const fish of this.creatures) {
      fish.update(this, this.foods, this.creatures);
    }

    // 2. Update Food Flakes
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];
      food.update(this.height);
      if (food.life <= 0) {
        this.foods.splice(i, 1);
      }
    }

    // 3. Ambient Bubbles rising from bottom substrate
    if (Math.random() < 0.07) {
      this.addBubble(
        MathUtils.rand(20, this.width - 20),
        this.height - 18,
        MathUtils.rand(1.5, 3.8),
        MathUtils.rand(0.7, 1.4)
      );
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.update();
      if (b.y < 12 || b.life <= 0) {
        this.ripples.push(new SurfaceRipple(b.x, 14));
        this.bubbles.splice(i, 1);
      }
    }

    // 4. Update Surface Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rip = this.ripples[i];
      rip.update();
      if (rip.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Rendering Loop
  // --------------------------------------------------------------------------
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Realistic Deep Blue Aquatic Gradient
    this.drawWaterBackground();

    // 2. Caustic Shimmering Light Rays
    this.drawCausticLightShimmer();

    // 3. Aquatic Plants Swaying at Bottom
    this.drawPlants();

    // 4. Sand / Gravel Bed
    this.drawGravelBed();

    // 5. Food Flakes
    for (const food of this.foods) {
      food.draw(this.ctx);
    }

    // 6. Fish Creatures
    for (const fish of this.creatures) {
      fish.draw(this.ctx);
    }

    // 7. Ambient Bubbles
    for (const b of this.bubbles) {
      b.draw(this.ctx);
    }

    // 8. Surface Shimmer & Ripples
    this.drawWaterSurface();
  }

  drawWaterBackground() {
    const waterGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    waterGrad.addColorStop(0, '#0a2342'); // Sunlight twilight azure
    waterGrad.addColorStop(0.35, '#071b34');
    waterGrad.addColorStop(0.75, '#051326');
    waterGrad.addColorStop(1, '#020b17'); // Abyss floor
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawCausticLightShimmer() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Animated caustic rays radiating from water surface
    const rayCount = 7;
    for (let i = 0; i < rayCount; i++) {
      const t = this.causticTime + i * 1.35;
      const startX = (i / rayCount) * this.width + Math.sin(t * 0.8) * 20;
      const endX = startX + Math.sin(t * 1.2) * 55;
      const rayWidth = 24 + Math.sin(t * 1.5) * 14;

      const rayGrad = ctx.createLinearGradient(startX, 0, endX, this.height * 0.85);
      rayGrad.addColorStop(0, 'rgba(0, 242, 254, 0.16)');
      rayGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      rayGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');

      ctx.beginPath();
      ctx.moveTo(startX - rayWidth * 0.5, 0);
      ctx.lineTo(startX + rayWidth * 0.5, 0);
      ctx.lineTo(endX + rayWidth * 1.2, this.height * 0.85);
      ctx.lineTo(endX - rayWidth * 1.2, this.height * 0.85);
      ctx.closePath();
      ctx.fillStyle = rayGrad;
      ctx.fill();
    }

    ctx.restore();
  }

  drawPlants() {
    const ctx = this.ctx;
    const time = performance.now() * 0.0018;

    for (const p of this.plants) {
      ctx.save();
      const baseY = this.height - 20;
      let currX = p.x;
      let currY = baseY;

      ctx.beginPath();
      ctx.moveTo(currX, currY);

      // Multi-segment swaying IK curve
      const segLen = p.height / p.segments;
      for (let s = 1; s <= p.segments; s++) {
        const segFrac = s / p.segments;
        const sway = Math.sin(time * p.swaySpeed + p.swayPhase + s * 0.4) * (14 * segFrac * segFrac);
        const nextX = p.x + sway;
        const nextY = baseY - s * segLen;

        ctx.quadraticCurveTo(currX, currY, nextX, nextY);
        currX = nextX;
        currY = nextY;

        // Leaf appendages branching off stalk
        if (s % 2 === 1 && s < p.segments) {
          const side = (s % 4 === 1) ? 1 : -1;
          ctx.save();
          ctx.translate(currX, currY);
          ctx.rotate(sway * 0.05 + side * 0.5);
          ctx.beginPath();
          ctx.ellipse(side * 8, 0, 10, 4.5, side * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = p.leafHue;
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }
  }

  drawGravelBed() {
    const ctx = this.ctx;
    const bedHeight = 24;
    const y = this.height - bedHeight;

    // Gravel Sand Gradient
    const sandGrad = ctx.createLinearGradient(0, y, 0, this.height);
    sandGrad.addColorStop(0, '#1e293b');
    sandGrad.addColorStop(0.5, '#0f172a');
    sandGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, y, this.width, bedHeight);

    // Decorative smooth river pebbles
    const pebbleColors = ['#334155', '#475569', '#1e293b', '#64748b'];
    for (let i = 0; i < this.width; i += 24) {
      const px = i + 12;
      const py = y + 8 + ((i * 7) % 10);
      const pr = 6 + ((i * 3) % 5);

      ctx.beginPath();
      ctx.ellipse(px, py, pr * 1.3, pr * 0.75, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = pebbleColors[(i / 24) % pebbleColors.length];
      ctx.fill();

      // Pebble top highlight
      ctx.beginPath();
      ctx.arc(px - 1.5, py - 1.5, pr * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }
  }

  drawWaterSurface() {
    const ctx = this.ctx;

    // Surface soft wave glow
    const surfaceGrad = ctx.createLinearGradient(0, 0, 0, 16);
    surfaceGrad.addColorStop(0, 'rgba(0, 242, 254, 0.28)');
    surfaceGrad.addColorStop(0.7, 'rgba(0, 242, 254, 0.08)');
    surfaceGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
    ctx.fillStyle = surfaceGrad;
    ctx.fillRect(0, 0, this.width, 16);

    // Water Surface Wave Highlights
    ctx.beginPath();
    ctx.moveTo(0, 5);
    for (let x = 0; x <= this.width; x += 20) {
      const waveY = 5 + Math.sin(this.causticTime * 2 + x * 0.04) * 2.5;
      ctx.lineTo(x, waveY);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Draw active ripples
    for (const rip of this.ripples) {
      rip.draw(ctx);
    }
  }

  loop() {
    if (this.destroyed) return;
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(() => this.loop());
  }
}

// Global Export for browser & Electron context
if (typeof window !== 'undefined') {
  window.FishFriendTank = FishFriendTank;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FishFriendTank;
}
