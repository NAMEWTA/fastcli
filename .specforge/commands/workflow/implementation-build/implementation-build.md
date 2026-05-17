---
name: implementation-build
type: workflow-command
description: >-
  子代理驱动开发——宪法门禁、扩展钩子、清单检查、按依赖顺序执行任务、
  三层子代理审查（implementer→spec-reviewer→code-quality-reviewer）、
  双阶段专项审查（CRITICAL→INFORMATIONAL）、TDD 红绿重构、Fix-First 修复循环。
  触发场景："开始实现"、"执行任务"、"编码实现"、"build this"、"implement the plan"。
version: "1.1.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配实现/子代理/TDD/构建/审查相关技能
specforge list --skills --triggers=implement,subagent,tdd,build,review --format=json

# 前置产物检测（TASKS.md 必须就绪，DESIGN.md 用于审查对照）
specforge status --phase=implementation --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->

<!-- route-statement
路由：implementation-build
Change-ID：{{changeId}}
已加载：
  - implementation-build.md (本文件)
  - TASKS.md (任务列表与执行计划)
  - DESIGN.md (技术栈与接口定义)
未加载（后续按需）：
  - references/subagent-prompts.md（预算 45 行）
  - references/extension-hooks-guide.md（预算 30 行）
第一动作：执行预检查——扩展钩子、清单状态、上下文加载
Token 预算估算：约 5500 tokens
-->

# 子代理驱动实现工作流

## Iron Laws

> **禁止在测试之前编写生产代码。** 必须先有失败的测试才能写实现。如果已经写了生产代码而没有测试，先删除生产代码。

> **禁止跳过子代理三层审查。** 每个任务必须经过 implementer → spec-reviewer → code-quality-reviewer 完整闭环。

> **禁止在规格审查通过前开始代码质量审查。** 顺序错误会导致无效审查。

> **禁止并行派发多个实现子代理。** 必须串行执行，避免代码冲突。

门禁引用：缺少失败测试或跳过审查闭环，属于 implementation 阶段规则违规（对应 `.specforge/config.yaml` 的 `rules.implementation.hardGates`）。

---

## Step 1: 预执行检查

### 1.1 扩展钩子检查（before_implement）

**目标**: 在执行实现前，运行项目配置的扩展钩子

- 检查 `.specforge/extensions.yml` 是否存在
- 如果存在，加载 `hooks.before_implement` 配置
- 过滤掉 `enabled: false` 的钩子（无 `enabled` 字段默认为 `true`）
- 对于有 `condition` 字段的钩子，跳过条件评估（由 HookExecutor 处理）
- 执行 mandatory 钩子（`optional: false`），提示 optional 钩子（`optional: true`）

**输出格式**:

```markdown
## Extension Hooks

**Automatic Pre-Hook**: {extension}
Executing: `/{command}`
EXECUTE_COMMAND: {command}

Wait for the result of the hook command before proceeding.
```

**失败处理**:
- Mandatory 钩子失败 → **终止实现**
- Optional 钩子失败 → **继续执行**，记录警告

详细配置指南见：[references/extension-hooks-guide.md](references/extension-hooks-guide.md)

### 1.2 清单状态检查

**目标**: 确保所有前置检查清单已完成

- 扫描 `checklists/` 目录中的所有清单文件
- 统计每项清单的 Total/Completed/Incomplete
- 生成状态表格

```text
| Checklist     | Total | Completed | Incomplete | Status   |
|---------------|-------|-----------|------------|----------|
| ux.md         |    12 |        12 |          0 | ✓ PASS   |
| test.md       |     8 |         5 |          3 | ✗ FAIL   |
| security.md   |     6 |         6 |          0 | ✓ PASS   |
```

- **任何清单未完成** → 询问用户是否继续实现
- **全部完成** → 自动进入下一步

可使用脚本辅助检查：`scripts/check-checklists.sh --json`

### 1.3 加载上下文

**必需文档**:
- **TASKS.md**: 完整任务列表与执行计划
- **DESIGN.md**: 技术栈、架构设计、文件结构、接口定义

**可选文档**（如果存在则读取）:
- `data-model.md` — 实体与关系定义
- `contracts/` — API 规格与测试要求
- `research.md` — 技术决策与约束
- `quickstart.md` — 集成场景说明

### 1.4 项目设置验证

**目标**: 验证项目忽略文件配置正确

