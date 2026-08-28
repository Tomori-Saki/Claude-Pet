const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimizeWindow: () => {
        ipcRenderer.send('window-minimize');
    },

    maximizeWindow: () => {
        ipcRenderer.send('window-maximize');
    },

    closeWindow: () => {
        ipcRenderer.send('window-close');
    },

    resizeWindow: (bounds) => {
        ipcRenderer.send('window-resize', bounds);
    },

    getWindowBounds: () => {
        return ipcRenderer.sendSync('window-get-bounds');
    },

    // 触发Live2D动作
    triggerMotion: (state) => {
        ipcRenderer.send('trigger-motion', state);
    },

    // 显示对话框
    showDialog: (content) => {
        ipcRenderer.send('show-dialog', content);
    },

    // 监听输出行（逐行气泡）
    onOutputLines: (callback) => {
        ipcRenderer.on('output-lines', (_event, payload) => {
            callback(payload);
        });
    },

    // 监听输出完成
    onOutputComplete: (callback) => {
        ipcRenderer.on('output-complete', (_event, payload) => {
            callback(payload);
        });
    },

    // 通知主进程：UI 气泡队列已展示完毕
    notifyOutputDisplayFinished: () => {
        ipcRenderer.send('output-display-finished');
    },

    // 监听主进程的状态变化事件
    onStateChanged: (callback) => {
        ipcRenderer.on('state-changed', (_event, payload) => {
            callback(payload);
        });
    },

    // 监听主进程的动作触发事件
    onMotionTriggered: (callback) => {
        ipcRenderer.on('motion-triggered', (_event, state) => {
            callback(state);
        });
    },

    // 监听主进程的对话显示事件
    onDisplayDialog: (callback) => {
        ipcRenderer.on('display-dialog', (_event, content) => {
            callback(content);
        });
    }
});
