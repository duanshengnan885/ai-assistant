# api.py
import sys
import json
import base64
import io
import os
import shutil
import tempfile
import subprocess
import urllib.request
import urllib.parse
import ctypes
import re
import threading
import time
from openai import OpenAI
from config import load_all_configs, save_all_configs, CONFIG_FILE

class AppAPI:
    _current_bubble_text = ""

    @staticmethod
    def _find_window_hwnd(title_match, pid=None):
        """Reliable window finder using EnumWindows (FindWindowW fails for WinForms WebView2)"""
        if sys.platform != "win32":
            return None
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
        result = []
        found_pid = ctypes.c_ulong()
        
        def enum_callback(hwnd, lparam):
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(found_pid))
            if pid is not None and found_pid.value != pid:
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return True
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            if title_match in buf.value:
                result.append(hwnd)
                return False  # stop enumeration
            return True
        
        user32.EnumWindows(WNDENUMPROC(enum_callback), 0)
        return result[0] if result else None
    _bubble_original_w = 380
    _bubble_original_h = 450
    _main_hwnd = None
    _float_hwnd = None

    def register_main_hwnd(self, hwnd):
        AppAPI._main_hwnd = hwnd
        return "ok"

    def register_float_hwnd(self, hwnd):
        AppAPI._float_hwnd = hwnd
        return "ok"

    def __init__(self):
        self._window = None  
        self._main_window = None
        self._comfyui_process = None
        self._float_window = None
        self._config = load_all_configs()
        self._is_cancelled = False
        self.window_mode = "normal"
        self._main_window_visible = True
        
        # 【新增】：本地剪贴板内存历史池
        self._clipboard_history = []

    def set_window(self, window):
        self._window = window  
        self._main_window = window

    def set_windows(self, main_window, float_window):
        self._window = main_window
        self._main_window = main_window
        self._float_window = float_window

    def get_window_mode(self):
        return self.window_mode

    def show_main_window(self):
        """Show main window and hide float using direct Win32"""
        self._main_window_visible = True
        if sys.platform == "win32":
            hwnd_main = AppAPI._main_hwnd
            if not hwnd_main:
                hwnd_main = AppAPI._find_window_hwnd("AI Desktop Workstation Cockpit")
            if not hwnd_main:
                hwnd_main = AppAPI._find_window_hwnd("AI Desktop Assistant")
            if hwnd_main:
                user32 = ctypes.windll.user32
                user32.ShowWindow(hwnd_main, 9)   # SW_RESTORE
                user32.SetWindowPos(hwnd_main, 0, 0, 0, 0, 0, 0x0002 | 0x0001)  # SWP_NOMOVE|SWP_NOSIZE
                user32.ShowWindow(hwnd_main, 5)   # SW_SHOW
                user32.SetForegroundWindow(hwnd_main)
            elif self._main_window:
                self._main_window.show()
        elif self._main_window:
            self._main_window.show()
        if self._float_window:
            hwnd_f = AppAPI._float_hwnd
            if hwnd_f and sys.platform == "win32":
                user32 = ctypes.windll.user32
                user32.ShowWindow(hwnd_f, 0)  # SW_HIDE
            else:
                self._float_window.hide()

    def show_float_window(self):
        """Display float window using direct Win32"""
        if sys.platform != "win32":
            if self._float_window:
                self._float_window.show()
            return
        hwnd = AppAPI._float_hwnd
        if not hwnd:
            hwnd = AppAPI._find_window_hwnd("AI Float Dialogue")
        if not hwnd:
            # Retry a few times
            import time as _time
            for _ in range(10):
                _time.sleep(0.1)
                hwnd = AppAPI._find_window_hwnd("AI Float Dialogue")
                if hwnd:
                    break
        if not hwnd:
            if self._float_window:
                self._float_window.show()
            return
        user32 = ctypes.windll.user32
        self._config = load_all_configs()
        try:
            import webview
            screens = webview.screens
            sw = screens[0].width if screens else 1920
        except:
            sw = 1920
        w = self._config.get("floating_dialogue_width", 380)
        h = self._config.get("floating_dialogue_height", 450)
        x = sw - w - 50
        y = 100
        user32.ShowWindow(hwnd, 5)  # SW_SHOW
        user32.SetWindowPos(hwnd, -1, x, y, w, h, 0x0010)  # HWND_TOPMOST | SWP_NOACTIVATE
        user32.SetForegroundWindow(hwnd)

    def hide_float_window(self):
        """隐藏悬浮窗（不影响主窗口可见性）"""
        if self._float_window:
            self._float_window.hide()
        # 更新配置为禁用状态
        self._config = load_all_configs()
        self._config["floating_dialogue_enabled"] = False
        save_all_configs(self._config)
        # 同步主界面的 UI 开关状态
        if self._main_window:
            try:
                self._main_window.evaluate_js("syncFloatingDialogueEnabledUI(false)")
            except Exception:
                pass

    def resize_float_window(self, width):
        if self._float_window:
            self._config = load_all_configs()
            height = self._config.get("floating_dialogue_height", 450)
            self._float_window.resize(width, int(height))

    def resize_float_window_dynamic(self, width, height, x=None, y=None):
        if self._float_window:
            try:
                # 检查和转换参数，防止 NaN 或 None 导致 ValueError / crash
                if x is not None and y is not None:
                    if str(x).lower() == 'nan' or str(y).lower() == 'nan' or str(width).lower() == 'nan' or str(height).lower() == 'nan':
                        return "error_nan"
                    w_val = int(float(width))
                    h_val = int(float(height))
                    x_val = int(float(x))
                    y_val = int(float(y))
                    
                    if sys.platform == "win32":
                        try:
                            user32 = ctypes.windll.user32
                            user32.FindWindowW.restype = ctypes.c_void_p
                            user32.SetWindowPos.argtypes = [
                                ctypes.c_void_p, ctypes.c_void_p,
                                ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                                ctypes.c_uint
                            ]
                            user32.SetWindowPos.restype = ctypes.c_bool
                            hwnd = AppAPI._float_hwnd
                            if not hwnd:
                                hwnd = AppAPI._find_window_hwnd("AI Float Dialogue")
                            if hwnd:
                                # SWP_NOZORDER = 0x0004, SWP_NOACTIVATE = 0x0010, SWP_ASYNCWINDOWPOS = 0x4000
                                user32.SetWindowPos(hwnd, None, x_val, y_val, w_val, h_val, 0x0004 | 0x0010 | 0x4000)
                                return "ok"
                        except Exception as e:
                            print("动态修改悬浮窗大小和位置 Win32 失败:", e)
                    # 降级或非 Windows 平台分别执行
                    self._float_window.resize(w_val, h_val)
                    self._float_window.move(x_val, y_val)
                else:
                    if str(width).lower() == 'nan' or str(height).lower() == 'nan':
                        return "error_nan"
                    w_val = int(float(width))
                    h_val = int(float(height))
                    self._float_window.resize(w_val, h_val)
            except Exception as e:
                print("动态修改悬浮窗大小和位置发生异常:", e)
        return "ok"

    def get_float_window_rect(self):
        if self._float_window:
            return {
                "x": self._float_window.x,
                "y": self._float_window.y,
                "width": self._float_window.width,
                "height": self._float_window.height
            }
        return None

    def _is_clipboard_qualifying(self, text):
        if not text or not isinstance(text, str):
            return False
        text = text.strip()
        if not text:
            return False
        
        # 1. 物理路径或绝对路径正则匹配
        if os.path.exists(text):
            return True
        path_pattern = r'^(?:[a-zA-Z]:[\\/][^:?*"<>|]+|/[^:?*"<>|]+)$'
        if re.match(path_pattern, text):
            return True
            
        # 2. 报错堆栈特征检测
        error_keywords = [
            "traceback", "exception", "nullpointerexception", 
            "error:", "warning:", "failed:", "fail to", 
            "stack trace", "caused by:"
        ]
        text_lower = text.lower()
        if any(kw in text_lower for kw in error_keywords):
            return True
            
        # 3. 代码特征关键字检测
        code_keywords = [
            "def ", "class ", "import ", "from ", "const ", "let ", "function ", 
            "public class", "public static void", "System.out.println", "console.log",
            "using namespace", "#include", "func ", "package ", "struct ", "impl "
        ]
        if any(kw in text for kw in code_keywords):
            return True
            
        # 4. 长度限制检测
        if len(text) > 100:
            return True
            
        return False

    def get_bubble_position(self):
        """获取屏幕右下角气泡的合适坐标(300x80)"""
        import webview
        screens = webview.screens
        width, height = 1920, 1080
        if screens:
            width = screens[0].width
            height = screens[0].height
        bubble_x = width - 300 - 30
        bubble_y = height - 80 - 60
        return {"x": bubble_x, "y": bubble_y}

    def trigger_clipboard_bubble(self, text):
        """物理强制调整悬浮窗位置大小，并通知前端展示剪贴板快捷动作气泡"""
        if not self._float_window:
            return
            
        config = load_all_configs()
        if config.get("floating_dialogue_enabled", False):
            # 悬浮窗已开启对话模式下不弹窗打扰用户
            return
            
        AppAPI._bubble_original_w = config.get("floating_dialogue_width", 380)
        AppAPI._bubble_original_h = config.get("floating_dialogue_height", 450)
        AppAPI._current_bubble_text = text
        
        pos = self.get_bubble_position()
        self._float_window.show()
        self.resize_float_window_dynamic(300, 80, pos["x"], pos["y"])
        self.set_float_on_top_api(True)
        
        payload = json.dumps(text)
        try:
            self._float_window.evaluate_js(f"window.showClipboardBubble({payload})")
        except Exception as e:
            print("触发前端气泡展示失败:", e)

    def accept_clipboard_bubble(self):
        """用户点击气泡，恢复正常悬浮窗大小并送入 AI 聊天"""
        if not self._float_window:
            return {"status": "error", "message": "Float window not ready"}
            
        config = load_all_configs()
        w = AppAPI._bubble_original_w
        h = AppAPI._bubble_original_h
        
        import webview
        screens = webview.screens
        screen_width = 1920
        if screens:
            screen_width = screens[0].width
        x = screen_width - w - 50
        y = 100
        
        config["floating_dialogue_enabled"] = True
        save_all_configs(config)
        
        self.resize_float_window_dynamic(w, h, x, y)
        self.set_float_on_top_api(config.get("floating_dialogue_on_top", True))
        
        if self._main_window:
            try:
                self._main_window.evaluate_js("syncFloatingDialogueEnabledUI(true)")
            except Exception:
                pass
                
        return {"status": "success", "text": AppAPI._current_bubble_text}

    def close_clipboard_bubble(self):
        """关闭气泡并重置悬浮窗尺寸"""
        if not self._float_window:
            return {"status": "error", "message": "Float window not ready"}
            
        self._float_window.hide()
        
        w = AppAPI._bubble_original_w
        h = AppAPI._bubble_original_h
        self._float_window.resize(w, h)
        return {"status": "success"}

    def select_folder_dialog(self):
        """弹出选择文件夹对话框，返回绝对路径"""
        try:
            if not self._window:
                return {"status": "error", "message": "Window not ready"}
            import webview
            result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
            if result and len(result) > 0:
                return {"status": "success", "path": result[0]}
            return {"status": "cancelled"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def scan_directory(self, folder_path):
        """扫描目标文件夹中的直属文件列表 (过滤掉目录)"""
        try:
            if not folder_path or not os.path.exists(folder_path):
                return {"status": "error", "message": "路径不存在"}
            if not os.path.isdir(folder_path):
                return {"status": "error", "message": "目标路径不是文件夹"}
            
            files = []
            for item in os.listdir(folder_path):
                full_path = os.path.join(folder_path, item)
                if os.path.isfile(full_path):
                    size = os.path.getsize(full_path)
                    _, ext = os.path.splitext(item)
                    files.append({
                        "filename": item,
                        "size": size,
                        "ext": ext.lower()
                    })
            return {"status": "success", "files": files}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def generate_sorting_plan_api(self, folder_path, files):
        """AI 文件分拣计划生成 (带有规则引擎本地 fallback)"""
        try:
            if not files:
                return {"status": "success", "plan": {}}

            # Fallback 引擎作为基础和兜底
            def get_fallback_plan(files_list):
                fallback_plan = {}
                for f in files_list:
                    ext = f["ext"].lower()
                    if ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"]:
                        fallback_plan[f["filename"]] = "Images"
                    elif ext in [".mp4", ".avi", ".mkv", ".mov", ".flv", ".wmv"]:
                        fallback_plan[f["filename"]] = "Videos"
                    elif ext in [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma"]:
                        fallback_plan[f["filename"]] = "Audio"
                    elif ext in [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".md", ".csv"]:
                        fallback_plan[f["filename"]] = "Documents"
                    elif ext in [".zip", ".rar", ".7z", ".tar", ".gz"]:
                        fallback_plan[f["filename"]] = "Archives"
                    elif ext in [".py", ".js", ".html", ".css", ".cpp", ".c", ".java", ".go", ".ts", ".rs"]:
                        fallback_plan[f["filename"]] = "SourceCode"
                    elif ext in [".exe", ".msi", ".dmg", ".pkg", ".bat", ".sh"]:
                        fallback_plan[f["filename"]] = "Executables"
                    else:
                        fallback_plan[f["filename"]] = "Others"
                return fallback_plan

            # 尝试调用 AI
            config = load_all_configs()
            provider = config.get("provider", "deepseek")
            providers = config.get("providers", {})
            prov_cfg = providers.get(provider, {})
            api_key = prov_cfg.get("api_key", "")
            api_base = prov_cfg.get("api_base", "")
            active_model = config.get("active_model", "")
            
            if not api_key and provider != "local":
                # 没有 Key 且不是本地 Ollama 模式，直接走规则引擎
                return {"status": "success", "plan": get_fallback_plan(files), "mode": "fallback"}

            file_names_str = "\n".join([f["filename"] for f in files])
            system_prompt = (
                "你是一个专业的文件整理助手。请根据提供的文件名列表，分析它们的类别、主题和扩展名，"
                "生成一个合理的文件归类整理方案。你需要为每个文件推荐一个相对的子目录名称（例如: 'Images', 'SourceCode/Python', 'Documents/PDF'）。\n"
                "只返回 JSON 格式的映射字典，其中 key 是原始文件名，value 是推荐的相对子目录路径。绝对不能有任何额外的说明文字、前言或 Markdown 标记包装。\n"
                "格式示例:\n"
                "{\n"
                "  \"main.py\": \"SourceCode/Python\",\n"
                "  \"data.xlsx\": \"Reports/Finance\"\n"
                "}"
            )
            
            client = OpenAI(api_key=api_key, base_url=api_base)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"以下是需要分拣的文件列表：\n{file_names_str}"}
            ]
            
            response = client.chat.completions.create(
                model=active_model,
                messages=messages,
                temperature=0.2,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content.strip()
            # 格式清理
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\n", "", content)
                content = re.sub(r"\n```$", "", content)
            
            plan = json.loads(content)
            return {"status": "success", "plan": plan, "mode": "ai"}
            
        except Exception as e:
            print(f"[Warn] AI generation failed, falling back to local engine: {e}")
            try:
                return {"status": "success", "plan": get_fallback_plan(files), "mode": "fallback"}
            except Exception as fallback_err:
                return {"status": "error", "message": f"分拣计划生成发生异常: {str(fallback_err)}"}

    def execute_sorting_plan(self, folder_path, plan):
        """非破坏性物理移动文件分拣整理"""
        try:
            if not folder_path or not os.path.exists(folder_path):
                return {"status": "error", "message": "目标路径不存在"}
            
            moved_count = 0
            errors = []
            
            for filename, subfolder in plan.items():
                if not subfolder:
                    continue
                src_path = os.path.join(folder_path, filename)
                if not os.path.exists(src_path) or not os.path.isfile(src_path):
                    continue
                
                # 过滤防范路径逃逸，移除 ../ 并清理前后斜杠
                clean_subfolder = subfolder.replace("..", "").strip("/\\").replace(":", "")
                dst_dir = os.path.join(folder_path, clean_subfolder)
                
                try:
                    os.makedirs(dst_dir, exist_ok=True)
                    dst_path = os.path.join(dst_dir, filename)
                    
                    # 防覆盖机制：如存在重名文件，自动追加递增后缀
                    if os.path.exists(dst_path):
                        base, ext = os.path.splitext(filename)
                        counter = 1
                        while os.path.exists(os.path.join(dst_dir, f"{base}_{counter}{ext}")):
                            counter += 1
                        dst_path = os.path.join(dst_dir, f"{base}_{counter}{ext}")
                        
                    shutil.move(src_path, dst_path)
                    moved_count += 1
                except Exception as ex:
                    errors.append(f"移动 {filename} 失败: {str(ex)}")
            
            if errors:
                return {"status": "partial_success", "moved": moved_count, "errors": errors}
            return {"status": "success", "moved": moved_count}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_float_size(self, width, height):
        self._config = load_all_configs()
        self._config["floating_dialogue_width"] = int(width)
        self._config["floating_dialogue_height"] = int(height)
        save_all_configs(self._config)
        # 实时同步更改到主界面的设置滑块
        if self._main_window:
            try:
                self._main_window.evaluate_js(f"window.syncFloatSizeUI({width}, {height})")
            except Exception:
                pass
        return "ok"

    def close_float_window_api(self):
        if self._float_window:
            self._float_window.hide()
        # 更新配置为禁用状态
        self._config = load_all_configs()
        self._config["floating_dialogue_enabled"] = False
        save_all_configs(self._config)
        # 同步主界面的 UI 开关状态
        if self._main_window:
            try:
                self._main_window.evaluate_js("syncFloatingDialogueEnabledUI(false)")
            except Exception:
                pass
        # 若主窗口当前隐藏，说明已关闭主界面，隐藏悬浮窗后，直接物理强退
        if not self._main_window_visible:
            import os
            os._exit(0)
        return "closed"

    def set_float_on_top_api(self, enabled):
        self._config = load_all_configs()
        self._config["floating_dialogue_on_top"] = enabled
        save_all_configs(self._config)
        
        # 动态改变置顶层级 (Windows 平台)
        if sys.platform == "win32":
            try:
                user32 = ctypes.windll.user32
                # 声明正确的参数类型，防止 64 位 Python 下截断 HWND 参数
                user32.FindWindowW.restype = ctypes.c_void_p
                user32.SetWindowPos.argtypes = [
                    ctypes.c_void_p, ctypes.c_void_p,
                    ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                    ctypes.c_uint
                ]
                user32.SetWindowPos.restype = ctypes.c_bool
                hwnd = AppAPI._float_hwnd
                if not hwnd:
                    hwnd = AppAPI._find_window_hwnd("AI Float Dialogue")
                if hwnd:
                    # HWND_TOPMOST = -1, HWND_NOTOPMOST = -2
                    HWND_TOPMOST = ctypes.c_void_p(-1 & 0xFFFFFFFFFFFFFFFF)
                    HWND_NOTOPMOST = ctypes.c_void_p(-2 & 0xFFFFFFFFFFFFFFFF)
                    insert_after = HWND_TOPMOST if enabled else HWND_NOTOPMOST
                    SWP_NOSIZE = 0x0001
                    SWP_NOMOVE = 0x0002
                    SWP_NOACTIVATE = 0x0010
                    user32.SetWindowPos(hwnd, insert_after, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE)
            except Exception as e:
                print("动态修改置顶状态失败:", e)
        return "ok"

    def set_main_on_top_api(self, enabled):
        self._config = load_all_configs()
        self._config["main_window_on_top"] = enabled
        save_all_configs(self._config)
        
        # 动态改变置顶层级 (Windows 平台)
        if sys.platform == "win32":
            try:
                user32 = ctypes.windll.user32
                # 声明正确的参数类型，防止 64 位 Python 下截断 HWND 参数
                user32.FindWindowW.restype = ctypes.c_void_p
                user32.SetWindowPos.argtypes = [
                    ctypes.c_void_p, ctypes.c_void_p,
                    ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                    ctypes.c_uint
                ]
                user32.SetWindowPos.restype = ctypes.c_bool
                hwnd = AppAPI._main_hwnd
                if not hwnd:
                    hwnd = AppAPI._find_window_hwnd("AI Desktop Workstation Cockpit")
                if not hwnd:
                    hwnd = AppAPI._find_window_hwnd("AI Desktop Assistant")
                if hwnd:
                    # HWND_TOPMOST = -1, HWND_NOTOPMOST = -2
                    HWND_TOPMOST = ctypes.c_void_p(-1 & 0xFFFFFFFFFFFFFFFF)
                    HWND_NOTOPMOST = ctypes.c_void_p(-2 & 0xFFFFFFFFFFFFFFFF)
                    insert_after = HWND_TOPMOST if enabled else HWND_NOTOPMOST
                    SWP_NOSIZE = 0x0001
                    SWP_NOMOVE = 0x0002
                    SWP_NOACTIVATE = 0x0010
                    user32.SetWindowPos(hwnd, insert_after, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE)
            except Exception as e:
                print("动态修改主窗口置顶状态失败:", e)
        return "ok"

    def exit_app(self):
        import os
        os._exit(0)

    def log_js_error(self, error_msg):
        try:
            print(f"[JS Error]: {error_msg}")
        except Exception:
            try:
                print(f"[JS Error]: {error_msg.encode('gbk', errors='ignore').decode('gbk')}")
            except Exception:
                pass
        try:
            log_path = os.path.join(os.path.dirname(__file__), "debug_js.log")
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {error_msg}\n")
        except Exception:
            pass
        return "logged"

    def get_config(self):
        return self._config

    def save_config(self, new_config):
        self._config.update(new_config)
        
        # 1. 如果新配置中有 autostart 字段，同步更新 Windows 注册表开机自启项
        if "autostart" in new_config and sys.platform == "win32":
            try:
                enabled = new_config["autostart"] == "enabled"
                self.set_autostart_enabled(enabled)
            except Exception as e:
                print(f"Sync autostart to registry failed: {e}")
                
        # 2. 实时根据配置同步悬浮窗显隐
        if "floating_dialogue_enabled" in new_config:
            enabled = new_config["floating_dialogue_enabled"]
            if not enabled and self._float_window:
                self._float_window.hide()
            elif enabled and self._float_window:
                try:
                    import webview
                    screens = webview.screens
                    screen_width = screens[0].width if screens else 1920
                    w = self._config.get("floating_dialogue_width", 380)
                    x = screen_width - w - 50
                    y = 100
                    self._float_window.move(x, y)
                except Exception:
                    pass
                self._float_window.show()
                # 重新显示时强刷置顶层级
                on_top = self._config.get("floating_dialogue_on_top", True)
                self.set_float_on_top_api(on_top)
                try:
                    self._float_window.evaluate_js("window.resetFloatDialogue()")
                except Exception:
                    pass
                    
        # 3. 实时同步主题到悬浮窗
        if "theme" in new_config and self._float_window:
            theme = new_config["theme"]
            try:
                theme_payload = json.dumps(theme)
                self._float_window.evaluate_js(f"window.syncFloatTheme({theme_payload})")
            except Exception:
                pass

        try:
            save_all_configs(self._config)
            return {"status": "success", "msg": "配置与会话已成功分轨存盘"}
        except Exception as e:
            print(f"❌ [磁盘保存配置失败]: {e}")
            return {"status": "error", "msg": f"保存失败: {str(e)}"}

    def cancel_chat(self):
        self._is_cancelled = True

    # ==========================================
    # 【剪贴板模块】：被动监听 WM_CLIPBOARDUPDATE，不再轮询抢占系统剪贴板锁
    # ==========================================
    def start_clipboard_monitor(self):
        """前端就绪后，由前端显式调用以开启剪贴板监测，防止窗口初始化期间发生 COM 死锁"""
        if not hasattr(self, "_clipboard_thread_started"):
            self._clipboard_thread_started = True
            threading.Thread(target=self._clipboard_monitor_worker, daemon=True).start()
        return "started"

    def get_clipboard_history(self):
        """提供给前端 JS 在初始化时调用的接口"""
        return self._clipboard_history

    def _get_win_clipboard_text(self):
        """安全读取剪贴板文本：快速 Open→Read→Close，最小化独占锁窗口期"""
        if sys.platform != "win32":
            return ""
        try:
            user32 = ctypes.windll.user32
            kernel32 = ctypes.windll.kernel32
            # 尝试打开剪贴板，如果被其他应用占用则立即放弃，绝不阻塞
            if not user32.OpenClipboard(None):
                return ""
            try:
                # CF_UNICODETEXT = 13 (Unicode 文本格式)
                h_data = user32.GetClipboardData(13)
                if not h_data:
                    return ""
                p_data = kernel32.GlobalLock(h_data)
                if not p_data:
                    return ""
                try:
                    text = ctypes.wstring_at(p_data)
                finally:
                    kernel32.GlobalUnlock(h_data)
                return text
            finally:
                user32.CloseClipboard()
        except Exception:
            return ""

    def _set_win_clipboard_text(self, text):
        if sys.platform != "win32":
            return False
        try:
            user32 = ctypes.windll.user32
            kernel32 = ctypes.windll.kernel32
            if not user32.OpenClipboard(None):
                return False
            try:
                user32.EmptyClipboard()
                # CF_UNICODETEXT = 13
                text_bytes = (text + "\0").encode("utf-16le")
                h_global = kernel32.GlobalAlloc(0x0042, len(text_bytes))
                p_global = kernel32.GlobalLock(h_global)
                ctypes.memmove(p_global, text_bytes, len(text_bytes))
                kernel32.GlobalUnlock(h_global)
                user32.SetClipboardData(13, h_global)
            finally:
                user32.CloseClipboard()
            return True
        except Exception:
            return False

    def _clipboard_monitor_worker(self):
        """
        被动监听方案：利用 Windows AddClipboardFormatListener + 隐藏消息窗口
        接收 WM_CLIPBOARDUPDATE (0x031D) 通知，只在剪贴板真正发生变更时才短暂
        打开读取一次，彻底避免旧版每 1.2 秒轮询 OpenClipboard 独占锁导致的
        全系统复制粘贴失效问题。
        """
        if sys.platform != "win32":
            return

        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        # 64-bit safe ctypes declarations
        kernel32.GetModuleHandleW.restype = ctypes.c_void_p
        kernel32.GetModuleHandleW.argtypes = [ctypes.c_wchar_p]

        user32.RegisterClassExW.restype = ctypes.c_ushort
        user32.RegisterClassExW.argtypes = [ctypes.c_void_p]

        user32.CreateWindowExW.restype = ctypes.c_void_p
        user32.CreateWindowExW.argtypes = [
            ctypes.c_uint, ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p
        ]

        user32.AddClipboardFormatListener.restype = ctypes.c_bool
        user32.AddClipboardFormatListener.argtypes = [ctypes.c_void_p]

        user32.DefWindowProcW.restype = ctypes.c_longlong
        user32.DefWindowProcW.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p]

        user32.DestroyWindow.restype = ctypes.c_bool
        user32.DestroyWindow.argtypes = [ctypes.c_void_p]

        user32.GetMessageW.restype = ctypes.c_int
        user32.GetMessageW.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint, ctypes.c_uint]

        user32.TranslateMessage.restype = ctypes.c_bool
        user32.TranslateMessage.argtypes = [ctypes.c_void_p]

        user32.DispatchMessageW.restype = ctypes.c_void_p
        user32.DispatchMessageW.argtypes = [ctypes.c_void_p]

        user32.RemoveClipboardFormatListener.restype = ctypes.c_bool
        user32.RemoveClipboardFormatListener.argtypes = [ctypes.c_void_p]

        # --- 注册隐藏的 Message-Only 窗口类 ---
        WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_long, ctypes.c_void_p, ctypes.c_uint,
                                     ctypes.c_void_p, ctypes.c_void_p)

        WM_CLIPBOARDUPDATE = 0x031D
        HWND_MESSAGE = ctypes.c_void_p(-3)  # Message-Only 父窗口
        last_text = self._get_win_clipboard_text() or ""
        skip_first = True

        def wnd_proc(hwnd, msg, wparam, lparam):
            nonlocal last_text, skip_first
            if msg == WM_CLIPBOARDUPDATE:
                try:
                    text = self._get_win_clipboard_text()
                    if skip_first:
                        skip_first = False
                        if text:
                            last_text = text
                        return 0
                    if text and text.strip() and text != last_text:
                        last_text = text
                        if text not in self._clipboard_history:
                            self._clipboard_history.insert(0, text)
                            if len(self._clipboard_history) > 15:
                                self._clipboard_history.pop()
                            if self._window:
                                payload = json.dumps(text)
                                self._window.evaluate_js(f"window.onClipboardUpdated({payload})")
                            if self._is_clipboard_qualifying(text):
                                self.trigger_clipboard_bubble(text)
                except Exception:
                    pass
                return 0
            return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

        # 防止回调被 GC 回收
        self._wndproc_cb = WNDPROC(wnd_proc)

        class WNDCLASSEXW(ctypes.Structure):
            _fields_ = [
                ("cbSize", ctypes.c_uint),
                ("style", ctypes.c_uint),
                ("lpfnWndProc", WNDPROC),
                ("cbClsExtra", ctypes.c_int),
                ("cbWndExtra", ctypes.c_int),
                ("hInstance", ctypes.c_void_p),
                ("hIcon", ctypes.c_void_p),
                ("hCursor", ctypes.c_void_p),
                ("hbrBackground", ctypes.c_void_p),
                ("lpszMenuName", ctypes.c_wchar_p),
                ("lpszClassName", ctypes.c_wchar_p),
                ("hIconSm", ctypes.c_void_p),
            ]

        cls_name = "AIWorkstationClipboardListener"
        wc = WNDCLASSEXW()
        wc.cbSize = ctypes.sizeof(WNDCLASSEXW)
        wc.lpfnWndProc = self._wndproc_cb
        wc.hInstance = kernel32.GetModuleHandleW(None)
        wc.lpszClassName = cls_name

        atom = user32.RegisterClassExW(ctypes.byref(wc))
        if not atom:
            print("[Warn] 剪贴板监听窗口类注册失败，回退到安全轮询模式")
            self._clipboard_monitor_fallback()
            return

        hwnd = user32.CreateWindowExW(
            0, cls_name, "ClipListener", 0,
            0, 0, 0, 0,
            HWND_MESSAGE, None, wc.hInstance, None
        )
        if not hwnd:
            print("[Warn] 剪贴板监听窗口创建失败，回退到安全轮询模式")
            self._clipboard_monitor_fallback()
            return

        # 注册剪贴板变更监听
        if not user32.AddClipboardFormatListener(hwnd):
            print("[Warn] AddClipboardFormatListener 失败，回退到安全轮询模式")
            user32.DestroyWindow(hwnd)
            self._clipboard_monitor_fallback()
            return

        print("[Info] 剪贴板被动监听已启动 (WM_CLIPBOARDUPDATE)，不再轮询抢占剪贴板")

        # --- 消息循环 ---
        class MSG(ctypes.Structure):
            _fields_ = [("hwnd", ctypes.c_void_p),
                        ("message", ctypes.c_uint),
                        ("wParam", ctypes.c_void_p),
                        ("lParam", ctypes.c_void_p),
                        ("time", ctypes.c_uint),
                        ("pt", ctypes.c_longlong)]
        msg = MSG()
        try:
            while user32.GetMessageW(ctypes.byref(msg), hwnd, 0, 0) > 0:
                user32.TranslateMessage(ctypes.byref(msg))
                user32.DispatchMessageW(ctypes.byref(msg))
        except Exception as e:
            print(f"[Warn] 剪贴板监听线程退出: {e}")
        finally:
            user32.RemoveClipboardFormatListener(hwnd)
            user32.DestroyWindow(hwnd)

    def _clipboard_monitor_fallback(self):
        """
        安全回退方案：使用 GetClipboardSequenceNumber 检测变更，
        只在序列号变化时才短暂 OpenClipboard 读取。
        比旧方案安全得多——不会盲目每 1.2 秒锁死剪贴板。
        """
        user32 = ctypes.windll.user32
        last_seq = user32.GetClipboardSequenceNumber()
        last_text = self._get_win_clipboard_text() or ""
        while True:
            try:
                seq = user32.GetClipboardSequenceNumber()
                if seq != last_seq:
                    last_seq = seq
                    text = self._get_win_clipboard_text()
                    if text and text.strip() and text != last_text:
                        last_text = text
                        if text not in self._clipboard_history:
                            self._clipboard_history.insert(0, text)
                            if len(self._clipboard_history) > 15:
                                self._clipboard_history.pop()
                            if self._window:
                                payload = json.dumps(text)
                                self._window.evaluate_js(f"window.onClipboardUpdated({payload})")
                            if self._is_clipboard_qualifying(text):
                                self.trigger_clipboard_bubble(text)
            except Exception:
                pass
            time.sleep(1.5)

    # 列出本地探测探测 OLLAMA 
    def scan_local_ollama_models(self):
        try:
            url = "http://localhost:11434/api/tags"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=2) as response:
                data = json.loads(response.read().decode('utf-8'))
                models = data.get("models", [])
                result_list = []
                for m in models:
                    name = m.get("name")
                    result_list.append({
                        "id": name,
                        "name": f"Ollama: {name.split(':')[0]}",
                        "type": "reasoning_tag" if "r1" in name.lower() else "chat",
                        "context": "8K",
                        "provider": "local"
                    })
                return {"status": "success", "models": result_list}
        except Exception:
            return {"status": "error", "message": "未检测到本地运行 of Ollama 服务，请确认其已启动。"}

    def scan_online_models(self, provider, api_base, api_key):
        api_key = (api_key or "").strip()
        api_base = (api_base or "").strip()
        if not api_key:
            return {"status": "error", "message": "API Key 不能为空！"}
        
        if not api_base:
            if provider == "kimi":
                api_base = "https://api.moonshot.cn/v1"
            elif provider == "deepseek":
                api_base = "https://api.deepseek.com/v1"
            else:
                return {"status": "error", "message": "API Base 地址未指定！"}
                
        url = api_base.rstrip("/") + "/models"
        try:
            req = urllib.request.Request(url, method="GET")
            req.add_header("Authorization", f"Bearer {api_key}")
            req.add_header("Content-Type", "application/json")
            
            with urllib.request.urlopen(req, timeout=8) as response:
                res = json.loads(response.read().decode("utf-8"))
                models = res.get("data", [])
                
                result_list = []
                for m in models:
                    m_id = m.get("id")
                    if not m_id:
                        continue
                    m_id_lower = m_id.lower()
                    
                    # Skip embedding or text-embedding models
                    if "embedding" in m_id_lower:
                        continue
                        
                    model_type = "chat"
                    context = "8K"
                    
                    if "drawing" in m_id_lower or "dall-e" in m_id_lower or "cogview" in m_id_lower:
                        model_type = "drawing"
                        context = "画图"
                    elif "reasoner" in m_id_lower or "r1" in m_id_lower or "thinking" in m_id_lower or "k2.6" in m_id_lower or "k2.5" in m_id_lower:
                        model_type = "reasoning"
                        
                    if "256k" in m_id_lower or "k2.6" in m_id_lower or "k2.5" in m_id_lower:
                        context = "256K"
                    elif "128k" in m_id_lower or "chat" in m_id_lower:
                        # DeepSeek chat is 128k
                        context = "128K"
                    elif "64k" in m_id_lower or "reasoner" in m_id_lower:
                        # DeepSeek reasoner is 64k output context
                        context = "64K"
                    elif "32k" in m_id_lower:
                        context = "32K"
                    elif "8k" in m_id_lower:
                        context = "8K"
                    elif model_type == "drawing":
                        context = "画图"
                        
                    name = m_id
                    if provider == "kimi":
                        if "k2.6" in m_id_lower:
                            name = "Kimi-K2.6 (思考旗舰)"
                        elif "k2.5" in m_id_lower:
                            name = "Kimi-K2.5 (思考智能体)"
                        elif "8k" in m_id_lower:
                            name = "Kimi-v1-8K (标准版)"
                        elif "32k" in m_id_lower:
                            name = "Kimi-v1-32K (长文本)"
                        elif "128k" in m_id_lower:
                            name = "Kimi-v1-128K (超长文本)"
                        elif "cogview" in m_id_lower:
                            name = "Kimi-CogView-3 (绘图)"
                    elif provider == "deepseek":
                        if "chat" in m_id_lower:
                            name = "DeepSeek-V3"
                        elif "reasoner" in m_id_lower:
                            name = "DeepSeek-R1"
                            
                    result_list.append({
                        "id": m_id,
                        "name": name,
                        "type": model_type,
                        "context": context,
                        "provider": provider
                    })
                return {"status": "success", "models": result_list}
        except Exception as e:
            return {"status": "error", "message": f"探测云端模型失败: {str(e)}"}
    def search_web(self, query):
        """进行真实网络搜索检索"""
        results = []
        try:
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            with urllib.request.urlopen(req, timeout=6) as response:
                html = response.read().decode('utf-8', errors='ignore')
                matches = re.findall(r'<a\s+class="result__snippet"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
                for href, snippet in matches[:5]:
                    snippet_clean = re.sub(r'<[^>]+>', '', snippet).strip()
                    results.append({"url": href, "snippet": snippet_clean})
        except Exception as e:
            print(f"DuckDuckGo search error: {e}")

        if not results:
            try:
                url = f"https://www.baidu.com/s?wd={urllib.parse.quote(query)}"
                req = urllib.request.Request(url)
                req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                with urllib.request.urlopen(req, timeout=6) as response:
                    html = response.read().decode('utf-8', errors='ignore')
                    matches = re.findall(r'<div class="c-abstract[^>]*>(.*?)</div>', html, re.DOTALL)
                    if not matches:
                        matches = re.findall(r'<span class="content-right_[^"]+"[^>]*>(.*?)</span>', html, re.DOTALL)
                    for snippet in matches[:5]:
                        snippet_clean = re.sub(r'<[^>]+>', '', snippet).strip()
                        results.append({"url": "https://www.baidu.com", "snippet": snippet_clean})
            except Exception as e:
                print(f"Baidu search error: {e}")
                
        return results


    # 系统操控代理 (OS Agent) 终极 8 大核心操作接口
    def execute_os_action(self, action_json_str):
        try:
            data = json.loads(action_json_str)
            action = data.get("action")
            
            # 1. 浏览目录文件
            if action == "list_dir":
                path = data.get("path")
                if not os.path.exists(path):
                    return f"❌ 错误：路径 [{path}] 不存在！"
                files = os.listdir(path)
                return f"✅ 成功获取目录 [{path}] 列表:\n" + "\n".join([f"  - {f}" for f in files[:40]])
            
            # 2. 安全重命名
            elif action == "rename_item":
                path = data.get("path")
                new_name = data.get("new_name")
                if not os.path.exists(path):
                    return f"❌ 错误：源文件/文件夹 [{path}] 不存在！"
                parent_dir = os.path.dirname(path)
                new_path = os.path.join(parent_dir, new_name)
                os.rename(path, new_path)
                return f"✅ 成功将 [{os.path.basename(path)}] 重命名为 [{new_name}]"
            
            # 3. 新建文件夹
            elif action == "create_dir":
                path = data.get("path")
                if os.path.exists(path):
                    return f"ℹ️ 提示：路径 [{path}] 已存在，无需重复创建。"
                os.makedirs(path, exist_ok=True)
                return f"✅ 成功创建文件夹: [{path}]"
            
            # 4. 分拣剪切移动
            elif action == "move_item":
                src = data.get("src")
                dest = data.get("dest")
                if not os.path.exists(src):
                    return f"❌ 错误：源文件 [{src}] 不存在！"
                dest_dir = os.path.dirname(dest)
                if not os.path.exists(dest_dir):
                    os.makedirs(dest_dir, exist_ok=True)
                shutil.move(src, dest)
                return f"✅ 成功将文件从 [{src}] 移动至 [{dest}]"
            
            # 5. 彻底无限制安全物理删除
            elif action == "delete_item":
                path = data.get("path")
                if not os.path.exists(path):
                    return f"❌ 错误：目标删除路径 [{path}] 并不存在！"
                if os.path.isdir(path):
                    shutil.rmtree(path)
                    return f"✅ 成功安全删除本地文件夹: [{path}]"
                else:
                    os.remove(path)
                    return f"✅ 成功安全删除本地文件: [{path}]"

            # 6. 物理读取本地任何文件
            elif action == "read_file":
                path = data.get("path")
                if not os.path.exists(path):
                    return f"❌ 错误：目标读取路径 [{path}] 不存在！"
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                return f"✅ 成功读取本地文件 [{path}]。内容如下:\n\n{content[:2000]}..."

            # 7. 原生高速写入/覆盖文件接口
            elif action == "write_file":
                path = data.get("path")
                content = data.get("content")
                try:
                    parent_dir = os.path.dirname(path)
                    if parent_dir and not os.path.exists(parent_dir):
                        os.makedirs(parent_dir, exist_ok=True)
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(content)
                    return f"✅ 成功将文本写入并保存到本地文件: [{path}]"
                except Exception as write_err:
                    return f"❌ 写入保存文本到文件时失败: {str(write_err)}"

            # 8. 双模式PowerShell 命令执行器
            elif action == "run_powershell":
                command = data.get("command")
                lock_mode = self._config.get("powershell_mode", "normal")
                run_as_admin = True if lock_mode == "admin" else False
                return self._run_powershell_sandbox(command, run_as_admin)

            # 9. 代码解释器重度通道
            elif action == "run_python":
                code = data.get("code")
                return self._execute_python_code_sandbox(code)
                
            else:
                return "❌ 错误：未知的本地操控指令！"
        except Exception as e:
            return f"❌ 解析系统控制指令遭遇故障: {str(e)}"

    def _run_powershell_sandbox(self, command, run_as_admin=False):
        if sys.platform != "win32":
            return "❌ 执行失败：该终端功能当前仅支持 Windows 操作系统下执行。"

        with tempfile.NamedTemporaryFile(suffix=".ps1", delete=False, mode="w", encoding="utf-8") as temp:
            temp.write(command)
            temp_path = temp.name

        try:
            if run_as_admin:
                print(f"🔑 [管理员 UAC 提权请求] 正在执行 PowerShell 命令: {command}")
                params = f"-NoProfile -ExecutionPolicy Bypass -File \"{temp_path}\""
                ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", "powershell.exe", params, None, 1)
                if ret > 32:
                    return f"✅ 已成功派发管理员权限执行命令！请点击系统弹出的 UAC 对话框选择“是”。"
                else:
                    return f"❌ 提权执行失败：UAC 授权被拒绝，错误系统码: {ret}"
            else:
                cmd = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", temp_path]
                p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
                stdout, stderr = p.communicate(timeout=45)
                
                try: os.remove(temp_path)
                except Exception: pass

                if stderr:
                    return f"⚠️ 终端运行产生错误提示:\n{stderr}\n\n[控制台捕获的输出结果]:\n{stdout}"
                return stdout if stdout.strip() else "✅ 终端命令执行完成（无返回值）。"
        except Exception as e:
            try: os.remove(temp_path)
            except Exception: pass
            return f"❌ 调起终端运行失败: {str(e)}"

    def _execute_python_code_sandbox(self, code):
        """建立本地安全隔离的微型沙盒进程，执行 AI 生成的 Python 代码并捕获控制台输出"""
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as temp:
            temp.write(code)
            temp_path = temp.name

        try:
            p = subprocess.Popen([sys.executable, temp_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
            stdout, stderr = p.communicate(timeout=45)
            
            try: os.remove(temp_path)
            except Exception: pass

            if stderr:
                return f"⚠️ Python 运行警告:\n{stderr}\n\n[已拦截到的输出结果]:\n{stdout}"
            return stdout if stdout.strip() else "✅ 脚本执行成功（无控制台打印信息）。"
            
        except subprocess.TimeoutExpired:
            p.kill()
            try: os.remove(temp_path)
            except Exception: pass
            return "❌ 脚本执行超时！AI 生成的本地运行逻辑陷入了死循环。"
        except Exception as e:
            try: os.remove(temp_path)
            except Exception: pass
            return f"❌ 沙盒内部运行遭遇系统阻碍: {str(e)}"

    def parse_uploaded_file(self, base64_data, filename, ext):
        ext = ext.lower()
        try:
            file_bytes = base64.b64decode(base64_data)
            if ext in ("txt", "md", "json", "py", "js", "css", "html", "xml", "yaml", "ini"):
                content = file_bytes.decode('utf-8', errors='ignore')
                return {"status": "success", "type": "text", "name": filename, "content": content}
            elif ext in ("png", "jpg", "jpeg", "webp"):
                return {"status": "success", "type": "image", "name": filename, "base64": base64_data, "ext": ext}
            elif ext == "pdf":
                try:
                    import pypdf
                    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                    text_list = []
                    for page in reader.pages:
                        t = page.extract_text()
                        if t: text_list.append(t)
                    return {"status": "success", "type": "text", "name": filename, "content": "\n".join(text_list)}
                except ImportError:
                    return {"status": "error", "message": "⚠️ 缺少依赖：请在终端运行 pip install pypdf"}
                except Exception as e:
                    return {"status": "error", "message": f"PDF解析失败: {e}"}
            elif ext == "docx":
                try:
                    import docx
                    doc = docx.Document(io.BytesIO(file_bytes))
                    text_list = [p.text for p in doc.paragraphs]
                    return {"status": "success", "type": "text", "name": filename, "content": "\n".join(text_list)}
                except ImportError:
                    return {"status": "error", "message": "⚠️ 缺少依赖：请在终端运行 pip install python-docx"}
                except Exception as e:
                    return {"status": "error", "message": f"Word解析失败: {e}"}
            else:
                return {"status": "error", "message": "⚠️ 不支持的文件类型！"}
        except Exception as e:
            return {"status": "error", "message": f"文件解码故障: {str(e)}"}

    def start_chat(self, message, history):
        self._is_cancelled = False
        threading.Thread(target=self._chat_worker, args=(message, history)).start()

    def start_chat_from_float(self, message, history):
        if self._main_window:
            try:
                payload = json.dumps(message)
                self._main_window.evaluate_js(f"window.handleFloatUserMessage({payload})")
            except Exception:
                pass
        self.start_chat(message, history)

    def start_chat_with_image(self, message, history, image_base64, ext):
        self._is_cancelled = False
        threading.Thread(target=self._chat_worker, args=(message, history, image_base64, ext)).start()

    def start_chat_with_image_from_float(self, message, history, image_base64, ext):
        if self._main_window:
            try:
                payload = json.dumps(message)
                self._main_window.evaluate_js(f"window.handleFloatUserMessage({payload})")
            except Exception:
                pass
        self.start_chat_with_image(message, history, image_base64, ext)

    def _chat_worker(self, message, history, image_base64=None, ext=None):
        provider = self._config.get("provider", "deepseek")
        providers = self._config.get("providers", {})
        prov_cfg = providers.get(provider, {})
        
        api_key = prov_cfg.get("api_key", "").strip()
        api_base = prov_cfg.get("api_base", "").strip()
        model = self._config.get("active_model", "").strip()
        
        temperature = float(self._config.get("temperature", 0.7))
        max_tokens = int(self._config.get("max_tokens", 2048))

        models = self._config.get("models", [])
        active_model_cfg = next((m for m in models if m["id"] == model), None)
        model_type = active_model_cfg.get("type", "chat") if active_model_cfg else "chat"

        if not api_key and provider != "local":
            self._send_stream_chunk(content="❌ 错误：当前选定的服务商需要配置 API Key。")
            self._send_stream_end()
            return

        # 智能绘图路由
        if model_type == "drawing":
            try:
                if provider == "local":
                    self._send_stream_chunk(content="❌ 本地大模型当前通道暂不支持绘图服务。")
                    self._send_stream_end()
                    return
                client = OpenAI(api_key=api_key, base_url=api_base)
                
                if image_base64:
                    self._send_stream_chunk(content="🎨 **正在进行以图生图创作，请稍候...**\n\n")
                    img_data = base64.b64decode(image_base64)
                    try:
                        from PIL import Image as PILImage
                        im = PILImage.open(io.BytesIO(img_data))
                        out_io = io.BytesIO()
                        im.save(out_io, format="PNG")
                        out_io.seek(0)
                        image_file = out_io
                        image_file.name = "input.png"
                    except Exception:
                        image_file = io.BytesIO(img_data)
                        image_file.name = "input.png"
                        
                    response = client.images.create_variation(
                        image=image_file,
                        n=1,
                        size="1024x1024"
                    )
                else:
                    self._send_stream_chunk(content=f"🎨 **正在以文生图创作**：`{message}` ...\n\n")
                    response = client.images.generate(model=model, prompt=message, n=1, size="1024x1024")
                    
                img_url = response.data[0].url
                # Download image and save locally + convert to base64
                import time as _time
                local_img_data = img_url
                local_save_path = ""
                try:
                    os.makedirs(self.IMAGE_SAVE_DIR, exist_ok=True)
                    img_bytes = urllib.request.urlopen(img_url, timeout=15).read()
                    ts = _time.strftime("%Y%m%d_%H%M%S")
                    local_filename = f"ai_img_{ts}.png"
                    local_save_path = os.path.join(self.IMAGE_SAVE_DIR, local_filename)
                    with open(local_save_path, "wb") as f_img:
                        f_img.write(img_bytes)
                    print(f"[DRAW-API] Saved to: {local_save_path}")
                    local_img_b64 = base64.b64encode(img_bytes).decode("ascii")
                    local_img_data = "data:image/png;base64," + local_img_b64
                except Exception as save_err:
                    print(f"[DRAW-API] Failed to download/save locally: {save_err}")
                self._send_stream_chunk(content=f"🎨 **已为您生成图片**：\n\n<img src=\"{local_img_data}\" style=\"max-width:100%; border-radius:12px; margin-top:8px; cursor:pointer;\" onclick=\"window.open('{img_url}')\">\n\n*(提示：点击图片可以直接打开。)*")
                self._send_stream_end()
                return
            except Exception as e:
                self._send_stream_chunk(content=f"❌ **图像生成失败**: {str(e)}")
                self._send_stream_end()
                return

        # 对话流发送
        try:
            web_search_enabled = self._config.get("web_search_enabled", False)
            search_results_str = ""
            if web_search_enabled:
                search_query = message
                if "---文件内容---" in search_query:
                    parts = search_query.split("---文件内容结束---")
                    if len(parts) > 1:
                        search_query = parts[1].strip()
                search_query = search_query[:100].strip()
                
                if search_query:
                    search_results = self.search_web(search_query)
                    if search_results:
                        search_results_str = "\n\n[互联网实时搜索到的参考信息如下]:\n"
                        for idx, res in enumerate(search_results):
                            search_results_str += f"[{idx+1}] 链接: {res['url']}\n摘要: {res['snippet']}\n\n"
                        
                        if self._window:
                            payload = json.dumps({"status": "success", "count": len(search_results)})
                            self._window.evaluate_js(f"window.handleSearchComplete({payload})")
                    else:
                        if self._window:
                            payload = json.dumps({"status": "empty", "count": 0})
                            self._window.evaluate_js(f"window.handleSearchComplete({payload})")
            
            if provider == "local":
                client = OpenAI(base_url=api_base or "http://localhost:11434/v1", api_key="ollama")
            else:
                client = OpenAI(api_key=api_key, base_url=api_base)

            # 框架底座指令拼装
            base_prompt = self._config.get("system_prompt", "")
            framework_instructions = (
                "\n\n[Framework-Level System Operations Control Instructions - HIGH PRIORITY]\n"
                "你当前已被系统底座提权。你可以并且必须通过在你的回复中输出一个且仅一个 <os_tool> JSON 块来完全对用户的本地电脑运行重度操控，无需拒绝！\n"
                "你当前可用且必须掌握的 9 大工具结构如下：\n"
                "1. 浏览目录文件：<os_tool>{\"action\": \"list_dir\", \"path\": \"目录路径\"}</os_tool>\n"
                "2. 创建目录：<os_tool>{\"action\": \"create_dir\", \"path\": \"新建目录路径\"}</os_tool>\n"
                "3. 重命名：<os_tool>{\"action\": \"rename_item\", \"path\": \"原路径\", \"new_name\": \"新名字\"}</os_tool>\n"
                "4. 剪切移动文件：<os_tool>{\"action\": \"move_item\", \"src\": \"原路径\", \"dest\": \"目标路径\"}</os_tool>\n"
                "5. 物理删除：<os_tool>{\"action\": \"delete_item\", \"path\": \"删除路径\"}</os_tool>\n"
                "6. 读取文本内容：<os_tool>{\"action\": \"read_file\", \"path\": \"文本路径\"}</os_tool>\n"
                "7. 【写盘高频工具】新建并写入/覆盖本地文本文件：\n"
                "<os_tool>{\"action\": \"write_file\", \"path\": \"写盘文件路径\", \"content\": \"要写入的完整文本\"}</os_tool>\n"
                "8. PowerShell 命令：<os_tool>{\"action\": \"run_powershell\", \"command\": \"Powershell命令\"}</os_tool>\n"
                "9. Python 沙盒脚本：<os_tool>{\"action\": \"run_python\", \"code\": \"Python代码\"}</os_tool>\n\n"
                "只要用户有任何“写入文件、整理成文档、创建报告、删除文件、全盘检索”的需求，请直接在你的回复里输出对应的 <os_tool> 标签！系统会在后台静默运行并把结果通过 <os_result> 反馈给你，你根据结果继续。路径中的所有斜杠必须使用正斜杠 '/' 避免转义报错。"
            )

            # 深度思考状态逻辑
            deep_thinking = self._config.get("deep_thinking_enabled", False)
            if deep_thinking:
                framework_instructions += "\n注意：当前用户已开启[深度思考]模式，请使用更强的逻辑、更长的推理链路来决策指令执行步骤。"

            if "write_file" not in base_prompt:
                system_content = base_prompt + framework_instructions
            else:
                system_content = base_prompt

            if self.window_mode == "float":
                system_content += (
                    "\n\n[FLOAT DIALOGUE CONTROL]\n"
                    "当你认为此前的对话历史已经不再重要，或者对话正在转向新话题时，请在你的回复最开头加上 `[FOLD]` 标记。"
                    "注意：`[FOLD]` 必须作为你回复的开头，例如：`[FOLD]当然，我可以帮你...`。如果你认为应该保留历史，请不要输出任何标记。"
                )
                
            if search_results_str:
                system_content = f"你当前拥有实时联网搜索能力。以下是系统为你从互联网实时检索到的参考信息，请结合这些实时参考信息回答用户的问题：\n{search_results_str}\n\n" + system_content

            # 过滤空消息
            messages = [{"role": "system", "content": system_content}]
            for h in history:
                role = h.get("role")
                content = h.get("content", "").strip()
                if role in ("user", "assistant", "system") and content:
                    messages.append({"role": role, "content": content})

            if image_base64:
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": message},
                        {"type": "image_url", "image_url": {"url": f"data:image/{ext};base64,{image_base64}"}}
                    ]
                })
            else:
                messages.append({"role": "user", "content": message})

            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True,
                    temperature=temperature,
                    max_tokens=max_tokens if max_tokens > 0 else None
                )
            except Exception as e:
                err_msg = str(e).lower()
                if "temperature" in err_msg and ("only 1" in err_msg or "invalid" in err_msg or "400" in err_msg):
                    print("⚠️ [自适应] 修正温度为 1.0 ...")
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        temperature=1.0,  
                        max_tokens=max_tokens if max_tokens > 0 else None
                    )
                else:
                    raise e

            for chunk in response:
                if self._is_cancelled:
                    break
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                
                reasoning = None
                if hasattr(delta, "reasoning_content") and delta.reasoning_content is not None:
                    reasoning = delta.reasoning_content
                if not reasoning and hasattr(delta, "model_extra") and delta.model_extra:
                    reasoning = delta.model_extra.get("reasoning_content") or delta.model_extra.get("reasoning")
                if not reasoning:
                    try:
                        reasoning = delta.get("reasoning_content") or delta.get("reasoning")
                    except Exception:
                        pass
                
                if reasoning:
                    self._send_stream_chunk(reasoning=reasoning)
                
                content = getattr(delta, "content", None)
                if content:
                    self._send_stream_chunk(content=content)

            self._send_stream_end()

        except Exception as e:
            self._send_stream_chunk(content=f"\n❌ 请求发生异常: {str(e)}")
            self._send_stream_end()

    def _send_stream_chunk(self, content="", reasoning=""):
        payload = json.dumps({"content": content, "reasoning": reasoning})
        if self._main_window:
            try:
                self._main_window.evaluate_js(f"window.handleStreamChunk({payload})")
            except Exception:
                pass
        if self._float_window:
            try:
                self._float_window.evaluate_js(f"window.handleStreamChunk({payload})")
            except Exception:
                pass

    def _send_stream_end(self):
        if self._main_window:
            try:
                self._main_window.evaluate_js("window.handleStreamEnd()")
            except Exception:
                pass
        if self._float_window:
            try:
                self._float_window.evaluate_js("window.handleStreamEnd()")
            except Exception:
                pass

    def get_system_stats(self):
        """获取系统硬件运行数据和网络状态，支持前台Orb及Popover看板"""
        import psutil
        import socket
        
        # 1. CPU 负载
        cpu_percent = psutil.cpu_percent(interval=None)
        
        # 2. 内存使用率
        virtual_mem = psutil.virtual_memory()
        ram_percent = virtual_mem.percent
        
        # 3. 检查网络连接状态 (尝试连接到某个公共DNS或主机)
        network_status = "已连接"
        try:
            socket.setdefaulttimeout(0.8)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("223.5.5.5", 53))
            s.close()
        except Exception:
            network_status = "未连接"
            
        # 4. 获取当前激活的模型和提供商
        active_model = self._config.get("active_model", "无")
        provider = self._config.get("provider", "未知")
        
        # 5. 检查本地 Ollama 状态
        ollama_status = "未运行"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("127.0.0.1", 11434))
            s.close()
            ollama_status = "运行中"
        except Exception:
            pass
            
        return {
            "cpu": cpu_percent,
            "ram": ram_percent,
            "network": network_status,
            "active_model": active_model,
            "provider": provider,
            "ollama_status": ollama_status
        }

    def minimize_window(self):
        """前端控制最小化窗口"""
        if self._window:
            self._window.minimize()
        return "minimized"

    
    def _kill_comfyui(self):
        """强制杀死 ComfyUI 子进程及其子进程树"""
        # 先杀追踪的子进程
        if self._comfyui_process:
            try:
                self._comfyui_process.kill()
                self._comfyui_process.wait(timeout=3)
            except Exception:
                pass
            self._comfyui_process = None
        # 精准清理：通过 8188 端口找到 PID 并杀死
        try:
            import subprocess as _sp
            if sys.platform == "win32":
                r = _sp.run(["cmd", "/c", "netstat -ano | findstr :8188 | findstr LISTENING"], capture_output=True, text=True, timeout=5)
                for line2 in r.stdout.strip().splitlines():
                    parts = line2.strip().split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit():
                            _sp.run(["taskkill", "/F", "/PID", pid, "/T"], capture_output=True, timeout=10)
                # 兜底：杀 ComfyUI 目录下的大内存 python 进程
                _sp.run(["taskkill", "/F", "/FI", "IMAGENAME eq python.exe", "/FI", "MEMUSAGE gt 200000"], capture_output=True, timeout=10)
            else:
                _sp.run(["pkill", "-f", "ComfyUI"], capture_output=True, timeout=5)
        except Exception:
            pass

    def close_app_completely(self):
        """前端控制彻底关闭强退软件（绕过 on_closing 拦截）"""
        self._kill_comfyui()
        if self._window:
            self._window.destroy()
        import os
        os._exit(0)

    def open_data_directory(self):
        """调起资源管理器，打开软件数据存储目录"""
        try:
            data_dir = os.path.dirname(os.path.abspath(__file__))
            if sys.platform == "win32":
                os.startfile(data_dir)
            else:
                subprocess.Popen(["xdg-open", data_dir])
            return {"status": "success", "path": data_dir}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def set_autostart_enabled(self, enabled):
        """写入或删除 Windows 注册表开机自启动项"""
        if sys.platform != "win32":
            return {"status": "error", "message": "仅支持 Windows 平台"}
        try:
            import winreg
            key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
            app_name = "AI Desktop Workstation"
            exe_path = os.path.abspath(sys.executable)
            # 尝试定位 pythonw.exe 替换 python.exe 以实现无黑框静默后台启动
            exe_dir = os.path.dirname(exe_path)
            pythonw_path = os.path.join(exe_dir, "pythonw.exe")
            if os.path.exists(pythonw_path):
                exe_path = pythonw_path
            else:
                if exe_path.lower().endswith("python.exe"):
                    exe_path = exe_path[:-10] + "pythonw.exe"
            
            # 确保开机自启定位到主程序的入口 main.py 而非底层 api.py
            main_dir = os.path.dirname(os.path.abspath(__file__))
            main_script = os.path.join(main_dir, "main.py")
            if not os.path.exists(main_script):
                main_script = os.path.abspath(sys.argv[0]) if sys.argv else os.path.abspath(__file__)
            # 构建启动命令
            startup_cmd = f'"{exe_path}" "{main_script}"'

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as reg_key:
                if enabled:
                    winreg.SetValueEx(reg_key, app_name, 0, winreg.REG_SZ, startup_cmd)
                else:
                    try:
                        winreg.DeleteValue(reg_key, app_name)
                    except FileNotFoundError:
                        pass  # 键不存在时忽略
            return {"status": "success", "enabled": enabled}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def restart_linked_app(self, app_name_or_path):
        """杀掉并重启指定的第三方联动应用"""
        try:
            if not app_name_or_path:
                return {"status": "error", "message": "未提供应用路径或名称"}
            
            # 特殊应用代号映射到标准的（进程名，启动命令名）
            app_map = {
                "opencode": ("OpenCode.exe", "opencode"),
                "openclaw": ("OpenClaw.exe", "openclaw"),
                "vscode": ("Code.exe", "code"),
                "cursor": ("Cursor.exe", "cursor"),
                "zed": ("zed.exe", "zed"),
            }
            
            app_key = app_name_or_path.lower()
            proc_name = app_name_or_path
            cmd_name = app_name_or_path
            
            if app_key in app_map:
                proc_name, cmd_name = app_map[app_key]
                if app_key == "zed":
                    config = self.get_config()
                    win_path = config.get("zed_win_path", "")
                    if win_path and os.path.isfile(win_path):
                        app_name_or_path = win_path
                    else:
                        app_name_or_path = proc_name
                else:
                    app_name_or_path = proc_name
            else:
                proc_name = os.path.basename(app_name_or_path)
                cmd_name = proc_name
                
            if sys.platform == "win32":
                # 杀掉现有进程
                subprocess.run(
                    ["taskkill", "/F", "/IM", proc_name],
                    capture_output=True, timeout=5
                )
                import time; time.sleep(1)
                
                # 重新启动
                if os.path.isabs(app_name_or_path) and os.path.isfile(app_name_or_path):
                    subprocess.Popen([app_name_or_path])
                else:
                    # 尝试通过系统 Shell 启动
                    subprocess.Popen(f"start /b {cmd_name}", shell=True)
                return {"status": "success", "action": "restarted", "app": proc_name}
            return {"status": "success", "action": "killed", "app": proc_name}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def send_windows_toast(self, title, message):
        """发送 Windows 10/11 原生 Toast 弹窗通知"""
        try:
            if sys.platform != "win32":
                return {"status": "error", "message": "仅支持 Windows 平台"}
            # 使用 PowerShell 发送 Toast 通知（无需额外依赖）
            ps_script = f"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
