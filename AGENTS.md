# fastcli

> AI CLI Manager：一站式管理常用 AI 命令行工具的安装、升级、卸载、运行和自定义命令。

本文件是给 AI 代理的工作手册，不是用户推广页。用户视角说明以 `README.md` 为准。

## Repository Layout

- `src/cli`：命令入口、参数解析、首次运行引导、交互式菜单和各子命令。
- `src/core`：工具注册、内置命令模板、operation 解析、命令链执行器。
- `src/config`：`config.json` / `tools.json` 的路径、schema、读取、迁移、原子写入与权限控制。
- `src/web-server`：本地 Web API 服务，只允许 `127.0.0.1` + token 访问。
- `src/builtin`：内置 AI CLI 工具元数据；内置工具只允许在源码中定义。
- `src/utils`：fuzzy 建议、slug 生成等通用工具。
- `packages/web`：Vite + React 构建的浏览器编辑器前端。
- `tests`：Vitest 测试，覆盖 CLI、core、config、utils 和 web-server。
- `.github/workflows`：CI 与 tag 发布流水线。
- `.agents/skills`：基于 git diff 同步对外文档、commit / release / tag 编排的技能资产。

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
| `fastcli list [--source=builtin|user] [--tag=<tag>]` | 列出工具，可按来源和标签过滤。 |
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
- 内置工具命令字符串必须由 `src/core/builtin-templates.ts` 根据 `packageManager` 生成。
- 用户工具可以覆盖同 id 内置工具，但 registry 必须打印 warn。
- 本地可视化编辑器只能绑定到 `127.0.0.1`，并使用 token 鉴权。
- Web API 写入 `config.json` / `tools.json` 必须使用 ETag + `If-Match` 防止覆盖外部改动。
- 配置写入必须走原子写入流程，POSIX 平台目标文件权限为 `0o600`。
- 发布由 tag `v*` 驱动，CI 必须先 `pnpm build`，再 `pnpm test`，然后发布 npm 并创建 GitHub Release。
- README 是推广和用户入口文档，必须强调 fastcli 的优势、场景、安装、命令和配置。
- CHANGELOG 顶部必须保留 `[Unreleased]`。
- docs-sync 触发时必须先读取 `.docs-sync-state.json`，并基于 `last_sync_sha..HEAD` 的 git diff 决定文档更新。

## Architecture Notes

- `src/cli` 可以依赖 `src/core`、`src/config`、`src/utils` 和 `src/i18n.ts`，反向依赖禁止。
- `src/core` 不依赖 CLI 或 Web UI；它是 CLI 与 Web API 共用的领域层。
- `src/config` 不依赖上层命令模块；迁移和持久化逻辑必须集中在配置层。
- `packages/web` 只能通过 HTTP API 访问后端，不能直接读写 `~/.fastcli/`。
- `FASTCLI_HOME` 仅用于测试隔离和自动化场景，不要在用户文档中推荐为日常配置方式。

## Testing Expectations

- 修改 CLI 命令签名、输出或退出码时，同步更新 `tests/cli/**`。
- 修改配置 schema、迁移、权限或写入流程时，同步更新 `tests/config/**`。
- 修改 registry、resolver、executor 或模板生成时，同步更新 `tests/core/**`。
- 修改 Web API 鉴权、ETag、端口监听或 payload 结构时，同步更新 `tests/web-server/**`。
- 文档-only 改动至少做 markdown 链接/引用自检；若触碰命令或配置说明，优先运行 `pnpm test`。

## Documentation

- 用户推广和使用文档以 [README.md](README.md) 为主。
- 发布历史记录在 [CHANGELOG.md](CHANGELOG.md) 中。
- AI 代理协作规则在 [AGENTS.md](AGENTS.md) 中。
- AI 代理技能在 [.agents/skills/docs-sync/SKILL.md](.agents/skills/docs-sync/SKILL.md) 和 [.agents/skills/npm-cicd-release/SKILL.md](.agents/skills/npm-cicd-release/SKILL.md)。
- docs-sync 状态文件位于 `.docs-sync-state.json`，应与这些公开文档保持一致。
