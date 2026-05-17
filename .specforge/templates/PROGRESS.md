---
task-id: '{{taskId}}'
change-id: '{{changeId}}'
timestamp: '{{timestamp}}'
trigger-reason: '{{triggerReason}}'
failure-count: {{failureCount}}
---

# PROGRESS: {{taskId}}

> 生成时间：{{timestamp}}
> 触发原因：{{triggerReason}}
> 当前失败次数：{{failureCount}}

<!-- 路径契约：specforge/changes/<change-id>/progress/<task-id>-PROGRESS.md -->
<!-- 同一任务允许多份（按时间戳递增），最新一份为权威 -->
<!-- 触发原因可选值：token-limit / repeated-failure / user-feeling-stuck / other -->

## 目标

<!-- 用一句话描述本任务当前要达成的目标。清窗恢复后 AI 代理据此快速定位上下文。 -->

{{goal}}

## 已排除方案

<!-- 列出所有已尝试但失败的方案，每条包含尝试时间与失败原因摘要。
     恢复后 AI 代理必须先读本段，避免重复尝试同一失败路径。 -->

- [方案 A] 尝试于 {{triedAt}}，失败原因：{{failureReason}}
- [方案 B] 尝试于 {{triedAt}}，失败原因：{{failureReason}}

## 当前假设

<!-- 描述本次恢复后拟采用的根因假设。
     必须与「已排除方案」中的失败路径有明确差异，否则违反 P9。 -->

{{currentHypothesis}}

## 下一动作

<!-- 具体到单步的下一动作，含预期验证方式。
     恢复后 AI 代理据此直接执行，无需重新推理。 -->

{{nextAction}}

## 反重复契约

<!-- 本段是 P9 宪法原则的落地执行声明。恢复后 AI 代理必须遵守以下契约： -->

恢复后 AI 第一动作：读本文件「已排除方案」段；若新尝试与上述已排除方案近似，
必须书面回答「本次尝试与第 N 次失败的差异是 X」；若无法回答差异，必须停下反问用户。
违反本契约将触发 E010_repeatedFailurePattern。
