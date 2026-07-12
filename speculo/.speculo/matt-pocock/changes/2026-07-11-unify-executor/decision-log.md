# 决策日志 — 统一 Executor

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| 1 | executeCommand 去留 | **路径 A：移除** | 代码核查发现 executeCommand 无任何外部调用方（仅 executeCommandChain 内部 Windows 回退自调用）；保留薄包装器无意义 |
| 2 | 提取 spawnOnce 私有原语 | **维持原设计** | spawn + promise + 信号转发 + error/exit 提取为单一原语，消除 ~40 行重复；成为唯一接触 spawn 的模块 |
| 3 | n=1 打印格式 | **维持原设计** | n=1 打印 `$ <cmd>` 不带 `[1/1]` 前缀；n>1 打印 `[i/N] $ <cmd>` |
| 4 | 测试策略 | **调整：两层** | 移除 executeCommand 消灭第三层 smoke 测试；spawnOnce 层 + executeChain 层（含新增 n=1 覆盖），零重复覆盖 |
