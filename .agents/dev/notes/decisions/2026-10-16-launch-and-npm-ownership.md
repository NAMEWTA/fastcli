# ADR-002 启动选择与 npm 管理归属

2026-10-16 接受。用户选择让所有可发现来源的安装均可启动，变更操作仅作用于当前 npm 全局环境。PATH 为默认启动选择，歧义时由用户决定本次入口。其他来源的安装与账号数据保持独立。 [原 ADR](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/ADR.md) · [决策原文 LOG-004、LOG-008](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/LOG.md)

安装、更新和卸载固定经检查的 npm prefix。npm 安装成功只证明该管理目标已更新。确认默认入口也已更新时，需要同时验证入口实际路径和版本，因为两份独立安装可能报告同一版本。 [npm 管理边界](../../../../src/core/npm-manager.ts) · [PATH 入口报告](../../../../src/cli/actions.ts) · [后续确认与回归证据](../../archive/changes/implemented/bug-fix_2026-10-17-npm-launch-alignment/evidence.md)

Volta 归属核验用于 fastcli 自身更新。内置 AI CLI 管理仍由当前 npm 全局范围负责。 [自身安装核验](../../../../src/core/self-update.ts)
