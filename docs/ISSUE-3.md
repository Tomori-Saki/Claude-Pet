# Issue #3: 阶段5打包后发现的功能缺陷

## 问题列表

### 问题1: 桌宠窗口无法移动和缩放
**状态**: 已解决

**描述**:
- 应用启动后窗口无法通过拖动移动
- 窗口无法调整大小（缩放）
**预期行为**:
- 用户应该能够通过鼠标拖动来移动窗口到任意位置
- 用户应该能够通过边缘拖动来调整窗口大小

**可能原因**:
- 应用窗口占据了整个电脑屏幕页面，但是无边框加透明背景导致了误以为是只有模型周边才是窗口。（可确认的原因）

- `src/main.js` 中窗口配置的 `resizable` 可能为 false
- CSS 样式中可能禁用了指针事件
- 窗口拖动事件处理没有实现


**相关文件**:
- src/main.js (line 21-23)
- src/renderer/style.css
- Live2dOnWeb/desktop.html

---
### 解决问题1而产生的问题1.1: Live2d模型不显示
**状态**：已解决
**描述**：问题1的问题全部解决后，live2d模型不显示
**可能原因**：Live2dOnWeb中显示live2d模型的功能没有完整迁移到新项目中。

### 问题2: 未监测到 Claude CLI 对话流和 Hooks 状态
**状态**: 已修复 ✅

**根因**:
- 检测器监听 `~/.claude/` 并匹配 `stream-json`，但 Claude Code 实际写入的是 `~/.claude/projects/**/*.jsonl` transcripts
- 解析逻辑使用 stream-json 事件名，与 JSONL 格式（`type: user/assistant`）不匹配

**修复** (`src/detector.js`):
- 改为监听 `~/.claude/projects/**/*.jsonl`
- 增量读取文件（记录 byte offset）
- 按 JSONL 格式解析：`user` → working，`assistant` → output，8s 无活动 → idle
- 可选监听 `~/.claude/pet-state.json`（Hooks 写入，见 `docs/hooks-setup.md`）
- preload/app.js 增加 `onStateChanged` IPC

**验证**: 启动应用后在 Claude Code 发消息，DevTools 应出现 `[CLIDetector] State: working`

---

### 问题3: 没有动作显示
**状态**: 已修复 ✅

**根因**:
- `motion-controller.js` 调用 `model.startMotion('thinking01', 2)`，SDK2 正确 API 是 `startMotion(group, index, priority)`
- 模型实例在 bundle 闭包内，`getLive2DModel()` 无法获取

**修复**:
- `live2d_bundle.js` 暴露 `live2dv2.getModel()`
- 新增 `live2d-bridge.js` 将模型挂到 canvas
- 重写 `motion-controller.js`：读取 model.json 建立动作索引，按组播放
- `desktop.html` 加载 bridge 脚本

**验证**: 点击调试面板 Working/Output 按钮，模型应播放 thinking/smile 动作

---

## 优先级
1. **高**: 问题2 - 监测功能是核心功能
2. **高**: 问题3 - 动作显示是主要视觉效果
3. **中**: 问题1 - 窗口交互改进

## 下一步行动
- [x] 修复问题2：JSONL transcripts 监听 + IPC
- [x] 修复问题3：SDK2 动作 API + 模型暴露
- [x] 打包后集成测试
- [x] 确认 `Live2dOnWeb/model/` 模型文件已包含在发布包中

**记录日期**: 2026-08-28  
**状态**: 问题3/3 已修复，待验证
