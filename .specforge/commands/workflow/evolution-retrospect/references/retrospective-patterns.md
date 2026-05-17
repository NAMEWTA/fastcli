# 复盘模式库

> 本文件提供复盘的结构化模式、指标收集方法和报告模板。主命令文件引用本文件以保持精简。

## 摩擦点分类体系

### 1. 流程问题
**症状**: 某个阶段产出不符合下游阶段需要
**示例**: requirements 阶段缺少用户故事，导致 planning 阶段无法拆分任务
**落点**: `config.yaml` 的 handoffs 增加强制门禁

### 2. 工具问题
**症状**: CLI 命令不够用或不好用
**示例**: 缺少批量状态检查命令，需要手动逐个检查
**落点**: 使用 `specforge add-command` 创建新命令

### 3. 技能问题
**症状**: 注入的技能没有起到应有的指导作用
**示例**: 技能触发词不匹配用户实际操作习惯
**落点**: 优化技能 `description` 的触发词覆盖率

### 4. 沟通问题
**症状**: 用户与 AI 之间的反复澄清次数过多
**示例**: 需求描述模糊，导致多次往返确认
**落点**: 在 requirements 阶段增加结构化模板

### 5. 架构问题
**症状**: 设计决策导致返工
**示例**: 接口契约定义不清，implementation 阶段发现需要重构
**落点**: design 阶段强化 HARD-GATE 检查

## 指标收集方法

### 自动化收集脚本

```bash
# 总用时（从 brainstorming 到 archive）
CHANGE_DIR="specforge/changes/<ChangeName>"
FIRST_COMMIT=$(git log --all --oneline --since="30 days ago" -- "$CHANGE_DIR" | tail -1 | cut -d' ' -f1)
LAST_COMMIT=$(git log --all --oneline -1 -- "$CHANGE_DIR" | cut -d' ' -f1)
if [ -n "$FIRST_COMMIT" ] && [ -n "$LAST_COMMIT" ]; then
  FIRST_TIME=$(git log -1 --format=%ci "$FIRST_COMMIT")
  LAST_TIME=$(git log -1 --format=%ci "$LAST_COMMIT")
  echo "总用时: $FIRST_TIME → $LAST_TIME"
fi

# 提交数
COMMIT_COUNT=$(git log --all --oneline -- "$CHANGE_DIR" | wc -l | tr -d ' ')
echo "提交数: $COMMIT_COUNT"

# 产物文件数
ARTIFACT_COUNT=$(find "$CHANGE_DIR" -name "*.md" -o -name "*.yaml" | wc -l | tr -d ' ')
echo "产物数: $ARTIFACT_COUNT"

# 代码行数变更
git diff --stat "$FIRST_COMMIT..$LAST_COMMIT" | tail -1

# Iron Law 触发次数（搜索日志或产物中的错误编号）
IRON_LAW_COUNT=$(grep -r "E0[0-9][0-9]_" "$CHANGE_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "Iron Law 触发: $IRON_LAW_COUNT"
```

### 手动收集指标

| 指标 | 收集方法 | 落点 |
|------|---------|------|
| 返工次数 | 回顾 PROPOSAL.md 的修改历史 | 报告表格 |
| 缺陷密度 | quality 阶段问题数 / 代码行数 | 报告表格 |
| 技能命中率 | 注入技能实际被使用的比例 | 调优建议 |
| 澄清往返次数 | 统计 requirements 阶段的对话轮次 | 沟通改进 |

## 改进项落点映射

| 问题类型 | 落点位置 | 示例 | 版本影响 |
|---------|---------|------|---------|
| 流程缺陷 | `config.yaml` handoffs | 增加 requirements → design 的强制门禁 | MINOR |
| 工具不足 | `add-command` 新命令 | 创建 specforge add-metric 命令 | MINOR |
| 技能缺失 | `skills/` 新技能 | 创建 error-handling-review 技能 | MINOR |
| 规则遗漏 | `constitution.md` | 新增"设计必须包含错误策略" | MAJOR |
| 错误模式 | `config.yaml` errors | 新增 E015 错误编号 | PATCH |
| 术语混淆 | `context/glossary.md` | 补充新术语定义 | PATCH |
| 架构决策 | `context/adr/` | 创建 ADR-005 | MINOR |

