# Phase Structure（Phase 结构详解）

> 本文件详细说明了 Setup → Foundational → User Stories → Polish 的标准结构、每个阶段的目标、示例任务和完成标准。

---

## 一、Phase 结构概览

```
Phase 1: Setup（环境准备）
  ↓
Phase 2: Foundational（基础设施）⚠️ BLOCKS ALL USER STORIES
  ↓
Phase 3: User Story 1 — <标题> (P1) 🎯 MVP
  ↓
Phase 4: User Story 2 — <标题> (P2)
  ↓
Phase 5: User Story 3 — <标题> (P3)
  ↓
Phase N: Polish（收尾与跨切面关注点）
```

### 核心原则

1. **Setup 无依赖**：可立即开始
2. **Foundational 阻塞所有 User Story**：必须先完成
3. **User Stories 按优先级组织**：每个故事独立可测试
4. **Polish 依赖所有 User Stories**：最后执行

---

## 二、Phase 1: Setup（环境准备）

### 2.1 目标

搭建项目基础环境和配置，为后续开发做好准备。

### 2.2 特征

- ✅ **无前置依赖**：可立即开始
- ✅ **可并行**：大多数 Setup 任务标记为 [P]
- ✅ **快速完成**：通常在 30 分钟内完成

### 2.3 典型任务

```markdown
## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create project structure per implementation plan
  - 创建目录：src/, tests/, docs/, scripts/
  
- [ ] T002 [P] Initialize [language] project with [framework] dependencies
  - 命令：`pnpm init` 或 `npm init -y`
  - 安装核心依赖：`pnpm add express typescript`
  - 安装开发依赖：`pnpm add -D @types/node typescript vitest`
  
- [ ] T003 [P] Configure linting and formatting tools
  - 创建配置文件：.eslintrc.js, .prettierrc, tsconfig.json
  - 安装工具：`pnpm add -D eslint prettier @typescript-eslint/parser`
  
- [ ] T004 [P] Setup CI/CD pipeline (if applicable)
  - 创建 .github/workflows/ci.yml
  - 配置自动测试和 lint
  
- [ ] T005 [P] Configure environment variables
  - 创建 .env.example
  - 文档化所有必需的环境变量
```

### 2.4 完成标准

- [ ] 项目结构已创建
- [ ] 所有依赖已安装
- [ ] 配置文件已就位
- [ ] `pnpm install` 成功执行
- [ ] `pnpm test` 可以运行（即使没有测试）

### 2.5 注意事项

- ⚠️ Setup 阶段不涉及业务逻辑
- ⚠️ 不要在此阶段实现功能
- ⚠️ 所有任务应该可并行执行

---

## 三、Phase 2: Foundational（基础设施）

### 3.1 目标

构建所有 User Story 都依赖的核心基础设施。

### 3.2 特征

- ⚠️ **CRITICAL**: 阻塞所有 User Story
- ⚠️ **必须先完成**：User Story 阶段无法开始
- ⚠️ **设计决策密集**：需要明确技术选型和架构

### 3.3 典型任务

```markdown
## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Setup database schema and migrations framework
  - 文件：src/database/schema.ts, src/database/migrations/
  - 安装：`pnpm add knex @types/knex`
  - 创建初始迁移：001_create_users_table.ts
  
- [ ] T007 [P] Implement authentication/authorization framework
  - 文件：src/middleware/auth.ts, src/utils/jwt.ts
  - 实现：JWT token 生成、验证、刷新
  - 测试：tests/unit/utils/jwt.test.ts
  
- [ ] T008 [P] Setup API routing and middleware structure
  - 文件：src/routes/index.ts, src/app.ts
  - 实现：Express app 初始化、路由注册、错误处理中间件
  
- [ ] T009 Create base models/entities that all stories depend on
  - 文件：src/models/user.ts, src/models/base-model.ts
  - 定义：User 接口、BaseModel 抽象类
  
- [ ] T010 Configure error handling and logging infrastructure
  - 文件：src/utils/logger.ts, src/errors/app-errors.ts
  - 实现：结构化日志、自定义错误类型、错误边界
  
- [ ] T011 Setup environment configuration management
  - 文件：src/config/index.ts, src/config/validation.ts
  - 实现：配置加载、验证、类型安全访问

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel
```

### 3.4 完成标准

- [ ] 数据库 schema 已定义并可迁移
- [ ] 认证框架已实现并通过测试
- [ ] API 路由结构已建立
- [ ] 基础模型已定义
- [ ] 错误处理和日志系统已配置
- [ ] 所有 Foundational 任务通过测试

### 3.5 常见 Foundational 任务

| 任务类型 | 示例 | 何时需要 |
|---------|------|---------|
| 数据库 | Schema 定义、迁移框架 | 数据持久化需求 |
| 认证 | JWT、OAuth、Session | 用户认证需求 |
| API 结构 | 路由、中间件、控制器 | Web 服务需求 |
| 数据模型 | 实体、接口、DTO | 复杂数据需求 |
| 错误处理 | 自定义错误、错误边界 | 所有项目 |
| 日志系统 | 结构化日志、日志级别 | 所有项目 |
| 配置管理 | 环境变量、配置验证 | 所有项目 |

