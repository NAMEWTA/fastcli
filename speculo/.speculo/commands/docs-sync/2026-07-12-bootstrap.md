---
command: docs-sync
mode: bootstrap
scope: workspace
workflows: [matt-pocock]
changes: []
generated_at: 2026-07-12T10:50:00+08:00
---

# Docs Sync Report

## Git Range

- From: `null`（bootstrap 首次运行）
- To: `91177f4b6bd1930bb3cdda0a33857ee13c262cf0`
- Replay: bootstrap current facts（不对 null 执行 git diff）

## Workspace Cleanup

- Checkpoint commit: `91177f4` — `chore(docs-sync): checkpoint workspace`
- 暂存文件：`speculo/.speculo/commands/retro/2026-07-12-matt-pocock-readme-docs.md`
- 运行前验证：`pnpm build` ✅、`pnpm test` ✅（16/163 passed）

## Confirmed Scopes

### 全局 project_targets
| 路径 | 类型 |
|------|------|
| `README.md` | file |
| `CHANGELOG.md` | file |
| `AGENTS.md` | file |
| `.agents/` | directory |

### matt-pocock workflow
- **project_targets**: 无（`speculo/workflows/matt-pocock/README.md` 待确认后加入）
- **state_targets**: `knowledge/`、`policy/`、`.config/`（均来自 `consumers: docs-sync` 的 store 声明）

## Evidence And Lifecycle

| Target | Action | Evidence | Result |
|---|---|---|---|
| README.md | update | `src/builtin/tools.ts` 有 10 个 BuiltinSpec，README 表格仅 9 个 | 新增 CodeBuddy Code 行，计数 9→10 |
| README.md | update | `.agents/skills/docs-sync/` 和 `npm-cicd-release/` 不存在 | 替换为 add-builtin-tool 和 speculo 链接 |
| CHANGELOG.md | update | `[Unreleased]` 位于 3.2.0/3.1.0 之后，违反契约 | `[Unreleased]` 移至顶部 |
| CHANGELOG.md | update | 3.2.0 与 3.1.0 顺序颠倒 | 按版本倒序排列 |
| CHANGELOG.md | update | 3.2.0 遗漏 CodeBuddy Code 条目 | 补充到 3.2.0 的 Builtin 新增 |
| CHANGELOG.md | update | `NAMEWTA` 与仓库实际 `namewta` 不一致 | 统一为小写 |
| CHANGELOG.md | update | 版本链接缺少 3.0.0/3.0.2/3.1.0/3.2.0 | 补充全部版本链接 |
| AGENTS.md | update | `.docs-sync-state.json` 引用过期（docs-sync 已迁至 speculo） | 更新为 speculo 命令路径 |
| AGENTS.md | update | `.agents/skills/docs-sync/` 和 `npm-cicd-release/` 断链 | 替换为 add-builtin-tool 和 speculo 链接 |

## Workflow Sources

### matt-pocock
- WORKFLOW.md：已读取，解析 `<persistence>` stores
- state_targets 来源：
  - `knowledge/`：consumers: docs-sync,retro,knowledge-prune（目录已存在，含 CONTEXT.md、domain.md）
  - `policy/`：consumers: docs-sync,knowledge-prune（目录尚未创建，create=lazy）
  - `.config/`：consumers: docs-sync,retro,knowledge-prune（legacy, existing-only，目录不存在）

## Synced Assets

- `README.md` — 更新内置工具表、修复链接
- `CHANGELOG.md` — 重排序、补充缺失条目和版本链接、修复大小写
- `AGENTS.md` — 更新 docs-sync 引用、修复断链

## Verification

- `pnpm build` ✅
- `pnpm test` ✅（16 files, 163 tests passed）
- Markdown 内部链接完整性 ✅（所有 `.md` 链接目标存在）

## State

- 全局 state：`speculo/.speculo/commands/docs-sync/state.json`，schema v4，scope_revision 1
- matt-pocock sidecar：`speculo/.speculo/matt-pocock/docs-sync.json`，schema v1，scope_revision 1
- 遗留迁移：`.docs-sync-state.json` (v1 legacy) → `pending_legacy_targets`
- baseline 已切换为 `state-file-commit`

## 提案（需逐次确认）

| 提案 | 说明 | 来源 |
|------|------|------|
| CLAUDE.md → AGENTS.md 重定向 | agents-contract 要求 CLAUDE.md 仅为轻量重定向文件，所有权威内容应在 AGENTS.md | `references/agents-contract.md` § AGENTS 与 CLAUDE |
| matt-pocock README.md | Retro #2 建议创建 `speculo/workflows/matt-pocock/README.md` 用户指南 | retro 报告 |
