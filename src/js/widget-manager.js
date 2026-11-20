/**
 * WIDGET MANAGEMENT ENGINE — AUTHENTIC ESP32 E-INK / E-PAPER EDITION
 * Microcontroller aesthetic, zero continuous repaints, stepped telemetry meters.
 */

const WIDGET_CATALOG = [
  {
    id: 'arch-waybar-status',
    name: 'ESP32 Status & Power Header',
    category: 'ESP32 System',
    description: 'Hardware status strip displaying ESP32-S3 model, AC/battery power, and refresh rate.',
    icon: '⚡',
    defaultSize: 'compact',
    sizesAvailable: ['compact'],
  },
  {
    id: 'fish-tank',
    name: 'ESP32 Companion Habitat 🐟',
    category: 'Creature Companion',
    description: 'Physical mini E-Ink screen frame with interactive creature companion.',
    icon: '🐟',
    defaultSize: 'large',
    sizesAvailable: ['medium', 'large', 'full'],
  },
  {
    id: 'ios-clock',
    name: 'E-Ink RTC Monospace Clock',
    category: 'Time & Date',
    description: 'Segmented pixel-styled digital clock with capitalized e-paper date string.',
    icon: '⏰',
    defaultSize: 'medium',
    sizesAvailable: ['small', 'medium'],
  },
  {
    id: 'system-telemetry',
    name: 'Stepped Hardware Telemetry',
    category: 'System Performance',
    description: 'Microcontroller LCD stepped block meters for CPU, SRAM/DRAM, and Flash ROM.',
    icon: '📊',
    defaultSize: 'medium',
    sizesAvailable: ['medium', 'large'],
  },
  {
    id: 'ios-weather',
    name: 'E-Paper Weather Capsule',
    category: 'Weather & Sky',
    description: 'Crisp 1-bit/2-bit weather icons and stepped temperature with barometer readout.',
    icon: '⛅',
    defaultSize: 'medium',
    sizesAvailable: ['medium', 'large'],
  },
  {
    id: 'dynamic-music',
    name: 'E-Ink Media Player',
    category: 'Media & Audio',
    description: 'Minimalist e-ink media card with tactile 1-bit buttons and stepped progress bar.',
    icon: '🎵',
    defaultSize: 'medium',
    sizesAvailable: ['medium'],
  },
  {
    id: 'macro-deck',
    name: 'Tactile Macro Keypad',
    category: 'Quick Actions',
    description: 'Hardware tactile buttons for Mute Mic, Volume, Feed Fish, and Settings.',
    icon: '🎛️',
    defaultSize: 'medium',
    sizesAvailable: ['medium'],
  },
  {
    id: 'model-rotator',
    name: 'AI Co-Processor HUD',
    category: 'AI Assistant',
    description: 'Rotate between Gemini, Claude, GPT-4o, DeepSeek, and local LLMs.',
    icon: '🔄',
    defaultSize: 'compact',
    sizesAvailable: ['compact', 'medium'],
  },
  {
    id: 'pomodoro',
    name: 'Focus Pomodoro Timer',
    category: 'Productivity',
    description: 'Crisp segmented countdown for 25-minute deep work focus intervals.',
    icon: '⏳',
    defaultSize: 'compact',
    sizesAvailable: ['compact', 'medium'],
  },
  {
    id: 'quick-notes',
    name: 'E-Paper Scratchpad Notes',
    category: 'Productivity',
    description: 'Kindle/reMarkable style scratchpad for commands, pins, and quick memos.',
    icon: '📝',
    defaultSize: 'medium',
    sizesAvailable: ['medium', 'large'],
  },
];