检测并创建/验证忽略文件：
- Git 仓库 → `.gitignore`
- Dockerfile 存在 → `.dockerignore`
- ESLint 配置 → `.eslintignore` 或 config 中的 `ignores`
- Prettier 配置 → `.prettierignore`
- Terraform 文件 → `.terraformignore`

根据 DESIGN.md 中的技术栈应用对应模式（完整表参见 `skills/workflow-steps/language-adapters` 第 3 节）：
- **Node**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`, `.turbo/`, `coverage/`
- **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`, `.pytest_cache/`, `.mypy_cache/`
- **Java/Spring (Maven)**: `target/`, `*.class`, `.idea/`, `*.iml`, `.mvn/wrapper/maven-wrapper.jar`
- **Java/Spring (Gradle)**: `build/`, `.gradle/`, `*.class`, `out/`
- **Go**: `bin/`, `*.test`, `*.out`, `coverage.txt`
- **Rust**: `target/`, `*.rs.bk`
- **.NET**: `bin/`, `obj/`, `*.user`, `.vs/`
- **通用**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `.vscode/`, `.idea/`, `.env*`

可使用脚本辅助验证：`scripts/validate-project-setup.sh --json`

### 1.5 创建隔离环境

- 使用 git worktree 隔离开发环境
- 参考 `using-git-worktrees` 技能

---

## Step 2: 宪法门禁

**目标**: 确保任务列表符合项目宪法原则

### 2.1 逐原则审查

如果 `.specforge/constitution.md` 存在：
- [ ] TASKS.md 中的所有任务是否符合宪法原则？
- [ ] 是否有违反"测试优先"原则的步骤？
- [ ] 是否有违反"复用优先"原则的新增（未检索已有实现）？

### 2.2 门禁结果

- **通过** → 进入 Step 3
- **未通过** → **终止实现**，记录冲突，返回 planning-breakdown 调整任务
- **宪法不存在** → 跳过此步，但输出提醒

可使用脚本辅助检查：`scripts/check-constitution.sh --json`

---

## Step 3: 按依赖顺序执行任务

**目标**: 按 TASKS.md 中的依赖关系顺序执行任务，对每个任务执行完整的实现→审查→修复循环

> **清窗协议**：当检测到清窗触发信号（token > 50k / 连续失败 ≥ 2 / 复读迹象 / 用户感觉打转）时，
> 加载 `context-reset-protocol` skill 并按其流程执行。
> 详见：`.specforge/skills/workflow-steps/context-reset-protocol/SKILL.md`

> **Constitution P9（反重复与验证前置）**：对同一根因的重试必须书面声明差异；
> 无法声明差异则停下反问用户。验证前置 Iron Law 适用所有阶段。
> 详见：`.specforge/constitution.md` P9 章节。

### 3.1 模型选择策略

在派发子代理前，根据任务复杂度选择模型：

| 任务特征 | 推荐模型 |
|---------|---------|
| 1-2 个文件 + 完整规格 | 便宜快速模型 |
| 多文件 + 集成考虑 | 标准模型 |
| 需要设计判断或广泛代码库理解 | 最强可用模型 |

### 3.2 子代理驱动执行循环

对每个任务执行完整的实现→审查→修复循环：

