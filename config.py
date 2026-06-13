# config.py
import json
from pathlib import Path

import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

# 定义三轨分离物理文件路径
CONFIG_FILE = BASE_DIR / "app_config.json"
CREDENTIALS_FILE = BASE_DIR / "api_credentials.json"
SESSIONS_FILE = BASE_DIR / "chat_sessions.json"


def get_default_config():
    """1. 应用基础配置默认值"""
    return {
        "active_model": "deepseek-chat",
        "provider": "deepseek",
        "system_prompt": "你是一个简洁、高效的桌面智能助手。",
        "temperature": 0.7,
        "max_tokens": 2048,
        "model_lock_mode": "free",
        "powershell_mode": "normal",
        "theme": "dark",
        "deep_thinking_enabled": False,
        "web_search_enabled": False,
        "font_size": 13.5,
        "close_action": "ask",
        "lang": "zh",
        "default_terminal": "system",
        "sidebar_layout": "original",
        "zoom_level": "100%",
        "auto_update": "disabled",
        "update_notify": "enabled",
        "show_float_card": "disabled",
        "float_card_top": "disabled",
        "autostart": "disabled",
        "quota_refresh_interval": "10",
        "active_account_refresh": "disabled",
        "quota_threshold": "10",
        "credits_threshold": "5",
        "auto_switch_account": "disabled",
        "credits_toast": "enabled",
        "refresh_free": "60",
        "refresh_pro": "10",
        "main_app_path": "",
        "link_codex": "disabled",
        "link_opencode": "disabled",
        "link_vscode": "disabled",
        "link_cursor": "disabled",
        "custom_linked_app": "",
        "switch_scope": "all",
        "api_entry_visible": "visible",
        "overwrite_opencode": "disabled",
        "overwrite_openclaw": "disabled",
        "restart_opencode": "disabled",
        "zed_quota_refresh": "10",
        "zed_quota_notify": "enabled",
        "zed_win_path": "",
        "zed_wsl_path": "",
        "link_zed": "disabled",
        "custom_scripts": [],
        "voice_response_enabled": "disabled",
        "voice_name": "default",
        "voice_rate": 1.0,
        "tts_type": "system",
        "tts_api_url": "",
        "floating_dialogue_enabled": False,
        "auto_hide_history_dialogue": True,
        "floating_dialogue_height": 450,
        "floating_dialogue_width": 380,
        "floating_dialogue_max_width": 800,
        "show_float_on_startup": False,
        "floating_dialogue_on_top": True,
        "main_window_on_top": False
    }



def get_default_credentials():
    """2. 核心大模型API密钥库默认配置"""
    return {
        "models": [
            {"id": "deepseek-chat", "name": "DeepSeek-V3", "type": "chat", "context": "128K", "provider": "deepseek"},
            {"id": "deepseek-reasoner", "name": "DeepSeek-R1", "type": "reasoning", "context": "64K",
             "provider": "deepseek"},
            {"id": "kimi-k2.6", "name": "Kimi-K2.6 (思考旗舰)", "type": "reasoning", "context": "256K",
             "provider": "kimi"},
            {"id": "kimi-k2.5", "name": "Kimi-K2.5 (思考智能体)", "type": "reasoning", "context": "256K",
             "provider": "kimi"},
            {"id": "cogview-3", "name": "Kimi-CogView-3 (绘图)", "type": "drawing", "context": "画图",
             "provider": "kimi"},
            {"id": "moonshot-v1-8k", "name": "Kimi-v1-8K (标准版)", "type": "chat", "context": "8K",
             "provider": "kimi"},
            {"id": "moonshot-v1-32k", "name": "Kimi-v1-32K (长文本)", "type": "chat", "context": "32K",
             "provider": "kimi"},
            {"id": "moonshot-v1-128k", "name": "Kimi-v1-128K (超长文本)", "type": "chat", "context": "128K",
             "provider": "kimi"},
            {"id": "dall-e-3", "name": "DALL-E-3 (画图旗舰)", "type": "drawing", "context": "画图",
             "provider": "custom"},
            {"id": "deepseek-r1:7b", "name": "Ollama R1-7B", "type": "reasoning_tag", "context": "8K",
             "provider": "local"}
        ],
        "providers": {
            "deepseek": {"api_base": "https://api.deepseek.com/v1", "api_key": ""},
            "kimi": {"api_base": "https://api.moonshot.cn/v1", "api_key": ""},
            "local": {"api_base": "http://localhost:11434/v1", "api_key": "ollama"},
            "custom": {"api_base": "", "api_key": ""}
        }
    }


