---
name: quality-verify
type: workflow-command
description: >-
  测试、审查、验证闭环——生成质量检查清单、分层测试验证、三维验证（完整性/正确性/一致性）、7 专家并行审查、修复循环。
  触发场景："验证质量"、"测试和审查"、"质量检查"、"上线前验证"。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配测试/审查/验证相关技能
specforge list --skills --triggers=verify,test,review,checklist,qa --format=json

# 前置产物检测
specforge status --phase=quality --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->

<!-- route-statement
路由：quality-verify
Change-ID：{{changeId}}
已加载：
  - quality-verify.md (本文件)
  - TASKS.md (实现范围)
  - DESIGN.md (接口契约与数据流)
  - PROPOSAL.md (需求基线)
未加载（后续按需）：
  - references/qa-tiers.md（预算 35 行）
  - references/issue-taxonomy.md（预算 25 行）
第一动作：加载产物与范围检测，执行 Diff 分析
Token 预算估算：约 5000 tokens
-->

# 测试、审查、验证闭环

## Iron Law — 完成前验证

> **无新验证证据，禁止声称完成。** 不计为验证证据的：linter 通过、agent 说成功、上次验证过、改动太小。验证证据必须是：你亲自运行的测试命令输出 PASS。

门禁引用：对应 `.specforge/config.yaml` 的 `rules.quality.hardGates` 与 `rules.quality.verification`。

### 门控函数

在宣称任何状态或表达满意之前，**必须**严格执行以下 5 步：

1. **确定**：什么命令能证明这个结论？
2. **运行**：执行完整命令（重新运行，完整执行）
3. **阅读**：完整输出，检查退出码，统计失败数
4. **验证**：输出是否支持这个结论？
   - 如果否：用证据说明实际状态
   - 如果是：带证据陈述结论
5. **只有这时**：才能做出结论

**跳过任何一步 = 说谎，不是验证**

### 验证证据定义

**什么算验证证据**：
- 亲自运行的测试命令输出：`0 failures`、`34/34 pass`
- Linter 输出：`0 errors`
- 构建命令：`exit 0`
- 原始症状测试：通过（验证 bug 已修复）
- 红-绿循环验证（回归测试）
- VCS diff 显示变更（代理委派场景）
- 逐项核对清单（需求满足场景）

**什么不算验证证据**：
- ❌ 之前的运行结果、"应该会通过"
- ❌ 部分检查、推断
- ❌ linter 通过 ≠ 逻辑正确
- ❌ 代码改了，假设已修复
- ❌ 测试只通过了一次（未经红-绿验证）
- ❌ 代理报告"成功"（必须独立验证）
- ❌ 测试通过 ≠ 需求满足

### 常见失败模式

| 结论 | 需要 | 不够格 |
|------|------|--------|
| 测试通过 | 测试命令输出：0 failures | 之前的运行结果、"应该会通过" |
| Linter 无报错 | Linter 输出：0 errors | 部分检查、推断 |
| 构建成功 | 构建命令：exit 0 | linter 通过、日志看起来没问题 |
| Bug 已修复 | 测试原始症状：通过 | 代码改了，假设已修复 |
| 回归测试有效 | 红-绿循环已验证 | 测试只通过了一次 |
| 代理已完成 | VCS diff 显示变更 | 代理报告"成功" |
| 需求已满足 | 逐项核对清单 | 测试通过 |

### 红线——停下来

- 使用"应该"、"大概"、"似乎"
- 验证前就表达满意（"太好了！"、"完美！"、"搞定！"等）
- 即将提交/推送/创建 PR 却没有验证
- 信任代理的成功报告
- 依赖部分验证
- 想着"就这一次"
- 累了想赶紧收工
- **任何暗示成功但实际未运行验证的措辞**

### 防合理化

| 借口 | 现实 |
|------|------|
| "应该能行了" | 运行验证命令 |
| "我有信心" | 信心 ≠ 证据 |
| "就这一次" | 没有例外 |
| "Linter 通过了" | Linter ≠ 编译器 |
| "代理说成功了" | 独立验证 |
| "我累了" | 疲劳 ≠ 借口 |
| "部分检查就够了" | 部分检查什么也证明不了 |
| "换个说法这条规则就不适用了" | 精神大于字面 |

