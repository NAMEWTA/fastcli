# 通用交互式终端 Workflow（Provider 模型）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在不破坏现有 alias/workflow 行为的前提下，为 fastcli 增加 provider + credentials 驱动的通用交互式 CLI 启动能力。

**架构：** 继续沿用当前“workflow 产出 command 字符串 -> executor 执行”的主链路。新增 provider/credentials 仅作为 command 与 env 的组装层，通过可选字段向后兼容；执行端增加 env 注入与 interactive stdio 透传能力。

**技术栈：** TypeScript, Node.js child_process, vitest

---

## 文件结构（本次改动）

- 修改：`src/types/index.ts`
  - 扩展 Config/Workflow/WorkflowOption 类型，新增 `ProviderConfig`、`CredentialConfig`。
- 修改：`src/core/config-manager.ts`
  - 增加 provider/credentials 相关配置校验（引用完整性、缺失字段、冲突提示）。
- 创建：`src/core/provider-runtime.ts`
  - 纯函数模块：provider/credential 解析、modeArgs 组装、env 映射、命令决策顺序。
- 修改：`src/core/workflow-runner.ts`
  - 在保持 `option.command` 兼容的同时，支持 provider 回退组装命令与 env。
- 修改：`src/core/executor.ts`
  - 增加执行参数（`env`、`interactive`），实现 `stdio: 'inherit'` 的交互模式。
- 创建：`tests/core/executor.test.ts`
  - 覆盖 `interactive`、`env` 合并、退出码与 error 分支行为。
- 修改：`tests/core/config-manager.test.ts`
  - 新增 provider/credentials 校验测试。
- 修改：`tests/core/workflow-runner.test.ts`
  - 新增命令决策顺序与 provider 组装相关单测。
- 创建：`tests/core/provider-runtime.test.ts`
  - 覆盖纯函数：provider 选择、modeArgs、envMapping、异常路径。
- 修改：`README.md`
  - 最小增补配置示例（providers/credentials/workflow 绑定），避免实现后文档断层。

参考规格：`docs/superpowers/specs/2026-03-25-fastcli-design.md`

---

### 任务 1：扩展类型与默认配置（向后兼容）

**文件：**
- 修改：`src/types/index.ts`
- 测试：`pnpm test -- tests/core/config-manager.test.ts`

- [ ] **步骤 1：先写失败测试（类型驱动到校验层）**

在 `tests/core/config-manager.test.ts` 增加行为测试（不要依赖类型报错）：
- `workflow.provider` 引用不存在 provider 时，`validateConfig` 返回 `valid=false`
- 旧配置（无 providers/credentials）仍然 `valid=true`

示例断言：

```ts
expect(result.valid).toBe(false);
expect(result.errors[0]).toContain('provider');
```

- [ ] **步骤 2：运行测试确认当前失败**

运行：`pnpm test -- tests/core/config-manager.test.ts`
预期：FAIL（类型或校验路径尚未支持 providers/credentials）

- [ ] **步骤 3：最小实现类型定义**

在 `src/types/index.ts` 增加：

```ts
export interface CredentialConfig {
  label?: string;
  values: Record<string, string>;
}

export interface ProviderConfig {
  providerId: string;
  command: string;
  modeArgs?: Record<string, string[]>;
  envMapping?: Record<string, string>;
}
```

并扩展：

```ts
export interface Config {
  aliases: Record<string, Alias>;
  workflows: Record<string, Workflow>;
  credentials?: Record<string, CredentialConfig>;
  providers?: Record<string, ProviderConfig>;
}

export interface Workflow {
  description?: string;
  provider?: string;
  steps: WorkflowStep[];
}

export interface WorkflowOption {
  name: string;
  value?: string;
  next?: string;
  command?: string;
  provider?: string;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/core/config-manager.test.ts`
