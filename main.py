# main.py
import os
import sys
import ctypes
import threading
import webview
from api import AppAPI
from config import load_all_configs


if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# 模块全局变量以保持 Mutex 句柄不被释放
_app_mutex = None

def check_single_instance():
    """使用 Win32 互斥体进行单实例检测，如果已经存在，则尝试唤醒已有窗口并退出"""
    global _app_mutex
    if sys.platform != "win32":
        return True
    
    try:
        mutex_name = "Global\\AI_Desktop_Workstation_Mutex"
        kernel32 = ctypes.windll.kernel32
        # CreateMutexW(lpMutexAttributes, bInitialOwner, lpName)
        # ERROR_ALREADY_EXISTS = 183
        _app_mutex = kernel32.CreateMutexW(None, True, mutex_name)
        last_error = kernel32.GetLastError()
        
        if last_error == 183: # 已经存在
            user32 = ctypes.windll.user32
            user32.FindWindowW.restype = ctypes.c_void_p
            # 尝试寻找并唤醒主窗口
            hwnd = AppAPI._find_window_hwnd("AI Desktop Workstation Cockpit")
            if not hwnd:
                hwnd = AppAPI._find_window_hwnd("AI Desktop Assistant")
            if hwnd:
                # 9 = SW_RESTORE, 5 = SW_SHOW
                user32.ShowWindow(hwnd, 9)
                user32.ShowWindow(hwnd, 5)
                user32.SetForegroundWindow(hwnd)
            else:
                # 尝试寻找悬浮窗口
                hwnd_float = AppAPI._find_window_hwnd("AI Float Dialogue")
                if hwnd_float:
                    user32.ShowWindow(hwnd_float, 9)
                    user32.ShowWindow(hwnd_float, 5)
                    user32.SetForegroundWindow(hwnd_float)
            return False
    except Exception as e:
        print("[Warn] 单实例 Mutex 检测失败:", e)
    return True

def get_html_path():
    """解析获取 HTML 模板的系统级绝对寻址路径，防止多平台打包路径报错"""
    if getattr(sys, 'frozen', False):
        current_dir = sys._MEIPASS
    else:
        current_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(current_dir, "ai_ui_assistant", "index.html")

    if sys.platform == "win32":
        return f"file:///{html_file.replace(os.sep, '/')}"
    else:
        return f"file://{html_file}"

def global_hotkey_listener(window_obj):
    """Windows 专属免第三方依赖：全局快捷键 Alt + Space / Alt + Shift + Space 监听线程"""
    if sys.platform != "win32":
        return
        
    user32 = ctypes.windll.user32
    # MOD_ALT = 0x0001, MOD_SHIFT = 0x0004, VK_SPACE = 0x0020
    # 注册系统全局热键 Alt + Space
    if not user32.RegisterHotKey(None, 1, 0x0001, 0x0020):
        print("[Warn] 全局快捷键 Alt + Space 注册失败，可能已被占用")
    else:
        print("[Info] 全局快捷键监听启动：按下 Alt + Space 可快速隐藏或唤醒 AI 工作站窗口！")

    # 注册系统全局热键 Alt + Shift + Space (0x0001 | 0x0004 = 0x0005)
    if not user32.RegisterHotKey(None, 2, 0x0001 | 0x0004, 0x0020):
        print("[Warn] 全局快捷键 Alt + Shift + Space 注册失败，可能已被占用")
    else:
        print("[Info] 全局快捷键监听启动：按下 Alt + Shift + Space 可快速唤出 Spotlight 命令面板！")
        
    # 消息循环体
    class MSG(ctypes.Structure):
        _fields_ = [("hwnd", ctypes.c_void_p),
                    ("message", ctypes.c_uint),
                    ("wParam", ctypes.c_void_p),
                    ("lParam", ctypes.c_void_p),
                    ("time", ctypes.c_uint),
                    ("pt", ctypes.c_longlong)]

    msg = MSG()
    visible = True
    
    try:
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            if msg.message == 0x0312:  # WM_HOTKEY
                hotkey_id = msg.wParam
                if hotkey_id == 1:
                    if visible:
                        window_obj.minimize() # 极速收缩挂起
                        visible = False
                    else:
                        window_obj.restore()  # 唤醒并强制置顶
                        visible = True
                elif hotkey_id == 2:
                    if not visible:
                        window_obj.restore()
                        visible = True
                    window_obj.evaluate_js("toggleSpotlightOverlay()")
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
    except Exception as e:
        print("全局热键监视线程发生故障退出:", e)
    finally:
        user32.UnregisterHotKey(None, 1)
        user32.UnregisterHotKey(None, 2)