def get_default_sessions():
    """3. 历史会话档案库默认配置"""
    return {
        "active_session_id": "session_default",
        "sessions": [
            {"id": "session_default", "title": "默认会话", "history": [], "bound_provider": "deepseek",
             "bound_model": "deepseek-chat"}
        ]
    }


def get_default_presets():
    """4. 角色提示词库（随代码更新自动覆盖，确保可用性）"""
    return {
        "presets": [
            {
                "name": "💻 系统操控智能体",
                "prompt": (
                    "你当前拥有对用户本地系统的完全操控权。你可以通过向用户返回特定的 XML 标记结构来执行安全的本地电脑文件与状态操作，从而完成极其复杂的电脑文件树扫描、分析、整理、写入、删除、分拣等重度操作。\n"
                    "支持的工具结构（action）如下：\n\n"
                    "1. 列出目录：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"list_dir\",\n"
                    "    \"path\": \"D:/Temp\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "2. 重命名：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"rename_item\",\n"
                    "    \"path\": \"D:/old.txt\",\n"
                    "    \"new_name\": \"new.txt\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "3. 新建文件夹：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"create_dir\",\n"
                    "    \"path\": \"D:/Archive\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "4. 剪切移动文件：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"move_item\",\n"
                    "    \"src\": \"D:/file.txt\",\n"
                    "    \"dest\": \"D:/Archive/file.txt\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "5. 彻底无限制安全物理删除文件/整个文件夹（无限制高危动作）：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"delete_item\",\n"
                    "    \"path\": \"D:/TempFolder\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "6. 新建并写入/覆盖本地文本文件（当用户要求将整理结果保存到F盘、生成md、txt报告时，你必须直接调用此工具写入到对应盘符路径，绝不拒绝！）：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"write_file\",\n"
                    "    \"path\": \"F:/硬盘分析报告.md\",\n"
                    "    \"content\": \"在此输入你需要写入文件的全部文本内容\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "7. 主动读取本地任何文件的纯文本内容供你分析：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"read_file\",\n"
                    "    \"path\": \"D:/config.ini\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "8. 一键执行任意 PowerShell 终端命令（非常适合执行复杂的系统配置、开启网络、查询服务等）：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"run_powershell\",\n"
                    "    \"command\": \"Get-Service | Where-Object {$_.Status -eq 'Running'}\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "9. 运行通用 Python 代码（用于极度复杂的查找大文件、算力分析、算法查重等任务）：\n"
                    "<os_tool>\n"
                    "{\n"
                    "    \"action\": \"run_python\",\n"
                    "    \"code\": \"编写你的本地 Python 运行代码。代码内部必须使用 print() 将结果打印给系统。\"\n"
                    "}\n"
                    "</os_tool>\n\n"
                    "每次输出中你最多只能执行一个 <os_tool> 块，系统会在后台默默执行并将结果作为系统反馈推送给你，你根据反馈继续推进，完成整理后向用户汇报。所有的路径分隔符必须使用正斜杠 '/' 避免产生转义错误。"
                )
            },
            {"name": "💻 代码专家", "prompt": "你是一个顶级软件架构师，精通所有主流编程语言。请提供极高质量的代码。"},
            {"name": "✍️ 创作工坊", "prompt": "你是一个文学家。请使用优美、生动且富有张力的文字进行创作。"},
            {"name": "🌐 翻译大师", "prompt": "你是一个资深的双语同声翻译。请地道地进行中英互译。"},
            {"name": "🧠 学术顾问", "prompt": "你是一个严谨的高校博士生导师。请用学术语言解答科学、数学、哲学等学术问题。"}
        ]
    }


