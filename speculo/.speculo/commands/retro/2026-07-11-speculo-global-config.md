---
command: retro
mode: issue-retro
scope: multi-workflow
workflows: [matt-pocock]
changes: []
generated_at: 2026-07-11T15:30:00+08:00
---

# Speculo Retro Report

## 复盘范围

本次复盘源于 **architecture workflow Phase 1 执行过程**中暴露的全局配置缺失问题。覆盖范围：所有 Speculo commands 与 workflows 的初始化与运行阶段，关注「语言交互」「持久化根前缀」「全局默认值」三个横切面。

## 信号来源

1. **当前对话上下文** — 用户在 Phase 1 HTML 报告生成后明确要求：「生成的 HTML 语言使用中文」，并指出应在 `speculo init` 初始化时提供全局语言配置。这是本次复盘的直接触发信号。
2. **`speculo/.speculo/workspace.json`** — 当前仅包含 `path_base` 与 `roots` 映射，缺少用户级全局配置（如语言、持久化根前缀覆盖）。
3. **`speculo/.speculo/matt-pocock/integrations/`** — 集成配置（issue-tracker、triage-labels）已按 workflow 维度配置，但全局级（跨 workflow）的通用配置没有统一入口。
4. **`speculo/vendor/matt-pocock/engineering/improve-codebase-architecture/HTML-REPORT.md`** — HTML 报告模板硬编码 `<html lang="en">`，未从任何配置读取语言偏好。

## 改进提案

### 提案 1：speculo init 增加全局配置文件 speculo/config.json

```jsonc
{
  "title": "feature: speculo init 生成全局配置文件 speculo/config.json，统一语言与持久化根前缀",
  "type": "feature-request",
  "priority": "priority:high",
  "area": "area:cli",
  "body": "见下方正文",
  "affected": [
    "speculo/config.json (新增)",
    "speculo/commands/ (所有命令的初始化步骤)",
    "speculo/workflows/*/WORKFLOW.md (workflow 入口协议需读此文件)",
    "speculo/.speculo/workspace.json (可能需要增加 config 根引用)"
  ],
  "evidence": [
    "当前对话：用户要求 architecture workflow 产出中文 HTML 报告，但无全局配置可读取语言偏好",
    "speculo/.speculo/workspace.json：仅含 roots 映射，无用户级全局配置",
    "speculo/vendor/matt-pocock/engineering/improve-codebase-architecture/HTML-REPORT.md：lang=\"en\" 硬编码"
  ],
  "disposition": "file-issue",
  "dup_of": null
}
```

#### 正文：问题

Speculo 当前缺少用户级全局配置文件。所有 commands/workflows 在初始化时只能从 `workspace.json` 读取根路径映射，无法获取用户的语言偏好、持久化根前缀覆盖等通用设置。导致：

1. AI 在生成产物（HTML 报告、Markdown 文档、issue 正文）时无法自动选择语言，用户每次都需要显式指令
2. 各 workflow 的 integrations（issue-tracker、triage-labels）配置分散在 `.speculo/<workflow>/integrations/` 下，无全局默认可继承
3. `workspace.json` 的 `path_base` 语义模糊，无法表达「用户想自定义持久化根」的意图

#### 正文：证据

- 本次 architecture workflow 执行中，用户在原对话要求「生成的 HTML 语言使用中文」，说明 AI 无法从任何已有配置自动推断语言偏好
- `speculo/vendor/matt-pocock/engineering/improve-codebase-architecture/HTML-REPORT.md` 脚手架硬编码 `lang="en"`
- `speculo/.speculo/workspace.json` 仅声明 roots，不承载用户偏好
- 所有 vendor skill SKILL.md 均使用英文作为默认输出语言，无覆盖机制

#### 正文：根因

**设计缺口**：Speculo 的初始化流程（`speculo init` 或首次 setup）只关注了静态资产根注册（`workspace.json`），未设计用户级全局配置层。语言、持久化路径等横切设置散落在各 workflow 的 integrations 或 vendor skill 硬编码中，无统一读取入口。

