const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const handler = require('serve-handler');

// Claude Code の各イベント間隔がこの秒数以上開いたら「離席」とみなし作業時間から除外する。
// lib/claude-sync.ts の CLAUDE_IDLE_GAP_SECONDS と必ず同じ値にすること。
const CLAUDE_IDLE_GAP_SECONDS = 300; // 5分

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

// --- Claude Code セッションログのスキャン ---

// 昇順 timestamp(ms) 配列からギャップ除外の累積秒数を算出する。
// lib/claude-sync.ts の computeActiveSeconds と同じロジック。
function computeActiveSeconds(timestampsMs, idleGapSeconds) {
    if (timestampsMs.length < 2) return 0;
    const sorted = [...timestampsMs].sort((a, b) => a - b);
    const gapMs = idleGapSeconds * 1000;
    let activeMs = 0;
    for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i] - sorted[i - 1];
        if (delta > 0 && delta < gapMs) {
            activeMs += delta;
        }
    }
    return Math.round(activeMs / 1000);
}

// 1 つの jsonl ファイルを解析し、{ claudeSessionId, repoPath, startTimestamp, durationSeconds } を返す。
// 解析できない（timestamp が 2 件未満など）場合は null。
function parseClaudeSessionFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch {
        return null;
    }

    const claudeSessionId = path.basename(filePath, '.jsonl');
    const timestamps = [];
    let repoPath = null;

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // フル JSON.parse は重く一部破損行で全体が落ちるため、必要フィールドのみ正規表現で抽出する。
        const tsMatch = trimmed.match(/"timestamp":"([^"]+)"/);
        if (tsMatch) {
            const ms = Date.parse(tsMatch[1]);
            if (!Number.isNaN(ms)) timestamps.push(ms);
        }
        if (!repoPath) {
            const cwdMatch = trimmed.match(/"cwd":"((?:[^"\\]|\\.)*)"/);
            if (cwdMatch) {
                // JSON 文字列としてのエスケープ（\\ など）を実値へ戻す
                try {
                    repoPath = JSON.parse(`"${cwdMatch[1]}"`);
                } catch {
                    repoPath = cwdMatch[1].replace(/\\\\/g, '\\');
                }
            }
        }
    }

    if (timestamps.length < 2) return null;

    return {
        claudeSessionId,
        repoPath,
        startTimestamp: Math.min(...timestamps),
        durationSeconds: computeActiveSeconds(timestamps, CLAUDE_IDLE_GAP_SECONDS),
    };
}

ipcMain.handle('claude:scan-sessions', async () => {
    const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
    let dirEntries;
    try {
        dirEntries = fs.readdirSync(projectsRoot, { withFileTypes: true });
    } catch {
        // ~/.claude/projects が無い（Claude Code 未使用）場合は空配列
        return [];
    }

    const results = [];
    for (const entry of dirEntries) {
        if (!entry.isDirectory()) continue;
        const encodedDir = path.join(projectsRoot, entry.name);
        let files;
        try {
            files = fs.readdirSync(encodedDir);
        } catch {
            continue;
        }
        for (const file of files) {
            if (!file.endsWith('.jsonl')) continue;
            const parsed = parseClaudeSessionFile(path.join(encodedDir, file));
            if (parsed) results.push(parsed);
        }
    }
    return results;
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
