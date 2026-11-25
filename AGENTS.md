# fastcli 项目指南

fastcli 启动和管理 Claude Code、Codex、Gemini CLI、Grok Build、OpenCode 和 Pi。[README.md](README.md) 维护用户可见行为和迁移方法。本文件定义项目工程约束，[CLAUDE.md](CLAUDE.md) 指向同一入口。

## 开发入口

按当前交付物选用本地技能。跨阶段任务由 [dev-workflow](.agents/skills/dev-workflow/SKILL.md) 协调。单项实施、缺陷排查、审查和真实入口验收分别使用 [dev-build](.agents/skills/dev-build/SKILL.md)、[dev-debug](.agents/skills/dev-debug/SKILL.md)、[dev-review](.agents/skills/dev-review/SKILL.md)、[dev-verify](.agents/skills/dev-verify/SKILL.md)。调整内置工具先读 [add-builtin-tool](.agents/skills/add-builtin-tool/SKILL.md)。

- 接手任务时按需读取[开发资料导航](.agents/dev/AGENTS.md)。活跃任务沿用 `.agents/dev/changes/` 中该任务的已有规格、计划和证据。
- 涉及 CLI 架构、安装归属、配置兼容或发布取舍时，从[长期知识索引](.agents/dev/notes/index.md) 定位主题，再核对当前源码。收尾使用 [dev-archive](.agents/skills/dev-archive/SKILL.md)。项目知识保存在 `.agents/dev/`，通用方法保存在 `.agents/skills/`。
- 发布或恢复时读取 [npm 发布手册](.agents/dev/deploy/npm/runbook.md)。需要确认历史决定时，从对应笔记进入原始证据。

## 模块边界

| 路径 | 职责 |
| --- | --- |
| [src/index.ts](src/index.ts) | Node.js 门槛、CLI 入口、进程退出 |
| [src/cli/](src/cli/) | 原始 argv 分派、菜单、提示器、批处理及结果展示 |
| [src/builtin/tools.ts](src/builtin/tools.ts) | 唯一内置工具目录，维护命令、参数和 npm 包名 |
| [src/core/](src/core/) | 可执行入口检测、版本探测、结构化进程、npm 所有权及自身更新 |
| [src/config/](src/config/) | 配置 schema、迁移、原子写入和自定义命令存储 |
| [src/i18n.ts](src/i18n.ts) | English 和简体中文消息 |

运行要求 Node.js ≥22.19.0。TypeScript 相对导入写显式 `.js` 扩展名。CLI 调用 core、config 和 i18n。core 不依赖 CLI，config 不依赖 CLI 或 core。

## 运行约束

- 在解析包装器选项前识别内置工具 ID。把固定 Yolo 参数和用户原始 argv 作为字符串数组直接传给目标进程。工具名后的 `--dry-run`、`--help` 和 `--version` 仍属于目标工具。
- 直接启动仅发现指定工具，无目标版本探测或额外启动确认。PATH 默认入口优先，版本失败仍保留安装状态。无 PATH 默认且存在多个候选时，TTY 可按次选择，非交互报错。列表探测每项限 3 秒、输出限 64 KiB、并发限 4，并清理子进程。
- 仅对经核验的当前 npm 全局环境执行工具安装或卸载，固定已检查的 prefix，校验变更结果。核验 npm 可执行入口与 PATH 默认入口的归属时同时检查实际路径和版本。保留其他来源的安装和账号数据。包级脚本例外放在对应工具的单次调用中。
- `install` 同时处理首次安装和更新。菜单先选操作再选工具，批量按列表顺序串行执行。卸载整批确认一次，非交互单项卸载要求 `--yes`。普通失败继续批次，取消终止剩余操作。管理 `--dry-run` 只生成预览，既不调用 npm，也不迁移配置。
- 自身更新仅在符合条件的 TTY 路径查询公开 npm 稳定版本，请求限 2 秒。保留“立即更新”和“下次更新”。仅核验通过的 npm 全局或 Volta 安装可以自动更新，验证新版后续跑原命令，延后不保存忽略版本。
- 配置固定为 `version: "2"`、`packageManager: "npm"`。迁移前备份原始字节，再原子替换。POSIX 下写入的配置和备份使用 `0600`。旧 `tools.json` 及其工具、命令数据保持原样，不参与运行。`FASTCLI_HOME` 用于测试隔离和自动化。
- 自定义命令保存在独立的 `custom-commands.json`，保存用户输入的整行原文，由所选 shell 解释。保留文件锁和原子写入、编辑与删除对过期记录的检查。旧 `run/add/edit/remove/view/web`、通用操作和旧用户工具接口保持退役。

## 验证与交付

按顺序构建后运行 CLI 集成测试，交付时执行 `pnpm build`、`pnpm test` 和 `pnpm typecheck`。本地监听使用 `pnpm dev`，本地全局链接使用 `pnpm link` / `pnpm unlink`。

- CLI、菜单和退出码检查放在 [tests/cli/](tests/cli/)。配置、迁移和权限检查放在 [tests/config/](tests/config/)。检测、进程、npm 归属和更新检查放在 [tests/core/](tests/core/)。
- 测试使用真实临时目录、伪 AI CLI 和伪 npm，隔离用户安装。只替换外部边界，终端提示器可注入。核验 Windows shim、字面参数、信号清理、探测上限及安装后状态。
- 文档中的命令、链接与当前源码一起核对。[CHANGELOG.md](CHANGELOG.md) 顶部保留 `[Unreleased]`。
- `v*` 标签触发[发布工作流](.github/workflows/release.yml)。构建和测试通过后以 `NPM_TOKEN` 暂存并核验 Stage ID，再创建缺失的 GitHub Release。npm 公开上架以维护者 2FA 批准后的 registry 回读为准。按原标签补交时保留标签和已有 Release 正文，已有暂存或公开版本不可重复上传。
