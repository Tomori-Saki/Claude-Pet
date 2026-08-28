# 开发任务清单

## 阶段0：素材准备 ✅
- [x] 集成开源项目Live2dOnWeb
- [x] 修改背景为透明
- [x] 配置4个Live2D模型（SDK 2.1）
- [x] 创建桌宠专用页面desktop.html
- [x] 生成参考图（5张：角色+笔记本电脑）

**可用的Live2D动作映射：**
- 待机(idle): `idle01`, `smile01-04` (循环播放)
- 工作(working): `thinking01-02`, `serious01-02` (思考、专注)
- 输出(output): `smile01-04`, `kandou01-03` (微笑、兴奋)

## 阶段1：Electron框架搭建 ✅
- [x] 初始化Electron项目（package.json）
- [x] 创建src目录结构
- [x] 实现main.js（透明无边框窗口，加载Live2dOnWeb/desktop.html）
- [x] 实现preload.js（IPC桥接）
- [x] 实现detector.js（CLI对话流检测器框架）
- [x] 创建renderer目录的HTML/CSS/JS（对话框显示）
- [x] 测试Live2D模型在Electron中显示

**注意：** 
- npm install在运行，完成后可测试Electron应用
- 启动：npm start

## 阶段2：Live2D动作控制 ✅
- [x] 实现改进的motion-controller.js
- [x] 支持多种方式获取Live2D模型
- [x] 实现状态机（idle/working/output）
- [x] 暴露动作控制API
  - `window.triggerMotion(state)` - 按状态触发动作
  - `window.playLive2DMotion(motionName)` - 直接播放动作
  - `window.claudePet` - 完整API对象
- [x] 创建测试页面(test.html)用于验证

**动作映射：**
- idle: 无动作
- working: thinking01 → thinking02 → thinking01 → ...（循环）
- output: 随机从smile01-04和kandou01-03中选择

**测试方法：**
在浏览器控制台调用：
```javascript
window.triggerMotion('working')  // 触发工作动作
window.triggerMotion('output')   // 触发输出动作
window.triggerMotion('idle')     // 切换到待机
```

## 阶段3：CLI检测器 ✅
- [x] 完善detector.js
  - 支持监听Claude和Codex CLI目录
  - 智能解析stream-json格式
  - 支持JSON和文本双重匹配
  - 防抖处理防止频繁更新
  - IPC处理器
- [x] 创建detector-test.js用于测试
- [x] 创建detector-test.html网页测试工具
- [x] 实现状态识别逻辑
  - stream_start → working
  - stream_delta/content_block_delta → output
  - stream_end/message_stop → idle

**测试方法：**
打开 `http://localhost:8080/detector-test.html` 进行测试

**功能特性：**

- 自动检测Claude/Codex CLI活动
- 实时状态变化
- 触发Live2D动作
- 显示对话框提示（思考中/生成中）
- JSON解析测试工具

## 阶段4：对话显示 ✅
- [x] 对话框UI（圆角矩形、毛玻璃）
- [x] 显示对话流内容
- [x] 根据来源切换颜色（橙/蓝）
- [x] 自动滚动和内容截断
- [x] 集成到Live2D显示下方
- [x] 改进的style.css（强化毛玻璃效果）
- [x] 改进的app.js（完善对话框逻辑）
- [x] 创建dialog-test.html测试工具

**对话框特性：**
- Claude风格：橙色（#FF8C00）
- Codex风格：蓝色（#0096FF）
- 毛玻璃背景（blur: 20px）
- 动画过渡（slideInUp/fadeOut）
- 自动5秒隐藏
- 响应式设计

**测试方法：**
打开 `http://localhost:8080/dialog-test.html` 进行对话框测试

**人工测试启动方法：**
1. 确保HTTP服务器运行中：`python -m http.server 8080`
2. 打开浏览器访问：
   - Live2D + 动作测试：`http://localhost:8080/test.html`
   - 对话框显示测试：`http://localhost:8080/dialog-test.html`
   - 检测器功能测试：`http://localhost:8080/detector-test.html`
3. 在浏览器控制台测试API：
   ```javascript
   // 显示Claude对话
   window.claudePetUI.showDialog('这是测试消息', 'claude')
   
   // 显示Codex对话
   window.claudePetUI.showDialog('这是Codex消息', 'codex')
   
   // 隐藏对话框
   window.claudePetUI.hideDialog()
   
   // 触发动作
   window.triggerMotion('working')
   window.triggerMotion('output')
   window.triggerMotion('idle')
   ```

## 阶段5：优化 ✅
- [x] 窗口拖动与缩放
- [x] 打包配置（electron-builder）
- [x] Issue#3 修复：CLI JSONL 监测、Live2D 动作、目光跟随
- [x] 分行气泡输出、输出完成后待机
- [x] 顶部栏模型切换按钮
- [ ] 托盘图标和菜单（暂缓）
- [ ] 开机自启动（可选，暂缓）

---

**PROJECT_STATS (2026-08-28)**: Electron 桌宠 v0.1 阶段性完结 | CLI JSONL 监测✅ | 分行气泡✅ | Live2D 动作/目光✅ | 窗口交互✅
