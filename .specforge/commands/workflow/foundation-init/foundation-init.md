---
name: foundation-init
type: workflow-command
description: >-
  项目初始化与宪法基线——搭建双目录结构、采集项目上下文、可选宪法制定、Profile 选择，
  并同步初始化 / 更新项目根目录的 AGENTS.md（AI 协作手册）与 CLAUDE.md（编码铁律）。
  触发场景：新项目启动、"初始化 SpecForge"、"搭建项目工作流"、"刷新 AGENTS.md / CLAUDE.md"。
version: "1.1.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配文档同步 / AI 文档采纳相关技能
specforge list --skills --triggers=docs-sync,agents,claude,inventory --format=json

# 环境检测
specforge doctor --check-node
specforge doctor --check-compat
-->

<!-- route-statement
路由：foundation-init
Change-ID：{{changeId}}
已加载：
  - foundation-init.md (本文件)
未加载（后续按需）：
  - references/handoffs.md（预算 30 行）
  - references/phase-mapping.md（预算 25 行）
  - references/agents-md-sync.md（预算 40 行）
  - references/claude-md-principles.md（预算 35 行）
第一动作：检查项目是否已初始化，采集项目上下文
Token 预算估算：约 3500 tokens
-->

# 项目初始化与宪法基线

## Iron Law

> **禁止在未理解项目上下文前搭建结构。** 先盘点再动手。
>
> **禁止只产出 `specforge/` 双目录而不同步落地或更新根目录的 `AGENTS.md` 与 `CLAUDE.md`。** AI 协作手册与编码铁律是初始化产物的一部分，缺失即为残次品。

---

## Step 1: 项目上下文采集

**目标**：全面理解项目现状，避免盲建。

### 1.1 技术栈盘点
- 编程语言与版本
- 主要框架与依赖
- 包管理器（npm/pnpm/yarn/maven）
- 构建工具与配置
- 测试框架

### 1.2 抽象层级识别
- 当前代码属于哪个抽象层级？（基础设施/领域模型/应用服务/用户界面）
- 已有架构模式？（MVC/微服务/单体/事件驱动）

### 1.3 现有约束梳理
- 团队规模与协作方式
- CI/CD 流程
- 部署环境与平台
- 合规或安全要求

### 1.4 Brownfield 探测

> 如果根目录至少存在一份主流清单文件（`package.json` / `pom.xml` / `Cargo.toml` / `go.mod` / `pyproject.toml`）且 `src/**/*.{ts,js,py,go,java,rs}` 匹配文件数 > 5，则判定为 **brownfield**（既有项目）。

**brownfield 场景处理**：
- 提示用户运行 `specforge project-inventory` 进行入场扫描
- 入场扫描将生成 `specforge/context/inventory.md`，覆盖技术栈 / 命名约定 / 既有抽象索引 / 禁动清单 / AI 文档 / 目录结构 / 测试框架 7 类信号
- 若根目录已存在 `AGENTS.md` / `CLAUDE.md`，由 `project-inventory` 走采纳决策（参考 `commands/tools/project-inventory/references/ai-doc-merge-policy.md`），foundation-init 在 Step 4 只做"差量补齐"而非"覆写"
- 后续 `design-explore` 将在 Step 1.5 强制输出既有架构观察报告

**greenfield 场景**：跳过入场扫描，直接进入 Step 2。

---

## Step 2: 生成双目录结构

**目标**：创建 `.specforge/`（框架资产）+ `specforge/`（用户资产）两层目录。

### 2.1 框架资产 `.specforge/`
```
.specforge/
├── commands/workflow/   # 生命周期阶段命令（9个）
├── commands/tools/      # 独立工具命令
├── skills/              # 上下文注入技能（7类）
│   ├── domain-rules/
│   ├── code-styles/
│   ├── architecture/
│   ├── testing/
│   ├── security/
│   ├── ui-ux/
│   └── workflow-steps/
└── templates/           # 全局模板
```

