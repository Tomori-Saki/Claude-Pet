# Claude Pet

实时检测 Claude Code CLI 对话流的桌面桌宠，根据工作状态展示 Live2D 动作与对话气泡。

**[⬇ 下载 Windows 便携版（最新）](https://github.com/Tomori-Saki/Claude-Codex-Pet/releases/latest/download/Claude-Pet-Portable.exe)**

## 功能介绍

### CLI 状态监测

监听 Claude Code 会话日志（`~/.claude/projects/**/*.jsonl`），自动识别三种状态：

- **待机（Idle）** — 无对话活动
- **工作中（Working）** — 用户发送消息，Agent 开始处理
- **输出中（Output）** — Claude 正在生成回复

### Live2D 角色（基于 [Live2dOnWeb](https://github.com/Konata09/Live2dOnWeb)）

Live2D 显示与动作系统基于开源项目 **Live2dOnWeb** 构建，支持该项目兼容的 **Cubism SDK 2.x / 4.x** 模型。将符合 Live2dOnWeb 规范的模型放入 `Live2dOnWeb/model/` 并在 `waifu-tips.js` 中注册后，即可载入使用，不限于预置角色。

- 透明背景，适配桌面桌宠场景
- 目光跟随鼠标
- 顶部栏 `>` 按钮切换模型
- 按状态播放动作（思考 / 输出 / 待机）

### 对话气泡

- Claude 输出按**行**逐条显示，每行一个气泡
- 全部展示完毕后再切回待机状态
- Claude 风格：橙色毛玻璃气泡

### 窗口交互

- 无边框透明窗口，可拖动、可缩放
- 置顶显示，不遮挡桌面操作

## 安装

### 方式一：下载打包版（推荐）

1. 打开 [Releases 页面](https://github.com/Tomori-Saki/Claude-Codex-Pet/releases/latest)
2. 下载 `Claude-Pet-Portable.exe`，双击运行，无需安装

也可直接点击 README 顶部的下载链接。

### 方式二：从源码运行

**环境要求：** Node.js 18+、Yarn

```bash
# 克隆项目
git clone https://github.com/Tomori-Saki/Claude-Codex-Pet.git
cd Claude-Codex-Pet

# 安装依赖
yarn install

# 启动应用
yarn start
```

**开发模式（带 DevTools）：**

```bash
yarn dev
```

**重新打包 Windows 便携版：**

```bash
yarn build:win
```

打包产物输出至 `dist/Claude-Pet-Portable.exe`。推送 `v*` 标签后会自动发布到 GitHub Releases。

## 致谢

本项目的 Live2D 显示与模型加载能力基于开源项目 **[Live2dOnWeb](https://github.com/Konata09/Live2dOnWeb)** 构建，感谢 [Konata09](https://github.com/Konata09) 及 Live2dOnWeb 社区贡献者的优秀工作。

- 项目地址：https://github.com/Konata09/Live2dOnWeb
- 本项目在 Live2dOnWeb 基础上集成了 Electron 桌宠、CLI 状态监测与对话气泡等功能
