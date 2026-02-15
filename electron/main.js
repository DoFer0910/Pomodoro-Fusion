const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

// Dynamic import for electron-store (ESM)
let store;
(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();
})();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#00000000', // Transparent background
        frame: false, // Frameless for custom title bar & compact mode
        transparent: true, // Allow transparency
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });

    const isDev = process.env.ELECTRON_IS_DEV === '1';

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // Open DevTools in dev mode
        // mainWindow.webContents.openDevTools();
    } else {
        // In production, start a local server to serve the 'out' directory
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                public: path.join(__dirname, '../out'),
                rewrites: [
                    { source: '**', destination: '/index.html' } // Rewrite for SPA routing
                ]
            });
        });

        server.listen(0, () => {
            const port = server.address().port;
            console.log(`Server running at http://localhost:${port}`);
            mainWindow.loadURL(`http://localhost:${port}`);
        });

        // Ensure server closes when app quits (though process exit handles it)
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Storage IPC Handlers
ipcMain.handle('storage:get', async (event, key) => {
    return store.get(key);
});

ipcMain.handle('storage:set', async (event, key, value) => {
    store.set(key, value);
});

ipcMain.handle('storage:delete', async (event, key) => {
    store.delete(key);
});

ipcMain.handle('window:set-always-on-top', async (event, flag) => {
    if (mainWindow) {
        mainWindow.setAlwaysOnTop(flag, 'screen-saver');
    }
});

// Window Management IPC Handlers
ipcMain.handle('window:set-compact-mode', async (event, isCompact) => {
    if (!mainWindow) return;

    if (isCompact) {
        mainWindow.setSize(300, 300);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        // Force transparency update
        mainWindow.setBackgroundColor('#00000000');
    } else {
        mainWindow.setSize(1200, 800);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.center();
        // Reset to transparent so standard view can handle its own background via CSS
        mainWindow.setBackgroundColor('#00000000');
    }
});

ipcMain.handle('window:minimize', async () => {
    mainWindow?.minimize();
});

ipcMain.handle('window:maximize', async () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window:close', async () => {
    mainWindow?.close();
});