---

---

> **清窗协议**：当检测到清窗触发信号（token > 50k / 连续失败 ≥ 2 / 复读迹象 / 用户感觉打转）时，
> 加载 `context-reset-protocol` skill 并按其流程执行。
> 详见：`.specforge/skills/workflow-steps/context-reset-protocol/SKILL.md`

> **Constitution P9（反重复与验证前置）**：对同一根因的重试必须书面声明差异；
> 无法声明差异则停下反问用户。验证前置 Iron Law 适用所有阶段。
> 详见：`.specforge/constitution.md` P9 章节。

---

## Step 1: 加载所有产物与范围检测

读取当前 change 目录下的全部已有产物：
- `PROPOSAL.md` — 已批准方案（需求基线）
- `DESIGN.md` — 架构与技术设计（接口契约、数据流）
- `TASKS.md` — 任务列表（实现范围）

如果前置产物缺失，中断并提示：**"缺少前置产物，请先完成前置阶段。"**

同时读取：
- `.specforge/config.yaml` — quality/release 门禁规则、错误字典、handoffs
- `specforge/config.yaml` — 项目级上下文与覆盖规则（测试命令、CI 约定）

### 1.1 Diff 分析

运行以下命令获取变更规模：

```bash
git diff <base>...HEAD --stat
git log <base>..HEAD --oneline
```

- 记录变更文件数、插入行数、删除行数
- 检测变更文件类型，推断受影响模块（后端/前端/数据库/API）
- 如果 diff 行数 <50，标记为 "Small diff"，后续专家审查可跳过

### 1.2 范围漂移检测（Scope Drift Detection）

**目标**：对比 PROPOSAL.md 的意图与 TASKS.md 的完成情况，检测是否构建了请求的内容——不多不少。

1. **识别声明意图**：PROPOSAL.md 中描述的变更目标是什么？
2. **对比 TASKS.md**：所有任务是否对应 PROPOSAL 中的需求？
3. **评估**：

   **SCOPE CREEP 检测**：
   - TASKS.md 中存在但与 PROPOSAL 无关的任务
   - 未提及的新功能或重构
   - "顺手做的" 变更，扩大了影响范围

   **MISSING REQUIREMENTS 检测**：
   - PROPOSAL.md 中的需求在 TASKS.md 中未体现
   - 测试覆盖缺口
   - 部分实现（开始但未完成）

4. **输出**（在继续后续步骤前）：
   ```
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   意图：<1 行摘要>
   交付物：<1 行摘要>
   [如果漂移：列出每个超出范围的变更]
   [如果缺失：列出每个未满足的需求]
   ```

**注意**：此为信息性检查，不阻断流程，但必须在质量报告中记录。

### 1.3 计划完成度审计

**目标**：提取 TASKS.md 中的所有可执行项，对比代码 diff，分类完成状态。

1. **提取可执行项**：
   - 复选框项：`- [ ] ...` 或 `- [x] ...`
   - 编号步骤："1. 创建..."、"2. 添加..."
   - 命令式语句："添加 X 到 Y"、"创建 Z 服务"
   - 文件级规格："新文件：path/to/file.ts"
   - 测试要求："测试 X"、"添加 Y 的测试"

2. **对比 diff 分类**：
   - **DONE** — diff 中有明确证据该项已实现，引用具体文件
   - **PARTIAL** — diff 中存在部分工作但不完整
   - **NOT DONE** — diff 中无证据表明该项已处理
   - **CHANGED** — 用不同方法实现了相同目标，注明差异

3. **输出**：
   ```
   计划完成度审计
   ═══════════════════════════════
   
   ## 实现项
     [DONE]      创建 UserService — src/services/user_service.ts (+142 行)
     [PARTIAL]   添加验证 — 模型已验证但缺少控制器检查
     [NOT DONE]  添加缓存层 — diff 中无缓存相关变更
     [CHANGED]   "Redis 队列" → 改用 Sidekiq 实现
   
   ─────────────────────────────────
   完成度：N/M DONE, K PARTIAL, L NOT DONE, J CHANGED
   ─────────────────────────────────
   ```

