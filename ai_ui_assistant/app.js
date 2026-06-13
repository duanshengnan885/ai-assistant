// ui/app.js
window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = `JS Error: ${message} at ${source}:${lineno}:${colno}\nStack: ${error ? error.stack : ''}`;
    console.error(errorMsg);
    alert("⚠️ 系统检测到前端脚本运行异常，详细信息已实时传送至Python终端：\n\n" + errorMsg);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.log_js_error) {
        window.pywebview.api.log_js_error(errorMsg);
    }
    return false;
};

window.chatHistory = []; window.isGenerating = false; window.modelList = []; window.presets = []; window.providers = {}; window.sessions = []; window.activeSessionId = "session_default"; window.modelLockMode = "free"; window.powershellMode = "normal"; window.attachedFile = null; window.fontSize = 13.5; window.deepThinkingEnabled = false; window.drawingEnabled = false; window.activeAssistantMsgElement = null; window.activeReasoningText = ""; window.activeContentText = "";
window.clipboardHistory = []; // 【新增】：前端剪贴板历史池

window.addEventListener('pywebviewready', function () {
    try {
        window.pywebview.api.get_window_mode().then(function(mode) {
            window.windowMode = mode;
            if (mode === 'float') {
                document.title = "AI Float Dialogue";
                document.body.classList.add('float-mode');
                initFloatMode();
            } else {
                document.title = "AI Desktop Workstation Cockpit";
                window.pywebview.api.get_config().then(function (config) {
            try {
                document.getElementById('config-provider').value = config.provider;
                document.getElementById('config-prompt').value = config.system_prompt;
                window.modelLockMode = config.model_lock_mode || "free";
                document.getElementById('config-model-lock').value = window.modelLockMode;
                window.powershellMode = config.powershell_mode || "normal";
                document.getElementById('config-powershell-mode').value = window.powershellMode;
                window.fontSize = config.font_size || 13.5;
                document.getElementById('config-font-size').value = window.fontSize;
                updateGlobalFontSize(window.fontSize);

                window.deepThinkingEnabled = config.deep_thinking_enabled || false;
                const thinkingBtn = document.getElementById('btn-deep-thinking');
                if (window.deepThinkingEnabled) { thinkingBtn.classList.add('active'); } else { thinkingBtn.classList.remove('active'); }

                window.webSearchEnabled = config.web_search_enabled || false;
                const searchBtn = document.getElementById('btn-web-search');
                if (window.webSearchEnabled) { searchBtn.classList.add('active'); } else { searchBtn.classList.remove('active'); }

                const activeTheme = config.theme || "dark";
                document.getElementById('config-theme').value = activeTheme;
                if (activeTheme === 'system') {
                    applySystemTheme();
                } else {
                    document.body.setAttribute('data-theme', activeTheme);
                }

                const activeLang = config.lang || "zh";
                document.getElementById('config-lang').value = activeLang;
                applyLanguage(activeLang);

                const activeCloseAction = config.close_action || "ask";
                document.getElementById('config-close-action').value = activeCloseAction;

                const floatEnabled = config.floating_dialogue_enabled !== undefined ? config.floating_dialogue_enabled : false;
                const floatEnabledEl = document.getElementById('config-floating-dialogue-enabled');
                if (floatEnabledEl) floatEnabledEl.value = floatEnabled ? "true" : "false";

                const autoHideHistory = config.auto_hide_history_dialogue !== undefined ? config.auto_hide_history_dialogue : true;
                const autoHideEl = document.getElementById('config-auto-hide-history-dialogue');
                if (autoHideEl) autoHideEl.value = autoHideHistory ? "true" : "false";

                const showFloatStartup = config.show_float_on_startup !== undefined ? config.show_float_on_startup : false;
                const showFloatStartupEl = document.getElementById('config-show-float-on-startup');
                if (showFloatStartupEl) showFloatStartupEl.value = showFloatStartup ? "true" : "false";

                const floatOnTop = config.floating_dialogue_on_top !== undefined ? config.floating_dialogue_on_top : true;
                const floatOnTopEl = document.getElementById('config-floating-dialogue-on-top');
                if (floatOnTopEl) floatOnTopEl.value = floatOnTop ? "true" : "false";

                const floatHeight = config.floating_dialogue_height || 450;
                const floatHeightEl = document.getElementById('config-floating-dialogue-height');
                if (floatHeightEl) floatHeightEl.value = String(floatHeight);
                const floatHeightVal = document.getElementById('float-height-val');
                if (floatHeightVal) floatHeightVal.textContent = floatHeight + 'px';

                const floatWidth = config.floating_dialogue_width || 380;
                const floatWidthEl = document.getElementById('config-floating-dialogue-width');
                if (floatWidthEl) floatWidthEl.value = String(floatWidth);
                const floatWidthVal = document.getElementById('float-width-val');
                if (floatWidthVal) floatWidthVal.textContent = floatWidth + 'px';

                // 【新增】：通用设置项加载
                const activeZoom = config.zoom_level || "100%";
                const zoomEl = document.getElementById('config-zoom-level');
                if (zoomEl) { zoomEl.value = activeZoom; }
                document.body.style.zoom = activeZoom;

                const activeAutostart = config.autostart || "disabled";
                const autostartEl = document.getElementById('config-autostart');
                if (autostartEl) autostartEl.value = activeAutostart;

                const activeTerminal = config.default_terminal || "system";
                const terminalEl = document.getElementById('config-default-terminal');
                if (terminalEl) terminalEl.value = activeTerminal;

                const mainOnTop = config.main_window_on_top !== undefined ? config.main_window_on_top : false;
                const mainOnTopEl = document.getElementById('config-main-window-on-top');
                if (mainOnTopEl) mainOnTopEl.value = mainOnTop ? "true" : "false";

                const autoUpdateEl = document.getElementById('config-auto-update');
                if (autoUpdateEl) autoUpdateEl.value = config.auto_update || "disabled";
                const updateNotifyEl = document.getElementById('config-update-notify');
                if (updateNotifyEl) updateNotifyEl.value = config.update_notify || "enabled";
                const showFloatEl = document.getElementById('config-show-float-card');
                if (showFloatEl) showFloatEl.value = config.show_float_card || "disabled";
                const floatTopEl = document.getElementById('config-float-card-top');
                if (floatTopEl) floatTopEl.value = config.float_card_top || "disabled";

                // 【新增】：加载并填充新功能 30-44 的配置字段到 UI 中
                const fieldMappings = {
                    'config-quota-refresh-interval': config.quota_refresh_interval || '10',
                    'config-active-account-refresh': config.active_account_refresh || 'disabled',
                    'config-quota-threshold': config.quota_threshold || '10',
                    'config-credits-threshold': config.credits_threshold || '5',
                    'config-auto-switch-account': config.auto_switch_account || 'disabled',
                    'config-credits-toast': config.credits_toast || 'enabled',
                    'config-refresh-free': config.refresh_free || '60',
                    'config-refresh-pro': config.refresh_pro || '10',
                    'config-main-app-path': config.main_app_path || '',
                    'config-link-codex': config.link_codex || 'disabled',
                    'config-link-opencode': config.link_opencode || 'disabled',
                    'config-link-vscode': config.link_vscode || 'disabled',
                    'config-link-cursor': config.link_cursor || 'disabled',
                    'config-custom-linked-app': config.custom_linked_app || '',
                    'config-switch-scope': config.switch_scope || 'all',
                    'config-api-entry-visible': config.api_entry_visible || 'visible',
                    'config-overwrite-opencode': config.overwrite_opencode || 'disabled',
                    'config-overwrite-openclaw': config.overwrite_openclaw || 'disabled',
                    'config-restart-opencode': config.restart_opencode || 'disabled',
                    'config-zed-quota-refresh': config.zed_quota_refresh || '10',
                    'config-zed-quota-notify': config.zed_quota_notify || 'enabled',
                    'config-zed-win-path': config.zed_win_path || '',
                    'config-zed-wsl-path': config.zed_wsl_path || '',
                    'config-link-zed': config.link_zed || 'disabled',
                    'config-voice-response': config.voice_response_enabled || 'disabled',
                    'config-voice-rate': config.voice_rate !== undefined ? config.voice_rate : '1.0',
                    'config-tts-type': config.tts_type || 'system',
                    'config-tts-api-url': config.tts_api_url || ''
                };
                window.savedVoiceName = config.voice_name || 'default';
                for (const [id, val] of Object.entries(fieldMappings)) {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                }

                // Initial panel visibility based on tts_type and update rate slider text
                const initialTtsType = config.tts_type || 'system';
                const sysEl = document.getElementById('tts-system-settings');
                const custEl = document.getElementById('tts-custom-settings');
                if (sysEl) sysEl.style.display = (initialTtsType === 'system') ? 'block' : 'none';
                if (custEl) custEl.style.display = (initialTtsType === 'custom_api') ? 'block' : 'none';

                const initialVoiceRate = config.voice_rate !== undefined ? config.voice_rate : 1.0;
                const rateValSpan = document.getElementById('voice-rate-val');
                if (rateValSpan) rateValSpan.textContent = initialVoiceRate + 'x';

                window.customScripts = config.custom_scripts || [];
                setTimeout(renderCustomScripts, 100);

                window.providers = config.providers || {
                    deepseek: { api_base: "https://api.deepseek.com/v1", api_key: "" },
                    kimi: { api_base: "https://api.moonshot.cn/v1", api_key: "" },
                    local: { api_base: "http://localhost:11434/v1", api_key: "ollama" },
                    custom: { api_base: "", api_key: "" }
                };

                const defaultProviders = {
                    deepseek: { api_base: "https://api.deepseek.com/v1", api_key: "" },
                    kimi: { api_base: "https://api.moonshot.cn/v1", api_key: "" },
                    local: { api_base: "http://localhost:11434/v1", api_key: "ollama" },
                    custom: { api_base: "", api_key: "" }
                };
                for (let key in defaultProviders) {
                    if (!window.providers[key]) {
                        window.providers[key] = defaultProviders[key];
                    }
                }

                const activeProv = config.provider || "deepseek";
                const provCfg = window.providers[activeProv] || { api_base: "", api_key: "" };
                document.getElementById('config-api-base').value = provCfg.api_base || "";
                document.getElementById('config-api-key').value = provCfg.api_key || "";
                const credCard = document.getElementById('credentials-card');
                if (credCard) {
                    credCard.style.display = (activeProv === 'local') ? 'none' : 'block';
                }
                document.getElementById('config-temp').value = config.temperature || 0.7;
                document.getElementById('config-tokens').value = config.max_tokens || 2048;
                updateSliderLabels();

                window.modelList = config.models || [];
                renderModelList();
                window.presets = config.presets || [];
                renderPresets();

                window.sessions = config.sessions || [{ "id": "session_default", "title": "默认会话", "history": [], "bound_provider": "deepseek", "bound_model": "deepseek-chat" }];
                window.activeSessionId = config.active_session_id || "session_default";

                populateModelDropdown(config.active_model || config.model || "deepseek-chat");
                renderSessionList();
                loadSessionChatHistory();
                updateStatusBar();
                bindEventListeners();

                // 启动后台定时系统状态监测
                updateSystemStatsInPopover();
                setInterval(updateSystemStatsInPopover, 3500);

                // 【修改】：安全延迟启动剪贴板历史监测线程，并读取历史
                window.pywebview.api.start_clipboard_monitor().then(function () {
                    window.pywebview.api.get_clipboard_history().then(function (history) {
                        window.clipboardHistory = history || [];
                        renderClipboardList();
                    });
                });
            } catch (innerErr) {
                alert("JS初始化配置解析故障: " + innerErr.stack);
                if (window.pywebview && window.pywebview.api && window.pywebview.api.log_js_error) {
                    window.pywebview.api.log_js_error("JS Config Parsing Error: " + innerErr.stack);
                }
            }
        });
            }
        });
    } catch (err) {
        alert("pywebviewready监听致命故障: " + err.stack);
    }
});

function bindEventListeners() {
    document.getElementById('msg-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    const settingsInputs = ['config-api-base', 'config-api-key', 'config-prompt'];
    settingsInputs.forEach(id => {
        document.getElementById(id).addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); saveSettings(); }
        });
    });

    document.getElementById('config-api-key').addEventListener('input', function () {
        const provider = document.getElementById('config-provider').value;
        if (!window.providers[provider]) window.providers[provider] = { api_base: "", api_key: "" };
        window.providers[provider].api_key = this.value;
    });
    document.getElementById('config-api-key').addEventListener('change', saveSettingsSilent);
    document.getElementById('config-api-key').addEventListener('blur', saveSettingsSilent);

    document.getElementById('config-api-base').addEventListener('input', function () {
        const provider = document.getElementById('config-provider').value;
        if (!window.providers[provider]) window.providers[provider] = { api_base: "", api_key: "" };
        window.providers[provider].api_base = this.value;
    });
    document.getElementById('config-api-base').addEventListener('change', saveSettingsSilent);
    document.getElementById('config-api-base').addEventListener('blur', saveSettingsSilent);

    document.getElementById('config-provider').addEventListener('change', onProviderChange);
    document.getElementById('config-active-model').addEventListener('change', onActiveModelChange);
    document.getElementById('config-model-lock').addEventListener('change', onModelLockModeChange);
    document.getElementById('config-powershell-mode').addEventListener('change', onPowershellModeChange);
    document.getElementById('config-font-size').addEventListener('change', onFontSizeChange);

    document.getElementById('config-temp').addEventListener('input', updateSliderLabels);
    document.getElementById('config-tokens').addEventListener('input', updateSliderLabels);

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('cancel-btn').addEventListener('click', cancelGeneration);
    document.getElementById('attach-btn').addEventListener('click', () => { document.getElementById('file-uploader').click(); });
    document.getElementById('file-uploader').addEventListener('change', handleLocalFileLoad);

    document.getElementById('dock-btn-chat').addEventListener('click', () => switchSandboxMode('chat'));
    document.getElementById('dock-btn-sandbox').addEventListener('click', () => switchSandboxMode('sandbox'));
    const dockBtnSort = document.getElementById('dock-btn-sort');
    if (dockBtnSort) {
        dockBtnSort.addEventListener('click', () => switchSandboxMode('sort'));
    }

    // 智能分拣控制事件绑定
    const btnSelectDir = document.getElementById('btn-sort-select-dir');
    if (btnSelectDir) btnSelectDir.addEventListener('click', window.sortSelectDirectory);
    const btnGenPlan = document.getElementById('btn-sort-generate-plan');
    if (btnGenPlan) btnGenPlan.addEventListener('click', window.sortGeneratePlan);
    const btnExecuteSort = document.getElementById('btn-sort-execute');
    if (btnExecuteSort) btnExecuteSort.addEventListener('click', window.sortExecutePlan);
    const inputDirPath = document.getElementById('sort-dir-path');
    if (inputDirPath) {
        inputDirPath.addEventListener('change', () => window.sortScanDirectory(inputDirPath.value));
        inputDirPath.addEventListener('blur', () => window.sortScanDirectory(inputDirPath.value));
    }

    document.getElementById('btn-add-session').addEventListener('click', createNewSession);
    document.getElementById('btn-export-sandbox').addEventListener('click', exportSandboxMarkdown);
    document.getElementById('btn-add-model').addEventListener('click', addNewModel);
    document.getElementById('btn-import-local-model').addEventListener('click', importLocalModel);
    document.getElementById('btn-import-drawing-models').addEventListener('click', importDrawingModels);
    document.getElementById('btn-refresh-drawing-models').addEventListener('click', function() { renderDrawingModelList(); });
    document.getElementById('btn-check-comfyui').addEventListener('click', checkComfyUIStatus);
    document.getElementById('btn-start-comfyui').addEventListener('click', startComfyUI);

    document.getElementById('sandbox-textarea').addEventListener('input', handleSandboxLiveInput);
    document.getElementById('dock-btn-export').addEventListener('click', exportChatLog);
    document.getElementById('btn-scan-ollama').addEventListener('click', runOllamaRadarScan);
    document.getElementById('btn-deep-thinking').addEventListener('click', toggleDeepThinkingMode);
    document.getElementById('btn-scan-online').addEventListener('click', runOnlineModelScan);
    document.getElementById('btn-web-search').addEventListener('click', toggleWebSearchMode);
    document.getElementById('btn-draw-image').addEventListener('click', triggerDrawing);
    document.getElementById('config-theme').addEventListener('change', onThemeChange);
    document.getElementById('config-lang').addEventListener('change', onLanguageChange);
    document.getElementById('config-close-action').addEventListener('change', onCloseActionChange);

    // 【新增】：通用设置组件事件绑定
    const zoomEl = document.getElementById('config-zoom-level');
    if (zoomEl) zoomEl.addEventListener('change', onZoomLevelChange);
    const autostartEl = document.getElementById('config-autostart');
    if (autostartEl) autostartEl.addEventListener('change', onAutostartChange);
    const terminalEl = document.getElementById('config-default-terminal');
    if (terminalEl) terminalEl.addEventListener('change', onDefaultTerminalChange);
    const openDirBtn = document.getElementById('btn-open-data-dir');
    if (openDirBtn) openDirBtn.addEventListener('click', openDataDirectory);
    const autoUpdateEl = document.getElementById('config-auto-update');
    if (autoUpdateEl) autoUpdateEl.addEventListener('change', saveSettingsSilent);
    const updateNotifyEl = document.getElementById('config-update-notify');
    if (updateNotifyEl) updateNotifyEl.addEventListener('change', saveSettingsSilent);
    const showFloatEl = document.getElementById('config-show-float-card');
    if (showFloatEl) showFloatEl.addEventListener('change', saveSettingsSilent);
    const floatTopEl = document.getElementById('config-float-card-top');
    if (floatTopEl) floatTopEl.addEventListener('change', saveSettingsSilent);
    const checkUpdateBtn = document.getElementById('btn-check-update');
    if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', checkForUpdates);

    // 【新增】：保存配置按鈕
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);

    // 【新增】：功能 30-39 事件绑定
    const quotaRefreshBtn = document.getElementById('btn-refresh-quota-now');
    if (quotaRefreshBtn) quotaRefreshBtn.addEventListener('click', refreshQuotaNow);
    const testToastBtn = document.getElementById('btn-test-toast');
    if (testToastBtn) testToastBtn.addEventListener('click', testWindowsToast);
    const manualSwitchBtn = document.getElementById('btn-trigger-manual-switch');
    if (manualSwitchBtn) manualSwitchBtn.addEventListener('click', triggerManualSwitch);
    const browsePathBtn = document.getElementById('btn-browse-app-path');
    if (browsePathBtn) browsePathBtn.addEventListener('click', browseAppPath);
    const resetPathBtn = document.getElementById('btn-reset-app-path');
    if (resetPathBtn) resetPathBtn.addEventListener('click', resetAppPath);
    // 自动保存的新控件
    ['config-quota-refresh-interval','config-active-account-refresh','config-auto-switch-account',
     'config-credits-toast','config-refresh-free','config-refresh-pro','config-link-codex',
     'config-link-opencode','config-link-vscode','config-link-cursor','config-switch-scope',
     'config-api-entry-visible', 'config-floating-dialogue-enabled', 'config-auto-hide-history-dialogue',
     'config-show-float-on-startup', 'config-floating-dialogue-on-top', 'config-main-window-on-top'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveSettingsSilent);
    });

    // 悬浮窗高度和宽度滑块的实时事件绑定
    const floatHeightSlider = document.getElementById('config-floating-dialogue-height');
    if (floatHeightSlider) {
        floatHeightSlider.addEventListener('input', function() {
            const valSpan = document.getElementById('float-height-val');
            if (valSpan) valSpan.textContent = this.value + 'px';
            
            const w = document.getElementById('config-floating-dialogue-width').value;
            if (window.pywebview && window.pywebview.api && window.pywebview.api.resize_float_window_dynamic) {
                window.pywebview.api.resize_float_window_dynamic(w, this.value);
            }
        });
        floatHeightSlider.addEventListener('change', saveSettingsSilent);
    }

    const floatWidthSlider = document.getElementById('config-floating-dialogue-width');
    if (floatWidthSlider) {
        floatWidthSlider.addEventListener('input', function() {
            const valSpan = document.getElementById('float-width-val');
            if (valSpan) valSpan.textContent = this.value + 'px';
            
            const h = document.getElementById('config-floating-dialogue-height').value;
            if (window.pywebview && window.pywebview.api && window.pywebview.api.resize_float_window_dynamic) {
                window.pywebview.api.resize_float_window_dynamic(this.value, h);
            }
        });
        floatWidthSlider.addEventListener('change', saveSettingsSilent);
    }

    const floatEnabledEl = document.getElementById('config-floating-dialogue-enabled');
    if (floatEnabledEl) {
        floatEnabledEl.addEventListener('change', function() {
            const enabled = this.value === 'true';
            if (window.pywebview && window.pywebview.api) {
                if (enabled) {
                    window.pywebview.api.show_float_window();
                } else {
                    window.pywebview.api.hide_float_window();
                }
            }
        });
    }

    const floatOnTopEl = document.getElementById('config-floating-dialogue-on-top');
    if (floatOnTopEl) {
        floatOnTopEl.addEventListener('change', function() {
            const onTop = this.value === 'true';
            if (window.pywebview && window.pywebview.api && window.pywebview.api.set_float_on_top_api) {
                window.pywebview.api.set_float_on_top_api(onTop);
            }
        });
    }

    const mainOnTopEl = document.getElementById('config-main-window-on-top');
    if (mainOnTopEl) {
        mainOnTopEl.addEventListener('change', function() {
            const onTop = this.value === 'true';
            if (window.pywebview && window.pywebview.api && window.pywebview.api.set_main_on_top_api) {
                window.pywebview.api.set_main_on_top_api(onTop);
            }
        });
    }
    const mainAppPathEl = document.getElementById('config-main-app-path');
    if (mainAppPathEl) mainAppPathEl.addEventListener('blur', saveSettingsSilent);
    const customLinkedAppEl = document.getElementById('config-custom-linked-app');
    if (customLinkedAppEl) customLinkedAppEl.addEventListener('blur', saveSettingsSilent);
    const quotaThreshEl = document.getElementById('config-quota-threshold');
    if (quotaThreshEl) quotaThreshEl.addEventListener('change', saveSettingsSilent);
    const creditsThreshEl = document.getElementById('config-credits-threshold');
    if (creditsThreshEl) creditsThreshEl.addEventListener('change', saveSettingsSilent);

    // 【新增】：功能 40-44 事件绑定
    const testOverwriteBtn = document.getElementById('btn-test-session-overwrite');
    if (testOverwriteBtn) testOverwriteBtn.addEventListener('click', testSessionOverwrite);
    const refreshZedBtn = document.getElementById('btn-refresh-zed-quota');
    if (refreshZedBtn) refreshZedBtn.addEventListener('click', refreshZedQuota);
    const browseZedWinBtn = document.getElementById('btn-browse-zed-win');
    if (browseZedWinBtn) browseZedWinBtn.addEventListener('click', function() { browseZedPath('win'); });
    const browseZedWslBtn = document.getElementById('btn-browse-zed-wsl');
    if (browseZedWslBtn) browseZedWslBtn.addEventListener('click', function() { browseZedPath('wsl'); });
    const resetZedBtn = document.getElementById('btn-reset-zed-paths');
    if (resetZedBtn) resetZedBtn.addEventListener('click', resetZedPaths);
    ['config-overwrite-opencode','config-overwrite-openclaw','config-restart-opencode',
     'config-zed-quota-refresh','config-zed-quota-notify','config-link-zed'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveSettingsSilent);
    });
    ['config-zed-win-path','config-zed-wsl-path'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('blur', saveSettingsSilent);
    });

    // 【新增】：阶段三（5 大功能）事件绑定
    const spotlightInput = document.getElementById('spotlight-input');
    if (spotlightInput) {
        spotlightInput.addEventListener('input', function(e) {
            renderSpotlightResults(e.target.value);
        });
        spotlightInput.addEventListener('keydown', handleSpotlightKeydown);
    }
    const voiceMicBtn = document.getElementById('voice-mic-btn');
    if (voiceMicBtn) voiceMicBtn.addEventListener('click', toggleVoiceRecognition);
    const registerScriptBtn = document.getElementById('btn-register-script');
    if (registerScriptBtn) registerScriptBtn.addEventListener('click', registerCustomScript);
    const injectCodeBtn = document.getElementById('btn-inject-code');
    if (injectCodeBtn) injectCodeBtn.addEventListener('click', injectCodeToEditor);
    const sandboxModeEdit = document.getElementById('btn-sandbox-mode-edit');
    if (sandboxModeEdit) sandboxModeEdit.addEventListener('click', function() { setSandboxMode('edit'); });
    const sandboxModeDiff = document.getElementById('btn-sandbox-mode-diff');
    if (sandboxModeDiff) sandboxModeDiff.addEventListener('click', function() { setSandboxMode('diff'); });
    const sandboxAcceptDiff = document.getElementById('btn-sandbox-accept-diff');
    if (sandboxAcceptDiff) sandboxAcceptDiff.addEventListener('click', acceptDiffChange);
    const sandboxRejectDiff = document.getElementById('btn-sandbox-reject-diff');
    if (sandboxRejectDiff) sandboxRejectDiff.addEventListener('click', rejectDiffChange);

    const voiceResponseEl = document.getElementById('config-voice-response');
    if (voiceResponseEl) voiceResponseEl.addEventListener('change', saveSettingsSilent);
    const voiceNameEl = document.getElementById('config-voice-name');
    if (voiceNameEl) voiceNameEl.addEventListener('change', saveSettingsSilent);

    // Bindings for Phase 5 Speech controls
    const ttsTypeEl = document.getElementById('config-tts-type');
    if (ttsTypeEl) {
        ttsTypeEl.addEventListener('change', function() {
            const val = this.value;
            const sysEl = document.getElementById('tts-system-settings');
            const custEl = document.getElementById('tts-custom-settings');
            if (sysEl) sysEl.style.display = (val === 'system') ? 'block' : 'none';
            if (custEl) custEl.style.display = (val === 'custom_api') ? 'block' : 'none';
            saveSettingsSilent();
        });
    }

    const voiceRateEl = document.getElementById('config-voice-rate');
    if (voiceRateEl) {
        voiceRateEl.addEventListener('input', function() {
            const valSpan = document.getElementById('voice-rate-val');
            if (valSpan) valSpan.textContent = this.value + 'x';
        });
        voiceRateEl.addEventListener('change', saveSettingsSilent);
    }

    const ttsApiUrlEl = document.getElementById('config-tts-api-url');
    if (ttsApiUrlEl) {
        ttsApiUrlEl.addEventListener('change', saveSettingsSilent);
        ttsApiUrlEl.addEventListener('blur', saveSettingsSilent);
    }

    document.getElementById('dash-overlay').addEventListener('click', closeAllDrawers);
    document.getElementById('dock-btn-sessions').addEventListener('click', toggleSessionsDrawer);
    document.getElementById('dock-btn-settings').addEventListener('click', toggleDashboard);
    document.getElementById('dock-status-orb').addEventListener('click', toggleStatusPopover);
}