def load_all_configs():
    """核心分流加载与向下兼容迁移主函数"""
    config = get_default_config()
    credentials = get_default_credentials()
    sessions_data = get_default_sessions()
    presets_data = get_default_presets()

    # 1. 优先加载本地 api_credentials.json (密钥库)
    if CREDENTIALS_FILE.exists():
        try:
            with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                loaded_cred = json.load(f)

                # 合并并补齐模型
                if "models" in loaded_cred:
                    local_ids = {m["id"] for m in loaded_cred["models"]}
                    for default_m in credentials["models"]:
                        if default_m["id"] not in local_ids:
                            loaded_cred["models"].append(default_m)
                    for m in loaded_cred["models"]:
                        if "provider" not in m:
                            if "kimi" in m["id"] or "moonshot" in m["id"]:
                                m["provider"] = "kimi"
                            elif "deepseek" in m["id"]:
                                m["provider"] = "deepseek"
                            elif "ollama" in m["id"] or ":" in m["id"]:
                                m["provider"] = "local"
                            else:
                                m["provider"] = "custom"
                credentials.update(loaded_cred)
        except Exception:
            pass

    # 2. 载入本地 app_config.json (中控)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config.update(json.load(f))
            # 自动纠错保护：防老配置残留导致模式被锁在 free 变不回
            if "model_lock_mode" not in config:
                config["model_lock_mode"] = "free"
        except Exception:
            pass

    # 3. 载入本地 chat_sessions.json (历史)
    if SESSIONS_FILE.exists():
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                sessions_data.update(json.load(f))
        except Exception:
            pass

    # 4. 迁移老版本的大单体旧格式，进行热拆分
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                old_cfg = json.load(f)

            migrated = False
            if "providers" in old_cfg:
                credentials["providers"].update(old_cfg["providers"])
                del old_cfg["providers"]
                migrated = True
            if "models" in old_cfg:
                credentials["models"] = old_cfg["models"]
                del old_cfg["models"]
                migrated = True
            if "sessions" in old_cfg:
                sessions_data["sessions"] = old_cfg["sessions"]
                del old_cfg["sessions"]
                migrated = True
            if "active_session_id" in old_cfg:
                sessions_data["active_session_id"] = old_cfg["active_session_id"]
                del old_cfg["active_session_id"]

            if migrated:
                print("📡 [系统升级] 检测到旧版本单体配置文件，已成功启动“物理隔离三轨数据迁移”！")
        except Exception:
            pass

    # 合并为统一的内存字典，供给 JS API 读写（前端架构无损无感）
    combined = {}
    combined.update(config)
    combined.update(credentials)
    combined.update(sessions_data)
    combined.update(presets_data)

    # 强制重新刷新角色库
    combined["presets"] = presets_data["presets"]

    # 初始回写，建立物理隔离
    save_all_configs(combined)
    return combined


def save_all_configs(combined):
    """三轨数据分流写盘函数"""
    # 1. 写入 app_config.json (基础配置)
    base_keys = [
        "active_model", "provider", "system_prompt", "temperature", "max_tokens", "model_lock_mode",
        "powershell_mode", "theme", "deep_thinking_enabled", "web_search_enabled", "font_size",
        "close_action", "lang", "default_terminal", "sidebar_layout", "zoom_level", "auto_update",
        "update_notify", "show_float_card", "float_card_top", "autostart",
        "quota_refresh_interval", "active_account_refresh", "quota_threshold", "credits_threshold",
        "auto_switch_account", "credits_toast", "refresh_free", "refresh_pro", "main_app_path",
        "link_codex", "link_opencode", "link_vscode", "link_cursor", "custom_linked_app",
        "switch_scope", "api_entry_visible",
        "overwrite_opencode", "overwrite_openclaw", "restart_opencode",
        "zed_quota_refresh", "zed_quota_notify", "zed_win_path", "zed_wsl_path", "link_zed",
        "custom_scripts", "voice_response_enabled", "voice_name",
        "voice_rate", "tts_type", "tts_api_url",
        "floating_dialogue_enabled", "auto_hide_history_dialogue",
        "floating_dialogue_height", "floating_dialogue_width", "floating_dialogue_max_width",
        "show_float_on_startup", "floating_dialogue_on_top", "main_window_on_top"
    ]
    base_cfg = {k: combined[k] for k in base_keys if k in combined}
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(base_cfg, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"❌ 物理保存 app_config.json 失败: {e}")

    # 2. 写入 api_credentials.json (账户密钥库)
    cred_keys = ["providers", "models"]
    cred_cfg = {k: combined[k] for k in cred_keys if k in combined}
    try:
        with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
            json.dump(cred_cfg, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"❌ 物理保存 api_credentials.json 失败: {e}")

    # 3. 写入 chat_sessions.json (对话历史库)
    sess_keys = ["active_session_id", "sessions"]
    sess_cfg = {k: combined[k] for k in sess_keys if k in combined}
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sess_cfg, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"❌ 物理保存 chat_sessions.json 失败: {e}")