**保守判定 DONE**：需要 diff 中的明确证据，仅触碰文件不够。
**宽松判定 CHANGED**：如果目标达成，即使方法不同也算已处理。

---

## Step 2: 生成质量检查清单

**目标**：生成定制化检查清单。核心理念——**"检查清单 = 需求质量的单元测试"**，验证的是需求质量而非实现行为。

**关键概念**：
- ❌ **错误**（测试实现）："验证按钮点击正确"、"测试错误处理工作"
- ✅ **正确**（测试需求质量）："视觉层次需求是否对所有卡片类型定义？"、"'显著显示'是否量化了具体尺寸/位置？"

**隐喻**：如果你的 spec 是用英文写的代码，检查清单就是它的单元测试套件。你测试的是需求是否写得清晰、完整、无歧义、准备好实现——而不是实现是否工作。

检查清单必须覆盖 `.specforge/config.yaml` 的 quality 规则（最小集合），并能追溯到 PROPOSAL/DESIGN/TASKS 的验收标准。

### 2.1 询问深度

| 深度 | 覆盖范围 | 适用场景 |
|------|---------|---------||
| **Quick** | 关键路径 + 高优先级测试 | 小改动、紧急修复 |
| **Standard** | + 中等优先级 + 回归测试 | 常规功能（推荐） |
| **Exhaustive** | + 外观 + 边界 + 压力测试 | 核心功能、安全关键 |

**动态澄清问题**：

生成最多 3 个上下文相关的澄清问题，问题类型：
- **范围细化**："是否应包括与 X 和 Y 的集成触点，还是仅限于本地模块正确性？"
- **风险优先级**："哪些潜在风险区域应接受强制门禁检查？"
- **深度校准**："这是轻量级预提交检查清单还是正式发布门禁？"
- **边界排除**："是否应明确排除性能调优项目？"

**默认值**：深度=Standard，受众=Reviewer，焦点=前 2 个相关性集群

### 2.2 检查清单分类

按需求质量维度分组：

- **Requirement Completeness**（需求完整性）：所有必要需求是否文档化？
- **Requirement Clarity**（需求清晰度）：需求是否明确无歧义？
- **Requirement Consistency**（需求一致性）：需求间是否一致无冲突？
- **Acceptance Criteria Quality**（验收标准质量）：成功标准是否可衡量？
- **Scenario Coverage**（场景覆盖）：所有流程/场景是否覆盖？
- **Edge Case Coverage**（边界覆盖）：边界条件是否定义？
- **Non-Functional Requirements**（非功能需求）：性能/安全/可访问性是否指定？
- **Dependencies & Assumptions**（依赖与假设）：依赖和假设是否文档化？

### 2.3 检查项格式与追溯性

**格式要求**：
```
- [ ] CHK### <问题> [维度, Spec §X.Y]
```

**追溯性要求**：
- **≥80%** 检查项必须引用 PROPOSAL/DESIGN/TASKS 的章节或标记 `[Gap]`/`[Ambiguity]`/`[Conflict]`
- 检查现有需求时使用 `[Spec §X.Y]`
- 检查缺失需求时使用 `[Gap]`
- 检查模糊描述时使用 `[Ambiguity]`
- 检查冲突时使用 `[Conflict]`

**示例**：

完整性：
- "是否为所有 API 失败模式定义了错误处理需求？[Gap]"
- "是否为所有交互元素指定了可访问性需求？[Completeness]"

清晰度：
- "'快速加载'是否量化了具体时间阈值？[Clarity, Spec §NFR-2]"
- "'显著'是否用可测量的视觉属性定义？[Ambiguity, Spec §FR-4]"

一致性：
- "导航需求是否在所有页面对齐？[Consistency, Spec §FR-10]"

覆盖度：
- "是否为零状态场景（无数）定义了需求？[Coverage, Edge Case]"
- "是否指定了部分数据加载失败的需求？[Coverage, Exception Flow]"