window.syncFloatingDialogueEnabledUI = function(enabled) {
    const el = document.getElementById('config-floating-dialogue-enabled');
    if (el) {
        el.value = String(enabled);
    }
};

window.syncFloatSizeUI = function(width, height) {
    const heightEl = document.getElementById('config-floating-dialogue-height');
    const widthEl = document.getElementById('config-floating-dialogue-width');
    const heightVal = document.getElementById('float-height-val');
    const widthVal = document.getElementById('float-width-val');
    
    if (heightEl) heightEl.value = String(height);
    if (widthEl) widthEl.value = String(width);
    if (heightVal) heightVal.textContent = height + 'px';
    if (widthVal) widthVal.textContent = width + 'px';
};

window.reloadConfigUI = function() {
    if (window.windowMode === 'float') return;
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config) {
        window.pywebview.api.get_config().then(function (config) {
            const floatEnabled = config.floating_dialogue_enabled !== undefined ? config.floating_dialogue_enabled : false;
            const floatEnabledEl = document.getElementById('config-floating-dialogue-enabled');
            if (floatEnabledEl) floatEnabledEl.value = floatEnabled ? "true" : "false";

            const autoHideHistory = config.auto_hide_history_dialogue !== undefined ? config.auto_hide_history_dialogue : true;
            const autoHideEl = document.getElementById('config-auto-hide-history-dialogue');
            if (autoHideEl) autoHideEl.value = autoHideHistory ? "true" : "false";

            const showFloatStartup = config.show_float_on_startup !== undefined ? config.show_float_on_startup : false;
            const showFloatStartupEl = document.getElementById('config-show-float-on-startup');
            if (showFloatStartupEl) showFloatStartupEl.value = showFloatStartup ? "true" : "false";

            const floatOnTop = config.floating_dialogue_on_top !== undefined ? config.floating_dialogue_on_top : true;
            const floatOnTopEl = document.getElementById('config-floating-dialogue-on-top');
            if (floatOnTopEl) floatOnTopEl.value = floatOnTop ? "true" : "false";

            const mainOnTop = config.main_window_on_top !== undefined ? config.main_window_on_top : false;
            const mainOnTopEl = document.getElementById('config-main-window-on-top');
            if (mainOnTopEl) mainOnTopEl.value = mainOnTop ? "true" : "false";

            const floatHeight = config.floating_dialogue_height || 450;
            const floatHeightEl = document.getElementById('config-floating-dialogue-height');
            if (floatHeightEl) floatHeightEl.value = String(floatHeight);
            const floatHeightVal = document.getElementById('float-height-val');
            if (floatHeightVal) floatHeightVal.textContent = floatHeight + 'px';

            const floatWidth = config.floating_dialogue_width || 380;
            const floatWidthEl = document.getElementById('config-floating-dialogue-width');
            if (floatWidthEl) floatWidthEl.value = String(floatWidth);
            const floatWidthVal = document.getElementById('float-width-val');
            if (floatWidthVal) floatWidthVal.textContent = floatWidth + 'px';

            const activeAutostart = config.autostart || "disabled";
            const autostartEl = document.getElementById('config-autostart');
            if (autostartEl) autostartEl.value = activeAutostart;
        });
    }
};

// 【新增】：Python 后端监听线程在发现新剪贴板时的回调桥接函数
window.onClipboardUpdated = function (newText) {
    if (!window.clipboardHistory.includes(newText)) {
        window.clipboardHistory.unshift(newText);
        if (window.clipboardHistory.length > 15) {
            window.clipboardHistory.pop();
        }
        renderClipboardList();
    }
};

// 【新增】：渲染系统物理剪贴板卡片列表
function renderClipboardList() {
    const container = document.getElementById('clipboard-list-container');
    if (!container) return;
    container.innerHTML = "";
    if (window.clipboardHistory.length === 0) {
        container.innerHTML = `<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">剪贴板暂无历史记录</div>`;
        return;
    }
    window.clipboardHistory.forEach(text => {
        const card = document.createElement('div');
        card.className = "clip-card";
        card.title = "点击可快速装载进输入框并聚焦";
        card.onclick = () => {
            const input = document.getElementById('msg-input');
            input.value = text;
            input.focus();
        };
        card.innerHTML = `📋 <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${escapeHTML(text)}</span>`;
        container.appendChild(card);
    });
}

function toggleDeepThinkingMode() {
    if (window.isGenerating) return;
    const btn = document.getElementById('btn-deep-thinking');
    window.deepThinkingEnabled = !window.deepThinkingEnabled;
    if (window.deepThinkingEnabled) { btn.classList.add('active'); } else { btn.classList.remove('active'); }
    saveSettingsSilent();
}

function onFontSizeChange() {
    const size = parseInt(document.getElementById('config-font-size').value);
    window.fontSize = size;
    updateGlobalFontSize(size);
    saveSettingsSilent();
}

function updateGlobalFontSize(size) {
    document.body.style.setProperty('--chat-font-size', `${size + 0.5}px`);
}

function renderModelList() {
    const container = document.getElementById('model-list-container');
    if (!container) return;
    container.innerHTML = "";
    const models = window.modelList.filter(m => m.type !== 'drawing');
    models.forEach((m, idx) => {
        const realIdx = window.modelList.indexOf(m);
        const card = document.createElement('div');
        card.className = "model-card";
        let dotClass = "dot-chat", leftBorderColor = "#60a5fa";
        if (m.type === 'reasoning') { dotClass = "dot-reasoning"; leftBorderColor = "#34d399"; }
        else if (m.type === 'reasoning_tag') { dotClass = "dot-tag"; leftBorderColor = "#fbbf24"; }
        card.style.borderLeftColor = leftBorderColor;
        card.innerHTML = '<div class="model-card-info"><div class="model-card-header"><span class="status-dot ' + dotClass + '"></span><span class="model-card-name" title="' + escapeHTML(m.name) + '">' + (m.name.length > 40 ? escapeHTML(m.name.substring(0, 40)) + '...' : escapeHTML(m.name)) + '</span><span class="model-card-badge">' + escapeHTML(m.context) + '</span></div><div class="model-card-id" title="' + escapeHTML(m.id) + '">' + (m.id.length > 60 ? escapeHTML(m.id.substring(0, 60)) + '...' : escapeHTML(m.id)) + '</div></div><button onclick="deleteModel(' + realIdx + ')" class="btn-delete" title="删除模型">🗑️</button>';
        container.appendChild(card);
    });
    renderDrawingModelList();
}

function renderDrawingModelList() {
    const container = document.getElementById('drawing-model-list-container');
    if (!container) return;
    container.innerHTML = "";
    const models = window.modelList.filter(m => m.type === 'drawing');
    if (models.length === 0) {
        container.innerHTML = '<div style="color:#64748b;font-size:11px;text-align:center;padding:12px;">暂无画图模型，点击下方按钮导入</div>';
        return;
    }
    models.forEach((m) => {
        const realIdx = window.modelList.indexOf(m);
        const card = document.createElement('div');
        card.className = "model-card";
        card.style.borderLeftColor = "#ec4899";
        card.innerHTML = '<div class="model-card-info"><div class="model-card-header"><span class="status-dot dot-tag"></span><span class="model-card-name" title="' + escapeHTML(m.name) + '">' + (m.name.length > 40 ? escapeHTML(m.name.substring(0, 40)) + '...' : escapeHTML(m.name)) + '</span><span class="model-card-badge">' + escapeHTML(m.context) + '</span></div><div class="model-card-id" title="' + escapeHTML(m.id) + '">' + (m.id.length > 60 ? escapeHTML(m.id.substring(0, 60)) + '...' : escapeHTML(m.id)) + '</div></div><button onclick="deleteModel(' + realIdx + ')" class="btn-delete" title="删除模型">🗑️</button>';
        container.appendChild(card);
    });
}

function renderOtherModelsForActiveProvider() {
    const provider = document.getElementById('config-provider').value;
    const activeModelSelect = document.getElementById('config-active-model');
    const activeModelId = activeModelSelect ? activeModelSelect.value : null;
    const container = document.getElementById('other-models-container');
    const group = document.getElementById('other-models-group');
    if (!container || !group) return;

    if (!activeModelId) {
        group.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const otherModels = window.modelList.filter(m => m.provider === provider && m.id !== activeModelId);
    if (otherModels.length > 0) {
        group.style.display = 'block';
        container.innerHTML = '';
        otherModels.forEach(m => {
            const chip = document.createElement('div');
            chip.className = 'model-tag-chip';
            
            let typeIcon = "💬";
            if (m.type === 'reasoning' || m.type === 'reasoning_tag') typeIcon = "🧠";
            if (m.type === 'drawing') typeIcon = "🎨";
            
            chip.innerHTML = `${typeIcon} ${escapeHTML(m.name)}`;
            chip.title = `点击一键切换为: ${m.name} (${m.context})`;
            chip.onclick = function() {
                document.getElementById('config-active-model').value = m.id;
                onActiveModelChange();
            };
            container.appendChild(chip);
        });
    } else {
        group.style.display = 'none';
        container.innerHTML = '';
    }
}

function populateModelDropdown(activeId) {
    const provider = document.getElementById('config-provider').value;
    const select = document.getElementById('config-active-model');
    select.innerHTML = "";
    const filtered = window.modelList.filter(m => m.provider === provider);
    filtered.forEach(m => {
        const opt = document.createElement('option'); opt.value = m.id; opt.textContent = `${m.name} (${m.context})`;
        if (m.id === activeId) { opt.selected = true; }
        select.appendChild(opt);
    });
    if (filtered.length > 0 && !filtered.some(m => m.id === activeId)) { select.selectedIndex = 0; }
    
    renderOtherModelsForActiveProvider();
}

function renderSessionList() {
    const container = document.getElementById('session-list-container');
    container.innerHTML = "";
    window.sessions.forEach(sess => {
        const item = document.createElement('div');
        item.className = `session-item ${sess.id === window.activeSessionId ? 'active' : ''}`;
        item.onclick = () => switchSession(sess.id);
        item.innerHTML = `
            <div class="session-info"><span>💬</span><span class="session-title-text">${escapeHTML(sess.title)}</span></div>
            <button onclick="event.stopPropagation(); deleteSession('${sess.id}')" class="btn-delete-session" title="删除会话">✕</button>
        `;
        container.appendChild(item);
    });
    updateSessionStatistics();
}

function updateSessionStatistics() {
    document.getElementById('stat-sessions-count').textContent = window.sessions.length;
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    let totalChars = 0;
    if (activeSession) {
        activeSession.history.forEach(m => { totalChars += (m.content || "").length; });
    }
    document.getElementById('stat-chars-count').textContent = totalChars + " 字";

    const activeModelId = document.getElementById('config-active-model').value;
    if (!activeModelId) { document.getElementById('context-text').textContent = "正在等待模型就绪..."; return; }
    const activeModel = window.modelList.find(m => m.id === activeModelId);
    if (!activeModel) { document.getElementById('context-text').textContent = "未检索到当前大模型限制参数"; return; }

    const progressEl = document.getElementById('context-progress');

    if (activeModel.type === 'drawing' || activeModel.id.toLowerCase().includes('drawing') || activeModel.id.toLowerCase().includes('cogview') || activeModel.id.toLowerCase().includes('dall-e')) {
        progressEl.style.width = "0%";
        progressEl.style.background = "#10b981";
        document.getElementById('context-text').textContent = "上下文评估载荷: 无限制 (绘图模式)";
        return;
    }

    const contextStr = String(activeModel.context || "").toUpperCase().trim();
    let maxTokens = 8192;
    const numPart = parseInt(contextStr);
    if (!isNaN(numPart)) {
        if (contextStr.endsWith("K")) {
            maxTokens = numPart * 1024;
        } else if (contextStr.endsWith("M")) {
            maxTokens = numPart * 1024 * 1024;
        } else {
            maxTokens = numPart;
        }
    }

    const estTokens = Math.round(totalChars / 1.5);
    let percent = Math.min(100, Math.round((estTokens / maxTokens) * 100));
    if (isNaN(percent)) percent = 0;

    progressEl.style.width = percent + "%";
    if (percent > 80) { progressEl.style.background = "#ef4444"; }
    else if (percent > 50) { progressEl.style.background = "#f59e0b"; }
    else { progressEl.style.background = "#10b981"; }
    document.getElementById('context-text').textContent = `上下文评估载荷: ${percent}% (${estTokens} / ${maxTokens} Tokens)`;
}

function switchSession(sessId) {
    if (window.isGenerating) { alert("请在生成结束后，再切换会话频道。"); return; }
    window.activeSessionId = sessId;
    renderSessionList();
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (activeSession && window.modelLockMode === "locked" && activeSession.bound_provider) {
        document.getElementById('config-provider').value = activeSession.bound_provider;
        const provCfg = window.providers[activeSession.bound_provider] || { api_base: "", api_key: "" };
        document.getElementById('config-api-base').value = provCfg.api_base;
        document.getElementById('config-api-key').value = provCfg.api_key;
        populateModelDropdown(activeSession.bound_model);
    }
    loadSessionChatHistory();
    saveSettingsSilent();
}

function loadSessionChatHistory() {
    if (window.stopSpeech) window.stopSpeech();
    const container = document.getElementById('chat-container'); container.innerHTML = "";
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (!activeSession) return;
    if (activeSession.history.length === 0) {
        container.innerHTML = `<div class="bubble-wrap"><div class="avatar ai">AI</div><div class="bubble-content">这是一个全新的独立会话窗口。请随时在下方提问。</div></div>`;
        return;
    }
    activeSession.history.forEach((msg, idx) => {
        if (msg.role === 'system' && msg.content.includes('<os_result>')) {
            const card = document.createElement('div');
            const resultText = msg.content.replace("<os_result>", "").replace("</os_result>", "").trim();
            if (resultText.includes("❌") || resultText.includes("错误") || resultText.includes("失败") || resultText.includes("⚠️")) {
                card.className = "os-agent-card error-card";
            } else { card.className = "os-agent-card success-card"; }
            card.textContent = resultText; container.appendChild(card); return;
        }
        const wrap = document.createElement('div'); wrap.className = `bubble-wrap ${msg.role === 'user' ? 'user' : ''}`;
        if (msg.role === 'user') {
            wrap.innerHTML = `<div class="avatar user">ME</div><div class="bubble-content">${escapeHTML(msg.content)}<div class="bubble-actions"><button onclick="loadToInput(this)" class="btn-bubble-action">✏️ 载入编辑</button><button onclick="deleteMessagePair(${idx})" class="btn-bubble-action btn-bubble-delete">🗑️ 删除对话</button></div></div>`;
        } else {
            let blockHtml = ""; let bodyText = msg.content;
            const thinkStartIdx = msg.content.indexOf('<think>');
            if (thinkStartIdx !== -1) {
                const thinkEndIdx = msg.content.indexOf('</think>');
                let reasoningText = "";
                if (thinkEndIdx !== -1) {
                    reasoningText = msg.content.substring(thinkStartIdx + 7, thinkEndIdx);
                    bodyText = msg.content.substring(0, thinkStartIdx) + msg.content.substring(thinkEndIdx + 8);
                    blockHtml = `<div id="active-reasoning-box"><details><summary>💡 已完成思考 (点击展开)</summary><div style="white-space: pre-wrap; font-family: monospace; font-size:11px;">${escapeHTML(reasoningText)}</div></details></div>`;
                }
            }
            var imageHtml = '';
            if (msg.image_url) {
                imageHtml = '<div style="margin-bottom:8px;"><img src="' + msg.image_url + '" style="max-width:100%;border-radius:12px;" onerror="this.style.display=\'none\'"></div>';
            }
            wrap.innerHTML = `<div class="avatar ai">AI</div><div class="bubble-content" style="width: 100%;">${imageHtml}${blockHtml}<div class="markdown-body">${parseMarkdownWithCopy(bodyText)}</div><div class="bubble-actions"><button onclick="copyBubbleText(this)" class="btn-bubble-action">📋 复制全文</button><button onclick="importToSandbox(${idx})" class="btn-bubble-action">📥 导入至沙盒</button><button onclick="importToSandboxDiff(${idx})" class="btn-bubble-action">💡 对比导入</button><button onclick="replayBubbleVoice(this)" class="btn-bubble-action btn-bubble-voice">🔊 听语音</button></div></div>`;
        }
        container.appendChild(wrap);
    });
    scrollToBottom(true);
}

function createNewSession() {
    let num = 1;
    let baseTitle = "新会话";
    let title = `${baseTitle} ${window.sessions.length + num}`;
    while (window.sessions.some(s => s.title === title)) {
        num++;
        title = `${baseTitle} ${window.sessions.length + num}`;
    }

    const newId = "sess_" + Date.now();
    const currentProvider = document.getElementById('config-provider').value;
    const currentModel = document.getElementById('config-active-model').value;
    window.sessions.push({ id: newId, title: title, history: [], bound_provider: currentProvider, bound_model: currentModel });
    window.activeSessionId = newId;

    renderSessionList();
    loadSessionChatHistory();
    saveSettingsSilent();

    // 新建后自动开启会话侧边抽屉，让用户一目了然
    const drawer = document.getElementById('session-drawer');
    if (drawer && !drawer.classList.contains('active')) {
        toggleSessionsDrawer();
    }
}

function deleteSession(sessId) {
    if (window.sessions.length <= 1) { alert("至少需要保留一个激活的会话窗口！"); return; }
    if (!confirm("确定要删除该会话吗？")) return;
    const idx = window.sessions.findIndex(s => s.id === sessId);
    window.sessions.splice(idx, 1);
    if (window.activeSessionId === sessId) { window.activeSessionId = window.sessions[0].id; }
    renderSessionList(); loadSessionChatHistory(); saveSettingsSilent();
}

function deleteMessagePair(userMsgIdx) {
    if (!confirm("确定要删除这条对话吗？（你的消息和 AI 的回复将一起被删除）")) return;
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (!activeSession) return;
    const history = activeSession.history;
    if (userMsgIdx < 0 || userMsgIdx >= history.length) return;
    if (history[userMsgIdx].role !== "user") return;
    let endIdx = userMsgIdx + 1;
    while (endIdx < history.length && history[endIdx].role !== "user") {
        endIdx++;
    }
    history.splice(userMsgIdx, endIdx - userMsgIdx);
    loadSessionChatHistory();
    saveSettingsSilent();
}

function copyBubbleText(btn) {
    const bubble = btn.closest('.bubble-content');
    const textNode = bubble.querySelector('.markdown-body');
    const text = textNode ? textNode.innerText : bubble.innerText;
    navigator.clipboard.writeText(text).then(function () {
        const origin = btn.textContent; btn.textContent = "✅ 已复制";
        setTimeout(() => { btn.textContent = origin; }, 1200);
    });
}

function loadToInput(btn) {
    const bubble = btn.closest('.bubble-content');
    const actions = bubble.querySelector('.bubble-actions');
    let text = bubble.innerText;
    if (actions) { text = text.replace(actions.innerText, "").trim(); }
    const input = document.getElementById('msg-input'); input.value = text; input.focus();
}

function switchSandboxMode(mode) {
    const chatBtn = document.getElementById('dock-btn-chat');
    const sandBtn = document.getElementById('dock-btn-sandbox');
    const sortBtn = document.getElementById('dock-btn-sort');
    
    const chatBox = document.getElementById('chat-container');
    const sandBox = document.getElementById('sandbox-container');
    const sortBox = document.getElementById('sort-container');
    
    if (chatBtn) chatBtn.classList.remove('active-green', 'active-red', 'active-purple');
    if (sandBtn) sandBtn.classList.remove('active-green', 'active-red', 'active-purple');
    if (sortBtn) sortBtn.classList.remove('active-green', 'active-red', 'active-purple');
    
    if (chatBox) chatBox.style.display = 'none';
    if (sandBox) sandBox.style.display = 'none';
    if (sortBox) sortBox.style.display = 'none';
    
    if (mode === 'chat') {
        if (chatBtn) chatBtn.classList.add('active-green');
        if (sandBtn) sandBtn.classList.add('active-red');
        if (sortBtn) sortBtn.classList.add('active-purple');
        if (chatBox) chatBox.style.display = 'flex';
    } else if (mode === 'sandbox') {
        if (chatBtn) chatBtn.classList.add('active-red');
        if (sandBtn) sandBtn.classList.add('active-green');
        if (sortBtn) sortBtn.classList.add('active-purple');
        if (sandBox) sandBox.style.display = 'flex';
        handleSandboxLiveInput();
    } else if (mode === 'sort') {
        if (chatBtn) chatBtn.classList.add('active-red');
        if (sandBtn) sandBtn.classList.add('active-purple');
        if (sortBtn) sortBtn.classList.add('active-green');
        if (sortBox) sortBox.style.display = 'flex';
    }
}

function importToSandbox(msgIdx) {
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (!activeSession) return;
    const msg = activeSession.history[msgIdx];
    if (!msg) return;

    let cleanText = msg.content;
    const thinkStartIdx = msg.content.indexOf('<think>');
    const thinkEndIdx = msg.content.indexOf('</think>');
    if (thinkStartIdx !== -1 && thinkEndIdx !== -1) {
        cleanText = msg.content.substring(0, thinkStartIdx) + msg.content.substring(thinkEndIdx + 8);
    }
    const textarea = document.getElementById('sandbox-textarea');
    if (textarea.value.trim() !== "") { textarea.value += "\n\n---\n\n" + cleanText.trim(); }
    else { textarea.value = cleanText.trim(); }
    switchSandboxMode('sandbox');
}

function exportSandboxMarkdown() {
    const text = document.getElementById('sandbox-textarea').value;
    if (!text.trim()) { alert("沙盒内无内容！"); return; }
    
    const defaultFilename = `Draft_${Date.now()}.md`;
    
    if (window.pywebview && window.pywebview.api && window.pywebview.api.export_chat_log_to_file) {
        window.pywebview.api.export_chat_log_to_file(text, defaultFilename).then(function(res) {
            if (res.status === 'success') {
                console.log("Sandbox draft saved to: " + res.file_path);
            } else if (res.status === 'error') {
                alert("导出失败: " + res.message);
            }
        }).catch(function(err) {
            alert("导出异常: " + err);
        });
    }
}

function renderPresets() {
    const container = document.getElementById('presets-container'); container.innerHTML = "";
    window.presets.forEach(p => {
        const btn = document.createElement('button'); btn.className = "preset-btn"; btn.textContent = p.name;
        btn.onclick = () => selectPresetRole(p.prompt, p.name); container.appendChild(btn);
    });
}

function selectPresetRole(promptText, name) {
    document.getElementById('config-prompt').value = promptText;
    const msgEl = document.getElementById('save-msg'); msgEl.style.color = "#818cf8"; msgEl.textContent = `🎯 已选择预设：${name}`;
    setTimeout(() => { msgEl.textContent = ""; }, 2500);
}

function updateSliderLabels() {
    const temp = document.getElementById('config-temp').value;
    const tokens = document.getElementById('config-tokens').value;
    document.getElementById('slider-temp-val').textContent = temp;
    document.getElementById('slider-tokens-val').textContent = tokens;
}

function updateStatusBar() {
    const provider = document.getElementById('config-provider').value.toUpperCase();
    const modelSelect = document.getElementById('config-active-model');
    const modelName = modelSelect.options[modelSelect.selectedIndex]?.text || "未选定模型";
    document.getElementById('status-bar').textContent = `🧠 ${provider} | 📦 ${modelName}`;
}

function onProviderChange() {
    const provider = document.getElementById('config-provider').value;
    const apiBase = document.getElementById('config-api-base');
    const apiKey = document.getElementById('config-api-key');
    const provCfg = window.providers[provider] || { api_base: "", api_key: "" };
    apiBase.value = provCfg.api_base; apiKey.value = provCfg.api_key;
    
    const credCard = document.getElementById('credentials-card');
    if (credCard) {
        credCard.style.display = (provider === 'local') ? 'none' : 'block';
    }

    populateModelDropdown(); updateStatusBar();
    saveSettingsSilent();
}

function onActiveModelChange() {
    const activeModel = document.getElementById('config-active-model').value;
    const currentProvider = document.getElementById('config-provider').value;
    if (window.modelLockMode === "locked") {
        const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
        if (activeSession) { activeSession.bound_provider = currentProvider; activeSession.bound_model = activeModel; }
    }
    updateStatusBar();
    renderOtherModelsForActiveProvider();
    saveSettingsSilent();
}

function onModelLockModeChange() {
    window.modelLockMode = document.getElementById('config-model-lock').value;
    if (window.modelLockMode === "locked") {
        const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
        if (activeSession) {
            activeSession.bound_provider = document.getElementById('config-provider').value;
            activeSession.bound_model = document.getElementById('config-active-model').value;
        }
    }
    saveSettingsSilent();
}

function onPowershellModeChange() {
    window.powershellMode = document.getElementById('config-powershell-mode').value;
    saveSettingsSilent();
}

// 【新增】：界面缩放比例变更
function onZoomLevelChange() {
    const zoomEl = document.getElementById('config-zoom-level');
    if (!zoomEl) return;
    const zoom = zoomEl.value;
    document.body.style.zoom = zoom;
    saveSettingsSilent();
}

// 【新增】：开机自启变更
function onAutostartChange() {
    const autostartEl = document.getElementById('config-autostart');
    if (!autostartEl) return;
    const enabled = autostartEl.value === 'enabled';
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.set_autostart_enabled(enabled).then(function(res) {
            if (res.status === 'error') {
                showToast('开机自启设置失败: ' + res.message, 'error');
            } else {
                showToast(enabled ? '开机自启已开启 ✅' : '开机自启已关闭', 'success');
            }
        });
    }
    saveSettingsSilent();
}

