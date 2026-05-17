---
name: long-run-goal-builder
type: workflow-step
description: >-
  为长跑 AI Coding 任务（Codex /goal、Claude Code、Cursor、Kiro autopilot）构建可审计、
  不假完成、抗漂移的提示词。激活后先澄清需求、自动加载 AGENTS.md / 当前 spec / lessons.md，
  再产出 5 段式 goal 与长跑健康守则。触发词：goal、写 goal、长任务、长跑、ralph。
version: "1.0.0"
author: "wta"
---

# Goal Prompt Builder

把"让 AI 长时间自己跑完一件事"的模糊愿望，翻译成一段**可审计、不假完成、不漂移、能健康长跑**的 goal 提示词。本技能面向 AI 代理执行；输入是用户的需求陈述，输出是一段可直接粘贴进 Codex CLI / Claude Code / Cursor / Kiro 等长跑工具的 goal 文本。

## 1. 本技能的承诺

长跑型任务最常见的三种翻车，本技能在写 goal 阶段就把它们堵住：

| 翻车 | 根因 | 本技能怎么堵 |
|------|------|-------------|
| **假完成** | 验收口径模糊（"测试通过"="所有任务都打勾"） | Done when 强制每条 cite 文件 / 命令 / 测试名 / 退出码，禁止虚词 |
| **范围漂移** | 没说"不动什么"，模型一路扩散 | Constraints + Stop if 双重锁，必含"MUST NOT modify"清单与禁区文件 |
| **失败循环** | 同根因连续失败仍硬撞 | 健康守则注入 P9（同根因 ≥ 2 次必须停下汇报，对齐仓库 `constitution.md`） |

## 2. 激活后的 7 阶段（不可跳过）

激活本技能时，按顺序执行下列阶段。**Phase 0 与 Phase 1 是强约束**：用户即使要求"快点直接给模板"，也必须先把这两步以最小代价跑完（理由会下面说）。

```
Phase 0  需求澄清（强制）
Phase 1  文档加载与回报（强制）
Phase 2  场景识别 + 工具适配
Phase 3  5 段式 Goal 设计
Phase 4  长跑健康守则注入
Phase 5  审计友好度预测 + 渲染
Phase 6  跑完回顾沉淀（可选，长任务结束后）
```

---

### Phase 0 — 需求澄清（强制）

**目的**：在动笔写 goal 之前，把"用户真实想看到的变化"显式锁定，避免后续所有阶段都建立在错误前提上。

**做法**：

1. 用一句话**复述**你对用户目标的理解，句式固定：

   > 我理解你要做的是：**\<动词\> + \<对象\> + \<after 状态\>**。如果不对，告诉我。

2. 同时抛出三道**最少必答题**（合并问，让用户一次填）：

   | 问题 | 为什么必须问 |
   |------|-------------|
   | A. 你最终想看到什么变化？（一句话 + 一个可验证现象） | 锁 Objective |
   | B. 怎么证明做完了？（cite 命令 / 文件 / 测试名 / 现象） | 预生成 Done when 第 1 项 |
   | C. 绝对不能动的是什么？（文件 / 子系统 / 接口 / 数据） | 预生成 Constraints 第 1 项 |

3. 三道题中**任何一题用了虚词**（"优化 / 改进 / 全部 / 彻底 / 整理 / 清理 / 跑得快一点"），不要进 Phase 1，直接回到本阶段追问"具体的可观测指标 + 数字"。

**反模式**：

- ❌ 用户说"全描述模式我自己讲"就跳过本阶段——必须复述一次让用户确认。
- ❌ 用户说"先给我模板"——给模板可以，但必须附"以下三道题没回答前不要跑"提醒，并把模板里的 Objective / Done when / Stop if 留空。

---

### Phase 1 — 文档加载与回报（强制）

**目的**：把"项目里既有的硬约束、领域知识、命名规范、禁区"自动吸进 goal，避免模型把所有约束都靠用户口述。

**自动加载顺序**（按存在性 + 优先级，详见 `references/context-loading.md`）：

