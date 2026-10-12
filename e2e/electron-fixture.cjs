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
    if (process.env.YIELD_E2E_RESTART === '1' && fs.existsSync(path.join(root, 'install-request.json'))) {
        fs.writeFileSync(path.join(root, 'restarted.json'), JSON.stringify({ data: store.store, pid: process.pid }));
        app.quit();
        return;
    }
    globalThis.testStore = store;
    const { createUpdateService } = require('../electron/updates.cjs');
    let updater = null;
    let prepare;
    if (process.env.YIELD_E2E_UPDATE_URL || process.env.YIELD_E2E_GITHUB_URL) {
        const { NsisUpdater } = require('electron-updater');
        updater = new NsisUpdater({ provider: 'generic', url: process.env.YIELD_E2E_UPDATE_URL });
        Object.defineProperty(updater.app, 'baseCachePath', { get: () => path.join(root, 'update-cache') });
        updater.forceDevUpdateConfig = true;
        const configPath = path.join(root, 'update.yml');
        updater.updateConfigPath = configPath;
        fs.writeFileSync(configPath, `provider: generic\nurl: ${JSON.stringify(process.env.YIELD_E2E_UPDATE_URL)}\nupdaterCacheDirName: e2e-updates\n`);
        updater.disableDifferentialDownload = true;
        if (process.env.YIELD_E2E_RESTART === '1') {
            // 実quitAndInstallとElectronの再起動を通すが、検証用exeは実行しない。
            updater.doInstall = options => {
                if (fs.existsSync(path.join(root, 'fail-install'))) throw new Error('Test installer start failure');
                fs.writeFileSync(path.join(root, 'install-request.json'), JSON.stringify(options));
                app.relaunch({ args: [root] });
                return true;
            };
        }
        if (process.env.YIELD_E2E_GITHUB_URL) {
            const { createDevProPreparation, runGitHub } = require('../electron/dev-pro-updates.cjs');
            const githubURL = process.env.YIELD_E2E_GITHUB_URL;
            const originalSetFeedURL = updater.setFeedURL.bind(updater);
            updater.setFeedURL = options => originalSetFeedURL({ ...options, host: new URL(githubURL).host, protocol: 'http' });
            const run = args => {
                if (args[0] !== 'api') return runGitHub(args);
                const phase = fs.readFileSync(path.join(root, 'github-phase'), 'utf8');
                fs.appendFileSync(path.join(root, 'github-requests'), JSON.stringify({ endpoint: args[1], post: args.includes('POST') }) + '\n');
                return runGitHub(['api', `${githubURL}/${args[1]}`, ...args.slice(2), '-H', `Prefer: example=${phase}`]);
            };
            prepare = createDevProPreparation({ repository: 'personal/yield', publicRepository: 'public/yield', installedVersion: app.getVersion(), updater, run });
        }
    }
    ipcMain.handle('storage:get', (_event, key) => store.get(key));
    ipcMain.handle('storage:set', (_event, key, value) => {
        if (fs.existsSync(path.join(root, 'fail-write'))) throw new Error('Test disk failure');
        store.set(key, value);
    });
    ipcMain.handle('storage:delete', (_event, key) => store.delete(key));
    ipcMain.handle('claude:scan-sessions', () => scanAgentDirectoryAsync(path.join(root, 'claude'), 'claude-code'));
    ipcMain.handle('codex:scan-sessions', () => scanAgentDirectoryAsync(path.join(root, 'codex'), 'codex'));
    let timerRunning = false;
    ipcMain.handle('progress:update', (_event, payload) => { timerRunning = Boolean(payload?.isRunning); });
    for (const channel of ['idle:configure', 'notification:show', 'window:set-bounds', 'window:set-always-on-top', 'window:set-compact-mode']) ipcMain.handle(channel, () => {});
    const window = new BrowserWindow({ width: 960, height: 900, show: false,
        webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.js'), contextIsolation: true, nodeIntegration: false } });
    globalThis.testUpdates = createUpdateService({ app, ipcMain, updater, getWindow: () => window,
        enabled: Boolean(updater), disabledReason: 'development', prepare, canRestart: () => !timerRunning });
    // 手動操作の各段階を検証中に30秒の起動確認が割り込まないようにする。
    // 本番の起動・定期確認は既定で有効なまま、時間制御した単体テストで保証する。
    globalThis.testUpdates.stopAutomaticChecks();
    // テストでは取得・SHA検証を実行するが、ホストPCへインストーラを適用しない。
    if (updater) updater.autoInstallOnAppQuit = false;
    window.webContents.session.setDownloadPath(path.join(root, 'downloads'));
    await window.loadURL(process.env.YIELD_E2E_URL || 'http://127.0.0.1:3107');
});
app.on('window-all-closed', () => app.quit());