## 复盘报告模板

```markdown
# 复盘报告 — <ChangeName>

**日期**: YYYY-MM-DD
**复盘深度**: 轻量/标准/深度
**参与者**: 用户 + AI Agent

## 关键指标

| 指标 | 数值 | 备注 |
|------|------|------|
| 总用时 | <N> 天/小时 | 从 brainstorming 到 archive |
| 涉及文件 | <N> 个 | 新增 + 修改 |
| 代码行数 | +<N> / -<M> | 净变更 |
| 提交数 | <N> 次 |  |
| 产物数 | <N> 个 | Markdown + YAML |
| 返工次数 | <N> 次 | 需求变更 + 设计推翻 |
| 缺陷密度 | <N>/KLOC | quality 阶段问题数 |
| Iron Law 触发 | <N> 次 | 列出编号 |
| 技能命中率 | <N>% | 注入技能实际使用比例 |

## 流程评估

| 阶段 | 评分(1-5) | 顺畅点 | 摩擦点 | 改进建议 |
|------|----------|--------|--------|----------|
| foundation | <评分> | — | — | — |
| requirements | <评分> | — | — | — |
| design | <评分> | — | — | — |
| planning | <评分> | — | — | — |
| implementation | <评分> | — | — | — |
| quality | <评分> | — | — | — |
| release | <评分> | — | — | — |
| evolution | <评分> | — | — | — |

## 经验教训

### 做得好的
- <具体做法和效果，包含场景>

### 需要改进的
- <问题和改进建议，包含落点位置>

### 意外发现
- <预期之外的收获>

## 可固化模式

| 模式 | 类型 | 建议动作 | 优先级 |
|------|------|---------|--------|
| <模式1> | workflow-step/domain-rule/safety | 创建 xxx 技能 | P0/P1/P2 |
| <模式2> | workflow-step/domain-rule/safety | 更新 xxx 技能 | P0/P1/P2 |

## 项目调优

### 配置变更
- [ ] `config.yaml` handoffs 更新
- [ ] `config.yaml` errors 扩展
- [ ] `constitution.md` 新增规则

### 技能变更
- [ ] 新技能创建：<技能名>
- [ ] 技能优化：<技能名>
- [ ] 触发词调整：<技能名>

### 阶段启用
- [ ] 启用新阶段：<阶段名>
- [ ] 移除未用阶段：<阶段名>

## 下一步行动

| 行动 | 负责人 | 截止时间 | 状态 |
|------|--------|---------|------|
| <行动1> | 用户/AI | YYYY-MM-DD | pending |
| <行动2> | 用户/AI | YYYY-MM-DD | pending |

## 完成状态

**STATUS**: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
**REASON**: <原因>
**ATTEMPTED**: <已尝试的操作>
**RECOMMENDATION**: <建议的下一步>
```

## 复盘深度指南

### 轻量复盘（15 分钟）
**适用**: 小型 change（<3 天，≤3 阶段）
**内容**:
- 关键指标收集（自动化脚本）
- 记录 1-2 个核心经验教训
- 更新 learnings.md
- 跳过技能 TDD 迭代

### 标准复盘（30-45 分钟）
**适用**: 中型 change（3-7 天，4-6 阶段）
**内容**:
- 完整流程回顾（所有阶段评分）
- 经验沉淀（learnings + ADR + glossary）
- 识别可固化模式（1-2 个技能优化）
- 项目调优（配置更新）
- 生成结构化报告

### 深度复盘（1-2 小时）
**适用**: 大型 change（>7 天，7+ 阶段）
**内容**:
- 标准复盘所有内容
- 技能 TDD 迭代（基线测试 → 编写 → 压力测试 → 堵漏洞 → 验证）
- 详细摩擦点分析（每个阶段至少 1 个改进项）
- 架构决策回顾（所有 ADR 有效性验证）
- 完整项目调优（Profile 重构）
