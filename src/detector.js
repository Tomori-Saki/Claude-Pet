/**
 * Claude Pet - CLI Detector
 * 监听Claude/Codex CLI的对话流
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
        this.lastEventTime = 0;
        this.debounceDelay = 500; // 防抖延迟
        this.debounceTimer = null;
    }

    /**
     * 初始化检测器
     */
    init(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupWatchers();
        this.setupIPCHandlers();
        console.log('[CLIDetector] Initialized');
    }

    /**
     * 设置IPC处理器
     */
    setupIPCHandlers() {
        ipcMain.on('trigger-state-change', (event, state) => {
            this.handleStateChange(state);
        });

        ipcMain.on('get-current-state', (event) => {
            event.reply('current-state', this.currentState);
        });
    }

    /**
     * 设置文件监听器
     */
    setupWatchers() {
        // Claude CLI日志路径
        const claudePath = path.join(app.getPath('home'), '.claude');
        const codexPath = path.join(app.getPath('home'), '.codex');

        // 监听Claude
        this.watchDirectory(claudePath, 'claude');

        // 监听Codex（可选）
        this.watchDirectory(codexPath, 'codex');

        console.log('[CLIDetector] Watchers setup complete');
    }

    /**
     * 监听指定目录
     */
    watchDirectory(dirPath, source) {
        if (!fs.existsSync(dirPath)) {
            console.log(`[CLIDetector] ${source} directory not found: ${dirPath}`);
            return;
        }

        console.log(`[CLIDetector] Watching ${source} at: ${dirPath}`);

        const watcher = chokidar.watch(dirPath, {
            persistent: true,
            ignored: /(^|[\/\\])\./,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            },
            depth: 5
        });

        watcher.on('change', (filePath) => {
            this.handleLogChange(filePath, source);
        });

        watcher.on('add', (filePath) => {
            this.handleLogChange(filePath, source);
        });

        this.watchers.push(watcher);
    }

    /**
     * 处理日志变化
     */
    handleLogChange(filePath, source) {
        // 只关注stream-json或类似的日志文件
        if (!this.isRelevantFile(filePath)) {
            return;
        }

        // 防抖处理
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const state = this.parseStreamJSON(content, filePath);

                if (state !== this.currentState) {
                    this.handleStateChange(state, source);
                }
            } catch (error) {
                console.error(`[CLIDetector] Error reading file ${filePath}:`, error.message);
            }
        }, this.debounceDelay);
    }

    /**
     * 判断是否是相关文件
     */
    isRelevantFile(filePath) {
        const relevantPatterns = [
            'stream-json',
            'stream.json',
            'log',
            '.claude',
            '.codex',
            'session',
            'history'
        ];

        return relevantPatterns.some(pattern => filePath.toLowerCase().includes(pattern));
    }

    /**
     * 解析stream-json判断状态
     */
    parseStreamJSON(content, filePath) {
        try {
            if (!content || content.length === 0) {
                return 'idle';
            }

            // 检查文件大小变化（新增内容）
            // 如果文件包含多行JSON，检查最后的状态

            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                return 'idle';
            }

            const lastLine = lines[lines.length - 1];

            // 尝试解析最后一行为JSON
            try {
                const json = JSON.parse(lastLine);

                // 根据event type判断状态
                if (json.type) {
                    switch (json.type) {
                        case 'stream_start':
                        case 'stream_start_event':
                            return 'working';

                        case 'stream_delta':
                        case 'content_block_delta':
                        case 'input_deltas':
                            return 'output';

                        case 'stream_end':
                        case 'stream_end_event':
                        case 'message_stop':
                            return 'idle';

                        default:
                            // 如果有message_start，表示开始工作
                            if (json.type.includes('start')) {
                                return 'working';
                            }
                            // 如果有delta，表示输出
                            if (json.type.includes('delta') || json.type.includes('output')) {
                                return 'output';
                            }
                    }
                }

                // 检查其他字段
                if (json.event) {
                    if (json.event.includes('start')) {
                        return 'working';
                    }
                    if (json.event.includes('stop')) {
                        return 'idle';
                    }
                }
            } catch (parseError) {
                // JSON解析失败，尝试文本匹配
                const contentLower = content.toLowerCase();

                if (contentLower.includes('stream_start') || contentLower.includes('message_start')) {
                    return 'working';
                }
                if (contentLower.includes('content_block_delta') || contentLower.includes('stream_delta')) {
                    return 'output';
                }
                if (contentLower.includes('stream_end') || contentLower.includes('message_stop')) {
                    return 'idle';
                }
            }

            return 'idle';
        } catch (error) {
            console.error('[CLIDetector] Error parsing stream JSON:', error);
            return 'idle';
        }
    }

    /**
     * 处理状态变化
     */
    handleStateChange(state, source = 'cli') {
        if (state === this.currentState) {
            return;
        }

        this.currentState = state;
        const timestamp = new Date().toISOString();

        console.log(`[CLIDetector] State changed: ${state} (${source}) at ${timestamp}`);

        if (this.mainWindow && this.mainWindow.webContents) {
            // 发送状态变化事件
            this.mainWindow.webContents.send('state-changed', {
                state,
                source,
                timestamp
            });

            // 触发对应的动作
            this.mainWindow.webContents.send('motion-triggered', state);

            // 根据状态显示对话框（可选）
            if (state === 'working') {
                this.mainWindow.webContents.send('display-dialog', {
                    text: '思考中...',
                    source: source === 'codex' ? 'codex' : 'claude'
                });
            } else if (state === 'output') {
                this.mainWindow.webContents.send('display-dialog', {
                    text: '生成中...',
                    source: source === 'codex' ? 'codex' : 'claude'
                });
            }
        }
    }

    /**
     * 获取当前状态
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * 手动设置状态（用于测试）
     */
    setState(state, source = 'manual') {
        this.handleStateChange(state, source);
    }

    /**
     * 清理资源
     */
    destroy() {
        clearTimeout(this.debounceTimer);
        this.watchers.forEach(watcher => {
            try {
                watcher.close();
            } catch (e) {
                console.error('[CLIDetector] Error closing watcher:', e);
            }
        });
        this.watchers = [];
        console.log('[CLIDetector] Destroyed');
    }
}

module.exports = CLIDetector;

