# fastcli 复杂命令启动工作流全景说明

## 1. 文档目标

本文档面向两类读者：

- 配置使用者：希望正确编写 `workflows`、`providers`、`credentials`，并稳定启动 `copilot`、`claude` 等复杂交互命令。
- 项目维护者：希望理解从 CLI 入口到子进程执行的完整链路、关键分支、平台差异和已知边界。

本文聚焦“复杂命令启动工作流”，不展开 npm 发布、Git 流程或其他无关能力。

## 2. 三层模型

复杂命令启动可抽象为三层：

- 编排层（Workflow）：定义步骤、选择分支、上下文变量流转。
- 执行策略层（Provider）：定义最终命令、模式参数、环境变量映射。
- 身份数据层（Credential）：定义账号和敏感值（如 token），供 Provider 注入。

对应类型定义见 [src/types/index.ts](../../../src/types/index.ts)。

## 3. 端到端执行时序

### 3.1 入口与调度

1. CLI 入口接收 `name` 与 `--dry-run`，见 [src/index.ts](../../../src/index.ts#L57)。
2. 运行调度函数读取配置并解析名称，见 [src/commands/run.ts](../../../src/commands/run.ts#L10)。
3. 名称优先解析为 alias，其次 workflow，见 [src/core/name-resolver.ts](../../../src/core/name-resolver.ts#L8)。

### 3.2 Alias 分支

- 解析到 alias 后直接执行命令，见 [src/commands/run.ts](../../../src/commands/run.ts#L25)。
- 命令由执行器启动子进程，见 [src/core/executor.ts](../../../src/core/executor.ts#L12)。

### 3.3 Workflow 分支

- 解析到 workflow 后进入步骤循环，见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L82)。
- 每步通过交互选择一个 option，并写入上下文 `context.values[step.id]`，见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L127)。
- 若 option 指向 `next`，跳转到下一步；若形成最终命令则执行并结束。

## 4. providers、credentials、workflows 如何配合

以下按实际执行顺序解释三者协作。

### 4.1 Workflow 负责“问什么、怎么走”

在 `workflows.<name>.steps` 中：

- `id` 标识步骤；
- `prompt` 是交互提示；
- `options` 定义可选项；
- option 可包含：
1. `next`：跳到下一个步骤；
2. `command`：直接作为最终命令；
3. `value`：保存到上下文，用于后续模式或凭据解析；
4. `provider`：可覆盖 workflow 级 provider。

### 4.2 Provider 负责“怎么执行”

当进入 Provider 路径时，会执行：

1. 解析 provider id：`option.provider` 优先于 `workflow.provider`，见 [src/core/provider-runtime.ts](../../../src/core/provider-runtime.ts#L6)。
2. 读取 provider 配置（command、modeArgs、envMapping），见 [src/core/provider-runtime.ts](../../../src/core/provider-runtime.ts#L11)。
3. 解析 mode 对应参数并组装命令，见 [src/core/provider-runtime.ts](../../../src/core/provider-runtime.ts#L25)。

### 4.3 Credential 负责“给谁的密钥”

进入 Provider 执行前，会解析 credential id：

- 优先读取 `select-account`、`select-credential`、`credential` 等上下文字段；
- 最后回退当前 option 的 `value`。

逻辑见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L40)。

随后读取 `credentials.<credentialId>.values`，并根据 `provider.envMapping` 注入环境变量，见 [src/core/provider-runtime.ts](../../../src/core/provider-runtime.ts#L39)。

### 4.4 一句话协作关系

- `workflows` 决定流程；
- `credentials` 提供值；
- `providers` 组装命令并注入环境。

## 5. 命令决策优先级

执行时存在两类命令来源：

- option 直接命令：`option.command`
- provider 组装命令：`provider.command + modeArgs`

决策函数为 `decideFinalCommand`，优先使用 `option.command`，见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L35)。

这意味着：同一 option 若同时包含 `command` 和 `next`，会先形成最终命令并结束流程，不会继续跳转。

## 6. 执行器原理与平台差异

### 6.1 子进程执行模型

执行器统一通过 `spawn` 启动 shell，见 [src/core/executor.ts](../../../src/core/executor.ts#L26)。

- `interactive = true`：`stdio = 'inherit'`，适合交互式 CLI。
- `interactive = false`：采集 stdout/stderr，适合普通命令回显。

### 6.2 Windows 特殊处理

Windows 下使用 `cmd.exe`（而非 PowerShell）执行命令，见 [src/core/executor.ts](../../../src/core/executor.ts#L21)。

这样可以规避 PowerShell 对 `*.ps1` shim 的执行策略限制，减少 `PSSecurityException` 类报错。

## 7. 已知行为与设计边界

### 7.1 command 终止语义

当最终命令被决策出来后，执行结束即退出 workflow，见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L163)。

### 7.2 Provider 路径依赖 credential

当前 Provider 执行分支要求可解析出 `credentialId`，否则会报错并终止，见 [src/core/workflow-runner.ts](../../../src/core/workflow-runner.ts#L146)。

### 7.3 配置校验侧重引用合法性

配置校验当前主要覆盖：

- alias/workflow 名称冲突；
- provider 是否存在；
- `next` 是否指向存在步骤；
- `envMapping` 空键值。

见 [src/core/config-manager.ts](../../../src/core/config-manager.ts#L50)。

## 8. 常见故障与排查

### 8.1 报错：`provider 不存在`

排查：

1. 检查 `workflow.provider` 或 `option.provider` 是否拼写一致。
2. 检查 `providers` 根节点下是否存在对应键。

### 8.2 报错：`credentialId 不存在`

排查：

1. 检查账号选择步骤 option 的 `value`。
2. 检查 `credentials.<id>` 是否存在。
3. 检查 `resolveCredentialId` 依赖的步骤 id 是否与配置一致。

### 8.3 报错：PowerShell 执行策略拦截

排查：

1. 优先使用 `.cmd` 入口（如 `copilot.cmd`、`claude.cmd`）。
2. 使用 workflow provider 交互执行路径，避免非交互别名路径触发异常行为。

### 8.4 报错：`Input must be provided ... --print`

典型原因是命令被当成非交互执行。排查点：

1. 当前是否走 alias 分支；
2. 执行时 `interactive` 是否为 `false`；
3. 是否可改为 workflow provider 路径。

## 9. 测试证据映射

以下测试直接印证核心行为：

- Provider/credential/env 注入： [tests/core/provider-runtime.test.ts](../../../tests/core/provider-runtime.test.ts)
- Workflow 命令优先级与 credential 解析： [tests/core/workflow-runner.test.ts](../../../tests/core/workflow-runner.test.ts)
- 执行器交互与退出码处理： [tests/core/executor.test.ts](../../../tests/core/executor.test.ts)
- 配置合法性校验： [tests/core/config-manager.test.ts](../../../tests/core/config-manager.test.ts)

## 10. 推荐配置模式（实践结论）

对于 `copilot`、`claude` 这类复杂交互命令，推荐：

1. 用 workflow 表达步骤和模式选择；
2. 用 provider 表达命令与参数策略；
3. 用 credential 保存账号敏感值并通过 envMapping 注入；
4. 避免在同一 option 同时混用 `command` 与 `next`；
5. Windows 优先 `.cmd` 命令入口。

---

如需扩展到多账号、多 provider、多模式（如 `resume`、`new-session`、`safe-mode`），建议先按本文件第 4 节建立“流程字段约定”，再扩展配置规模。