### 3.6 注意事项

- ⚠️ 只包含所有 User Story 都需要的任务
- ⚠️ User Story 特有的任务应该在对应 Story 阶段
- ⚠️ 如果 Foundational 阶段过大（> 10 任务），考虑是否包含不必要的任务

---

## 四、Phase 3+: User Stories（用户故事）

### 4.1 目标

按优先级逐个实现用户故事，每个故事独立可测试、可交付。

### 4.2 特征

- 🎯 **MVP 优先**：P1 故事是最小可交付版本
- 🎯 **独立可测试**：每个故事可独立验证
- 🎯 **可并行**：如果团队容量允许，多个故事可并行开发

### 4.3 User Story Phase 结构

每个 User Story Phase 包含：

```markdown
## Phase 3: User Story 1 — 用户注册与登录 (P1) 🎯 MVP

**Goal**: 用户可以注册新账户并通过邮箱密码登录系统

**Independent Test**: 
- 注册新用户 → 收到验证邮件 → 点击链接 → 账户激活
- 使用邮箱密码登录 → 获取 JWT token → 访问受保护资源

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Contract test for POST /api/auth/register in tests/contract/test_auth.ts
  - 验证请求格式、响应格式、错误码
  
- [ ] T013 [P] [US1] Integration test for user registration journey in tests/integration/test_registration.ts
  - 完整流程：注册 → 验证 → 登录

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create UserRegistrationDto in src/dtos/user-registration.dto.ts
  - 字段：email, password, name
  - 验证：email 格式、密码强度
  
- [ ] T015 [P] [US1] Create User model in src/models/user.ts
  - 字段：id, email, passwordHash, name, emailVerified, createdAt
  - 方法：verifyPassword(), generateEmailToken()
  
- [ ] T016 [US1] Implement UserRegistrationService in src/services/user-registration.service.ts
  - 依赖：T014, T015
  - 方法：register(dto: UserRegistrationDto): Promise<User>
  - 逻辑：验证 → 哈希密码 → 创建用户 → 发送验证邮件
  
- [ ] T017 [US1] Implement POST /api/auth/register endpoint in src/routes/auth.ts
  - 依赖：T016
  - 请求体：UserRegistrationDto
  - 响应：201 Created + User (不含密码)
  - 错误：400 Validation Error, 409 Email Exists
  
- [ ] T018 [US1] Implement email verification service in src/services/email-verification.service.ts
  - 方法：generateVerificationToken(), verifyToken(token)
  - 集成：邮件服务（如 SendGrid）
  
- [ ] T019 [US1] Implement GET /api/auth/verify-email endpoint in src/routes/auth.ts
  - 依赖：T018
  - 查询参数：token
  - 响应：200 Verified, 400 Invalid Token
  
- [ ] T020 [US1] Add validation and error handling
  - 输入验证：email 格式、密码强度
  - 错误处理：唯一性约束、邮件发送失败
  
- [ ] T021 [US1] Add logging for user story 1 operations
  - 日志：注册成功/失败、邮件发送、验证成功/失败

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

**Manual Test**:
1. POST /api/auth/register with valid data → 201 Created
2. Check email for verification link
3. GET /api/auth/verify-email?token=xxx → 200 Verified
4. POST /api/auth/login with credentials → 200 + JWT token
```

### 4.4 User Story 组织原则

#### 原则 1: 按优先级排序

```
Phase 3: User Story 1 (P1) — MVP 必须包含的功能
Phase 4: User Story 2 (P2) — 重要但非 MVP 的功能
Phase 5: User Story 3 (P3) — 锦上添花的功能
```

#### 原则 2: 每个故事独立

```
✅ 正确：每个故事可独立测试和交付
US1: 用户注册与登录
US2: 用户资料编辑
US3: 用户头像上传

❌ 错误：故事间有强依赖
US1: 用户注册（不含登录）
US2: 用户登录（依赖 US1）
```

#### 原则 3: 映射到业务价值

```
US1: 用户可以注册 → 业务价值：获取用户
US2: 用户可以登录 → 业务价值：用户留存
US3: 用户可以编辑资料 → 业务价值：用户体验
```

### 4.5 完成标准

对每个 User Story Phase：

- [ ] 所有实现任务已完成
- [ ] 所有测试通过（如果包含测试）
- [ ] 可独立演示和验证
- [ ] 代码已 Commit
- [ ] Checkpoint 标记已达成

### 4.6 并行开发

如果团队有多个开发者：

```
Phase 2: Foundational（团队共同完成）
  ↓
Foundational 完成后：
  - Developer A: User Story 1 (P1)
  - Developer B: User Story 2 (P2)
  - Developer C: User Story 3 (P3)
  ↓
所有 Stories 完成后：
  - 团队共同：Phase N - Polish
```

