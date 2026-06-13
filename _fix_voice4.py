import sys
sys.stdout.reconfigure(encoding="utf-8")

with open(r"D:\ai_assistant\ai_ui_assistant\app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. No-op initVoiceRecognition
old = "function initVoiceRecognition() {"
new = "function initVoiceRecognition() { return; /* removed */ //"
content = content.replace(old, new)

# 2. No-op startVoiceListening
old = "function startVoiceListening() {"
new = "function startVoiceListening() { return; /* removed */ //"
content = content.replace(old, new)

# 3. No-op stopVoiceListening (make it do nothing)  
old = "function stopVoiceListening() {"
new = "function stopVoiceListening() { return; /* removed */ //"
content = content.replace(old, new)

# 4. No-op populateTtsVoices
old = "window.populateTtsVoices = function() {"
new = "window.populateTtsVoices = function() { return; /* removed */ //"
content = content.replace(old, new)

# 5. Remove speechSynthesis.cancel() call in handleStreamEnd
old = "    if ('speechSynthesis' in window) {\n        window.speechSynthesis.cancel();\n    }"
content = content.replace(old, "    // speechSynthesis.cancel() removed")
print("Cancel removed:", "OK" if "speechSynthesis.cancel()" not in content else "FAIL")

# 6. Remove onvoiceschanged handler
old = "    window.speechSynthesis.onvoiceschanged = window.populateTtsVoices;"
content = content.replace(old, "    // onvoiceschanged removed")
print("Handler removed:", "OK" if "onvoiceschanged" not in content else "FAIL")

bc = content.count("{")
be = content.count("}")
print(f"Braces: {bc}/{be}")

with open(r"D:\ai_assistant\ai_ui_assistant\app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Written")