```
下一个就绪任务
  │
  ├── ① 派发 implementer 子代理
  │     - 提供完整任务文本（粘贴到提示词，不要让子代理读文件）
  │     - 提供上下文（场景、依赖、架构）
  │     - TDD: 先写失败测试 → 实现最少代码 → 运行测试 → 提交
  │     - 实现者自审（完整性/质量/纪律/测试）
  │     - 返回状态: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  ├── ② 处理实现者状态
  │     - DONE → 进入规格审查
  │     - DONE_WITH_CONCERNS → 阅读疑虑，解决正确性问题后继续
  │     - NEEDS_CONTEXT → 提供缺失上下文，重新派发
  │     - BLOCKED → 评估阻塞原因：
  │         * 上下文问题 → 提供更多上下文 + 同一模型重新派发
  │         * 需要更强推理 → 用更强模型重新派发
  │         * 任务太大 → 拆分为更小子任务
  │         * 计划有问题 → 上报给用户
  │
  ├── ③ 派发 spec-reviewer 子代理（阶段一：规格合规性）
  │     - 逐行对比实际实现和需求
  │     - 检查：缺失需求、多余工作、理解偏差
  │     - 关键：不信任实现者报告，阅读实际代码验证
  │     - 结论: ✅ 符合规格 / ❌ 发现问题（附 file:line 引用）
  │
  ├── ④ 规格审查修复循环
  │     - 发现问题 → 实现者修复 → 规格审查者重新审查
  │     - 重复直到通过
  │     - 绝不跳过重新审查
  │
  ├── ⑤ 派发 code-quality-reviewer 子代理（阶段二：代码质量）
  │     - 风格检查（命名、注释、结构）
  │     - 安全检查（注入、泄露、权限）
  │     - 性能检查（N+1、不必要序列化、内存）
  │     - 可维护性（重复代码、耦合、复杂度）
  │     - 检查每个文件是否有单一明确职责
  │     - 结论: Critical / Important / Minor
  │
  ├── ⑥ 质量审查修复循环（Fix-First 启发式）
  │     - Critical → ASK 用户（风险高，需人工判断）
  │     - Important → AUTO-FIX（机械性修复，资深工程师不会争议）
  │     - Minor → 记录，标记完成
  │     - 修复后重新审查直到通过
  │
  ├── ⑦ 派发专项审查子代理（按需并行）
  │     - testing specialist: 负路径测试、边界情况、测试隔离
  │     - security specialist: Trust Boundary、Auth/Authz、注入向量
  │     - performance specialist: N+1、Missing Indexes、Algorithm Complexity
  │     - 其他: maintainability、data-migration、api-contract、red-team
  │     - 输出: JSON 格式发现结果（severity/confidence/path/line/summary/fix）
  │
  └── ⑧ 标记任务完成
        - 在 TASKS.md 中标记 [x]
        - 记录实际耗时（与预估对比）
        - 所有审查通过才能标记完成
```

**子代理提示词模板** 详见：[references/subagent-prompts.md](references/subagent-prompts.md)

### 3.2a 三层串联结果聚合（必填 JSON）

每个任务收尾时，主代理必须聚合 implementer / spec-reviewer / code-quality-reviewer 三层产出为一个统一 JSON，附在该任务的 commit message 或 TASKS.md 任务条目末尾：

```json
{
  "taskId": "T012",
  "loops": {
    "implementer": {
      "status": "DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED",
      "filesChanged": ["src/...", "tests/..."],
      "testsAdded": ["tests/.../foo.test.ts"],
      "selfReview": {
        "completeness": "...",
        "tdd": "RED→GREEN→REFACTOR 完整 / 跳过原因",
        "concerns": ["..."]
      }
    },
    "specReviewer": {
      "verdict": "PASS | FAIL",
      "issues": [
        {"severity": "Critical|Important|Minor", "evidence": "src/file.ts:120", "summary": "..."}
      ],
      "iterations": 1
    },
    "codeQualityReviewer": {
      "verdict": "PASS | PASS_WITH_NOTES | FAIL",
      "findings": [
        {"category": "security|testing|performance|maintainability", "severity": "...", "summary": "...", "fix": "..."}
      ],
      "iterations": 1
    }
  },
  "specialists": [
    {"specialist": "security", "criticalCount": 0, "importantCount": 1}
  ],
  "decision": "DONE | NEEDS_REWORK | BLOCKED"
}
```

**Decision 规则（不可绕过）**：
1. `implementer.status != DONE` → `BLOCKED` 或 `NEEDS_REWORK`
2. `specReviewer.verdict != PASS` → `NEEDS_REWORK`
3. `codeQualityReviewer.verdict == FAIL` 或 出现任何 Critical → `NEEDS_REWORK`
4. 所有 `specialists` 的 `criticalCount` 必须为 0
5. 满足以上 4 条 → `DONE`

聚合 JSON 是 **该任务通过三层闭环的唯一证据**，缺失或残缺即视为该任务未完成。

### 3.3 TDD 三步节奏（每个实现任务）

```
1. RED   — 编写失败的测试
   - 测试文件：tests/xxx.test.ts（或对应语言框架）
   - 清晰的 Given/When/Then 描述
   - 运行测试确认失败（且失败原因符合预期）

2. GREEN — 实现最少代码使测试通过
   - 只写够让测试通过的代码
   - 不过度设计、不提前抽象
   - 运行测试确认通过

3. REFACTOR — 重构（仅在测试通过后）
   - 消除重复、改善命名、提取公共方法
   - 运行测试确认仍然通过
   - Commit
```

### 3.4 子代理红线规则

