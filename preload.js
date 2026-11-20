const { contextBridge, ipcRenderer } = require('electron');

const api = {
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  scanVideos: () => ipcRenderer.invoke('scan-videos'),
  launchSecondary: (options) => ipcRenderer.invoke('launch-secondary', options),
  closeSecondary: () => ipcRenderer.invoke('close-secondary'),
  setDockMode: (mode) => ipcRenderer.invoke('set-dock-mode', mode),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  toggleFullscreenHud: () => ipcRenderer.invoke('toggle-fullscreen-hud'),
  startWallpaper: (options) => ipcRenderer.invoke('start-wallpaper', options),
  stopWallpaper: () => ipcRenderer.invoke('stop-wallpaper'),
  getWallpaperStatus: () => ipcRenderer.invoke('get-wallpaper-status'),
  getMediaSession: () => ipcRenderer.invoke('get-media-session'),
  controlMediaSession: (action) => ipcRenderer.invoke('control-media-session', action),
  onTelemetry: (callback) => {
    ipcRenderer.on('telemetry-update', (event, data) => callback(data));
  },
  onConfigUpdated: (callback) => {
    ipcRenderer.on('config-updated', (event, data) => callback(data));
  },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electronAPI', api);