```
1. AGENTS.md                            （仓库给 AI 代理的工作手册）
2. CLAUDE.md                            （Claude 项目铁律）
3. .cursor/rules/* / .cursorrules       （Cursor 规则）
4. .kiro/steering/*.md                  （Kiro steering 文件）
5. 当前 spec / change 目录               （openspec/changes、specforge/changes、.kiro/specs/<active>）
6. specforge/context/{context,architecture,lessons}.md  （三层项目级文档）
7. README.md / README-ZH.md             （项目入口）
8. 项目类型默认值                          （references/project-types.md）
```

**做法**：

1. 探测项目类型（package.json / pyproject.toml / Cargo.toml / *.xcodeproj / go.mod 等）。
2. 按上面顺序逐个 probe，存在的读进上下文。
3. **显式回报**给用户：

   > 已加载（行数）：AGENTS.md (132)、specforge/context/lessons.md (58)、当前 spec proposal.md (74) ...
   > 未发现：CLAUDE.md / .cursor/rules/。
   > 我会把 AGENTS.md § 2.5（P9 反重复）与 § 3.7（路由六要素）、lessons.md 中 status: active 条目作为 Constraints 注入。
   > 如有遗漏的文档需要我加载，告诉我。

4. **lessons.md grep 义务**（对齐 AGENTS.md § 7.8）：从 `lessons.md` 中匹配与本任务关键词相关的 `status: active` 条目，每命中一条要在最终 goal 的 Constraints 中以 `参考 lessons.md#L-NNN：<一句话差异声明>` 形式列出。

**反模式**：

- ❌ "我看到有 AGENTS.md，会注意"——不够，必须显式回报已加载行数与会引用的具体段落。
- ❌ 只读 README 不读 lessons.md——历史教训正是为了不重蹈覆辙才存在。

---

### Phase 2 — 场景识别 + 工具适配

**场景识别**（影响 Done when / Stop if 模板）：

| 选项 | 说明 |
|------|------|
| A. 重构 | 改一个文件 / 子系统，公开 API 不变 |
| B. 新功能（已有 SDD spec） | 按 proposal/design/tasks/spec 严格实现 |
| C. 批量任务 | 修 N 个 bug / 补 N 个测试，N 可枚举 |
| D. 代码考古 | 只读不动手，输出文档 |
| E. UI / 行为 audit | 对照文档审实现，输出报告 |
| F. 守门员 review | 评估能否合并，不修改 |
| G. 自定义 | 用裸 5 段模板，多花时间打磨 Done when |

骨架见 `references/scenarios.md`。

**工具适配**（影响健康守则与"如何持续运行"）：

| 工具 | 长跑机制 | 关键差异 |
|------|---------|---------|
| **Codex CLI 0.128+** | 原生 `/goal`，含 `continuation.md` 审计循环 | 主战场，保留"5 段式 + token budget"原样输出 |
| **Claude Code** | 长任务 / sub-agents / Task 工具 | 没有 `/goal` 关键字，需把 5 段写成"任务说明书"形式，强调 checkpoint + heartbeat |
| **Cursor** | Agent / Composer 长任务 | 把 Constraints 写得**更短**（Cursor 上下文窗口紧），其余照常 |
| **Kiro** | spec / vibe + autopilot | 倾向用 SDD spec → 走场景 B；spec 路径不要硬编码，用相对路径 |
| **通用 LLM** | 多轮人工接力 | 把 Stop if 写成"汇报后等指令"清单，不要假设它能自己重启 |

详见 `references/tool-adapters.md`。**默认按 Codex /goal 输出**，其他工具在最终渲染时做最小改写。

---

### Phase 3 — 5 段式 Goal 设计（黄金模板）

```
/goal <动词 + 对象 + 简洁 after 状态>。

First action: <仅在场景 B / 复杂任务时使用，逐字读取 N 个文件并报告计数，等用户确认>

Scope: <files / 子系统 / 边界>。

Constraints:
  - <硬规则——AGENTS.md / CLAUDE.md 摘录的铁律>
  - <项目类型默认约束——从 references/project-types.md 取>
  - <禁区清单：MUST NOT modify ...>
  - <lessons.md 命中条目的差异声明>

Done when:
  1. <可验证产物——cite 文件 / 命令 / 测试名 / 退出码>
  2. <可验证产物——同上>
  ...（建议 5-8 条）

Stop if:
  - <机械可检测条件 1>
  - <机械可检测条件 2>
  ...（至少 3 条，必含 regression 兜底）

【健康守则】（Phase 4 注入，下一节展开）

Use a token budget of <N> tokens for this goal.
```

