/**
 * ESP32 E-INK PIXEL-ART AQUARIUM SIMULATION
 * Inspired by YouTube video "Fish food for my fish friend 🐟 #esp32 #einkdisplay #hardware"
 *
 * SPECIFICATIONS:
 * 1. Ultra-low power tick loop: 4 FPS (250ms) active, 2 FPS (500ms) idle.
 *    0.0% to 0.1% CPU usage on PC. Zero continuous 60fps requestAnimationFrame loop!
 * 2. Authentic monochrome / 2-bit grayscale E-Paper aesthetic with theme adaptation.
 * 3. Compact handcrafted pixel-art sprites (Clownfish, Koi, Axolotl, Puffer, Turtle).
 * 4. 4-frame stepped tail swishing animation + 1-frame chomping sprite when eating flakes.
 * 5. Swaying seaweed stalks, dithered sand substrate, rising pixel bubbles, sinking food flakes.
 * 6. Retro pixel speech bubbles with emotes: ♥, ^w^, nom, zzz, !, ✨.
 * 7. Complete Public API compatibility: FishFriendTank.
 */

// ============================================================================
// 1. E-INK / E-PAPER COLOR PALETTES
// ============================================================================
const EINK_PALETTES = {
  // Classic Warm E-Paper (Kindle / LilyGO / Waveshare default)
  paper: {
    bg: '#f5f2eb',       // Warm paper white
    ink1: '#1b1b18',     // Deep carbon ink (outlines, text, pupils)
    ink2: '#525047',     // Midtone charcoal ink (patterns, fins, gills)
    ink3: '#9c9789',     // Light halftone ink (sand, dither, secondary dots)
    white: '#fdfbf7',    // Bright chalk white (stripes, eye sclera, highlights)
    border: '#2c2a24'    // Crisp bezel border
  },
  // Inverted Night E-Paper (Dark themes)
  dark: {
    bg: '#121315',       // Deep carbon substrate
    ink1: '#f2efe8',     // Crisp chalk ink
    ink2: '#9c9a92',     // Midtone chalk
    ink3: '#45484d',     // Dim halftone dither
    white: '#ffffff',    // Bright white
    border: '#383a3d'
  },
  // Cyberdeck Amber Phosphor
  amber: {
    bg: '#141006',       // Amber black
    ink1: '#ffb300',     // Vibrant amber ink
    ink2: '#aa7400',     // Midtone amber
    ink3: '#4a3300',     // Dim amber dither
    white: '#ffe57f',    // Bright yellow-white
    border: '#ffb300'
  },
  // LilyGO T-Display Cyan Matrix
  cyan: {
    bg: '#08131a',       // Cyan black
    ink1: '#4dd0e1',     // Vibrant ice cyan
    ink2: '#00838f',     // Midtone teal
    ink3: '#00363a',     // Dim cyan dither
    white: '#b2ebf2',    // Bright icy white
    border: '#4dd0e1'
  }
};

function getActivePalette() {
  if (typeof document === 'undefined') return EINK_PALETTES.paper;
  const body = document.body;
  if (!body) return EINK_PALETTES.paper;

  const classes = body.className || '';
  if (classes.includes('theme-eink-dark') || classes.includes('theme-tokyonight') || classes.includes('theme-catppuccin') || classes.includes('theme-rosepine')) {
    return EINK_PALETTES.dark;
  }
  if (classes.includes('theme-eink-amber') || classes.includes('theme-amberbyte') || classes.includes('theme-gruvbox')) {
    return EINK_PALETTES.amber;
  }
  if (classes.includes('theme-eink-cyan') || classes.includes('theme-blueberry') || classes.includes('theme-nordic')) {
    return EINK_PALETTES.cyan;
  }
  return EINK_PALETTES.paper;
}

// ============================================================================
// 2. PIXEL ART SPRITES (Handcrafted 1-bit / 2-bit matrices)
// '#' = ink1 (solid dark)
// '.' = ink2 (mid tone / patterns)
// ':' = ink3 (light halftone)
// 'w' = white (stripes, eye sclera)
// 'o' = pupil (ink1)
// ' ' = transparent
// ============================================================================

