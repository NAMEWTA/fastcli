# 统一 Executor 单命令与命令链路径 — 设计文档

## 元信息

| 字段 | 值 |
|------|-----|
| Change ID | `2026-07-11-unify-executor` |
| Route | architecture → idea-to-delivery |
| Phase | grill 完成，待进入 spec/implement |
| 来源 | [架构审查报告](/var/folders/wd/wm8pqn5d5fx7_8lsnsy6vw0w0000gn/T/architecture-review-20260711-zh.html) 候选 ① |

## 问题

`src/core/executor.ts` 中 `executeCommand`（单命令）和 `executeCommandChain`（多命令链）重复了约 80% 的 spawn/promise/信号转发逻辑（~40 行完全一致）。单命令执行本质上是长度为 1 的命令链。

## 决策记录

### 决策 1：保留 executeCommand 作为薄包装器（路径 B）

**选择**：不删除 `executeCommand`，改为一行调用 `executeChain([cmd])`。

**理由**：变更集中在 executor 模块内部，零调用方改动。未来可逐步废弃。

**被拒绝的替代方案**：路径 A（直接移除 executeCommand，让调用方传 `[command]`）——调用方（run.ts、menu.ts）需同步修改，引入不必要的跨模块变更面。

### 决策 2：提取 spawnOnce 私有原语

**选择**：将 spawn + promise + 信号转发 + error/exit 事件处理提取为私有函数 `spawnOnce(command, spawnImpl): Promise<ExecResult>`。

**理由**：`spawnOnce` 成为唯一接触 `node:child_process.spawn` 的地方，创建深层模块——小接口（一个函数，两个参数），大量实现（所有子进程管理逻辑）。

### 决策 3：保持 n=1 时的差异化打印格式

**选择**：n=1 时打印 `$ <command>`（不带编号前缀），n>1 时打印 `[1/N] $ ...`。

**理由**：n=1 是用户最常见用法（`fastcli run claude install`），`[1/1]` 前缀是纯粹视觉噪音。今天的用户已习惯干净格式。

### 决策 4：三层测试策略

**选择**：
- `spawnOnce`：迁移现有单命令测试（spawn、dry-run、ENOENT、信号、退出码）
- `executeChain`：保持现有 chain 测试 + 新增 n=1 路径覆盖
- `executeCommand`：1-2 个 smoke 测试验证等价性

**理由**：测试不重复覆盖同一行为。总测试数减少约 30%，覆盖范围不变。

## 内部结构

```
                    ┌─────────────────────────┐
                    │     executeCommand()     │  ← 薄包装器（公共接口）
                    │  → executeChain([cmd])   │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │     executeChain()       │  ← 公共接口（唯一 spawn 入口）
                    │  n=0 → 空成功            │
                    │  n=1 → spawnOnce         │
                    │  n>1 → trap + spawnOnce  │
                    │  win32 → 逐条 spawnOnce  │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │      spawnOnce()         │  ← 私有原语（深层模块核心）
                    │  spawn + promise         │
                    │  + 信号转发               │
                    │  + error/exit 事件       │
                    └─────────────────────────┘
```

## 依赖类别

`in-process`：所有变更在 `executor.ts` 单文件内完成。spawnOnce 是纯内部抽象，不引入新的依赖或缝合点。

## 受影响资产

| 资产 | 变更类型 | 说明 |
|------|---------|------|
| `src/core/executor.ts` | 重构 | 提取 spawnOnce；executeChain 统一路径；executeCommand 降级为包装器 |
| `src/core/executor.test.ts` | 重组 | 三层测试策略：spawnOnce 测试 + chain 测试 + smoke 测试 |
| `src/cli/commands/run.ts` | 不变 | 仍调用 executeCommand / executeChain |
| `src/cli/menu.ts` | 不变 | 仍调用 executeCommandChain |

## 验收标准

1. `executeCommand(cmd)` 和 `executeChain([cmd])` 对同一输入返回相同 `{success, code, signal}`
2. 链中第 k 步失败时，`failedStep === k` 且 `totalSteps === commands.length`
3. n=1 不创建临时 statePath 文件（无 trap 开销）
4. Windows 回退路径直接调用 spawnOnce，不经过 executeCommand
5. 公共接口签名不变：`executeCommand` 和 `executeChain` 的调用方无需修改
6. 测试总数 ≤ 当前测试数的 70%（去重后的预期）
