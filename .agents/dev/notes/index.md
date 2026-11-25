# fastcli 长期知识

按当前任务选择主题，再核对笔记链接的源码。发布状态和历史操作分别查阅 [npm 发布手册](../deploy/npm/runbook.md) 与[发布记录](../deploy/npm/releases/README.md)。

| 主题 | 何时读取 | 记录 |
| --- | --- | --- |
| 内置工具、启动入口、管理目标 | 解释安装状态或修改检测与管理流程 | [术语](glossary.md) |
| 运行与数据边界 | 修改 CLI 分派、进程、配置或自定义命令 | [CLI 模块背景](context/cli-manager.md) |
| 产品边界和接口退役 | 调整内置目录、启动策略或旧数据兼容 | [ADR-001 专用管理器](decisions/2026-10-16-dedicated-cli-manager.md) · [ADR-002 启动与管理归属](decisions/2026-10-16-launch-and-npm-ownership.md) |
| npm 发布策略 | 修改发布工作流、权限或失败恢复 | [暂存发布决定](decisions/2026-10-17-staged-npm-publishing.md) |
