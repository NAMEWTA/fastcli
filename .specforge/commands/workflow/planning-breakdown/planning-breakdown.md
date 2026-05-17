---
name: planning-breakdown
type: workflow-command
description: >-
  任务拆解与依赖编排——文件结构先行、小步骤任务拆解（2-5分钟/步）、复杂度分析、DAG 依赖编排、禁止占位符扫描（6种缺陷）、规格覆盖自检。
  触发场景："任务拆分"、"实施计划"、"工作计划"、"拆解任务"、"生成任务列表"。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配任务拆解/计划/复杂度相关技能
specforge list --skills --triggers=tasks,breakdown,planning,complexity --format=json

# 前置产物检测（DESIGN.md 必须就绪）
specforge status --phase=planning --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->

<!-- route-statement
路由：planning-breakdown
Change-ID：{{changeId}}
已加载：
  - planning-breakdown.md (本文件)
  - DESIGN.md (技术方案与架构)
未加载（后续按需）：
  - references/planning-patterns.md（预算 40 行）
  - references/phase-structure.md（预算 30 行）
  - references/tdd-examples.md（预算 25 行）
  - references/complexity-guide.md（预算 35 行）
  - references/artifact-graph-spec.md（预算 20 行）
第一动作：加载设计文档与产物图，确认任务拆解范围
Token 预算估算：约 4000 tokens
-->

# 任务拆解与依赖编排

## Iron Law

> **禁止占位符——TASKS.md 中每步必须包含实际代码和命令。** "待定"、"TODO"、"后续实现"、"添加适当的错误处理"均为违规。

门禁引用：如 TASKS.md 存在占位符或缺少依赖/验收口径，视为 planning 阶段未完成，禁止进入 implementation（对应 `.specforge/config.yaml` 的 planning 规则）。

---

## Step 1: 加载设计文档与产物图

### 1.1 读取设计文档
- **PROPOSAL.md**（变更动机与范围）
- **DESIGN.md**（技术方案与架构）
- **specs/\*\*/\*.md**（规格说明，如果存在）

提取关键信息：
- 架构概览和模块划分
- 接口定义（数据结构和 API 端点）
- 涉及文件清单
- 测试策略

同时读取：
- `.specforge/config.yaml` — planning 规则、错误字典、handoffs
- `specforge/config.yaml` — 项目级上下文与覆盖规则

### 1.2 加载产物依赖图

参考 `references/artifact-graph-spec.md`，定义并验证本变更的产物依赖关系：

```yaml
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
    
  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
    
  - id: design
    generates: design.md
    requires: [proposal]
    
  - id: tasks
    generates: tasks.md
    requires: [specs, design]
```

验证清单：
- [ ] 所有产物 ID 唯一
- [ ] 所有 requires 引用有效
- [ ] 无循环依赖
- [ ] 计算构建顺序（使用 Kahn 算法）

### 1.3 确认范围

- 检查 DESIGN.md 中列出的文件/模块范围是否清晰
- 如果 DESIGN.md 涵盖多个独立子系统，建议拆分为独立计划
- 每个独立计划应能独立产出可工作、可测试的软件

---

## Step 2: 文件结构先行

**目标**：拆任务前先锁定文件清单和职责。先确定"哪些文件需要动"，再确定"每个文件做什么"。

参考：`references/planning-patterns.md` → 模式 1

### 2.1 文件清单模板

对每个涉及的文件，明确：
```
- 操作：创建 / 修改（第 N-M 行） / 删除
- 路径：exact/path/to/file.ts
- 职责：一句话描述
- 测试：tests/exact/path/to/file.test.ts
```

### 2.2 设计原则检查

- [ ] 每个文件一个职责（单一职责）
- [ ] 一起变更的文件放在一起
- [ ] 优先小而专注的文件（而非大而全的文件）
- [ ] 没有两个文件做同一件事
- [ ] 遵循现有代码库模式

---

## Step 3: 小步骤任务拆解

**目标**：按小步骤粒度拆解任务，以 Phase 结构组织。

参考：
- `references/planning-patterns.md` → 模式 2（小步骤拆解）
- `references/phase-structure.md` → Phase 组织
- `references/tdd-examples.md` → TDD 节奏示例

### 3.1 Phase 结构

按 Phase 约定组织任务：

