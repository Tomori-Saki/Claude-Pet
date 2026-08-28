/**
 * Claude Pet - CLI Detector
 * 监听 Claude Code JSONL 会话日志，按行推送输出气泡
 */

const fs = require('fs');
const path = require('path');
const { ipcMain, app } = require('electron');
const chokidar = require('chokidar');

class CLIDetector {
    constructor() {
        this.mainWindow = null;
        this.watchers = [];
        this.currentState = 'idle';
        this.debounceDelay = 200;
        this.debounceTimer = null;
        this.outputStallTimer = null;
        this.outputStallMs = 4000;
        // 对话流无新事件超过该时长则回到 idle（终端关闭、会话中断等）
        this.activityStallTimer = null;
        this.activityStallMs = 8000;
        this.outputCompleteSent = false;
        this.fileOffsets = new Map();
        this.petStatePath = path.join(app.getPath('home'), '.claude', 'pet-state.json');
        this.outputTrackers = new Map();
    }

    init(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupWatchers();
        this.setupIPCHandlers();
        console.log('[CLIDetector] Initialized');
    }

    setupIPCHandlers() {
        ipcMain.on('trigger-state-change', (_event, state) => {
            this.handleStateChange(state, 'manual');
        });

        ipcMain.on('get-current-state', (event) => {
            event.reply('current-state', this.currentState);
        });

        ipcMain.on('output-display-finished', () => {
            this.scheduleIdleAfterOutput();
        });
    }

    setupWatchers() {
        const home = app.getPath('home');
        const projectsPath = path.join(home, '.claude', 'projects');

        this.watchGlob(projectsPath, 'claude');
        this.watchFile(this.petStatePath, 'hooks');
    }

    watchGlob(dirPath, source) {
        if (!fs.existsSync(dirPath)) {
            console.warn(`[CLIDetector] Directory not found: ${dirPath}`);
        }

        const watcher = chokidar.watch(dirPath, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
            usePolling: process.platform === 'win32',
            interval: 500,
            depth: 10,
            ignored: (fp) => {
                if (fp.toLowerCase().endsWith('.jsonl')) return false;
                try {
                    return fs.existsSync(fp) && fs.statSync(fp).isFile();
                } catch (_) {
                    return false;
                }
            }
        });

