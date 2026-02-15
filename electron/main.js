const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#020617', // Match Earn Mode background to prevent white flash
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true, // Hide menu bar for app-like feel
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
