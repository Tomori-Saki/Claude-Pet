# Claude/Codex Pet 🐾

一个实时检测 Claude/Codex CLI 对话流的桌宠应用，根据不同工作状态展现不同的动作和对话框。

## 功能特性

✨ **实时状态检测** - 监听 Claude/Codex CLI 的对话流，自动识别三种状态：
- 🔴 **待机** (Idle) - 无工作时
- 🟡 **工作中** (Working) - Agent 处理中
- 🟢 **生成中** (Output) - 文本生成中

🎨 **Live2D 动画** - 基于 Cubism SDK 2.1 的精美 Live2D 角色模型
- 支持 4 个不同的角色模型切换
- 平滑的动作切换
- 透明背景适配桌面

💬 **毛玻璃对话框** - 圆角矩形设计
- Claude 对话：橙色深色背景
- Codex 对话：蓝色深色背景
- 自动隐藏，支持长文本显示

## 安装

### 从 Release 下载
1. 访问 [Release 页面](https://github.com/your-repo/releases)
2. 下载最新版本的 `Claude Pet Setup.exe` 或 `Claude Pet.exe`
3. 运行安装程序或直接运行便携版

### 从源码构建
```bash
# 克隆项目
git clone https://github.com/your-repo/ClaudePet.git
cd ClaudePet

# 安装依赖
yarn install

# 开发模式运行
yarn dev

# 构建 Windows 版本
yarn build:win
```

## 使用

1. **启动应用**
   ```bash
   yarn start
   ```

2. **在 Claude CLI 中工作**
   - 打开 Claude CLI
   - Claude Pet 会自动监听并反应状态变化
   - 桌宠会根据状态表现不同动作

3. **窗口操作**
   - 拖动窗口移动位置
   - 右键或双击触发特定动作
   - 关闭窗口退出应用

## 项目结构

```
ClaudePet/
├── src/                      # Electron 主程序
│   ├── main.js              # 主进程（窗口管理）
│   ├── preload.js           # 预加载脚本
│   ├── detector.js          # CLI 检测器
│   └── renderer/
│       ├── index.html       # 主界面
│       ├── style.css        # 样式
│       └── app.js           # 前端逻辑
├── Live2dOnWeb/             # Live2D 模块
│   ├── desktop.html         # 透明背景页面
│   ├── waifu-tips.js        # Live2D 配置
│   └── model/               # 角色模型文件
├── assets/                  # 应用资源
│   └── icon.ico             # 应用图标
├── docs/                    # 项目文档
├── package.json             # 项目配置
└── README.md                # 本文件
```

## 技术栈

- **框架**: Electron 31.x
- **前端**: HTML5 + CSS3 + JavaScript
- **动画**: Live2D Cubism SDK 2.1
- **监听**: Chokidar (文件系统监听)
- **打包**: Electron Builder

## 开发文档

- [架构设计](docs/architecture.md) - 详细的系统设计
- [阶段进度](docs/) - 各阶段完成情况
  - 阶段 1: Electron 框架搭建
  - 阶段 2: Live2D 动作控制系统
  - 阶段 3: CLI 检测器实现
  - 阶段 4: 对话显示框实现
  - 阶段 5: 应用打包与发布
- [问题记录](docs/ISSUE-1.md) - 已解决的问题

## 系统要求

- **OS**: Windows 7 或更高版本
- **运行**: 无需额外依赖
- **开发**: Node.js 18+, Yarn/npm

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**项目状态**: ✅ 完成  
**当前版本**: v0.1.0  
**最后更新**: 2026-08-27
