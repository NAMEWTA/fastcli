# fastcli

> AI CLI Manager：一站式管理常用 AI 命令行工具的安装、升级、卸载、运行和自定义命令。

本文件是给 AI 代理的工作手册，不是用户推广页。用户视角说明以 `README.md` 为准。

## Repository Layout

```
src/index.ts          — citty 命令树，注册子命令，捕获 ConfigCorruptError/ConfigVersionTooNewError
  src/cli/            — CLI 命令（add, edit, remove, run, list, info, view, config）+ 首次运行引导 + TUI 菜单
    └── src/core/     — 领域层：registry（合并 builtin+user）、resolver（op 查找 + {{name}}/{{version}} 替换）、executor（spawn shell、信号转发、命令链）、builtin-templates（由 packageManager 生成 install/uninstall/danger）
    └── src/config/   — 路径、schema 类型、reader（加载/迁移/校验）、writer（原子写、0o600）
    └── src/utils/    — fuzzy 搜索（fuse.js）、slug/id 生成、工具名冲突检查
    └── src/i18n.ts   — en/zh-CN 消息字典、normalizeLanguage、t() 辅助函数
    └── src/web-server/ — Express API，仅 127.0.0.1，token 鉴权，ETag+If-Match 写保护

packages/web/         — Vite+React SPA，仅通过 HTTP API 与 web-server 通信
```

- `tests`：Vitest 测试，覆盖 CLI、core、config、utils 和 web-server。
- `.github/workflows`：CI 与 tag 发布流水线。
- `.agents/skills`：AI 代理技能资产。
- 依赖规则：`src/cli` → `src/core`/`src/config`/`src/utils`/`src/i18n`；`src/core` 禁依赖 CLI/Web；`src/config` 禁依赖上层模块；`packages/web` 仅 HTTP。

## Common Commands

| 场景 | 命令 |
|------|------|
| 构建 CLI 和 Web 产物 | `pnpm build` |
| 运行测试套件 | `pnpm test` |
| 运行 watch 测试 | `pnpm test:watch` |
| 监听构建 CLI | `pnpm dev` |
| 本地构建后链接到全局 | `pnpm link` |
| 取消全局链接 | `pnpm unlink` |

## CLI Surface

| 命令 | 说明 |
|------|------|
| `fastcli` | 进入交互式菜单。 |
| `fastcli run <tool-id> <op>` | 解析并执行某工具的 operation。 |
| `fastcli list [--source=builtin|user] [--tag=<tag>] [--category=coding|tool]` | 列出工具，可按来源、标签和分类过滤。 |
| `fastcli info <tool-id>` | 输出工具详情和命令链。 |
| `fastcli add` | 交互式新增用户工具。 |
| `fastcli edit <tool-id>` | 编辑用户工具；内置工具拒绝编辑。 |
| `fastcli remove <tool-id> [--yes]` | 删除用户工具；内置工具拒绝删除。 |
| `fastcli view [--port=<N>] [--no-open]` | 启动本地可视化编辑器。 |
| `fastcli config` / `fastcli config edit` | 查看或编辑全局配置。 |

## Hard Rules

- 所有相对 import 必须显式带 `.js` 后缀。
- `config.json` 与 `tools.json` 的 schema 版本固定为 `"2"`。
- `commands` 的 operation 值必须是 `string[]`，不得回退为 string。
- 内置工具只允许在 `src/builtin/tools.ts` 定义；用户工具只写 `~/.fastcli/tools.json`。
- 内置工具命令字符串优先使用 `BuiltinSpec.commands`（直写）；若无 `commands` 则由 `src/core/builtin-templates.ts` 根据 `npmPackage` + `packageManager` 生成。
- 用户工具可以覆盖同 id 内置工具，但 registry 必须打印 warn。
- 本地可视化编辑器只能绑定到 `127.0.0.1`，并使用 token 鉴权。
- Web API 写入 `config.json` / `tools.json` 必须使用 ETag + `If-Match` 防止覆盖外部改动。
- 配置写入必须走原子写入流程，POSIX 平台目标文件权限为 `0o600`。
- 发布由 tag `v*` 驱动，CI 必须先 `pnpm build`，再 `pnpm test`，然后用 GitHub OIDC trusted publishing 执行 `npm publish`，并创建 GitHub Release。
- README 是推广和用户入口文档，必须强调 fastcli 的优势、场景、安装、命令和配置。
- CHANGELOG 顶部必须保留 `[Unreleased]`。