        watcher.on('add', (fp) => this.handleFileUpdate(fp, source));
        watcher.on('change', (fp) => this.handleFileUpdate(fp, source));
        this.watchers.push(watcher);
    }

    watchFile(filePath, source) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) return;

        const watcher = chokidar.watch(filePath, {
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
        });

        watcher.on('add', () => this.handlePetStateFile(source));
        watcher.on('change', () => this.handlePetStateFile(source));
        this.watchers.push(watcher);
    }

    getOutputTracker(filePath) {
        if (!this.outputTrackers.has(filePath)) {
            this.outputTrackers.set(filePath, {
                sentLineCount: 0,
                lastFullText: '',
                outputStarted: false,
                outputComplete: false
            });
        }
        return this.outputTrackers.get(filePath);
    }

    handlePetStateFile(source) {
        try {
            if (!fs.existsSync(this.petStatePath)) return;
            const json = JSON.parse(fs.readFileSync(this.petStatePath, 'utf-8'));
            const state = json.state || json.status;
            if (state && ['idle', 'working', 'output'].includes(state)) {
                this.handleStateChange(state, source);
            }
        } catch (e) {
            console.error('[CLIDetector] pet-state.json parse error:', e.message);
        }
    }

    handleFileUpdate(filePath, source) {
        if (!this.isRelevantFile(filePath)) return;

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                this.processNewJsonlLines(filePath, source);
            } catch (error) {
                console.error(`[CLIDetector] Error reading ${filePath}:`, error.message);
            }
        }, this.debounceDelay);
    }

    processNewJsonlLines(filePath, source) {
        const newLines = this.readNewFileLines(filePath);
        if (!newLines.length) return;

        this.touchActivity(source);
        const tracker = this.getOutputTracker(filePath);

        for (const line of newLines) {
            let json;
            try {
                json = JSON.parse(line);
            } catch (_) {
                continue;
            }

            this.processClaudeLine(json, tracker, source);
        }
    }

    /** Claude Code JSONL：type 为 user / assistant / stream delta */
    processClaudeLine(json, tracker, source) {
        const eventType = json.type || json.event || '';

        if (eventType === 'user') {
            this.resetOutputTracker(tracker);
            this.handleStateChange('working', source);
            return;
        }

        const textDelta = this.extractAssistantText(json);
        if (textDelta !== null) {
            this.processAssistantText(json, textDelta, tracker, source);
        }

        if (this.isOutputCompleteEvent(json)) {
            tracker.outputComplete = true;
            this.emitOutputComplete(source);
        }
    }

    resetOutputTracker(tracker) {
        tracker.sentLineCount = 0;
        tracker.lastFullText = '';
        tracker.outputStarted = false;
        tracker.outputComplete = false;
        this.outputCompleteSent = false;
    }

    readNewFileLines(filePath) {
        if (!fs.existsSync(filePath)) return [];

        const stat = fs.statSync(filePath);
        let offset = this.fileOffsets.get(filePath) || 0;

        if (stat.size < offset) offset = 0;

        const length = stat.size - offset;
        if (length <= 0) return [];

        const buffer = Buffer.alloc(length);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, length, offset);
        fs.closeSync(fd);
        this.fileOffsets.set(filePath, stat.size);

        return buffer.toString('utf-8').split('\n').filter(l => l.trim());
    }

    extractAssistantText(json) {
        const type = json.type || '';

        if (type === 'assistant') {
            return this.textFromContentBlocks(json.message?.content);
        }

        if (type === 'content_block_delta' && json.delta?.type === 'text_delta') {
            return json.delta.text || '';
        }

        if (type === 'stream_delta') {
            return json.delta?.text || json.text || '';
        }

        return null;
    }

    textFromContentBlocks(content) {
        if (typeof content === 'string') return content;
        if (!Array.isArray(content)) return '';

        return content
            .filter(b => b.type === 'text')
            .map(b => b.text || '')
            .join('');
    }

    processAssistantText(json, textDelta, tracker, source) {
        let fullText = tracker.lastFullText;

        if (textDelta.startsWith(fullText) || fullText === '') {
            fullText = textDelta;
        } else if (fullText.startsWith(textDelta)) {
            // 忽略旧内容
        } else {
            fullText += textDelta;
        }

        tracker.lastFullText = fullText;

        const allLines = fullText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        const newLines = allLines.slice(tracker.sentLineCount);
        if (!newLines.length) return;

        tracker.sentLineCount = allLines.length;

        if (!tracker.outputStarted) {
            tracker.outputStarted = true;
            this.handleStateChange('output', source, { skipDialog: true });
        }

        this.emitOutputLines(newLines, source);

        if (json.message?.stop_reason || json.stop_reason) {
            tracker.outputComplete = true;
            this.emitOutputComplete(source);
        }
    }

    isOutputCompleteEvent(json) {
        const type = json.type || '';
        return (
            type === 'message_stop' ||
            type === 'stream_end' ||
            type === 'stream_end_event' ||
            type === 'result' ||
            json.event === 'message_stop'
        );
    }

    emitOutputLines(lines, source) {
        if (!this.mainWindow?.webContents || !lines.length) return;

        this.mainWindow.webContents.send('output-lines', {
            lines,
            source: 'claude'
        });

        console.log(`[CLIDetector] Output lines (${lines.length}):`, lines[0]?.slice(0, 40));

        clearTimeout(this.outputStallTimer);
        this.outputStallTimer = setTimeout(() => {
            if (this.currentState === 'output') {
                this.emitOutputComplete(source);
            }
        }, this.outputStallMs);
    }

    emitOutputComplete(source) {
        if (this.outputCompleteSent || !this.mainWindow?.webContents) return;
        this.outputCompleteSent = true;
        clearTimeout(this.outputStallTimer);

        this.mainWindow.webContents.send('output-complete', {
            source: 'claude'
        });

        console.log('[CLIDetector] Output complete, waiting for UI queue');
    }

    scheduleIdleAfterOutput() {
        this.clearActivityWatchdog();
        this.handleStateChange('idle', 'cli');
    }

    /** 任意 JSONL 新事件时重置；超时后视为对话流已结束 */
    touchActivity(source) {
        this.clearActivityWatchdog();
        if (this.currentState === 'idle') return;

        this.activityStallTimer = setTimeout(() => {
            this.handleActivityStall(source);
        }, this.activityStallMs);
    }

    clearActivityWatchdog() {
        clearTimeout(this.activityStallTimer);
        this.activityStallTimer = null;
    }

    /**
     * 对话流长时间无更新（如终端被关闭、Claude 异常退出）
     * working → 直接 idle；output → 先结束输出再走 idle 流程
     */
    handleActivityStall(source) {
        if (this.currentState === 'idle') return;

        console.log(`[CLIDetector] ${this.activityStallMs}ms 无新事件，回到 idle (${this.currentState})`);

        if (this.currentState === 'output') {
            this.emitOutputComplete(source);
            // 若 UI 没有输出气泡，可能不会触发 output-display-finished，兜底切 idle
            setTimeout(() => {
                if (this.currentState !== 'idle') {
                    this.handleStateChange('idle', 'cli');
                }
            }, 500);
            return;
        }

        this.handleStateChange('idle', 'cli');
    }

    isRelevantFile(filePath) {
        const lower = filePath.toLowerCase();
        return lower.endsWith('.jsonl') ||
            lower.endsWith('pet-state.json') ||
            lower.includes('stream-json');
    }

    handleStateChange(state, source = 'cli', options = {}) {
        if (!['idle', 'working', 'output'].includes(state)) return;

        const prevState = this.currentState;
        if (state === prevState && state !== 'working') return;

        this.currentState = state;
        console.log(`[CLIDetector] State: ${state} (${source})`);

        if (state === 'idle') {
            this.clearActivityWatchdog();
        } else {
            this.touchActivity(source);
        }

        if (!this.mainWindow?.webContents) return;

        this.mainWindow.webContents.send('state-changed', {
            state,
            source,
            timestamp: new Date().toISOString()
        });

        if (state !== prevState) {
            this.mainWindow.webContents.send('motion-triggered', state);
        }

        if (options.skipDialog) return;

        if (state === 'working') {
            this.mainWindow.webContents.send('display-dialog', {
                text: 'Claude 思考中...',
                source: 'claude',
                mode: 'status'
            });
        } else if (state === 'idle') {
            this.outputCompleteSent = false;
            this.mainWindow.webContents.send('display-dialog', { hide: true });
            this.outputTrackers.forEach(t => {
                t.sentLineCount = 0;
                t.lastFullText = '';
                t.outputStarted = false;
                t.outputComplete = false;
            });
        }
    }

    parseStreamJSON(content) {
        if (!content?.trim()) return 'idle';
        const lines = content.split('\n').filter(l => l.trim());
        let last = 'idle';
        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.type === 'user') last = 'working';
                else if (json.type === 'assistant') last = 'output';
            } catch (_) { /* ignore */ }
        }
        return last;
    }

    setState(state, source = 'manual') {
        this.handleStateChange(state, source);
    }

    destroy() {
        clearTimeout(this.debounceTimer);
        clearTimeout(this.outputStallTimer);
        this.clearActivityWatchdog();
        this.watchers.forEach(w => { try { w.close(); } catch (_) { /* ignore */ } });
        this.watchers = [];
    }
}

module.exports = CLIDetector;
