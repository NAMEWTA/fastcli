---
name: design-explore
type: workflow-command
description: >-
  架构与技术设计——基于已批准方案进行严格的架构设计。多视角技术审查（工程/设计/DevEx，0-10评分）、接口契约定义、数据流设计、宪法合规检查。
  触发场景："架构设计"、"技术方案设计"、"接口设计"、"系统设计"、"design this"、"architecture review"、"technical design"。
version: "2.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配架构/设计/接口/契约相关技能
specforge list --skills --triggers=architecture,design,interface,contract,ceo,devex,multi-perspective --format=json

# 前置产物检测（PROPOSAL.md 必须就绪，检查 phase=requirements 是否完成）
specforge status --phase=design --check-requires

# 环境检测（检查依赖工具是否可用）
specforge doctor --check-deps --quiet

# Brownfield 上下文判定（detectBrownfield 复用）
# 检查 specforge/context/inventory.md 是否存在——存在则表明已执行过 project-inventory 扫描，项目为 brownfield
# 判定结果决定 Step 1.5 是否为必做步骤
if [ -f "specforge/context/inventory.md" ]; then
  echo "🟡 [brownfield] specforge/context/inventory.md 已存在——Step 1.5 既有架构对齐为必做步骤"
else
  # 回退检测：检查主流清单文件是否存在（与 detectBrownfield 判定逻辑一致）
  MANIFEST_FOUND=false
  for f in package.json pom.xml Cargo.toml go.mod pyproject.toml; do
    if [ -f "$f" ]; then MANIFEST_FOUND=true; break; fi
  done
  if [ "$MANIFEST_FOUND" = true ] && [ "$(find src -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.go' -o -name '*.java' -o -name '*.rs' \) 2>/dev/null | wc -l)" -gt 5 ]; then
    echo "🔴 [brownfield] 检测到 brownfield 项目但尚未运行 project-inventory——建议先执行 specforge project-inventory，Step 1.5 为必做步骤"
  else
    echo "🟢 [greenfield] 未检测到 brownfield 信号——Step 1.5 可跳过（须记录跳过原因）"
  fi
fi
-->

<!-- route-statement
路由：design-explore
Change-ID：{{changeId}}
已加载：
  - design-explore.md (本文件)
  - PROPOSAL.md (已批准方案)
未加载（后续按需）：
  - references/multi-perspective-review.md（预算 45 行）
  - references/decision-brief-format.md（预算 20 行）
  - references/v0-draft-template.md（预算 25 行）
第一动作：加载已批准方案，评估设计复杂度与审查深度
Token 预算估算：约 5000 tokens
-->

# 架构与技术设计

## Iron Law

> **设计必须包含接口契约和错误处理策略。** 没有契约的设计不是设计，是草图。

门禁引用：若接口契约/错误策略缺失，触发 **E003_contractMissing**，禁止进入 planning/implementation。

## HARD-GATE 检查清单

在进入设计流程前，必须通过以下门禁（失败则中断并返回对应阶段）：

- [ ] **E001_missingPrerequisiteArtifact**: PROPOSAL.md 存在且包含已批准方案
- [ ] **E002_noP1Capability**: 方案中必须包含至少一个 P1 优先级能力
- [ ] **E004_constitutionViolation**: 如宪法存在，必须通过检查或有豁免记录

**任何一项失败 → 立即中断，报告具体错误编号并引导回相应阶段。**

---

## Step 0: 设计范围评估

**目标**：在进入设计前确定设计复杂度与适当的审查深度。

### 0.1 复杂度检查

统计 PROPOSAL.md 中涉及的能力数量和预期变更范围：

| 能力数 | 预期变更文件 | 设计模式 |
|--------|-------------|----------|
| <= 2   | < 5         | 轻量设计模式 |
| 3-5    | 5-15        | 标准设计模式 |
| > 5    | > 15        | 重量设计模式 |

### 0.2 模式选择（STOP 门禁）

根据复杂度向用户呈现模式选择：

- **轻量模式**：快速设计，聚焦接口契约和核心数据流，跳过 DevEx 审查
- **标准模式**：完整三视角审查（工程/设计/DevEx）+ 宪法检查
- **重量模式**：标准模式 + 额外性能/安全/可扩展性审查

使用决策简报格式（参见 `references/decision-brief-format.md`）呈现三选项，推荐标准模式。

**STOP** - 等待用户确认设计模式后再继续。不要批量处理此决策。