#### 正文：建议改动

1. **新增 `speculo/config.json`** 作为用户级全局配置文件，`speculo init` 时交互式生成：

```jsonc
{
  "schema_version": 1,
  "language": "zh-CN",
  "persistence": {
    "root_override": null
  },
  "defaults": {
    "confirm_before_external_write": true,
    "report_language": "zh-CN"
  }
}
```

字段语义：
- `language`：Speculo 与用户的交互语言（`zh-CN` | `en`），控制 AI 的提示、报告、issue 正文等产出语言
- `persistence.root_override`：覆盖默认的 `speculo/.speculo/` 持久化前缀；`null` 表示使用默认值
- `defaults.confirm_before_external_write`：全局默认是否在外部写操作（`gh issue create`、`git push` 等）前要求确认
- `defaults.report_language`：AI 生成产物（HTML 报告、Markdown 文档）的默认语言

2. **修改 `workspace.json`** 增加 `config` 根引用：

```jsonc
{
  "schema_version": 1,
  "path_base": "project-root",
  "roots": {
    "config": "speculo",
    // ... 现有 roots ...
  }
}
```

3. **修改所有 commands 与 workflows 的初始化步骤**：在读取 `workspace.json` 之后、执行核心逻辑之前，强制读取 `speculo/config.json`。若文件不存在（向后兼容），使用默认值（`language: "en"`）并静默继续。

4. **修改 `runtime-context` skill**：在路径解析输出中增加 `config` 字段，携带解析后的全局配置对象。

5. **修改 `improve-codebase-architecture/HTML-REPORT.md`**：将 `<html lang="en">` 改为从 config 读取，`lang="{{config.report_language}}"`。

#### 正文：验收标准

1. `speculo init` 流程包含交互式步骤：「选择交互语言 (ZH/EN)」，选择结果写入 `speculo/config.json`
2. `runtime-context` skill 的输出包含已解析的 `config` 对象（含 language、persistence、defaults）
3. 所有现有 commands（retro、finalize、status、docs-sync、knowledge-prune）在初始化时读取 `speculo/config.json`
4. `improve-codebase-architecture` skill 生成的 HTML 报告 `<html lang>` 属性与 `config.report_language` 一致
5. 若 `speculo/config.json` 不存在，系统以 `language: "en"` 静默降级运行，不报错
6. 新增 `speculo/config.json` 的 JSON Schema 文档

#### 正文：受影响资产

- `speculo/config.json` — 新增文件
- `speculo/.speculo/workspace.json` — schema 升级，增加 `config` root
- `speculo/skills/runtime-context/SKILL.md` — 增加 config 解析逻辑
- `speculo/skills/runtime-context/references/path-resolution.md` — 增加 config 定位规则
- `speculo/commands/*.md` (5 个命令) — 初始化步骤增加 config 读取
- `speculo/workflows/matt-pocock/WORKFLOW.md` — 入口协议增加 config 读取
- `speculo/vendor/matt-pocock/engineering/improve-codebase-architecture/HTML-REPORT.md` — `lang` 动态化
- `speculo/vendor/matt-pocock/engineering/setup-matt-pocock-skills/SKILL.md` — 增加 config.json 生成步骤

---

## 丢弃与降级项

无。本次仅提取一个明确信号。

## 目标仓库

默认上游：**`NAMEWTA/Speculo`**

> ⚠️ 待用户确认后执行 `gh issue create`。

## 用户确认记录

用户确认：**"确定"** — 2026-07-11

## 提交结果

| 提案 | Issue | 状态 |
|------|-------|------|
| feature: speculo init 生成全局配置文件 speculo/config.json | [NAMEWTA/Speculo#16](https://github.com/NAMEWTA/Speculo/issues/16) | ✅ 已创建 |