## Architecture Notes

- `src/cli` 可以依赖 `src/core`、`src/config`、`src/utils` 和 `src/i18n.ts`，反向依赖禁止。
- `src/core` 不依赖 CLI 或 Web UI；它是 CLI 与 Web API 共用的领域层。
- `src/config` 不依赖上层命令模块；迁移和持久化逻辑必须集中在配置层。
- `packages/web` 只能通过 HTTP API 访问后端，不能直接读写 `~/.fastcli/`。
- `FASTCLI_HOME` 仅用于测试隔离和自动化场景，不要在用户文档中推荐为日常配置方式。

## Key Design Decisions

- **内置工具**：`src/builtin/tools.ts` 中仅存元数据（id、name、npmPackage、tags）。实际命令字符串由 `src/core/builtin-templates.ts` 在运行时根据 `config.packageManager` 生成（`volta` → `volta install <pkg>@latest`；`npm` → `npm install -g <pkg>`）。
- **注册中心**：合并 builtin + user 工具到 `Map<id, ToolEntry>`。同 id 用户条目覆盖内置（一次性 `console.warn`）。
- **解析 vs 执行**：`resolver.ts` 是纯函数——查找 operation、做 `{{name}}`/`{{version}}` 替换，返回 `{ kind: 'ok', commands }` 或 `{ kind: 'unconfigured', availableOps }`。未知占位符保留字面量。`executor.ts` 随后 spawn shell。
- **命令链**：始终 `string[]`，单命令也用单元素数组。无 string-or-array 歧义。
- **执行器**：执行前打印 `$ <command>`。使用 `/bin/sh -c`（POSIX）或 `cmd.exe /d /s /c`（Windows）。信号转发：SIGINT/SIGTERM 在 spawn 期间转发给子进程。返回 `ExecResult`，永不抛异常。
- **Web API**：通过 promise 队列（`enqueueWrite`）序列化写操作。所有变更端点要求 `If-Match` 头，对照当前文件内容的 SHA-256 ETag 校验。仅接受 `127.0.0.1` 连接。
- **配置文件**：`config.json`、`tools.json` 使用 schema 版本 `"2"`。reader 自动迁移 v1→v2（字符串转数组）。损坏 JSON 或版本过新 → `ConfigCorruptError` / `ConfigVersionTooNewError` 在顶层捕获。POSIX 写使用原子 rename + `0o600`。

## Testing Expectations

- 修改 CLI 命令签名、输出或退出码时，同步更新 `tests/cli/**`。
- 修改配置 schema、迁移、权限或写入流程时，同步更新 `tests/config/**`。
- 修改 registry、resolver、executor 或模板生成时，同步更新 `tests/core/**`。
- 修改 Web API 鉴权、ETag、端口监听或 payload 结构时，同步更新 `tests/web-server/**`。
- 文档-only 改动至少做 markdown 链接/引用自检；若触碰命令或配置说明，优先运行 `pnpm test`。

## Documentation

- 用户推广和使用文档以 [README.md](README.md) 为主。
- 发布历史记录在 [CHANGELOG.md](CHANGELOG.md) 中。
- AI 代理协作规则以本文件（`AGENTS.md`）为唯一权威来源；`CLAUDE.md` 为指向本文件的重定向。
- AI 代理技能在 [.agents/skills/add-builtin-tool/SKILL.md](.agents/skills/add-builtin-tool/SKILL.md)。

<SPECULO>
## Speculo 运行时配置

### 初始化状态检查

运行时必须读取以下文件以确认 Speculo 初始化状态：

- `./speculo/.speculo/workspace.json` — 工作区根别名配置
- `./speculo/config.json` — 项目配置文件

若上述文件不存在或内容为空，说明项目尚未完成 Speculo 初始化。
此时必须提示用户：**请先运行 `speculo init` 完成初始化配置。**

### 工作流入口（强制读取）

初始化时已选择以下工作流，运行时必须强制读取对应入口文件：

- `./speculo/workflows/specdev/INDEX.md`
</SPECULO>