**段顺序的设计意图**：Objective 锁意图 → Scope 圈搜索面 → Constraints 剪掉错误分支 → Done when 定义"什么算成功" → Stop if 定义"什么算应该停下" → 健康守则定义"长跑过程中如何保持自检"。这个顺序与 Codex 的 `continuation.md` 审计循环展开顺序一致，错位会导致审计找不到 checklist。

**铁律**（写每段时必须照做）：

1. **Objective 不接受动词为虚词**：禁用"优化 / 改进 / 全部 / 彻底"。模糊到 Phase 0 重来。
2. **Scope 必须是文件 / 目录 / 子系统**——不接受"整个仓库"。
3. **Constraints 必须含"MUST NOT modify"清单**：brownfield 项目里这是 #1 漂移源。
4. **Done when 每条都要可机械验证**：cite 文件路径、命令、测试名、退出码、git diff。≥ 3 条，否则不渲染。
5. **Stop if 至少 3 条**，必含两条兜底：
   - "现有测试出现 regression — 不要靠改测试 / 加 .skip 解决"
   - "同根因连续失败 ≥ 2 次 — 停下汇报已排除方案与差异"（P9）
6. **token budget 必须有数**：缺省值见 `references/scenarios.md` 各场景，单文件 30-60K，子系统 80-120K，跨文件 120-200K，> 300K 必拆。

---

### Phase 4 — 长跑健康守则注入

短任务可以省，**长跑必须有**。把以下健康守则块作为 goal 末尾的"附录"或散入 Done when / Stop if，详细配方见 `references/long-run-health.md`。

**Heartbeat（心跳报告）**：

> 每完成一项 Done when 子项后，输出一条心跳：当前在哪一项 / 已完成什么 / 剩余预算估算 / 是否仍在 Scope 内。

**Checkpoint（检查点）**：

> 每完成 1-2 项 Done when 子项立即 commit（commit message 用 conventional commits）。**禁止**一口气改 N 个文件最后一次性提交——回滚边界会消失。

**Anti-drift（防漂移自检）**：

> 每次心跳前自答：本次将要修改的文件是否仍在 Scope 内？是否触碰了 MUST NOT modify 清单？任何一个"否"都立即停下汇报。

**Anti-loop（P9 反重复）**：

> 同一根因（同一报错 / 同一测试失败）连续失败 ≥ 2 次，**必须**：
> - 停止重试
> - 写出与已尝试方案的具体差异
> - 等用户指令
>
> 这一条是 SpecForge 宪法 P9，违反会触发 `E010_repeatedFailurePattern`，仓库内任何长跑工具都应当遵守。

**Token budget guard（预算守门）**：

> 剩余预算 < 20% 时主动汇报已完成 / 未完成项 + 推荐的拆分点，不要硬撑到耗尽。

**Context reset trigger（上下文重置触发）**：

> 出现以下任一情况，先 commit + 写 PROGRESS.md，然后建议用户 `/compact` 或重启：
> - 上下文使用率 > 85%
> - 最近 3 次心跳都在同一项
> - 已读文件累计 > 50 个

把这些健康守则按工具适配（Phase 2 决定）写进 goal：Codex CLI 直接放在末尾；Claude Code 改成"每完成子项后请明确回报：xxx"；Cursor 由于上下文紧，建议精简成 3 条核心守则（heartbeat / anti-loop / token guard）。

---

### Phase 5 — 审计友好度预测 + 渲染

**预测**（内部评分，不展示给用户具体数字，只展示判定）：

| 维度 | 通过线 |
|------|-------|
| Done when 条数 | ≥ 3 条且每条 cite 具体产物 |
| Stop if 条数 | ≥ 3 条且每条机械可验证 |
| 虚词扫描 | 无"优化 / 改进 / 全部 / 彻底 / all / everything" |
| Token 预算 | 已设定且 ≤ 300K |
| 健康守则 | 至少含 anti-loop + heartbeat |
| 文档加载回报 | Phase 1 已显式列出 |

任一维度未过 → **不渲染**，改为：

> ⚠ 本次 goal 还有 N 处可加强：
> 1. \<具体哪一段哪一行\> → \<改进建议，含示例片段\>
> 2. ...
>
> 修完再渲染。

全部通过 → 进入渲染：

