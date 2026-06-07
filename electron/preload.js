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
    updateProgress: (payload) => ipcRenderer.invoke('progress:update', payload),
    // メイン（Tray/グローバルショートカット）→レンダラーの操作通知。
    // 返り値は解除関数。コンポーネントのクリーンアップで呼べるようにする。
    onShortcutAction: (callback) => {
        const listener = (_event, action) => callback(action);
        ipcRenderer.on('shortcut:action', listener);
        return () => ipcRenderer.removeListener('shortcut:action', listener);
    },
    configureIdle: (config) => ipcRenderer.invoke('idle:configure', config),
    // 離席検知の通知。返り値は解除関数。
    onIdleDetected: (callback) => {
        const listener = (_event, idleSeconds) => callback(idleSeconds);
        ipcRenderer.on('idle:detected', listener);
        return () => ipcRenderer.removeListener('idle:detected', listener);
    },
});