---

## 五、Phase N: Polish（收尾与跨切面关注点）

### 5.1 目标

处理影响多个 User Story 的跨切面关注点和质量改进。

### 5.2 特征

- 🎨 **跨切面**：影响多个 Story
- 🎨 **非阻塞**：不影响核心功能
- 🎨 **质量提升**：文档、性能、安全

### 5.3 典型任务

```markdown
## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
  - API 文档：docs/api.md
  - 部署指南：docs/deployment.md
  - 开发者指南：docs/development.md
  
- [ ] TXXX Code cleanup and refactoring
  - 移除重复代码
  - 提取公共函数
  - 改进命名
  
- [ ] TXXX Performance optimization across all stories
  - 数据库查询优化（添加索引）
  - API 响应缓存
  - 图片压缩
  
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
  - 提高测试覆盖率到 80%+
  - 补充边界条件测试
  
- [ ] TXXX Security hardening
  - 添加速率限制
  - 实现 CORS 策略
  - 安全头配置（helmet）
  
- [ ] TXXX Run quickstart.md validation
  - 按照 quickstart 文档从零搭建
  - 验证所有步骤可执行
  - 修复文档错误
```

### 5.4 完成标准

- [ ] 文档已更新且准确
- [ ] 代码无明显重复
- [ ] 性能指标达标（如果有）
- [ ] 安全扫描通过
- [ ] 测试覆盖率达标（如果有要求）

### 5.5 注意事项

- ⚠️ Polish 阶段不应该修复 Bug（Bug 应该在对应 Story 阶段修复）
- ⚠️ 如果时间紧张，Polish 阶段可以推迟
- ⚠️ 明确标注哪些任务是必需的，哪些是可选的

---

## 六、Phase 依赖关系图

### 6.1 依赖关系

```
Phase 1: Setup
  ↓ 无依赖
Phase 2: Foundational
  ↓ 依赖 Setup 完成
Phase 3: User Story 1 (P1)
  ↓ 依赖 Foundational 完成
Phase 4: User Story 2 (P2)
  ↓ 依赖 Foundational 完成（可与 US1 并行）
Phase 5: User Story 3 (P3)
  ↓ 依赖 Foundational 完成（可与 US1/US2 并行）
Phase N: Polish
  ↓ 依赖所有想要的 User Stories 完成
```

### 6.2 可视化

```
Setup ──→ Foundational ──→ User Story 1 ──→ Polish
                        ↘ User Story 2 ──→
                        ↘ User Story 3 ──→
```

### 6.3 并行机会

```
Phase 1: Setup
  [T001] [P] ──┐
  [T002] [P] ──┤ 可并行
  [T003] [P] ──┘
  
Phase 2: Foundational（必须顺序完成）
  [T004] ──→ [T005] ──→ [T006]
  
Phase 3-5: User Stories（可并行）
  US1 [P] ──→
  US2 [P] ──→ 可并行（如果团队容量允许）
  US3 [P] ──→
  
Phase N: Polish
  [TXXX] [P] ──┐
  [TXXX] [P] ──┤ 可并行
  [TXXX] [P] ──┘
```

---

## 七、实施策略

### 7.1 MVP First（最小可行产品）

```
1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready
```

**适用场景**：快速验证想法、早期用户反馈

### 7.2 Incremental Delivery（增量交付）

```
1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
```

**适用场景**：持续交付、敏捷开发

### 7.3 Parallel Team Strategy（并行团队）

```
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently
4. Team together: Polish phase
```

**适用场景**：多开发者团队、时间紧迫

---

## 八、常见错误

### ❌ 错误 1: Foundational 阶段过大

```
❌ Foundational 包含 20+ 任务
✅ 只包含所有 User Story 都需要的任务
✅ User Story 特有的任务移到对应 Story 阶段
```

### ❌ 错误 2: User Stories 不独立

```
❌ US2 依赖 US1 的代码
✅ 每个 Story 可独立测试和交付
✅ 如果确实有依赖，考虑合并为一个 Story
```

### ❌ 错误 3: 缺少 Checkpoint

```
❌ 没有明确的完成标准
✅ 每个 Phase 结束时有 Checkpoint
✅ 可以在此验证 Story 是否独立工作
```

### ❌ 错误 4: Polish 阶段修复 Bug

```
❌ Polish 阶段修复 US1 的 Bug
✅ Bug 应该在发现时立即修复（在对应 Story 阶段）
✅ Polish 只处理跨切面改进
```

---

## 使用指南

在 planning-breakdown 命令执行过程中：

- **Step 3.1（Phase 结构）** → 参考"Phase 结构概览"
- **Step 3.2（TDD 节奏标注）** → 参考每个 Phase 的"典型任务"示例
- **任务组织** → 参考"User Story 组织原则"
- **执行策略** → 参考"实施策略"（MVP First / Incremental / Parallel）