// 【新增】：默认终端变更
function onDefaultTerminalChange() {
    saveSettingsSilent();
}

// 【新增】：打开软件数据目录
function openDataDirectory() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.open_data_directory().then(function(res) {
            if (res.status === 'error') {
                showToast('打开目录失败: ' + res.message, 'error');
            }
        });
    }
}

// 【新增】：检查新版本
function checkForUpdates() {
    const btn = document.getElementById('btn-check-update');
    const msgEl = document.getElementById('update-status-msg');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 检查中...'; }
    if (msgEl) { msgEl.textContent = ''; }
    // 当前版本标识（可后续改为从配置读取）
    const currentVersion = '1.0.0';
    setTimeout(function() {
        if (btn) { btn.disabled = false; btn.textContent = '⚡ 立即检查新版本'; }
        if (msgEl) {
            msgEl.style.color = '#34d399';
            msgEl.textContent = '✅ 当前已是最新版本 (v' + currentVersion + ')';
            setTimeout(function() { if (msgEl) msgEl.textContent = ''; }, 4000);
        }
        showToast('当前已是最新版本 ✅', 'success');
    }, 1200);
}

function saveSettings() {
    const provider = document.getElementById('config-provider').value;
    const lang = document.getElementById('config-lang').value;
    const closeAction = document.getElementById('config-close-action').value;
    window.providers[provider] = {
        api_base: document.getElementById('config-api-base').value,
        api_key: document.getElementById('config-api-key').value
    };

    const config = {
        provider: provider,
        active_model: document.getElementById('config-active-model').value,
        system_prompt: document.getElementById('config-prompt').value,
        temperature: parseFloat(document.getElementById('config-temp').value),
        max_tokens: parseInt(document.getElementById('config-tokens').value),
        model_lock_mode: window.modelLockMode,
        powershell_mode: window.powershellMode,
        theme: document.getElementById('config-theme').value,
        lang: lang,
        close_action: closeAction,
        zoom_level: (document.getElementById('config-zoom-level') || {}).value || "100%",
        autostart: (document.getElementById('config-autostart') || {}).value || "disabled",
        default_terminal: (document.getElementById('config-default-terminal') || {}).value || "system",
        auto_update: (document.getElementById('config-auto-update') || {}).value || "disabled",
        update_notify: (document.getElementById('config-update-notify') || {}).value || "enabled",
        show_float_card: (document.getElementById('config-show-float-card') || {}).value || "disabled",
        float_card_top: (document.getElementById('config-float-card-top') || {}).value || "disabled",
        quota_refresh_interval: (document.getElementById('config-quota-refresh-interval') || {}).value || "10",
        active_account_refresh: (document.getElementById('config-active-account-refresh') || {}).value || "disabled",
        quota_threshold: (document.getElementById('config-quota-threshold') || {}).value || "10",
        credits_threshold: (document.getElementById('config-credits-threshold') || {}).value || "5",
        auto_switch_account: (document.getElementById('config-auto-switch-account') || {}).value || "disabled",
        credits_toast: (document.getElementById('config-credits-toast') || {}).value || "enabled",
        refresh_free: (document.getElementById('config-refresh-free') || {}).value || "60",
        refresh_pro: (document.getElementById('config-refresh-pro') || {}).value || "10",
        main_app_path: (document.getElementById('config-main-app-path') || {}).value || "",
        link_codex: (document.getElementById('config-link-codex') || {}).value || "disabled",
        link_opencode: (document.getElementById('config-link-opencode') || {}).value || "disabled",
        link_vscode: (document.getElementById('config-link-vscode') || {}).value || "disabled",
        link_cursor: (document.getElementById('config-link-cursor') || {}).value || "disabled",
        custom_linked_app: (document.getElementById('config-custom-linked-app') || {}).value || "",
        switch_scope: (document.getElementById('config-switch-scope') || {}).value || "all",
        api_entry_visible: (document.getElementById('config-api-entry-visible') || {}).value || "visible",
        overwrite_opencode: (document.getElementById('config-overwrite-opencode') || {}).value || "disabled",
        overwrite_openclaw: (document.getElementById('config-overwrite-openclaw') || {}).value || "disabled",
        restart_opencode: (document.getElementById('config-restart-opencode') || {}).value || "disabled",
        zed_quota_refresh: (document.getElementById('config-zed-quota-refresh') || {}).value || "10",
        zed_quota_notify: (document.getElementById('config-zed-quota-notify') || {}).value || "enabled",
        zed_win_path: (document.getElementById('config-zed-win-path') || {}).value || "",
        zed_wsl_path: (document.getElementById('config-zed-wsl-path') || {}).value || "",
        link_zed: (document.getElementById('config-link-zed') || {}).value || "disabled",
        voice_response_enabled: (document.getElementById('config-voice-response') || {}).value || "disabled",
        voice_name: (document.getElementById('config-voice-name') || {}).value || "default",
        voice_rate: parseFloat((document.getElementById('config-voice-rate') || {}).value) || 1.0,
        tts_type: (document.getElementById('config-tts-type') || {}).value || "system",
        tts_api_url: (document.getElementById('config-tts-api-url') || {}).value || "",
        floating_dialogue_enabled: document.getElementById('config-floating-dialogue-enabled').value === 'true',
        auto_hide_history_dialogue: document.getElementById('config-auto-hide-history-dialogue').value === 'true',
        show_float_on_startup: document.getElementById('config-show-float-on-startup').value === 'true',
        floating_dialogue_on_top: document.getElementById('config-floating-dialogue-on-top').value === 'true',
        main_window_on_top: document.getElementById('config-main-window-on-top').value === 'true',
        floating_dialogue_height: parseInt(document.getElementById('config-floating-dialogue-height').value) || 450,
        floating_dialogue_width: parseInt(document.getElementById('config-floating-dialogue-width').value) || 380,
        floating_dialogue_max_width: 800,
        custom_scripts: window.customScripts || [],
        web_search_enabled: window.webSearchEnabled,
        models: window.modelList,
        sessions: window.sessions,
        active_session_id: window.activeSessionId,
        providers: window.providers
    };

    const dict = i18n[lang] || i18n.zh;
    const msgEl = document.getElementById('save-msg');
    if (msgEl) {
        msgEl.style.color = "#818cf8"; 
        msgEl.textContent = "...";
    }

    window.pywebview.api.save_config(config).then(function (res) {
        if (res.status === 'success') {
            if (msgEl) {
                msgEl.style.color = "#34d399"; 
                msgEl.textContent = "Saved";
                setTimeout(() => { msgEl.textContent = ""; }, 2500);
            }
            showToast(dict.saveSuccess, 'success');
            updateStatusBar();
        } else {
            if (msgEl) {
                msgEl.style.color = "#f87171"; 
                msgEl.textContent = "Error";
            }
            showToast(`${dict.saveError}: ${res.msg || "Write failed"}`, 'error');
        }
    }).catch(function (err) {
        if (msgEl) {
            msgEl.style.color = "#f87171"; 
            msgEl.textContent = "Error";
        }
        showToast(`Fatal: Python backend error (${err.message || err})`, 'error');
    });
}

function saveSettingsSilent() {
    const provider = document.getElementById('config-provider').value;
    const lang = document.getElementById('config-lang').value;
    const closeAction = document.getElementById('config-close-action').value;
    window.providers[provider] = {
        api_base: document.getElementById('config-api-base').value,
        api_key: document.getElementById('config-api-key').value
    };

    const config = {
        provider: provider,
        active_model: document.getElementById('config-active-model').value,
        system_prompt: document.getElementById('config-prompt').value,
        temperature: parseFloat(document.getElementById('config-temp').value),
        max_tokens: parseInt(document.getElementById('config-tokens').value),
        model_lock_mode: window.modelLockMode,
        powershell_mode: window.powershellMode,
        font_size: window.fontSize,
        deep_thinking_enabled: window.deepThinkingEnabled,
        theme: document.getElementById('config-theme').value,
        lang: lang,
        close_action: closeAction,
        zoom_level: (document.getElementById('config-zoom-level') || {}).value || "100%",
        autostart: (document.getElementById('config-autostart') || {}).value || "disabled",
        default_terminal: (document.getElementById('config-default-terminal') || {}).value || "system",
        auto_update: (document.getElementById('config-auto-update') || {}).value || "disabled",
        update_notify: (document.getElementById('config-update-notify') || {}).value || "enabled",
        show_float_card: (document.getElementById('config-show-float-card') || {}).value || "disabled",
        float_card_top: (document.getElementById('config-float-card-top') || {}).value || "disabled",
        quota_refresh_interval: (document.getElementById('config-quota-refresh-interval') || {}).value || "10",
        active_account_refresh: (document.getElementById('config-active-account-refresh') || {}).value || "disabled",
        quota_threshold: (document.getElementById('config-quota-threshold') || {}).value || "10",
        credits_threshold: (document.getElementById('config-credits-threshold') || {}).value || "5",
        auto_switch_account: (document.getElementById('config-auto-switch-account') || {}).value || "disabled",
        credits_toast: (document.getElementById('config-credits-toast') || {}).value || "enabled",
        refresh_free: (document.getElementById('config-refresh-free') || {}).value || "60",
        refresh_pro: (document.getElementById('config-refresh-pro') || {}).value || "10",
        main_app_path: (document.getElementById('config-main-app-path') || {}).value || "",
        link_codex: (document.getElementById('config-link-codex') || {}).value || "disabled",
        link_opencode: (document.getElementById('config-link-opencode') || {}).value || "disabled",
        link_vscode: (document.getElementById('config-link-vscode') || {}).value || "disabled",
        link_cursor: (document.getElementById('config-link-cursor') || {}).value || "disabled",
        custom_linked_app: (document.getElementById('config-custom-linked-app') || {}).value || "",
        switch_scope: (document.getElementById('config-switch-scope') || {}).value || "all",
        api_entry_visible: (document.getElementById('config-api-entry-visible') || {}).value || "visible",
        overwrite_opencode: (document.getElementById('config-overwrite-opencode') || {}).value || "disabled",
        overwrite_openclaw: (document.getElementById('config-overwrite-openclaw') || {}).value || "disabled",
        restart_opencode: (document.getElementById('config-restart-opencode') || {}).value || "disabled",
        zed_quota_refresh: (document.getElementById('config-zed-quota-refresh') || {}).value || "10",
        zed_quota_notify: (document.getElementById('config-zed-quota-notify') || {}).value || "enabled",
        zed_win_path: (document.getElementById('config-zed-win-path') || {}).value || "",
        zed_wsl_path: (document.getElementById('config-zed-wsl-path') || {}).value || "",
        link_zed: (document.getElementById('config-link-zed') || {}).value || "disabled",
        voice_response_enabled: (document.getElementById('config-voice-response') || {}).value || "disabled",
        voice_name: (document.getElementById('config-voice-name') || {}).value || "default",
        voice_rate: parseFloat((document.getElementById('config-voice-rate') || {}).value) || 1.0,
        tts_type: (document.getElementById('config-tts-type') || {}).value || "system",
        tts_api_url: (document.getElementById('config-tts-api-url') || {}).value || "",
        floating_dialogue_enabled: document.getElementById('config-floating-dialogue-enabled').value === 'true',
        auto_hide_history_dialogue: document.getElementById('config-auto-hide-history-dialogue').value === 'true',
        show_float_on_startup: document.getElementById('config-show-float-on-startup').value === 'true',
        floating_dialogue_on_top: document.getElementById('config-floating-dialogue-on-top').value === 'true',
        main_window_on_top: document.getElementById('config-main-window-on-top').value === 'true',
        floating_dialogue_height: parseInt(document.getElementById('config-floating-dialogue-height').value) || 450,
        floating_dialogue_width: parseInt(document.getElementById('config-floating-dialogue-width').value) || 380,
        floating_dialogue_max_width: 800,
        custom_scripts: window.customScripts || [],
        web_search_enabled: window.webSearchEnabled,
        models: window.modelList,
        sessions: window.sessions,
        active_session_id: window.activeSessionId,
        providers: window.providers
    };
    window.pywebview.api.save_config(config);
}

// 【新增】：立即刷新配额状态
function refreshQuotaNow() {
    const btn = document.getElementById('btn-refresh-quota-now');
    const display = document.getElementById('quota-status-display');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 刷新中...'; }
    if (display) { display.style.display = 'none'; }
    window.pywebview.api.get_quota_status().then(function(res) {
        if (btn) { btn.disabled = false; btn.textContent = '🔄 立即刷新当前配额状态'; }
        if (display) {
            display.style.display = 'block';
            if (res.status === 'success') {
                display.innerHTML = `🤖 提供商: <b>${res.provider}</b> &nbsp;📦 模型: <b>${res.model}</b><br>📊 配额: ${res.quota_remaining} &nbsp;&#128176; Credits: ${res.credits}<br>⏰ 最后刷新: ${res.last_refresh}`;
            } else {
                display.innerHTML = `❌ 获取失败: ${res.message}`;
            }
        }
    }).catch(function() {
        if (btn) { btn.disabled = false; btn.textContent = '🔄 立即刷新当前配额状态'; }
    });
}

// 【新增】：测试 Windows 系统弹窗
function testWindowsToast() {
    const btn = document.getElementById('btn-test-toast');
    if (btn) { btn.disabled = true; }
    window.pywebview.api.send_windows_toast(
        'AI Desktop Workstation',
        '🔔 测试通知: 系统弹窗功能正常工作!'
    ).then(function(res) {
        if (btn) { btn.disabled = false; }
        if (res.status === 'success') {
            showToast('系统弹窗已发送 ✅，请查看消息中心', 'success');
        } else {
            showToast('弹窗发送失败: ' + res.message, 'error');
        }
    }).catch(function() {
        if (btn) { btn.disabled = false; }
    });
}

