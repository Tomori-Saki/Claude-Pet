/**
 * Claude Pet - Renderer Process
 */

console.log('[ClaudePetUI] Renderer script loaded');

const dialogContainer = document.getElementById('dialog-container');
const dialogBox = document.querySelector('.dialog-box');
const dialogText = document.querySelector('.dialog-text');

const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const switchModelBtn = document.getElementById('switch-model-btn');

const live2dFrame = document.getElementById('live2dFrame');

let currentSource = 'claude';
let hideTimer = null;
let isHiding = false;
let currentMotionState = 'idle';
let outputMotionTriggered = false;

// 输出行气泡队列
const bubbleQueue = [];
let bubbleProcessing = false;
let outputCompletePending = false;
const BUBBLE_DISPLAY_MS = 2800;

if (live2dFrame) {
    live2dFrame.addEventListener('load', () => {
        console.log('[ClaudePetUI] Live2D iframe loaded');
    });
}

if (window.electronAPI) {
    minimizeBtn?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maximizeBtn?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.electronAPI.closeWindow();
    });
    switchModelBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchLive2DModel();
    });
}

// 窗口调整大小
let isResizing = false;
let resizeDirection = '';
let startX = 0, startY = 0, startWidth = 0, startHeight = 0, startPosX = 0, startPosY = 0;

document.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeDirection = handle.className.split(' ').find(c => c.startsWith('resize-'));
        startX = e.screenX;
        startY = e.screenY;
        if (window.electronAPI?.getWindowBounds) {
            const bounds = window.electronAPI.getWindowBounds();
            startWidth = bounds.width;
            startHeight = bounds.height;
            startPosX = bounds.x;
            startPosY = bounds.y;
        } else {
            startWidth = window.innerWidth;
            startHeight = window.innerHeight;
        }
        e.preventDefault();
    });
});

document.addEventListener('mousemove', (e) => {
    if (isResizing) {
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        let newWidth = startWidth, newHeight = startHeight, newX = startPosX, newY = startPosY;
        if (resizeDirection.includes('right')) newWidth = Math.max(300, startWidth + deltaX);
        if (resizeDirection.includes('left')) { newWidth = Math.max(300, startWidth - deltaX); newX = startPosX + deltaX; }
        if (resizeDirection.includes('bottom')) newHeight = Math.max(400, startHeight + deltaY);
        if (resizeDirection.includes('top')) { newHeight = Math.max(400, startHeight - deltaY); newY = startPosY + deltaY; }
        window.electronAPI?.resizeWindow({ width: Math.round(newWidth), height: Math.round(newHeight), x: Math.round(newX), y: Math.round(newY) });
        return;
    }
    forwardMouseToLive2D(e);
});

document.addEventListener('mouseup', () => {
    if (isResizing) { isResizing = false; resizeDirection = ''; }
});

function forwardMouseToLive2D(e) {
    if (!live2dFrame?.contentWindow) return;
    const rect = live2dFrame.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    live2dFrame.contentWindow.postMessage({ type: 'live2d-mousemove', x, y }, '*');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 显示单个气泡（不自动排队隐藏，由队列控制）
 */
function showBubble(content, source = 'claude') {
    clearTimeout(hideTimer);
    isHiding = false;
    currentSource = source;

    dialogContainer.classList.remove('dialog-hiding', 'dialog-hidden');
    dialogContainer.classList.add('dialog-show');
    dialogBox.className = `dialog-box ${source}`;
    dialogText.textContent = content;
}

function hideDialog() {
    if (isHiding) return;
    isHiding = true;
    clearTimeout(hideTimer);
    dialogContainer.classList.add('dialog-hiding');
    setTimeout(() => {
        dialogContainer.classList.remove('dialog-hiding', 'dialog-show');
        dialogContainer.classList.add('dialog-hidden');
        isHiding = false;
    }, 300);
}

/**
 * 将输出行加入队列，逐行显示
 */
function enqueueOutputLines(lines, source = 'claude') {
    lines.forEach(line => bubbleQueue.push({ text: line, source }));
    if (!bubbleProcessing) processBubbleQueue();
}

async function processBubbleQueue() {
    if (bubbleProcessing) return;
    bubbleProcessing = true;

    if (!outputMotionTriggered) {
        outputMotionTriggered = true;
        triggerLive2DMotion('output');
    }

    while (bubbleQueue.length > 0) {
        const { text, source } = bubbleQueue.shift();
        showBubble(text, source);
        await delay(BUBBLE_DISPLAY_MS);
    }

    bubbleProcessing = false;
    outputMotionTriggered = false;

    if (outputCompletePending) {
        outputCompletePending = false;
        hideDialog();
        window.electronAPI?.notifyOutputDisplayFinished();
    }
}

function onOutputComplete() {
    if (bubbleQueue.length > 0 || bubbleProcessing) {
        outputCompletePending = true;
    } else {
        hideDialog();
        window.electronAPI?.notifyOutputDisplayFinished();
    }
}

function triggerLive2DMotion(state) {
    if (state === currentMotionState && state !== 'output') return;
    currentMotionState = state;

    try {
        const win = live2dFrame?.contentWindow;
        if (!win) return;
        if (win.triggerMotion) win.triggerMotion(state);
        else if (win.playLive2DMotion) win.playLive2DMotion(state);
    } catch (e) {
        console.error('[ClaudePetUI] Failed to trigger motion:', e);
    }
}

function switchLive2DModel() {
    try {
        if (live2dFrame?.contentWindow?.loadOtherModel) {
            live2dFrame.contentWindow.loadOtherModel();
            showBubble('模型已切换', 'claude');
            setTimeout(hideDialog, 2000);
        }
    } catch (e) {
        console.error('[ClaudePetUI] Failed to switch model:', e);
    }
}

function handleStateChange(state, source) {
    if (state === 'working') {
        bubbleQueue.length = 0;
        bubbleProcessing = false;
        outputCompletePending = false;
        outputMotionTriggered = false;
        showBubble('Claude 思考中...', 'claude');
        triggerLive2DMotion('working');
    } else if (state === 'idle') {
        bubbleQueue.length = 0;
        bubbleProcessing = false;
        outputCompletePending = false;
        outputMotionTriggered = false;
        hideDialog();
        triggerLive2DMotion('idle');
    }
}

if (window.electronAPI) {
    window.electronAPI.onStateChanged(({ state, source }) => {
        handleStateChange(state, source);
    });

    window.electronAPI.onOutputLines(({ lines, source }) => {
        enqueueOutputLines(lines, source);
    });

    window.electronAPI.onOutputComplete(() => {
        onOutputComplete();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    dialogContainer.classList.add('dialog-hidden');
});

window.claudePetUI = {
    showBubble,
    hideDialog,
    enqueueOutputLines,
    triggerMotion: triggerLive2DMotion,
    handleStateChange
};

console.log('[ClaudePetUI] UI module loaded');
