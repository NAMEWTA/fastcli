---
name: evolution-retrospect
type: workflow-command
description: >-
  复盘、沉淀、归档——回顾完整流程、识别摩擦点、经验沉淀到 context/、技能优化（TDD 迭代）、项目调优、生成复盘报告。
  触发场景："项目复盘"、"经验总结"、"流程优化"、"沉淀最佳实践"、"retrospective"、"lessons learned"、"process improvement"。
version: "2.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配复盘/学习/改进相关技能
specforge list --skills --triggers=retrospective,learn,improve,evolve,tune,skillify --format=json

# 前置产物检测（检查 change 是否完成）
specforge status --phase=evolution --check-requires --strict

# 环境检测
specforge doctor --check-deps --quiet

# 收集基础指标
specforge status --phase=all --metrics --quiet
-->

<!-- route-statement
路由：evolution-retrospect
Change-ID：{{changeId}}
已加载：
  - evolution-retrospect.md (本文件)
  - specforge/changes/<ChangeName>/ (变更产物目录)
未加载（后续按需）：
  - references/retrospective-patterns.md（预算 40 行）
  - references/skill-tdd-guide.md（预算 35 行）
  - references/tuning-playbook.md（预算 30 行）
  - references/excuse-table.md（预算 20 行）
第一动作：评估复盘范围，收集流程数据与指标
Token 预算估算：约 4000 tokens
-->

# 复盘、沉淀、归档

## Iron Law

> **禁止跳过复盘直接开始下一个任务。** 不复盘的团队会在同一个坑里跌倒两次。经验不沉淀到 context/ 和技能中，本次 change 的价值就损失了一半。

## HARD-GATE 检查清单

在进入复盘流程前，必须通过以下门禁：

- [ ] **E010_noChangeArtifacts**: `specforge/changes/<ChangeName>/` 存在且包含至少一个阶段产物
- [ ] **E011_incompleteWorkflow**: 当前 change 的 status 必须为 completed 或 pending-retrospect
- [ ] **E012_missingConfig**: `.specforge/config.yaml` 存在且包含 evolution 阶段配置

**任何一项失败 → 立即中断，报告具体错误编号并引导修复。**

---

## Step 0: 复盘范围评估

**目标**: 确定复盘深度。

### 0.1 复杂度检查

| change 规模 | 涉及阶段数 | 复盘模式 |
|------------|-----------|----------|
| 小型（<3 天）| ≤3 阶段   | 轻量复盘  |
| 中型（3-7 天）| 4-6 阶段 | 标准复盘  |
| 大型（>7 天）| 7+ 阶段   | 深度复盘  |

### 0.2 模式选择（D1 决策门控）

```
D1 — 选择复盘深度
项目/分支: <当前分支>
ELI10: 复盘深度决定了你要花多少时间回顾和沉淀。轻量复盘适合小改动，标准复盘适合大多数 change，深度复盘适合大型复杂 change。选错会导致要么浪费时间要么遗漏重要经验。
利害分析：选错复盘深度会导致经验沉淀不完整或过度消耗时间。
推荐：标准复盘 因为 它在时间和质量间取得平衡
完整性：轻量=5/10（核心经验）, 标准=8/10（完整沉淀）, 深度=10/10（TDD 迭代）
A) 轻量复盘（快速记录关键点，15 分钟）
B) 标准复盘（完整流程回顾+经验沉淀，30-45 分钟）(recommended)
C) 深度复盘（全流程详细分析+技能 TDD 迭代，1-2 小时）
```

**STOP** - 等待用户确认后再继续。不要批量处理此决策。

---

## Step 1: 复盘收集

**目标**: 回顾从 brainstorming 到 archive 的完整流程，收集数据。

同时读取：
- `.specforge/config.yaml` — evolution 门禁规则、错误字典、handoffs
- `specforge/config.yaml` — 项目级规则与错误沉淀入口

### 1.1 流程回顾

完整摩擦点分类和指标收集方法参见 `references/retrospective-patterns.md`。

