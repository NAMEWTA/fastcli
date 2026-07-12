# Matt Pocock Workflow

基于 [Matt Pocock 工程与生产力 skills](../vendor/matt-pocock/README.md) 构建的路由优先 AI 工作流。所有状态持久化在 `speculo/.speculo/matt-pocock/` 私有命名空间内，不污染项目根目录。

## 快速开始

### 首次使用

在 AI 会话中说：

> 我想用 matt-pocock workflow 来 [你的任务描述]

AI 会引导你完成以下步骤：

1. **选择或创建 Change** — Change 是工作流的原子工作单元，名称格式为 `YYYY-MM-DD-<kebab-topic>`（日期前缀自动生成）。
2. **路由匹配** — AI 根据你的任务意图自动匹配最佳路由。
3. **执行阶段** — 跟随路由的阶段序列推进工作。

### Golden Path：从想法到交付

最常用的路由是 **idea-to-delivery**，它将一个想法推进为可交付成果：

```
grill → detour? → spec → tickets? → implement → review → finalize
```

1. **grill（打磨）** — AI relentless 访谈，澄清所有决策分支
2. **detour（迂回）** — 需要一手资料或原型验证时进入，否则跳过
3. **spec（规范）** — 将共识转化为规范文档
4. **tickets（票据）** — 跨上下文窗口时拆分为票据
5. **implement（实现）** — TDD 红-绿-重构循环，逐切片验证
6. **review（审查）** — 双轴审查（标准轴 + 规范轴）
7. **finalize（归档）** — 完成门禁通过后归档

### 接续已有 Change

如果会话中断或达到上下文窗口限制：

> 继续 matt-pocock workflow 的 `<change-name>` 

AI 会读取 `speculo/.speculo/matt-pocock/changes/<change-name>/` 下的状态并恢复。

## 路由速查表

| # | 路由 | 触发条件 | 典型用法 |
|---|------|----------|----------|
| 1 | **idea-to-delivery** | 把想法/需求推进为规范和实现 | "帮我实现登录功能" |
| 2 | **wayfinder** | 目标庞大，决策路径不可见 | "规划微服务拆分方案" |
| 3 | **triage** | 分类收到的 issue 或外部 PR | "分类这周的 issue" |
| 4 | **diagnose** | 疑难 bug、异常或性能回退 | "排查这个内存泄漏" |
| 5 | **architecture** | 扫描/讨论代码仓深化机会 | "审查当前架构的改进点" |
| 6 | **review** | 从固定点审查 diff | "审查这个 PR" |
| 7 | **merge-conflicts** | 仓库处于 merge/rebase 冲突 | "帮我解决合并冲突" |
| 8 | **research-prototype** | 一手资料研究或一次性原型 | "调研 WebSocket vs SSE" |
| 9 | **productivity** | handoff、教学或 skill 写作 | "教我写一个 skill" |
| 10 | **experimental** | 使用 vendor/in-progress 实验能力 | 明确要求实验功能时 |

## Change 生命周期

### 命名格式

```
YYYY-MM-DD-<kebab-topic>
```

- 日期前缀：创建时自动以当天日期生成
- topic 部分：kebab-case，描述本次工作的主题
- 示例：`2026-07-12-unify-executor`、`2026-07-11-setup-config`

### 状态机

```
active → archived
```

- **active**：当前正在进行的 change，同时只能有一个（`status.json` 的 `active` 数组）
- **archived**：已完成的 change，移入 `archive/YYYY-MM/<change-name>/`

### 转移规则

| 转移 | 触发 |
|------|------|
| route → phase | 路由已选定，所需 namespace 可用 |
| phase → route | 当前能力完成，需进入另一条路线（复用当前 change） |
| active → archived | 用户确认交付边界，完成门禁通过（`finalize` command） |

### 状态文件

- `status.json`：workflow 级别的 active change 列表与路由历史
- `changes/<change>/.status.json`：单个 change 的阶段状态
- `changes/<change>/decision-log.md`：grill 阶段的决策记录
- `changes/<change>/spec/spec.md`：规范文档
- `changes/<change>/implementation/log.md`：实现日志

## 上下文隔离机制

Matt Pocock workflow 使用三层隔离，确保每次会话的上下文边界清晰：