**绝对禁止**（这会让它成为实现测试，而非需求测试）：
- ❌ 任何以 "验证"、"测试"、"确认" + 实现行为开头的项
- ❌ 引用代码执行、用户操作、系统行为
- ❌ "正确显示"、"正常工作"、"按预期运行"
- ❌ 测试用例、测试计划、QA 程序

**必需模式**（测试需求质量）：
- ✅ "是否为[场景]定义/指定/文档化了[需求类型]？"
- ✅ "是否用具体标准量化/澄清了[模糊术语]？"
- ✅ "[章节 A] 和 [章节 B] 之间的需求是否一致？"
- ✅ "能否客观测量/验证[需求]？"

---

## Step 3: 分层测试验证（Quick / Standard / Exhaustive）

**目标**：按选定深度执行分层测试。
**默认层级**：`standard`。可在 preamble 中通过参数指定：

```bash
# 默认（standard）
specforge status --phase=quality --check-requires

# 指定层级
QA_LEVEL=quick      # 关键路径 + 高优先级（< 2 min）
QA_LEVEL=standard   # + 中优先级 + 集成测试（< 10 min）
QA_LEVEL=exhaustive # + 边界 / 性能 / 安全（< 30 min）
```

### 3.0 层级选择启发

| 信号 | 推荐层级 |
|------|---------|
| Hotfix / 仅文档变更 / 风险极低 | quick |
| 常规功能开发 / 改动 < 200 行 | standard（**默认**）|
| 跨模块大改 / 涉及安全/性能/数据迁移 / 改动 ≥ 500 行 | exhaustive |
| 在 release 前最后一次验证 | exhaustive |

> 详细层级选择启发、Issue 分类法、Quick→Exhaustive 升级触发条件参见
> `references/qa-tiers.md` 与 `references/issue-taxonomy.md`。

### 3.1 Quick 层（时间目标：<2 分钟）

- 运行关键路径测试（P0 任务相关）
- 验证核心功能正常
- 高优先级测试用例全部通过
- 检查控制台错误/日志异常
- 输出：`Quick: <PASS/FAIL> (<N> 通过 / <M> 失败)`

### 3.2 Standard 层（如选择，时间目标：<10 分钟）

- 运行中等优先级测试（P1 任务相关）
- 回归测试套件
- 集成测试
- API 端点测试（如适用）
- 输出：`Standard: <PASS/FAIL/SKIPPED> (<N> 通过 / <M> 失败)`

### 3.3 Exhaustive 层（如选择，时间目标：<30 分钟）

- UI/外观测试（如适用）
- 边界条件测试（空值、溢出、并发）
- 性能测试（加载时间、内存使用）
- 安全扫描（SQL 注入、XSS、权限）
- 输出：`Exhaustive: <PASS/FAIL/SKIPPED> (<N> 通过 / <M> 失败)`

每层测试输出明确的 PASS/FAIL 结果，标注失败用例。

### 3.4 健康度评分（Health Score Rubric）

计算多维度加权分数：

| 分类 | 权重 | 评分标准 |
|------|------|----------|
| **测试覆盖度** | 25% | 0 未覆盖=0，部分=50，全部=100 |
| **测试通过率** | 30% | 100%=100，每失败 1 个 -10 |
| **代码质量** | 15% | linter 0 errors=100，每 error -15 |
| **文档完整性** | 10% | PROPOSAL/DESIGN/TASKS 全部更新=100，每缺失 -20 |
| **专家审查通过率** | 20% | 无 Critical=100，每 Critical -25 |

**最终分数** = Σ(分类分数 × 权重)

**评分解释**：
- **≥90**：优秀，可以进入 release
- **70-89**：良好，无 Critical 可进入 release
- **50-69**：需改进，修复 Important 后重新评估
- **<50**：不合格，必须修复 Critical 和 Important

### 3.5 测试证据要求

- 每个测试层必须输出 PASS/FAIL 及详细结果
- 失败用例必须标注：失败原因、相关文件、重现步骤
- 必须保存测试输出到 `QUALITY-REPORT.md`
- **Iron Law**：必须亲自运行测试命令，不得依赖 agent 报告

---

## Step 4: 三维验证

