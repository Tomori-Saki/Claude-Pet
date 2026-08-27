# Issue #2: HTTP Server 404 Errors

## 问题描述
启动HTTP服务器后，尝试访问以下三个测试页面均返回404错误：
- `http://localhost:8080/test.html`
- `http://localhost:8080/detector-test.html`
- `http://localhost:8080/dialog-test.html`

## 错误信息
```
404 File not found
```

## 根本原因
1. **HTTP服务器未启动** - 后台运行的HTTP服务器已经停止
2. **路径问题** - HTML文件在根目录 `/D:\AI_Project\ClaudePet/`，但HTTP服务器可能工作目录不正确
3. **跨域问题** - Live2dOnWeb中的iframe加载可能受到跨域限制

## 相关文件位置
```
D:\AI_Project\ClaudePet/
├── test.html              # ✓ 存在
├── detector-test.html     # ✓ 存在
├── dialog-test.html       # ✓ 存在
├── Live2dOnWeb/
│   ├── desktop.html       # 在iframe中加载
│   ├── waifu-tips.js
│   ├── motion-controller.js
│   └── model/
└── src/
    └── renderer/
```

## 已尝试的解决方案
- [x] 检查HTTP服务器进程 → 未运行
- [x] 检查HTML文件是否存在 → 存在

## 解决方案
1. **重新启动HTTP服务器**
   ```bash
   cd /d/AI_Project/ClaudePet
   python -m http.server 8080
   ```

2. **确认服务器运行**
   ```bash
   curl http://localhost:8080/test.html
   ```

3. **检查防火墙** - 确保8080端口未被阻止

## 临时方案
- 使用Node.js http-server
  ```bash
  npx http-server . -p 8080
  ```

- 或使用PHP
  ```bash
  php -S localhost:8080
  ```

## 预防措施
1. 创建启动脚本（start-server.sh/bat）
2. 添加服务器健康检查
3. 在README中明确说明启动步骤
4. 添加自动启动脚本到package.json

---

**状态**: 已解决（需重启服务器）
**优先级**: 低
**影响**: 开发测试

## 完整启动步骤
```bash
# 1. 进入项目目录
cd D:\AI_Project\ClaudePet

# 2. 启动HTTP服务器
python -m http.server 8080

# 3. 打开浏览器访问
# http://localhost:8080/test.html
# http://localhost:8080/detector-test.html
# http://localhost:8080/dialog-test.html
```