**绝不**:
- 未经用户明确同意在 main/master 分支上实现
- 跳过审查（规格合规性或代码质量）
- 带着未修复的问题继续下一个任务
- 并行派发多个实现子代理（会冲突）
- 让子代理读计划文件（应提供完整文本）
- 跳过场景铺设上下文（子代理需要理解任务在哪个环节）
- 忽视子代理的问题（在让它们继续之前先回答）
- 在规格合规性上接受"差不多就行"（规格审查发现问题 = 未完成）
- 跳过审查循环（审查者发现问题 = 实现者修复 = 再次审查）
- 让实现者的自审替代正式审查（两者都需要）
- 在规格合规性审查通过之前开始代码质量审查（顺序错误）
- 在任一审查有未解决问题时就进入下一个任务

**如果子代理提问**:
- 清晰完整地回答
- 必要时提供额外上下文
- 不要催促它们进入实现阶段

**如果审查者发现问题**:
- 实现者（同一子代理）修复
- 审查者再次审查
- 重复直到通过
- 不要跳过重新审查

**如果子代理失败**:
- 派发修复子代理并提供具体指令
- 不要尝试手动修复（上下文污染）

### 3.5 提交前边界对账（Pre-commit Boundary Check）

**目标**: 在每个任务提交前，对比 `git diff` 实际改动与任务声明的 `write_files` 边界，防止越界修改。

**前置条件**: 任务块含 `read_files` / `write_files` 字段（由 `planning-breakdown` 阶段生成）。

#### 3.5.1 对账流程

```
任务实现完毕、审查通过、准备提交
  │
  ├── ① 获取变更文件列表
  │     git diff --name-only HEAD
  │
  ├── ② 调用边界校验
  │     enforceBoundary(taskDef, gitDiff)
  │     → 返回 BoundaryCheckResult { ok, violatingFiles, missingCoverage }
  │
  ├── ③ 判定结果
  │     ├── ok === true → 正常提交，进入下一任务
  │     └── ok === false → 触发 E009_scopeBoundaryViolation
  │
  └── ④ 越界处理（二选一，禁止沉默继续）
        ├── (a) 回滚越界改动
        │     - git checkout -- <violatingFiles>
        │     - 重新审查剩余改动是否仍满足任务验收
        │
        └── (b) 扩边界（需用户明确确认）
              - 向用户展示越界文件清单与扩边界理由
              - 获得用户 confirm 后：
                1. 更新 TASKS.md 中该任务块的 write_files 字段
                2. 在 CHANGELOGS 记录扩边界原因（格式：`boundary-expand: T-<id> 新增 <file> 原因 <reason>`）
              - 用户 reject → 回退到 (a) 回滚
```

#### 3.5.2 向后兼容（历史任务缺失边界字段）

WHERE 历史 TASKS.md 任务块缺失 `read_files` / `write_files` 字段：
- **跳过边界对账**，不将缺字段误判为越界
- **给出一次性升级提示**：

```text
⚠️ 任务 T-<id> 缺少 read_files / write_files 边界声明，已跳过对账。
   建议：在 TASKS.md 中为该任务补充边界字段以启用提交前对账保护。
   参考：specforge planning-breakdown 生成的任务模板已包含这两个字段。
```

#### 3.5.3 错误码引用

越界触发错误码 **E009_scopeBoundaryViolation**（定义见 `.specforge/config.yaml#errors`）：
- **signals**: `git diff --name-only` 结果包含 `write_files` 未声明文件
- **diagnosis**: 检查 TASKS.md 中该任务的 `write_files` 是否完整；确认越界文件是否属于当前任务本应触碰的范围
- **fix**: 回滚越界改动；或显式扩 `write_files` 并获用户确认

### 3.6 LESSONS 命中检查（每任务开始前）

**目标**：防止 AI 代理重复踩入已记录的失败路径。

**流程**：
1. 每个任务开始前，运行 `grepLessons(taskContext)` 对 `specforge/context/lessons.md` 中 `status === 'active'` 的条目做关键词匹配
2. 若命中 ≥ 1 条 LESSONS：
   - AI 代理必须在二选一中明确声明：
     a. **仍适用**：「本任务与 L-NNN 描述的场景一致，我将遵循其推荐做法」
     b. **书面声明差异**：「本次与 L-NNN 的差异是 X，因此不采用其推荐做法」
   - 未做任何声明即继续实施 → 违反 Constitution P9 → 触发 **E010_repeatedFailurePattern**