**目标**：从完整性/正确性/一致性三个维度验证，并进行跨产物一致性分析。

### 4.1 Completeness（完整性）

- [ ] 所有 P0 任务标记为 [x]
- [ ] 所有 P1 任务标记为 [x]
- [ ] DESIGN.md 中所有接口已实现
- [ ] 无遗漏的错误处理路径
- [ ] 所有成功标准已验证（来自 PROPOSAL.md）
- [ ] 所有边界条件已覆盖

### 4.2 Correctness（正确性）

- [ ] 所有测试通过（**亲自运行并确认输出**，非 agent 报告）
- [ ] 实现符合 PROPOSAL.md 中的需求描述
- [ ] 实现符合 DESIGN.md 中的接口契约
- [ ] 边界条件正确处理（空值、溢出、并发）
- [ ] 错误消息清晰且可操作
- [ ] 无安全漏洞（SQL 注入、XSS、权限绕过）

### 4.3 Coherence（一致性）

- [ ] 代码结构符合 DESIGN.md 的架构描述
- [ ] PROPOSAL 中的能力列表与 TASKS 中的任务一一对应
- [ ] 产物间无矛盾（术语统一、接口一致、数据流对齐）
- [ ] 命名约定一致（变量、函数、文件）
- [ ] 文档与代码同步（注释、README、API 文档）

### 4.4 跨产物一致性分析

**目标**：检测 PROPOSAL.md、DESIGN.md、TASKS.md 之间的不一致性。

**检测维度**：

1. **重复检测**：识别近似重复的需求，标记较低质量措辞以合并
2. **歧义检测**：模糊形容词（快速、可扩展、安全）缺乏量化标准；未解决占位符
3. **欠规格检测**：有动词但缺少对象或可衡量结果；任务引用未定义组件
4. **宪法对齐**：与 config.yaml 中 MUST 原则冲突；缺失 mandated 章节
5. **覆盖缺口**：无关联任务的需求；无映射需求的任务
6. **不一致检测**：术语漂移；数据实体缺失；任务排序矛盾；冲突需求

**严重度分配**：
- **CRITICAL**：违反 constitution MUST、缺失核心 spec、零覆盖需求阻断功能
- **HIGH**：重复/冲突需求、模糊安全/性能属性、不可测试验收标准
- **MEDIUM**：术语漂移、缺失非功能任务覆盖、欠规格边界情况
- **LOW**：样式/措辞改进、不影响执行的轻微冗余

**输出格式**：

| ID | 分类 | 严重度 | 位置 | 摘要 | 建议 |
|----|------|--------|------|------|------|
| A1 | 重复 | HIGH | PROPOSAL:L120 | 两个相似需求... | 合并措辞 |

---

## Step 5: 并行专家审查

**目标**：7 专家并行审查。每个专家子代理并发执行，独立报告。

### 5.1 自适应门控（Adaptive Gating）

1. **检测 diff 行数**：
   - 如果 <50 行：跳过所有专家，输出 "Small diff — specialists skipped"
   - 如果 ≥50 行：继续专家选择

2. **检测变更范围**：
   - 后端变更（src/services, src/models, API routes）→ 启用 security, performance
   - 前端变更（src/components, src/pages, UI）→ 启用 design
   - 数据库变更（migrations, schema）→ 启用 data-migration
   - API 变更（interfaces, contracts）→ 启用 api-contract

3. **强制标志**：用户可指定 `--security`、`--performance`、`--all-specialists` 等强制启用

4. **Always-on 专家**（diff ≥50 行时始终启用）：
   - **testing** — 测试覆盖、边界用例
   - **maintainability** — 代码重复、命名清晰度

### 5.2 7 专家分工（扩展版）

