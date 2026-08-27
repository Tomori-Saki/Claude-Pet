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
- [ ] 测试Live2D模型在Electron中显示

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

## 阶段3：CLI检测器 [Haiku 4.5负责]
- [ ] 实现detector.js
- [ ] 监听Claude CLI日志/stream-json
- [ ] 解析对话流状态
- [ ] 通过IPC发送状态到渲染进程
- [ ] 触发Live2D动作切换
- [ ] （可选）支持Codex CLI检测

## 阶段4：对话显示 [Haiku 4.5负责]
- [ ] 对话框UI（圆角矩形、毛玻璃）
- [ ] 显示对话流内容
- [ ] 根据来源切换颜色（橙/蓝）
- [ ] 自动滚动和内容截断
- [ ] 集成到Live2D显示下方

## 阶段5：优化 [Haiku 4.5负责]
- [ ] 窗口拖动功能
- [ ] 托盘图标和菜单
- [ ] 开机自启动（可选）
- [ ] 打包配置（electron-builder）

---

**注意**：
- Live2D模型已准备完成，位于 `Live2dOnWeb/model/`
- 每个阶段完成后测试再进入下一阶段
- CLI检测路径需根据实际Claude/Codex安装位置调整
- Live2D动作控制需要修改waifu-tips.js暴露接口