### 第一层：Vendor（vendor 根）

```
speculo/vendor/matt-pocock/
```

- 原始的 Matt Pocock skills，只读引用
- 不在此层持久化任何状态
- 直接运行 vendor raw skill 不继承 workflow 的路径上下文

### 第二层：Workflow（workflow 根）

```
speculo/workflows/matt-pocock/
speculo/.speculo/matt-pocock/
```

- `WORKFLOW.md`：机器可读的 XML 编排声明（路由、阶段、持久化命名空间）
- `routes/`：每条路由的阶段序列定义
- 状态根（`.speculo/matt-pocock/`）：持久化固定骨架 + 按需创建的 namespace

### 第三层：Change（changes 目录）

```
speculo/.speculo/matt-pocock/changes/<change-name>/
```

- 每次 work session 的原子工作单元
- 包含 `.status.json`、decision-log、spec、implementation log 等
- 完成后移入 `archive/`，不在项目根留下临时文件

## 持久化命名空间

```
speculo/.speculo/matt-pocock/
├── status.json              ← workflow 状态索引（固定骨架）
├── changes/                 ← 活跃 change（固定骨架）
├── archive/                 ← 已完成 change（固定骨架）
├── knowledge/               ← 领域术语（CONTEXT.md）+ ADR（按需创建）
├── policy/                  ← 规则与策略（按需创建）
├── integrations/            ← issue tracker 配置（按需创建）
├── backlog/                 ← 待办事项（按需创建）
└── docs-sync.json           ← docs-sync 范围声明（command 侧车文件）
```

**写入规则：**
- 固定骨架（`status.json`、`changes/`、`archive/`）由 workflow 自动管理
- `knowledge/` 由 domain-modeling skill 在术语或决策确定时延迟创建
- `integrations/` 由 setup skill 在首次配置时创建
- 项目代码、测试和用户文档不属于 Speculo 运行时产物
- 临时原型必须删除，仅保留其结论

## 完整目录结构

```
speculo/
├── config.json                      ← 全局配置（可选，不存在时静默降级）
├── commands/                        ← Speculo 命令定义
│   ├── docs-sync.md
│   ├── finalize.md
│   ├── retro.md
│   └── ...
├── skills/                          ← Speculo 内部 skill
│   ├── runtime-context/
│   ├── docs-sync/
│   └── ...
├── vendor/                          ← 第三方 skill（只读）
│   └── matt-pocock/
│       ├── engineering/             ← 工程 skills（ask-matt、grill-with-docs、tdd 等）
│       └── productivity/            ← 生产力 skills（grill-me、handoff、teach 等）
├── workflows/                       ← Workflow 编排
│   └── matt-pocock/
│       ├── WORKFLOW.md              ← XML 编排声明
│       └── routes/                  ← 10 条路由定义
└── .speculo/                        ← 运行时状态（私有）
    ├── workspace.json               ← 项目根注册表
    ├── matt-pocock/                 ← matt-pocock workflow 状态
    │   ├── status.json
    │   ├── changes/
    │   ├── archive/
    │   ├── knowledge/
    │   └── docs-sync.json
    └── commands/                    ← Command 执行记录
        └── docs-sync/
            ├── state.json
            └── 2026-07-12-bootstrap.md
```

## 依赖

- **硬依赖**：`speculo/vendor/matt-pocock/` 完整安装（包含 engineering 和 productivity 目录）
- **运行时依赖**：`speculo/skills/runtime-context/`（路径解析与校验）
- **配置依赖**：`speculo/config.json`（可选，不存在时使用默认值）

## 常见问题

### 和直接使用 vendor skill 有什么区别？

直接运行 vendor raw skill 不继承本 workflow 的路径上下文和持久化保证。通过 workflow 路由执行才能：
- 自动管理 change 生命周期
- 持久化决策日志和规范到正确的命名空间
- 在会话中断后无缝接续

### change 可以复用吗？

同一 change 可以跨路由复用。例如：在 idea-to-delivery 的 implement 阶段发现问题需要研究 → 切换到 research-prototype → 回到 implement 继续。路由切换不创建新 change。

### 如何查看当前状态？

在 AI 会话中询问当前 change 状态即可，AI 会读取 `status.json` 和当前的 `.status.json`。