预期：PASS（至少编译通过，旧用例不回归）

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/types/index.ts tests/core/config-manager.test.ts
git commit -m "feat(types): 扩展 provider 与 credentials 类型"
```

---

### 任务 2：新增 provider 运行时组装模块（纯函数）

**文件：**
- 创建：`src/core/provider-runtime.ts`
- 创建：`tests/core/provider-runtime.test.ts`
- 测试：`pnpm test -- tests/core/provider-runtime.test.ts`

- [ ] **步骤 1：先写失败测试（TDD 主体）**

在 `tests/core/provider-runtime.test.ts` 编写以下测试：
- `resolveProviderId`：`option.provider` 覆盖 `workflow.provider`
- `buildProviderCommand`：`provider.command + modeArgs[mode]` 输出字符串
- `buildInjectedEnv`：按 `envMapping` 从 `credentials[credentialId].values` 映射
- 异常：provider 不存在、credentialId 不存在、映射字段缺失

示例断言：

```ts
expect(buildProviderCommand('codex', ['--resume'])).toBe('codex --resume');
expect(env.OPENAI_API_KEY).toBe('sk-live');
expect(() => getCredentialValues(config, 'missing')).toThrow(/credentialId/i);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/provider-runtime.test.ts`
预期：FAIL（模块尚未实现）

- [ ] **步骤 3：实现最小可用纯函数**

在 `src/core/provider-runtime.ts` 实现并导出：

```ts
export function resolveProviderId(optionProvider?: string, workflowProvider?: string): string | undefined;
export function getProvider(config: Config, providerId: string): ProviderConfig;
export function getCredentialValues(config: Config, credentialId: string): Record<string, string>;
export function resolveModeArgs(provider: ProviderConfig, mode?: string): string[];
export function buildProviderCommand(command: string, modeArgs: string[]): string;
export function buildInjectedEnv(
  baseEnv: NodeJS.ProcessEnv,
  mapping: Record<string, string> | undefined,
  values: Record<string, string>
): NodeJS.ProcessEnv;
```

实现要求：
- 不读取 I/O，不依赖 logger。
- 错误信息可读，包含 providerId/credentialId。
- 仅做字符串组装和对象映射，避免过度抽象。

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/core/provider-runtime.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/provider-runtime.ts tests/core/provider-runtime.test.ts
git commit -m "feat(core): 新增 provider 运行时组装模块"
```

---

### 任务 3：增强配置校验（引用完整性）

**文件：**
- 修改：`src/core/config-manager.ts`
- 修改：`tests/core/config-manager.test.ts`
- 测试：`pnpm test -- tests/core/config-manager.test.ts`

- [ ] **步骤 1：先补失败测试**

新增测试场景：
- workflow.provider 指向不存在 provider -> invalid
- option.provider 指向不存在 provider -> invalid
- provider.envMapping 键或值为空字符串 -> invalid
- 旧配置（无 providers/credentials）仍 valid

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/config-manager.test.ts`
预期：FAIL（新规则尚未实现）

- [ ] **步骤 3：实现最小校验逻辑**

在 `validateConfig` 中新增：
- 收集 `providers` key 集合。
- 遍历 workflow 的 `workflow.provider` 和 `option.provider` 引用合法性。
- 对声明 `envMapping` 的 provider，校验键和值均为非空字符串。
- 不在静态校验阶段判断“凭据字段缺失”；该项下沉到运行时（已确定 credentialId 后）做 preflight。
- 保持旧规则（名称冲突、next 引用）不变。

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/core/config-manager.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/config-manager.ts tests/core/config-manager.test.ts
git commit -m "feat(config): 增加 provider 与凭据映射校验"
```

---

### 任务 4：工作流执行链路接入 provider（保持 command 优先）

**文件：**
- 修改：`src/core/workflow-runner.ts`
- 修改：`src/core/executor.ts`
- 修改：`src/commands/run.ts`
- 修改：`tests/core/workflow-runner.test.ts`
- 测试：
  - `pnpm test -- tests/core/workflow-runner.test.ts`
  - `pnpm test -- tests/core/provider-runtime.test.ts`

- [ ] **步骤 1：先写失败测试（关键行为）**

在 `tests/core/workflow-runner.test.ts` 增加纯函数或可测逻辑用例（建议抽出 helper 后测 helper）：
- 当 `option.command` 存在时，始终优先使用。
- 当 `option.command` 缺失且存在 provider 时，使用 `provider.command + modeArgs`。
- provider 路径下，`option.value` 作为 credentialId。

示例断言：

```ts
expect(decideFinalCommand({ optionCommand: 'echo hi', providerCommand: 'codex' })).toBe('echo hi');
expect(decideFinalCommand({ optionCommand: undefined, providerCommand: 'codex --resume' })).toBe('codex --resume');
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/workflow-runner.test.ts`
预期：FAIL

