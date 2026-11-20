/**
 * WIDGET MANAGEMENT ENGINE
 * Complete widget catalog, customization, sizing, and dynamic rendering.
 * Inspired by iOS 18, macOS Sonoma, and modern desktop widgets.
 */

const WIDGET_CATALOG = [
  {
    id: 'fish-tank',
    name: 'Fish Friend Habitat 🐟',
    category: 'Creature Companion',
    description: 'Charming desktop fish companion with feeding interaction and gentle aquatic physics.',
    icon: '🐠',
    defaultSize: 'large',
    sizesAvailable: ['medium', 'large', 'full'],
  },
  {
    id: 'ios-clock',
    name: 'iOS 18 Standby Clock',
    category: 'Time & Date',
    description: 'Large typographic glowing clock with seconds tick and calendar date.',
    icon: '⏰',
    defaultSize: 'medium',
    sizesAvailable: ['small', 'medium'],
  },
  {
    id: 'system-telemetry',
    name: 'Hardware Telemetry (macOS)',
    category: 'System Performance',
    description: 'Precision circular gauges for CPU, RAM, GPU, and SSD storage.',
    icon: '📈',
    defaultSize: 'medium',
    sizesAvailable: ['medium', 'large'],
  },
  {
    id: 'arch-waybar-status',
    name: 'Compact Status Pill',
    category: 'Telemetry Pill',
    description: 'Ultra-dense minimalist status pill with live CPU, RAM, network, and storage indicators.',
    icon: '📊',
    defaultSize: 'compact',
    sizesAvailable: ['compact'],
  },
  {
    id: 'ios-weather',
    name: 'Dynamic iOS Weather',
    category: 'Weather & Sky',
    description: 'Animated sky gradients, live temperature, humidity, wind, and 5-day forecast.',
    icon: '⛅',
    defaultSize: 'medium',
    sizesAvailable: ['medium', 'large'],
  },
  {
    id: 'dynamic-music',
    name: 'Dynamic Music Player',
    category: 'Media & Audio',
    description: 'Windows Media Session player with live album art, progress bar, and playback controls.',
    icon: '🎵',
    defaultSize: 'medium',
    sizesAvailable: ['medium'],
  },
  {
    id: 'macro-deck',
    name: 'Mac Control Center Macro Deck',
    category: 'Quick Actions',
    description: 'Stream Deck style touch tiles: Mute Mic, Volume, Screenshot, Task Manager.',
    icon: '🎛️',
    defaultSize: 'medium',
    sizesAvailable: ['medium'],
  },
  {
    id: 'model-rotator',
    name: 'AI Model Rotator HUD',
    category: 'AI Assistant',
    description: 'Rotate and switch between Gemini, Claude, GPT-4o, DeepSeek, and Ollama.',
    icon: '🔄',
    defaultSize: 'compact',
    sizesAvailable: ['compact', 'medium'],
  },
  {
    id: 'pomodoro',
    name: 'Focus Pomodoro Timer',
    category: 'Productivity',
    description: '25-minute focus session with circular countdown progress and audio chime.',
    icon: '⏳',
    defaultSize: 'compact',
    sizesAvailable: ['compact', 'medium'],
  },
  {
    id: 'quick-notes',
    name: 'Quick Desk Sticky Notes',
    category: 'Productivity',
    description: 'Persistent markdown scratchpad directly on your secondary screen.',
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
      'fish-tank',
      'ios-clock',
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
                <span>🐟</span>
                <span id="fish-friend-name">Lottie the Pink Axolotl</span>
              </div>
              <div class="tank-prompt-sub">
                <span>Tap water to drop flakes</span>
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
              <span class="caelestia-clock-time" id="ios-hours-mins">12:00</span>
              <span class="caelestia-clock-secs" id="ios-seconds">:00</span>
            </div>
            <div class="caelestia-clock-meta">
              <div class="caelestia-date-chip" id="ios-date-string">WEDNESDAY, NOV 20</div>
              <div class="caelestia-day-chip">SECONDARY DISPLAY</div>
            </div>
          </div>
        `;
        break;

      case 'system-telemetry':
        wrapper.innerHTML = `
          <div class="btop-telemetry-container">
            <div class="widget-card-header">
              <span class="widget-pill-badge">⚡ HARDWARE TELEMETRY</span>
              <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-green);">● LIVE</span>
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
                <span>RAM USAGE</span>
                <span class="btop-metric-val" id="tel-mem-val">8.4G / 16.0G (52%)</span>
              </div>
              <div class="btop-bar-track">
                <div class="btop-bar-fill fill-mauve" id="tel-mem-bar" style="width: 52%;"></div>
              </div>
            </div>
            <div class="btop-metric-row">
              <div class="btop-metric-header">
                <span>SSD STORAGE (C:)</span>
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
          <div class="caelestia-waybar-cluster">
            <span class="cael-chip chip-cyan">● STATUS</span>
            <span class="cael-chip" id="wb-cpu"> 14%</span>
            <span class="cael-chip chip-mauve" id="wb-mem">󰍛 8.4G</span>
            <span class="cael-chip chip-green" id="wb-net">󰖩 ▲24K ▼140K</span>
            <span class="cael-chip chip-peach" id="wb-disk">󰋊 46%</span>
          </div>
        `;
        break;

      case 'ios-weather':
        wrapper.innerHTML = `
          <div class="caelestia-weather-card">
            <div>
              <div class="weather-loc-tag">Hanoi, Vietnam</div>
              <div class="weather-temp-big" id="weather-temp">24°</div>
            </div>
            <div>
              <div class="weather-condition-pill" id="weather-cond">Partly Cloudy ⛅</div>
              <div class="weather-range-pill">H: 28° · L: 21°</div>
            </div>
          </div>
        `;
        break;

      case 'dynamic-music':
        wrapper.innerHTML = `
          <div class="caelestia-music-card macos-music-card">
            <div class="music-card-header">
              <span class="widget-pill-badge">󰎈 NOW PLAYING</span>
              <span id="music-status-badge" class="music-live-badge badge-idle">● IDLE</span>
            </div>
            <div class="music-main-body">
              <div class="music-album-art-wrap" id="music-art-wrap">
                <img id="music-album-img" class="music-album-img" src="" alt="Album Art" style="display: none;" />
                <div id="music-album-fallback" class="music-album-fallback">
                  <svg class="music-fallback-svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                  </button>
                  <button class="music-ctrl-btn music-play-btn" id="btn-music-play" title="Play/Pause" aria-label="Play or Pause">
                    <svg id="music-play-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg id="music-pause-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="display: none;">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                  <button class="music-ctrl-btn" id="btn-music-next" title="Next Track" aria-label="Next Track">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                    </svg>
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
              <span>Mute Mic</span>
            </button>
            <button class="caelestia-macro-btn" onclick="alert('Audio Muted')">
              <span class="macro-icon">󰕾</span>
              <span>Volume</span>
            </button>
            <button class="caelestia-macro-btn" id="tile-feed-fish">
              <span class="macro-icon">🐟</span>
              <span>Feed Fish</span>
            </button>
            <button class="caelestia-macro-btn" onclick="window.api?.openControlCenter ? window.api.openControlCenter() : null">
              <span class="macro-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        `;
        break;

      case 'model-rotator':
        wrapper.innerHTML = `
          <div class="caelestia-rotator-card">
            <div>
              <div class="widget-pill-badge" style="color: var(--accent-mauve);">󰚩 AI MODEL</div>
              <div class="rotator-name-label" id="hud-model-name">Gemini 2.0 Flash</div>
            </div>
            <button class="waybar-chip-btn" id="btn-quick-rotate-hud">↻ Rotate</button>
          </div>
        `;
        break;

      case 'pomodoro':
        wrapper.innerHTML = `
          <div class="caelestia-rotator-card">
            <div>
              <div class="widget-pill-badge">󰔚 POMODORO</div>
              <div class="caelestia-clock-time" style="font-size: 26px;" id="pomo-display">25:00</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="waybar-chip-btn" id="pomo-toggle">Start</button>
              <button class="waybar-chip-btn" id="pomo-reset">Reset</button>
            </div>
          </div>
        `;
        break;

      case 'quick-notes':
        wrapper.innerHTML = `
          <div>
            <div class="widget-card-header">
              <span class="widget-pill-badge">󰏫 DESK SCRATCHPAD</span>
            </div>
            <textarea class="caelestia-notes-box" placeholder="Quick notes, commands, todo..."></textarea>
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
      window.fishTankInstance = new FishFriendTank('fish-tank-canvas');
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

    // 3. Initialize spectrum bars if present
    const specContainer = document.getElementById('music-spectrum-bars');
    if (specContainer) {
      specContainer.innerHTML = '';
      for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'spectrum-bar';
        specContainer.appendChild(bar);
      }
      this.animateSpectrum();
    }
  }

  animateSpectrum() {
    if (this.spectrumAnimId) cancelAnimationFrame(this.spectrumAnimId);
    let phase = 0;
    const update = () => {
      const bars = document.querySelectorAll('.spectrum-bar');
      if (bars.length === 0) return;
      phase += 0.08;
      bars.forEach((bar, i) => {
        const h = (Math.sin(phase + i * 0.4) * 0.5 + 0.5) * 16 + 3;
        bar.style.height = `${h}px`;
      });
      this.spectrumAnimId = requestAnimationFrame(update);
    };
    this.spectrumAnimId = requestAnimationFrame(update);
  }
}
