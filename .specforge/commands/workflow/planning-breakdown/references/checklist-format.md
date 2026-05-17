# Checklist Format（任务清单格式规范）

> 本文件定义了 SpecForge 严格的任务清单格式，确保每个任务都可执行、可追踪、可验证。所有 TASKS.md 文件必须严格遵循此格式。

---

## 一、核心格式

### 1.1 标准格式

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

### 1.2 格式组件

| 组件 | 必需 | 格式 | 说明 | 示例 |
|------|------|------|------|------|
| **复选框** | ✅ | `- [ ]` | Markdown 复选框，用于追踪进度 | `- [ ]` |
| **Task ID** | ✅ | `T001`, `T002`... | 顺序编号，执行顺序 | `T001` |
| **[P] 标记** | 可选 | `[P]` | 可并行执行（无依赖，不共享状态） | `[P]` |
| **[Story] 标签** | 条件 | `[US1]`, `[US2]`... | 仅 User Story 阶段需要 | `[US1]` |
| **描述** | ✅ | 文本 + 文件路径 | 清晰的动作描述 + 精确文件路径 | `Create User model in src/models/user.ts` |

---

## 二、正确与错误示例

### ✅ 正确示例

```markdown
✅ 完整格式（User Story 阶段）：
- [ ] T012 [P] [US1] Create User model in src/models/user.ts

✅ 无并行标记（User Story 阶段）：
- [ ] T014 [US1] Implement UserService in src/services/user-service.ts

✅ Setup/Foundational 阶段（无 Story 标签）：
- [ ] T001 [P] Create project structure per implementation plan

✅ 带详细子项：
- [ ] T007 [US1] 编写 createUser 失败测试
  - 文件：tests/unit/services/user-service.test.ts
  - 断言：expect(user.email).toBe('test@example.com')
```

### ❌ 错误示例

```markdown
❌ 缺少复选框：
T001 [US1] Create User model

❌ 缺少 Task ID：
- [ ] [US1] Create User model in src/models/user.ts

❌ 缺少文件路径：
- [ ] T001 [US1] Create User model

❌ 缺少 Story 标签（User Story 阶段）：
- [ ] T012 [P] Create User model in src/models/user.ts

❌ Setup 阶段有 Story 标签（不需要）：
- [ ] T001 [P] [US1] Create project structure

❌ 描述模糊：
- [ ] T005 实现用户功能

❌ 使用其他复选框格式：
* [ ] T001 [P] Create project
- [x] T001 [P] Create project  # 不要预勾选
```

---

## 三、Task ID 规则

### 3.1 编号规则

- **格式**: `T` + 三位数字（T001, T002, T003...）
- **顺序**: 按执行顺序编号（不是创建顺序）
- **唯一**: 每个任务 ID 必须唯一
- **连续**: 不要跳过 ID（T001, T002, T004 ❌）

### 3.2 示例

```markdown
✅ 正确：
- [ ] T001 Setup project
- [ ] T002 Install dependencies
- [ ] T003 Create database schema

❌ 错误（跳过 ID）：
- [ ] T001 Setup project
- [ ] T003 Install dependencies  # 缺少 T002
- [ ] T004 Create database schema

❌ 错误（不连续编号）：
- [ ] T001 Setup project
- [ ] T010 Install dependencies  # 应该用 T002
- [ ] T100 Create database schema  # 应该用 T003
```

---

## 四、[P] 并行标记规则

### 4.1 何时使用 [P]

任务可以标记为 [P]（Parallel）当且仅当：

1. **无前置依赖**：不依赖其他未完成的任务
2. **不共享状态**：与其他 [P] 任务不修改同一文件或状态
3. **可独立执行**：可以分配给不同的开发者/子代理同时执行

### 4.2 示例

```markdown
✅ 可以标记 [P]：
- [ ] T001 [P] Create src/models/user.ts  # 修改文件 A
- [ ] T002 [P] Create src/models/product.ts  # 修改文件 B，与 T001 无关

❌ 不能标记 [P]：
- [ ] T003 [P] Create src/services/user-service.ts  # 依赖 T001 的 User 模型
- [ ] T004 [P] Update src/models/user.ts  # 与 T001 修改同一文件
```

### 4.3 并行执行示例

```bash
# 可以并行执行：
Task: T001 [P] Create src/models/user.ts
Task: T002 [P] Create src/models/product.ts
Task: T003 [P] Create src/models/order.ts

# 必须顺序执行：
Task: T004 Create src/services/user-service.ts  # 依赖 T001
Task: T005 Create src/services/product-service.ts  # 依赖 T002
Task: T006 Integrate all services  # 依赖 T004, T005
```

---

## 五、[Story] 标签规则

### 5.1 何时使用 Story 标签

| Phase | 是否需要 Story 标签 | 格式 |
|-------|-------------------|------|
| **Setup** | ❌ 不需要 | - |
| **Foundational** | ❌ 不需要 | - |
| **User Story 1** | ✅ 需要 | `[US1]` |
| **User Story 2** | ✅ 需要 | `[US2]` |
| **User Story 3** | ✅ 需要 | `[US3]` |
| **Polish** | ❌ 不需要 | - |

