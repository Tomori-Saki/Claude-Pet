# Claude Pet Hooks 配置示例

Claude Pet 默认监听 `~/.claude/projects/**/*.jsonl` 会话文件。若需更实时的状态同步，可在 Claude Code 中配置 Hooks 写入状态文件。

## 方式一：自动监听 JSONL（默认，无需配置）

检测器会监听 Claude Code 会话 transcripts：
- Windows: `%USERPROFILE%\.claude\projects\**\*.jsonl`
- macOS/Linux: `~/.claude/projects/**/*.jsonl`

状态映射：
- `type: "user"` → working
- `type: "assistant"` → output
- 8 秒无新事件 → idle

## 方式二：Hooks 写入状态文件（可选，更精确）

在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node -e \"require('fs').writeFileSync(require('path').join(require('os').homedir(),'.claude','pet-state.json'), JSON.stringify({state:'working',ts:Date.now()}))\""
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node -e \"require('fs').writeFileSync(require('path').join(require('os').homedir(),'.claude','pet-state.json'), JSON.stringify({state:'idle',ts:Date.now()}))\""
      }]
    }]
  }
}
```

Pet 会额外监听 `~/.claude/pet-state.json`。

## 验证

1. 启动 Claude Pet，打开 DevTools 查看 `[CLIDetector]` 日志
2. 在 Claude Code 中发送一条消息
3. 应看到 `State: working (claude)` 及对话框/动作
