/**
 * Claude Pet - CLI Detector
 * 监听 Claude Code JSONL transcripts，按行推送输出气泡
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
        this.idleTimer = null;
        this.outputStallTimer = null;
        this.outputStallMs = 4000;
        this.outputCompleteSent = false;
        this.fileOffsets = new Map();
        this.petStatePath = path.join(app.getPath('home'), '.claude', 'pet-state.json');
        // 每个会话文件追踪已推送的输出行
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
        const codexPath = path.join(home, '.codex');

        this.watchGlob(projectsPath, 'claude');
        this.watchFile(this.petStatePath, 'hooks');

        if (fs.existsSync(codexPath)) {
            this.watchGlob(codexPath, 'codex');
        }
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

        const tracker = this.getOutputTracker(filePath);

        for (const line of newLines) {
            let json;
            try {
                json = JSON.parse(line);
            } catch (_) {
                continue;
            }

            const eventType = json.type || json.event || '';

            // 用户消息 → 进入 working，重置输出追踪
            if (eventType === 'user') {
                tracker.sentLineCount = 0;
                tracker.lastFullText = '';
                tracker.outputStarted = false;
                tracker.outputComplete = false;
                this.outputCompleteSent = false;
                clearTimeout(this.idleTimer);
                this.handleStateChange('working', source);
                continue;
            }

            // 提取助手输出文本
            const textDelta = this.extractAssistantText(json);
            if (textDelta !== null) {
                this.processAssistantText(filePath, source, json, textDelta, tracker);
            }

            // 输出结束信号
            if (this.isOutputCompleteEvent(json)) {
                tracker.outputComplete = true;
                this.emitOutputComplete(source);
            }
        }
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

    processAssistantText(filePath, source, json, textDelta, tracker) {
        let fullText = tracker.lastFullText;

        // 增量或完整消息
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

        // 若本条 assistant 消息已结束，标记完成
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

        clearTimeout(this.idleTimer);

        this.mainWindow.webContents.send('output-lines', {
            lines,
            source: source === 'codex' ? 'codex' : 'claude'
        });

        console.log(`[CLIDetector] Output lines (${lines.length}):`, lines[0]?.slice(0, 40));

        // 若长时间无新行，视为输出结束（兼容无 stop_reason 的情况）
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
            source: source === 'codex' ? 'codex' : 'claude'
        });

        console.log('[CLIDetector] Output complete, waiting for UI queue');
    }

    scheduleIdleAfterOutput() {
        clearTimeout(this.idleTimer);
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
                text: source === 'codex' ? 'Codex 思考中...' : 'Claude 思考中...',
                source: source === 'codex' ? 'codex' : 'claude',
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
        clearTimeout(this.idleTimer);
        clearTimeout(this.outputStallTimer);
        this.watchers.forEach(w => { try { w.close(); } catch (_) { /* ignore */ } });
        this.watchers = [];
    }
}

module.exports = CLIDetector;
