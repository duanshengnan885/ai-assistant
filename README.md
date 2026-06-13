# AI Desktop Assistant

AI 驱动的桌面工作站助手，基于 Python + WebView 构建。支持多模型对话、智能文件整理、剪贴板气泡、终端沙盒、会话管理等。

## ✨ 功能

### 🤖 多模型对话
- 支持 **DeepSeek**、**Kimi**、**Ollama 本地模型**、**自定义 OpenAI 兼容接口**
- 深度思考模式（Reasoning）切换
- 流式输出，Markdown 渲染
- 对话历史管理，多会话切换

### 📋 剪贴板气泡
- 复制文本时自动弹出 AI 气泡
- 一键发送到对话窗口处理
- 智能过滤，只响应有意义的文本

### 🗂️ 智能文件整理
- 选择文件夹，AI 分析文件并生成整理方案
- 自动归类、移动文件到子目录
- 支持回退操作

### 💻 终端沙盒
- 集成 PowerShell / CMD 终端
- 在 AI 对话中直接执行命令
- 命令输出实时回显

### 🪟 双窗口模式
- **主窗口**：完整功能面板
- **悬浮窗**：精简紧凑，始终置顶
- 全局快捷键呼出：`Alt+Space`（主窗）/ `Alt+Shift+Space`（悬浮窗）

### 🔧 其他
- 系统托盘常驻，最小化到托盘
- 暗色/亮色主题切换
- TTS 语音朗读
- 系统状态监控（CPU/内存/网络/Ollama）
- 一键导出会话
- 开机自启（可选）
- 单实例锁，防止重复启动

## 🚀 快速开始

### 环境要求
- Python 3.12+
- Windows 10/11（主开发平台）
- macOS（实验性支持）

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/duanshengnan885/ai-assistant.git
cd ai-assistant

# 创建虚拟环境
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS

# 安装依赖
pip install openai webview pyperclip pyinstaller

# 启动
python main.py
```

Windows 用户也可直接双击 `run_win.bat`，macOS 双击 `run_mac.command`。

### 打包为 EXE

```bash
pyinstaller AI_Assistant.spec
```

输出在 `dist/AI_Assistant/` 目录。

## ⚙️ 配置

启动后点击左下角 ⚙️ 进入设置：

| 配置项 | 说明 |
|--------|------|
| API 密钥 | DeepSeek / Kimi / 自定义 API Key |
| 模型选择 | 对话模型 / 推理模型 / 绘图模型 |
| 终端 | 系统默认 / PowerShell / CMD |
| 主题 | 暗色 / 亮色 |
| 快捷键 | Alt+Space / Alt+Shift+Space |
| 开机自启 | 启用/禁用 |
| 悬浮窗 | 尺寸、置顶开关 |
| TTS | 语音引擎选择 |

配置文件存储在 `api_credentials.json`、`app_config.json`、`chat_sessions.json`（均不上传 Git）。

## 📁 项目结构

```
ai-assistant/
├── main.py              # 入口：WebView 窗口、托盘、全局热键
├── api.py               # 后端 API：聊天、剪贴板、文件整理、终端
├── config.py            # 配置管理：模型、凭据、会话预设
├── ai_ui_assistant/
│   ├── index.html       # 前端界面
│   ├── app.js           # 前端逻辑
│   └── style.css        # 样式（暗色/亮色主题）
├── AI_Assistant.spec    # PyInstaller 打包配置
├── run_win.bat          # Windows 快速启动
└── run_mac.command      # macOS 快速启动
```

## 📝 更新日志

### v1.0.0
- 多模型对话（DeepSeek / Kimi / Ollama / 自定义）
- 剪贴板气泡智能检测
- AI 智能文件整理
- PowerShell 终端沙盒
- 双窗口模式 + 全局热键
- 系统托盘 + 开机自启
- 暗色/亮色主题
- TTS 语音朗读
- 会话管理 + 一键导出
- 系统状态监控面板
