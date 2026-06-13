# Rules — Token Optimized

## 核心优先级
1. 最小 Token 消耗 → 2. 修正确 → 3. 最小改动
当前源码为唯一真相源，禁止还原历史代码。

## 读文件规则
先定位相关文件（错误文件→调用链→配置），再读。不扫全仓、不读无关模块。
只读执行路径上的文件，超 20 个需说明原因。
避开：backup/archive/old/temp/examples/logs/memory/.git/__pycache__

## 改动规则
只修目标问题和必要配套改动。禁止：大重构、目录重组、纯风格重写、无关优化、动依赖。

## 历史代码
可查看，不可还原。不滚回、不复制 backup 到 src。除非明确要求。

## 计划
3步+复杂任务：先写 `plans/<任务名>.md`，仅保留 Todo / Doing / Done，中断可续。

## 重试
网络/API 调用用 `@retry(max_attempts=3, delay=1, backoff=2)`，指数退避+jitter。函数式 `Retry.call(func, max_attempts=3)`。

## Bug 记录
```
现象 → 根因 → 修复 → 教训
```
每次写入 `memory/YYYY-MM-DD.md`；涉及全局规则同步写入 `MEMORY.md`。
提 bug 时附：目标文件、期望行为、当前现象。

## 失败方案记忆
记录尝试和失败原因，不重复已验证失败的方案。

## 验证
改完即测：语法→逻辑→边界，附验证报告（文件+结果）。

## 追踪
- `.token_tracker.json`：每10次调用写盘，失败不影响主流程
- `.balance_snapshot.json`：每天首次锁定余额基线，差值算当日消耗
- DeepSeek 缓存命中：`🎯 缓存: X/Y tokens (Z%)`

## 子Agent
仅特定域（抖音、模拟盘等）按需召唤，不自带运行。

## 输出规范
只返回：改了哪些文件、改了什么、验证结果。用 diff，不打全文件。精简、要点化。