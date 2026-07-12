---
command: docs-sync
mode: bootstrap
scope: workspace
workflows: [matt-pocock]
changes: [CLAUDE.md-redirect, matt-pocock-readme]
generated_at: 2026-07-12T10:55:00+08:00
---

# Docs Sync Report — Phase 2: 提案执行

## Git Range

- From: `3f7461a`（Phase 1 sync commit）
- To: `<pending>`（Phase 2 commit）
- Replay: `git diff 3f7461a..<HEAD>`

## 执行的提案

### 1. CLAUDE.md → AGENTS.md 重定向 ✅

**来源**: `references/agents-contract.md` — 铁律：`AGENTS.md` 为唯一权威代理手册，`CLAUDE.md` 为轻量重定向

**迁移内容**:
- Repository Layout：合并 CLAUDE.md 的详细架构图和依赖规则
- Key Design Decisions：新增完整章节（7 条设计决策）
- Documentation：更新为 `CLAUDE.md` 为重定向
- CLAUDE.md：替换为 `# CLAUDE.md` → `see AGENTS.md` 重定向

### 2. matt-pocock README.md ✅

**来源**: Retro #2 — `speculo/workflows/matt-pocock/` 缺少用户使用指南

**新增内容**:
- 快速开始（首次使用 + Golden Path + 接续已有 Change）
- 10 条路由速查表
- Change 生命周期（命名格式、状态机、转移规则、状态文件）
- 三层上下文隔离机制（Vendor → Workflow → Change）
- 持久化命名空间与写入规则
- 完整目录结构图
- 常见问题

**Sidecar 更新**: `speculo/.speculo/matt-pocock/docs-sync.json` 新增 `speculo/workflows/matt-pocock/README.md` 为 project_target

## Synced Assets

| 资产 | 动作 | 说明 |
|------|------|------|
| `AGENTS.md` | update | 合并 CLAUDE.md 独有内容（架构图、Key Design Decisions），更新文档引用 |
| `CLAUDE.md` | update | 替换为重定向到 AGENTS.md |
| `speculo/workflows/matt-pocock/README.md` | add | 新建用户使用指南 |
| `speculo/.speculo/matt-pocock/docs-sync.json` | update | 新增 project_target |
| `speculo/.speculo/commands/docs-sync/state.json` | update | 更新 synced_assets |

## Verification

- `pnpm build` ✅
- `pnpm test` ✅（16 files, 163 tests passed）