```
Phase 1: Setup（环境准备）
  - 项目初始化、配置、依赖安装
  - 无前置依赖，可立即开始

Phase 2: Foundational（基础设施）
  - 数据模型、基础异常类、认证框架
  - ⚠️ CRITICAL: 阻塞所有 User Story

Phase 3: User Story 1 — <标题> (P1) 🎯 MVP
  - 按 TDD 节奏：测试 → 实现 → 验证 → Commit
  - 独立可测试

Phase 4: User Story 2 — <标题> (P2)
  - 可与 US1 并行（如果团队容量允许）

Phase N: Polish（收尾）
  - 文档、性能优化、安全加固
```

详细 Phase 说明请参考 `references/phase-structure.md`。

### 3.2 粒度对照

| 粒度 | 时长 | 示例 | 评价 |
|------|------|------|------|
| 过粗 | > 15 分钟 | "实现用户模块"（含 8 个文件、15 个函数） | ❌ |
| 合适 | 2-5 分钟 | "编写 UserService.createUser 的失败测试" | ✅ |
| 过细 | < 1 分钟 | "创建 user.ts 文件"（没有实际逻辑） | ❌ |

### 3.3 TDD 节奏标注

参考 `references/tdd-examples.md`，对每个实现任务标注 TDD 循环：

```
- [ ] T00X [P] [US1] 编写 <场景> 的失败测试 → 运行确认失败 → 实现最少代码 → 运行确认通过 → Commit
  - 测试文件：<test-file>（例：`tests/unit/xxx.test.ts` / `tests/test_xxx.py` / `src/test/java/.../XxxTest.java` / `internal/xxx_test.go`）
  - 实现文件：<impl-file>
  - 测试命令：<test-command>（参见 skills/workflow-steps/language-adapters 第 1 节；Node: `pnpm test <file>` / Python: `pytest <file>` / Maven: `mvn -Dtest=<Class> test` / Go: `go test ./...`）
```

---

## Step 4: 复杂度分析（含自动评分）

**目标**：评估每个任务复杂度，标记高复杂度任务推荐拆解。

**强制使用显式评分公式**（参见 `references/complexity-guide.md` 第六节）：

```
score = D + 2 * (M - 1) + 3 * U
   D：依赖数  M：模块跨度  U：未知风险（0..3）
```

| score | 等级 | 处理 |
|-------|------|------|
| 0-1 | S | 直接执行 |
| 2-4 | M | 直接执行（≤ 1h） |
| 5-8 | L | 标注 [COMPLEX]，建议拆解 |
| ≥ 9 | XL | **必须**拆解为 ≥ 2 子任务 |

每个任务在 TASKS.md 中应附带评分元组，例如：

```
- [ ] T015 [COMPLEX score=9 D=2 M=3 U=1] 实现用户认证模块
```

详细评分自检与反规避请阅 `references/complexity-guide.md` 第六节。

### 4.1 复杂度评级

| 级别 | 标准 | 处理策略 | 示例 |
|------|------|---------|------|
| **S（简单）** | 单一文件、单一关注点、无外部依赖 | 正常执行 | 添加配置项、修改常量 |
| **M（中等）** | 多文件、单一模块、有外部依赖 | 注意审查 | 新增服务层、修改 API |
| **L（复杂）** | 跨模块、多依赖、需数据迁移 | 标注 [COMPLEX]，建议拆解 | 重构核心模块、引入新框架 |
| **XL（极复杂）** | 跨系统、架构变更、多团队协作 | 必须拆解为 2+ 个子任务 | 微服务拆分、数据库迁移 |

### 4.2 任务扩展机制

当任务复杂度为 L 或 XL 时，使用任务扩展：

```json
{
  "subtasks": [
    {
      "id": 45,
      "title": "清晰的子任务标题",
      "description": "详细的子任务描述（至少10字符）",
      "dependencies": [],
      "details": "实现细节（至少20字符，包含文件、函数、算法）",
      "status": "pending",
      "testStrategy": "测试策略（可选）"
    }
  ]
}
```

### 4.3 复杂度分布检查

- 如果 L+XL 任务占比 > 30%，考虑重新设计（设计可能过于复杂）
- 如果所有任务都是 S，考虑是否粒度太细
- 健康分布：S(40-60%) / M(30-40%) / L(10-20%) / XL(0-10%)

---

## Step 5: 依赖编排

**目标**：通过 DAG 依赖管理编排任务执行顺序。

参考：`references/artifact-graph-spec.md`