核心收集维度：
- **流程问题**: 阶段产出不符合下游需要
- **工具问题**: CLI 命令不够用
- **技能问题**: 注入技能未起到指导作用
- **沟通问题**: 用户与 AI 反复澄清
- **架构问题**: 设计决策导致返工

### 1.2 数据收集脚本

```bash
# 收集关键指标
specforge status --phase=all --metrics
git log --since="<change-start-date>" --oneline | wc -l  # 提交数
find specforge/changes/<ChangeName>/ -name "*.md" | wc -l  # 产物数
```

### 1.3 改进项落点

每个摩擦点必须落地到"可执行改进项"，标注落点类型：
- `specforge/context/`（经验沉淀）
- `specforge/config.yaml`（规则/错误/上下文）
- `.specforge/commands/...`（命令模板改进）
- `.specforge/skills/...`（技能改进或新技能）

完整落点映射参见 `references/retrospective-patterns.md#改进项落点映射`。

---

## Step 2: 经验沉淀

**目标**: 将本次 change 中学到的经验固化到可复用资产中。

完整模板（术语表/ADR/经验教训）参见 `references/retrospective-patterns.md`。

### 2.1 术语表更新

在 `specforge/context/glossary.md` 中记录新术语（如有）。

### 2.2 架构决策记录

在 `specforge/context/adr/` 中创建 ADR（如有架构决策）。

### 2.3 经验教训记录

在 `specforge/context/learnings.md` 中追加经验教训。

#### LESSONS 提名四条件过滤

从本 change 的失败清单中抽取候选时，每条候选必须**同时满足**以下四个条件才能被提名为 L-NNN 条目：

| # | 条件 | 判定标准 | 反例（不满足） |
|---|------|---------|--------------|
| 1 | 调试时间 > 30 分钟 | 从首次发现到根因定位耗时超过 30 分钟 | 5 分钟内定位的拼写错误 |
| 2 | 错因不局限本任务 | 根因可能在其他任务/模块/项目中复现 | 仅因本任务特殊输入触发的边界 case |
| 3 | 6 个月内可能再遇 | 相关技术栈/模式在项目中持续使用 | 一次性迁移脚本中的问题 |
| 4 | 非 ADR 能记 | 教训无法用架构决策记录（ADR）表达 | 「选 PostgreSQL 而非 MongoDB」属于 ADR |

**凡不满足任一条件的候选 SHALL 被排除。**

用户对通过过滤的候选逐条选择 `accept` / `skip` / `edit`：

- **accept** — 调用 `getNextLessonId` 生成下一 `L-NNN`（取 `lessons.md` 最大 NNN + 1），追加到 `specforge/context/lessons.md`
- **skip** — 不写入 lessons
- **edit** — 用户修改后再写入

### 2.4 沉淀质量检查

- [ ] 每条 learnings 是否包含"具体场景 + 可执行建议"？
- [ ] ADR 是否包含"决策理由"和"替代方案分析"？
- [ ] 术语定义是否避免了循环引用？

---

## Step 2.5: 架构沉淀同步

**目标**: 批量扫描已归档与活跃 change 的 DESIGN § 9 候选条目，经用户逐项确认后 promote 到项目级文档（`context.md` / `architecture.md`）。

> 本 Step 是 DESIGN § 9「架构沉淀建议」从 change 层向项目层回流的唯一通道。跳过此步意味着跨 change 的架构知识将永久丢失。

### 2.5.1 扫描候选

调用 `scanSection9` 扫描以下路径的 DESIGN.md § 9 章节：

- `specforge/archive/**/DESIGN.md`
- `specforge/changes/**/DESIGN.md`

扫描结果按三类分流：

| 分类 | 含义 | 处理 |
|------|------|------|
| `candidates` | 含有效 § 9 候选条目且尚未 promoted | 进入交互审查 |
| `legacyChanges` | DESIGN 缺失 § 9 章节（历史 change） | 记入 `.evolve-state.yaml#legacy_changes`，跳过不阻塞 |
| `skippedAlreadyPromoted` | 已在 `.evolve-state.yaml#promoted_changes` 中记录 | 静默跳过 |

### 2.5.2 交互审查

对每个候选条目，向用户展示四元组并等待选择：