---

## Step 1: 加载已批准方案

### 1.1 读取 PROPOSAL.md
- 确认方案已被批准（HARD-GATE 通过）
- 提取关键技术决策和约束
- 提取能力列表（P1/P2/P3）
- **提取用户故事和优先级**
- **提取 Success Criteria 和 Assumptions**

同时读取：
- `.specforge/config.yaml` — 框架默认规则/错误字典/handoffs（机器源）
- `specforge/config.yaml` — 项目级覆盖规则与项目上下文（机器源）

### 1.2 检查前置条件
- PROPOSAL.md 存在且包含已批准方案
- 方案中的技术决策和约束清晰可执行
- 用户故事包含独立的验收场景（Given-When-Then）
- 如果方案描述不足以支撑设计，**使用决策简报格式询问用户**（补充信息 / 基于假设继续 / 返回 requirements-clarify 三选一）。

**STOP** - 等待用户回应后再继续。

---

## Step 1.5: 既有架构对齐（Brownfield 观察报告）

**目标**：在进入多视角审查前，强制 AI 代理输出一份「既有架构观察报告」，确保新设计不与项目现有风格/约定冲突。

### 1.5.0 Brownfield / Greenfield 分支判定

通过 `detectBrownfield(rootDir)`（来自 `src/services/inventory-service.ts`）判定当前项目类型。
判定依据两条件 AND：① 根目录至少存在一份主流清单文件（`package.json` / `pom.xml` / `Cargo.toml` / `go.mod` / `pyproject.toml`）；② `src/**` 下匹配源文件数 > 5。

**快捷判定**：若 `specforge/context/inventory.md` 已存在（表明已执行过 `specforge project-inventory` 扫描），可直接判定为 brownfield，无需重复探测。

分支行为：

- **Brownfield**（`detectBrownfield` 返回 `true` 或 `inventory.md` 已存在）→ **必须执行** Step 1.5，不得跳过
- **Greenfield**（`detectBrownfield` 返回 `false` 且 `inventory.md` 不存在）→ **可跳过** Step 1.5，但须在流程日志记录跳过原因

> ⚠️ **跳过警告**：若 AI 代理在 brownfield 上下文中尝试跳过 Step 1.5，preamble 必须输出标红提示：
> `🔴 [E-SKIP-1.5] 检测到 brownfield 项目但 Step 1.5 被跳过——既有架构对齐是 brownfield 必做步骤，请立即补充观察报告。`

### 1.5.1 观察维度

**前端项**（若项目含前端代码）：

| 维度 | 观察要点 |
|------|---------|
| 视觉语汇 | 设计系统/组件库名称、布局模式（grid/flex/table） |
| 主色 | 品牌色 / 功能色 / 中性色色板 |
| Elevation 层级 | shadow 层级数、z-index 管理策略 |
| 图标库 | 使用的图标集（lucide/heroicons/自定义 SVG） |
| 文案调性 | 正式/口语/技术、中英文混排规则 |

**后端项**（若项目含后端代码）：

| 维度 | 观察要点 |
|------|---------|
| 命名风格 | camelCase/snake_case/kebab-case、缩写规则 |
| 分层 | presentation/domain/infra 或其他分层模式 |
| 复用模式 | 工具函数/基类/mixin/组合式/DI 容器 |
| 错误处理约定 | 异常类层级/Result 类型/错误码体系 |
| 日志风格 | 结构化/非结构化、级别使用惯例、上下文字段 |

### 1.5.2 独立消息契约

观察报告 **必须** 作为一条独立 AI 消息输出（不与 Step 1 或 Step 2 的内容合并），格式：

```
## 既有架构观察报告

### 前端观察（若适用）
- 视觉语汇：...
- 主色：...
- Elevation：...
- 图标库：...
- 文案调性：...

### 后端观察（若适用）
- 命名风格：...
- 分层：...
- 复用模式：...
- 错误处理：...
- 日志风格：...

### 对本次设计的约束建议
- [基于观察得出的 1-3 条设计约束]

请确认观察是否准确，或提供修正。
```

### 1.5.3 阻断行为

**STOP** — Step 2 被阻断，直到用户对观察报告做出以下任一回应：
- **confirm**：观察准确，继续进入 Step 2
- **修正**：用户提供修正内容，AI 更新报告后再次等待确认

未获确认前，禁止推进 Step 2 的多视角审查。

---

## Step 2: 多视角并行审查（4 视角）