### 5.1 任务依赖标注

每个任务标注：
- **[P]** — 可并行执行（无前置依赖，且不与其他 [P] 任务共享状态）
- **依赖 T00X** — 必须等待 T00X 完成后才能开始
- **依赖 T00X, T00Y** — 多个前置依赖

### 5.2 产物依赖图

在 TASKS.md 中定义产物依赖关系（参考 Step 1.2）：

```
proposal → specs → tasks
       ↘ design ↗
```

### 5.3 DAG 验证

- [ ] 无循环依赖（A → B → A）
- [ ] 所有 requires 引用有效
- [ ] Foundational 阶段不依赖 User Story 阶段
- [ ] 同一 User Story 内的任务按 TDD 顺序排列

### 5.4 并行机会识别

找出所有标记 [P] 的任务，确认它们之间：
- 无共享状态
- 无顺序依赖
- 可分配不同子代理同时执行

使用 artifact-graph 的 `getNextArtifacts(completed)` 概念，识别当前可执行的任务。

---

## Step 6: 禁止占位符扫描

**目标**：逐一检查任务描述中的 6 种"计划缺陷"。

参考：`references/planning-patterns.md` → 模式 2

### 6.1 6 种违规模式

| # | 违规模式 | 示例（禁止） | 修复 |
|---|---------|-------------|------|
| 1 | 模糊占位符 | "待定"/"TODO"/"后续实现" | 补充具体实现方案或删除该任务 |
| 2 | 空洞错误处理 | "添加适当的错误处理" | 明确错误类型和处理方式 |
| 3 | 伪测试任务 | "为上述代码编写测试" | 写出具体测试场景和断言 |
| 4 | 重复引用 | "类似任务 N" | 独立描述，或合并为同一个任务 |
| 5 | 只描述做什么 | "实现用户登录" | 描述怎么做：文件、函数、算法 |
| 6 | 引用未定义 | 引用不存在的类型/函数/方法 | 确保所有引用在设计文档中已定义 |

### 6.2 扫描并修复

逐一审查每个任务描述，发现违规立即修复。**含占位符的 TASKS.md 不能进入 implementation。**

---

## Step 7: 规格覆盖自检

**目标**：对照 DESIGN.md 和 PROPOSAL.md 逐需求核对。

参考：`references/planning-patterns.md` → 模式 4、5

### 7.1 覆盖率检查

| PROPOSAL 能力 | 对应任务 | 覆盖？ |
|--------------|---------|--------|
| Capability 1 | T005, T006, T007 | ✓ |
| Capability 2 | T008, T009 | ✓ |
| Capability 3 | — | ✗ 缺失！需补充 T010-T015 |

### 7.2 类型一致性检查

- 任务中引用的函数签名与 DESIGN.md 中的接口定义一致？
- 数据类型命名与架构设计中的命名一致？
- 常见不一致：函数名、类型名、参数顺序、属性名

### 7.3 内联修复

发现覆盖缺口 → 立即补充任务。发现类型不一致 → 立即修正。

---

## Step 8: 生成 TASKS.md

参考：`references/checklist-format.md`

### 8.1 TASKS.md 模板

严格遵循清单格式：`- [ ] [TaskID] [P?] [Story?] Description with file path`

