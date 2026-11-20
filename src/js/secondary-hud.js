/**
 * SCREENPAL - SECONDARY HUD CONTROLLER
 * macOS floating island design, 7 visual themes, zero-lag 60fps telemetry.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let config = {};
  try {
    config = await window.api.getConfig();
  } catch (err) {
    console.error('Config fetch error:', err);
  }

  // 1. Theme Management (7 Visual Themes)
  const validThemes = ['catppuccin', 'tokyonight', 'amberbyte', 'blueberry', 'rosepine', 'gruvbox', 'nordic'];
  function applyTheme(themeName) {
    // Map legacy names if any
    let active = themeName;
    if (active === 'arch') active = 'catppuccin';
    if (active === 'retro') active = 'amberbyte';
    if (active === 'modern' || active === 'frutiger') active = 'blueberry';
    if (!validThemes.includes(active)) active = 'catppuccin';

    document.body.className = `theme-${active}`;

    const themeSelect = document.getElementById('hud-theme-select');
    if (themeSelect) themeSelect.value = active;

    const brandTag = document.getElementById('header-brand-tag');
    if (brandTag) {
      brandTag.textContent = '✦ SCREENPAL';
    }
  }
  applyTheme(config.theme || 'catppuccin');

  const themeSelect = document.getElementById('hud-theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      applyTheme(selected);
      await window.api.setTheme(selected);
    });
  }

  // 2. Docking Side Controls
  const btnDockLeft = document.getElementById('btn-dock-left');
  const btnDockRight = document.getElementById('btn-dock-right');
  const btnDockFull = document.getElementById('btn-dock-full');

  if (btnDockLeft) btnDockLeft.addEventListener('click', () => window.api.setDockMode('left'));
  if (btnDockRight) btnDockRight.addEventListener('click', () => window.api.setDockMode('right'));
  if (btnDockFull) btnDockFull.addEventListener('click', () => window.api.setDockMode('full'));

  // 3. Initialize Modular Widget Manager
  const widgetContainer = document.getElementById('bento-widget-container');
  const widgetMgr = new WidgetManager({
    container: widgetContainer,
    activeWidgets: config.activeWidgets || [
      'arch-waybar-status',
      'ios-clock',
      'fish-tank',
      'system-telemetry',
      'ios-weather',
      'dynamic-music',
      'macro-deck',
      'model-rotator',
    ],
    widgetSizes: config.widgetSizes || {},
    onChanged: async (activeList, sizes) => {
      config.activeWidgets = activeList;
      config.widgetSizes = sizes;
      await window.api.saveConfig(config);
    },
  });
  widgetMgr.render();

  // Set initial fish companion
  if (window.fishTankInstance && config.activeCreatureModel) {
    window.fishTankInstance.setCompanion(config.activeCreatureModel);
  }

  // 4. Digital Clock Ticker
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    const hmEl = document.getElementById('ios-hours-mins');
    const secEl = document.getElementById('ios-seconds');
    if (hmEl) hmEl.textContent = `${hours}:${mins}`;
    if (secEl) secEl.textContent = `:${secs}`;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    const dateEl = document.getElementById('ios-date-string');
    if (dateEl) dateEl.textContent = dateStr;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 5. Telemetry Updates (Native C++ V8 Engine)
  window.api.onTelemetry((stats) => {
    // Top Navigation Quick Chips
    const hdrCpu = document.getElementById('hdr-cpu-chip');
    const hdrMem = document.getElementById('hdr-mem-chip');
    if (hdrCpu) hdrCpu.textContent = ` ${stats.cpu.usagePercent}%`;
    if (hdrMem) hdrMem.textContent = `󰍛 ${stats.memory.usedGb}G`;

    // Btop Horizontal Progress Bars
    const cpuVal = document.getElementById('tel-cpu-val');
    const cpuBar = document.getElementById('tel-cpu-bar');
    if (cpuVal) cpuVal.textContent = `${stats.cpu.usagePercent}% (${stats.cpu.speedGhz} GHz)`;
    if (cpuBar) cpuBar.style.width = `${Math.min(100, Math.max(0, stats.cpu.usagePercent))}%`;

    const memVal = document.getElementById('tel-mem-val');
    const memBar = document.getElementById('tel-mem-bar');
    if (memVal) memVal.textContent = `${stats.memory.usedGb}G / ${stats.memory.totalGb}G (${stats.memory.percent}%)`;
    if (memBar) memBar.style.width = `${Math.min(100, Math.max(0, stats.memory.percent))}%`;

    const diskVal = document.getElementById('tel-disk-val');
    const diskBar = document.getElementById('tel-disk-bar');
    if (diskVal) diskVal.textContent = `${stats.disk.usedGb}G / ${stats.disk.totalGb}G (${stats.disk.percent}%)`;
    if (diskBar) diskBar.style.width = `${Math.min(100, Math.max(0, stats.disk.percent))}%`;

    // Compact Status Pill Cluster
    const wbCpu = document.getElementById('wb-cpu');
    const wbMem = document.getElementById('wb-mem');
    const wbNet = document.getElementById('wb-net');
    const wbDisk = document.getElementById('wb-disk');

    if (wbCpu) wbCpu.textContent = ` ${stats.cpu.usagePercent}%`;
    if (wbMem) wbMem.textContent = `󰍛 ${stats.memory.usedGb}G`;
    if (wbNet) wbNet.textContent = `󰖩 ▲${stats.network.uploadKb}K ▼${stats.network.downloadKb}K`;
    if (wbDisk) wbDisk.textContent = `󰋊 ${stats.disk.percent}%`;
  });

  // 6. Config Sync Listener
  window.api.onConfigUpdated((newCfg) => {
    config = newCfg;
    if (newCfg.theme) applyTheme(newCfg.theme);
    if (newCfg.activeWidgets) {
      widgetMgr.setWidgets(newCfg.activeWidgets, newCfg.widgetSizes);
    }
    if (window.fishTankInstance && newCfg.activeCreatureModel) {
      window.fishTankInstance.setCompanion(newCfg.activeCreatureModel);
      const nameLabel = document.getElementById('fish-friend-name');
      if (nameLabel) {
        if (newCfg.activeCreatureModel === 'koi') nameLabel.textContent = 'Kohaku Japanese Koi';
        else if (newCfg.activeCreatureModel === 'axolotl') nameLabel.textContent = 'Lottie the Pink Axolotl';
        else if (newCfg.activeCreatureModel === 'puffer') nameLabel.textContent = 'Puffy Pufferfish';
        else nameLabel.textContent = 'Nemo the Clownfish';
      }
    }
    const modelName = document.getElementById('hud-model-name');
    if (modelName) modelName.textContent = newCfg.activeAiModel || 'Gemini 2.0 Flash';
  });

  // 7. Edit mode toggle button
  const btnEdit = document.getElementById('btn-edit-widgets');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      widgetMgr.toggleEditMode();
    });
  }

  // 8. Windows Media Session Polling & Dynamic UI Updates
  function formatMediaTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateMusicWidget(media) {
    const titleEl = document.getElementById('music-title');
    const artistEl = document.getElementById('music-artist');
    const artImg = document.getElementById('music-album-img');
    const artFallback = document.getElementById('music-album-fallback');
    const progressFill = document.getElementById('music-progress-fill');
    const curTimeEl = document.getElementById('music-current-time');
    const totalTimeEl = document.getElementById('music-total-time');
    const playIcon = document.getElementById('music-play-icon');
    const pauseIcon = document.getElementById('music-pause-icon');
    const statusBadge = document.getElementById('music-status-badge');

    if (!titleEl) return;

    if (!media || (!media.title && !media.artist)) {
      titleEl.textContent = 'No Media Playing';
      titleEl.title = 'No media playing';
      if (artistEl) {
        artistEl.textContent = 'Windows Media Session';
        artistEl.title = 'Windows Media Session';
      }
      if (artImg) {
        artImg.style.display = 'none';
        artImg.src = '';
      }
      if (artFallback) {
        artFallback.style.display = 'flex';
      }
      if (progressFill) progressFill.style.width = '0%';
      if (curTimeEl) curTimeEl.textContent = '0:00';
      if (totalTimeEl) totalTimeEl.textContent = '0:00';
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = '● IDLE';
        statusBadge.className = 'music-live-badge badge-idle';
      }
      return;
    }

    if (titleEl) {
      titleEl.textContent = media.title || 'Unknown Title';
      titleEl.title = media.title || '';
    }
    if (artistEl) {
      artistEl.textContent = media.artist || 'Unknown Artist';
      artistEl.title = media.artist || '';
    }

    if (artImg && artFallback) {
      if (media.albumArt) {
        artImg.src = media.albumArt.startsWith('data:') ? media.albumArt : `data:image/jpeg;base64,${media.albumArt}`;
        artImg.style.display = 'block';
        artFallback.style.display = 'none';
      } else {
        artImg.style.display = 'none';
        artFallback.style.display = 'flex';
      }
    }

    const duration = Math.max(0, Number(media.duration) || 0);
    const position = Math.max(0, Number(media.position) || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

    if (progressFill) {
      progressFill.style.width = `${percent.toFixed(1)}%`;
    }
    if (curTimeEl) curTimeEl.textContent = formatMediaTime(position);
    if (totalTimeEl) totalTimeEl.textContent = formatMediaTime(duration);

    if (playIcon && pauseIcon) {
      if (media.isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    }

    if (statusBadge) {
      if (media.isPlaying) {
        statusBadge.textContent = '● PLAYING';
        statusBadge.className = 'music-live-badge badge-playing';
      } else {
        statusBadge.textContent = '● PAUSED';
        statusBadge.className = 'music-live-badge badge-paused';
      }
    }
  }

  async function pollMediaSession() {
    try {
      const getMedia = (window.electronAPI && window.electronAPI.getMediaSession)
        ? window.electronAPI.getMediaSession
        : (window.api && window.api.getMediaSession ? window.api.getMediaSession : null);
      if (getMedia) {
        const media = await getMedia();
        updateMusicWidget(media);
      }
    } catch (err) {
      console.warn('Error polling media session:', err);
    }
  }

  window.refreshMediaSession = pollMediaSession;

  // Poll immediately on load, then poll every 2500ms
  pollMediaSession();
  setInterval(pollMediaSession, 2500);
});
