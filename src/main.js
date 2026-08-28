const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const CLIDetector = require('./detector');

let mainWindow;
let detector;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 500,
        minWidth: 280,
        minHeight: 400,
        x: 100,
        y: 100,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: true,
        hasShadow: false
    });

    // 加载渲染器页面
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // 开发模式下打开DevTools
    if (process.env.ELECTRON_DEV) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 初始化CLI检测器
    if (!detector) {
        detector = new CLIDetector();
        detector.init(mainWindow);
    }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (detector) {
        detector.destroy();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC事件处理
ipcMain.on('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('window-resize', (event, bounds) => {
    if (mainWindow) {
        mainWindow.setBounds(bounds, true);
    }
});

ipcMain.on('window-get-bounds', (event) => {
    if (mainWindow) {
        event.returnValue = mainWindow.getBounds();
    } else {
        event.returnValue = { width: 400, height: 600, x: 100, y: 100 };
    }
});

ipcMain.on('trigger-motion', (event, state) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('motion-triggered', state);
    }
});

ipcMain.on('show-dialog', (event, content) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('display-dialog', content);
    }
});