- [ ] **步骤 3：最小改造 workflow-runner**

实现建议：
- 保持调用兼容，使用可选 options 方案：`runWorkflow(workflow, dryRun, runtime?)` 或 `runWorkflow(workflow, options?)`，禁止改成位置重排三参。
- 复用 `src/core/provider-runtime.ts`：
  - 决策 providerId（option.provider > workflow.provider）
  - 读取 credentialId（选择步骤 value）
  - 生成 env 与 command
- 保留原有分支：纯 `option.command` 工作流不受影响。

- [ ] **步骤 4：补运行时 preflight（凭据与映射）**

在确定 `credentialId` 后执行：
- `credentialId` 不存在 -> 立即失败并提示可选 id
- `envMapping` 引用字段在该凭据中缺失 -> 立即失败，不启动子进程

- [ ] **步骤 5：扩展 executor 执行参数**

在 `src/core/executor.ts` 改造接口：

```ts
interface ExecuteOptions {
  env?: NodeJS.ProcessEnv;
  interactive?: boolean;
}

export async function executeCommand(command: string, options?: ExecuteOptions): Promise<ExecResult>
```

行为要求：
- `interactive=true` 时使用 `stdio: 'inherit'`。
- 默认行为保持现有输出采集逻辑，避免影响旧测试。
- 子进程关闭时返回真实退出码（`code ?? 1`），不吞掉失败语义。
- `error` 分支返回失败结果并包含错误信息。

- [ ] **步骤 6：补执行器失败测试并实现**

创建 `tests/core/executor.test.ts`，最小覆盖：
- `interactive=false` 走输出采集分支
- `interactive=true` 走透传分支（通过 mock spawn 断言 `stdio: 'inherit'`）
- 子进程 `close(非0)` 时 `success=false`
- 子进程 `error` 事件时 `success=false` 且 stderr 包含错误

- [ ] **步骤 7：在 run 命令入口透传 config 给 workflow-runner**

修改 `src/commands/run.ts`，在 workflow 分支传入 `config`（或需要的 providers/credentials 子集）。

- [ ] **步骤 8：运行测试验证通过**

运行：
- `pnpm test -- tests/core/workflow-runner.test.ts`
- `pnpm test -- tests/core/provider-runtime.test.ts`
- `pnpm test -- tests/core/config-manager.test.ts`
- `pnpm test -- tests/core/executor.test.ts`

预期：PASS

- [ ] **步骤 9：Commit**

运行：
```bash
git add src/core/workflow-runner.ts src/core/executor.ts src/commands/run.ts tests/core/workflow-runner.test.ts tests/core/executor.test.ts
git commit -m "feat(workflow): 接入 provider 驱动命令与环境注入"
```

---

### 任务 5：补充文档与回归测试清单

**文件：**
- 修改：`README.md`
- 修改：`docs/superpowers/specs/2026-03-25-fastcli-design.md`（仅在实现偏差时微调）
- 测试：`pnpm test`

- [ ] **步骤 1：先写文档回归检查清单（手工）**

清单项：
- 旧 alias/旧 workflow 示例仍可运行。
- 新 provider+credentials 示例可运行 dry-run。
- 命令预览不打印敏感 env 值。

- [ ] **步骤 2：补充 README 最小示例**

新增配置示例：
- `providers.codex`
- `credentials.work`
- workflow 中 `provider` 与步骤 `value=credentialId`

- [ ] **步骤 3：全量测试回归**

运行：`pnpm test`
预期：PASS（全部 core 测试通过）

- [ ] **步骤 4：Commit**

运行：
```bash
git add README.md
# 仅当规格文件有实际差异时再追加：
# git add docs/superpowers/specs/2026-03-25-fastcli-design.md
git commit -m "docs: 补充 provider 模型配置与使用示例"
```

---

## 执行注意事项

- 使用 `@superpowers/test-driven-development`：每个任务先加失败测试，再最小实现。
- 使用 `@superpowers/verification-before-completion`：每次声称完成前必须给出命令与结果。
- 使用 `@superpowers/subagent-driven-development`：任务级子代理 + 两阶段审查（规格 -> 代码质量）。
- 严格 YAGNI：不在本次引入 provider 插件系统、远程 secrets 管理或多层优先级 DSL。
- 频繁 commit：每个任务至少 1 次，避免跨任务大提交。