### 2.2 用户资产 `specforge/`
```
specforge/
├── config.yaml          # 项目级机器源（context / rules / errors）
├── project.md           # 项目上下文与概览（人类可读，可选但推荐）
├── brainstorming/       # 头脑风暴产物（源，不回头合并）
├── context/             # 术语/ADR/经验沉淀
├── changes/             # 变更执行（进行态）
└── archive/             # 历史归档
```

约束：`.specforge/` 可由 `specforge update` 安全更新；`specforge/` 完全由用户管理，框架绝不触碰。

---

## Step 3: 生成 project.md

**目标**：创建项目元数据文件，作为所有后续阶段的上下文基础。

```yaml
---
name: <项目名称>
description: <一句话描述>
language: <主要编程语言>
framework: <主要框架>
packageManager: <npm|pnpm|yarn>
version: "0.1.0"
createdAt: "<YYYY-MM-DD>"
---
```

正文部分包含：
- 项目目标与愿景
- 技术栈详情
- 架构概览
- 团队与协作方式
- 外部依赖与集成

同时，确保 `specforge/config.yaml` 存在并补齐：
- `context`：项目真实上下文（技术栈、约束、术语入口）
- `rules`：项目级可执行规则（可覆盖框架默认）
- `errors`：项目特定错误沉淀入口

---

## Step 4: AI 协作文档同步（AGENTS.md + CLAUDE.md）

> **目标**：让仓库根目录的 `AGENTS.md`（高信息密度的项目工作手册）与 `CLAUDE.md`（精简的编码铁律）与本次初始化采集到的事实**保持同步**。这是 SpecForge 与 Claude / Cursor / Codex / Kiro 等 AI 代理协作的入口契约。
>
> **谁负责**：foundation-init 只创建或差量补齐"项目级"约束；具体语言风格、栈级常识沉淀进 `specforge/context/context.md`，不要往 AGENTS.md 里灌。

### 4.1 决策矩阵

| 现状 | 处理方式 |
|------|---------|
| 根目录无 `AGENTS.md` | 基于 project.md / config.yaml / 包管理器清单生成 **最小骨架**（详见 `references/agents-md-sync.md`），章节齐而短，禁止占位符进库 |
| 根目录已有 `AGENTS.md`（brownfield） | **不覆写**；做差量补齐：补 SpecForge 双目录段落、profile / 宪法引用、错误字典引用；保留既有章节风格与措辞 |
| 根目录无 `CLAUDE.md` | 基于 `references/claude-md-principles.md` 生成 4 条 Karpathy 编码原则版骨架（编码前思考 / 简洁优先 / 精准修改 / 目标驱动执行） |
| 根目录已有 `CLAUDE.md` | 检查是否已包含 4 条编码原则。若缺失，在保留既有铁律的前提下，**追加**而非替换；若已有更具体的项目铁律（如"不改 pbxproj"），保持原文置顶，4 条原则作为通用层补在其后 |

### 4.2 AGENTS.md 必须涵盖的最小章节集

> 完整章节模板与字段说明见 `references/agents-md-sync.md`。

- 项目身份（包名 / 运行时 / 包管理器 / 许可证）
- 核心架构（双目录模型、关键抽象、生命周期阶段）
- 仓库布局（顶层目录树 + 一行注释）
- 开发命令（来自 `package.json#scripts` / Makefile / justfile 等真实入口）
- 代理行为规约（改代码必查 / 必做 / 写代码风格 / 测试要求）
- 常见陷阱（基于本次 brownfield 探测发现的真实坑）
- 相关文档（指向 `CLAUDE.md` / `README` / `specforge/context/`）

### 4.3 CLAUDE.md 必须包含的 4 条原则

> 原则解决的问题与完整模板见 `references/claude-md-principles.md`。