### 5.2 示例

```markdown
## Phase 1: Setup
- [ ] T001 [P] Create project structure  # ❌ 不需要 [US1]

## Phase 2: Foundational
- [ ] T004 Create database schema  # ❌ 不需要 [US1]

## Phase 3: User Story 1 — 用户注册 (P1)
- [ ] T007 [P] [US1] Create UserRegistrationDto  # ✅ 需要 [US1]
- [ ] T008 [US1] Implement registration service  # ✅ 需要 [US1]

## Phase 4: User Story 2 — 用户登录 (P2)
- [ ] T015 [P] [US2] Create LoginDto  # ✅ 需要 [US2]
- [ ] T016 [US2] Implement login service  # ✅ 需要 [US2]

## Phase N: Polish
- [ ] T030 [P] Update API documentation  # ❌ 不需要 [US1]
```

---

## 六、描述规则

### 6.1 描述要求

每个任务的描述必须包含：

1. **明确的动作**：Create, Implement, Update, Delete, Test...
2. **精确的文件路径**：`src/models/user.ts`（不是"在模型文件中"）
3. **具体的目标**：什么功能、什么场景

### 6.2 示例对比

```markdown
❌ 模糊描述：
- [ ] T005 实现用户功能
- [ ] T006 添加测试
- [ ] T007 修复 bug

✅ 清晰描述：
- [ ] T005 Implement UserService.createUser in src/services/user-service.ts
- [ ] T006 Add unit tests for UserService in tests/unit/services/user-service.test.ts
- [ ] T007 Fix email validation bug in src/utils/validators.ts:45-67

✅ 带详细子项：
- [ ] T005 Implement UserService.createUser
  - 文件：src/services/user-service.ts
  - 方法：createUser(dto: CreateUserDto): Promise<User>
  - 逻辑：验证 → 哈希密码 → 创建用户 → 返回
  - 测试：tests/unit/services/user-service.test.ts
```

### 6.3 文件路径规则

- ✅ **绝对路径**（相对于项目根）：`src/services/user-service.ts`
- ✅ **带行号**（修改现有代码）：`src/services/user-service.ts:45-67`
- ❌ **相对路径**：`./user-service.ts` 或 `../services/user-service.ts`
- ❌ **模糊路径**：`in the user file` 或 `in models`

---

## 七、任务组织规则

### 7.1 从用户故事映射

```
spec.md 中的用户故事：
- US1: 用户可以注册账户 (P1)
- US2: 用户可以登录系统 (P1)
- US3: 用户可以编辑资料 (P2)

映射到 TASKS.md：
Phase 3: User Story 1 — 用户注册 (P1)
  - [ ] T007 [P] [US1] Create UserRegistrationDto
  - [ ] T008 [US1] Implement registration service
  - [ ] T009 [US1] Implement POST /api/auth/register

Phase 4: User Story 2 — 用户登录 (P1)
  - [ ] T015 [P] [US2] Create LoginDto
  - [ ] T016 [US2] Implement login service
  - [ ] T017 [US2] Implement POST /api/auth/login

Phase 5: User Story 3 — 用户资料编辑 (P2)
  - [ ] T023 [P] [US3] Create UpdateProfileDto
  - [ ] T024 [US3] Implement profile update service
  - [ ] T025 [US3] Implement PUT /api/users/:id/profile
```

### 7.2 从契约映射

```
contracts/ 中的接口契约：
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/:id

映射到 TASKS.md：
- [ ] T009 [US1] Implement POST /api/auth/register endpoint
  - 文件：src/routes/auth.ts
  - 契约：contracts/auth/register.yaml
  
- [ ] T017 [US2] Implement POST /api/auth/login endpoint
  - 文件：src/routes/auth.ts
  - 契约：contracts/auth/login.yaml
```

### 7.3 从数据模型映射

```
data-model.md 中的实体：
- User: id, email, passwordHash, name, createdAt
- Profile: userId, avatar, bio, location

映射到 TASKS.md：
- [ ] T007 [P] [US1] Create User model in src/models/user.ts
  - 字段：id, email, passwordHash, name, createdAt
  
- [ ] T023 [P] [US3] Create Profile model in src/models/profile.ts
  - 字段：userId, avatar, bio, location
  - 关系：Profile belongsTo User
```

### 7.4 从基础设施映射

```
Setup/Foundational 任务：
- [ ] T001 [P] Create project structure
  - 目录：src/, tests/, docs/, scripts/
  
- [ ] T004 Setup database schema and migrations
  - 文件：src/database/schema.ts
  - 工具：knex
  
- [ ] T007 [P] Implement JWT authentication framework
  - 文件：src/utils/jwt.ts, src/middleware/auth.ts
```

---

## 八、完整示例

### 8.1 TASKS.md 完整示例