const SPRITES = {
  // --------------------------------------------------------------------------
  // CLOWNFISH (18x11) - Striped body, dorsal/ventral fins, stepped tail swish
  // --------------------------------------------------------------------------
  clownfish: {
    width: 18,
    height: 11,
    // Frame 0: Tail Neutral (facing right)
    f0: [
      "         ###      ",
      "       ##...##    ",
      "     ##...#.w.##  ",
      "    #.....#..w..# ",
      "####......#o.w..##",
      "#..#......#..w...#",
      "####......#..w..##",
      "    #.....#..w..# ",
      "     ##...#.w.##  ",
      "       ##...##    ",
      "         ###      "
    ],
    // Frame 1: Tail Wag UP
    f1: [
      "####     ###      ",
      "#..#   ##...##    ",
      "#### ##...#.w.##  ",
      "    #.....#..w..# ",
      "   #......#o.w..##",
      "   #......#..w...#",
      "    #.....#..w..##",
      "     ##...#..w..# ",
      "       ####.w.##  ",
      "        #...##    ",
      "         ###      "
    ],
    // Frame 2: Tail Neutral
    f2: [
      "         ###      ",
      "       ##...##    ",
      "     ##...#.w.##  ",
      "    #.....#..w..# ",
      "####......#o.w..##",
      "#..#......#..w...#",
      "####......#..w..##",
      "    #.....#..w..# ",
      "     ##...#.w.##  ",
      "       ##...##    ",
      "         ###      "
    ],
    // Frame 3: Tail Wag DOWN
    f3: [
      "         ###      ",
      "        #...##    ",
      "       ####.w.##  ",
      "     ##...#..w..# ",
      "    #.....#..w..##",
      "   #......#..w...#",
      "   #......#o.w..##",
      "    #.....#..w..# ",
      "#### ##...#.w.##  ",
      "#..#   ##...##    ",
      "####     ###      "
    ],
    // Chomp: Mouth snaps open at snout!
    chomp: [
      "         ###      ",
      "       ##...##    ",
      "     ##...#.w.##  ",
      "    #.....#..w..# ",
      "####......#o.w..##",
      "#..#......#..w.   ",
      "####......#..w..##",
      "    #.....#..w..# ",
      "     ##...#.w.##  ",
      "       ##...##    ",
      "         ###      "
    ]
  },

  // --------------------------------------------------------------------------
  // JAPANESE KOI (22x11) - Slender torpedo body, scarlet spots, whiskers
  // --------------------------------------------------------------------------
  koi: {
    width: 22,
    height: 11,
    // Frame 0: Tail Neutral
    f0: [
      "            #####       ",
      "        ####.....###    ",
      "     ###...##...#...##  ",
      " ####.....#..#.......## ",
      "#....#...#....#..o....# ",
      "#.....#..........w...###",
      "#....#...#....#.......# ",
      " ####.....#..#.......## ",
      "     ###...##...#...##  ",
      "        ####.....###    ",
      "            #####       "
    ],
    // Frame 1: Tail Wag UP
    f1: [
      "####        #####       ",
      "#...#   ####.....###    ",
      "#....###...##...#...##  ",
      " ####.....#..#.......## ",
      "   #.....#....#..o....# ",
      "   #.............w...###",
      "    #....#....#.......# ",
      "     #....#..#.......## ",
      "      ##...##...#...##  ",
      "        ####.....###    ",
      "            #####       "
    ],
    // Frame 2: Tail Neutral
    f2: [
      "            #####       ",
      "        ####.....###    ",
      "     ###...##...#...##  ",
      " ####.....#..#.......## ",
      "#....#...#....#..o....# ",
      "#.....#..........w...###",
      "#....#...#....#.......# ",
      " ####.....#..#.......## ",
      "     ###...##...#...##  ",
      "        ####.....###    ",
      "            #####       "
    ],
    // Frame 3: Tail Wag DOWN
    f3: [
      "            #####       ",
      "        ####.....###    ",
      "      ##...##...#...##  ",
      "     #....#..#.......## ",
      "    #....#....#.......# ",
      "   #.............w...###",
      "   #.....#....#..o....# ",
      " ####.....#..#.......## ",
      "#....###...##...#...##  ",
      "#...#   ####.....###    ",
      "####        #####       "
    ],
    // Chomp: Snout opens with barbel whiskers
    chomp: [
      "            #####       ",
      "        ####.....###    ",
      "     ###...##...#...##  ",
      " ####.....#..#.......## ",
      "#....#...#....#..o....# ",
      "#.....#..........w..    ",
      "#....#...#....#.......# ",
      " ####.....#..#.......## ",
      "     ###...##...#...##  ",
      "        ####.....###    ",
      "            #####       "
    ]
  },

  // --------------------------------------------------------------------------
  // PINK AXOLOTL (20x12) - External feathery gills, smiling face, paddling feet
  // --------------------------------------------------------------------------
  axolotl: {
    width: 20,
    height: 12,
    // Frame 0: Neutral Swim
    f0: [
      "               # # #",
      "              #.#.#.",
      "        ######......",
      "   #####............#",
      "###.....#....o..o....#",
      "#......#..............#",
      "###.....#.....w.......#",
      "   #####..##..........#",
      "        ##  ########",
      "              #.#.#.",
      "               # # #",
      "        ##    ##    "
    ],
    // Frame 1: Feet Step A & Tail Lift
    f1: [
      "               # # #",
      "####          #.#.#.",
      "#...##########......",
      " ###................#",
      "   #....#....o..o....#",
      "   #...#..............#",
      "    ###.#.....w.......#",
      "        ##..##........#",
      "          ##  ######",
      "              #.#.#.",
      "               # # #",
      "       ##      ##   "
    ],
    // Frame 2: Neutral
    f2: [
      "               # # #",
      "              #.#.#.",
      "        ######......",
      "   #####............#",
      "###.....#....o..o....#",
      "#......#..............#",
      "###.....#.....w.......#",
      "   #####..##..........#",
      "        ##  ########",
      "              #.#.#.",
      "               # # #",
      "        ##    ##    "
    ],
    // Frame 3: Feet Step B & Tail Drop
    f3: [
      "               # # #",
      "              #.#.#.",
      "          ####......",
      "        ##..........#",
      "    ####.#...o..o....#",
      "   #...#..............#",
      "###.....#.....w.......#",
      "#...####..##..........#",
      "####    ##  ########",
      "              #.#.#.",
      "               # # #",
      "         ##    ##   "
    ],
    // Chomp: Happy wide mouth chomp!
    chomp: [
      "               # # #",
      "              #.#.#.",
      "        ######......",
      "   #####............#",
      "###.....#....o..o....#",
      "#......#.........   .#",
      "###.....#.....w......#",
      "   #####..##..........#",
      "        ##  ########",
      "              #.#.#.",
      "               # # #",
      "        ##    ##    "
    ]
  },

  // --------------------------------------------------------------------------
  // PUFFERFISH (16x12 normal, 18x14 inflated when excited)
  // --------------------------------------------------------------------------
  puffer: {
    width: 16,
    height: 12,
    // Frame 0: Normal Round
    f0: [
      "      #####     ",
      "    ##.....##   ",
      "   #.........#  ",
      "  #...........# ",
      "##...#.....o...#",
      "#....#.....w...#",
      "##...#.........#",
      "  #...........# ",
      "   #.........#  ",
      "    ##.....##   ",
      "      #####     ",
      "        ##      "
    ],
    // Frame 1: Flutter Fin Up
    f1: [
      "##    #####     ",
      "#.# ##.....##   ",
      "## #.........#  ",
      "  #...........# ",
      " #...#.....o...#",
      " #...#.....w...#",
      "  #..#.........#",
      "  #...........# ",
      "   #.........#  ",
      "    ##.....##   ",
      "      #####     ",
      "        ##      "
    ],
    // Frame 2: Normal
    f2: [
      "      #####     ",
      "    ##.....##   ",
      "   #.........#  ",
      "  #...........# ",
      "##...#.....o...#",
      "#....#.....w...#",
      "##...#.........#",
      "  #...........# ",
      "   #.........#  ",
      "    ##.....##   ",
      "      #####     ",
      "        ##      "
    ],
    // Frame 3: Flutter Fin Down
    f3: [
      "      #####     ",
      "    ##.....##   ",
      "   #.........#  ",
      "  #...........# ",
      "  #..#.....o...#",
      " #...#.....w...#",
      " #...#.........#",
      "##............# ",
      "#.##.........#  ",
      "##  ##.....##   ",
      "      #####     ",
      "        ##      "
    ],
    // Chomp: Beak snaps open
    chomp: [
      "      #####     ",
      "    ##.....##   ",
      "   #.........#  ",
      "  #...........# ",
      "##...#.....o...#",
      "#....#.....w.   ",
      "##...#.........#",
      "  #...........# ",
      "   #.........#  ",
      "    ##.....##   ",
      "      #####     ",
      "        ##      "
    ],
    // Inflated (Spiky) Puffer Frame when excited! (18x14)
    inflated: [
      "     #   #   #    ",
      "   ### # # # ###  ",
      "  #.............# ",
      " #...............#",
      "# #...#.....o...# ",
      "##....#.....w....#",
      "# #...#.....o...# ",
      " #...............#",
      "  #.............# ",
      "   ### # # # ###  ",
      "     #   #   #    ",
      "        ###       ",
      "                  ",
      "                  "
    ]
  },

  // --------------------------------------------------------------------------
  // SEA TURTLE (20x12) - Domed patterned shell, paddle flippers
  // --------------------------------------------------------------------------
  turtle: {
    width: 20,
    height: 12,
    // Frame 0: Flipper Neutral
    f0: [
      "      ########      ",
      "    ##..#..#..##    ",
      "   #..##.##.##..#   ",
      "  #..#..#..#..#..# ##",
      " #...#..#..#..#..#o.#",
      "###..##.##.##..#..#.#",
      " #....#..#..#.....##",
      "  #..............#  ",
      "   ##..#....#..##   ",
      "  ####        ####  ",
      "  #..#        #..#  ",
      "   ##          ##   "
    ],
    // Frame 1: Flipper Stroke Forward
    f1: [
      "              ####  ",
      "      ######## #..# ",
      "    ##..#..#..## ## ",
      "   #..##.##.##..#   ",
      "  #..#..#..#..#..# ##",
      " #...#..#..#..#..#o.#",
      "###..##.##.##..#..#.#",
      " #....#..#..#.....##",
      "  #..............#  ",
      "   ##..#....#..##   ",
      "  ####              ",
      "  #..#              "
    ],
    // Frame 2: Neutral
    f2: [
      "      ########      ",
      "    ##..#..#..##    ",
      "   #..##.##.##..#   ",
      "  #..#..#..#..#..# ##",
      " #...#..#..#..#..#o.#",
      "###..##.##.##..#..#.#",
      " #....#..#..#.....##",
      "  #..............#  ",
      "   ##..#....#..##   ",
      "  ####        ####  ",
      "  #..#        #..#  ",
      "   ##          ##   "
    ],
    // Frame 3: Flipper Stroke Back
    f3: [
      "      ########      ",
      "    ##..#..#..##    ",
      "   #..##.##.##..#   ",
      "  #..#..#..#..#..# ##",
      " #...#..#..#..#..#o.#",
      "###..##.##.##..#..#.#",
      " #....#..#..#.....##",
      "  #..............#  ",
      "   ##..#....#..##   ",
      "  ####   ####       ",
      "  #..#   #..#       ",
      "   ##     ##        "
    ],
    // Chomp: Beak opens
    chomp: [
      "      ########      ",
      "    ##..#..#..##    ",
      "   #..##.##.##..#   ",
      "  #..#..#..#..#..# ##",
      " #...#..#..#..#..#o.",
      "###..##.##.##..#..#.#",
      " #....#..#..#.....##",
      "  #..............#  ",
      "   ##..#....#..##   ",
      "  ####        ####  ",
      "  #..#        #..#  ",
      "   ##          ##   "
    ]
  }
};

