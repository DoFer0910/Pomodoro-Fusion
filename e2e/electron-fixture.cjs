// Test-only Electron shell: real preload, electron-store, IPC and log scanner, isolated from user data.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { scanAgentDirectoryAsync, shutdownAgentScanner } = require('../electron/agent-scanner.cjs');
const root = process.env.YIELD_E2E_DIR;
if (!root) throw new Error('YIELD_E2E_DIR is required');
app.setPath('userData', path.join(root, 'user-data'));
app.on('will-quit', shutdownAgentScanner);
app.whenReady().then(async () => {
    const { default: Store } = await import('electron-store');
    const store = new Store({ cwd: path.join(root, 'storage') });
    const initial = JSON.parse(fs.readFileSync(path.join(root, 'initial.json'), 'utf8'));
    for (const [key, value] of Object.entries(initial)) if (!store.has(key)) store.set(key, value);
    globalThis.testStore = store;
    const { createUpdateService } = require('../electron/updates.cjs');
    let updater = null;
    if (process.env.YIELD_E2E_UPDATE_URL) {
        const { NsisUpdater } = require('electron-updater');
        updater = new NsisUpdater({ provider: 'generic', url: process.env.YIELD_E2E_UPDATE_URL });
        Object.defineProperty(updater.app, 'baseCachePath', { get: () => path.join(root, 'update-cache') });
        updater.forceDevUpdateConfig = true;
        const configPath = path.join(root, 'update.yml');
        updater.updateConfigPath = configPath;
        fs.writeFileSync(configPath, `provider: generic\nurl: ${JSON.stringify(process.env.YIELD_E2E_UPDATE_URL)}\nupdaterCacheDirName: e2e-updates\n`);
        updater.disableDifferentialDownload = true;
    }
    ipcMain.handle('storage:get', (_event, key) => store.get(key));
    ipcMain.handle('storage:set', (_event, key, value) => {
        if (fs.existsSync(path.join(root, 'fail-write'))) throw new Error('Test disk failure');
        store.set(key, value);
    });
    ipcMain.handle('storage:delete', (_event, key) => store.delete(key));
    ipcMain.handle('claude:scan-sessions', () => scanAgentDirectoryAsync(path.join(root, 'claude'), 'claude-code'));
    ipcMain.handle('codex:scan-sessions', () => scanAgentDirectoryAsync(path.join(root, 'codex'), 'codex'));
    for (const channel of ['progress:update', 'idle:configure', 'notification:show', 'window:set-bounds', 'window:set-always-on-top', 'window:set-compact-mode']) ipcMain.handle(channel, () => {});
    const window = new BrowserWindow({ width: 960, height: 900, show: false,
        webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.js'), contextIsolation: true, nodeIntegration: false } });
    globalThis.testUpdates = createUpdateService({ app, ipcMain, updater, getWindow: () => window,
        enabled: Boolean(updater), disabledReason: 'development' });
    // テストでは取得・SHA検証を実行するが、ホストPCへインストーラを適用しない。
    if (updater) updater.autoInstallOnAppQuit = false;
    window.webContents.session.setDownloadPath(path.join(root, 'downloads'));
    await window.loadURL(process.env.YIELD_E2E_URL || 'http://127.0.0.1:3107');
});
app.on('window-all-closed', () => app.quit());