// 【新增】：手动触发切号（含 session 覆盖及联动重启第三方应用）
function triggerManualSwitch() {
    const msg = document.getElementById('switch-status-msg');
    const btn = document.getElementById('btn-trigger-manual-switch');
    if (btn) btn.disabled = true;
    if (msg) { msg.style.color = '#fbbf24'; msg.textContent = '⏳ 切号与联动操作进行中...'; }

    const overwriteOpencode = (document.getElementById('config-overwrite-opencode') || {}).value || 'disabled';
    const overwriteOpenclaw = (document.getElementById('config-overwrite-openclaw') || {}).value || 'disabled';
    
    const restartOpencode = (document.getElementById('config-restart-opencode') || {}).value || 'disabled';
    const linkCodex = (document.getElementById('config-link-codex') || {}).value || 'disabled';
    const linkVscode = (document.getElementById('config-link-vscode') || {}).value || 'disabled';
    const linkCursor = (document.getElementById('config-link-cursor') || {}).value || 'disabled';
    const customLinkedApp = (document.getElementById('config-custom-linked-app') || {}).value || '';
    const linkZed = (document.getElementById('config-link-zed') || {}).value || 'disabled';

    const tasks = [];
    const actionsTaken = { overwrites: [], restarts: [] };

    // 1. Session Overwrites
    if (overwriteOpencode === 'enabled') {
        const randToken = 'token_' + Math.random().toString(36).substring(2, 11);
        tasks.push(window.pywebview.api.overwrite_editor_session('opencode', randToken).then(function() {
            actionsTaken.overwrites.push('OpenCode');
        }));
    }
    if (overwriteOpenclaw === 'enabled') {
        const randToken = 'token_' + Math.random().toString(36).substring(2, 11);
        tasks.push(window.pywebview.api.overwrite_editor_session('openclaw', randToken).then(function() {
            actionsTaken.overwrites.push('OpenClaw');
        }));
    }

    // 2. Process Restarts
    if (linkCodex === 'enabled') {
        tasks.push(window.pywebview.api.restart_linked_app('codex').then(function() {
            actionsTaken.restarts.push('Codex');
        }));
    }
    if (linkVscode === 'enabled') {
        tasks.push(window.pywebview.api.restart_linked_app('vscode').then(function() {
            actionsTaken.restarts.push('VSCode');
        }));
    }
    if (linkCursor === 'enabled') {
        tasks.push(window.pywebview.api.restart_linked_app('cursor').then(function() {
            actionsTaken.restarts.push('Cursor');
        }));
    }
    if (restartOpencode === 'enabled') {
        tasks.push(window.pywebview.api.restart_linked_app('opencode').then(function() {
            if (!actionsTaken.restarts.includes('OpenCode')) actionsTaken.restarts.push('OpenCode');
        }));
    }
    if (linkZed === 'enabled') {
        tasks.push(window.pywebview.api.restart_linked_app('zed').then(function() {
            actionsTaken.restarts.push('Zed');
        }));
    }
    if (customLinkedApp) {
        tasks.push(window.pywebview.api.restart_linked_app(customLinkedApp).then(function() {
            actionsTaken.restarts.push('自定义应用');
        }));
    }

    // Wait for all tasks to complete
    Promise.all(tasks).then(function() {
        if (btn) btn.disabled = false;
        if (msg) {
            msg.style.color = '#34d399';
            let summary = '✅ 切号及联动完成';
            const details = [];
            if (actionsTaken.overwrites.length > 0) {
                details.push('已覆盖登录态: ' + actionsTaken.overwrites.join(', '));
            }
            if (actionsTaken.restarts.length > 0) {
                details.push('已重启: ' + actionsTaken.restarts.join(', '));
            }
            if (details.length > 0) {
                summary += ' (' + details.join('; ') + ')';
            } else {
                summary += ' (无联动项生效)';
            }
            msg.textContent = summary;
            setTimeout(function() { if (msg) msg.textContent = ''; }, 6000);
        }
        showToast('手动切号及联动操作已全部执行 ⚡', 'success');
    }).catch(function(err) {
        if (btn) btn.disabled = false;
        if (msg) {
            msg.style.color = '#f87171';
            msg.textContent = '❌ 联动重启失败: ' + (err.message || err);
        }
    });
}

// 【新增】：浏览主程序路径
function browseAppPath() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.browse_file_path('选择主程序文件').then(function(res) {
            if (res.status === 'success') {
                const el = document.getElementById('config-main-app-path');
                if (el) { el.value = res.path; saveSettingsSilent(); }
            }
        });
    }
}

// 【新增】：重置主程序路径
function resetAppPath() {
    const el = document.getElementById('config-main-app-path');
    if (el) { el.value = ''; saveSettingsSilent(); }
    showToast('已恢复默认启动路径 ✅', 'success');
}

// 【新增】：测试登录态覆盖写入 (功能 40-42)
function testSessionOverwrite() {
    const btn = document.getElementById('btn-test-session-overwrite');
    const msg = document.getElementById('session-overwrite-msg');
    if (btn) btn.disabled = true;
    if (msg) { msg.style.color = '#fbbf24'; msg.textContent = '⏳ 测试写入中...'; }
    const overwOpencode = (document.getElementById('config-overwrite-opencode') || {}).value;
    const overwOpenclaw = (document.getElementById('config-overwrite-openclaw') || {}).value;
    const targets = [];
    if (overwOpencode === 'enabled') targets.push('opencode');
    if (overwOpenclaw === 'enabled') targets.push('openclaw');
    if (targets.length === 0) {
        if (btn) btn.disabled = false;
        if (msg) { msg.style.color = '#f87171'; msg.textContent = '请先开启至少一个覆盖选项'; }
        return;
    }
    let done = 0;
    const results = [];
    targets.forEach(function(editor) {
        window.pywebview.api.overwrite_editor_session(editor).then(function(res) {
            done++;
            results.push(editor + ': ' + (res.status === 'success' ? '✅' : '❌ ' + res.message));
            if (done === targets.length) {
                if (btn) btn.disabled = false;
                if (msg) { msg.style.color = '#34d399'; msg.textContent = results.join(' | '); }
                showToast('登录态测试写入完成 ✅', 'success');
                setTimeout(function() { if (msg) msg.textContent = ''; }, 4000);
            }
        });
    });
}

// 【新增】：刷新 Zed 配额状态 (功能 43)
function refreshZedQuota() {
    const btn = document.getElementById('btn-refresh-zed-quota');
    const display = document.getElementById('zed-quota-display');
    if (btn) { btn.disabled = true; btn.textContent = '⚡ 刷新中...'; }
    if (display) display.style.display = 'none';
    window.pywebview.api.get_zed_quota_status().then(function(res) {
        if (btn) { btn.disabled = false; btn.textContent = '⚡ 立即刷新 Zed 配额状态'; }
        if (display) {
            display.style.display = 'block';
            if (res.status === 'success') {
                const foundStr = res.zed_found ? '✅ 已找到' : '❌ 未找到';
                display.innerHTML = `⚡ Win路径: <b>${res.zed_win_path}</b> ${foundStr}<br>🐧 WSL路径: <b>${res.zed_wsl_path}</b><br>📊 配额: ${res.quota}<br>⏰ 最后刷新: ${res.last_refresh}`;
            } else {
                display.innerHTML = `❌ 获取失败: ${res.message}`;
            }
        }
    }).catch(function() {
        if (btn) { btn.disabled = false; btn.textContent = '⚡ 立即刷新 Zed 配额状态'; }
    });
}

// 【新增】：浏览 Zed 路径 (功能 44)
function browseZedPath(env) {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.browse_file_path('选择 Zed 可执行文件').then(function(res) {
            if (res.status === 'success') {
                const targetId = env === 'win' ? 'config-zed-win-path' : 'config-zed-wsl-path';
                const el = document.getElementById(targetId);
                if (el) { el.value = res.path; saveSettingsSilent(); }
            }
        });
    }
}

// 【新增】：重置 Zed 路径
function resetZedPaths() {
    const winEl = document.getElementById('config-zed-win-path');
    const wslEl = document.getElementById('config-zed-wsl-path');
    if (winEl) winEl.value = '';
    if (wslEl) wslEl.value = '';
    saveSettingsSilent();
    showToast('Zed 路径已重置 ✅', 'success');
}

function addNewModel() {
    const name = document.getElementById('new-model-name').value.trim();
    const id = document.getElementById('new-model-id').value.trim();
    const type = document.getElementById('new-model-type').value;
    const context = document.getElementById('new-model-context').value.trim() || "8K";
    const provider = document.getElementById('config-provider').value;
    if (!name || !id) { alert("请输入完整参数！"); return; }

    window.modelList.push({ name, id, type, context, provider });
    document.getElementById('new-model-name').value = "";
    document.getElementById('new-model-id').value = "";
    document.getElementById('new-model-context').value = "";

    renderModelList(); populateModelDropdown(id); updateStatusBar();
    saveSettingsSilent();
}

async function importDrawingModels() {
    const btn = document.getElementById('btn-import-drawing-models');
    btn.disabled = true; btn.textContent = '\u23f3 \u626b\u63cf\u4e2d...';
    try {
        const res = await window.pywebview.api.import_drawing_models();
        if (res.status === 'success') {
            var addedCount = 0;
            res.models.forEach(m => {
                if (!window.modelList.some(function(existing) { return existing.id === m.id; })) {
                    window.modelList.push({ name: m.name, id: m.id, type: 'drawing', context: m.context, provider: 'local' });
                    addedCount++;
                }
            });
            renderModelList(); renderDrawingModelList(); populateModelDropdown(); updateStatusBar();
            saveSettingsSilent();
            showToast('\u2705 \u5df2\u5bfc\u5165 ' + res.models.length + ' \u4e2a\u753b\u56fe\u6a21\u578b', 'success');
        } else {
            showToast('\u5bfc\u5165\u5931\u8d25: ' + (res.message || '\u672a\u77e5\u9519\u8bef'), 'error');
        }
    } catch (err) {
        showToast('\u5bfc\u5165\u51fa\u9519: ' + err, 'error');
    }
    btn.disabled = false; btn.textContent = '\ud83c\udfa8 \u4e00\u952e\u5bfc\u5165\u753b\u56fe\u6a21\u578b\uff08\u68c0\u6d4b D:\\AI\\\u753b\u56fe\u6a21\u578b\uff09';
}

function importLocalModel() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.import_local_model_file) {
        window.pywebview.api.import_local_model_file().then(function(res) {
            if (res.status === 'success') {
                document.getElementById('new-model-name').value = res.name;
                document.getElementById('new-model-id').value = res.path;
                document.getElementById('new-model-context').value = "8K";
                
                // 自动切换至 Ollama/本地提供商以适应本地模型
                document.getElementById('config-provider').value = 'local';
                onProviderChange();
                
                showToast('已成功解析本地模型路径，点击"加入列表"即可保存 💾', 'success');
            } else if (res.status === 'error') {
                showToast('导入失败: ' + res.message, 'error');
            }
        }).catch(function(err) {
            showToast('调用原生选择器出错: ' + err, 'error');
        });
    } else {
        showToast('WebView API 尚未就绪，请稍候 ⏳', 'error');
    }
}

function handleSandboxLiveInput() {
    const textarea = document.getElementById('sandbox-textarea');
    const preview = document.getElementById('sandbox-preview');
    if (textarea && preview) {
        preview.innerHTML = parseMarkdownWithCopy(textarea.value);
    }
}