// ============================================================================
// 3. PIXEL EMOTE GLYPHS (5x5 / 7x5 Bitmaps)
// ============================================================================
const PIXEL_EMOTES = {
  // Heart ♥
  '♥': [
    " # # ",
    "#####",
    "#####",
    " ### ",
    "  #  "
  ],
  'heart': [
    " # # ",
    "#####",
    "#####",
    " ### ",
    "  #  "
  ],
  // Happy face ^w^
  '^w^': [
    "#   # #   #",
    " # #   # # ",
    "  #     #  "
  ],
  'happy': [
    "#   # #   #",
    " # #   # # ",
    "  #     #  "
  ],
  // NOM
  'nom': [
    "#  #  ##  # #",
    "#### #  # ###",
    "#  # #  # # #",
    "#  #  ##  # #"
  ],
  'NOM': [
    "#  #  ##  # #",
    "#### #  # ###",
    "#  # #  # # #",
    "#  #  ##  # #"
  ],
  // ZZZ Snooze
  'zzz': [
    "###  ",
    "  #  ",
    " ### ",
    "   # ",
    "  ###"
  ],
  'sleep': [
    "###  ",
    "  #  ",
    " ### ",
    "   # ",
    "  ###"
  ],
  // Alert !
  '!': [
    " # ",
    " # ",
    " # ",
    "   ",
    " # "
  ],
  // Sparkle ✨
  '✨': [
    "  #  ",
    " ### ",
    "#####",
    " ### ",
    "  #  "
  ],
  'sparkle': [
    "  #  ",
    " ### ",
    "#####",
    " ### ",
    "  #  "
  ]
};

