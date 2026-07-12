---
command: retro
mode: issue-retro
scope: matt-pocock-workflow
workflows: [matt-pocock]
changes: [2026-07-11-unify-executor]
generated_at: 2026-07-11T16:00:00+08:00
---

# Speculo Retro Report

## 复盘范围

architecture workflow Phase 2（select-grill）执行过程中，`domain-modeling` skill 产出的 `CONTEXT.md` 被错误写入项目根目录 `/Users/wta/Documents/01-Code/toolCode/fastcli/CONTEXT.md`，而非 speculo 状态命名空间下的正确位置。

## 信号来源

1. **当前对话上下文** — 用户明确指出「CONTEXT.md 没有按规则持久化在 speculo/.speculo/matt-pocock 下对应位置，而是出现在了项目根目录。这是严重错误」
2. **`speculo/.speculo/matt-pocock/knowledge/domain.md`** — 该文件 §布局：单上下文 中指定 CONTEXT.md 位于仓库根目录 `/CONTEXT.md`，直接导致 AI agent 将文件写入错误位置
3. **变更产物** — `2026-07-11-unify-executor/.status.json` 的 `artifacts` 字段记录了 `CONTEXT.md: 项目根目录领域术语表`，佐证了写入路径错误
4. **`speculo/workflows/matt-pocock/WORKFLOW.md`** — persistence 声明了 `knowledge/` 命名空间用于领域文档，但 `domain.md` 的路径指令与此冲突

## 改进提案

### 提案 1：domain.md 中的 CONTEXT.md 路径指向项目根目录，违反 speculo 持久化契约

```jsonc
{
  "title": "bug: knowledge/domain.md 指定 CONTEXT.md 位于仓库根目录，与 speculo 持久化契约冲突",
  "type": "bug",
  "priority": "priority:critical",
  "area": "area:contract",
  "disposition": "file-issue",
  "dup_of": null
}
```

---

## 问题

`speculo/.speculo/matt-pocock/knowledge/domain.md` 中的「布局：单上下文」段落指示 AI agent 将 `CONTEXT.md` 创建在仓库根目录：

```
/
├── CONTEXT.md
├── docs/adr/
...
```

以及：

> **`CONTEXT.md`**（位于仓库根目录）— 如果存在，使用其中定义的术语。

这导致 architecture workflow 中 domain-modeling skill 产出的 CONTEXT.md 被写入项目根目录，而非 speculo 状态命名空间 `speculo/.speculo/matt-pocock/knowledge/`。该行为破坏了 speculo 的核心持久化契约：**所有 workflow 生成的运行时产物必须落在声明的状态命名空间内**。

## 证据

- `speculo/.speculo/matt-pocock/knowledge/domain.md` L7-L13：文件树声明 CONTEXT.md 在 `/`
- `speculo/.speculo/matt-pocock/knowledge/domain.md` L15-L16：「CONTEXT.md（位于仓库根目录）」
- 当前对话：用户捕获到 CONTEXT.md 出现在项目根目录 `/Users/wta/.../fastcli/CONTEXT.md`
- `speculo/workflows/matt-pocock/WORKFLOW.md` `<persistence>` 段声明 `knowledge/` 为领域文档命名空间
- `2026-07-11-unify-executor/.status.json` 的 `artifacts.CONTEXT.md` 记录为「项目根目录领域术语表」

## 根因

**持久化契约文档错误**：`knowledge/domain.md` 是 workflow 声明给 AI agent 读取的领域布局指令。它使用项目根目录绝对路径 `/CONTEXT.md` 来描述文件位置，但这与 speculo 状态命名空间模型根本冲突。

正确的语义应该是：
- `knowledge/domain.md` 声明「领域文档的**逻辑布局**」（单上下文模型）——这没问题
- 但它不应使用仓库根目录的**物理路径** `/CONTEXT.md`——这越过了状态命名空间边界
- 物理路径应由 speculo 的 persistence 层解析：`{state_root}/knowledge/CONTEXT.md`

## 建议改动

修改 `speculo/.speculo/matt-pocock/knowledge/domain.md`：

1. **将物理路径替换为逻辑路径**：文件树中的 `/CONTEXT.md` 改为 `CONTEXT.md`（不带前导 `/`），表示它是 `knowledge/` 命名空间内的文件
2. **移除「位于仓库根目录」措辞**：L15 的「CONTEXT.md（位于仓库根目录）」改为「CONTEXT.md（位于 knowledge/ 命名空间内，由 domain-modeling skill 创建）」
3. **增加路径解析规则**：明确说明「本文件描述的路径均为相对于 `{state_root}/knowledge/` 的逻辑路径，实际写入时由 persistence 层映射到 `{state_root}/knowledge/` 下」

同时也应检查 `ADR-FORMAT.md` 和 `CONTEXT-FORMAT.md` 中是否有类似的硬编码物理路径。

## 验收标准

1. `knowledge/domain.md` 不再包含指向仓库根目录 `/` 的物理路径
2. domain-modeling skill 生成的 CONTEXT.md 落在 `speculo/.speculo/matt-pocock/knowledge/CONTEXT.md`
3. 其他 skills（improve-codebase-architecture、grill-with-docs 等）从 `{state_root}/knowledge/CONTEXT.md` 读取领域术语
4. 不存在其他 speculo 资产写入项目根目录的路径

## 受影响资产

- `speculo/.speculo/matt-pocock/knowledge/domain.md` — 修复物理路径
- `speculo/vendor/matt-pocock/engineering/domain-modeling/SKILL.md` — 可能需要同步修复路径逻辑（如果 vendor skill 本身也硬编码了路径）
- `speculo/vendor/matt-pocock/engineering/domain-modeling/CONTEXT-FORMAT.md` — 检查是否有类似硬编码
- `speculo/vendor/matt-pocock/engineering/domain-modeling/ADR-FORMAT.md` — 检查 `docs/adr/` 路径引用

## 目标仓库

默认上游：**`NAMEWTA/Speculo`**

## 用户确认记录

用户确认：**"确认"** — 2026-07-11

## 提交结果

| 提案 | Issue | 状态 |
|------|-------|------|
| bug: knowledge/domain.md 指定 CONTEXT.md 位于仓库根目录 | [NAMEWTA/Speculo#18](https://github.com/NAMEWTA/Speculo/issues/18) | ✅ 已创建 |

## 即时修复

根因文件 `knowledge/domain.md` 已就地修复：
1. 文件树 `/CONTEXT.md` → `knowledge/CONTEXT.md`（去掉仓库根目录物理路径）
2. 描述「位于仓库根目录」→「位于 knowledge/ 命名空间内」
3. 新增路径解析规则段：明确所有路径相对于 `{state_root}/knowledge/`
