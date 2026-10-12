// 更新はメインプロセスで管理する。レンダラーから更新先やインストーラを指定させない。
function createUpdateService({ app, ipcMain, getWindow, updater, enabled, disabledReason = 'development', logger = console }) {
    let state = { revision: 0, version: app.getVersion(), status: enabled ? 'idle' : 'disabled', reason: enabled ? null : disabledReason, updateVersion: null, percent: null };
    let checking = null;
    let startupTimer;
    let interval;
    const listeners = [];
    const publish = (patch) => {
        state = { ...state, ...patch, revision: state.revision + 1 };
        const window = getWindow();
        if (window && !window.isDestroyed()) window.webContents.send('updates:status', { ...state });
    };
    const on = (event, listener) => {
        updater.on(event, listener);
        listeners.push([event, listener]);
    };
    async function check() {
        // ダウンロード済み更新を再確認で消さず、並行ダウンロードも防ぐ。
        if (!enabled || checking || ['checking', 'downloading', 'downloaded'].includes(state.status)) return { ...state };
        publish({ status: 'checking', updateVersion: null, percent: null });
        checking = Promise.resolve().then(async () => {
            try {
                const result = await updater.checkForUpdates();
                // 自動ダウンロードの失敗も捕捉し、未処理のPromise拒否を残さない。
                if (result?.downloadPromise) await result.downloadPromise;
            } catch (error) {
                logger.error('[updates] Update check failed', error);
                publish({ status: 'error', percent: null });
            } finally {
                checking = null;
            }
        });
        await checking;
        return { ...state };
    }
    ipcMain.handle('updates:get-status', () => ({ ...state }));
    ipcMain.handle('updates:check', check);
    if (enabled) {
        updater.autoDownload = true;
        updater.autoInstallOnAppQuit = true;
        updater.allowPrerelease = false;
        updater.allowDowngrade = false;
        updater.logger = logger;
        on('checking-for-update', () => publish({ status: 'checking' }));
        on('update-available', info => publish({ status: 'downloading', updateVersion: info.version, percent: 0 }));
        on('update-not-available', () => publish({ status: 'current', updateVersion: null, percent: null }));
        on('download-progress', progress => publish({ status: 'downloading', percent: Math.round(progress.percent) }));
        on('update-downloaded', info => publish({ status: 'downloaded', updateVersion: info.version, percent: 100 }));
        on('error', error => {
            logger.error('[updates] Update failed', error);
            publish({ status: 'error', percent: null });
        });
        // 起動直後の描画を優先し、起動中も新版を取りこぼさない。
        startupTimer = setTimeout(() => void check(), 30_000);
        interval = setInterval(() => void check(), 60 * 60 * 1000);
        startupTimer.unref?.();
        interval.unref?.();
    }
    function dispose() {
        clearTimeout(startupTimer);
        clearInterval(interval);
        // quit時にインストーラ起動が失敗してもerrorイベントを未処理にしない。
        for (const [event, listener] of listeners) if (event !== 'error') updater.removeListener(event, listener);
        ipcMain.removeHandler('updates:get-status');
        ipcMain.removeHandler('updates:check');
    }
    app.once('will-quit', dispose);
    return { check, getStatus: () => ({ ...state }), dispose };
}

// Proは専用の公開配布先が指定されている場合だけ有効。DevProは公開更新しない。
function updatePolicy({ packaged, platform, development, edition, repository }) {
    if (!packaged || development) return { enabled: false, disabledReason: 'development' };
    if (platform !== 'win32') return { enabled: false, disabledReason: 'platform' };
    if (edition === 'free') return { enabled: true };
    if (edition === 'pro' && /^[\w.-]+\/[\w.-]+$/.test(repository ?? '') && repository !== 'DoFer0910/Pomodoro-Fusion') return { enabled: true };
    return { enabled: false, disabledReason: 'edition' };
}

module.exports = { createUpdateService, updatePolicy };
