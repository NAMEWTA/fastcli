# 统一 Executor 单命令与命令链路径

## 问题陈述

`src/core/executor.ts` 中 `executeCommand`（单命令）和 `executeCommandChain`（多命令链）的 spawn + promise + 信号转发 + error/exit 事件处理逻辑重复约 40 行，完全一致。单命令执行本质上是长度为 1 的命令链，但当前两个函数各自独立维护一套 spawn 逻辑。

此外，`executeCommand` 无任何外部调用方——唯一调用点位于 `executeCommandChain` 自身的 Windows 回退路径，作为公共 API 存在但从未被 CLI 层或 Web 层直接使用。

## 解决方案

提取 `spawnOnce` 私有原语作为唯一接触 `node:child_process.spawn` 的模块，将 `executeChain` 统一为唯一公共入口，移除 `executeCommand`。所有命令执行路径（n=0、n=1、n>1 POSIX、n>1 Windows）汇聚于 `spawnOnce`。

## 用户故事

1. 作为 fastcli 维护者，我希望 executor 模块内部无重复代码，以便修改 spawn 行为时只需改一处
2. 作为 fastcli 维护者，我希望公共 API 简洁——一个入口函数覆盖所有场景，以便调用方无需在 `executeCommand` 和 `executeChain` 之间选择
3. 作为 fastcli 用户，我希望单命令执行时打印格式不变（`$ <command>` 无多余前缀），以便终端输出保持干净
4. 作为 fastcli 用户，我希望命令行为了解每一步的执行进度（多命令时带 `[i/N]` 前缀），以便定位失败步骤

## 实现决策

### 决策 1：移除 executeCommand（路径 A）

`executeCommand` 无任何外部调用方。CLI 层（`run.ts`、`menu.ts`）均直接使用 `executeChain`。移除后公共 API 收缩为单一入口，Windows 回退路径改为直接调用 `spawnOnce`。

### 决策 2：提取 spawnOnce 私有原语

```typescript
function spawnOnce(
  command: string,
  spawnImpl: typeof nodeSpawn,
  language: Language,
): Promise<ExecResult>
```

职责：spawn 子进程 → promise 包装 → 信号转发挂载/卸载 → error 事件（ENOENT→127，其它→1）→ exit 事件（信号→128+n，code null→1）→ settled 闸门保证单次 resolve。

这是唯一调用 `spawnImpl(file, args, { stdio: 'inherit' })` 的地方。

### 决策 3：内部结构

```
executeChain(commands, opts)          ← 唯一公共入口
  ├─ n=0  → { success: true, code: 0 }
  ├─ n=1  → 打印 "$ <cmd>" → spawnOnce(cmd)
  ├─ n>1 (POSIX) → 打印 [i/N] → trap 拼接 → spawnOnce(combined)
  │                 → 读 statePath → 返回 failedStep
  └─ n>1 (win32) → 打印 [i/N] → for 逐条 spawnOnce(cmd)
                     → 失败时返回 failedStep
```

### 决策 4：n=1 打印格式

- n=1：`$ <command>`（不带 `[1/1]` 前缀）
- n>1：`[i/N] $ <command>`

理由：n=1 是最常见用法，`[1/1]` 前缀是纯粹视觉噪音。

### 决策 5：受影响资产

| 资产 | 变更类型 | 说明 |
|------|---------|------|
| `src/core/executor.ts` | 重构 | 提取 spawnOnce；executeChain 统一所有路径；移除 executeCommand |
| `tests/core/executor.test.ts` | 重组 | 两层测试：spawnOnce 层 + executeChain 层（含新增 n=1 覆盖） |
| `src/cli/commands/run.ts` | 不变 | 仍调用 executeChain |
| `src/cli/menu.ts` | 不变 | 仍调用 executeChain |

### 决策 6：依赖类别

`in-process`：所有变更在 `executor.ts` 单文件内完成。spawnOnce 是纯内部抽象，不引入新依赖或缝合点。

## 测试决策

### 接缝

唯一测试接缝：`ExecuteOptions.spawnImpl`（注入 mock spawn）。spawnOnce 和 executeChain 共享此接缝，不需要新建。

### 测试策略（两层）

**spawnOnce 层**（迁移自现有 executeCommand 测试）：
- dryRun 不调用 spawn
- POSIX 使用 `/bin/sh -c <command>` 且 stdio inherit
- 退出码 0 → success true
- 退出码 1 → success false
- SIGINT → code 130
- SIGTERM → code 143
- null code 且无信号 → 回退 code 1
- ENOENT → 打印 "Command not found" + code 127
- 通用 error → code 1

**executeChain 层**（保留现有 + 新增 n=1 覆盖）：
- printCommandList 使用 `[i/N]` 格式
- dryRun 不调用 spawn
- 同一 shell 会话中 shell 变量跨步保持
- 中途失败返回 failedStep 和退出码
- Windows 顺序执行并在中途失败时返回步骤信息
- Windows 顺序执行全部成功
- Windows 顺序执行在失败步骤处停止（mock 验证）
- **新增**：n=1 路径 — `executeChain(['cmd'])` 行为等价于原 `executeCommand('cmd')`
- **新增**：n=1 路径 — 打印格式为 `$ <cmd>` 无 `[1/1]` 前缀
- **新增**：n=1 路径 — 不创建临时 statePath 文件（无 trap 开销）

### 测试原则

- 只测试外部行为（返回值、打印输出），不测试实现细节
- 不重复覆盖同一行为：spawnOnce 测试 spawn 语义，executeChain 测试链语义和 n=1 等价性
- 先例：现有 `tests/core/executor.test.ts` 的 FakeChild + spawnImpl 注入模式

## 超出范围

- 不修改 resolver（变量替换逻辑不变）
- 不修改 registry（工具注册逻辑不变）
- 不修改 CLI 命令定义（run、menu 调用签名不变）
- 不修改 public API 的 ExecuteOptions / ExecuteChainResult 类型签名
- 不引入新的依赖包
- 不修改 Windows 与 POSIX 的平台分支策略

## 补充说明

- 验收标准：`executeChain(['cmd'])` 与当前 `executeCommand('cmd')` 对同一输入返回相同 `{success, code, signal}`
- 链中第 k 步失败时 `failedStep === k` 且 `totalSteps === commands.length`
- n=1 不创建临时 statePath 文件（无 trap 开销）
- Windows 回退路径直接调用 spawnOnce，不再经过已删除的 executeCommand
- 公共接口签名不变：调用方（run.ts、menu.ts）无需修改
