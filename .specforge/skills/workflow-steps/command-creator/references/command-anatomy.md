# Command 模板解剖（七块骨架与范例）

> 本文件回答一个问题：一个合格的 SpecForge command 模板应该长什么样？
> 当你不确定某段内容该放哪里时，回到这里对照骨架。

## 目录结构（权威版）

```
<command-name>/
├── <command-name>.md            (required)
└── <optional bundled resources>
    ├── scripts/                 可执行脚本（确定性操作）
    ├── references/              长文档、模式库（按需加载）
    └── assets/                  输出用资产（样板、图标等）
```

SpecForge 约定：命令正文文件名与目录名必须严格一致（`foundation-init/foundation-init.md`）。

---

## 七块骨架（必备 + 推荐）

1. **Frontmatter（必备）** — 五字段：name / type / description / version / author
2. **preamble 块（推荐）** — 技能注入 + 前置产物检测 + 环境检测
3. **标题 + 一句话定位（必备）**
4. **Iron Law（必备）** — 阻断条件，一句话 HARD-GATE
5. **Steps（必备）** — 至少 3 个可执行步骤，带复选框
6. **产物清单（必备）** — 路径 + 最小章节/字段
7. **完成衔接 handoff（必备）** — 下一步命令 + 理由，引用 config.yaml

附加推荐块：
- **常见阻断与纠偏** — 引用 `E00X_` 错误字典
- **反规避提醒** — “借口 vs 现实”表
- **References 导航** — 主体膨胀后，列出可按需加载的 Level 3 文件

---

## 骨架模板（最小可用版）

```markdown
---
name: <command-name>
type: <workflow-command|tool-command>
description: >-
  一句话说明做什么（含触发场景 + 中英关键词）。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
specforge list --skills --triggers=<触发词> --format=json
specforge status --phase=<phase> --check-requires
specforge doctor --check-deps --quiet
-->

# <命令标题>

## Iron Law

> <一句话 HARD-GATE，描述"不这样做就必须阻断"的场景。>

---

## Step 1: <动词短语>

- [ ] 可执行动作 1
- [ ] 可执行动作 2

## Step 2: <动词短语>

- [ ] 可执行动作 1
- [ ] 可执行动作 2

## Step 3: <动词短语>

- [ ] 可执行动作 1

---

## 产物清单

本命令执行后应生成/更新以下产物：

- **<产物名>**：`<路径>`
  - <必需字段/章节 1>
  - <必需字段/章节 2>

---

## 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.<command-name>.next` 推荐执行。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：<本命令下触发该错误的具体表现与修复路径>
- **E00X_<key>**：<...>

---

## 反规避提醒

| 借口 | 现实 |
| ---- | ---- |
| "<常见规避借口>" | <打破该借口的事实> |
```

---

## Steps 的写作分级

Step 有三种颗粒度，选择时依据“操作的脆弱程度”：

### 高自由度（文字指令，适合判断类动作）

```markdown
## Step 2: 多视角审查

- [ ] 从 CEO / 工程 / 设计 / DevEx 四个视角给出一页评审。
- [ ] 每个视角必须回答：核心价值、主要风险、可落地改进。
```

### 中等自由度（伪代码 / 模板）

```markdown
## Step 3: 生成 ADR

- [ ] 按 `references/adr-template.md` 的模板填充决策、备选、影响。
- [ ] 决策记录写入 `specforge/context/decisions/ADR-<YYYYMMDD>-<short>.md`。
```

### 低自由度（固定脚本 / 命令）

```markdown
## Step 4: 添加诊断埋点

- [ ] 执行 `bash scripts/add-diagnostic-logs.sh <component>`。
- [ ] 运行一次复现用例，收集所有边界的证据。
```

---

## 产物清单的写法分级

### 最低合格（只列路径）

```markdown
- 调试记录：`specforge/changes/debug-<YYYY-MM-DD>-<desc>.md`
```

### 推荐（路径 + 必需字段）

```markdown
- 调试记录：`specforge/changes/debug-<YYYY-MM-DD>-<desc>.md`
  - 问题描述、复现步骤
  - 根因分析、修复方案
  - 验证结果、防御层说明
```

### 完整（含验证方式）

```markdown
- 调试记录：`specforge/changes/debug-<YYYY-MM-DD>-<desc>.md`
  - 必需章节：问题描述 / 复现步骤 / 根因分析 / 修复方案 / 验证结果
  - 验证方式：`specforge status --check-artifacts=debug-log`
```

---

## 参考现有真实命令

以下是仓库里已经“填满”的 Level 2 样板，写新命令时先拿它们对照：

| 命令 | 路径 | 值得借鉴的地方 |
| ---- | ---- | -------------- |
| foundation-init | `templates/.specforge/commands/workflow/foundation-init/foundation-init.md` | Profile 选择、双目录结构、反规避表 |
| debugging | `templates/.specforge/commands/tools/debugging/debugging.md` | 四阶段调试法、References 导航表、3-Strikes 规则 |

---

## 什么不该放到 Level 2 主体

- 超过半屏的外部标准原文 → 放 `references/`
- 大段的示例代码（> 30 行） → 放 `references/` 或 `scripts/`
- 跨语言 CLI 命令矩阵 → 从 `skills/workflow-steps/language-adapters/` 引用
- 与当前命令无关的“背景知识” → 删除，别当知识展览台

---

## 自检索引

写完命令后，对照 SKILL.md 末尾的“命令模板自检清单”。
