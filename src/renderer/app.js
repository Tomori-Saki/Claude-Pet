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
let isHiding = false;

/**
 * 显示对话框
 */
function showDialog(content, source = 'claude') {
    clearTimeout(hideTimer);
    isHiding = false;

    // 移除隐藏动画类
    dialogContainer.classList.remove('dialog-hiding', 'dialog-hidden');
    dialogContainer.classList.add('dialog-show');

    currentSource = source;

    // 更新样式
    dialogBox.className = `dialog-box ${source}`;

    // 更新内容
    dialogText.textContent = content;

    console.log('[ClaudePetUI] Dialog shown:', { content, source });

    // 5秒后自动隐藏
    hideTimer = setTimeout(() => {
        hideDialog();
    }, 5000);
}

/**
 * 隐藏对话框
 */
function hideDialog() {
    if (isHiding) return;

    isHiding = true;
    clearTimeout(hideTimer);

    // 添加退出动画
    dialogContainer.classList.add('dialog-hiding');

    // 动画完成后隐藏
    setTimeout(() => {
        dialogContainer.classList.remove('dialog-hiding', 'dialog-show');
        dialogContainer.classList.add('dialog-hidden');
        isHiding = false;
    }, 300);

    console.log('[ClaudePetUI] Dialog hidden');
}

/**
 * 触发Live2D动作
 */
function triggerLive2DMotion(state) {
    try {
        // 访问iframe中的Live2D API
        if (live2dFrame.contentWindow) {
            if (live2dFrame.contentWindow.triggerMotion) {
                live2dFrame.contentWindow.triggerMotion(state);
                console.log('[ClaudePetUI] Motion triggered via window.triggerMotion:', state);
            } else if (live2dFrame.contentWindow.playLive2DMotion) {
                live2dFrame.contentWindow.playLive2DMotion(state);
                console.log('[ClaudePetUI] Motion triggered via window.playLive2DMotion:', state);
            } else {
                console.warn('[ClaudePetUI] Live2D API not found in iframe');
            }
        }
    } catch (e) {
        console.error('[ClaudePetUI] Failed to trigger motion:', e);
    }
}

/**
 * 处理状态变化
 */
function handleStateChange(state, source) {
    console.log('[ClaudePetUI] State changed:', { state, source });

    // 显示对话框
    const dialogMessages = {
        working: source === 'codex' ? 'Codex 思考中...' : 'Claude 思考中...',
        output: source === 'codex' ? 'Codex 生成中...' : 'Claude 生成中...',
        idle: '待机中'
    };

    if (state !== 'idle') {
        showDialog(dialogMessages[state] || '', source);
    } else {
        hideDialog();
    }

    // 触发动作
    triggerLive2DMotion(state);
}

// 监听Electron主进程的事件
if (window.electronAPI) {
    console.log('[ClaudePetUI] Electron API available');

    // 监听动作触发事件
    window.electronAPI.onMotionTriggered((state) => {
        console.log('[ClaudePetUI] Motion triggered event:', state);
        triggerLive2DMotion(state);
    });

    // 监听对话显示事件
    window.electronAPI.onDisplayDialog((content) => {
        console.log('[ClaudePetUI] Display dialog event:', content);
        if (content.source) {
            showDialog(content.text, content.source);
        } else {
            showDialog(content);
        }
    });
} else {
    console.warn('[ClaudePetUI] Electron API not available - running in browser mode');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ClaudePetUI] Renderer process initialized');

    // 初始化对话框状态
    dialogContainer.classList.add('dialog-hidden');

    // 检查Live2D是否加载
    if (live2dFrame) {
        live2dFrame.onload = () => {
            console.log('[ClaudePetUI] Live2D frame loaded');

            // 延迟一下，确保Live2D完全初始化
            setTimeout(() => {
                console.log('[ClaudePetUI] Testing Live2D API...');
                if (live2dFrame.contentWindow && live2dFrame.contentWindow.claudePet) {
                    console.log('[ClaudePetUI] Live2D Claude Pet API available:', live2dFrame.contentWindow.claudePet);
                }
            }, 2000);
        };
    }
});

// 导出给外部使用
window.claudePetUI = {
    showDialog,
    hideDialog,
    triggerMotion: triggerLive2DMotion,
    handleStateChange
};

console.log('[ClaudePetUI] UI module loaded');

