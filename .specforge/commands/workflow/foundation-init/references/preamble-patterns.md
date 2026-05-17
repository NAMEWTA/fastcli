# Preamble 触发词与阶段校验模式

> 所有命令的 preamble 部分应遵循此规范，用于技能注入、前置产物检测和环境检测。

## Preamble 标准结构

```markdown
<!-- preamble:bash
# 技能注入 — 匹配 <相关关键词> 技能
specforge list --skills --triggers=<触发词1>,<触发词2>,<触发词3> --format=json

# 前置产物检测（<产物名称> 必须就绪）
specforge status --phase=<phase> --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

## 各阶段 Preamble 示例

### 1. foundation-init

```markdown
<!-- preamble:bash
# 环境检测
specforge doctor --check-node
specforge doctor --check-compat
-->
```

**说明**：foundation-init 是第一个阶段，无需技能注入和前置产物检测。

### 2. requirements-clarify

```markdown
<!-- preamble:bash
# 技能注入 — 匹配需求澄清/头脑风暴/规格相关技能
specforge list --skills --triggers=clarify,specify,brainstorm,requirements --format=json

# 前置产物检测
specforge status --phase=requirements --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`clarify,specify,brainstorm,requirements`

### 3. design-explore

```markdown
<!-- preamble:bash
# 技能注入 — 匹配架构/设计/接口/契约相关技能
specforge list --skills --triggers=architecture,design,interface,contract --format=json

# 前置产物检测（PROPOSAL.md 必须就绪）
specforge status --phase=design --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`architecture,design,interface,contract`

### 4. planning-breakdown

```markdown
<!-- preamble:bash
# 技能注入 — 匹配任务拆解/计划/复杂度相关技能
specforge list --skills --triggers=tasks,breakdown,planning,complexity --format=json

# 前置产物检测（DESIGN.md 必须就绪）
specforge status --phase=planning --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`tasks,breakdown,planning,complexity`

### 5. implementation-build

```markdown
<!-- preamble:bash
# 技能注入 — 匹配实现/子代理/TDD/构建相关技能
specforge list --skills --triggers=implement,subagent,tdd,build --format=json

# 前置产物检测（TASKS.md 必须就绪，DESIGN.md 用于审查对照）
specforge status --phase=implementation --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`implement,subagent,tdd,build`

### 6. quality-verify

```markdown
<!-- preamble:bash
# 技能注入 — 匹配测试/审查/验证相关技能
specforge list --skills --triggers=verify,test,review,checklist,qa --format=json

# 前置产物检测
specforge status --phase=quality --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`verify,test,review,checklist,qa`

### 7. release-deploy

```markdown
<!-- preamble:bash
# 技能注入 — 匹配发布/部署相关技能
specforge list --skills --triggers=release,deploy,ship,publish,runbook,monitor --format=json

# 前置产物检测
specforge status --phase=release --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`release,deploy,ship,publish,runbook,monitor`

### 8. evolution-retrospect

```markdown
<!-- preamble:bash
# 技能注入 — 匹配复盘/学习/改进相关技能
specforge list --skills --triggers=retrospective,learn,improve,evolve,tune --format=json

# 前置产物检测（松散依赖）
specforge status --phase=evolution --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

**触发词**：`retrospective,learn,improve,evolve,tune`

## 技能注入机制

### 触发词匹配规则

1. **精确匹配**：触发词与技能的 `description` 中的触发词完全匹配
2. **模糊匹配**：触发词与技能的 `description` 中的关键词部分匹配
3. **场景匹配**：触发词与用户输入的触发场景匹配

### 技能注入示例

用户输入：`"我需要澄清这个需求"`

匹配过程：
1. 提取关键词：`澄清`、`需求`
2. 匹配技能：`requirements-clarify` 的触发词包含 `clarify,requirements`
3. 注入技能：加载 `.specforge/skills/.../SKILL.md`

## 阶段校验模式

### specforge status --phase=<phase> --check-requires

检查当前阶段的前置产物是否就绪：

| 阶段 | 前置产物 | 检查项 |
|------|---------|--------|
| foundation | 无 | 项目根目录存在 |
| requirements | project.md, config.yaml | 项目上下文已采集 |
| design | PROPOSAL.md | 方案已批准 |
| planning | DESIGN.md | 设计已完成 |
| implementation | TASKS.md, DESIGN.md | 任务已拆解 |
| quality | PROPOSAL.md, DESIGN.md, TASKS.md | 实现已完成 |
| release | QUALITY-REPORT.md | 质量验证已通过 |
| evolution | 完整流程产物 | 所有阶段已完成 |

### specforge doctor --check-deps --quiet

检查环境依赖：
- Node.js 版本
- 包管理器（npm/pnpm/yarn）
- 构建工具
- 测试框架
- 其他项目特定依赖

## 常见错误

### ❌ 错误示例 1：缺少技能注入

```markdown
<!-- preamble:bash
specforge status --phase=requirements --check-requires
specforge doctor --check-deps --quiet
-->
```

### ✅ 正确示例 1：包含技能注入

```markdown
<!-- preamble:bash
# 技能注入 — 匹配需求澄清/头脑风暴/规格相关技能
specforge list --skills --triggers=clarify,specify,brainstorm,requirements --format=json

# 前置产物检测
specforge status --phase=requirements --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

### ❌ 错误示例 2：触发词不完整

```markdown
specforge list --skills --triggers=clarify --format=json
```

### ✅ 正确示例 2：触发词完整

```markdown
specforge list --skills --triggers=clarify,specify,brainstorm,requirements --format=json
```

### ❌ 错误示例 3：phase 参数错误

```markdown
specforge status --phase=requirement --check-requires  # 错误：应该是 requirements
```

### ✅ 正确示例 3：phase 参数正确

```markdown
specforge status --phase=requirements --check-requires
```