```
候选 [1/M]:
  changeId:  <change 标识>
  category:  <new-abstraction | project-decision | cross-module-contract | dependency-change | forbidden-list-change>
  item:      <候选条目文本>
  targetDoc: <context.md | architecture.md>

选择: accept | skip | edit
```

交互规则：
- **accept** — 条目原样写入目标文件
- **skip** — 条目不写入任何项目级文档，不记录为 promoted
- **edit** — 用户修改条目文本后再写入（修改后版本作为最终 promote 内容）

**STOP** - 每条候选等待用户明确选择后再处理下一条。不要批量处理。

### 2.5.3 执行 Promote

调用 `promoteCandidates` 将用户 accept（含 edit 后版本）的条目按 `targetDoc` 分组 patch：

- `targetDoc: context.md` → 追加到 `specforge/context/context.md` 对应段落
- `targetDoc: architecture.md` → 追加到 `specforge/context/architecture.md` 对应段落

Patch 语义为**追加**（append），不覆盖既有内容。

### 2.5.4 状态更新

更新 `specforge/context/.evolve-state.yaml`：

```yaml
promoted_changes:
  - changeId: <change-id>
    promotedAt: '<ISO 时间戳>'
    items: [<已 accept 的条目标识列表>]
legacy_changes:
  - <缺 § 9 的历史 change-id>
```

### 2.5.5 摘要输出

Step 完成后向 stdout 输出一行摘要：

```
已扫描 N / 候选 M / 已合入 P
```

其中：
- **N** = 扫描的 DESIGN.md 文件总数（含 legacy）
- **M** = 有效候选条目数（进入交互审查的条目）
- **P** = 用户 accept（含 edit）的条目数

### 2.5.6 质量检查

- [ ] legacy change 是否全部记入 `.evolve-state.yaml` 且未阻塞流程？
- [ ] 用户 skip 的条目是否确认未写入 `context.md` / `architecture.md`？
- [ ] `.evolve-state.yaml` 的 `schemaVersion` 是否为 `1`？
- [ ] 摘要中 P ≤ M ≤ N 是否成立？

---

## Step 3: 技能优化

**目标**: 采用 TDD 迭代方法优化或创建技能。

完整 TDD 指南参见 `references/skill-tdd-guide.md`。

### 3.1 识别可固化模式

回顾本次流程中：
- 哪些操作反复执行？ → 可固化为 workflow-step 技能
- 哪些规则反复强调？ → 可固化为 domain-rule 技能
- 哪些错误反复出现？ → 需要创建 safety/testing 技能
- 哪些决策需要权威背书？ → 可固化为 architecture-rule 技能

### 3.2 TDD 迭代流程

核心 5 步（完整流程参见 `references/skill-tdd-guide.md`）：

1. **红（基线测试）**: 观察无技能时的失败模式
2. **绿（最小技能）**: 编写针对性 SKILL.md
3. **压力测试**: 极端条件验证
4. **重构（堵漏洞）**: 反驳 AI 合理化借口
5. **重新验证**: 确认改进有效

### 3.3 技能质量自检

- [ ] description 描述的是"何时使用"而非"做什么"？
- [ ] Iron Law 是否位于文件顶部（在任何流程之前）？
- [ ] 是否包含反规避语言表格（借口 → 现实）？
- [ ] Red Line 自检列表是否完整？
- [ ] 技能长度是否 < 500 行（渐进式加载）？

---

## Step 4: 项目调优

**目标**: 优化项目配置。

完整调优手册参见 `references/tuning-playbook.md`。

### 4.1 调整阶段启用

根据复盘结果：
- 某些阶段是否从未使用且不需要？ → 从 Profile 中移除
- 是否需要添加自定义阶段？ → 使用 `specforge add-command` 创建

### 4.2 调整技能触发词

如果某技能在本次 change 中未被触发但应该被触发：
1. 检查技能 description 的触发词覆盖率
2. 使用 `specforge list --skills --format=json` 导出当前触发词
3. 对比本次 change 中的实际操作关键词，补充缺失触发词

### 4.3 调整 Iron Law