**目标**：从 **CEO / 工程 / 设计 / DevEx** 四个独立视角并行审查设计方案，每个维度 0-10 打分（目标：>= 8 分）。

### 2.0 调度模式（并行子代理）

> 四个视角作为**独立子代理**并行派发，避免单一视角偏见。
> 详细评价问题与提问清单参见 `references/multi-perspective-review.md`。

每个子代理须按以下结构返回 JSON：

```json
{
  "viewpoint": "ceo|engineering|design|devex",
  "scores": {"<维度>": 0-10},
  "averageScore": 0-10,
  "strengths": ["..."],
  "gaps": ["..."],
  "recommendation": "ACCEPT | REWORK | EXPAND_SCOPE | HOLD"
}
```

四个子代理结果由主代理聚合后进入"2.5 审查结果汇总"。

### 2.0a 决策简报格式（审查中发现问題时使用）

当审查发现需要用户决策的问題时，使用决策简报格式（详见 `references/decision-brief-format.md`）。每个问題单独调用，不要批量。

**STOP** - 等待用户回应后再继续。

### 2.1 CEO / 战略视角（Strategic Review）

四种 CEO 模式：

| 模式 | 适用场景 | 关键问题 |
|------|---------|---------|
| **SCOPE EXPANSION** | 方案可能"想小了" | 这是 10 倍方案吗？是否还有更大的机会？ |
| **SELECTIVE EXPANSION** | 方案合理但有亮点可放大 | 哪些部分值得加倍投入？ |
| **HOLD SCOPE** | 范围合适 | 我们是否在用最简单的方式达成目标？ |
| **SCOPE REDUCTION** | 方案过度膨胀 | 哪些功能可以延后或砍掉？P1 是否真是 P1？ |

审查维度：

| 维度 | 评分(0-10) | 说明 |
|------|-----------|------|
| **战略对齐** | /10 | 方案是否服务于核心业务/用户目标？是否在做对的事？ |
| **范围合理性** | /10 | 范围是否与可投入资源匹配？P1/P2 划分是否合理？ |
| **价值密度** | /10 | 单位投入产出多少用户/业务价值？是否有更高 ROI 的替代？ |
| **风险/不可逆性** | /10 | 哪些决策一旦做出难以回退？是否有更可逆的小步路径？ |
| **隐含前提挑战** | /10 | 方案默认成立但可能被颠覆的前提是什么？ |

**< 8 分的维度**：必须使用决策简报格式与用户确认 SCOPE 调整，再进入工程审查。

**STOP** - CEO 视角发现的范围问题往往会让下游审查作废，必须**优先**与用户对齐。

### 2.2 工程视角（Engineering Review）

审查维度：
| 维度 | 评分(0-10) | 说明 |
|------|-----------|------|
| **架构合理性** | /10 | 分层清晰？职责单一？依赖方向正确？ |
| **数据流设计** | /10 | 数据从哪里来、经过哪里、到哪里去？是否有清晰的数据流图？ |
| **边界与接口** | /10 | 模块边界明确？接口定义完整？ |
| **性能考量** | /10 | 关键路径性能估算？瓶颈识别？缓存策略？ |
| **错误处理** | /10 | 失败模式梳理？降级策略？重试与幂等？ |
| **复杂度评估** | /10 | 圈复杂度是否合理？是否有过度设计？

**评分规则**：
- 9-10 分：需代码级证据，具体实现细节已验证
- 7-8 分：高置信度模式匹配，非常可能正确
- 5-6 分：中等置信度，需要验证
- < 5 分：低置信度，必须重新设计

**< 8 分的维度**：必须说明如何改进才能达到 8 分，并使用决策简报格式与用户确认改进方案。

**STOP** - 发现关键架构问題时，单独使用决策简报格式询问用户，不要批量处理。

### 2.3 设计视角（Design Review）

审查维度：
| 维度 | 评分(0-10) | 说明 |
|------|-----------|------|
| **组件设计** | /10 | 组件/模块职责是否单一？接口是否简洁？ |
| **交互一致性** | /10 | API 风格一致？命名规范统一？ |
| **抽象层级** | /10 | 抽象是否在合适的层级？是否有泄漏？ |
| **可测试性** | /10 | 每个模块是否可独立测试？Mock 成本？ |
| **抽象泄漏检测** | /10 | 底层实现细节是否泄漏到高层接口？ |
| **单一职责检查** | /10 | 每个模块是否只有一个变化原因？

