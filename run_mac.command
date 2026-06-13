#!/bin/bash
# 获取当前脚本所在目录，防止寻址错误
cd "$(dirname "$0")"

echo "========================================="
echo "       AI Assistant Mac 启动与环境配置      "
echo "========================================="
echo "正在检查运行环境，请稍候..."

# 1. 检查 Python3 是否存在
if ! command -v python3 &>/dev/null; then
    echo "【错误】未在您的 Mac 上检测到 Python3 运行环境。"
    echo "请通过以下步骤安装："
    echo "1. 访问 https://www.python.org/downloads/mac-osx/"
    echo "2. 下载并安装最新版的 Python 3"
    echo "3. 安装完成后，重新双击此运行脚本即可。"
    echo "-----------------------------------------"
    read -p "按回车键退出..."
    exit 1
fi

# 2. 自动检查并安装依赖包
echo "正在检查必要依赖库..."
python3 -c "import webview, openai, psutil, pystray, PIL" &>/dev/null
if [ $? -ne 0 ]; then
    echo "检测到缺少运行依赖，正在自动为您配置安装（仅首次运行需要）..."
    # 尝试升级 pip
    python3 -m pip install --upgrade pip &>/dev/null
    
    # 安装所需包
    python3 -m pip install pywebview openai psutil pystray pillow
    if [ $? -ne 0 ]; then
        echo "系统级别安装受限，正在尝试用户级别 (User) 安装..."
        python3 -m pip install --user pywebview openai psutil pystray pillow
    fi
fi

# 3. 再次确认依赖安装状态
python3 -c "import webview, openai, psutil, pystray, PIL" &>/dev/null
if [ $? -ne 0 ]; then
    echo "【错误】依赖库自动配置失败，请确保您的网络畅通并重试。"
    echo "您也可以手动运行以下命令进行安装："
    echo "pip3 install pywebview openai psutil pystray pillow"
    echo "-----------------------------------------"
    read -p "按回车键退出..."
    exit 1
fi

# 4. 启动主程序
echo "运行环境准备就绪！正在为您启动 AI 助手..."
python3 main.py