def setup_tray_icon(api_instance):
    """在后台线程中初始化并启动系统托盘图标"""
    def tray_thread():
        try:
            import pystray
            from PIL import Image, ImageDraw
        except ImportError:
            print("[Info] 检测到系统托盘依赖库(pystray/pillow)未安装，正在自动安装...")
            import subprocess
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "pystray", "pillow"])
                import pystray
                from PIL import Image, ImageDraw
                print("[Info] 托盘依赖库自动安装成功！")
            except Exception as ex:
                print(f"[Warn] 自动安装托盘依赖库失败，托盘将不可用: {ex}")
                return

        def on_open_cockpit(icon, item):
            api_instance.show_main_window()

        def on_open_float(icon, item):
            config = load_all_configs()
            config["floating_dialogue_enabled"] = True
            from config import save_all_configs
            save_all_configs(config)
            if api_instance._float_window:
                api_instance.show_float_window()
                try:
                    api_instance._main_window.evaluate_js("syncFloatingDialogueEnabledUI(true)")
                    api_instance._float_window.evaluate_js("window.resetFloatDialogue()")
                except Exception:
                    pass

        def on_toggle_main_ontop(icon, item):
            config = load_all_configs()
            val = not config.get("main_window_on_top", False)
            config["main_window_on_top"] = val
            from config import save_all_configs
            save_all_configs(config)
            api_instance.set_main_on_top_api(val)

        def on_toggle_float_ontop(icon, item):
            config = load_all_configs()
            val = not config.get("floating_dialogue_on_top", True)
            config["floating_dialogue_on_top"] = val
            from config import save_all_configs
            save_all_configs(config)
            api_instance.set_float_on_top_api(val)

        def on_exit(icon, item):
            icon.stop()
            api_instance.close_app_completely()

        # 动态创建 64x64 UFO 飞碟托盘图标 (暗紫色科幻感)
        width, height = 64, 64
        image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        dc = ImageDraw.Draw(image)
        # 光晕
        dc.ellipse([8, 20, 56, 44], fill=(129, 140, 248, 100), outline=(99, 102, 241, 255), width=2)
        # 舱体
        dc.ellipse([22, 10, 42, 30], fill=(168, 85, 247, 200), outline=(192, 132, 252, 255), width=2)
        # 灯光
        dc.ellipse([18, 30, 24, 36], fill=(52, 211, 153, 255))
        dc.ellipse([30, 32, 34, 36], fill=(244, 63, 94, 255))
        dc.ellipse([40, 30, 46, 36], fill=(52, 211, 153, 255))

        menu = pystray.Menu(
            pystray.MenuItem("打开主控台", on_open_cockpit),
            pystray.MenuItem("打开对话悬浮窗", on_open_float),
            pystray.MenuItem("切换主窗口置顶", on_toggle_main_ontop),
            pystray.MenuItem("切换悬浮窗置顶", on_toggle_float_ontop),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("退出应用", on_exit)
        )
        
        icon = pystray.Icon("AI_Assistant", image, "AI Desktop Assistant", menu)
        icon.run()

    t = threading.Thread(target=tray_thread, daemon=True)
    t.start()

