# 项目调优手册

> 本文件提供项目配置调优的完整指南，包括阶段启用、技能触发词优化、Iron Law 沉淀和错误字典扩展。

## 阶段启用调整

### 评估阶段使用情况

```bash
# 查看当前启用的阶段
specforge status --phase=all

# 查看各阶段产物数量
for phase in foundation requirements design planning implementation quality release evolution; do
  count=$(find specforge/changes/ -path "*/$phase/*.md" 2>/dev/null | wc -l | tr -d ' ')
  echo "$phase: $count 个产物"
done
```

### 调整规则

**从未使用的阶段** → 从 Profile 移除
- 如果某个阶段在 3+ 次 change 中均未产生任何产物
- 且在 `.specforge/config.yaml` 中标记为 `optional: true`
- 建议从 `profile.enabledPhases` 移除

**需要的自定义阶段** → 使用 `specforge add-command` 创建
- 标准 8 阶段无法满足需求
- 需要插入中间阶段（如 `security-review`、`performance-test`）
- 创建后在 `config.yaml` 中配置 handoffs

### Profile 配置示例

```yaml
# .specforge/config.yaml
profile:
  name: custom
  enabledPhases:
    - foundation
    - requirements
    - design
    - planning
    - implementation
    - quality
    - release
    # 可按团队需要省略 design/planning/evolution 等阶段
    
  custom_phases:
    - name: security-review
      after: design
      before: planning
```

## 技能触发词优化

### 导出当前触发词

```bash
# 导出所有技能及其触发词
specforge list --skills --format=json > /tmp/skills-triggers.json

# 查看特定技能的触发词
specforge list --skills --name=<skill-name> --format=json
```

### 触发词覆盖率分析

**步骤**:
1. 回顾本次 change 中的实际操作关键词
2. 对比技能 `description` 中的触发词
3. 识别未匹配的操作场景

**示例分析**:
```
实际操作关键词:
- "帮我设计一下接口"
- "需要画个架构图"
- "定义数据模型"

当前技能触发词 (design-explore):
- "架构设计"
- "技术方案设计"
- "接口设计"
- "系统设计"

缺失匹配:
❌ "帮我设计一下接口" → 应添加 "设计接口"
❌ "需要画个架构图" → 应添加 "架构图"
❌ "定义数据模型" → 应添加 "数据模型设计"
```

### 更新触发词

**位置**: `.specforge/skills/<skill-type>/<skill-name>/SKILL.md`

```yaml
---
name: design-explore
description: >-
  架构与技术设计——基于已批准方案进行严格的架构设计。
  触发场景："架构设计"、"技术方案设计"、"接口设计"、"系统设计"、
  "设计接口"、"架构图"、"数据模型设计"、"design this"、
  "architecture review"、"technical design"。
---
```

### 测试触发准确率

```bash
# 模拟触发词匹配
specforge list --skills --triggers="设计接口,架构图" --format=json

# 确认目标技能在结果中
```

## Iron Law 沉淀

### 何时添加新 Iron Law

**条件**:
- 本次 change 中发现了不可妥协的规则
- 违反该规则会导致严重后果（返工、安全漏洞、架构损坏）
- 该规则具有通用性（适用于未来 change）

**示例场景**:
- 发现缺少接口契约导致 implementation 返工 3 次
- 发现缺少错误处理策略导致 quality 阶段发现 20+ 缺陷
- 发现缺少数据迁移计划导致 release 阶段数据丢失

### 沉淀流程

1. **记录到 constitution.md**

```markdown
# SpecForge Constitution

## Iron Laws

### IL-005: 接口契约强制
**规则**: 设计阶段必须包含接口契约定义和错误处理策略。
**来源**: Change-XYZ 中因缺少契约导致 3 次返工
**触发场景**: design 阶段产物审查
**版本**: v1.1.0 (MAJOR)
**豁免**: 需记录 ADR 并获得用户明确批准
```

2. **在相关命令中引用**

```markdown
# design-explore.md

## Iron Law
> **设计必须包含接口契约和错误处理策略。** 没有契约的设计不是设计，是草图。

门禁引用：若接口契约/错误策略缺失，触发 **E003_contractMissing**，禁止进入 planning/implementation。
```

3. **在 config.yaml 中添加错误编号**

```yaml
errors:
  E003_contractMissing:
    name: "接口契约缺失"
    description: "设计产物中缺少接口契约定义"
    severity: "blocker"
    guidance: "补充接口契约和错误处理策略后再继续"
```

### 版本影响

| 变更类型 | 版本升级 | 示例 |
|---------|---------|------|
| 新增 Iron Law | MAJOR | v1.x → v2.0 |
| 修改 Iron Law | MAJOR | v1.x → v2.0 |
| 移除 Iron Law | MAJOR | v1.x → v2.0 |