1. 一段 markdown 代码块，内含完整 goal 文本（可直接复制粘贴到 Codex CLI / Claude Code 等工具）。
2. **关键设计选择**：≤ 8 条短理由（每条 1 行），告诉用户"为什么 Done when 第 N 条这么写 / 为什么 Stop if 多了 X 条"。
3. **审计友好度判定**一行（例：`审计友好度：优秀 · 7 项验收 · 6 项 stop-if · 已注入 P9 反重复`）。
4. **附跨工具改写提示**（如果用户用的不是 Codex CLI）：见 `references/tool-adapters.md`。

不要超过这三段，长篇大论会让用户失焦。

---

### Phase 6 — 跑完回顾沉淀（可选）

长任务结束后，用户回来说"跑完了 / 跑挂了"，这时本技能可以再激活一次做小回顾：

1. 问 3 个问题：跑完 / 没跑完？哪个 Done when 项卡住了？卡住的根因是什么？
2. 如果项目存在 `specforge/context/lessons.md`，建议用户追加一条 `L-NNN`（12 字段格式见仓库 `evolution-retrospect/references/retrospective-patterns.md`），把"什么样的 goal 写法在这种项目下不工作"沉淀成下次的 grep 命中。
3. 如果当前 change 目录存在，建议把 goal 文本归档到 `archive/goal-<date>.md`，以便下次同类任务复用。

不要主动建议改 long-run-goal-builder 本身——元改进路径走 `evolution-retrospect`。

## 3. 工作模式（仅影响 Phase 0-3 的交互节奏）

激活后**第一句话**问用户选哪种模式：

> 你希望用哪种方式生成？
> - **A. 询问式** — 一段一段问，最稳，第一次写 goal 推荐
> - **B. 全描述式** — 你一段话讲完，我拆解后只追问空白处，最快
> - **C. 混合式（默认）** — 选场景模板 + 批量问 3-5 个关键问题

无论选哪种，**Phase 0 与 Phase 1 都不可省略**——B 模式下"复述确认 + 文档加载回报"仍要做完，只是合并到一次回复。

## 4. 引用资源（按需加载）

主体保持精简，细节都在 references 里。**只在 SKILL.md 提到的时机才加载对应文件**，不要预读：

| 何时加载 | 文件 |
|---------|------|
| Phase 1 加载顺序与 grep 示例 | `references/context-loading.md` |
| Phase 4 健康守则全文配方 | `references/long-run-health.md` |
| Phase 2 工具适配差异 | `references/tool-adapters.md` |
| Phase 1 命中项目类型时 | `references/project-types.md` |
| Phase 2 选定场景时 | `references/scenarios.md` |
| Phase 3 案例不确定怎么填时 | `references/examples.md` |

## 5. 不做什么

- 不替用户跑 goal——本技能只产出文本。
- 不做 git status / 测试运行 / 项目状态校验——那是工具本身的事。
- 不为 Codex < 0.128 生成 `/goal`（不存在）。
- 不生成 `/plan` / `/compact` 等其他命令的 prompt。
- 不主动跨工具迁移 goal——除非用户说"我从 Codex 切到 Claude Code"。

## 6. 常见失败模式速查

| 翻车 | 修法 |
|------|------|
| Done when = "所有测试通过" | → 改"`<完整命令>` 退出码 0 + paste test summary，新增测试 ≥ N 条" |
| 没有 Stop if | → 至少 3 条，必含 regression + P9 反重复 |
| Scope = "整个项目" | → 收敛到具体目录或子系统 |
| 预算 > 300K | → 拆成两个 goal |
| "我之后再补 acceptance" | → 拒绝渲染，留空模板 + 三道必答题 |
| 未读 AGENTS.md / lessons.md | → Phase 1 必须显式回报；未读不进 Phase 2 |
| 同根因失败 3 次仍硬撞 | → 违反 P9，立刻停下，按反重复格式汇报差异 |

## 7. 输出格式提醒

最终输出**永远是这三段**，不要更多：

1. ` ```` `markdown 代码块（包含完整 goal 文本）` ```` `
2. **关键设计选择**：≤ 8 条短理由
3. **审计友好度判定**：一行

如果用户后续要求"解释更多"，再展开；不要主动塞长篇大论。用户来这里是要一段可粘贴的提示词，不是要一份教程。
