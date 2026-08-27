const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const CLIDetector = require('./detector');

let mainWindow;
let detector;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        transparent: true,
        frame: false,
        alwaysOnTop: false,
        skipTaskbar: false,
        resizable: true
    });

    // 加载Live2D页面
    mainWindow.loadFile(path.join(__dirname, '../Live2dOnWeb/desktop.html'));

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