## 错误字典扩展

### 错误编号规则

- **E001-E009**: foundation 阶段
- **E010-E019**: evolution 阶段（复盘）
- **E020-E029**: requirements 阶段
- **E030-E039**: design 阶段
- **E040-E049**: planning 阶段
- **E050-E059**: implementation 阶段
- **E060-E069**: quality 阶段
- **E070-E079**: release 阶段
- **E080-E089**: 自定义阶段 / 扩展钩子错误

### 错误定义格式

```yaml
errors:
  E0XX_errorName:
    name: "错误中文名"
    description: "错误描述（什么情况下触发）"
    severity: "blocker|warning|info"
    guidance: "纠偏建议（如何修复）"
    source: "Change-XYZ 复盘中发现"
```

### 扩展示例

```yaml
errors:
  # 新增 evolution 阶段错误
  E010_noChangeArtifacts:
    name: "缺少 change 产物"
    description: "找不到 specforge/changes/<ChangeName>/ 目录或目录为空"
    severity: "blocker"
    guidance: "确认 change 名称和路径，确保所有阶段产物已生成"
    source: "复盘门禁检查"
    
  E011_incompleteWorkflow:
    name: "工作流未完成"
    description: "当前 change 的 status 不是 completed 或 pending-retrospect"
    severity: "blocker"
    guidance: "先完成所有阶段（到 release）再开始复盘"
    source: "复盘门禁检查"
    
  E013_retrospectiveSkipped:
    name: "跳过复盘"
    description: "未执行复盘直接进入新 change"
    severity: "blocker"
    guidance: "触发 Iron Law 阻断。必须先完成当前 change 的复盘"
    source: "constitution IL-003"
    
  E014_skillNotTested:
    name: "技能未经过 TDD 测试"
    description: "技能优化未经过基线测试和压力测试"
    severity: "blocker"
    guidance: "删除未测试技能，重新执行 TDD 循环（红-绿-重构）"
    source: "constitution IL-004"
```

## 配置质量检查

### 复盘后检查清单

**config.yaml**:
- [ ] `handoffs` 是否反映最新流程？
  - 检查各阶段间的衔接是否顺畅
  - 是否有缺失的强制门禁
- [ ] `errors` 字典是否覆盖本次 change 遇到的所有错误？
  - 对比复盘报告中的错误列表
  - 确保每个错误都有编号、描述、纠偏建议
- [ ] `profile.enabledPhases` 是否与实际使用一致？
  - 移除长期未使用的阶段
  - 添加新增的自定义阶段

**constitution.md**:
- [ ] 是否需要新增 Iron Law？
- [ ] 现有 Iron Law 是否需要修改？
- [ ] 是否有 Iron Law 可以移除（不再适用）？

**skills/**:
- [ ] 新技能是否创建并测试？
- [ ] 现有技能触发词是否需要调整？
- [ ] 技能是否需要 TDD 迭代优化？

### 配置验证脚本

```bash
#!/bin/bash
# 验证 config.yaml 的基本结构

CONFIG=".specforge/config.yaml"

if [ ! -f "$CONFIG" ]; then
  echo "❌ config.yaml 不存在"
  exit 1
fi

# 检查必需字段
for field in "profile" "phases" "handoffs" "errors"; do
  if grep -q "$field:" "$CONFIG"; then
    echo "✅ $field 字段存在"
  else
    echo "❌ $field 字段缺失"
  fi
done

# 检查 handoffs 完整性
echo ""
echo "Handoffs 配置:"
grep -A 5 "handoffs:" "$CONFIG"

# 检查错误字典
echo ""
echo "错误字典条目数:"
grep -c "E[0-9]" "$CONFIG"
```

## 调优决策记录

### 何时创建 ADR

**场景**:
- Profile 重构（添加/移除阶段）
- Iron Law 新增/修改/移除
- 重大配置变更（影响所有未来 change）

### ADR 模板

```markdown
# ADR-<序号>: <决策标题>

**日期**: YYYY-MM-DD
**来源**: Change-XYZ 复盘

## 背景
<为什么需要做这个决策>
<当前的痛点是什么>

## 决策
<做出了什么决策>
<具体变更内容>

## 理由
<为什么选择这个方案>
<替代方案分析>

## 后果
<这个决策带来的影响>
<需要更新的相关配置>

## 版本影响
<MAJOR/MINOR/PATCH>
```

## 持续改进循环

```
1. 执行 change
   ↓
2. 复盘收集数据
   ↓
3. 识别摩擦点
   ↓
4. 调优配置（阶段/技能/规则/错误）
   ↓
5. 验证调优效果（下一个 change）
   ↓
6. 重复循环
```

**关键原则**: 每次 change 都应该让下一次 change 更顺畅。不复盘的团队会在同一个坑里跌倒两次。