if __name__ == "__main__":
    # === Auto-backup project to F:\AI_Assistant_Backups ===
    import shutil
    from datetime import datetime
    try:
        backup_root = r"F:\AI_Assistant_Backups"
        project_dir = os.path.dirname(os.path.abspath(__file__))
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        backup_dest = os.path.join(backup_root, f"ai_assistant_{timestamp}")
        os.makedirs(backup_root, exist_ok=True)
        shutil.copytree(
            project_dir, backup_dest,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".venv", "build", "dist", ".git", "node_modules"),
            dirs_exist_ok=True
        )
        print(f"[Backup] Project backed up to: {backup_dest}")
    except Exception as e:
        print(f"[Backup] Warning: Failed to backup: {e}")
    # === End auto-backup ===

    if not check_single_instance():
        print("[Info] 检测到已有实例正在后台运行，已将其唤醒，当前进程干净退出。")
        sys.exit(0)

    api = AppAPI()
    url = get_html_path()
    
    # 从配置文件中加载配置以获取各窗口的设置
    config = load_all_configs()
    main_window_on_top = config.get("main_window_on_top", False)

    # 建立 1.618 黄金比例大双栏主控台桌面窗口 (1180 * 750)
    window = webview.create_window(
        title="AI Desktop Workstation Cockpit",
        url=url,
        js_api=api,
        width=1180,
        height=750,
        resizable=True,
        min_size=(960, 600),
        on_top=main_window_on_top
    )

    # 建立 悬浮对话窗口 (横向窄条)
    float_api = AppAPI()
    float_api.window_mode = "float"

    # 计算屏幕边缘的位置
    screens = webview.screens
    screen_width = 1920
    if screens:
        screen_width = screens[0].width
    
    # 从配置文件中加载悬浮窗大小并自动迁移旧版本55px高度的遗留配置
    config_height = int(config.get("floating_dialogue_height", 450))
    config_width = int(config.get("floating_dialogue_width", 380))
    
    # 兼容与自我修复：若高度小于 200px (如旧版 55px)，则自动订正为纵向卡片标准高度 450px 并保存
    if config_height < 200:
        config_height = 450
        config_width = 380
        config["floating_dialogue_height"] = config_height
        config["floating_dialogue_width"] = config_width
        from config import save_all_configs
        save_all_configs(config)
        
    float_height = config_height
    float_width = config_width
    float_x = screen_width - float_width - 50
    float_y = 100
    float_on_top = config.get("floating_dialogue_on_top", True)

    float_window = webview.create_window(
        title="AI Float Dialogue",
        url=url,
        js_api=float_api,
        width=float_width,
        height=float_height,
        x=float_x,
        y=float_y,
        resizable=True,
        frameless=True,
        on_top=float_on_top,
        hidden=True
    )

    # 给 API 传入双方的窗口控制引用
    api.set_windows(main_window=window, float_window=float_window)
    float_api.set_windows(main_window=window, float_window=float_window)

    float_window.shown_once = False
    def on_float_shown():
        # Float window is created hidden; this fires when first shown via tray/settings
        if sys.platform == "win32":
            try:
                hwnd = None
                if hasattr(float_window, 'native') and float_window.native:
                    try:
                        hwnd = int(float_window.native.Handle.ToInt64())
                    except Exception:
                        try:
                            hwnd = int(float_window.native.Handle)
                        except Exception:
                            pass
                if not hwnd:
                    user32 = ctypes.windll.user32
                    user32.FindWindowW.restype = ctypes.c_void_p
                    hwnd = AppAPI._find_window_hwnd("AI Float Dialogue")
                if hwnd:
                    api.register_float_hwnd(hwnd)
                    float_api.register_float_hwnd(hwnd)
                    print(f"[Info] Float window shown, HWND: {hwnd}")
            except Exception as e:
                print("Failed to register float hwnd:", e)

        if not getattr(float_window, 'shown_once', False):
            float_window.shown_once = True
    float_window.events.shown += on_float_shown

    def on_float_closing():
        float_window.hide()
        # 关闭悬浮窗时更新配置为禁用
        cfg = load_all_configs()
        cfg["floating_dialogue_enabled"] = False
        from config import save_all_configs
        save_all_configs(cfg)
        
        # 同步主界面的 UI 开关状态
        try:
            window.evaluate_js("syncFloatingDialogueEnabledUI(false)")
        except Exception:
            pass
            
        # 若主界面当前处于隐藏状态，说明主程序已被隐藏关闭，此处隐藏悬浮窗应导致彻底退出
        if not getattr(api, "_main_window_visible", True):
            import os
            os._exit(0)
        return False
    float_window.events.closing += on_float_closing

    def on_closing():
        config = load_all_configs()
        if config.get("floating_dialogue_enabled", False):
            window.hide()
            api._main_window_visible = False
            float_api._main_window_visible = False
            # Show float using direct Win32
            if sys.platform == "win32":
                hwnd_f = AppAPI._float_hwnd
                if not hwnd_f:
                    hwnd_f = AppAPI._find_window_hwnd("AI Float Dialogue")
                if hwnd_f:
                    screens = webview.screens
                    screen_width = screens[0].width if screens else 1920
                    w = config.get("floating_dialogue_width", 380)
                    h = config.get("floating_dialogue_height", 450)
                    fx = screen_width - w - 50
                    fy = 100
                    user32 = ctypes.windll.user32
                    user32.ShowWindow(hwnd_f, 5)  # SW_SHOW
                    user32.SetWindowPos(hwnd_f, -1, fx, fy, w, h, 0x0010)  # HWND_TOPMOST|SWP_NOACTIVATE
                    user32.SetForegroundWindow(hwnd_f)
            else:
                float_window.show()
                screens = webview.screens
                screen_width = screens[0].width if screens else 1920
                w = config.get("floating_dialogue_width", 380)
                fx = screen_width - w - 50
                fy = 100
                float_window.move(fx, fy)
            try:
                float_window.evaluate_js("window.resetFloatDialogue()")
            except Exception:
                pass
            return False

        action = config.get("close_action", "ask")
        if action == "minimize":
            window.minimize()
            return False
        elif action == "close":
            # 隐藏主窗口到系统托盘，不销毁，保留进程与托盘图标
            window.hide()
            api._main_window_visible = False
            float_api._main_window_visible = False
            return False
        else:
            # Use native Windows MessageBox for reliability (avoids WebView2 deadlock in FormClosing)
            if sys.platform == "win32":
                user32 = ctypes.windll.user32
                # MB_YESNO | MB_ICONQUESTION | MB_DEFBUTTON2 | MB_TOPMOST | MB_SETFOREGROUND
                result = user32.MessageBoxW(0,
                    "最小化到托盘还是彻底退出应用？\n\n是 = 最小化到托盘\n否 = 彻底退出",
                    "AI Desktop Assistant",
                    0x00000004 | 0x00000020 | 0x00000100 | 0x00040000 | 0x00010000)
                if result == 6:  # IDYES = minimize to tray
                    window.minimize()
                    return False
                # IDNO or close = exit completely
            api.close_app_completely()
            return False

    window.events.closing += on_closing
    
    def on_shown():
        # 启动后台守护级全局热键拦截线程 (提权操作)
        t = threading.Thread(target=global_hotkey_listener, args=(window,), daemon=True)
        t.start()
        
        # 捕获并注册主窗口句柄
        if sys.platform == "win32":
            try:
                hwnd = None
                if hasattr(window, 'native') and window.native:
                    try:
                        hwnd = int(window.native.Handle.ToInt64())
                    except Exception:
                        try:
                            hwnd = int(window.native.Handle)
                        except Exception:
                            pass
                if not hwnd:
                    user32 = ctypes.windll.user32
                    user32.FindWindowW.restype = ctypes.c_void_p
                    hwnd = AppAPI._find_window_hwnd("AI Desktop Workstation Cockpit")
                    if not hwnd:
                        hwnd = AppAPI._find_window_hwnd("AI Desktop Assistant")
                if hwnd:
                    api.register_main_hwnd(hwnd)
                    float_api.register_main_hwnd(hwnd)
                    print(f"[Info] Registered main window HWND: {hwnd}")
            except Exception as e:
                print("Failed to register main hwnd:", e)
        
        # 强刷一次主窗口的置顶状态，防止 WebView2 启动竞态丢失置顶
        config = load_all_configs()
        if config.get("main_window_on_top", False):
            api.set_main_on_top_api(True)
        else:
            api.set_main_on_top_api(False)
            
        # 主窗口 shown 之后，如果配置了启动自动弹出悬浮窗，就拉起它
        if config.get("floating_dialogue_enabled", False) and config.get("show_float_on_startup", False):
            # Float is created hidden; poll for its HWND then show it
            def _show_float_startup():
                import time as _time
                for _ in range(30):
                    hwnd_f = AppAPI._float_hwnd
                    if not hwnd_f:
                        hwnd_f = AppAPI._find_window_hwnd("AI Float Dialogue")
                    if hwnd_f:
                        api.register_float_hwnd(hwnd_f)
                        float_api.register_float_hwnd(hwnd_f)
                        if sys.platform == "win32":
                            user32 = ctypes.windll.user32
                            user32.ShowWindow(hwnd_f, 5)  # SW_SHOW
                            user32.SetWindowPos(hwnd_f, -1, float_x, float_y, float_width, float_height, 0x0010)
                        try:
                            float_window.evaluate_js("window.resetFloatDialogue()")
                        except Exception:
                            pass
                        print(f"[Info] Float window shown at ({float_x}, {float_y})")
                        return
                    _time.sleep(0.1)
                print("[Warn] Float window HWND not found after retries")
            threading.Thread(target=_show_float_startup, daemon=True).start()
        else:
            # Register float HWND in background (window is created hidden)
            def _register_float_hwnd():
                import time as _time
                for _ in range(30):
                    hwnd_f = AppAPI._find_window_hwnd("AI Float Dialogue")
                    if hwnd_f:
                        api.register_float_hwnd(hwnd_f)
                        float_api.register_float_hwnd(hwnd_f)
                        print(f"[Info] Float HWND registered: {hwnd_f}")
                        return
                    _time.sleep(0.1)
                print("[Warn] Float window HWND not found")
            threading.Thread(target=_register_float_hwnd, daemon=True).start()
        api._main_window_visible = True
        float_api._main_window_visible = True

        # 新增：如果配置开启了开机自启动，每次启动时都刷新同步一下注册表中的绝对路径，防止搬移目录失效
        if config.get("autostart", "disabled") == "enabled" and sys.platform == "win32":
            def async_sync_autostart():
                import time
                time.sleep(1.5)
                try:
                    api.set_autostart_enabled(True)
                    print("[Info] Automatically synced autostart path in registry.")
                except Exception as ex:
                    print("[Warn] Failed to automatically sync autostart:", ex)
            threading.Thread(target=async_sync_autostart, daemon=True).start()

    window.events.shown += on_shown

    # 启动托盘图标守护
    setup_tray_icon(api)

    # 强制启用 Windows 平台下的微软 WebView2 内核
    try:
        webview.start(gui='edgechromium')
    except Exception as e:
        print("启动 EdgeChromium 内核失败，正在尝试默认模式启动...")
        webview.start()

    # 强制退出当前进程以自动结束终端
    os._exit(0)