如果在流程中发现新的不可妥协规则：
- 记录到 `.specforge/constitution.md`（MINOR 版本升级）
- 标注来源和触发场景

### 4.4 配置质量检查

- [ ] `config.yaml` 的 handoffs 是否反映最新流程？
- [ ] `errors` 字典是否覆盖本次 change 遇到的所有错误？
- [ ] `profile.enabledPhases` 是否与实际使用一致？

---

## Step 5: 生成复盘报告

**目标**: 生成结构化复盘报告，作为本次 change 的最终产物。

完整报告模板参见 `references/retrospective-patterns.md#复盘报告模板`。

### 5.1 报告审查（D2 决策门控）

```
D2 — 复盘报告审查
项目/分支: <当前分支>
ELI10: 复盘报告将作为本次 change 的最终产物存档。你可以选择直接完成、先审查再修改、或者保存草稿稍后完善。选错会导致报告质量不佳或流程卡住。
利害分析：报告质量决定下次 change 的起点高度。
推荐：先审查再修改 因为 这确保报告质量
完整性：直接=5/10, 审查=8/10, 草稿=3/10
A) 直接完成（报告已满意，立即归档）
B) 先审查再修改（review 报告内容，补充遗漏）(recommended)
C) 保存草稿（稍后完善，change 状态设为 pending-retrospect）
```

**STOP** - 等待用户选择。不要批量处理此决策。

---

## Step 6: 完成衔接 — 循环闭合

### 6.1 产物清单

- `specforge/changes/<ChangeName>/RETROSPECTIVE.md` — 复盘报告
- `specforge/context/learnings.md` — 追加经验教训
- `specforge/context/glossary.md` — 术语表（如有更新）
- `specforge/context/adr/` — 架构决策记录（如有新架构决策）
- 优化后的技能文件（如有）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（status: completed）

### 6.2 完成状态报告

使用以下状态之一报告复盘完成状态：

- **DONE** — 复盘完成，所有经验已沉淀，产物齐全
- **DONE_WITH_CONCERNS** — 复盘完成，但有遗留问题需关注（列出具体问题）
- **BLOCKED** — 无法完成复盘（说明阻塞原因和已尝试的解决方案）
- **NEEDS_CONTEXT** — 缺少关键信息（明确说明需要什么信息）

格式：
```
STATUS: <状态>
REASON: <原因>
ATTEMPTED: <已尝试的操作>
RECOMMENDATION: <建议的下一步>
```

### 6.3 循环闭合

本次 change 的所有经验已沉淀。下一次 change 将自动受益于优化后的技能和配置。

> **注**：本阶段是 SpecForge 工作流的终点，也是下一次更优工作流的起点。

---

## 常见阻断与纠偏（errors 引用）

- **E005_contextOverload**: 复盘结论写进单个大文档导致膨胀 → 分别沉淀到 config/skills/references
- **E010_noChangeArtifacts**: 找不到 change 产物目录 → 确认 change 名称和路径
- **E011_incompleteWorkflow**: change 状态不是 completed → 先完成所有阶段再复盘
- **E012_missingConfig**: config.yaml 不存在或 evolution 配置缺失 → 运行 specforge init 或 add-command
- **E013_retrospectiveSkipped**: 跳过复盘直接进入新 change → 触发 Iron Law 阻断
- **E014_skillNotTested**: 技能优化未经过 TDD 测试 → 删除未测试技能，重新执行 TDD 循环

---

## 反规避提醒

核心借口（完整 15+ 条目借口表和红线列表参见 `references/excuse-table.md`）：

| 借口 | 现实 |
|------|------|
| "复盘太花时间，直接开始下一个任务" | 不复盘的团队会在同一个坑里跌倒两次 |
| "这次没什么好总结的，很顺利" | 顺利的原因本身就是有价值的经验 |
| "learnings.md 以后有空再写" | "以后"永远不存在。现在不写，永远不会被写 |
| "技能优化太复杂，先用着再说" | 摩擦损失会在 10 次使用后超过优化成本 |

完整借口分类（时间压力/过度自信/责任转移/技术回避）和红线列表参见 `references/excuse-table.md`。