| 专家 | 审查范围 | 详细关注点 |
|------|---------|--------|
| **security** | 安全审查 | SQL 注入、XSS、CSRF、权限绕过、敏感数据泄露、LLM 输出信任边界、Shell 注入、枚举值完整性 |
| **testing** | 测试审查 | 测试覆盖率（行/分支/函数）、边界用例、Mock 合理性、测试可维护性、回归测试生成 |
| **performance** | 性能审查 | N+1 查询、内存泄漏、不必要序列化、算法复杂度、缓存策略合理性 |
| **api-contract** | API 契约审查 | 接口一致性（请求/响应格式）、向后兼容（破坏性变更标记）、错误码规范、文档对齐 |
| **data-migration** | 数据迁移审查 | Schema 变更安全（向后兼容）、回滚方案、数据完整性约束、迁移幂等性 |
| **maintainability** | 可维护性审查 | 代码重复（DRY）、命名清晰度、模块耦合度、注释质量（解释为什么）、函数复杂度（圈复杂度 <10） |
| **red-team** | 红队审查 | 对抗性测试（恶意输入）、异常输入处理、故障注入（网络超时、DB 断开）、竞态条件、资源耗尽 |

### 5.3 置信度评分

每个发现**必须**包含 1-10 置信度：

| 分数 | 含义 | 显示规则 |
|------|------|----------|
| 9-10 | 已验证具体代码，展示具体 bug | 正常显示 |
| 7-8 | 高置信度模式匹配，很可能正确 | 正常显示 |
| 5-6 | 中等，可能误报 | 标注 "Medium confidence, verify" |
| 3-4 | 低置信度，模式可疑但可能正常 | 仅放入附录 |
| 1-2 | 推测 | 仅在 P0 严重度时报告 |

**发现格式**：
```
[严重度] (confidence: N/10) file:line — 描述
```

示例：
```
[CRITICAL] (confidence: 9/10) src/auth.ts:42 — SQL 注入 via 字符串插值
[IMPORTANT] (confidence: 5/10) src/api/users.ts:18 — 可能 N+1 查询，用生产日志验证
```

### 5.4 专家输出格式

每个专家输出 JSON 格式发现（支持后续处理）：

```json
{
  "severity": "CRITICAL|IMPORTANT|MINOR",
  "confidence": 9,
  "path": "src/auth.ts",
  "line": 42,
  "category": "security",
  "summary": "SQL 注入 via 字符串插值",
  "fix": "使用参数化查询",
  "specialist": "security"
}
```

**必填字段**：severity, confidence, path, category, summary, specialist
**可选字段**：line, fix, fingerprint, evidence, test_stub

### 5.2 严重度分类

| 级别 | 含义 | 处理 |
|------|------|------|
| **Critical** | 影响功能或安全，必须修复 | 立即修复，修复后重新审查 |
| **Important** | 改进点，有实质影响 | 修复后继续，不必重新审查 |
| **Minor** | 可选优化建议 | 记录不阻断 |

---

## Step 6: 修复循环

**目标**：处理所有 Critical 和 Important 反馈。

### 6.1 详细修复流程

**8a. 定位源码**：
- Grep 错误消息、组件名、路由定义
- Glob 匹配受影响页面的文件模式
- **仅修改**与 issue 直接相关的文件

**8b. 最小修复**：
- **最小改动**解决问题
- **不重构**周围代码
- **不添加**功能
- **不"改进"**无关内容

**8c. 原子提交**：
- 每个修复**一个 commit**
- 格式：`fix(quality): ISSUE-NNN — short description`
- 仅 stage intentional 文件，**绝不** `git add -A`

**8d. 复测**：
- 导航回受影响页面/模块
- 运行相关测试
- 检查控制台/日志错误
- 验证修复达到预期效果

**8e. 分类**：
- **verified**：复测确认修复有效，无新错误
- **best-effort**：已修复但无法完全验证
- **reverted**：检测到回归 → `git revert HEAD` → 标记为 deferred

**8e.5. 回归测试生成**：

**跳过条件**：分类不是 verified、纯 CSS 修复、无测试框架

1. **追踪 bug 代码路径**：
   - 什么输入/状态触发了 bug？（确切前置条件）
   - 它遵循什么代码路径？（哪些分支、哪些函数调用）
   - 哪里断裂？（断裂的确切行/条件）
   - 其他什么输入可能命中相同代码路径？（修复周围的边界情况）

2. **测试必须**：
   - 设置触发 bug 的前置条件
   - 执行暴露 bug 的动作
   - 断言正确行为（**非** "it renders" 或 "it doesn't throw"）
   - 如果追踪时发现相邻边界情况，也测试那些