function parseMarkdownWithCopy(text) {
    let html = escapeHTML(text);
    html = html.replace(/```(\w*)\n([\s\S]+?)```/g, function (match, lang, codeBody) {
        return `
            <div class="code-container" style="position:relative; margin:8px 0;">
                <div class="code-header" style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:5px 10px; border-bottom:1px solid rgba(255,255,255,0.05); border-radius:8px 8px 0 0; font-size:10px; color:#64748b; font-family:monospace; user-select:none;">
                    <span>📁 ${lang ? lang.toUpperCase() : "SOURCE_CODE"}</span>
                    <button onclick="copyCodeElement(this)" class="btn-copy-code-new" style="background:none; border:none; color:#818cf8; cursor:pointer; font-weight:bold; font-size:10px;">📋 复制代码</button>
                </div>
                <pre style="border-radius:0 0 8px 8px; border-top:none; margin:0;"><code class="language-${lang}">${codeBody}</code></pre>
            </div>
        `;
    });
    html = html.replace(/```([\s\S]+?)```/g, function (match, codeBody) {
        return `
            <div class="code-container" style="position:relative; margin:8px 0;">
                <div class="code-header" style="display:flex; justify-content:space-between; align-items:center; background:#020617; padding:5px 10px; border-bottom:1px solid rgba(255,255,255,0.05); border-radius:8px 8px 0 0; font-size:10px; color:#64748b; font-family:monospace; user-select:none;">
                    <span>📁 CODE</span>
                    <button onclick="copyCodeElement(this)" class="btn-copy-code-new" style="background:none; border:none; color:#818cf8; cursor:pointer; font-weight:bold; font-size:10px;">📋 复制代码</button>
                </div>
                <pre style="border-radius:0 0 8px 8px; border-top:none; margin:0;"><code>${codeBody}</code></pre>
            </div>
        `;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

function copyCodeElement(btn) {
    const container = btn.closest('.code-container');
    const codeText = container.querySelector('pre code').innerText;
    navigator.clipboard.writeText(codeText).then(function () {
        const originalText = btn.textContent; btn.textContent = "✅ 已复制";
        setTimeout(() => { btn.textContent = originalText; }, 1500);
    }).catch(function () {
        btn.textContent = "❌ 失败"; setTimeout(() => { btn.textContent = "📋 复制代码"; }, 1500);
    });
}

function deleteModel(idx) {
    const deleted = window.modelList[idx]; window.modelList.splice(idx, 1); renderModelList();
    let currentActive = document.getElementById('config-active-model').value;
    if (currentActive === deleted.id && window.modelList.length > 0) { currentActive = window.modelList[0].id; }
    populateModelDropdown(currentActive); updateStatusBar();
    saveSettingsSilent();
}

function sendMessage() {
    if (window.isGenerating) return;
    const inputEl = document.getElementById('msg-input');
    const text = inputEl.value.trim();
    if (!text && !window.attachedFile) return;

    let finalMsg = text;
    if (window.attachedFile && window.attachedFile.type === 'text') {
        finalMsg = `[已挂载文档: ${window.attachedFile.name}]\n---文件内容---\n${window.attachedFile.content}\n---文件内容结束---\n\n` + text;
    }

    appendUserBubble(text ? text : `[📎 挂载文档: ${window.attachedFile.name}]`);
    inputEl.value = "";

    window.isGenerating = true;
    document.getElementById('send-btn').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'flex';

    updateStatusOrb("thinking");
    window.generationStartTime = performance.now();

    const isDrawing = window.drawingEnabled && checkModelSupportsDrawing();

    if (window.webSearchEnabled && !isDrawing) {
        const container = document.getElementById('chat-container');
        const searchCard = document.createElement('div');
        searchCard.id = "active-search-status";
        searchCard.className = "os-agent-card success-card";
        searchCard.textContent = `🔍 正在联网搜索: 正在检索关于 "${text.substring(0, 40)}" 的互联网实时信息...`;
        container.appendChild(searchCard);
        scrollToBottom(true);
    }

    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    const history = activeSession ? activeSession.history : [];
    if (isDrawing || checkModelSupportsDrawing()) {
        const wrap = document.createElement("div"); wrap.className = "bubble-wrap";
        wrap.innerHTML = '<div class="avatar ai">AI</div><div class="bubble-content" style="width:100%;"><div style="padding:8px;"><span id="drawing-progress-text" style="font-size:11px;color:#ec4899;">🎨 正在生成图片...</span><div style="background:#1e293b;border-radius:8px;height:8px;margin-top:6px;overflow:hidden;"><div id="drawing-progress-bar" style="width:5%;height:100%;background:#ec4899;border-radius:8px;transition:width 0.3s;"></div></div></div></div>';
        document.getElementById("chat-container").appendChild(wrap); scrollToBottom(true);
        window.pywebview.api.start_drawing(finalMsg);
    } else if (window.attachedFile && window.attachedFile.type === 'image') {
        window.pywebview.api.start_chat_with_image(finalMsg, history, window.attachedFile.base64, window.attachedFile.ext);
    } else {
        window.pywebview.api.start_chat(finalMsg, history);
    }
    if (window.drawingEnabled) {
        window.drawingEnabled = false;
        const btn = document.getElementById('btn-draw-image');
        if (btn) btn.classList.remove('active');
    }

    clearAttachment();
}


async function checkComfyUIStatus() {
    const dot = document.getElementById('comfyui-status-dot');
    const text = document.getElementById('comfyui-status-text');
    try {
        const res = await window.pywebview.api.check_comfyui_status();
        if (res.running) {
            dot.style.background = '#10b981'; text.textContent = 'ComfyUI 运行中 ✅';
        } else {
            dot.style.background = '#ef4444'; text.textContent = 'ComfyUI 未运行';
        }
    } catch (e) {
        dot.style.background = '#ef4444'; text.textContent = '检测失败';
    }
}

function startComfyUI() {
    const btn = document.getElementById('btn-start-comfyui');
    btn.disabled = true; btn.textContent = '⏳ 启动中...';
    window.pywebview.api.start_comfyui().then(function(res) {
        if (res.status === 'ok') {
            document.getElementById('comfyui-status-dot').style.background = '#10b981';
            document.getElementById('comfyui-status-text').textContent = 'ComfyUI 运行中 ✅';
            showToast('ComfyUI 已启动', 'success');
        } else {
            showToast('启动失败: ' + (res.message || '未知'), 'error');
        }
    }).catch(function(e) {
        showToast('启动出错: ' + e, 'error');
    }).finally(function() {
        btn.disabled = false; btn.textContent = '▶ 启动 ComfyUI';
    });
}

function cancelGeneration() {
    window.pywebview.api.cancel_chat();
    document.getElementById('send-btn').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'none';
}

function appendUserBubble(text) {
    const container = document.getElementById('chat-container');
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (activeSession) { activeSession.history.push({ role: "user", content: text }); saveSettingsSilent(); }
    const userMsgIdx = activeSession ? activeSession.history.length - 1 : -1;
    const wrap = document.createElement('div'); wrap.className = "bubble-wrap user";
    wrap.innerHTML = `<div class="avatar user">ME</div><div class="bubble-content">${escapeHTML(text)}<div class="bubble-actions"><button onclick="loadToInput(this)" class="btn-bubble-action">✏️ 载入编辑</button><button onclick="deleteMessagePair(${userMsgIdx})" class="btn-bubble-action btn-bubble-delete">🗑️ 删除对话</button></div></div>`;
    container.appendChild(wrap);
    updateSessionStatistics(); scrollToBottom(true);
}

window.handleFloatUserMessage = function(text) {
    if (window.windowMode === 'float') return;
    appendUserBubble(text);
    
    window.isGenerating = true;
    const sendBtn = document.getElementById('send-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    if (sendBtn) sendBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'flex';
    
    updateStatusOrb("thinking");
    window.generationStartTime = performance.now();
};

function createAssistantBubble() {
    const container = document.getElementById('chat-container');
    const wrap = document.createElement('div'); wrap.className = "bubble-wrap";
    wrap.innerHTML = `<div class="avatar ai">AI</div><div class="bubble-content" style="width: 100%;"><div id="active-reasoning-box"><details open><summary id="active-reasoning-summary">🤔 思考中...</summary><div id="active-reasoning-content" style="white-space: pre-wrap;"></div></details></div><div id="active-body-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
    container.appendChild(wrap); scrollToBottom(true); return wrap;
}

function getActiveModelType() {
    const activeId = document.getElementById('config-active-model').value;
    const model = window.modelList.find(m => m.id === activeId);
    return model ? model.type : "chat";
}

window.handleStreamChunk = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!window.activeAssistantMsgElement) {
        window.activeAssistantMsgElement = createAssistantBubble();
        updateStatusOrb("generating");
    }

    const rBox = window.activeAssistantMsgElement.querySelector('#active-reasoning-box');
    const rContent = window.activeAssistantMsgElement.querySelector('#active-reasoning-content');
    const rSummary = window.activeAssistantMsgElement.querySelector('#active-reasoning-summary');
    const bodyBox = window.activeAssistantMsgElement.querySelector('#active-body-content');
    const activeModelType = getActiveModelType();

    if (data.reasoning) {
        const indicator = bodyBox.querySelector('.typing-indicator');
        if (indicator) { bodyBox.innerHTML = ""; }
        window.activeReasoningText += data.reasoning;
        rBox.style.display = 'block'; rContent.textContent = window.activeReasoningText;
    }

    if (data.content) {
        const indicator = bodyBox.querySelector('.typing-indicator');
        if (indicator) { bodyBox.innerHTML = ""; }
        window.activeContentText += data.content;

        if (activeModelType === 'reasoning_tag') {
            const thinkStartIdx = window.activeContentText.indexOf('<think>');
            if (thinkStartIdx !== -1) {
                const thinkEndIdx = window.activeContentText.indexOf('</think>');
                let reasoningText = ""; let bodyText = "";
                const preThinkText = window.activeContentText.substring(0, thinkStartIdx);

                if (thinkEndIdx !== -1) {
                    reasoningText = window.activeContentText.substring(thinkStartIdx + 7, thinkEndIdx);
                    bodyText = preThinkText + window.activeContentText.substring(thinkEndIdx + 8);
                    if (rSummary) rSummary.textContent = "💡 已完成思考 (点击展开)";
                } else {
                    reasoningText = window.activeContentText.substring(thinkStartIdx + 7);
                    bodyText = preThinkText;
                    if (rSummary) rSummary.textContent = "🤔 思考中...";
                }
                rBox.style.display = 'block'; rContent.textContent = reasoningText;
                bodyBox.innerHTML = parseMarkdownWithCopy(bodyText);
            } else { bodyBox.innerHTML = parseMarkdownWithCopy(window.activeContentText); }
        } else { bodyBox.innerHTML = parseMarkdownWithCopy(window.activeContentText); }
    }
    scrollToBottom();
};


window.handleDrawingProgress = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const bar = document.getElementById('drawing-progress-bar');
    const text = document.getElementById('drawing-progress-text');
    if (bar) { bar.style.width = (data.progress || 0) + '%'; bar.style.background = '#ec4899'; }
    if (text) { text.textContent = data.message || '正在生成...'; }
};

window.handleImageGenerated = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    window.isGenerating = false;
    document.getElementById('send-btn').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'none';
    updateStatusOrb("idle");
    if (typeof removeTypingIndicator === "function") removeTypingIndicator();
    var done = false;
    if (data.status === 'success') {
        var pb = document.getElementById('drawing-progress-bar');
        if (pb) {
            pb.style.width = '100%'; pb.style.background = '#10b981';
            var txt = document.getElementById('drawing-progress-text');
            if (txt) txt.textContent = '✅ 生成完成';
            setTimeout(function() {
                var bubble = pb.closest('.bubble-wrap');
                if (bubble) {
                    var bc = bubble.querySelector('.bubble-content');
                    bc.innerHTML = '';
                    var img = document.createElement('img');
                    img.src = data.image_url;
                    img.style.cssText = 'max-width:100%;border-radius:12px;';
                    bc.appendChild(img);
                }
            }, 500);
            done = true;
        }
        if (!done) {
            var container = document.getElementById('chat-container');
            var wrap = document.createElement('div'); wrap.className = "bubble-wrap";
            var img = document.createElement('img');
            img.src = data.image_url;
            img.style.cssText = 'max-width:100%;border-radius:12px;';
            wrap.innerHTML = '<div class="avatar ai">AI</div><div class="bubble-content"></div>';
            wrap.querySelector('.bubble-content').appendChild(img);
            container.appendChild(wrap);
        }
        scrollToBottom(true);
        var activeSession = window.sessions.find(function(s) { return s.id === window.activeSessionId; });
        if (activeSession) {
            activeSession.history.push({ role: "assistant", content: "[生成图片: " + (data.filename || '') + "]", image_url: data.image_url });
            saveSettingsSilent();
        }
        updateSessionStatistics();
    } else {
        var pb2 = document.getElementById('drawing-progress-bar');
        if (pb2) {
            pb2.style.width = '100%'; pb2.style.background = '#ef4444';
            var txt2 = document.getElementById('drawing-progress-text');
            if (txt2) txt2.textContent = '❌ ' + (data.message || '未知错误');
        } else {
            var container2 = document.getElementById('chat-container');
            var wrap2 = document.createElement('div'); wrap2.className = "bubble-wrap";
            wrap2.innerHTML = '<div class="avatar ai">AI</div><div class="bubble-content" style="color:#ef4444;">❌ 画图失败: ' + escapeHTML(data.message || '未知错误') + '</div>';
            container2.appendChild(wrap2);
            scrollToBottom(true);
        }
    }
};;

window.handleStreamEnd = function () {
    if (window.activeAssistantMsgElement) {
        const summary = window.activeAssistantMsgElement.querySelector('summary');
        if (summary) { summary.textContent = "💡 已完成思考 (点击展开)"; }
        const bodyBox = window.activeAssistantMsgElement.querySelector('#active-body-content');
        const indicator = bodyBox.querySelector('.typing-indicator');
        if (indicator) { bodyBox.innerHTML = "（回复中断或无正文返回）"; }

        const elapsedSeconds = ((performance.now() - window.generationStartTime) / 1000).toFixed(1);

        const match = window.activeContentText.match(/<os_tool>([\s\S]+?)<\/os_tool>/);
        if (match && match[1]) {
            const rawJson = match[1].trim();
            console.log("⚙️ [OS Agent 控制指令] ...", rawJson);
            const orb = document.getElementById('status-orb'); orb.className = "status-orb thinking";

            window.pywebview.api.execute_os_action(rawJson).then(function (result) {
                const card = document.createElement('div');
                if (result.includes("❌") || result.includes("错误") || result.includes("失败") || result.includes("警告")) {
                    card.className = "os-agent-card error-card";
                } else { card.className = "os-agent-card success-card"; }

                card.textContent = "⚙️ [OS Agent 本地操作结果]: " + result;
                document.getElementById('chat-container').appendChild(card); scrollToBottom(true);

                const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
                if (activeSession) {
                    activeSession.history.push({ role: "assistant", content: window.activeContentText, latency: elapsedSeconds });
                    const systemFeedback = `<os_result>\n${result}\n</os_result>`;
                    activeSession.history.push({ role: "system", content: systemFeedback });
                    saveSettingsSilent();

                    window.activeAssistantMsgElement = null; window.activeReasoningText = ""; window.activeContentText = ""; window.isGenerating = true;
                    document.getElementById('send-btn').style.display = 'none'; document.getElementById('cancel-btn').style.display = 'flex';
                    window.pywebview.api.start_chat("基于刚刚的操作结果，继续推进我的命令或向我汇报工作。", activeSession.history);
                }
            });
            return;
        }

        const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
        if (activeSession) {
            activeSession.history.push({ role: "assistant", content: window.activeContentText, latency: elapsedSeconds });
            const msgIdx = activeSession.history.length - 1;
            const actionArea = document.createElement('div');
            actionArea.className = "bubble-actions";
            actionArea.innerHTML = `<button onclick="copyBubbleText(this)" class="btn-bubble-action">📋 复制全文</button><button onclick="importToSandbox(${msgIdx})" class="btn-bubble-action">📥 导入至沙盒</button><button onclick="importToSandboxDiff(${msgIdx})" class="btn-bubble-action">💡 对比导入</button><button onclick="replayBubbleVoice(this)" class="btn-bubble-action btn-bubble-voice">🔊 听语音</button>`;
            window.activeAssistantMsgElement.querySelector('.bubble-content').appendChild(actionArea);

            // 语音播报回复
            speakText(window.activeContentText);

            const metaStatsEl = document.createElement('div');
            metaStatsEl.style.fontSize = "9.5px"; metaStatsEl.style.color = "#4b5563"; metaStatsEl.style.marginTop = "4px"; metaStatsEl.style.textAlign = "right";
            metaStatsEl.textContent = `⚡ 生成耗时: ${elapsedSeconds} 秒`;
            window.activeAssistantMsgElement.querySelector('.bubble-content').appendChild(metaStatsEl);

            // 智能首句重命名逻辑
            if (activeSession.history.length === 2) {
                const firstUserMsg = activeSession.history[0].content || "";
                let cleanText = firstUserMsg.replace(/^\[已挂载文档:[^\]]+\]\s*---文件内容---[\s\S]*?---文件内容结束---\s*/i, "").trim();
                if (!cleanText) cleanText = firstUserMsg;
                
                let newTitle = cleanText.substring(0, 12);
                if (cleanText.length > 12) {
                    newTitle += "...";
                }
                
                let finalTitle = newTitle;
                let suffix = 1;
                while (window.sessions.some(s => s.id !== activeSession.id && s.title === finalTitle)) {
                    finalTitle = `${newTitle}(${suffix})`;
                    suffix++;
                }
                
                activeSession.title = finalTitle;
                renderSessionList();
            }

            saveSettingsSilent();
        }
    }

    window.activeAssistantMsgElement = null; window.activeReasoningText = ""; window.activeContentText = ""; window.isGenerating = false;
    document.getElementById('send-btn').style.display = 'flex'; document.getElementById('cancel-btn').style.display = 'none';
    updateStatusOrb("idle");
    updateSessionStatistics();
};

function runOnlineModelScan() {
    const provider = document.getElementById('config-provider').value;
    const apiBase = document.getElementById('config-api-base').value;
    const apiKey = document.getElementById('config-api-key').value.trim();
    
    if (!apiKey) {
        alert("⚠️ 请先在【接口访问凭证】中填写 API Key (密钥)！");
        return;
    }
    
    const btn = document.getElementById('btn-scan-online');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ 正在探测云端模型中...";
    
    window.pywebview.api.scan_online_models(provider, apiBase, apiKey).then(function (res) {
        btn.disabled = false;
        btn.textContent = originalText;
        
        if (res.status === 'success') {
            if (!res.models || res.models.length === 0) {
                alert("ℹ️ 未在该通道探测到有效的可用云端模型。");
                return;
            }
            
            // 过滤并合并模型列表
            window.modelList = window.modelList.filter(m => m.provider !== provider);
            window.modelList.push(...res.models);
            
            // 重新渲染模型列表与下拉框
            renderModelList();
            
            const activeId = res.models[0].id;
            populateModelDropdown(activeId);
            
            document.getElementById('config-active-model').value = activeId;
            onActiveModelChange();
            
            alert(`✅ 成功探测并载入 ${res.models.length} 个 ${provider.toUpperCase()} 云端模型！`);
        } else {
            alert("❌ 探测失败: " + res.message);
        }
    }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = originalText;
        alert("❌ 后台调用失败: " + err);
    });
}

function runOllamaRadarScan() {
    const btn = document.getElementById('btn-scan-ollama');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ 扫描中...";
    
    window.pywebview.api.scan_local_ollama_models().then(function (res) {
        btn.disabled = false;
        btn.textContent = originalText;
        if (res.status === 'success') {
            window.modelList = window.modelList.filter(m => m.provider !== 'local');
            window.modelList.push(...res.models);
            renderModelList();
            populateModelDropdown();
            alert(`✅ 成功扫描并载入 ${res.models.length} 个 Ollama 本地模型！`);
        } else {
            alert("❌ " + res.message);
        }
    }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = originalText;
        alert("❌ 扫描失败: " + err);
    });
}

function toggleWebSearchMode() {
    if (window.isGenerating) return;
    const btn = document.getElementById('btn-web-search');
    window.webSearchEnabled = !window.webSearchEnabled;
    if (window.webSearchEnabled) { btn.classList.add('active'); } else { btn.classList.remove('active'); }
    saveSettingsSilent();
}

function checkModelSupportsDrawing() {
    const activeModelId = document.getElementById('config-active-model').value;
    const model = window.modelList.find(m => m.id === activeModelId);
    if (!model) return false;
    return model.type === 'drawing' || model.id.toLowerCase().includes('drawing') || model.id.toLowerCase().includes('cogview') || model.id.toLowerCase().includes('dall-e');
}

function triggerDrawing() {
    if (window.isGenerating) return;
    if (!checkModelSupportsDrawing()) {
        const activeModelId = document.getElementById('config-active-model').value || "未选定模型";
        alert("⚠️ 当前选定模型 [" + activeModelId + "] 不支持绘图功能！请在右侧设置中切换为绘图大模型（如 Kimi-CogView-3 或 DALL-E-3）。");
        return;
    }
    
    const btn = document.getElementById('btn-draw-image');
    window.drawingEnabled = !window.drawingEnabled;
    if (window.drawingEnabled) {
        btn.classList.add('active');
        document.getElementById('msg-input').focus();
    } else {
        btn.classList.remove('active');
    }
}

window.handleSearchComplete = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const searchCard = document.getElementById('active-search-status');
    if (searchCard) {
        if (data.status === 'success') {
            searchCard.innerHTML = `🌐 联网搜索完成: 已检索到 ${data.count} 条相关实时网页信息！`;
        } else {
            searchCard.innerHTML = `⚠️ 联网搜索完成: 未检索到相关的网页实时信息。`;
        }
    }
};

function onThemeChange() {
    const themeVal = document.getElementById('config-theme').value;
    if (themeVal === 'system') {
        applySystemTheme();
    } else {
        document.body.setAttribute('data-theme', themeVal);
    }
    saveSettingsSilent();
}

function onLanguageChange() {
    const lang = document.getElementById('config-lang').value;
    applyLanguage(lang);
    saveSettingsSilent();
}

function applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (document.getElementById('config-theme').value === 'system') {
        applySystemTheme();
    }
});

function scrollToBottom(force = false) {
    const container = document.getElementById('chat-container'); if (!container) return;
    const threshold = 150; const isNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < threshold;
    if (force || isNearBottom) { container.scrollTop = container.scrollHeight; }
}

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    str = String(str);
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function handleLocalFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const filename = file.name;
    const ext = filename.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = function (evt) {
        const base64Data = evt.target.result.split(',')[1];
        window.pywebview.api.parse_uploaded_file(base64Data, filename, ext).then(function (res) {
            if (res.status === 'success') {
                window.attachedFile = res;
                renderAttachmentPreview();
            } else {
                alert("附件加载失败: " + res.message);
            }
        }).catch(function (err) {
            alert("文件读取失败: " + err);
        });
    };

    reader.readAsDataURL(file);
}

function renderAttachmentPreview() {
    const container = document.getElementById('attachment-preview');
    if (!container) return;
    if (!window.attachedFile) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    let contentHtml = '';
    
    if (window.attachedFile.type === 'image') {
        contentHtml = `
            <div class="attach-info-box">
                <img class="attach-thumbnail" src="data:image/${window.attachedFile.ext};base64,${window.attachedFile.base64}">
                <span style="font-size: 11px; font-weight: bold;">🖼️ ${escapeHTML(window.attachedFile.name)}</span>
            </div>
            <button onclick="clearAttachment()" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:12px;">✕</button>
        `;
    } else {
        contentHtml = `
            <div class="attach-info-box">
                <span style="font-size: 11px; font-weight: bold;">📄 ${escapeHTML(window.attachedFile.name)} (已挂载为上下文)</span>
            </div>
            <button onclick="clearAttachment()" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:12px;">✕</button>
        `;
    }
    
    container.innerHTML = contentHtml;
}

function clearAttachment() {
    window.attachedFile = null;
    const fileUploader = document.getElementById('file-uploader');
    if (fileUploader) fileUploader.value = '';
    renderAttachmentPreview();
}

function toggleDashboard() {
    const dash = document.querySelector('.dashboard');
    const overlay = document.getElementById('dash-overlay');
    if (dash && overlay) {
        const sessionDrawer = document.getElementById('session-drawer');
        if (sessionDrawer && sessionDrawer.classList.contains('active')) {
            sessionDrawer.classList.remove('active');
        }

        dash.classList.toggle('active');
        if (dash.classList.contains('active')) {
            overlay.style.display = 'block';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        } else {
            if (!sessionDrawer || !sessionDrawer.classList.contains('active')) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 300);
            }
        }
    }
}

function toggleSessionsDrawer() {
    const drawer = document.getElementById('session-drawer');
    const overlay = document.getElementById('dash-overlay');
    if (drawer && overlay) {
        const settingsDash = document.querySelector('.dashboard');
        if (settingsDash && settingsDash.classList.contains('active')) {
            settingsDash.classList.remove('active');
        }

        drawer.classList.toggle('active');
        if (drawer.classList.contains('active')) {
            overlay.style.display = 'block';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        } else {
            if (!settingsDash || !settingsDash.classList.contains('active')) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 300);
            }
        }
    }
}

function closeAllDrawers() {
    const sessionDrawer = document.getElementById('session-drawer');
    const dash = document.querySelector('.dashboard');
    const overlay = document.getElementById('dash-overlay');
    if (sessionDrawer) sessionDrawer.classList.remove('active');
    if (dash) dash.classList.remove('active');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
}

function updateStatusOrb(status) {
    const orb = document.getElementById('status-orb');
    const dockOrb = document.getElementById('dock-status-orb');
    if (orb) orb.className = "status-orb " + status;
    if (dockOrb) dockOrb.className = "status-orb " + status;
}

function exportChatLog() {
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (!activeSession || activeSession.history.length === 0) {
        alert("当前会话暂无记录可导出！");
        return;
    }

    let mdText = `# Chat Session: ${activeSession.title}\n\n`;
    activeSession.history.forEach(msg => {
        const roleName = msg.role === 'user' ? 'User' : (msg.role === 'system' ? 'System' : 'Assistant');
        mdText += `## ${roleName}\n\n${msg.content}\n\n---\n\n`;
    });

    const defaultFilename = `${activeSession.title.replace(/\s+/g, '_')}_ChatLog_${Date.now()}.md`;
    
    if (window.pywebview && window.pywebview.api && window.pywebview.api.export_chat_log_to_file) {
        window.pywebview.api.export_chat_log_to_file(mdText, defaultFilename).then(function(res) {
            if (res.status === 'success') {
                console.log("Chat log saved successfully to: " + res.file_path);
            } else if (res.status === 'error') {
                alert("导出失败: " + res.message);
            }
        }).catch(function(err) {
            alert("导出异常: " + err);
        });
    }
}

// 🔵 智能硬件 Orb (Hover / Click popover 状态看板控制器)
function toggleStatusPopover(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('status-popover');
    if (!popover) return;
    popover.style.display = (popover.style.display === 'none') ? 'flex' : 'none';
}

function updateHardwareRing(ringId, percent, maxCircumference) {
    const el = document.getElementById(ringId);
    if (!el) return;
    const offset = maxCircumference - (percent / 100) * maxCircumference;
    el.style.strokeDashoffset = offset;
    
    // Change color dynamically based on percent:
    // Green (0-50%) -> Yellow (50-80%) -> Orange (80-90%) -> Red (90-100%)
    let strokeColor = "#10b981"; // green
    if (percent > 90) {
        strokeColor = "#ef4444"; // red
    } else if (percent > 80) {
        strokeColor = "#f97316"; // orange
    } else if (percent > 50) {
        strokeColor = "#eab308"; // yellow
    }
    el.style.stroke = strokeColor;
}

function updateSystemStatsInPopover() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.get_system_stats) return;
    
    window.pywebview.api.get_system_stats().then(function(stats) {
        const cpuVal = Math.round(stats.cpu);
        const ramVal = Math.round(stats.ram);

        document.getElementById('pop-active-model').textContent = stats.active_model || "无";
        document.getElementById('pop-cpu-load').textContent = cpuVal + "%";
        document.getElementById('pop-ram-load').textContent = ramVal + "%";
        
        updateHardwareRing('pop-cpu-ring', cpuVal, 50);
        updateHardwareRing('pop-ram-ring', ramVal, 50);
        updateHardwareRing('drawer-cpu-ring', cpuVal, 132);
        updateHardwareRing('drawer-ram-ring', ramVal, 132);
        
        const netEl = document.getElementById('pop-network-status');
        netEl.textContent = stats.network;
        if (stats.network === '已连接') {
            netEl.className = "";
        } else {
            netEl.className = "offline";
        }
        
        const ollamaEl = document.getElementById('pop-ollama-status');
        ollamaEl.textContent = stats.ollama_status;
        if (stats.ollama_status === '运行中') {
            ollamaEl.className = "";
        } else {
            ollamaEl.className = "offline";
        }
        
        // 同时同步更新抽屉里的原有监视面板 (如果显示)
        const cpuDrawer = document.getElementById('cpu-load-val');
        const ramDrawer = document.getElementById('ram-load-val');
        if (cpuDrawer) cpuDrawer.textContent = cpuVal + "%";
        if (ramDrawer) ramDrawer.textContent = ramVal + "%";
        
        // 更新 Orb Hover 提示
        const orb = document.getElementById('dock-status-orb');
        if (orb) {
            orb.setAttribute('title', `CPU: ${cpuVal}% | RAM: ${ramVal}% | 网络: ${stats.network}`);
        }
    }).catch(function(err) {
        console.error("Failed to fetch system stats: ", err);
    });
}

function applyLanguage(lang) {
    const dict = i18n[lang] || i18n.zh;
    
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    
    // 更新 Dock 图标提示
    const btnChat = document.getElementById('dock-btn-chat');
    if (btnChat) { btnChat.title = dict.btnChat; }
    const btnSandbox = document.getElementById('dock-btn-sandbox');
    if (btnSandbox) { btnSandbox.title = dict.btnSandbox; }
    const btnSessions = document.getElementById('dock-btn-sessions');
    if (btnSessions) { btnSessions.title = dict.btnSessions; }
    const btnSettings = document.getElementById('dock-btn-settings');
    if (btnSettings) { btnSettings.title = dict.btnSettings; }
    const btnExport = document.getElementById('dock-btn-export');
    if (btnExport) { btnExport.title = dict.btnExport; }
    
    safeSetText('btn-add-session', dict.newSessionBtn);
    
    const historyTitleEl = document.querySelector('#session-drawer .sidebar-title');
    if (historyTitleEl) historyTitleEl.textContent = dict.historyTitle;
    
    const sysMonitorEl = document.querySelector('.system-monitor-card span');
    if (sysMonitorEl) sysMonitorEl.textContent = dict.sysMonitor;
    
    const monitorRows = document.querySelectorAll('.system-monitor-card .monitor-row');
    if (monitorRows.length >= 2) {
        const span0 = monitorRows[0].querySelector('span');
        if (span0) span0.textContent = dict.cpuLoad;
        const span1 = monitorRows[1].querySelector('span');
        if (span1) span1.textContent = dict.ramLoad;
    }
    
    const statRows = document.querySelectorAll('.session-stats .stat-row');
    if (statRows.length >= 2) {
        const span0 = statRows[0].querySelector('span');
        if (span0) span0.textContent = dict.sessionsCount;
        const span1 = statRows[1].querySelector('span');
        if (span1) span1.textContent = dict.charsCount;
    }
    
    const dashHeaderEl = document.querySelector('.dashboard .dash-header h3');
    if (dashHeaderEl) dashHeaderEl.textContent = dict.dashTitle;
    
    const themeLabelEl = document.querySelector('.quick-theme-panel label');
    if (themeLabelEl) themeLabelEl.textContent = dict.themeLabel;
    
    safeSetText('lbl-language', dict.langLabel);
    safeSetText('lbl-close-action', dict.lblCloseAction);
    safeSetText('btn-save-settings', dict.saveBtn);
    
    const msgInput = document.getElementById('msg-input');
    if (msgInput) msgInput.placeholder = dict.placeholderInput;
    
    safeSetText('btn-deep-thinking', dict.btnDeepThink);
    safeSetText('btn-web-search', dict.btnWebSearch);
    safeSetText('btn-draw-image', dict.btnDrawImage);
    
    const popTitleEl = document.querySelector('#status-popover .popover-title');
    if (popTitleEl) popTitleEl.textContent = dict.popTitle;
    
    const popRows = document.querySelectorAll('#status-popover .popover-row');
    if (popRows.length >= 5) {
        const span0 = popRows[0].querySelector('span');
        if (span0) span0.textContent = dict.popModel;
        const span1 = popRows[1].querySelector('span');
        if (span1) span1.textContent = dict.popCpu;
        const span2 = popRows[2].querySelector('span');
        if (span2) span2.textContent = dict.popRam;
        const span3 = popRows[3].querySelector('span');
        if (span3) span3.textContent = dict.popNetwork;
        const span4 = popRows[4].querySelector('span');
        if (span4) span4.textContent = dict.popOllama;
    }
    
    // 更新关闭软件Modal界面的语言
    safeSetText('lbl-close-title', dict.closeTitle);
    safeSetText('lbl-close-body', dict.closeBody);
    safeSetText('lbl-opt-min', dict.closeOptMin);
    safeSetText('lbl-opt-close', dict.closeOptClose);
    safeSetText('lbl-opt-remember', dict.closeRemember);
    safeSetText('btn-close-cancel', dict.btnCancel);
    safeSetText('btn-close-ok', dict.btnConfirm);
}

// 🔔 全局美化 Toast 弹窗通知函数
function showToast(message, type = 'success', duration = 3000) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-message">${escapeHTML(message)}</span>`;
    toast.className = `toast-notification ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 🚪 窗口关闭Modal逻辑
function showCloseConfirmModal() {
    const modal = document.getElementById('close-confirm-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCloseModal() {
    const modal = document.getElementById('close-confirm-modal');
    if (modal) modal.style.display = 'none';
}

function confirmCloseAction() {
    const modal = document.getElementById('close-confirm-modal');
    const rememberChk = document.getElementById('close-remember-chk');
    const selectedOpt = document.querySelector('input[name="close-opt"]:checked').value;
    
    if (rememberChk && rememberChk.checked) {
        document.getElementById('config-close-action').value = selectedOpt;
        saveSettingsSilent();
    }
    
    if (modal) modal.style.display = 'none';
    
    if (selectedOpt === 'minimize') {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.minimize_window) {
            window.pywebview.api.minimize_window();
        }
    } else {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.close_app_completely) {
            window.pywebview.api.close_app_completely();
        }
    }
}

function onCloseActionChange() {
    saveSettingsSilent();
}

const i18n = {
    zh: {
        title: "大模型工作站",
        subtitle: "读取配置中...",
        btnChat: "💬 对话",
        btnSandbox: "📝 沙盒",
        btnSessions: "📁 历史会话",
        btnSettings: "⚙️ 系统设置",
        btnExport: "📤 导出",
        newSessionBtn: "➕ 新建会话",
        historyTitle: "📁 历史会话",
        sysMonitor: "💻 系统硬件负荷监视",
        cpuLoad: "CPU 负载:",
        ramLoad: "物理内存:",
        sessionsCount: "💬 会话总数:",
        charsCount: "📝 预估字数:",
        dashTitle: "⚙️ 仪表盘 & 设置中心",
        themeLabel: "🎨 界面主题皮肤 (快捷更换)",
        langLabel: "🌐 系统语言 (Language)",
        lblCloseAction: "🚪 关闭窗口时动作",
        saveBtn: "💾 保存并应用全局配置",
        saveSuccess: "配置已成功保存！",
        saveError: "保存配置失败",
        placeholderInput: "输入问题... (Enter 键发送，Shift+Enter 换行)",
        btnDeepThink: "🧠 深度思考",
        btnWebSearch: "🌐 联网搜索",
        btnDrawImage: "🎨 绘图创作",
        popTitle: "📟 系统实时看板",
        popModel: "当前模型:",
        popCpu: "CPU 负载:",
        popRam: "物理内存:",
        popNetwork: "网络连接:",
        popOllama: "Ollama 雷达:",
        netConnected: "已连接",
        netDisconnected: "未连接",
        ollamaRunning: "运行中",
        ollamaNotRunning: "未运行",
        defaultGreeting: "这是一个全新的独立会话窗口。请随时在下方提问。",
        closeTitle: "关闭软件确认",
        closeBody: "请选择您需要执行的操作：",
        closeOptMin: "⚡ 最小化（保持后台运行）",
        closeOptClose: "❌ 关闭软件（退出程序）",
        closeRemember: "保持当前选项（记住选择，下次不再提示）",
        btnCancel: "取消",
        btnConfirm: "确定"
    },
    en: {
        title: "AI Workstation",
        subtitle: "Loading configuration...",
        btnChat: "💬 Chat",
        btnSandbox: "📝 Sandbox",
        btnSessions: "📁 Sessions",
        btnSettings: "⚙️ Settings",
        btnExport: "📤 Export",
        newSessionBtn: "➕ New Session",
        historyTitle: "📁 Sessions History",
        sysMonitor: "💻 System Load Monitor",
        cpuLoad: "CPU Load:",
        ramLoad: "Memory:",
        sessionsCount: "💬 Total Sessions:",
        charsCount: "📝 Est. Characters:",
        dashTitle: "⚙️ Dashboard & Settings",
        themeLabel: "🎨 UI Theme Skin (Quick Change)",
        langLabel: "🌐 System Language (Language)",
        lblCloseAction: "🚪 Close Window Action",
        saveBtn: "💾 Save & Apply Global Config",
        saveSuccess: "Configuration saved successfully!",
        saveError: "Failed to save configuration",
        placeholderInput: "Type a message... (Enter to send, Shift+Enter for new line)",
        btnDeepThink: "🧠 Deep Think",
        btnWebSearch: "🌐 Search",
        btnDrawImage: "🎨 Draw",
        popTitle: "📟 Live System Stats",
        popModel: "Active Model:",
        popCpu: "CPU Load:",
        popRam: "Memory RAM:",
        popNetwork: "Network:",
        popOllama: "Ollama Radar:",
        netConnected: "Connected",
        netDisconnected: "Disconnected",
        ollamaRunning: "Running",
        ollamaNotRunning: "Stopped",
        defaultGreeting: "This is a new independent chat window. Ask me anything.",
        closeTitle: "Exit Confirmation",
        closeBody: "Choose an action to perform:",
        closeOptMin: "⚡ Minimize (Run in background)",
        closeOptClose: "❌ Close (Exit application completely)",
        closeRemember: "Remember my choice (Do not ask again)",
        btnCancel: "Cancel",
        btnConfirm: "OK"
    },
    es: {
        title: "Estación IA",
        subtitle: "Cargando configuración...",
        btnChat: "💬 Chat",
        btnSandbox: "📝 Sandbox",
        btnSessions: "📁 Sesiones",
        btnSettings: "⚙️ Ajustes",
        btnExport: "📤 Exportar",
        newSessionBtn: "➕ Nueva Sesión",
        historyTitle: "📁 Historial de Sesiones",
        sysMonitor: "💻 Monitor de Hardware",
        cpuLoad: "Carga CPU:",
        ramLoad: "Memoria RAM:",
        sessionsCount: "💬 Total Sesiones:",
        charsCount: "📝 Caracteres Est.:",
        dashTitle: "⚙️ Panel y Ajustes",
        themeLabel: "🎨 Tema de Interfaz (Cambio rápido)",
        langLabel: "🌐 Idioma del Sistema (Language)",
        lblCloseAction: "🚪 Acción al Cerrar Ventana",
        saveBtn: "💾 Guardar y Aplicar Configuración",
        saveSuccess: "¡Configuración guardada con éxito!",
        saveError: "Error al guardar la configuración",
        placeholderInput: "Escribe un mensaje... (Enter para enviar)",
        btnDeepThink: "🧠 Pensar Profundo",
        btnWebSearch: "🌐 Buscar",
        btnDrawImage: "🎨 Dibujar",
        popTitle: "📟 Estado del Sistema",
        popModel: "Modelo Activo:",
        popCpu: "Carga CPU:",
        popRam: "Memoria RAM:",
        popNetwork: "Red:",
        popOllama: "Radar Ollama:",
        netConnected: "Conectado",
        netDisconnected: "Desconectado",
        ollamaRunning: "Ejecutando",
        ollamaNotRunning: "Detenido",
        defaultGreeting: "Esta es una nueva ventana de chat. Pregúntame lo que quieras.",
        closeTitle: "Confirmación de salida",
        closeBody: "Elija una acción a realizar:",
        closeOptMin: "⚡ Minimizar (Seguir en segundo plano)",
        closeOptClose: "❌ Cerrar (Salir de la aplicación)",
        closeRemember: "Recordar mi elección (No volver a preguntar)",
        btnCancel: "Cancelar",
        btnConfirm: "Aceptar"
    },
    ja: {
        title: "AI ワークステーション",
        subtitle: "設定を読み込み中...",
        btnChat: "💬 チャット",
        btnSandbox: "📝 サンドボックス",
        btnSessions: "📁 セッション",
        btnSettings: "⚙️ システム设置",
        btnExport: "📤 エクスポート",
        newSessionBtn: "➕ 新規セッション",
        historyTitle: "📁 セッション履歴",
        sysMonitor: "💻 システム負荷監視",
        cpuLoad: "CPU 負荷:",
        ramLoad: "物理メモリ:",
        sessionsCount: "💬 セッション総数:",
        charsCount: "📝 推定文字数:",
        dashTitle: "⚙️ ダッシュボードと設定",
        themeLabel: "🎨 UIテーマ（クイック変更）",
        langLabel: "🌐 システム言語 (Language)",
        lblCloseAction: "🚪 閉じる時の動作",
        saveBtn: "💾 設定を保存して適用",
        saveSuccess: "設定が正常に保存されました！",
        saveError: "設定の保存に失敗しました",
        placeholderInput: "メッセージを入力... (Enterで送信)",
        btnDeepThink: "🧠 思考モード",
        btnWebSearch: "🌐 ウェブ検索",
        btnDrawImage: "🎨 画像生成",
        popTitle: "📟 リアルタイム監視",
        popModel: "有効なモデル:",
        popCpu: "CPU 負荷:",
        popRam: "メモリ負荷:",
        popNetwork: "ネットワーク:",
        popOllama: "Ollama レーダー:",
        netConnected: "接続あり",
        netDisconnected: "接続なし",
        ollamaRunning: "稼働中",
        ollamaNotRunning: "未稼働",
        defaultGreeting: "これは新しいセッションです。何でも質問してください。",
        closeTitle: "終了確認",
        closeBody: "実行するアクションを選択してください：",
        closeOptMin: "⚡ 最小化（バックグラウンドで実行）",
        closeOptClose: "❌ 終了（アプリケーションを完全に閉じる）",
        closeRemember: "選択を記憶する（次回から表示しない）",
        btnCancel: "キャンセル",
        btnConfirm: "決定"
    },
    fr: {
        title: "Station d'IA",
        subtitle: "Chargement de la config...",
        btnChat: "💬 Chat",
        btnSandbox: "📝 Sandbox",
        btnSessions: "📁 Sessions",
        btnSettings: "⚙️ Paramètres",
        btnExport: "📤 Exporter",
        newSessionBtn: "➕ Nouvelle Session",
        historyTitle: "📁 Historique des Sessions",
        sysMonitor: "💻 Moniteur de Charge",
        cpuLoad: "Charge CPU:",
        ramLoad: "Mémoire RAM:",
        sessionsCount: "💬 Total Sessions:",
        charsCount: "📝 Caractères Est.:",
        dashTitle: "⚙️ Paramètres",
        themeLabel: "🎨 Thème d'interface (Changement)",
        langLabel: "🌐 Langue du Système (Language)",
        lblCloseAction: "🚪 Action à la Fermeture",
        saveBtn: "💾 Sauvegarder & Appliquer",
        saveSuccess: "Configuration enregistrée avec succès !",
        saveError: "Échec de l'enregistrement",
        placeholderInput: "Tapez un message... (Entrée pour envoyer)",
        btnDeepThink: "🧠 Réflexion",
        btnWebSearch: "🌐 Recherche",
        btnDrawImage: "🎨 Dessiner",
        popTitle: "📟 Statistiques Système",
        popModel: "Modèle Actif:",
        popCpu: "Charge CPU:",
        popRam: "Mémoire RAM:",
        popNetwork: "Réseau:",
        popOllama: "Radar Ollama:",
        netConnected: "Connecté",
        netDisconnected: "Déconnecté",
        ollamaRunning: "Actif",
        ollamaNotRunning: "Inactif",
        defaultGreeting: "Ceci est une nouvelle fenêtre de chat. Posez vos questions.",
        closeTitle: "Confirmation de fermeture",
        closeBody: "Choisissez une action à effectuer :",
        closeOptMin: "⚡ Minimiser (Garder en arrière-plan)",
        closeOptClose: "❌ Quitter (Fermer l'application)",
        closeRemember: "Mémoriser mon choix (Ne plus demander)",
        btnCancel: "Annuler",
        btnConfirm: "OK"
    },
    de: {
        title: "KI-Workstation",
        subtitle: "Konfiguration wird geladen...",
        btnChat: "💬 Chat",
        btnSandbox: "📝 Sandbox",
        btnSessions: "📁 Sitzungen",
        btnSettings: "⚙️ Einstellungen",
        btnExport: "📤 Exportieren",
        newSessionBtn: "➕ Neue Sitzung",
        historyTitle: "📁 Sitzungsverlauf",
        sysMonitor: "💻 Hardware-Überwachung",
        cpuLoad: "CPU-Last:",
        ramLoad: "RAM-Speicher:",
        sessionsCount: "💬 Gesamte Sitzungen:",
        charsCount: "📝 Geschätzte Zeichen:",
        dashTitle: "⚙️ Dashboard & Einstellungen",
        themeLabel: "🎨 UI-Design (Schnellwechsel)",
        langLabel: "🌐 Systemsprache (Language)",
        lblCloseAction: "🚪 Aktion beim Schließen",
        saveBtn: "💾 Speichern & Übernehmen",
        saveSuccess: "Konfiguration erfolgreich gespeichert!",
        saveError: "Fehler beim Speichern der Konfiguration",
        placeholderInput: "Nachricht eingeben... (Eingabetaste zum Senden)",
        btnDeepThink: "🧠 Denken",
        btnWebSearch: "🌐 Suche",
        btnDrawImage: "🎨 Zeichnen",
        popTitle: "📟 Live-Systemstatus",
        popModel: "Aktives Modell:",
        popCpu: "CPU-Last:",
        popRam: "RAM-Speicher:",
        popNetwork: "Netzwerk:",
        popOllama: "Ollama Radar:",
        netConnected: "Verbunden",
        netDisconnected: "Getrennt",
        ollamaRunning: "Aktiv",
        ollamaNotRunning: "Inaktiv",
        defaultGreeting: "Dies ist ein neues Chat-Fenster. Fragen Sie mich etwas.",
        closeTitle: "Schließen bestätigen",
        closeBody: "Wählen Sie eine Aktion aus:",
        closeOptMin: "⚡ Minimieren (Im Hintergrund ausführen)",
        closeOptClose: "❌ Schließen (Anwendung beenden)",
        closeRemember: "Auswahl merken (Nicht erneut fragen)",
        btnCancel: "Abbrechen",
        btnConfirm: "OK"
    },
    ru: {
        title: "Станция ИИ",
        subtitle: "Загрузка конфигурации...",
        btnChat: "💬 Чат",
        btnSandbox: "📝 Песочница",
        btnSessions: "📁 Сессии",
        btnSettings: "⚙️ Настройки",
        btnExport: "📤 Экспорт",
        newSessionBtn: "➕ Новая сессия",
        historyTitle: "📁 История сессий",
        sysMonitor: "💻 Мониторинг системы",
        cpuLoad: "Загрузка ЦП:",
        ramLoad: "Память RAM:",
        sessionsCount: "💬 Всего сессий:",
        charsCount: "📝 Оценка знаков:",
        dashTitle: "⚙️ Панель управления",
        themeLabel: "🎨 Тема интерфейса (Быстрый выбор)",
        langLabel: "🌐 Язык системы (Language)",
        lblCloseAction: "🚪 Действие при закрытии",
        saveBtn: "💾 Сохранить и применить",
        saveSuccess: "Конфигурация успешно сохранена!",
        saveError: "Ошибка сохранения конфигурации",
        placeholderInput: "Введите сообщение... (Enter для отправки)",
        btnDeepThink: "🧠 Глубокое мышление",
        btnWebSearch: "🌐 Поиск",
        btnDrawImage: "🎨 Рисовать",
        popTitle: "📟 Статус системы",
        popModel: "Активная модель:",
        popCpu: "Загрузка ЦП:",
        popRam: "Память RAM:",
        popNetwork: "Сеть:",
        popOllama: "Радар Ollama:",
        netConnected: "Подключено",
        netDisconnected: "Отключено",
        ollamaRunning: "Запущено",
        ollamaNotRunning: "Остановлено",
        defaultGreeting: "Это новое независимое окно чата. Спрашивайте.",
        closeTitle: "Подтверждение выхода",
        closeBody: "Выберите желаемое действие:",
        closeOptMin: "⚡ Свернуть (Оставить в фоне)",
        closeOptClose: "❌ Закрыть (Выйти из программы)",
        closeRemember: "Запомнить мой выбор (Не спрашивать снова)",
        btnCancel: "Отмена",
        btnConfirm: "ОК"
    }
};

function setCloseOption(val) {
    const minRadio = document.getElementById('close-opt-minimize');
    const closeRadio = document.getElementById('close-opt-close');
    if (minRadio && closeRadio) {
        if (val === 'minimize') {
            minRadio.checked = true;
            closeRadio.checked = false;
        } else {
            minRadio.checked = false;
            closeRadio.checked = true;
        }
    }
}

// ==========================================
// 🚀 阶段三：5 大硬核功能业务逻辑
// ==========================================

// 1. Spotlight 快捷命令面板
let spotlightSelectedIdx = -1;
let spotlightVisible = false;

window.toggleSpotlightOverlay = function() {
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    if (!overlay) return;
    spotlightVisible = !spotlightVisible;
    if (spotlightVisible) {
        overlay.style.display = 'flex';
        if (input) {
            input.value = '';
            input.focus();
        }
        renderSpotlightResults('');
    } else {
        overlay.style.display = 'none';
    }
};

window.handleSpotlightBackdropClick = function(e) {
    if (e.target.id === 'spotlight-overlay') {
        window.toggleSpotlightOverlay();
    }
};

const SPOTLIGHT_CMDS = [
    { id: '/clean', title: '🧹 清理临时文件', desc: '执行 Windows 系统临时文件夹清理', action: () => runBuiltinScript('clean_temp', 'powershell', 'Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue; Write-Host "✅ 临时文件清理完毕！"') },
    { id: '/ip', title: '🌐 本机网络配置', desc: '获取本机 IP 地址及适配器信息', action: () => runBuiltinScript('check_ip', 'powershell', 'ipconfig | Select-String "IPv4" | Write-Host') },
    { id: '/sandbox', title: '📝 打开沙盒编辑器', desc: '切换至 Markdown 独立写作沙盒', action: () => { window.toggleSpotlightOverlay(); switchSandboxMode('sandbox'); } },
    { id: '/settings', title: '⚙️ 打开设置中心', desc: '进入仪表盘系统设置', action: () => { window.toggleSpotlightOverlay(); toggleDashboard(); } }
];

function runBuiltinScript(id, type, code) {
    window.toggleSpotlightOverlay();
    openTerminalConsole(`内置命令: ${id}`);
    window.pywebview.api.run_custom_script_async(id, type, code);
}

function renderSpotlightResults(query) {
    const container = document.getElementById('spotlight-results');
    if (!container) return;
    container.innerHTML = '';
    spotlightSelectedIdx = -1;

    let items = [];
    if (query.startsWith('/')) {
        items = SPOTLIGHT_CMDS.filter(cmd => cmd.id.toLowerCase().includes(query.toLowerCase()));
    } else {
        if (query.trim() !== '') {
            items.push({
                id: 'ai_chat',
                title: `💬 提问 AI: "${query}"`,
                desc: '直接发送提问至当前对话会话',
                action: () => {
                    const input = document.getElementById('msg-input');
                    if (input) {
                        input.value = query;
                        sendMessage();
                    }
                    window.toggleSpotlightOverlay();
                }
            });
        }
        if (window.customScripts && window.customScripts.length > 0) {
            const filtered = window.customScripts.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
            filtered.forEach(script => {
                items.push({
                    id: `script_${script.id}`,
                    title: `🛠️ 运行自定义脚本: ${script.name}`,
                    desc: `[${script.type}] ${script.id}`,
                    action: () => {
                        window.toggleSpotlightOverlay();
                        runScript(script.id);
                    }
                });
            });
        }
    }

    if (items.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:12px; font-size:11px; color:#64748b;">未找到匹配的指令或自定义脚本</div>`;
        return;
    }

    items.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'spotlight-item';
        el.dataset.index = index;
        el.innerHTML = `
            <div class="spotlight-item-left">
                <span class="spotlight-item-title">${item.title}</span>
                <span style="font-size:10px; color:#64748b; margin-left:8px;">${item.desc}</span>
            </div>
            <span class="spotlight-item-shortcut">Enter 执行</span>
        `;
        el.onclick = function() {
            item.action();
        };
        container.appendChild(el);
    });
}

