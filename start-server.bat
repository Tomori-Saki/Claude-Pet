@echo off
REM Claude Pet - Start HTTP Server (Windows)
REM 启动开发用HTTP服务器

setlocal enabledelayedexpansion

echo.
echo 🚀 Claude Pet - 启动HTTP服务器
echo ================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Python
    echo 请先安装Python: https://www.python.org/
    pause
    exit /b 1
)

echo ✓ Python已安装
python --version

REM 获取脚本所在目录
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR:~0,-1%

echo.
echo 📁 项目目录: %PROJECT_DIR%
echo.

REM 进入项目目录
cd /d "%PROJECT_DIR%"

REM 检查必要文件
if not exist "test.html" (
    echo ❌ 错误: 找不到test.html
    pause
    exit /b 1
)

echo ✓ 项目文件检查完成
echo.
echo 🌐 启动HTTP服务器...
echo 访问地址: http://localhost:8080
echo.
echo 可访问的测试页面:
echo   • http://localhost:8080/test.html              - Live2D + 动作测试
echo   • http://localhost:8080/detector-test.html     - 检测器功能测试
echo   • http://localhost:8080/dialog-test.html       - 对话框显示测试
echo.
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

REM 启动服务器
python -m http.server 8080

pause