```markdown
# TASKS: <ChangeName>

## 执行概览
- 总任务数：<N>
- 预估总时长：<M> 分钟
- 可并行任务：<K> 个
- 复杂度分布：S(<n>) / M(<m>) / L(<l>) / XL(<xl>)

## 产物依赖图
proposal → specs → tasks
       ↘ design ↗

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create project structure per implementation plan
  - 目录：src/, tests/, docs/
  
- [ ] T002 [P] Initialize [language] project with [framework] dependencies
  - 命令：<add-dep-command>（参见 language-adapters：Node `pnpm add <pkg>` / Python `poetry add <pkg>` / Maven 编辑 `pom.xml` / Go `go get <pkg>` / Rust `cargo add <pkg>`）

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 创建数据模型 in src/models/user.ts
  - 字段：id, email, name, createdAt
  
- [ ] T004 [P] 创建基础异常类 in src/errors.ts

**Checkpoint**: Foundation ready - user story work can begin

## Phase 3: User Story 1 — <标题> (P1) 🎯 MVP

**Goal**: <一句话描述>
**Independent Test**: <如何独立验证>

### Implementation for User Story 1

- [ ] T005 [US1] 编写 createUser 失败测试
  - 文件：<test-file>（例 TS: `tests/unit/services/user-service.test.ts` / Python: `tests/services/test_user_service.py` / Java: `src/test/java/.../UserServiceTest.java`）
  - 断言：<assertion>（例 TS: `expect(user.email).toBe('test@example.com')` / Python: `assert user.email == 'test@example.com'` / JUnit: `assertEquals("test@example.com", user.getEmail())`）
  - 运行：<test-command-for-single-file>（参见 language-adapters）
  - 预期：FAIL - "createUser is not defined / undefined"

- [ ] T006 [US1] 实现 createUser 最少代码
  - 文件：src/services/user-service.ts
  - 实现：返回 mock user 对象

- [ ] T007 [US1] 运行测试确认通过
  - 运行：<test-command-for-single-file>
  - 预期：PASS ✓

- [ ] T008 [US1] Commit
  - 命令：git commit -m "feat(user): add createUser service"

**Checkpoint**: User Story 1 independently functional

## Phase 4-N: User Stories

[按相同模式展开 User Story 2, 3...]

## Phase N+1: Polish

**Purpose**: Improvements that affect multiple user stories

- [ ] T01N [P] 文档更新 in docs/
- [ ] T01N+1 最终测试运行：<test-command>（参见 language-adapters）

## 复杂度说明
| 任务 | 复杂度 | 理由 |
|------|--------|------|
| T005 | M | 涉及测试+实现两个文件 |

## 执行建议
- MVP 策略：完成 User Story 1 后即可交付
- 并行策略：T001/T002 可并行，US1/US2 可并行（如果团队容量允许）
```

### 8.2 格式验证

参考 `references/checklist-format.md`，逐一检查：

- [ ] 所有任务使用 `- [ ]` 复选框
- [ ] 所有任务有唯一 Task ID（T001, T002...）
- [ ] Task ID 按执行顺序连续编号
- [ ] 并行任务标注 [P]
- [ ] User Story 任务标注 [US1], [US2]...
- [ ] Setup/Foundational/Polish 阶段无 Story 标签
- [ ] 所有任务包含精确文件路径
- [ ] 描述清晰明确
- [ ] 每个 Phase 有 Checkpoint 标记

---

## Step 9: 执行交接

参考：`references/planning-patterns.md` → 模式 6

**任务完成后的执行方式**：

1. **子代理驱动（推荐）**：使用 `implementation-build` 命令
   - 每个任务派发新子代理
   - 三层审查自动执行
   - 快速迭代，失败隔离

2. **内联执行**：在当前会话中逐任务执行
   - 适合简单任务或调试场景
   - 批量执行并设有检查点

交接模板：
```
计划已完成并保存到 `specforge/changes/<ChangeName>/TASKS.md`。

执行概览：
- 总任务数：<N>
- 预估总时长：<M> 分钟
- 可并行任务：<K> 个

两种执行方式：
1. 子代理驱动（推荐）- 使用 implementation-build 命令
2. 内联执行 - 在当前会话中执行

选哪种方式？
```

---

## Step 10: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/TASKS.md` — 任务列表（已通过占位符扫描 + 规格覆盖自检）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: planning）
- `specforge/changes/<ChangeName>/artifact-graph.yaml` — 产物依赖图（可选）

**下一步**：执行 `implementation-build` 命令，按照 TASKS.md 进行开发实现。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：缺少 DESIGN.md → 回到 design-explore。
- **E003_contractMissing**：DESIGN.md 缺少契约/错误策略导致任务无法落地 → 先补设计再拆解。
- **E004_circularDependency**：产物依赖图存在循环依赖 → 检查 requires 字段，消除循环。

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "任务拆太细浪费时间" | 花 10 分钟拆任务，省 2 小时来回返工。2-5 分钟粒度是经过验证的最优区间 |
| "这个任务很简单，不用写文件路径" | 没有精确文件路径的任务 = "在某个地方做某事"。子代理无法执行模糊任务 |
| "TODO 后面再细化" | TODO 在代码里活不过 1 周。在计划里活不过 1 天 |
| "不需要复杂度分析，都差不多" | 没有复杂度分析就无法合理分配并行任务和评估风险 |
| "产物依赖图没必要" | 没有产物图就无法明确工作流顺序和阻塞关系，容易遗漏关键文档 |