// ============================================================================
// 4. SPECIES METADATA & CONFIGURATIONS
// ============================================================================
const SPECIES_CONFIG = {
  clownfish: {
    name: 'Nemo the Clownfish',
    sizeW: 18,
    sizeH: 11,
    baseSpeed: 2,
    dashSpeed: 3,
    preferredDepth: 0.5,
    foodSenseRadius: 90
  },
  koi: {
    name: 'Kohaku Japanese Koi',
    sizeW: 22,
    sizeH: 11,
    baseSpeed: 1,
    dashSpeed: 2,
    preferredDepth: 0.55,
    foodSenseRadius: 100
  },
  axolotl: {
    name: 'Lottie the Pink Axolotl',
    sizeW: 20,
    sizeH: 12,
    baseSpeed: 1,
    dashSpeed: 2,
    preferredDepth: 0.82, // bottom dweller
    foodSenseRadius: 80
  },
  puffer: {
    name: 'Puffy the Spiky Pufferfish',
    sizeW: 16,
    sizeH: 12,
    baseSpeed: 1,
    dashSpeed: 3,
    preferredDepth: 0.48,
    foodSenseRadius: 85
  },
  turtle: {
    name: 'Shelly the Sea Turtle',
    sizeW: 20,
    sizeH: 12,
    baseSpeed: 1,
    dashSpeed: 2,
    preferredDepth: 0.42,
    foodSenseRadius: 95
  },
  // Alias for backward compatibility with old jellyfish setting
  jellyfish: {
    name: 'Shelly the Sea Turtle',
    sizeW: 20,
    sizeH: 12,
    baseSpeed: 1,
    dashSpeed: 2,
    preferredDepth: 0.42,
    foodSenseRadius: 95
  }
};

// ============================================================================
// 5. PIXEL DRAWING UTILITY
// ============================================================================
function drawPixelMatrix(ctx, matrix, x, y, palette, facingRight = true) {
  if (!matrix || !matrix.length) return;
  const rows = matrix.length;
  const cols = matrix[0].length;

  for (let r = 0; r < rows; r++) {
    const line = matrix[r];
    for (let c = 0; c < cols; c++) {
      const char = line[c];
      if (char === ' ' || !char) continue;

      let color = null;
      if (char === '#') color = palette.ink1;
      else if (char === '.') color = palette.ink2;
      else if (char === ':') color = palette.ink3;
      else if (char === 'w') color = palette.white;
      else if (char === 'o') color = palette.ink1;
      else if (char === 'O') color = palette.ink1;

      if (!color) continue;

      // Handle horizontal flipping for left vs right facing
      const targetCol = facingRight ? c : (cols - 1 - c);
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x + targetCol), Math.floor(y + r), 1, 1);
    }
  }
}

// ============================================================================
// 6. PIXEL BUBBLE & FOOD FLAKE SIMULATION
// ============================================================================

class PixelBubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.birthTick = 0;
    this.life = 120;
    this.popping = false;
    this.popTick = 0;
  }

  update(tickCount) {
    if (this.popping) {
      this.popTick++;
      return this.popTick < 2; // Lasts 2 ticks then removed
    }

    // Rise 1 to 2 pixels per tick
    this.y -= (tickCount % 3 === 0 ? 2 : 1);
    // Subtle 1-pixel horizontal wobble
    this.wobble = (Math.floor(this.y / 4) % 2 === 0) ? 1 : 0;

    if (this.y <= 6) {
      this.popping = true;
    }
    this.life--;
    return this.life > 0;
  }

  draw(ctx, palette) {
    const bx = Math.floor(this.x + (this.wobble || 0));
    const by = Math.floor(this.y);

    if (this.popping) {
      // 3-pixel pop burst
      ctx.fillStyle = palette.ink2;
      ctx.fillRect(bx - 1, by, 1, 1);
      ctx.fillRect(bx + 2, by, 1, 1);
      ctx.fillRect(bx, by - 1, 1, 1);
      ctx.fillRect(bx + 1, by + 1, 1, 1);
      return;
    }

    // 2x2 or 3x3 hollow pixel ring
    ctx.fillStyle = palette.ink2;
    ctx.fillRect(bx, by, 2, 2);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(bx, by, 1, 1);
  }
}

class PixelFoodFlake {
  constructor(x, y) {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.landed = false;
    this.life = 60; // 60 ticks (~15-30 seconds)
    this.eaten = false;
  }

