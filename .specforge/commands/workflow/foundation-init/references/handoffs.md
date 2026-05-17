# Handoff 设计原则与示例

> Handoff（交接）是 SpecForge 工作流中从一个阶段平滑过渡到下一个阶段的关键机制。

## 设计原则

### 1. 明确产物交接

每个阶段结束时，必须明确列出：
- **产物清单**：本阶段生成了哪些文件
- **产物路径**：每个文件的完整路径
- **产物状态**：每个文件的状态（草稿/已批准/已完成）

### 2. 明确下一步指引

每个阶段结束时，必须明确说明：
- **下一步命令**：执行哪个命令
- **前置条件**：下一步命令需要什么前置条件
- **警告信息**：进入下一步前必须确认的事项

### 3. 错误处理 Handoff

如果当前阶段无法完成，必须明确说明：
- **回退命令**：回到哪个阶段
- **回退原因**：为什么需要回退
- **修复建议**：如何修复问题

## 标准 Handoff 格式

```markdown
## Step N: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/<文件1>` — 文件1描述
- `specforge/changes/<ChangeName>/<文件2>` — 文件2描述
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: <phase>）

**下一步**：执行 `<next-command>` 命令，<下一步描述>。

**警告**：在进入 <next-command> 之前，必须确认 <前置条件>。
```

## 各阶段 Handoff 示例

### 1. foundation-init → requirements-clarify

```markdown
## Step 6: 完成衔接

**产物**：
- `.specforge/` 完整目录树（含命令模板和示例技能）
- `specforge/project.md` — 项目上下文与概览
- `specforge/config.yaml` — 项目级机器源（context / rules / errors）
- `specforge/brainstorming/` — 头脑风暴产物目录（空）
- `specforge/changes/` — 变更执行目录（空）
- `specforge/archive/` — 历史归档目录（空）
- `.specforge/constitution.md` — 宪法文件（如选择创建）

**下一步**：
- 如有具体功能需求 → 执行 `requirements-clarify` 命令
- 如需先探索想法 → 在 `specforge/brainstorming/` 中创建头脑风暴文档
- 如需制定架构决策 → 先完善 `specforge/project.md` 中的技术栈详情
```

**特点**：foundation-init 有多个可能的下一步，提供分支选择。

### 2. requirements-clarify → design-explore

```markdown
## Step 8: 完成衔接

**产物**：
- `specforge/changes/<YYYY-MM-DD-ChangeName>/` — 新变更目录
- `specforge/changes/<YYYY-MM-DD-ChangeName>/.specforge.json` — 变更元数据（phase: proposal, status: draft）
- `specforge/changes/<YYYY-MM-DD-ChangeName>/PROPOSAL.md` — 需求与方案文档（含需求澄清 + 方案探索 + 已批准方案）

**下一步**：执行 `design-explore` 命令，基于已批准方案进行架构与技术设计。

**警告**：在进入 design-explore 之前，必须确认 PROPOSAL.md 中的方案已由用户明确批准。未经批准的方案进入设计阶段是 Iron Law 违规。
```

**特点**：包含 HARD-GATE 警告，强调方案批准的重要性。

### 3. design-explore → planning-breakdown

```markdown
## Step 5: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/DESIGN.md` — 架构与技术设计文档
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: design）

**下一步**：执行 `planning-breakdown` 命令，将设计拆解为可执行任务。
```

**特点**：标准单向 handoff，无分支。

### 4. planning-breakdown → implementation-build

```markdown
## Step 10: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/TASKS.md` — 任务列表（已通过占位符扫描 + 规格覆盖自检）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: planning）

**下一步**：执行 `implementation-build` 命令，按照 TASKS.md 进行开发实现。
```

**特点**：强调 TASKS.md 已通过质量检查（占位符扫描 + 规格覆盖自检）。

### 5. implementation-build → quality-verify

```markdown
## Step 5: 完成衔接

**产物**：
- 代码变更（在 worktree 或当前分支中）
- `specforge/changes/<ChangeName>/TASKS.md` — 所有任务复选框标记 [x]
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（phase: implementation）

**下一步**：执行 `quality-verify` 命令，进行完整的质量验证闭环。

