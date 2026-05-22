# 项目规则

> 本文件记录 fastcli 的项目级常驻规则。AI 代理在实现、审查和文档同步时应优先检索本文件。

## 技术栈

| 类别 | 技术 | 版本约束 | 备注 |
|------|------|----------|------|
| 语言 | TypeScript | 6.x | strict 模式启用 |
| 运行时 | Node.js | >=18 | CLI 与 Web API 共用 |
| 模块系统 | ESM | `type: module` | 相对 import 必须写 `.js` |
| CLI | citty | 0.1.x | 子命令定义与主入口 |
| 交互提示 | @clack/prompts | 0.9.x | TUI 菜单、确认、输入 |
| Web API | Express | 5.x | 本地编辑器后端 |
| Web UI | Vite + React | Vite 6.x / React 19.x | `packages/web` |
| 包管理器 | pnpm | 10.x | workspace 管理 |
| 构建工具 | tsup / Vite | tsup 8.x / Vite 6.x | CLI 与 Web 分别构建 |
| 测试框架 | Vitest | 4.x | 覆盖 CLI/core/config/web-server |

## 命名约定

| 范围 | 约定 | 示例 |
|------|------|------|
| 文件名 | kebab-case，按领域分层 | `operation-editor.ts` |
| 变量 / 函数 | camelCase | `loadAppConfig`, `resolveCommand` |
| 类 / 接口 | PascalCase | `ConfigCorruptError`, `ToolEntry` |
| 常量 | UPPER_SNAKE_CASE 或语义化 const | `SCHEMA_VERSION`, `DEFAULT_APP_CONFIG` |
| CLI 参数 | kebab-case | `--dry-run`, `--no-open` |
| API 路径 | `/api/<resource>` | `/api/tools/:id`, `/api/config` |

## 既有抽象索引

| 抽象名称 | 所在路径 | 职责简述 | 使用场景 |
|----------|----------|----------|----------|
| Registry | `src/core/registry.ts` | 合并 builtin 与 user 工具并处理覆盖关系 | `list`, `info`, `run`, Web API |
| Resolver | `src/core/resolver.ts` | 将 operation 解析为命令链并替换变量 | CLI run、TUI、Web preview |
| Executor | `src/core/executor.ts` | 顺序执行命令链并返回结构化结果 | CLI run、TUI |
| Config Reader | `src/config/reader.ts` | 加载配置、迁移 schema、拒绝损坏或过新配置 | 启动与 API 读取 |
| Config Writer | `src/config/writer.ts` | 原子写入 JSON 并设置权限 | CLI add/edit/remove、Web API |
| I18n Dictionary | `src/i18n.ts`, `packages/web/src/i18n.ts` | 管理 `en` / `zh-CN` 文案 | CLI、Web UI |
| Web App | `src/web-server/server.ts` | 本地 API、静态资源、鉴权、ETag 写入保护 | `fastcli view` |
| Docs Sync Skill | `.agents/docs-sync/SKILL.md` | 基于 git diff 同步公开文档 | 文档维护 |

## 禁动清单

| 禁止项 | 原因 | 替代方案 |
|--------|------|----------|
| 省略相对 import 的 `.js` 后缀 | ESM 运行时模块解析失败 | 统一写 `./x.js` |
| 修改 schema 版本为非 `"2"` | 会破坏配置迁移与兼容约束 | 新字段走 schema `2` 内兼容扩展或设计迁移 |
| 把内置工具写入用户 `tools.json` | 破坏源码与用户配置边界 | 内置工具只在 `src/builtin/tools.ts` 定义 |
| 让 Web 服务绑定非回环地址 | 违反本地编辑器安全约束 | 仅监听 `127.0.0.1` |
| 绕过 ETag 写入 Web 配置 | 可能覆盖用户外部修改 | 使用 `If-Match` + conflict payload |
| 在 release workflow 中先 test 后 build | clean checkout 下 CLI 集成测试依赖 `dist` | 固定 `pnpm build` 再 `pnpm test` |
| 不读 `.docs-sync-state.json` 就改公开文档 | 破坏 docs-sync 增量基线 | 先分析 `last_sync_sha..HEAD` diff |

## Code Style 要点

| 要点 | 说明 |
|------|------|
| 注释解释约束，不翻译代码 | 复杂迁移、执行器、信号转发和安全边界需要背景说明。 |
| 错误消息走 i18n | CLI、API 和 Web 文案应通过字典管理。 |
| 命令先解析再执行 | 展示、dry-run、确认和真实执行看到的命令应一致。 |
| 配置写入原子化 | 不允许直接覆盖写导致半写入文件。 |
| 文档不虚构功能 | README 可推广，但必须对应已实现能力。 |

## 测试规则

- 修改 `src/cli/**`：更新 `tests/cli/**` 或 smoke 测试。
- 修改 `src/core/**`：更新 `tests/core/**`。
- 修改 `src/config/**`：更新 `tests/config/**`。
- 修改 `src/web-server/**`：更新 `tests/web-server/**`。
- 修改 `src/i18n.ts` 或 `packages/web/src/i18n.ts`：保持 `en` / `zh-CN` 语义一致，并运行 i18n 相关测试。
- 文档-only 更新仍需检查 README、AGENTS、CHANGELOG 和 docs-sync state 是否互相一致。
