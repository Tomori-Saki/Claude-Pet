/**
 * Claude Pet - Renderer Process
 * 前端逻辑处理
 */

// 获取DOM元素
const dialogContainer = document.getElementById('dialog-container');
const dialogBox = document.querySelector('.dialog-box');
const dialogText = document.querySelector('.dialog-text');
const live2dFrame = document.getElementById('live2d-frame');

let currentSource = 'claude'; // claude 或 codex
let hideTimer = null;

/**
 * 显示对话框
 */
function showDialog(content, source = 'claude') {
    clearTimeout(hideTimer);

    currentSource = source;

    // 更新样式
    dialogBox.className = `dialog-box ${source}`;

    // 更新内容
    dialogText.textContent = content;

    // 显示
    dialogContainer.classList.remove('dialog-hidden');

    // 5秒后自动隐藏
    hideTimer = setTimeout(() => {
        hideDialog();
    }, 5000);
}

/**
 * 隐藏对话框
 */
function hideDialog() {
    dialogContainer.classList.add('dialog-hidden');
    clearTimeout(hideTimer);
}

/**
 * 触发Live2D动作
 */
function triggerLive2DMotion(state) {
    try {
        // 访问iframe中的Live2D API
        if (live2dFrame.contentWindow && live2dFrame.contentWindow.triggerMotion) {
            live2dFrame.contentWindow.triggerMotion(state);
        } else if (live2dFrame.contentWindow && live2dFrame.contentWindow.playLive2DMotion) {
            live2dFrame.contentWindow.playLive2DMotion(state);
        }
    } catch (e) {
        console.error('[ClaudePet] Failed to trigger motion:', e);
    }
}

// 监听Electron主进程的事件
if (window.electronAPI) {
    // 监听动作触发事件
    window.electronAPI.onMotionTriggered((state) => {
        console.log('[ClaudePet] Motion triggered:', state);
        triggerLive2DMotion(state);
    });

    // 监听对话显示事件
    window.electronAPI.onDisplayDialog((content) => {
        console.log('[ClaudePet] Display dialog:', content);
        if (content.source) {
            showDialog(content.text, content.source);
        } else {
            showDialog(content);
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ClaudePet] Renderer process initialized');

    // 检查Live2D是否加载
    live2dFrame.onload = () => {
        console.log('[ClaudePet] Live2D frame loaded');
    };
});

// 导出给外部使用
window.claudePetUI = {
    showDialog,
    hideDialog,
    triggerMotion: triggerLive2DMotion
};