  update(vHeight, tickCount) {
    if (this.eaten) return false;

    if (!this.landed) {
      // Sinks 1 pixel per tick
      this.y += 1;
      // Gentle 1-pixel stepped wobble while sinking
      if (tickCount % 2 === 0) {
        this.x += (Math.floor(this.y / 3) % 2 === 0) ? 1 : -1;
      }
      // Reached sandy floor
      if (this.y >= vHeight - 13) {
        this.y = vHeight - 13;
        this.landed = true;
      }
    } else {
      this.life--;
    }

    return this.life > 0;
  }

  draw(ctx, palette) {
    if (this.eaten) return;
    const fx = Math.floor(this.x);
    const fy = Math.floor(this.y);

    // Cute 2x2 flake cluster
    ctx.fillStyle = palette.ink1;
    ctx.fillRect(fx, fy, 2, 1);
    ctx.fillRect(fx, fy + 1, 1, 1);
    ctx.fillStyle = palette.ink2;
    ctx.fillRect(fx + 1, fy + 1, 1, 1);
  }
}

// ============================================================================
// 7. PIXEL CREATURE COMPANION CLASS
// ============================================================================
class PixelCreature {
  constructor(speciesType, startX, startY, index = 0) {
    this.index = index;
    this.setSpecies(speciesType);

    this.x = startX;
    this.y = startY;
    this.facingRight = true;
    this.animFrame = 0;

    // Movement state
    this.vx = 0;
    this.vy = 0;
    this.targetX = startX;
    this.targetY = startY;
    this.pauseTicks = 0;
    this.idleTimer = 0;

    // Feeding & Emote state
    this.isChomping = false;
    this.chompTicks = 0;
    this.isExcited = false;
    this.excitedTicks = 0;

    this.currentEmote = null;
    this.emoteTicks = 0;
  }

  setSpecies(type) {
    let cleanType = type;
    if (cleanType === 'jellyfish') cleanType = 'turtle';
    if (!SPECIES_CONFIG[cleanType]) cleanType = 'clownfish';

    this.species = cleanType;
    this.cfg = SPECIES_CONFIG[cleanType];
    this.spriteData = SPRITES[cleanType] || SPRITES.clownfish;

    // Update species label in DOM if present
    if (this.index === 0 && typeof document !== 'undefined') {
      const nameEl = document.getElementById('fish-friend-name');
      if (nameEl && this.cfg.name) {
        nameEl.textContent = this.cfg.name;
      }
    }
  }

  triggerEmote(text) {
    this.currentEmote = text;
    this.emoteTicks = 12; // Displays for 12 ticks (~3 seconds)
  }

  update(tank, foods, otherFish) {
    const vW = tank.vWidth;
    const vH = tank.vHeight;
    const tickCount = tank.tickCount;

    // Emote lifetime countdown
    if (this.emoteTicks > 0) {
      this.emoteTicks--;
      if (this.emoteTicks === 0) {
        this.currentEmote = null;
      }
    }

    // Chomp animation countdown
    if (this.chompTicks > 0) {
      this.chompTicks--;
      if (this.chompTicks === 0) {
        this.isChomping = false;
      }
    }

    // Excitement timer
    if (this.excitedTicks > 0) {
      this.excitedTicks--;
      if (this.excitedTicks === 0) {
        this.isExcited = false;
      }
    }

    // Advance 4-frame stepped tail swishing animation
    this.animFrame = (this.animFrame + 1) % 4;

    // ------------------------------------------------------------------------
    // AI BEHAVIOR & TARGETING
    // ------------------------------------------------------------------------
    let nearestFood = null;
    let minDist = this.cfg.foodSenseRadius;

    // Mouth position in virtual coordinates
    const mouthX = this.x + (this.facingRight ? this.cfg.sizeW : 0);
    const mouthY = this.y + Math.floor(this.cfg.sizeH / 2);

    // 1. Scan for closest food flake
    for (const food of foods) {
      if (food.eaten) continue;
      const d = Math.hypot(food.x - mouthX, food.y - mouthY);
      if (d < minDist) {
        minDist = d;
        nearestFood = food;
      }
    }

    // 2. Chomp food flake if within reach
    if (nearestFood && minDist <= 4) {
      nearestFood.eaten = true;
      this.isChomping = true;
      this.chompTicks = 2; // 2 ticks chomp frame
      this.isExcited = true;
      this.excitedTicks = 14;

      // Cute random reaction emote!
      const emotes = ['♥', '^w^', 'nom', '!'];
      this.triggerEmote(emotes[Math.floor(Math.random() * emotes.length)]);
      return;
    }

    // 3. Move towards food if spotted
    if (nearestFood) {
      this.pauseTicks = 0;
      this.targetX = nearestFood.x - (this.facingRight ? this.cfg.sizeW : 0);
      this.targetY = nearestFood.y - Math.floor(this.cfg.sizeH / 2);

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const speed = this.cfg.dashSpeed;
        const stepX = Math.sign(dx) * Math.min(speed, Math.abs(dx));
        const stepY = Math.sign(dy) * Math.min(speed, Math.abs(dy));

        this.x += stepX;
        this.y += stepY;
        if (Math.abs(dx) >= 1) {
          this.facingRight = dx > 0;
        }
      }
      return;
    }

    // 4. Idle Wandering Behavior
    if (this.pauseTicks > 0) {
      this.pauseTicks--;
      // Sway in place during pause
      this.idleTimer++;
      if (this.idleTimer > 40 && Math.random() < 0.05) {
        this.triggerEmote('zzz');
        this.idleTimer = 0;
      }
      return;
    }