3. **包含完整归属注释**：
   ```
   // Regression: ISSUE-NNN — {what broke}
   // Found by quality-verify on {YYYY-MM-DD}
   // Report: specforge/changes/<ChangeName>/QUALITY-REPORT.md
   ```

4. **测试类型决策**：
   - 控制台错误/JS 异常/逻辑 bug → 单元测试
   - 断裂表单/API 失败/数据流 bug → 集成测试
   - 视觉 bug + JS 行为（断裂下拉框、动画）→ 组件测试
   - 纯 CSS → 跳过（由 QA 重新运行捕获）

### 6.2 WTF-Likelihood 自检

每 5 次修复（或任何 revert 后），计算风险指数：

```
WTF-LIKELIHOOD:
  起始 0%
  每次 revert:                +15%
  每次修复触碰 >3 文件:       +5%
  修复 15 次后:               每次 +1%
  所有剩余 Minor 严重度:      +10%
  触碰无关文件:               +20%
```

**如果 WTF > 20%**：立即停止，展示已完成工作，询问是否继续

**硬性上限**：50 次修复

### 6.3 修复循环质量门禁

- 存在未解决 Critical → **阻断**，禁止进入 release
- Critical 修复后**必须**重新触发相关专家审查
- Important 修复后自行确认即可
- Minor 记录到 `QUALITY-REPORT.md`，不阻断流程

---

## Step 7: 生成 QUALITY-REPORT.md

**目标**：生成结构化质量报告，作为 release 的准入依据。

### 7.1 报告结构

```markdown
# 质量报告 — <ChangeName>

## 元数据
- 日期：<YYYY-MM-DD>
- 分支：<branch>
- Diff 规模：<N> files changed, <M> insertions, <K> deletions
- 测试深度：<Quick/Standard/Exhaustive>
- 审查专家：<N> 位（列出名称）

## 范围检查
- Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
- 意图：<1 行摘要>
- 交付物：<1 行摘要>
- [如果漂移：列出每个超出范围的变更]
- [如果缺失：列出每个未满足的需求]

## 计划完成度
- COMPLETION: N/M DONE, K PARTIAL, L NOT DONE, J CHANGED
- [列出 PARTIAL/NOT DONE 项及调查]

## 测试结果
| 层级 | 结果 | 通过 | 失败 | 跳过 | 耗时 |
|------|------|------|------|------|------|
| Quick | PASS/FAIL | N | M | 0 | Xs |
| Standard | PASS/FAIL/SKIPPED | N | M | K | Xs |
| Exhaustive | PASS/FAIL/SKIPPED | N | M | K | Xs |

## 健康度评分
| 分类 | 分数 | 权重 | 加权分 |
|------|------|------|--------|
| 测试覆盖度 | N/100 | 25% | N |
| 测试通过率 | N/100 | 30% | N |
| 代码质量 | N/100 | 15% | N |
| 文档完整性 | N/100 | 10% | N |
| 专家审查通过率 | N/100 | 20% | N |
| **最终分数** | | **100%** | **N/100** |

## 三维验证

### Completeness（完整性）
- [x] 所有 P0/P1 任务完成
- [x] 所有接口实现
- [x] 无遗漏错误处理
- [ ] 待完成项（如有）

### Correctness（正确性）
- [x] 测试通过（附证据）
- [x] 规格符合
- [x] 边界条件处理
- [ ] 待修复项（如有）

### Coherence（一致性）
- [x] 代码与设计一致
- [x] 产物间无矛盾
- [x] 术语统一
- [ ] 待对齐项（如有）

## 专家审查摘要

| 专家 | 结果 | Critical | Important | Minor | 最高置信度 |
|------|------|----------|-----------|-------|------------|
| security | PASS/FAIL | 0 | 0 | 1 | 9/10 |
| testing | PASS/FAIL | 0 | 1 | 2 | 8/10 |
| ... | ... | ... | ... | ... | ... |

## 跨产物一致性分析
| ID | 分类 | 严重度 | 位置 | 摘要 | 建议 |
|----|------|--------|------|------|------|
| A1 | 重复 | HIGH | PROPOSAL:L120 | 两个相似需求... | 合并措辞 |

## 修复记录
| Issue | 严重度 | 状态 | Commit | 回归测试 | 复测结果 |
|-------|--------|------|--------|----------|----------|
| ISSUE-001 | Critical | verified | abc1234 | ✓ | PASS |

## WTF-Likelihood
- 当前风险指数：N%
- [如果 >20%：⚠ 风险过高，建议暂停并人工审查]

## Gate Decision
- [ ] PASS — 可以进入 release（所有 Critical 已修复，健康度 ≥70）
- [ ] FAIL — 存在未解决的 Critical 问题
- [ ] PASS_WITH_CONCERNS — 无 Critical，但有 Important 待处理（列出）

## 下一步
- 如果 PASS：执行 `release-deploy` 命令
- 如果 FAIL：继续修复循环
- 如果 PASS_WITH_CONCERNS：记录 Important 到 TODO，可进入 release
```

