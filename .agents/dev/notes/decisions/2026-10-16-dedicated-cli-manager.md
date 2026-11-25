# ADR-001 专用 CLI 与结构化执行

2026-10-16 接受。原决定编号和访谈记录保留在重构档案中。 [原 ADR](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/ADR.md) · [决策原文 LOG-001、LOG-005、LOG-013](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/LOG.md)

曾考虑重构 CLI 并保留辅助功能。用户选择将 fastcli 精简为固定六工具的启动、检测和 npm 管理器，接受退役通用命令链、Web 编辑器和旧管理接口。固定工具目录与结构化执行使工具参数和管理目标可单独检验。旧 `tools.json` 保留原样，旧数据不参与启动。 [内置目录](../../../../src/builtin/tools.ts) · [CLI 分派](../../../../src/cli/app.ts)

后续增加了独立的自定义命令菜单。它保存用户选择的解释器和整行命令，继续与内置工具目录、旧工具文件和直接 argv 派发保持独立。 [当前 CLI 模块背景](../context/cli-manager.md)
