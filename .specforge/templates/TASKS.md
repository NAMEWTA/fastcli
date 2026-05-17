---
name: '{{artifactName}}'
type: 'tasks'
phase: 'planning'
version: '0.1.0'
createdAt: '2026-05-17'
---

# 任务列表：{{featureName}}

> 本模板对应 `rules.planning.artifacts.tasks.requiredFields`。每个任务必须包含：目标、范围、依赖、验收方式。
> 高复杂度任务必须做复杂度拆分，单任务建议 ≤ 2 小时。

## 任务约定

- **复选框语义**：`[ ]` 未开始 / `[-]` 进行中 / `[~]` 已排队 / `[x]` 已完成。
- **可选任务**：在复选框后添加 `*` 标记，如 `- [ ]* 添加缓存层`。
- **并行安全**：可并行任务添加 `[P]` 前缀，必须说明并行安全前提（无共享状态、独立文件等）。

## 任务结构模板

每个任务必须填写以下字段：

```
- [ ] N. <任务标题>
  - 目标：<这个任务要解决什么问题>
  - 范围：<涉及的文件/模块/接口>
  - read_files：<允许读取/grep 的文件列表，不允许写入>
  - write_files：<允许修改的文件列表，提交前由 enforceBoundary 对账>
  - 依赖：<依赖的上游任务编号 或「无」>
  - 验收方式：<运行什么命令或检查什么产物>
```

### read_files / write_files 边界字段

这两个字段定义了每个任务的**作用域边界**——AI 代理在实现阶段被允许读取和修改的文件范围。

- **read_files**：参考边界。列出的文件/模式允许 grep、read，但**不允许 write**。
- **write_files**：修改边界。列出的文件/模式允许 write。`implementation-build` 阶段提交前会通过 `enforceBoundary` 对 `git diff --name-only` 结果进行对账。

**格式**：每行一个路径或 glob 模式，缩进对齐。

```
  - read_files：
    - src/core/types.ts              # 具体文件
    - src/services/*.ts              # 单层 glob
    - docs/**/*.md                   # 递归 glob
  - write_files：
    - src/services/foo-service.ts    # 具体文件
    - tests/unit/services/foo-*.ts   # 通配符
```

**越界处理**：若 `git diff` 包含 `write_files` 未声明的文件，`enforceBoundary` 返回 `ok: false`，AI 代理必须二选一：
1. 回滚越界文件（`git checkout`）
2. 请求扩 `write_files`（需用户确认，同步更新 TASKS.md 并在 CHANGELOGS 记录）

**向后兼容**：若历史任务块缺失这两个字段，`implementation-build` 跳过边界对账并给出一次性升级提示。

子任务使用两级编号（`N.M`）承载具体动作。

## 任务

- [ ] 1. 示例任务：初始化模块骨架
  - 目标：建立模块目录与基础类型声明，为后续实现提供落点。
  - 范围：`src/<module>/index.ts`、`src/<module>/types.ts`
  - read_files：
    - src/core/types.ts
    - src/utils/*.ts
  - write_files：
    - src/<module>/index.ts
    - src/<module>/types.ts
    - tests/unit/<module>/*.test.ts
  - 依赖：无
  - 验收方式：`pnpm build` 通过；新增文件通过 ESLint 检查。

  - [ ] 1.1 创建模块目录结构
  - [ ] 1.2 声明公开导出类型
  - [ ] 1.3 补充最小单元测试占位

- [ ] 2. [P] 示例可并行任务：实现 A 子模块
  - 目标：
  - 范围：`src/<module>/a.ts`
  - read_files：
    - src/<module>/types.ts
    - src/core/*.ts
  - write_files：
    - src/<module>/a.ts
    - tests/unit/<module>/a.test.ts
  - 依赖：1
  - 验收方式：单元测试 PASS；覆盖率达标。
  - 并行安全前提：仅修改 `a.ts`，不触碰 `b.ts`。

- [ ]\* 3. 示例可选任务：添加性能基准
  - 目标：测量关键路径的时延基线。
  - 范围：`bench/<feature>.bench.ts`
  - read_files：
    - src/<module>/**/*.ts
  - write_files：
    - bench/<feature>.bench.ts
  - 依赖：2
  - 验收方式：基准脚本可运行并产出结果文件。

## 验收口径（Definition of Done）

- 所有**必需任务**（无 `*` 标记）状态为 `[x]`。
- 每个任务的「验收方式」都已执行并留有证据（命令输出、测试报告、截图等）。
- `pnpm check`（lint + test + build）通过。
- 规格文档（requirements / design）与实现保持一致，偏离已记录在变更日志中。