**评分规则**：
- 9-10 分：已读取具体设计文档/代码，发现具体问题或优秀实践
- 7-8 分：基于设计模式的高置信度判断
- 5-6 分：模式匹配但不确定，需要用户验证

**< 8 分的维度**：必须提供具体改进建议，并使用决策简报格式确认。

**STOP** - 每个设计问題单独询问，不要批量。

### 2.4 开发者体验（DevEx Review）

审查维度：
| 维度 | 评分(0-10) | 说明 |
|------|-----------|------|
| **API 易用性** | /10 | 新人能否在 10 分钟内理解 API 的使用方式？ |
| **调试友好度** | /10 | 出错时能否快速定位？日志与错误信息是否清晰？ |
| **文档完整度** | /10 | 接口文档是否自解释？示例代码是否充分？ |
| **新手上手时间估算** | /10 | 新开发者需要多长时间才能开始贡献代码？ |
| **错误信息清晰度** | /10 | 错误信息是否指向具体问題和解决方案？

**开发者 Persona 概念**：
- 考虑三种开发者类型：新手（首次接触）、常规使用者（熟悉项目）、专家（深度贡献）
- 设计必须至少满足常规使用者的需求，理想情况是新手也能快速上手

**< 8 分的维度**：必须说明如何改进，并记录具体风险点。

**STOP** - 发现影响开发者体验的关键问題时，单独询问用户。

### 2.5 审查结果汇总

| 视角 | 平均评分 | 关键发现数 | 需用户决策数 | 推荐动作 |
|------|---------|-----------|-------------|---------|
| CEO  | /10     | N         | N           | ACCEPT/REWORK/EXPAND_SCOPE/HOLD |
| 工程 | /10     | N         | N           | ACCEPT/REWORK |
| 设计 | /10     | N         | N           | ACCEPT/REWORK |
| DevEx| /10     | N         | N           | ACCEPT/REWORK |

**HARD-GATE 门禁**：
- **E004_insufficientReviewScore**: 任何视角平均分 < 6 分 → 必须重新设计，禁止进入下一步
- **WARNING**: 任何视角平均分 6-7 分 → 记录风险，使用决策简报格式请求用户确认是否继续
- **CEO 优先**：如 CEO 视角 recommendation 为 `EXPAND_SCOPE` / `SCOPE REDUCTION`，必须先与用户对齐范围，避免下游审查作废

**STOP** - 如触发 HARD-GATE / WARNING / CEO 优先，必须等待用户确认后再继续。

---

## Step 3: 宪法合规检查

**目标**：如果 `.specforge/constitution.md` 存在，设计方案必须通过宪法检查。

### 3.1 逐原则审查

对宪法中每条治理原则：
- [ ] 设计方案是否符合该原则？
- [ ] 如有冲突，设计如何调整？
- [ ] 如无法调整，是否在豁免记录表中记录了理由？

### 3.2 豁免记录表（如适用）

如存在无法解决的宪法冲突，使用以下表格记录：

| 宪法原则 | 冲突描述 | 豁免理由 | 影响评估 | 用户确认 |
|---------|---------|---------|---------|----------|
| <原则内容> | <具体冲突> | <为什么无法遵守> | <潜在风险> | [ ] 已确认 |

### 3.3 检查结果

- **全部通过** → 进入 Step 4
- **存在冲突但有豁免记录** → **STOP** 使用决策简报格式请求用户确认豁免
- **存在冲突且无豁免记录** → 优先调整设计以满足宪法；如确实无法满足，记录豁免理由并请求用户确认
- **宪法不存在** → 跳过此步骤，但建议在 foundation 阶段创建宪法

**STOP** - 如存在未确认的豁免，必须等待用户确认后再继续。

---

## Step 3.5：v0 草稿门禁

**目标**：在投入详细 DESIGN 之前，以极低成本校准方向。

**要求**：
- 以**一条独立消息**输出 v0 草稿（不与其他 Step 合并）
- 正文不超过 500 字（不含标题与列表编号）
- 必须包含：核心架构假设（1-2 句）/ 3-5 条关键决策（每条 ≤ 40 字）/ 2-3 条主要风险（每条 ≤ 50 字）
- 末尾提供 `confirm` + `reject` 两选项

**模板参考**：[`references/v0-draft-template.md`](references/v0-draft-template.md)