3. 若未命中 → 正常继续

**P9 关联**：本步骤是 Constitution P9（反重复与验证前置）在 LESSONS 维度的落地执行。

---

## Step 4: 阶段收尾检查

### 4.1 完成度检查
- [ ] 所有 P0 (P1) 任务标记为 [x]？
- [ ] 所有任务的三层审查通过？
- [ ] 无残留 Critical/Important 反馈？
- [ ] 所有专项审查通过？

### 4.2 测试检查
- [ ] 所有测试通过？（运行本语言生态的测试命令，参见 language-adapters。Node `pnpm test` / Python `pytest` / Maven `mvn test` / Gradle `gradle test` / Go `go test ./...` / Rust `cargo test` / .NET `dotnet test`）
- [ ] 新代码的测试覆盖率符合 DESIGN.md 中的测试策略？
- [ ] 无跳过的测试？无注释掉的断言？

### 4.3 代码质量检查
- [ ] Lint 命令通过？（参见 language-adapters：Node `pnpm lint` / Python `ruff check .` / Maven `mvn spotless:check` / Go `golangci-lint run` / Rust `cargo clippy -- -D warnings` / .NET `dotnet format --verify-no-changes`）
- [ ] 构建命令通过？（参见 language-adapters 第 1 节“构建”行）
- [ ] 无调试代码残留？（例：console.log / print / fmt.Println / dbg!()、调试器断点、临时注释）

---

## Step 5: 扩展钩子检查（after_implement）

**目标**: 实现完成后执行后续扩展逻辑

- 检查 `.specforge/extensions.yml` 的 `hooks.after_implement`
- 过滤掉 `enabled: false` 的钩子
- 执行 mandatory 钩子，提示 optional 钩子
- 钩子失败则记录警告（不阻断，因实现已完成）

详细配置指南见：[references/extension-hooks-guide.md](references/extension-hooks-guide.md)

---

## Step 6: 完成衔接

**产物**:
- 代码变更（在 worktree 或当前分支中）
- `specforge/changes/<ChangeName>/TASKS.md` — 所有任务复选框标记 [x]
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: implementation）

**下一步**: 执行 `quality-verify` 命令，进行完整的质量验证闭环。

**警告**: 在进入 quality-verify 之前，必须确认所有 P0 任务已完成、测试全部通过、审查无未解决问题。未完成的任务不能带入质量阶段。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**: 缺少 TASKS.md 或 DESIGN.md → 回到 planning-breakdown / design-explore
- **E004_noVerificationEvidence**: 未提供你亲自运行的测试命令 PASS 输出 → 禁止进入 quality-verify
- **E005_constitutionViolation**: 任务违反宪法原则 → 终止实现，返回 planning 调整
- **E006_checklistIncomplete**: 关键清单未完成 → 询问用户是否继续，或补充完成清单
- **E007_specReviewFailed**: 规格审查未通过就进入质量审查 → 回退到规格审查修复循环
- **E008_subagentBlocked**: 子代理阻塞未正确处理 → 根据阻塞原因提供上下文/拆分任务/升级模型/上报用户
- **E009_scopeBoundaryViolation**: 提交前对账发现越界文件 → 回滚越界改动，或扩 write_files 并获用户确认（详见 § 3.5）
- **E010_repeatedFailurePattern**: LESSONS 命中但未书面声明差异或「仍适用」→ 违反 P9，停止实施并要求 AI 代理补充声明（详见 § 3.6）

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "这个任务很简单，不需要先写测试" | 简单的代码也会出错。没有测试 = 没有安全网。先写代码再补测试不是 TDD——那是 TAD（测试辅助开发） |
| "不用子代理审查，我自己看一下就行" | 自己审查自己的代码有确认偏误。独立的子代理审查才能发现盲点 |
| "Critical 问题后面再修，先继续写" | 未修复的 Critical 问题会像滚雪球一样积累。每多写一行代码，修复成本就增加一分 |
| "规格审查差不多就行了" | 规格审查发现问题 = 未完成。绝不接受"差不多" |
| "先写着代码，设计有出入后面调" | 实现与设计偏差过大应停下来更新设计，而非绕过审查继续写 |
| "专项审查太麻烦，跳过吧" | 专项审查发现的是深层问题（安全/性能/测试缺口），后期修复成本更高 |
| "扩展钩子不重要，直接跳过" | 扩展钩子是项目自定义的关键门禁，跳过可能导致不符合项目约定 |
