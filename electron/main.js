const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, globalShortcut, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const handler = require('serve-handler');

// Dynamic import for electron-store (ESM)
let store;
(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();
})();

let mainWindow;
let tray = null;

// Tray メニュー・ツールチップで使う文言。レンダラーから言語と残り時間を受け取って更新する。
// 初期値（レンダラー接続前）は日本語。
let trayLabels = {
    show: 'ウィンドウを表示',
    startPause: '開始 / 一時停止',
    quit: '終了',
    tooltip: 'イールド - 停止中',
};

// レンダラーへショートカット操作を伝える。レンダラー側で開始/一時停止などに対応する。
function sendShortcutAction(action) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:action', action);
    }
}

// --- 離席（アイドル）検知 ---
// powerMonitor.getSystemIdleTime() で OS の無操作秒数を監視し、閾値を超えたらレンダラーへ通知する。
// 実際にタイマーを止めるかどうかはレンダラー側（作業中かどうかを知っている）が判断する。
let idlePollTimer = null;
let idleThresholdSeconds = 300; // 既定5分。レンダラーから設定で上書きする。
let idleNotified = false; // 同一離席で何度も通知しないためのフラグ。

function startIdleMonitor() {
    if (idlePollTimer) return;
    idlePollTimer = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const idleSeconds = powerMonitor.getSystemIdleTime();
        if (idleSeconds >= idleThresholdSeconds) {
            if (!idleNotified) {
                idleNotified = true;
                mainWindow.webContents.send('idle:detected', idleSeconds);
            }
        } else {
            // 操作が戻ったら次の離席に備えてフラグを解除する。
            idleNotified = false;
        }
    }, 15000); // 15秒間隔。秒単位の精度は不要なので軽めにポーリングする。
}

function stopIdleMonitor() {
    if (idlePollTimer) {
        clearInterval(idlePollTimer);
        idlePollTimer = null;
    }
}

function showMainWindow() {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

function rebuildTrayMenu() {
    if (!tray) return;
    const contextMenu = Menu.buildFromTemplate([
        { label: trayLabels.show, click: showMainWindow },
        { label: trayLabels.startPause, click: () => sendShortcutAction('toggle') },
        { type: 'separator' },
        { label: trayLabels.quit, click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);
}

function createTray() {
    if (tray) return;
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
    tray = new Tray(icon);
    tray.setToolTip(trayLabels.tooltip);
    rebuildTrayMenu();
    // 左クリックでウィンドウ表示（Windows の一般的な挙動に合わせる）。
    tray.on('click', showMainWindow);
}

function registerGlobalShortcuts() {
    // 他アプリと衝突しにくい Ctrl+Shift 系。開始/一時停止・スキップ・表示トグル。
    globalShortcut.register('CommandOrControl+Shift+Space', () => sendShortcutAction('toggle'));
    globalShortcut.register('CommandOrControl+Shift+Right', () => sendShortcutAction('skip'));
    globalShortcut.register('CommandOrControl+Shift+Up', () => showMainWindow());
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        // フレームレスのため枠アイコンは出ないが、タスクバー / Alt+Tab 表示に使われる。
        // build/ は配布物に同梱されないため electron/ 配下の ico を参照する。
        icon: path.join(__dirname, 'icon.ico'),
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
    // Windows のトースト通知には AppUserModelID が必須。未設定だと OS が発行元を特定できず
    // notification.show() を呼んでも通知がサイレントに破棄される（特に開発モード）。
    // package.json の build.appId と同じ値にしてインストール版のショートカットとも整合させる。
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.pomodoro.fusion');
    }

    createWindow();
    createTray();
    registerGlobalShortcuts();
    startIdleMonitor();

    const { createUpdateService, updatePolicy } = require('./updates.cjs');
    const metadata = require('../package.json');
    const policy = updatePolicy({
        packaged: app.isPackaged, platform: process.platform,
        development: process.env.ELECTRON_IS_DEV === '1',
        edition: metadata.yieldUpdateEdition,
        repository: metadata.yieldUpdateRepository,
    });
    const updateLogger = { ...console, error: (message, error) => {
        console.error(message, error ?? '');
        fs.appendFile(path.join(app.getPath('userData'), 'updates.log'),
            `${new Date().toISOString()} ${message} ${error?.stack ?? error ?? ''}\n`,
            writeError => { if (writeError) console.warn('Cannot write update log', writeError); });
    } };
    createUpdateService({ app, ipcMain, getWindow: () => mainWindow, ...policy, logger: updateLogger,
        updater: policy.enabled ? require('electron-updater').autoUpdater : null });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// アプリ終了時にグローバルショートカットを解放し、アイドル監視を止める。
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopIdleMonitor();
});

// レンダラーから離席検知の有効/無効と閾値（分）を受け取る。
ipcMain.handle('idle:configure', async (event, config) => {
    if (!config) return;
    const { enabled, thresholdMinutes } = config;
    if (typeof thresholdMinutes === 'number' && thresholdMinutes > 0) {
        idleThresholdSeconds = Math.round(thresholdMinutes * 60);
    }
    if (enabled) {
        startIdleMonitor();
    } else {
        stopIdleMonitor();
    }
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

// --- AI log scanning (shared parser used by attendance review and legacy sync) ---
const { scanAgentDirectoryAsync, shutdownAgentScanner } = require('./agent-scanner.cjs');
app.on('will-quit', shutdownAgentScanner);
ipcMain.handle('claude:scan-sessions', async () =>
    scanAgentDirectoryAsync(path.join(os.homedir(), '.claude', 'projects'), 'claude-code'));
ipcMain.handle('codex:scan-sessions', async () =>
    scanAgentDirectoryAsync(path.join(os.homedir(), '.codex', 'sessions'), 'codex'));

// --- Progress and tray ---
// payload: { progress(0-100), isRunning, remainingLabel, labels: { show, startPause, quit, tooltip } }
ipcMain.handle('progress:update', async (event, payload) => {
    if (!payload) return;
    const { progress, isRunning, labels } = payload;

    if (mainWindow && !mainWindow.isDestroyed()) {
        if (isRunning && typeof progress === 'number') {
            // setProgressBar は 0.0-1.0。進捗（経過割合）をそのまま渡す。
            mainWindow.setProgressBar(Math.min(1, Math.max(0, progress / 100)));
        } else {
            // 停止中は進捗バーを消す（負値で非表示）。
            mainWindow.setProgressBar(-1);
        }
    }

    if (labels) {
        trayLabels = { ...trayLabels, ...labels };
        if (tray) {
            tray.setToolTip(trayLabels.tooltip);
            rebuildTrayMenu();
        }
    }
});

// デスクトップ通知。レンダラーが背面/最小化でもセッション切り替わりに気づけるようにする。
ipcMain.handle('notification:show', async (event, title, body) => {
    if (!Notification.isSupported()) return;
    const notification = new Notification({
        title: title || '',
        body: body || '',
        icon: path.join(__dirname, 'icon.ico'),
    });
    // 通知クリックでウィンドウを前面に出す。最小化されていれば復元する。
    notification.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    notification.show();
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
        // 現在の位置を保持しつつサイズを変更（setBoundsで統一）
        const { x, y } = mainWindow.getBounds();
        mainWindow.setBounds({ x, y, width: 300, height: 300 });
        mainWindow.setResizable(false);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
        mainWindow.setResizable(true);
        if (preCompactBounds) {
            mainWindow.setBounds(preCompactBounds);
        } else {
            mainWindow.setSize(1200, 800);
            mainWindow.center();
        }
        preCompactBounds = null;

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
