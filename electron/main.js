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
        resizable: true, // Allow resizing by default (Standard Mode)
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

let preCompactBounds = null;

// Window Management IPC Handlers
ipcMain.handle('window:set-compact-mode', async (event, isCompact, restoreAlwaysOnTop) => {
    if (!mainWindow) return;

    if (isCompact) {
        preCompactBounds = mainWindow.getBounds();
        // setBoundsで統一し、位置を保持しつつサイズを変更
        const currentBounds = mainWindow.getBounds();
        mainWindow.setBounds({
            x: currentBounds.x,
            y: currentBounds.y,
            width: 300,
            height: 300,
        });
        // コンテンツサイズを明示的に設定し、ヒットテスト領域を強制更新
        mainWindow.setContentSize(300, 300);
        mainWindow.setResizable(false); // コンパクトモードではリサイズ無効
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
        mainWindow.setResizable(true); // リサイズを先に有効化
        if (preCompactBounds) {
            mainWindow.setBounds(preCompactBounds);
            // コンテンツサイズも復元して当たり判定を正確に更新
            mainWindow.setContentSize(preCompactBounds.width, preCompactBounds.height);
        } else {
            mainWindow.setBounds({ x: 0, y: 0, width: 1200, height: 800 });
            mainWindow.setContentSize(1200, 800);
            mainWindow.center();
        }
        preCompactBounds = null; // 使用済みバウンドをクリア

        // Always on top の状態を復元
        const alwaysOnTop = restoreAlwaysOnTop !== undefined ? restoreAlwaysOnTop : false;

        // Windowsでは geometry 変更直後の setAlwaysOnTop が効かない場合があるため遅延実行
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
            }
        }, 100);
    }
});

// Manual Resizing IPC for Transparent Windows
ipcMain.handle('window:set-bounds', async (event, bounds) => {
    if (!mainWindow) return;
    mainWindow.setBounds(bounds);
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
