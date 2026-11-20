/**
 * CAELESTIA SHELL - CONTROL CENTER CONTROLLER
 * Controls Displays, Side Docking, 7 Omarchy Themes, Widget Stack, and Live Wallpaper.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let monitors = [];
  let config = {};

  // 1. Initial Data Fetch
  try {
    monitors = await window.api.getMonitors();
    config = await window.api.getConfig();
  } catch (err) {
    console.error('Initialization error:', err);
  }

  // 2. Navigation Tab Switching
  const tabBtns = document.querySelectorAll('.cc-tab, .cc-tab-btn');
  const tabPanels = document.querySelectorAll('.cc-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      let targetId = btn.getAttribute('data-tab');
      if (targetId && !targetId.startsWith('tab-')) {
        targetId = 'tab-' + targetId;
      }
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId) || (targetId === 'tab-displays' ? document.getElementById('tab-docking') : null);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // 3. Monitor Setup & Visual Layout Map
  const selectMon = document.getElementById('select-monitor');
  const selectWpMon = document.getElementById('select-wallpaper-mon');
  const screenInfoBadge = document.getElementById('screen-info-badge');

  function populateMonitors() {
    if (!monitors || monitors.length === 0) return;
    if (selectMon) selectMon.innerHTML = '';
    if (selectWpMon) selectWpMon.innerHTML = '';

    monitors.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.index;
      opt.textContent = `${m.name} (${m.orientation}, ${m.width}x${m.height}) - ${m.relativePosition}`;
      if (!m.isPrimary && config.targetMonitorId === undefined) {
        config.targetMonitorId = m.index;
      }
      if (m.index === (config.targetMonitorId !== undefined ? config.targetMonitorId : 1)) {
        opt.selected = true;
      }
      selectMon.appendChild(opt);

      const wpOpt = opt.cloneNode(true);
      if (m.index === (config.wallpaperMonitorId !== undefined ? config.wallpaperMonitorId : 1)) {
        wpOpt.selected = true;
      }
      selectWpMon.appendChild(wpOpt);
    });

    if (screenInfoBadge) {
      screenInfoBadge.textContent = `${monitors.length} Displays`;
    }

    renderMonitorMap();
  }

  function renderMonitorMap() {
    const map = document.getElementById('monitor-map-canvas');
    if (!map || monitors.length === 0) return;
    map.innerHTML = '';

    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    monitors.forEach(m => {
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + m.width);
      maxY = Math.max(maxY, m.y + m.height);
    });

    const totalW = maxX - minX || 1920;
    const totalH = maxY - minY || 1080;
    const scale = Math.min(320 / totalW, 100 / totalH);
    const selectedIdx = parseInt(selectMon.value, 10);

    monitors.forEach(m => {
      const box = document.createElement('div');
      box.className = `map-box ${m.index === selectedIdx ? 'active' : ''}`;
      const w = Math.round(m.width * scale);
      const h = Math.round(m.height * scale);
      const left = 20 + Math.round((m.x - minX) * scale);
      const top = 10 + Math.round((m.y - minY) * scale);

      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;

      box.innerHTML = `
        <div>${m.isPrimary ? 'MAIN' : 'SUB'}</div>
        <div style="font-size: 8px; opacity: 0.8;">${m.width}x${m.height}</div>
        <div style="font-size: 7px; color: var(--accent-cyan);">${m.orientation.split(' ')[0]}</div>
      `;

      box.addEventListener('click', () => {
        selectMon.value = m.index;
        renderMonitorMap();
        saveCurrentConfig();
      });

      map.appendChild(box);
    });
  }

  populateMonitors();
  if (selectMon) {
    selectMon.addEventListener('change', () => {
      renderMonitorMap();
      saveCurrentConfig();
    });
  }

  // 4. Docking Mode & Width Slider
  const dockCards = document.querySelectorAll('.cc-dock-card');
  const sliderWidth = document.getElementById('slider-dock-width');
  const widthValLabel = document.getElementById('dock-width-val');

  function updateDockModeUI(mode) {
    dockCards.forEach(c => {
      if (c.getAttribute('data-dock') === mode) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }
  updateDockModeUI(config.dockMode || 'left');

  dockCards.forEach(card => {
    card.addEventListener('click', async () => {
      const mode = card.getAttribute('data-dock');
      config.dockMode = mode;
      updateDockModeUI(mode);
      await window.api.setDockMode(mode);
    });
  });

  if (sliderWidth) {
    sliderWidth.value = config.dockWidth || 360;
    if (widthValLabel) widthValLabel.textContent = `${sliderWidth.value} px`;

    sliderWidth.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (widthValLabel) widthValLabel.textContent = `${val} px`;
      config.dockWidth = val;
    });

    sliderWidth.addEventListener('change', async () => {
      await saveCurrentConfig();
    });
  }

  // 5. 7 Omarchy Themes
  const themeCards = document.querySelectorAll('.cc-theme-card, .omarchy-theme-card');
  const currentThemeBadge = document.getElementById('current-theme-badge');

  const validThemes = ['catppuccin', 'tokyonight', 'amberbyte', 'blueberry', 'rosepine', 'gruvbox', 'nordic'];

  function applyThemeLocal(themeName) {
    let active = themeName;
    if (active === 'arch') active = 'catppuccin';
    if (active === 'retro') active = 'amberbyte';
    if (active === 'modern' || active === 'frutiger') active = 'blueberry';
    if (!validThemes.includes(active)) active = 'catppuccin';

    document.body.className = `theme-${active}`;

    themeCards.forEach(card => {
      if (card.getAttribute('data-theme-name') === active) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    if (currentThemeBadge) {
      const titles = {
        catppuccin: 'Catppuccin Sherbet Active',
        tokyonight: 'Tokyo Night Active',
        amberbyte: 'Amberbyte Active',
        blueberry: 'Blueberry Active',
        rosepine: 'Rose Pine Active',
        gruvbox: 'Gruvbox Material Active',
        nordic: 'Nordic Frost Active',
      };
      currentThemeBadge.textContent = titles[active] || 'Catppuccin Sherbet Active';
    }
  }
  applyThemeLocal(config.theme || 'catppuccin');

  themeCards.forEach(card => {
    card.addEventListener('click', async () => {
      const themeName = card.getAttribute('data-theme-name');
      config.theme = themeName;
      applyThemeLocal(themeName);
      await window.api.setTheme(themeName);
    });
  });

  // 6. Widget Stack Picker List
  const pickerContainer = document.getElementById('widget-picker-container');
  const countBadge = document.getElementById('active-widgets-count');

  function renderWidgetPicker() {
    if (!pickerContainer) return;
    pickerContainer.innerHTML = '';

    let activeCount = 0;
    WIDGET_CATALOG.forEach(w => {
      const isActive = config.activeWidgets && config.activeWidgets.includes(w.id);
      if (isActive) activeCount++;

      const item = document.createElement('div');
      item.className = 'widget-picker-item';

      item.innerHTML = `
        <div class="widget-item-info">
          <span class="widget-item-icon">${w.icon}</span>
          <div>
            <div class="widget-item-name">${w.name}</div>
            <div class="widget-item-cat">${w.description}</div>
          </div>
        </div>
        <label class="ios-switch">
          <input type="checkbox" data-widget-id="${w.id}" ${isActive ? 'checked' : ''}>
          <span class="switch-slider"></span>
        </label>
      `;

      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!config.activeWidgets.includes(w.id)) {
            config.activeWidgets.push(w.id);
          }
        } else {
          config.activeWidgets = config.activeWidgets.filter(id => id !== w.id);
        }
        renderWidgetPicker();
        saveCurrentConfig();
      });

      pickerContainer.appendChild(item);
    });

    if (countBadge) countBadge.textContent = `${activeCount} Active`;
  }
  renderWidgetPicker();

  // 7. Fish Companion Model
  const selectFish = document.getElementById('select-fish-friend');
  if (selectFish) {
    selectFish.value = config.activeCreatureModel || 'axolotl';
    selectFish.addEventListener('change', (e) => {
      config.activeCreatureModel = e.target.value;
      saveCurrentConfig();
    });
  }

  // 8. AI Model Rotator
  const aiModels = ['Gemini 2.0 Flash', 'Claude 3.5 Sonnet', 'GPT-4o Mini', 'DeepSeek V3', 'Ollama Local'];
  let currentAiIdx = 0;
  const displayAi = document.getElementById('display-ai-model');
  const btnRotate = document.getElementById('btn-rotate-models');

  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      currentAiIdx = (currentAiIdx + 1) % aiModels.length;
      config.activeAiModel = aiModels[currentAiIdx];
      if (displayAi) displayAi.value = config.activeAiModel;
      saveCurrentConfig();
    });
  }

  // 9. Dedicated Live Wallpaper
  const selectVideo = document.getElementById('select-video');
  const previewVideo = document.getElementById('cc-video-preview');
  const previewNone = document.getElementById('cc-video-none');
  const btnStartWp = document.getElementById('btn-start-wallpaper');
  const btnStopWp = document.getElementById('btn-stop-wallpaper');
  const wpStatusBadge = document.getElementById('wallpaper-status-badge');

  async function checkWallpaperStatus() {
    try {
      const res = await window.api.getWallpaperStatus();
      if (wpStatusBadge) {
        if (res.isRunning) {
          wpStatusBadge.textContent = '● RUNNING';
          wpStatusBadge.style.color = 'var(--accent-green)';
          wpStatusBadge.style.borderColor = 'var(--accent-green)';
        } else {
          wpStatusBadge.textContent = '○ STOPPED';
          wpStatusBadge.style.color = 'var(--text-dim)';
          wpStatusBadge.style.borderColor = 'var(--border-card)';
        }
      }
    } catch (_) {}
  }
  checkWallpaperStatus();

  // Scan local videos
  try {
    const videos = await window.api.scanVideos();
    if (selectVideo) {
      selectVideo.innerHTML = '';
      if (videos.length > 0) {
        videos.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.path;
          opt.textContent = `${v.name} (${v.sizeMb} MB)`;
          if (v.path === config.videoPath) opt.selected = true;
          selectVideo.appendChild(opt);
        });
      } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No local mp4 videos found';
        selectVideo.appendChild(opt);
      }
      updateVideoPreview();
    }
  } catch (err) {
    console.error('Error scanning videos:', err);
  }

  function updateVideoPreview() {
    if (!previewVideo || !selectVideo) return;
    if (selectVideo.value) {
      previewNone.style.display = 'none';
      previewVideo.style.display = 'block';
      previewVideo.src = 'file:///' + selectVideo.value.replace(/\\/g, '/');
      previewVideo.play().catch(() => {});
    } else {
      previewVideo.style.display = 'none';
      previewNone.style.display = 'block';
    }
  }

  if (selectVideo) {
    selectVideo.addEventListener('change', () => {
      updateVideoPreview();
      saveCurrentConfig();
    });
  }

  if (btnStartWp) {
    btnStartWp.addEventListener('click', async () => {
      await saveCurrentConfig();
      const targetMon = parseInt(selectWpMon.value, 10);
      await window.api.startWallpaper({ monitorIndex: targetMon });
      checkWallpaperStatus();
    });
  }

  if (btnStopWp) {
    btnStopWp.addEventListener('click', async () => {
      await window.api.stopWallpaper();
      checkWallpaperStatus();
    });
  }

  // 10. General Form Elements
  const fpsSelect = document.getElementById('select-fps');
  const onTopCheck = document.getElementById('check-always-on-top');
  const muteCheck = document.getElementById('check-mute');
  const fitSelect = document.getElementById('select-fit');
  const speedSelect = document.getElementById('select-speed');
  const tintSelect = document.getElementById('select-tint');

  if (fpsSelect) fpsSelect.value = config.targetFps || '60';
  if (onTopCheck) onTopCheck.checked = config.alwaysOnTop !== false;
  if (muteCheck) muteCheck.checked = config.videoMuted !== false;
  if (fitSelect) fitSelect.value = config.videoFit || 'cover';
  if (speedSelect) speedSelect.value = (config.videoSpeed || 1.0).toString();
  if (tintSelect) tintSelect.value = (config.videoOverlayOpacity || 0.25).toString();

  [fpsSelect, onTopCheck, muteCheck, fitSelect, speedSelect, tintSelect, selectWpMon].forEach(el => {
    if (el) el.addEventListener('change', () => saveCurrentConfig());
  });

  async function saveCurrentConfig() {
    config.targetMonitorId = parseInt(selectMon.value, 10);
    config.wallpaperMonitorId = parseInt(selectWpMon.value, 10);
    config.targetFps = parseInt(fpsSelect.value, 10);
    config.alwaysOnTop = onTopCheck.checked;
    config.videoPath = selectVideo ? selectVideo.value : config.videoPath;
    config.videoMuted = muteCheck.checked;
    config.videoFit = fitSelect.value;
    config.videoSpeed = parseFloat(speedSelect.value);
    config.videoOverlayOpacity = parseFloat(tintSelect ? tintSelect.value : 0.25);

    await window.api.saveConfig(config);
  }

  // 11. Launch & Close Buttons
  const btnRelaunch = document.getElementById('btn-relaunch-hud');
  if (btnRelaunch) {
    btnRelaunch.addEventListener('click', async () => {
      await saveCurrentConfig();
      await window.api.launchSecondary({
        monitorIndex: parseInt(selectMon.value, 10),
        dockMode: config.dockMode || 'left',
        alwaysOnTop: onTopCheck.checked,
      });
    });
  }

  const btnClose = document.getElementById('btn-close-hud');
  if (btnClose) {
    btnClose.addEventListener('click', async () => {
      await window.api.closeSecondary();
    });
  }

  const btnToggleFull = document.getElementById('btn-toggle-hud-full');
  if (btnToggleFull) {
    btnToggleFull.addEventListener('click', async () => {
      await window.api.toggleFullscreenHud();
    });
  }

  const btnRefresh = document.getElementById('btn-refresh-monitors');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      monitors = await window.api.getMonitors();
      populateMonitors();
    });
  }

  // 12. Live Telemetry Updates (Native C++ V8 Engine)
  window.api.onTelemetry((stats) => {
    const cpuEl = document.getElementById('cc-tel-cpu');
    const memEl = document.getElementById('cc-tel-mem');
    const diskEl = document.getElementById('cc-tel-disk');
    const netEl = document.getElementById('cc-tel-net');

    if (cpuEl) cpuEl.textContent = ` CPU: ${stats.cpu.usagePercent}% (${stats.cpu.speedGhz}GHz)`;
    if (memEl) memEl.textContent = `󰍛 RAM: ${stats.memory.usedGb}G / ${stats.memory.totalGb}G (${stats.memory.percent}%)`;
    if (diskEl) diskEl.textContent = `󰋊 SSD ${stats.disk.mount}: ${stats.disk.percent}% (${stats.disk.usedGb}G / ${stats.disk.totalGb}G)`;
    if (netEl) netEl.textContent = `󰖩 NET: ▲${stats.network.uploadKb}K ▼${stats.network.downloadKb}K`;
  });
});
