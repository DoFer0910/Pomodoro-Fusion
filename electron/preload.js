const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    read: (key) => ipcRenderer.invoke('storage:get', key),
    write: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key) => ipcRenderer.invoke('storage:delete', key),
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', flag),
});