    // Check if reached idle wander target
    const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    if (distToTarget < 3 || Math.random() < 0.04) {
      // Pick new wander target
      const padX = 18;
      const padY = 14;
      this.targetX = Math.floor(padX + Math.random() * (vW - padX * 2 - this.cfg.sizeW));

      // Preferred species depth with natural variance
      const depthY = vH * this.cfg.preferredDepth;
      this.targetY = Math.floor(Math.max(padY, Math.min(vH - 22, depthY + (Math.random() * 32 - 16))));

      // Occasional brief pause
      if (Math.random() < 0.25) {
        this.pauseTicks = Math.floor(2 + Math.random() * 4);
      }
    }

    // Stepped displacement towards wander target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const speed = this.cfg.baseSpeed;

    const stepX = Math.sign(dx) * Math.min(speed, Math.abs(dx));
    const stepY = Math.sign(dy) * Math.min(speed, Math.abs(dy));

    this.x += stepX;
    this.y += stepY;

    if (Math.abs(dx) >= 1) {
      this.facingRight = dx > 0;
    }

    // Soft separation avoidance between companions
    if (otherFish && otherFish.length > 1) {
      for (const other of otherFish) {
        if (other === this) continue;
        const d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < 16 && d > 0) {
          this.x -= Math.sign(other.x - this.x);
          this.y -= Math.sign(other.y - this.y);
        }
      }
    }

    // Clamp inside tank boundaries
    this.x = Math.max(4, Math.min(vW - this.cfg.sizeW - 4, this.x));
    this.y = Math.max(8, Math.min(vH - this.cfg.sizeH - 14, this.y));
  }

  draw(ctx, tank) {
    const palette = tank.palette;

    // Select sprite frame
    let frame = this.spriteData.f0;
    if (this.isChomping && this.spriteData.chomp) {
      frame = this.spriteData.chomp;
    } else if (this.species === 'puffer' && this.isExcited && this.spriteData.inflated) {
      frame = this.spriteData.inflated;
    } else {
      if (this.animFrame === 1) frame = this.spriteData.f1;
      else if (this.animFrame === 3) frame = this.spriteData.f3;
      else frame = this.spriteData.f0;
    }

    // Draw Creature Sprite
    drawPixelMatrix(ctx, frame, Math.floor(this.x), Math.floor(this.y), palette, this.facingRight);

    // Draw Emote Speech Bubble if active
    if (this.currentEmote) {
      this.drawEmoteBubble(ctx, palette);
    }
  }

  drawEmoteBubble(ctx, palette) {
    const glyph = PIXEL_EMOTES[this.currentEmote] || PIXEL_EMOTES['♥'];
    const glyphW = glyph[0].length;
    const glyphH = glyph.length;

    const bubbleW = glyphW + 4;
    const bubbleH = glyphH + 4;

    const bubbleX = Math.floor(this.x + (this.facingRight ? this.cfg.sizeW - 4 : -4) - Math.floor(bubbleW / 2));
    const bubbleY = Math.floor(this.y - bubbleH - 3);

    // Bubble Background (Paper White)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);

    // 1-pixel Ink Border
    ctx.fillStyle = palette.ink1;
    ctx.fillRect(bubbleX, bubbleY, bubbleW, 1);
    ctx.fillRect(bubbleX, bubbleY + bubbleH - 1, bubbleW, 1);
    ctx.fillRect(bubbleX, bubbleY, 1, bubbleH);
    ctx.fillRect(bubbleX + bubbleW - 1, bubbleY, 1, bubbleH);

    // Bubble pointer tail
    ctx.fillRect(bubbleX + Math.floor(bubbleW / 2), bubbleY + bubbleH, 1, 2);

    // Draw Emote Glyph inside bubble
    const gx = bubbleX + 2;
    const gy = bubbleY + 2;
    for (let r = 0; r < glyphH; r++) {
      const line = glyph[r];
      for (let c = 0; c < glyphW; c++) {
        if (line[c] === '#') {
          ctx.fillStyle = palette.ink1;
          ctx.fillRect(gx + c, gy + r, 1, 1);
        }
      }
    }
  }
}

// ============================================================================
// 8. TANK ENVIRONMENT: SWAYING SEAWEED & DITHERED SUBSTRATE
// ============================================================================

class SeaweedStalk {
  constructor(baseX, baseY, heightSegs, phase) {
    this.baseX = baseX;
    this.baseY = baseY;
    this.heightSegs = heightSegs;
    this.phase = phase;
  }

  draw(ctx, palette, tickCount) {
    const segLen = 5;
    let currX = this.baseX;
    let currY = this.baseY;

    // Stepped sine sway: 1-pixel shift every 2 ticks
    const swayBase = Math.floor((tickCount + this.phase) / 2);

    for (let s = 1; s <= this.heightSegs; s++) {
      const swayOffset = Math.round(Math.sin((swayBase + s * 1.5) * 0.45) * (s * 0.45));
      const nextX = this.baseX + swayOffset;
      const nextY = this.baseY - s * segLen;

      // Draw 2-pixel wide stalk
      ctx.fillStyle = palette.ink2;
      ctx.fillRect(nextX, nextY, 2, segLen);

      // Branching pixel leaf fronds
      if (s % 2 === 1 && s < this.heightSegs) {
        const side = (s % 4 === 1) ? 1 : -1;
        const leafX = nextX + (side > 0 ? 2 : -3);
        const leafY = nextY + 1;

        ctx.fillStyle = palette.ink1;
        ctx.fillRect(leafX, leafY, 3, 2);
        ctx.fillStyle = palette.ink3;
        ctx.fillRect(leafX + (side > 0 ? 2 : 0), leafY + 1, 1, 1);
      }

      currX = nextX;
      currY = nextY;
    }
  }
}