class WidgetManager {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('widget-container') || document.getElementById('bento-widget-container');
    this.activeWidgets = options.activeWidgets || [
      'arch-waybar-status',
      'ios-clock',
      'fish-tank',
      'system-telemetry',
      'ios-weather',
      'dynamic-music',
      'macro-deck',
      'model-rotator',
    ];
    this.widgetSizes = options.widgetSizes || {};
    this.onChanged = options.onChanged || (() => {});
    this.isEditMode = false;
  }

  setWidgets(activeList, sizes = {}) {
    this.activeWidgets = activeList;
    this.widgetSizes = sizes;
    this.render();
  }

  addWidget(id) {
    if (!this.activeWidgets.includes(id)) {
      this.activeWidgets.push(id);
      this.render();
      this.onChanged(this.activeWidgets, this.widgetSizes);
    }
  }

  removeWidget(id) {
    this.activeWidgets = this.activeWidgets.filter(w => w !== id);
    this.render();
    this.onChanged(this.activeWidgets, this.widgetSizes);
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const cards = document.querySelectorAll('.widget-card');
    cards.forEach(card => {
      card.classList.toggle('edit-mode', this.isEditMode);
    });
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.activeWidgets.forEach((id) => {
      const def = WIDGET_CATALOG.find(w => w.id === id);
      if (!def) return;

      const size = this.widgetSizes[id] || def.defaultSize;
      const el = document.createElement('div');
      el.className = `widget-card widget-size-${size} ${this.isEditMode ? 'edit-mode' : ''}`;
      el.setAttribute('data-widget-id', id);

      // Delete badge in edit mode
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'widget-delete-btn';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Remove Widget';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeWidget(id);
      });
      el.appendChild(deleteBtn);

      // Render Widget Content
      const content = this.renderWidgetTemplate(id);
      el.appendChild(content);

      this.container.appendChild(el);
    });

    // Re-initialize dynamic widgets
    this.initDynamicWidgets();
  }

  renderWidgetTemplate(id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-inner-content';

    switch (id) {
      case 'fish-tank':
        wrapper.innerHTML = `
          <div class="caelestia-tank-wrapper">
            <div class="widget-card-header">
              <div class="widget-pill-badge">
                <span>ESP32 COMPANION 🐟</span>
                <span style="opacity: 0.5;">//</span>
                <span id="fish-friend-name">Lottie the Pink Axolotl</span>
              </div>
              <div class="tank-prompt-sub">
                <span>[CLICK WATER TO FEED]</span>
              </div>
            </div>
            <div class="caelestia-tank-viewport">
              <canvas id="fish-tank-canvas"></canvas>
            </div>
          </div>
        `;
        break;

      case 'ios-clock':
        wrapper.innerHTML = `
          <div class="caelestia-clock-widget">
            <div>
              <div style="font-family: var(--font-mono); font-size: 9px; color: var(--text-dim); margin-bottom: 2px;">
                ESP32-RTC // CH340
              </div>
              <div>
                <span class="caelestia-clock-time" id="ios-hours-mins">12:00</span>
                <span class="caelestia-clock-secs" id="ios-seconds">:00</span>
              </div>
            </div>
            <div class="caelestia-clock-meta">
              <div class="caelestia-date-chip" id="ios-date-string">WEDNESDAY, 20 NOV</div>
              <div class="caelestia-day-chip">[SYNC: RTC-NTP] [1.0 Hz]</div>
            </div>
          </div>
        `;
        break;

      case 'system-telemetry':
        wrapper.innerHTML = `
          <div class="btop-telemetry-container">
            <div class="widget-card-header">
              <span class="widget-pill-badge">ESP32 TELEMETRY // SOC MON</span>
              <span style="font-family: var(--font-mono); font-size: 9px; color: var(--text-dim);">[■ LIVE]</span>
            </div>
            <div class="btop-metric-row">
              <div class="btop-metric-header">
                <span>CPU LOAD</span>
                <span class="btop-metric-val" id="tel-cpu-val">15%</span>
              </div>
              <div class="btop-bar-track">
                <div class="btop-bar-fill fill-cyan" id="tel-cpu-bar" style="width: 15%;"></div>
              </div>
            </div>
            <div class="btop-metric-row">
              <div class="btop-metric-header">
                <span>SRAM / DRAM</span>
                <span class="btop-metric-val" id="tel-mem-val">8.4G / 16.0G (52%)</span>
              </div>
              <div class="btop-bar-track">
                <div class="btop-bar-fill fill-mauve" id="tel-mem-bar" style="width: 52%;"></div>
              </div>
            </div>
            <div class="btop-metric-row">
              <div class="btop-metric-header">
                <span>FLASH ROM (C:)</span>
                <span class="btop-metric-val" id="tel-disk-val">114G / 249G (46%)</span>
              </div>
              <div class="btop-bar-track">
                <div class="btop-bar-fill fill-green" id="tel-disk-bar" style="width: 46%;"></div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'arch-waybar-status':
        wrapper.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 9px; color: var(--text-sub);">
              <span>ESP32-S3 // E-INK DISPLAY</span>
              <span>[PWR: AC] [4 FPS]</span>
            </div>
            <div class="caelestia-waybar-cluster">
              <span class="cael-chip" id="wb-cpu">CPU: 14%</span>
              <span class="cael-chip" id="wb-mem">RAM: 8.4G</span>
              <span class="cael-chip" id="wb-net">NET: ▲24K ▼140K</span>
              <span class="cael-chip" id="wb-disk">ROM: 46%</span>
            </div>
          </div>
        `;
        break;

      case 'ios-weather':
        wrapper.innerHTML = `
          <div class="caelestia-weather-card">
            <div>
              <div class="weather-loc-tag">HANOI // 21.02°N 105.85°E</div>
              <div class="weather-temp-big" id="weather-temp">24°C</div>
            </div>
            <div>
              <div class="weather-condition-pill" id="weather-cond">[PARTLY CLOUDY] ⛅</div>
              <div class="weather-range-pill">H: 28° · L: 21° · BARO: 1013hPa</div>
            </div>
          </div>
        `;
        break;

      case 'dynamic-music':
        wrapper.innerHTML = `
          <div class="caelestia-music-card macos-music-card">
            <div class="music-card-header">
              <span class="widget-pill-badge">ESP32-DAC // AUDIO</span>
              <span id="music-status-badge" class="music-live-badge badge-idle">[IDLE]</span>
            </div>
            <div class="music-main-body">
              <div class="music-album-art-wrap" id="music-art-wrap">
                <img id="music-album-img" class="music-album-img" src="" alt="Album Art" style="display: none;" />
                <div id="music-album-fallback" class="music-album-fallback">
                  <svg class="music-fallback-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
              </div>
              <div class="music-info-meta">
                <div class="music-title-text" id="music-title" title="No media playing">No Media Playing</div>
                <div class="music-artist-text" id="music-artist">Windows Media Session</div>
                <div class="music-controls">
                  <button class="music-ctrl-btn" id="btn-music-prev" title="Previous Track" aria-label="Previous Track">
                    ◀◀
                  </button>
                  <button class="music-ctrl-btn music-play-btn" id="btn-music-play" title="Play/Pause" aria-label="Play or Pause">
                    <span id="music-play-icon">▶</span>
                    <span id="music-pause-icon" style="display: none;">❚❚</span>
                  </button>
                  <button class="music-ctrl-btn" id="btn-music-next" title="Next Track" aria-label="Next Track">
                    ▶▶
                  </button>
                </div>
              </div>
            </div>
            <div class="music-progress-section">
              <div class="music-progress-bar">
                <div class="music-progress-fill" id="music-progress-fill" style="width: 0%;"></div>
              </div>
              <div class="music-time-row">
                <span class="music-time-text" id="music-current-time">0:00</span>
                <span class="music-time-text" id="music-total-time">0:00</span>
              </div>
            </div>
          </div>
        `;
        break;

      case 'macro-deck':
        wrapper.innerHTML = `
          <div class="caelestia-macro-grid">
            <button class="caelestia-macro-btn" onclick="alert('Microphone Muted')">
              <span class="macro-icon">󰝟</span>
              <span>[MIC MUTE]</span>
            </button>
            <button class="caelestia-macro-btn" onclick="alert('Audio Muted')">
              <span class="macro-icon">󰕾</span>
              <span>[VOLUME]</span>
            </button>
            <button class="caelestia-macro-btn" id="tile-feed-fish">
              <span class="macro-icon">🐟</span>
              <span>[FEED 🐟]</span>
            </button>
            <button class="caelestia-macro-btn" onclick="window.api?.openControlCenter ? window.api.openControlCenter() : null">
              <span class="macro-icon">⚙️</span>
              <span>[CONFIG]</span>
            </button>
          </div>
        `;
        break;

      case 'model-rotator':
        wrapper.innerHTML = `
          <div class="caelestia-rotator-card">
            <div>
              <div class="widget-pill-badge">ESP32-AI // CO-PROC</div>
              <div class="rotator-name-label" id="hud-model-name">Gemini 2.0 Flash</div>
            </div>
            <button class="waybar-chip-btn" id="btn-quick-rotate-hud">[ ↻ ROTATE ]</button>
          </div>
        `;
        break;

      case 'pomodoro':
        wrapper.innerHTML = `
          <div class="caelestia-rotator-card">
            <div>
              <div class="widget-pill-badge">TIMER // FOCUS</div>
              <div class="caelestia-clock-time" style="font-size: 26px;" id="pomo-display">25:00</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="waybar-chip-btn" id="pomo-toggle">[ START ]</button>
              <button class="waybar-chip-btn" id="pomo-reset">[ RESET ]</button>
            </div>
          </div>
        `;
        break;

      case 'quick-notes':
        wrapper.innerHTML = `
          <div>
            <div class="widget-card-header">
              <span class="widget-pill-badge">E-PAPER // SCRATCHPAD</span>
            </div>
            <textarea class="caelestia-notes-box" placeholder="Write persistent notes, commands, pinout..."></textarea>
          </div>
        `;
        break;
    }

    return wrapper;
  }

  initDynamicWidgets() {
    // 1. Initialize Fish Tank if present
    const fishCanvas = document.getElementById('fish-tank-canvas');
    if (fishCanvas) {
      if (window.fishTankInstance && window.fishTankInstance.destroy) {
        window.fishTankInstance.destroy();
      }
      if (typeof FishFriendTank !== 'undefined') {
        window.fishTankInstance = new FishFriendTank('fish-tank-canvas');
      }
      const feedBtn = document.getElementById('tile-feed-fish');
      if (feedBtn) {
        feedBtn.addEventListener('click', () => {
          if (window.fishTankInstance) {
            window.fishTankInstance.dropFood(
              window.fishTankInstance.width * 0.5,
              window.fishTankInstance.height * 0.3
            );
          }
        });
      }
    }

    // 2. Initialize Music Player Controls
    const btnPlay = document.getElementById('btn-music-play');
    const btnPrev = document.getElementById('btn-music-prev');
    const btnNext = document.getElementById('btn-music-next');

    const controlApi = (window.electronAPI && window.electronAPI.controlMediaSession)
      ? window.electronAPI.controlMediaSession
      : (window.api && window.api.controlMediaSession ? window.api.controlMediaSession : null);

    if (controlApi) {
      if (btnPlay) {
        btnPlay.onclick = async (e) => {
          e.stopPropagation();
          await controlApi('playpause');
          if (window.refreshMediaSession) window.refreshMediaSession();
        };
      }
      if (btnPrev) {
        btnPrev.onclick = async (e) => {
          e.stopPropagation();
          await controlApi('previous');
          if (window.refreshMediaSession) window.refreshMediaSession();
        };
      }
      if (btnNext) {
        btnNext.onclick = async (e) => {
          e.stopPropagation();
          await controlApi('next');
          if (window.refreshMediaSession) window.refreshMediaSession();
        };
      }
    }
  }
}