### 7.2 完成状态协议

报告结尾使用以下状态之一：

- **DONE**：已完成并附证据
- **DONE_WITH_CONCERNS**：已完成，但列出担忧
- **BLOCKED**：无法继续，说明阻塞点和已尝试内容
- **NEEDS_CONTEXT**：缺少信息，明确说明需要什么

**升级协议**：
- 3 次失败尝试后升级
- 安全敏感变更不确定时升级
- 无法验证范围时升级
- 格式：`STATUS`, `REASON`, `ATTEMPTED`, `RECOMMENDATION`

---

## Step 8: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/QUALITY-REPORT.md` — 质量报告

**Gate 检查**：
- 所有 Critical 已修复 → 可以进入 release-deploy
- 存在未解决 Critical → 阻断，继续修复循环

**下一步**：执行 `release-deploy` 命令

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：缺少 PROPOSAL/DESIGN/TASKS 任一产物 → 回到对应上游阶段补齐。
- **E004_noVerificationEvidence**：没有你亲自运行的 PASS 输出 → QUALITY-REPORT 不得标记 PASS。
- **E005_scopeDriftDetected**：范围漂移 → 用户确认是否继续或调整范围。
- **E006_criticalIssuesUnresolved**：存在未解决 Critical → 阻断 release。
- **E007_wtfLikelihoodHigh**：WTF > 20% → 暂停，人工审查。
- **E008_planCompletionGap**：计划完成度 <80% → 补齐缺失项或标记 PARTIAL/NOT DONE。

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "linter 通过了，不用测了" | linter 不管逻辑对错，不是验证证据 |
| "agent 说测试通过了" | agent 经常在失败时声称成功，必须亲自运行验证命令 |
| "改动太小，不需要审查" | 小改动引起的回归是最常见的线上事故 |
| "这次很急，先上线后面补质量" | 99% 的情况下质量报告永远不会被补上 |
| "应该能行了" | 运行验证命令，不是"应该" |
| "我有信心" | 信心 ≠ 证据 |
| "就这一次" | 没有例外 |
| "部分检查就够了" | 部分检查什么也证明不了 |

---

## 关键模式示例

**测试**：
```
✅ [运行测试命令] [看到：34/34 pass] "全部测试通过"
❌ "应该能通过了" / "看起来对了"
```

**回归测试（TDD 红-绿）**：
```
✅ 编写 → 运行（通过）→ 回退修复 → 运行（必须失败）→ 恢复 → 运行（通过）
❌ "我写了回归测试"（没有经过红-绿验证）
```

**构建**：
```
✅ [运行构建] [看到：exit 0] "构建通过"
❌ "Linter 通过了"（linter 不检查编译）
```

**需求**：
```
✅ 重读计划 → 创建核对清单 → 逐项验证 → 报告缺口或完成
❌ "测试通过了，阶段完成"
```

**代理委派**：
```
✅ 代理报告成功 → 检查 VCS diff → 验证变更 → 报告实际状态
❌ 信任代理报告
```

---

## 底线

**验证没有捷径。**

运行命令。阅读输出。然后才能宣称结果。

这没有商量余地。