1. **编码前思考** — 不假设、不隐藏困惑、呈现权衡、适时反驳
2. **简洁优先** — 用最少代码解决问题，拒绝"以备不时之需"的灵活性
3. **精准修改** — 只碰必须碰的，匹配现有风格，不顺手"改进"无关代码
4. **目标驱动执行** — 把模糊指令转化为可验证的成功标准（tests as gate）

每条原则需配 ❌ 反例 + ✅ 正例 + "What this prevents"，让 AI 代理可执行而非可背诵。

### 4.4 登记到 docs-sync state（可选但强烈推荐）

如果项目计划长期使用 `docs-sync` 技能维护对外文档，把这两份手册写入 state：

```jsonc
// .docs-sync-state.json
{
  "tracked_docs": [
    "README.md",
    "CHANGELOG.md",
    "AGENTS.md",
    "CLAUDE.md"
  ]
}
```

state 文件首次创建可复制 `skills/workflow-steps/docs-sync/templates/state.json.tmpl`。后续 `docs-sync` 在每次 git 差异同步时自动覆盖这两份文档的"仓库布局 / 开发命令 / 常见陷阱"等结构性章节。

### 4.5 自检（必走，未通过不得离开本步骤）

- [ ] `AGENTS.md` 全文 ≤ 500 行，无 `[TODO]` / `占位` / `<待补>` 标记
- [ ] `AGENTS.md` 的"仓库布局"章节与实际顶层目录一致
- [ ] `AGENTS.md` 的"开发命令"全部能在仓库根目录执行（来自真实入口）
- [ ] `CLAUDE.md` 4 条原则齐全，每条至少 1 ❌ 1 ✅ 1 prevents
- [ ] 未覆盖既有 brownfield AGENTS.md 中的项目铁律
- [ ] 已在 `specforge/project.md` 与 `specforge/config.yaml` 的 `context.docs` 字段引用这两个文件

---

## Step 5: 宪法初始化（可选）

**目标**：制定项目不可协商的治理原则。如不需要可跳过，后续通过 `specforge add-command` 创建自定义命令时会提示。

### 5.1 交互式问卷

逐条询问并记录治理原则，每条原则包含：
- **id**: P1, P2, P3... 唯一编号
- **statement**: 一句话原则声明
- **rationale**: 为什么这条原则重要
- **source**: 来源（团队约定 / 线上事故教训 / 行业最佳实践）

将可执行条款同步沉淀到 `.specforge/config.yaml` / `specforge/config.yaml` 的 `rules`，确保后续阶段可以引用统一机器源。

### 5.2 宪法版本管理

- 使用语义化版本（MAJOR/MINOR/PATCH）
- 修改原则时记录 Sync Impact Report
- MAJOR：移除或根本性重定义原则
- MINOR：新增原则或实质性扩展
- PATCH：澄清措辞、修正错别字

宪法存储在 `.specforge/constitution.md`，是所有后续阶段的质量门禁依据。新增 / 删除原则时，应同步在 `AGENTS.md` 的"代理行为规约"段中追加引用。

---

## Step 6: Profile 选择

**目标**：确定项目使用的阶段范围。

| Profile | 包含阶段 | 适用场景 |
|---------|---------|---------|
| `minimal` | foundation → requirements → implementation → quality → release | 快速原型、概念验证 |
| `standard` | foundation → requirements → design → planning → implementation → quality → release → evolution | 正式项目（推荐） |
| `custom` | 用户自选阶段组合 | 有特殊流程需求 |

选择 `custom` 时，交互式勾选需要的阶段。Profile 一旦确定，必须在 `AGENTS.md` 的"项目身份"或"核心架构"章节中显式声明（一行即可），便于后续 AI 代理快速对齐阶段范围。

---

## Step 7: 完成衔接