**警告**：在进入 quality-verify 之前，必须确认所有 P0 任务已完成，测试全部通过。未完成的任务不能带入质量阶段。
```

**特点**：强调任务完成度和测试通过率的警告。

### 6. quality-verify → release-deploy

```markdown
## Step 8: 完成衔接

**产物**：
- `specforge/changes/<ChangeName>/QUALITY-REPORT.md` — 质量报告

**Gate 检查**：
- 所有 Critical 已修复 → 可以进入 release-deploy
- 存在未解决 Critical → 阻断，继续修复循环

**下一步**：执行 `release-deploy` 命令
```

**特点**：包含 Gate 检查，质量报告是 release 的准入依据。

### 7. release-deploy → evolution-retrospect

```markdown
## Step 9: 完成衔接

**产物**：
- Git 标签 `v<version>` — 版本标记
- `CHANGELOG.md` — 更新后的变更日志
- `OPS-RUNBOOK.md` — 运维移交文档（部署/回滚/监控/告警）
- `specforge/archive/<yyyy-mm>/<ChangeName>/` — 归档目录
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（status: completed）

**下一步**：执行 `evolution-retrospect` 命令
```

**特点**：release 阶段已承接 runbook/监控/告警/回滚语义，完成后直接进入 evolution。

### 8. evolution-retrospect → 循环闭合

```markdown
## Step 6: 完成 — 循环闭合

**产物**：
- `specforge/changes/<ChangeName>/RETROSPECTIVE.md` — 复盘报告
- `specforge/context/learnings.md` — 追加经验教训
- `specforge/context/glossary.md` — 术语表（如有更新）
- `specforge/context/adr/` — 架构决策记录（如有新架构决策）
- 优化后的技能文件（如有）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（status: completed）

**循环闭合**：本次 change 的所有经验已沉淀。下一次 change 将自动受益于优化后的技能和配置。

> **注**：本阶段是 SpecForge 工作流的终点，也是下一次更优工作流的起点。
```

**特点**：强调循环闭合和经验沉淀，工作流终点即下一次起点。

## 错误处理 Handoff

### 回退到上游阶段

```markdown
## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：缺少 PROPOSAL.md → 回到 requirements-clarify。
- **E003_contractMissing**：DESIGN.md 缺少接口契约或错误策略 → 必须补齐后才能进入 planning-breakdown。
```

### 阻断并终止

```markdown
**Gate 检查**：
- 所有 Critical 已修复 → 可以进入 release-deploy
- 存在未解决 Critical → 阻断，继续修复循环
```

## Handoff 最佳实践

### 1. 产物路径使用完整路径

❌ 错误：
```markdown
**产物**：
- `PROPOSAL.md`
- `.specforge.json`
```

✅ 正确：
```markdown
**产物**：
- `specforge/changes/<ChangeName>/PROPOSAL.md`
- `specforge/changes/<ChangeName>/.specforge.json`
```

### 2. 产物描述清晰

❌ 错误：
```markdown
**产物**：
- `specforge/changes/<ChangeName>/DESIGN.md`
```

✅ 正确：
```markdown
**产物**：
- `specforge/changes/<ChangeName>/DESIGN.md` — 架构与技术设计文档
```

### 3. 警告信息具体

❌ 错误：
```markdown
**警告**：确认前置条件已满足。
```

✅ 正确：
```markdown
**警告**：在进入 design-explore 之前，必须确认 PROPOSAL.md 中的方案已由用户明确批准。未经批准的方案进入设计阶段是 Iron Law 违规。
```

### 4. 下一步命令明确

❌ 错误：
```markdown
**下一步**：继续下一阶段。
```

✅ 正确：
```markdown
**下一步**：执行 `planning-breakdown` 命令，将设计拆解为可执行任务。
```

## Handoff 流程图

```
foundation-init
    ↓ (project.md, config.yaml)
requirements-clarify
    ↓ (PROPOSAL.md)
design-explore
    ↓ (DESIGN.md)
planning-breakdown
    ↓ (TASKS.md)
implementation-build
    ↓ (代码变更, TASKS.md [x])
quality-verify
    ↓ (QUALITY-REPORT.md PASS)
release-deploy
    ↓ (Git tag, CHANGELOG, OPS-RUNBOOK.md, archive)
evolution-retrospect
    ↓ (RETROSPECTIVE.md, learnings.md)
循环闭合 → 下一次 change
```
