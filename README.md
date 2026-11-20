# ✨ ScreenPal — Secondary Screen Companion

An ultra-aesthetic, zero-lag desktop companion designed for multi-monitor setups and portrait/vertical secondary screens (e.g., 768x1360 displays). Built with a refined **macOS glassmorphic aesthetic**, an interactive **pixel-art fish tank AI**, a **real-time Windows media player**, and a decoupled **live wallpaper engine**.

[![GitHub Repository](https://img.shields.io/badge/GitHub-kaitopenguin%2Fscreenpal-181717?style=flat&logo=github)](https://github.com/kaitopenguin/screenpal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows_10%2F11-0078D6?logo=windows)](https://github.com/kaitopenguin/screenpal)

---

## 🌟 Key Features

### 1. 🪟 macOS Glassmorphic Aesthetic
- **Floating Island Architecture**: Clean, floating squircle panels (`16px - 22px` corner radii) with deep backdrop blur (`backdrop-filter: blur(32px) saturate(200%)`) and subtle soft shadows.
- **Top Menu Bar**: macOS-inspired top status bar with live status indicators, quick control triggers, and clean tooltips.
- **7 Curated Color Themes**: Catppuccin Sherbet, Tokyo Night, Amberbyte, Blueberry, Rosé Pine, Gruvbox Material, and Nordic Frost.

### 2. 🐟 Interactive Fish Friend Habitat
- **Craig Reynolds Boids Simulation**: Smooth, natural curved swimming paths with separation, wander noise, and soft boundary avoidance.
- **5 Creature Companions**:
  - **Nemo (Clownfish)**: Energetic, darting movements with classic orange/white stripes.
  - **Kohaku (Japanese Koi)**: Majestic gliding motion with gold and crimson hues.
  - **Lottie (Pink Axolotl)**: Cute bottom-dweller that roams the substrate.
  - **Puffy (Pufferfish)**: Round, cautious companion that puffs up when excited.
  - **Aurelia (Bioluminescent Jellyfish)**: Rhythmic pulsing bell and drifting tendrils.
- **Physics-Based Feeding**: Click anywhere in the aquarium to drop sinking food flakes with water drag and drift. Companions detect food, dash to eat, and celebrate with bubble bursts and emojis (`♥`, `^w^`, `Nom!`).

### 3. 🎵 Windows Media Session (Music Player)
- **Native WinRT Integration**: Real-time media telemetry via Windows `GlobalSystemMediaTransportControlsSessionManager`.
- **Album Artwork & Track Info**: Displays real album art (with smooth gradient fallback), track title, and artist name.
- **Interactive Controls**: Play/Pause, Next Track, and Previous Track buttons.
- **Live Progress Bar**: Thin 4px progress indicator with real-time elapsed and total duration timestamps.

### 4. 🪟 Side-Docking Flexibility
- **Dock Left**: Neatly anchors a 360px companion dock to the left edge of your secondary monitor.
- **Dock Right**: Anchors the dock to the right edge.
- **Full Width**: Expands widgets to occupy the entire secondary screen width.
- **Always-on-Top**: Toggle pin mode to keep your companion visible while working or gaming.

### 5. 🎬 Decoupled Live Wallpaper Engine
- Independent layer operating behind all desktop windows.
- Run live wallpapers on any monitor without rendering widgets, or vice-versa.
- Hardware-accelerated GPU playback for 4K 60FPS video (`.mp4`, `.webm`, `.mkv`).

### 6. ⚡ Zero-Lag Telemetry Engine
- 100% native Node.js and V8 C++ telemetry (`os.cpus()`, `os.totalmem()`, `os.freemem()`).
- Near-zero CPU overhead with microsecond-precision hardware monitoring (CPU, RAM, SSD, Network).

---

## 🚀 Quick Start

### Option 1: One-Click Launcher
Double-click `Launch-Multiscreen-Tool.bat` in the root folder. It automatically runs the packaged executable or local engine.

### Option 2: Pre-built Binary
Run the standalone portable binary at:
```text
dist\multiscreen-tool-win32-x64\multiscreen-tool.exe
```

### Option 3: Run from Source
```bash
# Clone the repository
git clone https://github.com/kaitopenguin/screenpal.git
cd screenpal

# Install dependencies
npm install

# Start ScreenPal
npm start
```

---

## 🛠️ Tech Stack

- **Framework**: Electron (Node.js + Chromium)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D, CSS3 Glassmorphism
- **Telemetry & Media**: Windows Media WinRT API, Node.js OS/FS APIs
- **Repository**: [https://github.com/kaitopenguin/screenpal](https://github.com/kaitopenguin/screenpal)

---

## 📜 License

MIT License. Designed and maintained by [kaitopenguin](https://github.com/kaitopenguin).
