# 架构设计

## 技术栈
- **桌面框架**: Electron
- **前端**: HTML + CSS + JavaScript
- **Live2D**: Live2dOnWeb (Cubism SDK 2.1)
- **CLI检测**: Node.js fs.watch

## 目录结构
```
ClaudePet/
├── src/                    # Electron主程序
│   ├── main.js            # 主进程（窗口管理）
│   ├── preload.js         # 预加载脚本
│   ├── renderer/          # 渲染进程
│   │   ├── index.html     # 主界面
│   │   ├── style.css      # 样式（毛玻璃、圆角）
│   │   └── app.js         # 前端逻辑
│   └── detector.js        # CLI对话流检测器
├── Live2dOnWeb/           # Live2D显示模块
│   ├── desktop.html       # 桌宠专用页面（透明背景）
│   ├── waifu-tips.js      # Live2D配置
│   ├── dist/              # Live2D核心库
│   └── model/             # Live2D模型文件
│       ├── 036_live_default/
│       ├── 036_dream_festival_3_ur/
│       ├── 341_casual-2023/
│       └── 341_event_297_story_01/
├── reference/             # 参考素材（已生成）
│   ├── character_full.png
│   ├── character_side.png
│   ├── character_thinking.png
│   ├── character_talking.png
│   └── laptop_claude.png
├── scripts/               # 工具脚本
│   ├── generate_image.py  # GPT-image-2
│   └── Vedio.py           # seedance2.5
└── docs/                  # 文档
```

## 核心模块

### 1. 窗口管理 (main.js)
- 创建透明无边框窗口
- 窗口置顶、可拖动
- 设置窗口大小和位置
- 加载Live2dOnWeb的desktop.html

### 2. Live2D系统 (Live2dOnWeb/)
- 基于Cubism SDK 2.1的Live2D模型显示
- 支持4个角色模型切换
- 点击触发动作播放
- 透明背景适配桌宠

**动作控制API（待实现）：**
```javascript
// 从Electron主进程调用Live2D动作
window.triggerMotion('idle')     // 待机动作
window.triggerMotion('working')  // 工作动作
window.triggerMotion('output')   // 输出动作
```

### 3. CLI检测器 (detector.js)
- 监听 Claude CLI 日志文件或stream-json
- 解析对话流状态：用户输入/agent工作/agent输出
- 通过IPC发送状态到渲染进程

### 4. 对话显示 (renderer/)
- 接收对话流内容
- 根据来源（Claude/Codex）切换毛玻璃颜色
- 橙色深色（Claude）/ 蓝色深色（Codex）

## 状态定义
```javascript
const STATE = {
  IDLE: 'idle',        // 待机
  WORKING: 'working',  // 工作中
  OUTPUT: 'output'     // 输出中
}
```

## CLI检测逻辑
1. 监听 `~/.claude/` 或 Codex 日志目录
2. 解析stream-json判断状态
3. 触发状态切换事件
4. 调用Live2D动作API

## TODO
- [ ] 实现Electron主进程和窗口管理
- [ ] 集成Live2dOnWeb到Electron中
- [ ] 实现Live2D动作控制API（通过检测model.json的motions字段）
- [ ] 实现CLI对话流检测器
- [ ] 实现对话显示框（毛玻璃效果）
- [ ] 实现状态机和动作切换逻辑
- [ ] 打包为可执行文件