```markdown
# TASKS: add-user-auth

## 执行概览
- 总任务数：25
- 预估总时长：180 分钟
- 可并行任务：8 个
- 复杂度分布：S(12) / M(10) / L(3) / XL(0)

## 产物依赖图
proposal → specs → tasks
       ↘ design ↗

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create project structure per implementation plan
  - 目录：src/, tests/, docs/
  
- [ ] T002 [P] Initialize TypeScript project with Express dependencies
  - 命令：`pnpm init && pnpm add express typescript`
  
- [ ] T003 [P] Configure testing framework (Vitest)
  - 命令：`pnpm add -D vitest @vitest/coverage-v8`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Setup database schema and migrations framework
  - 文件：src/database/schema.ts, src/database/migrations/
  - 工具：`pnpm add knex @types/knex`
  
- [ ] T005 [P] Implement JWT utility module
  - 文件：src/utils/jwt.ts
  - 方法：generateToken(), verifyToken()
  
- [ ] T006 [P] Create base error handling classes
  - 文件：src/errors/app-errors.ts
  
- [ ] T007 Configure Express app with middleware
  - 文件：src/app.ts, src/middleware/

**Checkpoint**: Foundation ready - user story implementation can now begin

## Phase 3: User Story 1 — 用户注册 (P1) 🎯 MVP

**Goal**: 用户可以注册新账户

**Independent Test**: 注册 → 验证邮件 → 账户激活

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create UserRegistrationDto in src/dtos/user-registration.dto.ts
  - 字段：email, password, name
  - 验证：email 格式、密码强度
  
- [ ] T009 [P] [US1] Create User model in src/models/user.ts
  - 字段：id, email, passwordHash, name, createdAt
  
- [ ] T010 [US1] Implement UserRegistrationService in src/services/user-registration.service.ts
  - 依赖：T008, T009
  - 方法：register(dto): Promise<User>
  
- [ ] T011 [US1] Implement POST /api/auth/register in src/routes/auth.ts
  - 依赖：T010
  - 响应：201 Created + User

**Checkpoint**: User Story 1 should be fully functional

## Phase 4: User Story 2 — 用户登录 (P1)

**Goal**: 已注册用户可以使用邮箱密码登录

**Independent Test**: 登录 → 获取 JWT → 访问受保护资源

### Implementation for User Story 2

- [ ] T012 [P] [US2] Create LoginDto in src/dtos/login.dto.ts
  - 字段：email, password
  
- [ ] T013 [US2] Implement AuthService in src/services/auth.service.ts
  - 依赖：T009 (User model)
  - 方法：login(dto): Promise<{ token: string }>
  
- [ ] T014 [US2] Implement POST /api/auth/login in src/routes/auth.ts
  - 依赖：T013
  - 响应：200 OK + JWT token

**Checkpoint**: User Stories 1 AND 2 should both work independently

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T015 [P] Add API documentation in docs/api.md
- [ ] T016 [P] Add integration tests in tests/integration/auth.test.ts
- [ ] T017 Run full test suite: `pnpm test`

## 复杂度说明
| 任务 | 复杂度 | 理由 |
|------|--------|------|
| T010 | M | 涉及邮件服务集成 |
| T013 | M | 涉及密码验证和 JWT 生成 |

## 执行建议
- MVP 策略：完成 User Story 1 后即可交付最小可工作版本
- 并行策略：T001/T002/T003 可并行，T005/T006 可并行
```

---

## 九、格式验证清单

在生成 TASKS.md 后，逐一检查：

- [ ] 所有任务使用 `- [ ]` 复选框
- [ ] 所有任务有唯一 Task ID（T001, T002...）
- [ ] Task ID 按执行顺序连续编号
- [ ] 并行任务标注 [P]
- [ ] User Story 任务标注 [US1], [US2]...
- [ ] Setup/Foundational/Polish 阶段无 Story 标签
- [ ] 所有任务包含精确文件路径
- [ ] 描述清晰明确（不说"实现功能"，说"实现 XX 功能在 YY 文件"）
- [ ] 每个 Phase 有 Checkpoint 标记
- [ ] Phase 顺序正确（Setup → Foundational → US1 → US2 → Polish）

---

## 十、自动化工具（未来）

### 10.1 格式验证命令

```bash
# 验证 TASKS.md 格式
specforge validate-tasks --file=specforge/changes/<ChangeName>/tasks.md

# 输出示例：
# ✅ T001: Valid
# ✅ T002: Valid
# ❌ T003: Missing file path
# ❌ T005: Missing [US1] label in User Story phase
# ❌ T007: Duplicate Task ID
```

### 10.2 格式自动修复

```bash
# 自动修复格式问题
specforge fix-tasks --file=specforge/changes/<ChangeName>/tasks.md

# 修复内容：
# - 添加缺失的 Task ID
# - 修正 Task ID 顺序
# - 添加缺失的 Story 标签
# - 标准化文件路径格式
```

---

## 使用指南

在 planning-breakdown 命令执行过程中：

- **Step 8（生成 TASKS.md）** → 严格遵循本文件的格式规范
- **Step 8.2（格式验证）** → 使用"格式验证清单"逐一检查
- **任务描述** → 参考"描述规则"和"正确与错误示例"
- **任务组织** → 参考"任务组织规则"（从用户故事、契约、数据模型映射）
