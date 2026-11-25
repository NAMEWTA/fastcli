# fastcli 术语

| 术语 | 含义 | 实现 |
| --- | --- | --- |
| 内置工具、支持工具 | 固定目录中的六个 AI CLI。自定义命令是单独的菜单功能。 | [工具目录](../../../src/builtin/tools.ts) |
| 已安装入口 | 检测发现的可执行文件。版本未知时仍保留该入口；仅存在工具配置目录时没有安装证据。 | [安装检测](../../../src/core/detection.ts) |
| PATH 默认启动入口 | PATH 中匹配到的第一个可执行入口。无 PATH 匹配时使用发现的其他候选。 | [启动分派](../../../src/cli/actions.ts) |
| npm 管理目标 | 当前已固定的 npm 全局 prefix/root 内的目标包及其可执行入口。它可能与 PATH 默认入口指向不同安装。 | [npm 归属检查](../../../src/core/npm-manager.ts) |
| 自定义命令 | 用户保存的名称、解释器和一行命令原文。可在菜单搜索、编辑、删除和运行。 | [自定义命令存储](../../../src/config/custom-commands.ts) |

术语来源见重构时的[词汇记录](../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/CONTEXT.md)。