function handleSpotlightKeydown(e) {
    const container = document.getElementById('spotlight-results');
    if (!container) return;
    const items = container.querySelectorAll('.spotlight-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        spotlightSelectedIdx = (spotlightSelectedIdx + 1) % items.length;
        updateSelectedSpotlightItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        spotlightSelectedIdx = (spotlightSelectedIdx - 1 + items.length) % items.length;
        updateSelectedSpotlightItem(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (spotlightSelectedIdx >= 0 && spotlightSelectedIdx < items.length) {
            items[spotlightSelectedIdx].click();
        } else if (items.length > 0) {
            items[0].click();
        }
    } else if (e.key === 'Escape') {
        window.toggleSpotlightOverlay();
    }
}

function updateSelectedSpotlightItem(items) {
    items.forEach((item, index) => {
        if (index === spotlightSelectedIdx) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}


// 2. 沙盒 Git 差异对比双屏视图 (LCS 算法)
window.sandboxOriginalText = '';
window.sandboxModifiedText = '';

function diffLines(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const dp = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));
    
    for (let i = 1; i <= oldLines.length; i++) {
        for (let j = 1; j <= newLines.length; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    const diff = [];
    let i = oldLines.length;
    let j = newLines.length;
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            diff.unshift({ type: 'unchanged', oldLine: oldLines[i - 1], newLine: newLines[j - 1], oldNo: i, newNo: j });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'added', line: newLines[j - 1], newNo: j });
            j--;
        } else {
            diff.unshift({ type: 'deleted', line: oldLines[i - 1], oldNo: i });
            i--;
        }
    }
    return diff;
}

window.importToSandboxDiff = function(msgIdx) {
    const activeSession = window.sessions.find(s => s.id === window.activeSessionId);
    if (!activeSession) return;
    const msg = activeSession.history[msgIdx];
    if (!msg) return;

    let cleanText = msg.content;
    const thinkStartIdx = msg.content.indexOf('<think>');
    const thinkEndIdx = msg.content.indexOf('</think>');
    if (thinkStartIdx !== -1 && thinkEndIdx !== -1) {
        cleanText = msg.content.substring(0, thinkStartIdx) + msg.content.substring(thinkEndIdx + 8);
    }
    
    window.sandboxOriginalText = document.getElementById('sandbox-textarea').value;
    window.sandboxModifiedText = cleanText.trim();
    
    // 打开沙盒面板并切换为差异对比
    switchSandboxMode('sandbox');
    setSandboxMode('diff');
};

function setSandboxMode(mode) {
    const textarea = document.getElementById('sandbox-textarea');
    const preview = document.getElementById('sandbox-preview');
    const diffView = document.getElementById('sandbox-diff-view');
    
    const btnEdit = document.getElementById('btn-sandbox-mode-edit');
    const btnDiff = document.getElementById('btn-sandbox-mode-diff');
    const btnAccept = document.getElementById('btn-sandbox-accept-diff');
    const btnReject = document.getElementById('btn-sandbox-reject-diff');
    
    if (mode === 'edit') {
        textarea.style.display = 'block';
        preview.style.display = 'block';
        diffView.style.display = 'none';
        
        btnEdit.style.background = '#0284c7';
        btnDiff.style.display = 'none';
        btnAccept.style.display = 'none';
        btnReject.style.display = 'none';
        
        handleSandboxLiveInput();
    } else if (mode === 'diff') {
        textarea.style.display = 'none';
        preview.style.display = 'none';
        diffView.style.display = 'flex';
        
        btnEdit.style.background = '#475569';
        btnDiff.style.display = 'block';
        btnDiff.style.background = '#8b5cf6';
        btnAccept.style.display = 'block';
        btnReject.style.display = 'block';
        
        renderDiffView();
    }
}

