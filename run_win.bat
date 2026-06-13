@echo off
chcp 65001 >nul
title AI Assistant Windows 启动器
echo =========================================
echo       AI Assistant Windows 启动与环境配置
echo =========================================

:: 0. 切换工作目录到批处理文件所在的绝对路径，防止快捷方式启动导致的工作目录偏移
cd /d "%~dp0"

echo 正在检查运行环境，请稍候...

:: 1. 优先使用本地虚拟环境 python
if exist "%~dp0.venv\Scripts\python.exe" (
    echo [环境] 检测到本地项目虚拟环境，正在使用虚拟环境启动...
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
    goto run_app
)

:: 2. 检查全局 Python 是否可用
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo 【错误】未检测到 Python 运行环境。
    echo 请通过以下步骤安装：
    echo 1. 访问网页下载：https://www.python.org/downloads/
    echo 2. 下载并安装最新版的 Python
    echo 3. 【重要】在安装界面底部，务必勾选 "Add Python.exe to PATH"（将Python加入环境变量）
    echo 4. 安装完成后，重新双击此运行脚本即可。
    echo -----------------------------------------
    pause
    exit /b 1
)

set "PYTHON_EXE=python"

:: 3. 自动检查并安装依赖包
echo 正在检查必要依赖库...
"%PYTHON_EXE%" -c "import webview, openai, psutil, pystray, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo 检测到缺少运行依赖，正在自动安装（仅首次运行需要）...
    "%PYTHON_EXE%" -m pip install --upgrade pip
    "%PYTHON_EXE%" -m pip install pywebview openai psutil pystray pillow
    if %errorlevel% neq 0 (
        echo 尝试使用 --user 选项进行安全安装...
        "%PYTHON_EXE%" -m pip install --user pywebview openai psutil pystray pillow
    )
)

:: 4. 再次验证依赖
"%PYTHON_EXE%" -c "import webview, openai, psutil, pystray, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo 【错误】依赖库自动配置失败，请确保网络畅通。
    echo 您也可以尝试手动运行命令安装：pip install pywebview openai psutil pystray pillow
    echo -----------------------------------------
    pause
    exit /b 1
)

:run_app
:: 5. 运行程序并挂起保护，防止报错闪退
echo 运行环境准备就绪！正在为您启动 AI 助手...
"%PYTHON_EXE%" main.py
if %errorlevel% neq 0 (
    echo.
    echo 【提示】程序运行出错，错误码: %errorlevel%
    echo 如果缺少依赖，请尝试在命令行运行: pip install -r requirements.txt
    pause
)
