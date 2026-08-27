/**
 * Claude Pet - CLI Detector Test
 * 用于测试CLI检测器的功能
 */

const CLIDetector = require('./detector');
const { ipcMain, app } = require('electron');

class CLIDetectorTest {
    constructor() {
        this.detector = null;
    }

    /**
     * 初始化测试
     */
    init(mainWindow) {
        this.detector = new CLIDetector();
        this.detector.init(mainWindow);

        // 注册测试命令
        this.setupTestCommands();

        console.log('[CLIDetectorTest] Initialized');
    }

    /**
     * 设置测试命令
     */
    setupTestCommands() {
        // 测试状态变化
        ipcMain.on('test-state-change', (event, state) => {
            console.log('[CLIDetectorTest] Testing state change:', state);
            this.detector.setState(state, 'test');
        });

        // 获取当前状态
        ipcMain.on('get-detector-state', (event) => {
            const state = this.detector.getCurrentState();
            event.reply('detector-state', state);
        });

        // 测试解析stream-json
        ipcMain.on('test-parse-json', (event, content) => {
            const state = this.detector.parseStreamJSON(content, 'test');
            event.reply('parse-result', state);
        });
    }

    /**
     * 模拟Claude CLI活动
     */
    simulateClaudeActivity() {
        console.log('[CLIDetectorTest] Simulating Claude activity...');

        // 模拟工作开始
        setTimeout(() => {
            console.log('[CLIDetectorTest] Simulating stream_start');
            this.detector.setState('working', 'simulated');
        }, 1000);

        // 模拟输出中
        setTimeout(() => {
            console.log('[CLIDetectorTest] Simulating stream_delta');
            this.detector.setState('output', 'simulated');
        }, 3000);

        // 模拟完成
        setTimeout(() => {
            console.log('[CLIDetectorTest] Simulating stream_end');
            this.detector.setState('idle', 'simulated');
        }, 5000);
    }

    /**
     * 获取检测器实例
     */
    getDetector() {
        return this.detector;
    }
}

module.exports = CLIDetectorTest;