function renderDiffView() {
    const container = document.getElementById('sandbox-diff-view');
    if (!container) return;
    
    const diffs = diffLines(window.sandboxOriginalText, window.sandboxModifiedText);
    
    let leftHtml = `<div class="diff-pane-header">Original (原有代码)</div><div class="diff-content">`;
    let rightHtml = `<div class="diff-pane-header">Modified (AI 建议修改)</div><div class="diff-content">`;
    
    diffs.forEach(line => {
        if (line.type === 'unchanged') {
            leftHtml += `<div class="diff-line"><span class="diff-num">${line.oldNo}</span><span class="diff-text">${escapeHTML(line.oldLine)}</span></div>`;
            rightHtml += `<div class="diff-line"><span class="diff-num">${line.newNo}</span><span class="diff-text">${escapeHTML(line.newLine)}</span></div>`;
        } else if (line.type === 'deleted') {
            leftHtml += `<div class="diff-line deleted"><span class="diff-num">${line.oldNo}</span><span class="diff-text">- ${escapeHTML(line.line)}</span></div>`;
            rightHtml += `<div class="diff-line empty"><span class="diff-num">&nbsp;</span><span class="diff-text"></span></div>`;
        } else if (line.type === 'added') {
            leftHtml += `<div class="diff-line empty"><span class="diff-num">&nbsp;</span><span class="diff-text"></span></div>`;
            rightHtml += `<div class="diff-line added"><span class="diff-num">${line.newNo}</span><span class="diff-text">+ ${escapeHTML(line.line)}</span></div>`;
        }
    });
    
    leftHtml += `</div>`;
    rightHtml += `</div>`;
    
    container.innerHTML = `
        <div id="diff-pane-left" class="diff-pane" style="border-right: 1px solid rgba(255,255,255,0.06);">${leftHtml}</div>
        <div id="diff-pane-right" class="diff-pane">${rightHtml}</div>
    `;
    
    // 双向同步滚动绑定
    const leftPane = document.getElementById('diff-pane-left');
    const rightPane = document.getElementById('diff-pane-right');
    if (leftPane && rightPane) {
        leftPane.onscroll = function() { rightPane.scrollTop = leftPane.scrollTop; rightPane.scrollLeft = leftPane.scrollLeft; };
        rightPane.onscroll = function() { leftPane.scrollTop = rightPane.scrollTop; leftPane.scrollLeft = rightPane.scrollLeft; };
    }
}

function acceptDiffChange() {
    const textarea = document.getElementById('sandbox-textarea');
    if (textarea) {
        textarea.value = window.sandboxModifiedText;
    }
    setSandboxMode('edit');
    showToast('已采纳差异修改 ✅', 'success');
}

function rejectDiffChange() {
    setSandboxMode('edit');
    showToast('已放弃差异修改 ❌', 'info');
}


// 3. 一键粘贴注入代码
function injectCodeToEditor() {
    const code = document.getElementById('sandbox-textarea').value;
    if (!code.trim()) {
        showToast('沙盒内无代码，无法注入！', 'error');
        return;
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.inject_code_to_active_editor) {
        showToast('🚀 正在注入当前光标聚焦的编辑器...', 'info');
        window.pywebview.api.inject_code_to_active_editor(code).then(function(res) {
            if (res.status === 'success') {
                showToast('注入成功！已返回主焦点', 'success');
            } else {
                showToast('注入失败: ' + res.message, 'error');
            }
        });
    }
}


// 4. 自定义快捷脚本箱
function renderCustomScripts() {
    const container = document.getElementById('custom-scripts-list');
    const drawerContainer = document.getElementById('drawer-scripts-container');
    if (container) container.innerHTML = '';
    if (drawerContainer) drawerContainer.innerHTML = '';

    if (!window.customScripts || window.customScripts.length === 0) {
        if (container) container.innerHTML = `<div style="text-align:center; padding:12px; font-size:10px; color:#64748b;">暂无已配置的自定义脚本</div>`;
        if (drawerContainer) drawerContainer.innerHTML = `<div style="text-align:center; padding:6px; font-size:9px; color:#64748b;">暂无脚本</div>`;
        return;
    }

    window.customScripts.forEach(script => {
        // 渲染设置中心的列表（可删除）
        if (container) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.background = 'rgba(255,255,255,0.03)';
            row.style.padding = '6px 8px';
            row.style.borderRadius = '5px';
            row.style.border = '1px solid rgba(255,255,255,0.04)';
            row.innerHTML = `
                <div style="font-size:11px;">
                    <b style="color:#c084fc;">${script.name}</b> 
                    <span style="font-size:9.5px; color:#64748b; margin-left:6px;">[${script.type}] ${script.id}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="runScript('${script.id}')" class="btn-secondary" style="background:#8b5cf6; padding:3px 8px; font-size:10px; cursor:pointer;">▶️ 运行</button>
                    <button onclick="deleteScript('${script.id}')" class="btn-secondary" style="background:#ef4444; padding:3px 8px; font-size:10px; cursor:pointer;">🗑️ 删除</button>
                </div>
            `;
            container.appendChild(row);
        }

        // 渲染左侧 Dock Drawer 面板中的大卡片按鈕
        if (drawerContainer) {
            const btn = document.createElement('button');
            btn.className = 'btn-new-session';
            btn.style.margin = '0';
            btn.style.padding = '6px 8px';
            btn.style.fontSize = '10.5px';
            btn.style.textAlign = 'left';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'space-between';
            btn.style.border = '1px solid rgba(168,85,247,0.3)';
            btn.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(79,70,229,0.1) 100%)';
            btn.innerHTML = `<span>🛠️ ${script.name}</span> <span style="font-size:9px; opacity:0.6;">▶️</span>`;
            btn.onclick = function() {
                runScript(script.id);
            };
            drawerContainer.appendChild(btn);
        }
    });
}

function registerCustomScript() {
    const nameEl = document.getElementById('script-name-input');
    const idEl = document.getElementById('script-id-input');
    const typeEl = document.getElementById('script-type-select');
    const codeEl = document.getElementById('script-code-input');
    
    if (!nameEl || !idEl || !codeEl) return;
    const name = nameEl.value.trim();
    const id = idEl.value.trim();
    const type = typeEl.value;
    const code = codeEl.value.trim();
    
    if (!name || !id || !code) {
        alert("请输入脚本的完整名称、ID及代码！");
        return;
    }
    
    if (window.customScripts.some(s => s.id === id)) {
        alert("脚本唯一标识已存在，请换一个 ID！");
        return;
    }
    
    window.customScripts.push({ name, id, type, code });
    nameEl.value = '';
    idEl.value = '';
    codeEl.value = '';
    
    renderCustomScripts();
    saveSettingsSilent();
    showToast('脚本注册保存成功！ ✅', 'success');
}

window.deleteScript = function(id) {
    if (confirm("确定要删除这个脚本吗？")) {
        window.customScripts = window.customScripts.filter(s => s.id !== id);
        renderCustomScripts();
        saveSettingsSilent();
        showToast('脚本已删除 🗑️', 'info');
    }
};

window.runScript = function(id) {
    const script = window.customScripts.find(s => s.id === id);
    if (!script) {
        showToast('未找到指定脚本', 'error');
        return;
    }
    openTerminalConsole(script.name);
    window.pywebview.api.run_custom_script_async(script.id, script.type, script.code);
};

// 流式终端控制
function openTerminalConsole(name) {
    const term = document.getElementById('terminal-console');
    const output = document.getElementById('terminal-output');
    const title = document.getElementById('terminal-title');
    const status = document.getElementById('terminal-status');
    if (term) term.style.display = 'flex';
    if (title) title.textContent = `🖥️ 极客脚本流式控制台 - ${name}`;
    if (output) output.textContent = '⏳ 正在初始化子进程管道环境...\n';
    if (status) status.textContent = '⏳ 运行中';
}

window.closeTerminalConsole = function() {
    const term = document.getElementById('terminal-console');
    if (term) term.style.display = 'none';
};

// 后端 subprocess 回调绑定
window.onScriptStart = function(id) {
    const output = document.getElementById('terminal-output');
    if (output) output.textContent += `[System]: 🚀 脚本 [${id}] 异步子线程拉起成功，正在监听流式 stdout...\n--------------------------------------------------\n`;
};

window.onScriptOutput = function(id, text) {
    const output = document.getElementById('terminal-output');
    if (output) {
        output.textContent += text;
        output.scrollTop = output.scrollHeight; // 滚动到底部
    }
};

window.onScriptEnd = function(id, returnCode) {
    const output = document.getElementById('terminal-output');
    const status = document.getElementById('terminal-status');
    if (output) {
        output.textContent += `\n--------------------------------------------------\n[System]: 🛑 进程运行完结，退出码: ${returnCode}\n`;
        output.scrollTop = output.scrollHeight;
    }
    if (status) {
        status.textContent = returnCode === 0 ? '✅ 运行成功' : `❌ 异常完结 (代码 ${returnCode})`;
    }
};

window.onScriptError = function(id, errMsg) {
    const output = document.getElementById('terminal-output');
    const status = document.getElementById('terminal-status');
    if (output) {
        output.textContent += `\n[System Error]: ❌ 发生异常: ${errMsg}\n`;
        output.scrollTop = output.scrollHeight;
    }
    if (status) status.textContent = '❌ 发生异常';
};


// 5. 语音输入 (STT) 与语音播报 (TTS)
let voiceRecognition = null;
let isVoiceListening = false;

function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRec();
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'zh-CN'; // 听写中文

        voiceRecognition.onresult = function(e) {
            let resultText = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    resultText += e.results[i][0].transcript;
                }
            }
            if (resultText) {
                const input = document.getElementById('msg-input');
                if (input) {
                    input.value += resultText;
                }
            }
        };

        voiceRecognition.onerror = function(e) {
            console.error('Speech recognition error:', e.error);
            showToast('语音听写出错: ' + e.error, 'error');
            stopVoiceListening();
        };

        voiceRecognition.onend = function() {
            stopVoiceListening();
        };
    } else {
        console.warn('Web Speech API is not supported in this browser.');
    }
}

function toggleVoiceRecognition() {
    if (!voiceRecognition) {
        initVoiceRecognition();
    }
    if (!voiceRecognition) {
        showToast('当前系统 WebView 不支持本地语音听写功能 ❌', 'error');
        return;
    }

    if (isVoiceListening) {
        voiceRecognition.stop();
    } else {
        startVoiceListening();
    }
}

function startVoiceListening() {
    if (!voiceRecognition) return;
    try {
        voiceRecognition.start();
        isVoiceListening = true;
        const btn = document.getElementById('voice-mic-btn');
        if (btn) {
            btn.classList.add('listening');
            btn.title = '正在收音中... 点击停止听写';
        }
        showToast('🎙️ 本地语音听写已开启，请说话...', 'success');
    } catch (err) {
        console.error(err);
    }
}

function stopVoiceListening() {
    isVoiceListening = false;
    const btn = document.getElementById('voice-mic-btn');
    if (btn) {
        btn.classList.remove('listening');
        btn.title = '点击开始语音听写';
    }
}

// Keep track of the currently playing button and audio
window.activeVoiceBtn = null;
window.currentAudio = null;

// Stop speech and reset button
window.stopSpeech = function() {
    if (window.currentAudio) {
        try {
            window.currentAudio.pause();
        } catch (e) {}
        window.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (window.activeVoiceBtn) {
        window.activeVoiceBtn.innerHTML = "🔊 听语音";
        window.activeVoiceBtn.classList.remove('speaking');
        window.activeVoiceBtn = null;
    }
};

// TTS 播报回复
window.speakText = function(text, forcePlay = false, btn = null) {
    const voiceMode = (document.getElementById('config-voice-response') || {}).value || 'disabled';
    if (voiceMode === 'disabled' && !forcePlay) return;
    
    // Toggle functionality: if the same button is clicked again, stop speech and exit
    if (btn && window.activeVoiceBtn === btn) {
        window.stopSpeech();
        return;
    }

    // Stop any currently playing audio and reset its button state
    window.stopSpeech();
    
    // Clean text by removing think tags and markdown formatters
    let cleanText = text;
    const thinkEndIdx = text.indexOf('</think>');
    if (thinkEndIdx !== -1) {
        cleanText = text.substring(thinkEndIdx + 8);
    }
    if (cleanText.includes('<think>')) {
        cleanText = cleanText.replace(/<think>[\s\S]*$/, '');
    }
    cleanText = cleanText.replace(/[*#`_\-]/g, '').trim();
    if (!cleanText) return;

    // Apply active state if a button is supplied
    if (btn) {
        window.activeVoiceBtn = btn;
        btn.innerHTML = "⏹️ 停语音";
        btn.classList.add('speaking');
    }

    const ttsType = (document.getElementById('config-tts-type') || {}).value || 'system';
    if (ttsType === 'custom_api') {
        let apiUrl = (document.getElementById('config-tts-api-url') || {}).value || '';
        if (!apiUrl) {
            apiUrl = "http://127.0.0.1:9880/?text={text}&text_language=zh";
        }
        
        // Replace {text} placeholder with URL encoded text
        const encodedText = encodeURIComponent(cleanText);
        let targetUrl = apiUrl;
        if (apiUrl.includes('{text}')) {
            targetUrl = apiUrl.replace('{text}', encodedText);
        } else {
            // fallback append
            const separator = apiUrl.includes('?') ? '&' : '?';
            targetUrl = `${apiUrl}${separator}text=${encodedText}`;
        }
        
        try {
            const audio = new Audio(targetUrl);
            window.currentAudio = audio;
            
            audio.addEventListener('ended', () => {
                if (window.activeVoiceBtn === btn) {
                    window.stopSpeech();
                }
            });
            audio.addEventListener('error', () => {
                if (window.activeVoiceBtn === btn) {
                    window.stopSpeech();
                }
            });

            audio.play().catch(err => {
                console.error("Custom TTS playback failed:", err);
                if (window.activeVoiceBtn === btn) {
                    window.stopSpeech();
                }
            });
        } catch (e) {
            console.error("Failed to create Audio instance:", e);
            if (window.activeVoiceBtn === btn) {
                window.stopSpeech();
            }
        }
    } else {
        // System Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 1000));
            utterance.lang = 'zh-CN';
            
            // Apply voice rate slider value
            const rateInput = document.getElementById('config-voice-rate');
            if (rateInput) {
                utterance.rate = parseFloat(rateInput.value) || 1.0;
            }
            
            const voices = window.speechSynthesis.getVoices();
            const selectedVoiceName = (document.getElementById('config-voice-name') || {}).value || 'default';
            
            let targetVoice = null;
            if (selectedVoiceName !== 'default') {
                targetVoice = voices.find(v => v.name === selectedVoiceName);
            }
            
            if (!targetVoice) {
                targetVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Huihui') || v.name.includes('Yaoyao') || v.name.includes('Microsoft') || v.name.includes('Google')));
            }
            
            if (targetVoice) {
                utterance.voice = targetVoice;
            }

            utterance.onend = () => {
                if (window.activeVoiceBtn === btn) {
                    window.stopSpeech();
                }
            };
            utterance.onerror = () => {
                if (window.activeVoiceBtn === btn) {
                    window.stopSpeech();
                }
            };

            window.speechSynthesis.speak(utterance);
        }
    }
};

window.replayBubbleVoice = function(btn) {
    const bubble = btn.closest('.bubble-content');
    if (!bubble) return;
    
    // Attempt to locate markdown body first
    const textNode = bubble.querySelector('.markdown-body');
    let text = "";
    if (textNode) {
        text = textNode.innerText;
    } else {
        // Fallback: use bubble innerText but clean up actions block and thinking details
        let bubbleClone = bubble.cloneNode(true);
        const reasoningBox = bubbleClone.querySelector('#active-reasoning-box') || bubbleClone.querySelector('details');
        if (reasoningBox) reasoningBox.remove();
        
        const actions = bubbleClone.querySelector('.bubble-actions');
        if (actions) actions.remove();
        
        text = bubbleClone.innerText;
    }
    
    // Call speakText with forcePlay = true and pass btn
    window.speakText(text, true, btn);
};

window.populateTtsVoices = function() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const select = document.getElementById('config-voice-name');
    if (!select) return;
    
    const savedVoiceName = window.savedVoiceName || 'default';
    select.innerHTML = '<option value="default">默认系统音色</option>';
    
    const zhVoices = voices.filter(v => v.lang.includes('zh'));
    const otherVoices = voices.filter(v => !v.lang.includes('zh'));
    
    zhVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `🇨🇳 ${v.name} (${v.lang})`;
        if (v.name === savedVoiceName) opt.selected = true;
        select.appendChild(opt);
    });
    
    otherVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `🌐 ${v.name} (${v.lang})`;
        if (v.name === savedVoiceName) opt.selected = true;
        select.appendChild(opt);
    });
};

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = window.populateTtsVoices;
    // 延迟少许拉起以防WebView加载竞态
    setTimeout(window.populateTtsVoices, 300);
}

// ==========================================
// 💬 悬浮对话面板逻辑
// ==========================================

window.floatHistory = [];
window.isGeneratingFloat = false;
window.activeFloatAssistantContent = "";
window.autoHideHistoryDialogue = true;
window.floatingDialogueHeight = 450;
window.floatingDialogueMaxWidth = 380;
window.floatHistoryFolded = false;

window.syncFloatTheme = function(theme) {
    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.body.setAttribute('data-theme', systemTheme);
    } else {
        document.body.setAttribute('data-theme', theme);
    }
};

window.resetFloatDialogue = function() {
    window.floatHistory = [];
    window.activeFloatAssistantContent = "";
    window.isGeneratingFloat = false;
    window.floatHistoryFolded = false;
    
    const list = document.getElementById('float-msg-list');
    if (list) list.innerHTML = "";
    
    const input = document.getElementById('float-input');
    if (input) {
        input.value = "";
        setTimeout(function() { input.focus(); }, 50);
    }
};

window.initFloatMode = function () {
    const floatContainer = document.getElementById('float-dialogue-container');
    if (floatContainer) floatContainer.style.display = 'flex';

    // 绑定事件
    const floatInput = document.getElementById('float-input');
    const floatSendBtn = document.getElementById('float-send-btn');
    const floatHomeBtn = document.getElementById('float-btn-home');
    const floatCloseBtn = document.getElementById('float-btn-close');

    if (floatInput) {
        floatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                sendFloatMessage();
            }
        });
    }

    if (floatSendBtn) {
        floatSendBtn.addEventListener('click', sendFloatMessage);
    }

    if (floatHomeBtn) {
        floatHomeBtn.addEventListener('click', function () {
            window.pywebview.api.show_main_window();
        });
    }

    if (floatCloseBtn) {
        floatCloseBtn.addEventListener('click', function () {
            window.pywebview.api.close_float_window_api();
        });
    }

    const btnAccept = document.getElementById('btn-clip-accept');
    const btnReject = document.getElementById('btn-clip-reject');
    if (btnAccept) btnAccept.addEventListener('click', () => window.acceptClipboardBubble());
    if (btnReject) btnReject.addEventListener('click', () => window.closeClipboardBubble());

    // 绑定悬浮窗头部拖动位移事件
    const dragHandle = document.querySelector('.float-drag-handle');
    const floatHeader = document.querySelector('.float-header');
    
    if (dragHandle && floatHeader) {
        let isDragging = false;
        let startX, startY, startWindowX, startWindowY, startWidth, startHeight;
        
        const onDragStart = function(e) {
            if (e.target.closest('.float-header-btn')) return;
            
            isDragging = true;
            startX = e.screenX;
            startY = e.screenY;
            
            startWidth = window.outerWidth;
            startHeight = window.outerHeight;
            startWindowX = window.screenX;
            startWindowY = window.screenY;
            
            e.preventDefault();
        };
        
        dragHandle.addEventListener('pointerdown', onDragStart);
        floatHeader.addEventListener('pointerdown', onDragStart);
        
        window.addEventListener('pointermove', function(e) {
            if (!isDragging || startWindowX === undefined || startWindowY === undefined) return;
            const dx = e.screenX - startX;
            const dy = e.screenY - startY;
            const newX = startWindowX + dx;
            const newY = startWindowY + dy;
            
            if (window.pywebview && window.pywebview.api && window.pywebview.api.resize_float_window_dynamic) {
                window.pywebview.api.resize_float_window_dynamic(startWidth, startHeight, newX, newY);
            }
        });
        
        const onDragEnd = function(e) {
            if (isDragging) {
                isDragging = false;
            }
        };
        
        window.addEventListener('pointerup', onDragEnd);
        window.addEventListener('pointercancel', onDragEnd);
    }

    // 绑定鼠标拉伸手柄事件
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(function(handle) {
        let isResizing = false;
        let direction = handle.getAttribute('data-direction');
        let startX, startY, startWidth, startHeight, startWindowX, startWindowY;
        
        handle.addEventListener('pointerdown', function(e) {
            isResizing = true;
            startX = e.screenX;
            startY = e.screenY;
            
            startWidth = window.outerWidth;
            startHeight = window.outerHeight;
            startWindowX = window.screenX;
            startWindowY = window.screenY;
            
            try {
                handle.setPointerCapture(e.pointerId);
            } catch (err) {
                console.error("Failed to set pointer capture:", err);
            }
            e.preventDefault();
        });
        
        handle.addEventListener('pointermove', function(e) {
            if (!isResizing || startWidth === undefined) return;
            
            const dx = e.screenX - startX;
            const dy = e.screenY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startWindowX;
            let newY = startWindowY;
            
            const minWidth = 150, maxWidth = 800;
            const minHeight = 150, maxHeight = 800;
            
            // 计算宽度和 X
            if (direction.includes('right')) {
                newWidth = startWidth + dx;
                if (newWidth < minWidth) newWidth = minWidth;
                if (newWidth > maxWidth) newWidth = maxWidth;
            } else if (direction.includes('left')) {
                newWidth = startWidth - dx;
                if (newWidth < minWidth) {
                    newWidth = minWidth;
                    newX = startWindowX + startWidth - minWidth;
                } else if (newWidth > maxWidth) {
                    newWidth = maxWidth;
                    newX = startWindowX + startWidth - maxWidth;
                } else {
                    newX = startWindowX + dx;
                }
            }
            
            // 计算高度和 Y
            if (direction.includes('bottom')) {
                newHeight = startHeight + dy;
                if (newHeight < minHeight) newHeight = minHeight;
                if (newHeight > maxHeight) newHeight = maxHeight;
            } else if (direction.includes('top')) {
                newHeight = startHeight - dy;
                if (newHeight < minHeight) {
                    newHeight = minHeight;
                    newY = startWindowY + startHeight - minHeight;
                } else if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    newY = startWindowY + startHeight - maxHeight;
                } else {
                    newY = startWindowY + dy;
                }
            }
            
            if (window.pywebview && window.pywebview.api && window.pywebview.api.resize_float_window_dynamic) {
                window.pywebview.api.resize_float_window_dynamic(newWidth, newHeight, newX, newY);
            }
        });
        
        handle.addEventListener('pointerup', function(e) {
            if (isResizing) {
                isResizing = false;
                try {
                    handle.releasePointerCapture(e.pointerId);
                } catch (err) {}
                
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_float_size) {
                    window.pywebview.api.save_float_size(window.outerWidth, window.outerHeight);
                }
            }
        });
        
        handle.addEventListener('pointercancel', function(e) {
            if (isResizing) {
                isResizing = false;
                try {
                    handle.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
        });
    });

    // 重写流式更新，重定向到悬浮窗
    window.handleStreamChunk = function (payload) {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        if (data.content) {
            window.activeFloatAssistantContent += data.content;
            
            // 检测 AI 的决策标记 [FOLD]
            if (window.activeFloatAssistantContent.startsWith('[FOLD]')) {
                window.floatHistoryFolded = true;
                window.activeFloatAssistantContent = window.activeFloatAssistantContent.replace('[FOLD]', '').trim();
            }
            
            // 更新最后一条消息 of temporary message
            if (window.floatHistory.length > 0) {
                window.floatHistory[window.floatHistory.length - 1].content = window.activeFloatAssistantContent;
            }
            
            window.renderFloatHistory();
        }
    };

    
