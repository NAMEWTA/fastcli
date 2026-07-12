---
command: retro
mode: issue-retro
scope: matt-pocock
workflows: [matt-pocock]
changes: []
generated_at: 2026-07-12T00:00:00+08:00
---

# Speculo Retro Report

## 复盘范围

用户首次接触 `speculo/workflows/matt-pocock/` 时的上手体验。复盘场景：用户要求教学如何使用该 workflow，从想法到确认到实现逐步走通，并理解 AI 上下文隔离机制。

## 信号来源

- 对话节点：AI 为解释 workflow 使用方式，先后读取了 12 个文件（WORKFLOW.md、10 条 route、workspace.json、status.json、domain.md、setup.md、runtime-context SKILL.md、worktree-isolation SKILL.md、change-lifecycle SKILL.md、vendor README、integrations、finalize.md、retro.md）
- 产物路径：`speculo/.speculo/matt-pocock/` 下所有持久化文件
- `.status.json` 字段：active change 状态、路由切换、阶段历史

## 改进提案

### 1. workflows/matt-pocock 缺少用户使用指南 README ⭐ 最高优先级

- **类型**: documentation
- **优先级**: high
- **根因**: WORKFLOW.md 是面向机器执行的 XML 编排声明（routes、persistence、transitions），不是面向用户的教学文档。10 条路由的触发条件分散在各 route 文件的 `<when>` 中，无法一览。Change 生命周期散落在 WORKFLOW.md、runtime-context skill、change-lifecycle skill 三处。
- **建议改动**: 新增 `speculo/workflows/matt-pocock/README.md`，包含：(1) 快速开始 Golden Path + 接续示例；(2) 10 条路由速查表；(3) Change 核心概念（命名格式、状态机、转移规则）；(4) 三层上下文隔离机制说明；(5) 完整目录结构图。
- **验收标准**: 新用户仅阅读 README.md 即可独立开启第一个 change 并走完 grill → spec → implement 流程。
- **受影响资产**: `speculo/workflows/matt-pocock/README.md`（新建）
- **去重结论**: 无重复 issue

## 丢弃与降级项

无。本次复盘仅识别到一项改进提案。

## 目标仓库

`NAMEWTA/fastcli`（用户确认）

## 用户确认记录

用户确认创建 issue，目标仓库为 NAMEWTA/fastcli。

## 提交结果

| 标题 | Issue | 状态 |
|------|-------|------|
| docs(speculo): workflows/matt-pocock 缺少用户使用指南 README | [#2](https://github.com/NAMEWTA/fastcli/issues/2) | 已创建 |