**门禁规则**：
- ⛔ v0 草稿未获 `confirm` → **阻断 Step 4**（禁止产出详细 DESIGN）
- 🔄 用户选择 `reject` → 回退 Step 2（六维度澄清），附用户修正建议作为输入
- ✅ 用户选择 `confirm` → 进入 Step 4 详细 DESIGN

---

## Step 4: 生成 DESIGN.md

**目标**：生成完整的架构与技术设计文档。

### 4.1 必需章节（按顺序）

DESIGN.md 必须包含以下章节（详细模板参见 `templates/.specforge/templates/DESIGN.md`）：

1. Context（背景）
2. Goals / Non-Goals
3. User Scenarios & Testing（含 Given-When-Then 验收场景）
4. Architecture Overview（架构图 + 关键决策）
5. Component / Module Design
6. Data Flow（读/写/异步路径）
7. Interface Definitions（API + Data Structures + Events）
8. Error Handling Strategy（分类/错误码/降级/重试）
9. Testing Strategy（金字塔 + Mock 策略）
10. Success Criteria（可度量指标）
11. Key Decisions & Trade-offs
12. Assumptions
13. Files/Directories Involved
14. DevEx Assessment

### 4.2 章节完整性检查

生成 DESIGN.md 后，必须验证以下章节存在且非空：
- [ ] Context
- [ ] Goals / Non-Goals
- [ ] User Scenarios & Testing（至少包含一个 P1 用户故事）
- [ ] Architecture Overview
- [ ] Interface Definitions（必须包含接口契约）
- [ ] Error Handling Strategy（必须包含错误处理策略）
- [ ] Success Criteria
- [ ] Assumptions

**E003_contractMissing**: 如 Interface Definitions 或 Error Handling Strategy 缺失 → 必须补齐后才能进入下一步。

---

## Step 5: 完成衔接

### 5.1 产物清单

- `specforge/changes/<ChangeName>/DESIGN.md` — 架构与技术设计文档（必须包含 4.1 所有章节）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: design, review_scores: {...}）

### 5.2 Handoff

下一步：执行 `planning-breakdown` 命令，将设计拆解为可执行任务。

**handoff 触发条件**：
- 所有审查视角评分 >= 8 分，或
- 6-7 分视角已有风险记录且用户确认继续，或
- 宪法豁免已获用户确认

**handoff 数据传递**：
- 将三视角审查评分传入 `.specforge.json` 的 `review_scores` 字段
- 将关键决策记录传入 `key_decisions` 字段
- 将风险点传入 `risks` 字段

### 5.3 完成状态协议

使用以下状态之一报告完成：

- **DONE** — 设计完成，所有门禁通过，产物完整
- **DONE_WITH_CONCERNS** — 设计完成，但列出具体风险点（如 6-7 分视角、豁免项）
- **BLOCKED** — 无法继续，说明阻塞点和已尝试的方案
- **NEEDS_CONTEXT** — 缺少信息，明确说明需要什么

格式：
```
STATUS: <状态>
REASON: <原因>
ATTEMPTED: <已尝试的方案>
RECOMMENDATION: <建议下一步>
```

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**: 缺少 PROPOSAL.md → 回到 requirements-clarify
- **E002_noP1Capability**: 方案中没有 P1 优先级能力 → 回到 requirements-clarify 重新优先排序
- **E003_contractMissing**: DESIGN.md 缺少接口契约或错误策略 → 必须补齐后才能进入 planning-breakdown
- **E004_insufficientReviewScore**: 审查视角评分 < 6 分 → 禁止进入 planning，必须重新设计
- **E005_unresolvedDecisions**: 存在未解决的 STOP 门禁决策 → 禁止生成 DESIGN.md
- **E004_constitutionViolation**: 宪法检查未通过且无豁免记录 → 调整设计或记录豁免

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "设计不用写文档，代码即设计" | 代码只能告诉你做了什么，不能告诉你为什么这样做 |
| "接口后面再定义，先写着" | 没有契约的并行开发 = 集成时必定返工 |
| "宪法检查太形式化，先跳过" | 宪法是团队共识。跳过它 = 用过去的错误换取今天的便利 |
| "评分不到 8 但也够用了" | "够用"是技术债务的起点。知道不够好却不改进 = 接受已知缺陷 |
| "STOP 门禁太慢，批量处理" | 批量决策 = 隐藏权衡。每个重要决策都值得单独思考 |
| "假设后面再补" | 没有假设列表的设计 = 隐藏风险。显式假设是风险管理的第一步 |
