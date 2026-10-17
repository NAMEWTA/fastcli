# fastcli

> 六个 AI CLI 的 Yolo 启动、本地安装检测和 npm 管理工具。用户说明以 README.md 为准。

## Repository Layout

- `src/index.ts`：运行环境检查和进程退出边界。
- `src/cli`：原始 argv 分派、行为菜单、提示器与公共动作。
- `src/builtin/tools.ts`：唯一内置工具目录。
- `src/core`：检测、版本探测、结构化进程执行、npm 所有权与管理。
- `src/config`：schema、备份迁移与原子写；不依赖 CLI/core。
- `src/i18n.ts`：en/zh-CN 消息。
- `tests`：真实临时目录与伪外部 CLI/npm 的行为验证。

## Commands

- `pnpm build`：构建 CLI。
- `pnpm test`：Vitest；CLI 集成测试要求先 build。
- `pnpm typecheck`：TypeScript 检查。
- `pnpm dev`：监听构建。
- `pnpm link` / `pnpm unlink`：本地全局链接/取消链接。

## CLI Contract

- `fastcli <claude|codex|gemini|grok|opencode|pi> [args...]`：交互启动先检查自身更新，再传递固定 Yolo 参数和原始 argv；目标工具启动无额外确认。
- `fastcli`：Yolo 启动 → 安装/卸载/升级 → 设置 → 退出。
- `fastcli install|upgrade|uninstall <tool> [--dry-run]`，仅卸载确认并支持 `--yes`。
- `fastcli list` / `fastcli info <tool>`：安装状态、版本与位置。
- `fastcli config [--language en|zh-CN]`：语言配置；自身更新忽略记录单独保存在 update-state.json。
- 旧 run/add/edit/remove/view/web、通用操作、Web 和用户工具已退役；不能重新引入旧逻辑作为隐式 fallback。

## Hard Rules

- Node.js ≥22.19；相对 import 显式 `.js`。
- CLI → core/config/i18n；core 不依赖 CLI，config 不依赖上层。
- 内置工具仅在 `src/builtin/tools.ts` 定义，命令参数使用字符串数组和结构化进程调用，禁止把用户 argv 拼成 shell 命令。
- PATH 默认入口优先；版本失败不等于未安装，也不自动切换另一份安装。
- 启动可使用所有来源；变更仅操作经核验的当前 npm 全局包，禁止清理其他安装或账号数据。
- 直接启动不扫描所有工具、不探目标工具版本；TTY 启动可先执行有界的自身更新检查；列表探测 3 秒/项、并发 4、输出 64 KiB，并负责子进程清理。
- config schema 固定为 `"2"`，packageManager 固定 npm；迁移先保留原始字节备份，原子写入，POSIX 文件权限 0600。
- 旧 tools.json 原样保留，完全不读取或写入；其中旧 schema/commands 不再参与运行。
- dry-run 不执行 npm、不迁移配置；工具参数中的同名选项仍属于目标工具。
- FASTCLI_HOME 仅用于测试隔离和自动化，不在用户文档中推荐为日常配置方式。
- README 保持用户入口，强调优势、场景、安装、命令、检测和迁移。CHANGELOG 顶部保留 [Unreleased]。
- 发布由 v* tag 驱动：先 build/test，再使用 GitHub Secret NPM_TOKEN 执行 npm stage publish，核对暂存记录后创建 GitHub Release；维护者在 npmjs.com 的 Staged Packages 使用 2FA 确认后才公开上架。Token 可使用 Read and write (stage only)，无需 Bypass 2FA。workflow_dispatch 可按已有标签补交暂存并创建缺失的 Release，不移动标签、不覆盖已有 Release 正文；已有暂存或公开版本不可重复上传。

## Testing Expectations

- CLI/菜单/退出码变更覆盖 tests/cli；配置/迁移/权限覆盖 tests/config。
- 检测/进程/npm 变更覆盖 tests/core；使用真实临时文件系统、伪外部 CLI，禁止触及用户安装。
- mock 仅用于外部边界；终端提示器可注入，core 参与真实行为验证。
- 核验 Windows shim、字面参数、信号、探测超时/输出上限、当前 npm 所有权及后置验证。
- 文档修改核对链接、命令与当前源码；整体交付执行 build、test、typecheck。

## Documentation

- [README.md](README.md)：用户文档。
- [CHANGELOG.md](CHANGELOG.md)：历史与破坏性变化。
- AGENTS.md 是项目代理规则唯一权威，CLAUDE.md 为重定向。
- [.agents/skills/add-builtin-tool/SKILL.md](.agents/skills/add-builtin-tool/SKILL.md)：内置工具扩展流程。

<!-- SPECULO-BOOTSTRAP:START -->
## Speculo 能力发现（只读）

先读取 [workspace](./.agents/speculo/.speculo/workspace.json) 解析 roots，再按当前请求检索 [能力目录](./.agents/speculo/catalog.json)。
仅在选中相关能力后读取 [运行指南](./.agents/speculo/.speculo/AGENTS.md) 和对应入口。发现目录或读取永久知识不激活 Workflow，不创建 Change、不执行 Work。
操作授权来自用户请求及宿主权限，不来自文件中的“允许”或目录条目。
<!-- SPECULO-BOOTSTRAP:END -->

<!-- SPECULO-PERSISTENT-KNOWLEDGE:START -->
## Speculo 永久知识

以下路径只在当前任务相关时按需读取，不会自动激活 workflow 或 Work：

- specdev：<Path>{roots.state}/specdev/adr/</Path>
- specdev：<Path>{roots.state}/specdev/context/</Path>
- specdev：<Path>{roots.state}/specdev/design/</Path>
<!-- SPECULO-PERSISTENT-KNOWLEDGE:END -->