// ============================================================================
// 9. MAIN FISH FRIEND TANK CLASS (Ultra-Low Power ESP32 E-Ink Engine)
// ============================================================================
class FishFriendTank {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');

    // Virtual Low-Resolution Grid (Authentic ESP32 E-Paper Resolution)
    this.vWidth = 220;
    this.vHeight = 130;

    // Real DOM Dimensions for Click coordinate scaling
    this.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth || 360 : 360;
    this.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight || 280 : 280;

    // Collections
    this.creatures = [];
    this.foods = [];
    this.bubbles = [];
    this.seaweeds = [];

    // Settings
    this.companionType = 'clownfish';
    this.fishCount = 1;
    this.isLowPower = false;
    this.userActive = false;
    this.userActiveTimer = 0;

    // Tick Timing Engine
    this.tickCount = 0;
    this.timerId = null;
    this.destroyed = false;
    this.palette = getActivePalette();

    // Initialize systems
    this.initCanvas();
    this.initEnvironment();
    this.initCreatures();
    this.bindEvents();
    this.bindVisibility();

    // Start Low-Power Stepped Tick Loop
    this.scheduleNextTick();
  }

  // --------------------------------------------------------------------------
  // Canvas Scaling & Setup
  // --------------------------------------------------------------------------
  initCanvas() {
    this.canvas.width = this.vWidth;
    this.canvas.height = this.vHeight;

    // Force crisp nearest-neighbor retro pixel rendering
    if (this.canvas.style) {
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.imageRendering = 'pixelated';
      this.canvas.style.imageRendering = 'crisp-edges';
    }

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }

    this.resizeHandler = () => this.resize();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.width = parent ? parent.clientWidth || 360 : 360;
    this.height = parent ? parent.clientHeight || 280 : 280;
    this.palette = getActivePalette();
  }

  // --------------------------------------------------------------------------
  // Environment Initialization
  // --------------------------------------------------------------------------
  initEnvironment() {
    this.seaweeds = [];
    // 3 to 4 pixel-art swaying seaweed stalks
    const stalkCount = 4;
    const spacing = Math.floor(this.vWidth / (stalkCount + 1));
    for (let i = 0; i < stalkCount; i++) {
      const baseX = spacing * (i + 1) + (i % 2 === 0 ? -6 : 8);
      const baseY = this.vHeight - 12;
      const heightSegs = 6 + (i % 3);
      this.seaweeds.push(new SeaweedStalk(baseX, baseY, heightSegs, i * 4));
    }
  }

  // --------------------------------------------------------------------------
  // Creature Management
  // --------------------------------------------------------------------------
  initCreatures() {
    this.creatures = [];
    this.syncCreatureCount();
  }

  syncCreatureCount() {
    while (this.creatures.length < this.fishCount) {
      const idx = this.creatures.length;
      let species = this.companionType;
      // Complementary companions when multiple fish enabled
      if (idx === 1) species = (this.companionType === 'koi') ? 'clownfish' : 'koi';
      if (idx === 2) species = (this.companionType === 'axolotl') ? 'turtle' : 'axolotl';

      const posX = 40 + idx * 55;
      const posY = 35 + idx * 25;
      this.creatures.push(new PixelCreature(species, posX, posY, idx));
    }
    while (this.creatures.length > this.fishCount) {
      this.creatures.pop();
    }
    if (this.creatures[0]) {
      this.creatures[0].setSpecies(this.companionType);
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
    this.fishCount = Math.max(1, Math.min(3, parseInt(n, 10) || 1));
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
    // Coordinate scaling: Map client or DOM coordinates to virtual coordinates
    let vx = x;
    let vy = y;

    if (x > this.vWidth || y > this.vHeight) {
      const scaleX = this.vWidth / (this.width || 360);
      const scaleY = this.vHeight / (this.height || 280);
      vx = Math.floor(x * scaleX);
      vy = Math.floor(y * scaleY);
    }

    // Clamp coordinates safely inside tank
    vx = Math.max(8, Math.min(this.vWidth - 8, vx));
    vy = Math.max(6, Math.min(this.vHeight - 20, vy));

    // Spawn 2 to 3 cute pixel food flakes in a cluster
    const flakeCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < flakeCount; i++) {
      if (this.foods.length >= 8) {
        this.foods.shift();
      }
      const offsetX = (i * 3) - 2;
      const offsetY = (i * 2);
      this.foods.push(new PixelFoodFlake(vx + offsetX, vy + offsetY));
    }

    // Spawn 1-2 tiny surface air bubbles from splash
    if (this.bubbles.length < 8) {
      this.bubbles.push(new PixelBubble(vx, Math.max(8, vy)));
    }

    // Wake fish and notify
    this.userActive = true;
    this.userActiveTimer = 24; // 24 ticks of active fast frame rate

    for (const fish of this.creatures) {
      fish.isExcited = true;
      fish.excitedTicks = 16;
      fish.triggerEmote(Math.random() > 0.4 ? '♥' : '!');
    }
  }

  toggleLowPowerMode(bool) {
    this.isLowPower = (bool !== undefined) ? !!bool : !this.isLowPower;
  }

  destroy() {
    this.destroyed = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.resizeHandler && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.visibilityHandler && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // --------------------------------------------------------------------------
  // Event Listeners (Click / Tap to drop food)
  // --------------------------------------------------------------------------
  bindEvents() {
    if (!this.canvas) return;

    const handleInput = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.vWidth / (rect.width || this.vWidth);
      const scaleY = this.vHeight / (rect.height || this.vHeight);

      const vx = Math.floor((clientX - rect.left) * scaleX);
      const vy = Math.floor((clientY - rect.top) * scaleY);
      this.dropFood(vx, vy);
    };

    this.canvas.addEventListener('click', (e) => {
      handleInput(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  bindVisibility() {
    this.visibilityHandler = () => {
      if (typeof document !== 'undefined') {
        if (!document.hidden && !this.destroyed && !this.timerId) {
          this.scheduleNextTick();
        }
      }
    };
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // --------------------------------------------------------------------------
  // Ultra-Low-Power Stepped Tick Loop
  // 4 FPS (250ms) when active -> 2 FPS (500ms) when idle -> 0.0% CPU!
  // --------------------------------------------------------------------------
  scheduleNextTick() {
    if (this.destroyed) return;

    // Check if background tab is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      // Pause or tick at 1000ms in background
      this.timerId = setTimeout(() => {
        this.tick();
        this.scheduleNextTick();
      }, 1000);
      return;
    }

    // Determine active vs idle tick interval
    const hasFood = this.foods.length > 0;
    const isExcited = this.creatures.some(c => c.isExcited || c.isChomping);
    const isActive = hasFood || isExcited || (this.userActiveTimer > 0);

    let interval = 500; // Default Idle: 2 FPS (500ms)
    if (this.isLowPower) {
      interval = 500;
    } else if (isActive) {
      interval = 250; // Active: 4 FPS (250ms)
    }

    this.timerId = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, interval);
  }

  tick() {
    if (this.destroyed) return;
    this.tickCount++;

    if (this.userActiveTimer > 0) {
      this.userActiveTimer--;
      if (this.userActiveTimer === 0) {
        this.userActive = false;
      }
    }

    // Update Palette in case theme changed dynamically
    this.palette = getActivePalette();

    // 1. Update Fish Creatures
    for (const fish of this.creatures) {
      fish.update(this, this.foods, this.creatures);
    }

    // 2. Update Food Flakes
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const alive = this.foods[i].update(this.vHeight, this.tickCount);
      if (!alive) {
        this.foods.splice(i, 1);
      }
    }

    // 3. Ambient Rising Pixel Bubbles from substrate
    if (this.bubbles.length < 5 && Math.random() < 0.12) {
      const pebbleX = 20 + Math.floor(Math.random() * (this.vWidth - 40));
      this.bubbles.push(new PixelBubble(pebbleX, this.vHeight - 14));
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const alive = this.bubbles[i].update(this.tickCount);
      if (!alive) {
        this.bubbles.splice(i, 1);
      }
    }

    // Render Tank Frame
    this.draw();
  }

  // --------------------------------------------------------------------------
  // Pixel Art Rendering Pipeline
  // --------------------------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    const p = this.palette;
    const vw = this.vWidth;
    const vh = this.vHeight;

    // 1. Clear Screen with E-Paper Background
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, vw, vh);

    // 2. Top Water Surface Dashed Line
    ctx.fillStyle = p.ink3;
    for (let x = 0; x < vw; x += 6) {
      const shift = ((this.tickCount + Math.floor(x / 12)) % 2 === 0) ? 1 : 0;
      ctx.fillRect(x, 4 + shift, 3, 1);
    }

    // 3. Swaying Seaweed Stalks
    for (const seaweed of this.seaweeds) {
      seaweed.draw(ctx, p, this.tickCount);
    }

    // 4. Dithered Sand Bed Substrate (Halftone 2x2 Bayer Dither)
    this.drawDitheredGravel(ctx, p, vw, vh);

    // 5. Food Flakes
    for (const food of this.foods) {
      food.draw(ctx, p);
    }

    // 6. Fish Creatures & Emotes
    for (const fish of this.creatures) {
      fish.draw(ctx, this);
    }

    // 7. Rising Bubbles
    for (const b of this.bubbles) {
      b.draw(ctx, p);
    }

    // 8. Crisp E-Paper Display Bezel Border
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, vw - 1, vh - 1);
  }

  drawDitheredGravel(ctx, p, vw, vh) {
    const bedHeight = 12;
    const startY = vh - bedHeight;

    // Checkerboard Bayer dither pattern for classic E-Paper substrate
    ctx.fillStyle = p.ink3;
    for (let y = startY; y < vh; y++) {
      for (let x = 0; x < vw; x++) {
        // Upper gravel bed: 25% dither dots
        if (y < startY + 4) {
          if (x % 3 === 0 && y % 2 === 0) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        // Mid gravel bed: 50% halftone checkerboard
        else if (y < startY + 8) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        // Lower seabed: dense halftone
        else {
          if ((x % 2 === 0) || ((x + y) % 2 === 0)) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    // Scattered 3x2 dark pixel pebbles on seabed
    const pebbles = [
      { x: 18, y: vh - 6 },
      { x: 55, y: vh - 8 },
      { x: 92, y: vh - 5 },
      { x: 130, y: vh - 7 },
      { x: 168, y: vh - 6 },
      { x: 202, y: vh - 8 }
    ];

    ctx.fillStyle = p.ink1;
    for (const peb of pebbles) {
      ctx.fillRect(peb.x, peb.y, 4, 2);
      ctx.fillRect(peb.x + 1, peb.y - 1, 2, 1);
      // Tiny pebble top highlight
      ctx.fillStyle = p.white;
      ctx.fillRect(peb.x + 1, peb.y - 1, 1, 1);
      ctx.fillStyle = p.ink1;
    }
  }
}

// Global Export for browser & Electron context
if (typeof window !== 'undefined') {
  window.FishFriendTank = FishFriendTank;
  window.SPECIES_CONFIG = SPECIES_CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FishFriendTank;
}
