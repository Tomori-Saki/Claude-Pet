const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 触发Live2D动作
    triggerMotion: (state) => {
        ipcRenderer.send('trigger-motion', state);
    },

    // 显示对话框
    showDialog: (content) => {
        ipcRenderer.send('show-dialog', content);
    },

    // 监听主进程的动作触发事件
    onMotionTriggered: (callback) => {
        ipcRenderer.on('motion-triggered', (event, state) => {
            callback(state);
        });
    },

    // 监听主进程的对话显示事件
    onDisplayDialog: (callback) => {
        ipcRenderer.on('display-dialog', (event, content) => {
            callback(content);
        });
    }
});
