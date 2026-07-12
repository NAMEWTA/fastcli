---
command: retro
mode: issue-retro
scope: workflow
workflows: [matt-pocock]
changes: [setup-config]
generated_at: 2026-07-11T17:30:00+08:00
---

# Speculo Retro Report

## 复盘范围

Matt Pocock workflow 首次 setup → finalize 全流程中发现的持久化契约缺陷：change 目录命名未在创建时强制日期前缀。

## 信号来源

| 来源 | 路径 | 信号 |
|------|------|------|
| 对话上下文 | 本次 session 创建 change `setup-config` | change 名称仅为 topic，无日期前缀 |
| 契约文件 | `speculo/skills/change-lifecycle/references/finalize-archive.md` §共同预检 | 明确要求"change 名称符合日期 kebab 规则" |
| 契约文件 | `speculo/skills/change-lifecycle/assets/completion-verification-template.md` | 产物父目录规则写为 `YYYY-MM-DD-<kebab-name>/` |
| 契约文件 | `speculo/skills/runtime-context/references/path-resolution.md` | `change_root = changes_root/<change>` — 无命名约束 |
| 入口协议 | `speculo/workflows/matt-pocock/WORKFLOW.md` §进入协议 §select-change | "原子创建新 change 与 .status.json" — 未指定命名格式 |
| 归档产物 | `speculo/.speculo/matt-pocock/archive/2026-07/setup-config/` | 月份来自 archive 路径，change 名无日期 |

## 改进提案

### 提案 1: change 目录名强制 `<YYYY-MM-DD>-<Topic>` 格式

- **标题**: `bug: change 目录创建时未强制 YYYY-MM-DD-<Topic> 命名规范，与契约不一致`
- **类型**: `bug`
- **优先级**: `priority:high`
- **区域**: `area:contract`
- **根因**: 命名契约写在 `finalize-archive.md`（归档时才检查），但 `WORKFLOW.md` 的 select-change 入口协议和 `runtime-context/SKILL.md` 的路径解析均未在创建时执行格式验证，导致 change 可以不带日期前缀创建，归档时才被拒绝或产生不一致。
- **建议改动**:
  1. `WORKFLOW.md` §进入协议 §select-change 的 completion 改为：`已选择唯一 active change，或原子创建新 change（名称 = <YYYY-MM-DD>-<kebab-topic>）与 .status.json`
  2. `runtime-context/SKILL.md` 增加 change 名称格式校验：必须匹配 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`，不匹配则阻塞
  3. `finalize-archive.md` §共同预检的日期 kebab 检查可与创建端共享同一校验逻辑
- **验收标准**:
  1. 创建 change 时自动以当天日期为前缀，用户只需提供 topic 部分
  2. 手动指定 change 名时，不匹配 `YYYY-MM-DD-<kebab>` 格式则拒绝并提示正确格式
  3. 归档时 `finalize-archive.md` 的日期 kebab 检查通过（因为创建时已保证）
  4. 已有不带日期前缀的 change（如 `setup-config`）在文档中标注为历史遗留，后续归档时不阻塞
- **受影响资产**:
  - `speculo/workflows/matt-pocock/WORKFLOW.md`
  - `speculo/skills/runtime-context/SKILL.md`
  - `speculo/skills/runtime-context/references/path-resolution.md`
  - `speculo/skills/change-lifecycle/references/finalize-archive.md`

## 丢弃与降级项

无。本次复盘聚焦单一、高信号摩擦点。

## 目标仓库

`NAMEWTA/Speculo`（默认框架反馈上游）

## 用户确认记录

已确认（2026-07-11）

## 提交结果

| 提案 | Issue | 状态 |
|------|-------|------|
| change 目录名强制 `YYYY-MM-DD-<Topic>` 格式 | [#15](https://github.com/NAMEWTA/Speculo/issues/15) | ✅ 已创建 |