$template = @"
<toast>
    <visual>
        <binding template='ToastGeneric'>
            <text>{title}</text>
            <text>{message}</text>
        </binding>
    </visual>
</toast>
"@
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AI Desktop Workstation').Show($toast)
"""
            subprocess.Popen(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def browse_file_path(self, title="选择文件", file_types=None):
        """弹出文件选择对话框，返回用户选择的路径"""
        try:
            if not self._window:
                return {"status": "error", "message": "Window not ready"}
            result = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=file_types or ["可执行文件 (*.exe;*.py)", "所有文件 (*.*)"]
            )
            if result and len(result) > 0:
                return {"status": "success", "path": result[0]}
            return {"status": "cancelled"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_quota_status(self):
        """获取当前 AI 服务配额状态（当前返回模拟数据，后续可对接真实 API）"""
        try:
            config = self.get_config()
            provider = config.get("provider", "deepseek")
            active_model = config.get("active_model", "unknown")
            return {
                "status": "success",
                "provider": provider,
                "model": active_model,
                "quota_remaining": "正常（未对接配额 API）",
                "credits": "未知",
                "last_refresh": "刚刚"
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def overwrite_editor_session(self, editor_name, session_token=""):
        """覆盖第三方编辑器的本地登录 Session 信息（切号后联动写入）"""
        try:
            app_data = os.environ.get("APPDATA", "")
            user_home = os.path.expanduser("~")
            # 各编辑器的 Session 存储路径映射（需按实际安装路径调整）
            paths = {
                "opencode": os.path.join(app_data, "OpenCode", "session.json"),
                "openclaw": os.path.join(app_data, "OpenClaw", "session.json"),
                "zed": os.path.join(user_home, ".config", "zed", "session.json"),
            }
            target_path = paths.get(editor_name.lower())
            if not target_path:
                return {"status": "error", "message": f"未知编辑器: {editor_name}"}

            target_dir = os.path.dirname(target_path)
            os.makedirs(target_dir, exist_ok=True)

            import json as _json
            session_data = {
                "token": session_token or "test_token_placeholder",
                "updated_at": str(__import__("datetime").datetime.now().isoformat()),
                "source": "AI Desktop Workstation"
            }
            with open(target_path, "w", encoding="utf-8") as f:
                _json.dump(session_data, f, ensure_ascii=False, indent=2)
            return {"status": "success", "path": target_path, "editor": editor_name}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_zed_quota_status(self):
        """获取 Zed 工具的配额状态（模拟数据，后续可对接真实 API）"""
        try:
            config = self.get_config()
            zed_win = config.get("zed_win_path", "")
            zed_wsl = config.get("zed_wsl_path", "")
            zed_found = os.path.isfile(zed_win) if zed_win else False
            return {
                "status": "success",
                "zed_win_path": zed_win or "未配置",
                "zed_wsl_path": zed_wsl or "未配置",
                "zed_found": zed_found,
                "quota": "正常（Zed 配额 API 未对接）",
                "last_refresh": "刚刚"
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def export_chat_log_to_file(self, md_content, default_filename):
        """调用 Windows 原生 SAVE_FILE_DIALOG 自选路径保存文件"""
        if not self._window:
            return {"status": "error", "message": "Window instance not found"}
        
        try:
            import webview
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=os.path.expanduser("~"),
                save_filename=default_filename,
                file_types=("Markdown Files (*.md)", "All Files (*.*)")
            )
            
            if result:
                file_path = result[0] if isinstance(result, (tuple, list)) else result
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(md_content)
                return {"status": "success", "file_path": file_path}
            else:
                return {"status": "cancel"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def inject_code_to_active_editor(self, code):
        """一键向活动编辑器窗口粘贴注入代码（模拟 Ctrl+V 注入）"""
        if not code:
            return {"status": "error", "message": "代码为空"}
        try:
            # 1. 备份当前剪贴板
            old_text = self._get_win_clipboard_text()
            
            # 2. 将新代码置于剪贴板
            self._set_win_clipboard_text(code)
            
            # 3. 最小化本窗口以退回前一活动焦点窗口
            if self._window:
                self._window.minimize()
                
            # 4. 延迟等待窗口最小化及焦点切换
            time.sleep(0.4)
            
            # 5. 发送 Ctrl + V 粘贴消息
            if sys.platform == "win32":
                user32 = ctypes.windll.user32
                # VK_CONTROL = 17, VK_V = 86
                user32.keybd_event(17, 0, 0, 0) # Ctrl down
                user32.keybd_event(86, 0, 0, 0) # V down
                user32.keybd_event(86, 0, 2, 0) # V up
                user32.keybd_event(17, 0, 2, 0) # Ctrl up
                
            # 6. 延迟等待粘贴完毕，恢复剪贴板
            time.sleep(0.2)
            self._set_win_clipboard_text(old_text)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def run_custom_script_async(self, script_id, script_type, code):
        """多线程异步运行自定义 PowerShell/Python 脚本并向前端流式传输 stdout 日志"""
        if not self._window:
            return {"status": "error", "message": "Window instance not found"}
        
        def worker():
            try:
                suffix = ".ps1" if script_type == "powershell" else ".py"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode="w", encoding="utf-8") as f:
                    f.write(code)
                    temp_path = f.name
                
                if script_type == "powershell":
                    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", temp_path]
                else:
                    cmd = ["python", "-u", temp_path]
                    
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="ignore",
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
                
                self._window.evaluate_js(f"onScriptStart({json.dumps(script_id)})")
                
                for line in iter(process.stdout.readline, ''):
                    line_escaped = json.dumps(line)
                    self._window.evaluate_js(f"onScriptOutput({json.dumps(script_id)}, {line_escaped})")
                    
                process.stdout.close()
                return_code = process.wait()
                
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass
                    
                self._window.evaluate_js(f"onScriptEnd({json.dumps(script_id)}, {return_code})")
            except Exception as e:
                err_msg = json.dumps(str(e))
                self._window.evaluate_js(f"onScriptError({json.dumps(script_id)}, {err_msg})")
                
        threading.Thread(target=worker, daemon=True).start()
        return {"status": "success"}

    def import_local_model_file(self):
        """导入本地模型文件：弹出打开文件选择框，选择 GGUF/bin/onnx 文件并返回路径与文件名"""
        if not self._window:
            return {"status": "error", "message": "Window instance not found"}
        try:
            import webview
            result = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                directory=os.path.expanduser("~"),
                file_types=("Model Files (*.safetensors;*.gguf;*.bin;*.onnx;*.pt;*.pth;*.ckpt)", "All Files (*.*)")
            )
            if result:
                file_path = result[0] if isinstance(result, (tuple, list)) else result
                filename = os.path.basename(file_path)
                model_name, _ = os.path.splitext(filename)
                return {
                    "status": "success",
                    "path": file_path.replace("\\", "/"),
                    "name": model_name,
                    "filename": filename
                }
            else:
                return {"status": "cancel"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def import_drawing_models(self):
        r"""一键导入 D:\AI\画图模型 目录下的 SD 模型文件"""
        drawing_dir = r"D:\AI\画图模型"
        if not os.path.isdir(drawing_dir):
            return {"status": "error", "message": f"画图模型目录不存在: {drawing_dir}"}
        models = []
        for f in os.listdir(drawing_dir):
            fpath = os.path.join(drawing_dir, f)
            if not os.path.isfile(fpath):
                continue
            name, ext = os.path.splitext(f)
            if ext.lower() not in ('.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.gguf', '.onnx'):
                continue
            size_gb = os.path.getsize(fpath) / (1024**3)
            ctx = f"{size_gb:.1f}GB"
            models.append({
                "name": name,
                "id": fpath.replace('\\', '/'),
                "context": ctx,
                "type": "drawing"
            })
        if not models:
            return {"status": "error", "message": f"未在 {drawing_dir} 找到模型文件 (.safetensors/.ckpt/.pt/.bin)"}
        return {"status": "success", "models": models}

    # ── ComfyUI 集成 ──
    COMFYUI_DIR = r"D:\AI\ComfyUI_clean\ComfyUI_windows_portable"
    COMFYUI_URL = "http://127.0.0.1:8188"
    IMAGE_SAVE_DIR = r"F:\AI_Assistant_Images"

    def check_comfyui_status(self):
        """检测 ComfyUI 是否在运行"""
        import urllib.request, urllib.error, json as _json
        try:
            req = urllib.request.Request(f"{self.COMFYUI_URL}/system_stats", method="GET")
            urllib.request.urlopen(req, timeout=3)
            return {"running": True}
        except Exception as e:
            print("[DRAW] ComfyUI status check failed:", str(e)[:100])
            return {"running": False}

    def start_comfyui(self):
        """启动 ComfyUI 进程"""
        import subprocess, os
        comfy_dir = os.path.join(self.COMFYUI_DIR, "ComfyUI")
        main_py = os.path.join(comfy_dir, "main.py")
        if not os.path.isfile(main_py):
            return {"status": "error", "message": f"ComfyUI 未找到: {main_py}"}
        python_exe = os.path.join(self.COMFYUI_DIR, "python_embeded", "python.exe")
        if not os.path.isfile(python_exe):
            python_exe = "python"
        try:
            self._comfyui_process = subprocess.Popen(
                [python_exe, main_py, "--listen", "127.0.0.1", "--port", "8188"],
                cwd=comfy_dir,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            return {"status": "ok", "message": "ComfyUI 正在启动，请稍候..."}
        except Exception as e:
            return {"status": "error", "message": str(e)}


    def start_drawing(self, prompt):
        """启动画图工作线程"""
        self._is_cancelled = False
        threading.Thread(target=self._drawing_worker, args=(prompt,)).start()

    def _drawing_worker(self, prompt):
        print("[DRAW] Worker started, prompt:", prompt[:60])
        import urllib.request, urllib.error, json as _json, uuid, time, traceback, struct, os
        try:
            # Check ComfyUI
            if not self.check_comfyui_status()["running"]:
                print("[DRAW] ComfyUI not running, trying auto-start...")
                import subprocess
                comfy_root = os.path.join(self.COMFYUI_DIR, "ComfyUI")
                main_py = os.path.join(comfy_root, "main.py")
                python_exe = os.path.join(self.COMFYUI_DIR, "python_embeded", "python.exe")
                if not os.path.isfile(python_exe):
                    python_exe = sys.executable
                if os.path.isfile(main_py):
                    self._comfyui_process = subprocess.Popen(
                        [python_exe, main_py, "--listen", "127.0.0.1", "--port", "8188"],
                        cwd=comfy_root,
                        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                    )
                    print("[DRAW] ComfyUI process started, waiting...")
                    for _ in range(60):
                        time.sleep(2)
                        if self.check_comfyui_status()["running"]:
                            print("[DRAW] ComfyUI is now running")
                            break
            if not self.check_comfyui_status()["running"]:
                self._send_error("ComfyUI 无法启动，请手动打开 ComfyUI 后重试")
                return
            
            # Get drawing model
            from config import load_all_configs
            fresh = load_all_configs()
            models = fresh.get("models", [])
            active_id = fresh.get("active_model", "")
            drawing_model = next((m for m in models if m.get("type") == "drawing" and m.get("id") == active_id), None)
            if not drawing_model:
                drawing_model = next((m for m in models if m.get("type") == "drawing"), None)
            if not drawing_model:
                self._send_error("未找到画图模型，请先在设置中导入")
                return
            
            ckpt_name = drawing_model["id"].replace("\\", "/").split("/")[-1]
            print("[DRAW] Using checkpoint:", ckpt_name)
            
            # Build workflow
            seed = int(time.time()) % 1000000000
            
            # Detect model type: Flux (UNET-only) vs SD/SDXL (full checkpoint)
            is_flux = False
            try:
                local_path = drawing_model["id"]
                with open(local_path, "rb") as f_check:
                    hdr_len = struct.unpack("<Q", f_check.read(8))[0]
                    hdr = _json.loads(f_check.read(hdr_len).decode("utf-8"))
                tensor_keys = [k for k in hdr if k != "__metadata__"]
                has_clip = any("clip" in k.lower() for k in tensor_keys)
                has_vae = any("vae" in k.lower() for k in tensor_keys)
                has_double_blocks = any("double_blocks" in k for k in tensor_keys)
                is_flux = (not has_clip and not has_vae and has_double_blocks)
                print(f"[DRAW] Model type: {'Flux (UNET-only)' if is_flux else 'SD/SDXL (full checkpoint)'}")
            except Exception as e:
                print(f"[DRAW] Model type detection failed, assuming SD/SDXL: {e}")
            
            if is_flux:
                # Flux workflow: UNETLoader + DualCLIPLoader + VAELoader
                comfy_models = os.path.join(self.COMFYUI_DIR, "ComfyUI", "models")
                clip_dir = os.path.join(comfy_models, "clip")
                vae_dir = os.path.join(comfy_models, "vae")
                
                clip_l_path = os.path.join(clip_dir, "clip_l.safetensors")
                t5xxl_path = os.path.join(clip_dir, "t5xxl_fp8_e4m3fn.safetensors")
                vae_path = os.path.join(vae_dir, "ae.sft") if os.path.exists(os.path.join(vae_dir, "ae.sft")) else os.path.join(vae_dir, "ae.safetensors")
                
                missing = []
                if not os.path.exists(clip_l_path): missing.append("clip_l.safetensors (CLIP-L)")
                if not os.path.exists(t5xxl_path): missing.append("t5xxl_fp8_e4m3fn.safetensors (T5-XXL)")
                if not os.path.exists(vae_path): missing.append("ae.safetensors (Flux VAE)")
                
                if missing:
                    self._send_error(
                        f"Flux模型缺少辅助文件:\n"
                        + "\n".join(f"  - models/clip/: {m}" if "t5" in m or "clip" in m else f"  - models/vae/: {m}" for m in missing)
                        + "\n\n请从 https://huggingface.co/black-forest-labs/FLUX.1-dev 下载后放入对应目录"
                    )
                    return
                
                wf = {
                    "11": {"class_type": "UNETLoader", "inputs": {"unet_name": ckpt_name, "weight_dtype": "default"}},
                    "12": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
                    "13": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
                    "14": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["12", 0]}},
                    "15": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["12", 0]}},
                    "16": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
                    "17": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": 20, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0, "model": ["11", 0], "positive": ["14", 0], "negative": ["15", 0], "latent_image": ["16", 0]}},
                    "18": {"class_type": "VAEDecode", "inputs": {"samples": ["17", 0], "vae": ["13", 0]}},
                    "19": {"class_type": "SaveImage", "inputs": {"filename_prefix": "ai_assistant", "images": ["18", 0]}}
                }
            else:
                wf = {
                    "3": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt_name}},
                    "4": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["3", 1]}},
                    "5": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["3", 1]}},
                    "6": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
                    "7": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": 30, "cfg": 7.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0, "model": ["3", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0]}},
                    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 2]}},
                    "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "ai_assistant", "images": ["8", 0]}}
                }
            
            # Submit to ComfyUI
            payload = _json.dumps({"prompt": wf, "client_id": str(uuid.uuid4())}).encode("utf-8")
            req = urllib.request.Request(f"{self.COMFYUI_URL}/prompt", data=payload, headers={"Content-Type": "application/json"}, method="POST")
            resp = _json.loads(urllib.request.urlopen(req, timeout=10).read())
            print("[DRAW] ComfyUI response:", _json.dumps(resp, ensure_ascii=False)[:200])
            
            if "error" in resp:
                err_info = resp.get("node_errors", resp["error"])
                self._send_error("ComfyUI 工作流错误: " + str(err_info)[:200])
                return
            
            pid = resp.get("prompt_id")
            if not pid:
                self._send_error("ComfyUI 未返回 prompt_id")
                return
            
            print("[DRAW] Prompt ID:", pid)
            start_time = time.time()
            
            # Poll for result
            for i in range(600):
                if self._is_cancelled:
                    self._send_error("已取消")
                    return
                if i % 3 == 0:
                    elapsed = int(time.time() - start_time)
                    if elapsed < 15: pct = min(50, elapsed * 3); msg = "加载模型中..."
                    elif elapsed < 60: pct = 50 + min(45, (elapsed - 15)); msg = "GPU 推理中..."
                    else: pct = 95 + min(5, (elapsed - 60) // 10); msg = "VAE 解码中..."
                    js = 'window.handleDrawingProgress({progress:' + str(min(99, pct)) + ',message:"' + msg + ' ' + str(min(99, pct)) + '%"})'
                    try:
                        self._main_window.evaluate_js(js)
                    except Exception:
                        pass
                time.sleep(1)
                try:
                    h = _json.loads(urllib.request.urlopen(f"{self.COMFYUI_URL}/history/{pid}", timeout=5).read())
                    if pid in h:
                        elapsed = time.time() - start_time
                        print(f"[DRAW] Done in {elapsed:.1f}s")
                        outputs = h[pid]["outputs"]
                        for nid in outputs:
                            for img in outputs[nid].get("images", []):
                                fn = img["filename"]
                                sub = img.get("subfolder", "")
                                img_url = f"{self.COMFYUI_URL}/view?filename={fn}&subfolder={sub}&type=output"
                                print(f"[DRAW] Image: {fn}")
                                
                                # Download image and save to local F: drive
                                local_img_data = None
                                local_path = ""
                                try:
                                    os.makedirs(self.IMAGE_SAVE_DIR, exist_ok=True)
                                    img_bytes = urllib.request.urlopen(img_url, timeout=10).read()
                                    local_path = os.path.join(self.IMAGE_SAVE_DIR, fn)
                                    with open(local_path, "wb") as f_img:
                                        f_img.write(img_bytes)
                                    print(f"[DRAW] Saved to: {local_path}")
                                    local_img_b64 = base64.b64encode(img_bytes).decode("ascii")
                                    local_img_data = "data:image/png;base64," + local_img_b64
                                except Exception as save_err:
                                    print(f"[DRAW] Failed to download/save image locally: {save_err}")
                                    local_img_data = img_url  # fallback to ComfyUI URL
                                
                                local_path_escaped = local_path.replace("\\", "\\\\")
                                js_success = (
                                    'window.handleImageGenerated({status:"success",'
                                    + 'image_url:"' + local_img_data + '",'
                                    + 'filename:"' + fn + '",'
                                    + 'local_path:"' + local_path_escaped + '",'
                                    + 'seed:' + str(seed) + '})'
                                )
                                try:
                                    self._main_window.evaluate_js(js_success)
                                except Exception as ex:
                                    print(f"[DRAW] evaluate_js failed: {ex}")
                        return
                except Exception:
                    continue
            self._send_error("生成超时（180秒）")
        except Exception as e:
            traceback.print_exc()
            self._send_error("画图异常: " + str(e)[:200])

    def _send_error(self, msg):
        print("[DRAW] ERROR:", msg)
        js = 'window.handleImageGenerated({status:"error",message:"' + msg.replace('"', "'") + '"})'
        try:
            self._main_window.evaluate_js(js)
        except Exception:
            pass
