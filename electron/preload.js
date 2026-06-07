const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    read: (key) => ipcRenderer.invoke('storage:get', key),
    write: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key) => ipcRenderer.invoke('storage:delete', key),
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', flag),
    setCompactMode: (isCompact, restoreAlwaysOnTop) => ipcRenderer.invoke('window:set-compact-mode', isCompact, restoreAlwaysOnTop),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    setBounds: (bounds) => ipcRenderer.invoke('window:set-bounds', bounds),
    close: () => ipcRenderer.invoke('window:close'),
    scanClaudeSessions: () => ipcRenderer.invoke('claude:scan-sessions'),
    showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),
});