window.handleDrawingProgress = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const bar = document.getElementById('drawing-progress-bar');
    const text = document.getElementById('drawing-progress-text');
    if (bar) { bar.style.width = (data.progress || 0) + '%'; bar.style.background = '#ec4899'; }
    if (text) { text.textContent = data.message || '正在生成...'; }
};

window.handleImageGenerated = function (payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    console.log("[IMAGE] handleImageGenerated", data.status, data.message || "");
    window.isGenerating = false;
    document.getElementById('send-btn').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'none';
    updateStatusOrb("idle");
    var pb = document.getElementById('drawing-progress-bar');
    if (data.status === 'success') {
        if (pb) {
            pb.style.width = '100%'; pb.style.background = '#10b981';
            var txt = document.getElementById('drawing-progress-text');
            if (txt) txt.textContent = '✅ 生成完成';
            setTimeout(function() {
                var bubble = pb.closest('.bubble-wrap');
                if (bubble) {
                    var bc = bubble.querySelector('.bubble-content');
                    bc.innerHTML = '<img src="' + data.image_url + '" style="max-width:100%;border-radius:12px;">';
                }
                scrollToBottom(true);
            }, 300);
        } else {
            var container = document.getElementById('chat-container');
            var wrap = document.createElement('div'); wrap.className = "bubble-wrap";
            wrap.innerHTML = '<div class="avatar ai">AI</div><div class="bubble-content"><img src="' + data.image_url + '" style="max-width:100%;border-radius:12px;"></div>';
            container.appendChild(wrap);
            scrollToBottom(true);
        }
        var activeSession = window.sessions.find(function(s) { return s.id === window.activeSessionId; });
        if (activeSession) {
            activeSession.history.push({ role: "assistant", content: "[生成图片: " + (data.filename || '') + "]", image_url: data.image_url });
            saveSettingsSilent();
        }
        updateSessionStatistics();
    } else {
        var errMsg = data.message || '未知错误';
        console.error("[IMAGE] Error:", errMsg);
        if (pb) {
            pb.style.width = '100%'; pb.style.background = '#ef4444';
            var txt2 = document.getElementById('drawing-progress-text');
            if (txt2) txt2.textContent = '❌ ' + errMsg;
        }
        // Always show error in chat
        var container2 = document.getElementById('chat-container');
        var wrap2 = document.createElement('div'); wrap2.className = "bubble-wrap";
        wrap2.innerHTML = '<div class="avatar ai">AI</div><div class="bubble-content" style="color:#ef4444;font-size:12px;">❌ 画图失败: ' + escapeHTML(errMsg) + '</div>';
        container2.appendChild(wrap2);
        scrollToBottom(true);
    }
};;;

window.handleStreamEnd = function () {
        window.isGeneratingFloat = false;
        
        // 如果返回内容被过滤后依然是 [FOLD] 打头的残余，做一次安全清理
        if (window.floatHistory.length > 0) {
            let finalContent = window.floatHistory[window.floatHistory.length - 1].content;
            if (finalContent.startsWith('[FOLD]')) {
                finalContent = finalContent.replace('[FOLD]', '').trim();
                window.floatHistory[window.floatHistory.length - 1].content = finalContent;
                window.renderFloatHistory();
            }
        }
    };

    // 读取当前会话历史和配置
    window.pywebview.api.get_config().then(function (config) {
        window.autoHideHistoryDialogue = config.auto_hide_history_dialogue !== undefined ? config.auto_hide_history_dialogue : true;
        
        // 背景效果跟随主屏幕主题
        const activeTheme = config.theme || "dark";
        window.syncFloatTheme(activeTheme);

        // 每次打开都是全新的，清空历史记录
        window.resetFloatDialogue();
    });
};

window.toggleFloatHistoryFold = function () {
    window.floatHistoryFolded = !window.floatHistoryFolded;
    window.renderFloatHistory();
};

window.renderFloatHistory = function () {
    const list = document.getElementById('float-msg-list');
    if (!list) return;
    list.innerHTML = "";

    const autoHide = window.autoHideHistoryDialogue;
    const history = window.floatHistory || [];

    if (autoHide && window.floatHistoryFolded && history.length >= 3) {
        // 自动折叠历史消息，仅显示最新一条 AI 回复结果
        let lastAssistantMsg = null;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'assistant') {
                lastAssistantMsg = history[i];
                break;
            }
        }
        
        if (lastAssistantMsg) {
            const bubble = window.createFloatMsgBubble('ai', lastAssistantMsg.content);
            list.appendChild(bubble);
        } else if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            const bubble = window.createFloatMsgBubble(lastMsg.role === 'user' ? 'user' : 'ai', lastMsg.content);
            list.appendChild(bubble);
        }
    } else {
        // 保留全部历史对话
        history.forEach(function (msg) {
            const role = msg.role === 'user' ? 'user' : 'ai';
            const bubble = window.createFloatMsgBubble(role, msg.content);
            list.appendChild(bubble);
        });
    }

    list.scrollTop = list.scrollHeight;
    setTimeout(function() {
        list.scrollTop = list.scrollHeight;
    }, 50);
};

window.createFloatMsgBubble = function (role, content) {
    const div = document.createElement('div');
    div.className = `float-msg ${role}`;
    
    // 移除 markdown 或者 <think> 标签的内部思考内容
    let displayContent = content;
    if (content.includes('<think>')) {
        const thinkEnd = content.indexOf('</think>');
        if (thinkEnd !== -1) {
            displayContent = content.substring(thinkEnd + 8).trim();
        } else {
            displayContent = content.substring(0, content.indexOf('<think>')).trim();
        }
    }
    
    displayContent = displayContent.trim();
    
    // 如果剥离后还是空白或临时占位，则显示加载点
    if (!displayContent || displayContent === '...') {
        displayContent = '🤔 思考中...';
        div.textContent = displayContent;
        return div;
    }
    
    const MAX_PREVIEW_LEN = 80;
    
    if (role === 'ai' && displayContent.length > MAX_PREVIEW_LEN && !window.isGeneratingFloat) {
        // AI 长消息自动压缩：显示摘要 + 展开按钮
        const previewText = displayContent.substring(0, MAX_PREVIEW_LEN) + '...';
        const previewSpan = document.createElement('span');
        previewSpan.textContent = previewText;
        previewSpan.className = 'float-msg-preview';
        
        const fullSpan = document.createElement('span');
        fullSpan.textContent = displayContent;
        fullSpan.className = 'float-msg-full';
        fullSpan.style.display = 'none';
        
        const toggleBtn = document.createElement('span');
        toggleBtn.textContent = ' 📖展开';
        toggleBtn.style.cssText = 'color:#a78bfa; cursor:pointer; font-size:11px; font-weight:bold; margin-left:4px; user-select:none;';
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isExpanded = fullSpan.style.display !== 'none';
            if (isExpanded) {
                fullSpan.style.display = 'none';
                previewSpan.style.display = '';
                toggleBtn.textContent = ' 📖展开';
            } else {
                fullSpan.style.display = '';
                previewSpan.style.display = 'none';
                toggleBtn.textContent = ' 📕收起';
            }
        });
        
        div.appendChild(previewSpan);
        div.appendChild(fullSpan);
        div.appendChild(toggleBtn);
    } else {
        div.textContent = displayContent;
    }
    
    // 点击气泡可以折叠/展开历史（但不影响展开按钮的点击）
    div.title = "点击折叠/展开历史对话";
    div.style.cursor = "pointer";
    div.addEventListener('click', function(e) {
        if (e.target.closest('.float-msg-preview, .float-msg-full')) return;
        if (e.target.style && e.target.style.color === 'rgb(167, 139, 250)') return; // 展开按钮
        window.toggleFloatHistoryFold();
    });
    
    return div;
};

window.sendFloatMessage = function () {
    const input = document.getElementById('float-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || window.isGeneratingFloat) return;

    input.value = "";
    
    // 记录用户消息
    window.floatHistory.push({ role: 'user', content: text });
    
    // 新建 AI 临时空消息槽，开始流式拉取
    window.activeFloatAssistantContent = "";
    window.isGeneratingFloat = true;
    window.floatHistory.push({ role: 'assistant', content: '...' });
    
    // 输入新指令时，暂时展开历史，方便用户确认
    window.floatHistoryFolded = false;
    window.renderFloatHistory();
    
    // 去掉最后两个占位项，用于向 Python 提交的历史上下文
    const sendHistory = window.floatHistory.slice(0, -2);
    // 从悬浮窗发送，调用专用方法通知主窗口同步追加 user 泡泡
    window.pywebview.api.start_chat_from_float(text, sendHistory);
};

window.adjustFloatWindowSize = function () {
    // 尺寸交由拉伸手柄和滑块管理，不作固定死宽度高度
};

// ==========================================
// 【新增】：剪贴板动作气泡 (Popover Bubble) 流程管理
// ==========================================
let clipBubbleTimeout = null;

window.showClipboardBubble = function (text) {
    const popover = document.getElementById('clip-popover');
    const container = document.getElementById('float-dialogue-container');
    const textEl = document.getElementById('clip-popover-text');
    if (!popover || !container || !textEl) return;

    textEl.textContent = text;
    container.classList.add('popover-mode');
    popover.style.display = 'flex';

    if (clipBubbleTimeout) clearTimeout(clipBubbleTimeout);
    clipBubbleTimeout = setTimeout(function () {
        window.closeClipboardBubble();
    }, 6000);
};

window.acceptClipboardBubble = function () {
    if (clipBubbleTimeout) clearTimeout(clipBubbleTimeout);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.accept_clipboard_bubble) {
        window.pywebview.api.accept_clipboard_bubble().then(function (res) {
            const container = document.getElementById('float-dialogue-container');
            const popover = document.getElementById('clip-popover');
            if (container) container.classList.remove('popover-mode');
            if (popover) popover.style.display = 'none';

            if (res && res.status === 'success') {
                const input = document.getElementById('float-input');
                if (input) {
                    input.value = res.text || "";
                    window.sendFloatMessage();
                }
            }
        });
    }
};

window.closeClipboardBubble = function () {
    if (clipBubbleTimeout) clearTimeout(clipBubbleTimeout);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.close_clipboard_bubble) {
        window.pywebview.api.close_clipboard_bubble().then(function (res) {
            const container = document.getElementById('float-dialogue-container');
            const popover = document.getElementById('clip-popover');
            if (container) container.classList.remove('popover-mode');
            if (popover) popover.style.display = 'none';
        });
    }
};

// ==========================================
// 【新增】：智能文件分拣舱 (File Sorting Workspace) 流程管理
// ==========================================
window.sortCurrentFiles = [];
window.sortCurrentPlan = {};

// 1. 选择文件夹点击回调
window.sortSelectDirectory = function () {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.select_folder_dialog) {
        window.pywebview.api.select_folder_dialog().then(function (res) {
            if (res && res.status === 'success') {
                const pathInput = document.getElementById('sort-dir-path');
                if (pathInput) {
                    pathInput.value = res.path;
                    window.sortScanDirectory(res.path);
                }
            } else if (res && res.status === 'error') {
                alert("选择文件夹错误: " + res.message);
            }
        });
    }
};

// 2. 扫描并渲染待分拣列表
window.sortScanDirectory = function (path) {
    if (!path) return;
    
    const fileListDiv = document.getElementById('sort-file-list');
    const filesCountSpan = document.getElementById('sort-files-count');
    const btnGenPlan = document.getElementById('btn-sort-generate-plan');
    const btnExecuteSort = document.getElementById('btn-sort-execute');
    const statusMsg = document.getElementById('sort-status-message');
    const categoryListDiv = document.getElementById('sort-category-list');
    
    if (!fileListDiv) return;
    
    fileListDiv.innerHTML = '<div style="color: #64748b; text-align: center; margin-top: 50px;">正在读取文件列表中...</div>';
    if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.textContent = "⏳ 正在读取目标文件夹...";
        statusMsg.style.color = "#94a3b8";
    }
    
    if (btnGenPlan) btnGenPlan.disabled = true;
    if (btnExecuteSort) btnExecuteSort.disabled = true;
    if (categoryListDiv) categoryListDiv.innerHTML = '<div style="color: #64748b; text-align: center; margin-top: 60px;">等待生成分拣计划</div>';
    
    window.sortCurrentFiles = [];
    window.sortCurrentPlan = {};
    
    if (window.pywebview && window.pywebview.api && window.pywebview.api.scan_directory) {
        window.pywebview.api.scan_directory(path).then(function (res) {
            if (res && res.status === 'success') {
                window.sortCurrentFiles = res.files || [];
                if (filesCountSpan) filesCountSpan.textContent = window.sortCurrentFiles.length;
                
                if (window.sortCurrentFiles.length === 0) {
                    fileListDiv.innerHTML = '<div style="color: #64748b; text-align: center; margin-top: 50px;">文件夹下无任何可分拣的直属文件</div>';
                    if (statusMsg) {
                        statusMsg.textContent = "📁 文件夹扫描完毕，未发现直属文件。";
                        statusMsg.style.color = "#eab308";
                    }
                    return;
                }
                
                // 渲染列表
                fileListDiv.innerHTML = '';
                window.sortCurrentFiles.forEach(function (f) {
                    const item = document.createElement('div');
                    item.className = 'sort-file-item';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'sort-file-name';
                    nameSpan.textContent = f.filename;
                    
                    const sizeSpan = document.createElement('span');
                    sizeSpan.className = 'sort-file-size';
                    
                    let sizeStr = f.size + " B";
                    if (f.size > 1024 * 1024) {
                        sizeStr = (f.size / (1024 * 1024)).toFixed(2) + " MB";
                    } else if (f.size > 1024) {
                        sizeStr = (f.size / 1024).toFixed(2) + " KB";
                    }
                    sizeSpan.textContent = sizeStr;
                    
                    item.appendChild(nameSpan);
                    item.appendChild(sizeSpan);
                    fileListDiv.appendChild(item);
                });
                
                if (btnGenPlan) btnGenPlan.disabled = false;
                if (statusMsg) {
                    statusMsg.textContent = "✅ 成功读取到了 " + window.sortCurrentFiles.length + " 个待分拣文件，可以开始预演生成整理计划。";
                    statusMsg.style.color = "#10b981";
                }
            } else {
                fileListDiv.innerHTML = '<div style="color: #ef4444; text-align: center; margin-top: 50px;">扫描失败：' + (res ? res.message : '未知错误') + '</div>';
                if (statusMsg) {
                    statusMsg.textContent = "❌ 扫描失败: " + (res ? res.message : '未知错误');
                    statusMsg.style.color = "#ef4444";
                }
            }
        }).catch(function (err) {
            fileListDiv.innerHTML = '<div style="color: #ef4444; text-align: center; margin-top: 50px;">扫描异常：' + err + '</div>';
        });
    }
};

// 3. 生成分拣预演计划
window.sortGeneratePlan = function () {
    const pathInput = document.getElementById('sort-dir-path');
    if (!pathInput) return;
    const path = pathInput.value.trim();
    if (!path || window.sortCurrentFiles.length === 0) return;
    
    const categoryListDiv = document.getElementById('sort-category-list');
    const statusMsg = document.getElementById('sort-status-message');
    const btnGenPlan = document.getElementById('btn-sort-generate-plan');
    const btnExecuteSort = document.getElementById('btn-sort-execute');
    
    if (categoryListDiv) {
        categoryListDiv.innerHTML = '<div style="color: #a855f7; text-align: center; margin-top: 60px; text-shadow: 0 0 4px rgba(168,85,247,0.2);">🤖 AI 正在对文件列表归类建档...</div>';
    }
    if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.textContent = "⏳ 正在分析文件特征并生成分类目录结构...";
        statusMsg.style.color = "#c084fc";
    }
    if (btnGenPlan) btnGenPlan.disabled = true;
    if (btnExecuteSort) btnExecuteSort.disabled = true;
    
    if (window.pywebview && window.pywebview.api && window.pywebview.api.generate_sorting_plan_api) {
        window.pywebview.api.generate_sorting_plan_api(path, window.sortCurrentFiles).then(function (res) {
            if (btnGenPlan) btnGenPlan.disabled = false;
            
            if (res && res.status === 'success') {
                window.sortCurrentPlan = res.plan || {};
                
                const categories = {};
                for (const [filename, folder] of Object.entries(window.sortCurrentPlan)) {
                    if (!categories[folder]) {
                        categories[folder] = [];
                    }
                    categories[folder].push(filename);
                }
                
                if (categoryListDiv) {
                    categoryListDiv.innerHTML = '';
                    for (const [folder, files] of Object.entries(categories)) {
                        const card = document.createElement('div');
                        card.className = 'sort-category-card';
                        
                        const header = document.createElement('div');
                        header.className = 'sort-category-header';
                        
                        const folderSpan = document.createElement('span');
                        folderSpan.textContent = "📁 " + folder;
                        
                        const countSpan = document.createElement('span');
                        countSpan.style.color = "var(--accent-color)";
                        countSpan.textContent = files.length + " 个文件";
                        
                        header.appendChild(folderSpan);
                        header.appendChild(countSpan);
                        card.appendChild(header);
                        
                        const filesListDiv = document.createElement('div');
                        filesListDiv.className = 'sort-category-files';
                        files.forEach(function (filename) {
                            const fItem = document.createElement('div');
                            fItem.className = 'sort-category-file-item';
                            fItem.textContent = "📄 " + filename;
                            filesListDiv.appendChild(fItem);
                        });
                        
                        card.appendChild(filesListDiv);
                        categoryListDiv.appendChild(card);
                    }
                }
                
                if (btnExecuteSort) btnExecuteSort.disabled = false;
                if (statusMsg) {
                    const modeText = res.mode === 'ai' ? "🤖 AI 大模型生成" : "🛠️ 本地规则引擎生成";
                    statusMsg.textContent = "⚡ " + modeText + " 计划预演完毕！请确认无误后点击“一键执行分拣”。";
                    statusMsg.style.color = "#a855f7";
                }
            } else {
                if (categoryListDiv) categoryListDiv.innerHTML = '<div style="color: #ef4444; text-align: center; margin-top: 60px;">预演方案生成失败：' + (res ? res.message : '未知错误') + '</div>';
                if (statusMsg) {
                    statusMsg.textContent = "❌ 预演方案生成失败: " + (res ? res.message : '未知错误');
                    statusMsg.style.color = "#ef4444";
                }
            }
        }).catch(function (err) {
            if (btnGenPlan) btnGenPlan.disabled = false;
            if (categoryListDiv) categoryListDiv.innerHTML = '<div style="color: #ef4444; text-align: center; margin-top: 60px;">分拣分析异常：' + err + '</div>';
        });
    }
};

// 4. 执行物理分拣
window.sortExecutePlan = function () {
    const pathInput = document.getElementById('sort-dir-path');
    if (!pathInput) return;
    const path = pathInput.value.trim();
    if (!path || Object.keys(window.sortCurrentPlan).length === 0) return;
    
    const statusMsg = document.getElementById('sort-status-message');
    const btnExecuteSort = document.getElementById('btn-sort-execute');
    const btnGenPlan = document.getElementById('btn-sort-generate-plan');
    
    if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.textContent = "⏳ 正在物理转移整理磁盘文件，请稍候...";
        statusMsg.style.color = "#eab308";
    }
    if (btnExecuteSort) btnExecuteSort.disabled = true;
    if (btnGenPlan) btnGenPlan.disabled = true;
    
    if (window.pywebview && window.pywebview.api && window.pywebview.api.execute_sorting_plan) {
        window.pywebview.api.execute_sorting_plan(path, window.sortCurrentPlan).then(function (res) {
            if (res && (res.status === 'success' || res.status === 'partial_success')) {
                alert("✨ 文件整理分拣成功！\n成功移动了 " + res.moved + " 个文件。");
                if (res.status === 'partial_success' && res.errors) {
                    console.warn("部分分拣失败: ", res.errors);
                    alert("部分文件整理失败，详情请查看系统控制台。");
                }
                
                window.sortScanDirectory(path);
            } else {
                alert("❌ 文件整理分拣失败: " + (res ? res.message : '未知错误'));
                if (btnExecuteSort) btnExecuteSort.disabled = false;
                if (btnGenPlan) btnGenPlan.disabled = false;
                if (statusMsg) {
                    statusMsg.textContent = "❌ 整理失败: " + (res ? res.message : '未知错误');
                    statusMsg.style.color = "#ef4444";
                }
            }
        }).catch(function (err) {
            alert("物理分拣异常: " + err);
            if (btnExecuteSort) btnExecuteSort.disabled = false;
            if (btnGenPlan) btnGenPlan.disabled = false;
        });
    }
};
