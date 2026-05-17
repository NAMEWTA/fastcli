# PROGRESS 模板字段说明与填写指南

> 本文件是 `context-reset-protocol` skill 的 L3 参考资源。
> 当 AI 代理需要创建 PROGRESS 文件时按需加载。

## 路径契约

```
specforge/changes/<change-id>/progress/<task-id>-PROGRESS.md
```

- 随 change 归档；`specforge/archive/` 整体带走
- 不污染 archive 顶层
- 同一任务允许多份（按时间戳递增），最新一份为权威

## Frontmatter 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `task-id` | string | 当前任务标识（如 `6.2.2`） |
| `change-id` | string | 所属 change 标识（如 `2026-05-11-flow-kit-integration`） |
| `timestamp` | ISO-8601 | 生成时间 |
| `trigger-reason` | enum | `token-limit` / `repeated-failure` / `user-feeling-stuck` / `other` |
| `failure-count` | number | 当前累计失败次数 |

## 正文五段填写指南

### 目标

- 用一句话描述本任务当前要达成的目标
- 清窗恢复后 AI 代理据此快速定位上下文
- 示例：「实现 enforceBoundary 函数的 glob 展开逻辑，使 `src/**/*.ts` 能正确匹配嵌套路径」

### 已排除方案

- 列出所有已尝试但失败的方案
- 每条格式：`[方案名] 尝试于 <时间>，失败原因：<错误摘要>`
- 失败原因应具体到错误消息或行为偏差，禁止模糊描述
- 示例：`[方案 A: minimatch 递归] 尝试于 14:30，失败原因：minimatch 不支持 ** 跨目录匹配`

### 当前假设

- 描述本次恢复后拟采用的根因假设
- **必须**与「已排除方案」中的失败路径有明确差异
- 若无法给出差异化假设，应在此段写明「需要用户输入新方向」

### 下一动作

- 具体到单步的下一动作
- 含预期验证方式（如「运行 `pnpm test -- --grep boundary` 期望 3 个用例通过」）
- 恢复后 AI 代理据此直接执行，无需重新推理

### 反重复契约

固定声明文本（直接复制）：

```
恢复后 AI 第一动作：读本文件「已排除方案」段；若新尝试与上述已排除方案近似，
必须书面回答「本次尝试与第 N 次失败的差异是 X」；若无法回答差异，必须停下反问用户。
违反本契约将触发 E010_repeatedFailurePattern。
```

## 多份 PROGRESS 的处理

- 同一任务可能因多次清窗产生多份 PROGRESS
- 文件名建议追加时间戳后缀：`<task-id>-PROGRESS-<HHMMSS>.md`
- 恢复时读取最新一份（按 `timestamp` frontmatter 排序）
- 旧份保留不删除，作为完整失败历史的审计记录