**产物**：
- `.specforge/` 完整目录树（含命令模板和示例技能）
- `specforge/project.md` — 项目上下文与概览
- `specforge/config.yaml` — 项目级机器源（context / rules / errors）
- `specforge/brainstorming/` — 头脑风暴产物目录（空）
- `specforge/changes/` — 变更执行目录（空）
- `specforge/archive/` — 历史归档目录（空）
- `.specforge/constitution.md` — 宪法文件（如选择创建）
- `AGENTS.md` — 项目根目录 AI 协作手册（新建或差量补齐）
- `CLAUDE.md` — 项目根目录编码铁律（4 条 Karpathy 原则 + 项目专属铁律）
- `.docs-sync-state.json` — 文档同步基线（如已登记 AGENTS.md / CLAUDE.md）

**下一步**：
- 如有具体功能需求 → 执行 `requirements-clarify` 命令
- 如需先探索想法 → 在 `specforge/brainstorming/` 中创建头脑风暴文档
- 如需制定架构决策 → 先完善 `specforge/project.md` 中的技术栈详情
- 如需让 AGENTS.md / CLAUDE.md 随后续提交保持同步 → 加载 `docs-sync` 技能

---

## 长会话清窗协议

> **清窗协议**：当检测到清窗触发信号（token > 50k / 连续失败 ≥ 2 / 复读迹象 / 用户感觉打转）时，
> 加载 `context-reset-protocol` skill 并按其流程执行。
> 详见：`.specforge/skills/workflow-steps/context-reset-protocol/SKILL.md`

初始化流程可能因项目规模较大而耗时较长，AI 代理应在执行过程中关注上下文健康状态。若触发清窗信号，须按协议落盘 PROGRESS 后再重启会话。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：如果初始化未产出 `specforge/config.yaml`、`AGENTS.md` 或用户资产目录不完整，先修复脚手架再进入 requirements。
- **E005_contextOverload**：如果宪法、AGENTS.md 或技能文档开始膨胀（>500 行），把长内容移动到 `specforge/context/context.md` 或 `references/`，保持渐进式披露。
- **E010_repeatedFailurePattern**：如果在 brownfield 上反复"覆写"既有 AGENTS.md 中的项目铁律，必须停下来声明本次差量补齐与既有版本的差异，再继续。

---

## References 导航（按需加载）

| 场景 | 参考文档 | 核心内容 |
| ---- | -------- | -------- |
| 写 / 补齐 AGENTS.md | `references/agents-md-sync.md` | 章节骨架、brownfield 差量策略、与 docs-sync 协同 |
| 写 / 补齐 CLAUDE.md | `references/claude-md-principles.md` | 4 条 Karpathy 编码原则、❌✅ 反例与正例、模板 |
| 阶段衔接细节 | `references/handoffs.md` | foundation-init → requirements-clarify 的 handoff 写法 |
| 阶段映射 | `references/phase-mapping.md` | 8 阶段 ↔ 触发词 ↔ 前置产物 |
| Frontmatter 规范 | `references/frontmatter-spec.md` | 命令 / 技能 frontmatter 五字段语义 |
| Preamble 模式 | `references/preamble-patterns.md` | 触发词矩阵、阶段钩子示例 |

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "先写代码，项目结构后面再搭" | 99% 的项目结构文档永远不会被补上 |
| "这个项目太小，不需要宪法" | 小项目的技术债务往往因为没有约束而失控 |
| "Profile 选 minimal 就行，后面再加" | 从未有人在项目中途从 minimal 升级到 standard |
| "AGENTS.md 等代码写完再补" | 代码长出来时 AI 代理已经按错误假设跑偏，再补也救不回上下文 |
| "CLAUDE.md 太繁琐，4 条原则记心里就行" | "记心里"对 LLM 不成立——铁律必须写进根目录文件，每次会话才能被加载 |
| "项目里已经有 AGENTS.md，不用动" | brownfield 场景必须做差量补齐 SpecForge 双目录 / 错误字典 / 宪法引用，否则后续命令找不到机器源 |
