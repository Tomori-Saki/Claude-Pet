#!/bin/bash
# Claude Pet - Start HTTP Server
# 启动开发用HTTP服务器

echo "🚀 Claude Pet - 启动HTTP服务器"
echo "================================"

# 检查Python是否安装
if ! command -v python &> /dev/null; then
    echo "❌ 错误: 未找到Python"
    echo "请先安装Python: https://www.python.org/"
    exit 1
fi

echo "✓ Python已安装"

# 获取当前脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( dirname "$SCRIPT_DIR" )"

echo "📁 项目目录: $PROJECT_DIR"

# 进入项目目录
cd "$PROJECT_DIR"

# 检查必要文件
if [ ! -f "test.html" ]; then
    echo "❌ 错误: 找不到test.html"
    exit 1
fi

echo "✓ 项目文件检查完成"
echo ""
echo "🌐 启动HTTP服务器..."
echo "访问地址: http://localhost:8080"
echo ""
echo "可访问的测试页面:"
echo "  • http://localhost:8080/test.html              - Live2D + 动作测试"
echo "  • http://localhost:8080/detector-test.html     - 检测器功能测试"
echo "  • http://localhost:8080/dialog-test.html       - 对话框显示测试"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "================================"
echo ""

# 启动服务器
python -m http.server 8080
