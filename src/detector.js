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
    }

    /**
     * 初始化检测器
     */
    init(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupWatchers();
    }

    /**
     * 设置文件监听器
     */
    setupWatchers() {
        // Claude CLI日志路径
        const claudePath = path.join(app.getPath('home'), '.claude');
        const codexPath = path.join(app.getPath('home'), '.codex');

        // 监听Claude
        if (fs.existsSync(claudePath)) {
            console.log('[ClaudePet] Watching Claude logs at:', claudePath);
            const claudeWatcher = chokidar.watch(claudePath, {
                persistent: true,
                ignored: /(^|[\/\\])\./,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100
                }
            });

            claudeWatcher.on('change', (filePath) => {
                this.handleClaudeLogChange(filePath);
            });

            this.watchers.push(claudeWatcher);
        }

        // 监听Codex（可选）
        if (fs.existsSync(codexPath)) {
            console.log('[ClaudePet] Watching Codex logs at:', codexPath);
            const codexWatcher = chokidar.watch(codexPath, {
                persistent: true,
                ignored: /(^|[\/\\])\./,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100
                }
            });

            codexWatcher.on('change', (filePath) => {
                this.handleCodexLogChange(filePath);
            });

            this.watchers.push(codexWatcher);
        }
    }

    /**
     * 处理Claude日志变化
     */
    handleClaudeLogChange(filePath) {
        try {
            // 只关注stream-json文件
            if (!filePath.includes('stream-json')) return;

            const content = fs.readFileSync(filePath, 'utf-8');
            const state = this.parseStreamJSON(content);

            if (state !== this.currentState) {
                this.currentState = state;
                this.notifyStateChange(state, 'claude', content);
            }
        } catch (error) {
            console.error('[ClaudePet] Error handling Claude log:', error);
        }
    }

    /**
     * 处理Codex日志变化
     */
    handleCodexLogChange(filePath) {
        try {
            if (!filePath.includes('stream-json')) return;

            const content = fs.readFileSync(filePath, 'utf-8');
            const state = this.parseStreamJSON(content);

            if (state !== this.currentState) {
                this.currentState = state;
                this.notifyStateChange(state, 'codex', content);
            }
        } catch (error) {
            console.error('[ClaudePet] Error handling Codex log:', error);
        }
    }

    /**
     * 解析stream-json判断状态
     */
    parseStreamJSON(content) {
        try {
            // 简单的状态判断逻辑
            // 可以根据实际的stream-json格式调整

            if (!content || content.length === 0) {
                return 'idle';
            }

            // 检查是否包含"stream_start"表示开始工作
            if (content.includes('"type":"stream_start"') || content.includes('stream_start')) {
                return 'working';
            }

            // 检查是否包含"stream_delta"表示输出中
            if (content.includes('"type":"stream_delta"') || content.includes('stream_delta')) {
                return 'output';
            }

            // 检查是否包含"stream_end"表示工作完成
            if (content.includes('"type":"stream_end"') || content.includes('stream_end')) {
                return 'idle';
            }

            return 'idle';
        } catch (error) {
            console.error('[ClaudePet] Error parsing stream JSON:', error);
            return 'idle';
        }
    }

    /**
     * 通知状态变化
     */
    notifyStateChange(state, source, content) {
        console.log(`[ClaudePet] State changed to: ${state} (${source})`);

        if (this.mainWindow && this.mainWindow.webContents) {
            // 发送状态变化事件
            this.mainWindow.webContents.send('state-changed', {
                state,
                source,
                timestamp: new Date().toISOString()
            });

            // 触发对应的动作
            this.mainWindow.webContents.send('motion-triggered', state);
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.watchers.forEach(watcher => {
            watcher.close();
        });
        this.watchers = [];
    }
}

module.exports = CLIDetector;
