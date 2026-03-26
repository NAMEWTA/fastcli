# FastCLI 设计规格说明

## 概述

FastCLI 是一个全局安装的 npm CLI 工具，用于简化终端命令的使用。它提供两个核心功能：

1. **命令别名** - 将复杂的终端命令简化为短指令
2. **树状工作流** - 配置多步骤交互式工作流，支持条件分支和变量传递

## 目标用户

- 频繁使用终端的开发者
- 需要记忆大量命令参数的用户
- 希望提高命令行效率的用户

## 核心需求

- 主命令名称：`fastcli`
- 统一入口：`fastcli <名称>` 自动识别是别名还是工作流
- 名称唯一性：别名和工作流共用命名空间，不允许重名
- 命令预览：执行前显示完整命令
- 树状工作流：支持多步骤选择、条件分支、变量模板替换

## 技术栈

| 类别 | 选择 | 版本 |
|------|------|------|
| 运行时 | Node.js | >=18.0.0 |
| 包管理器 | pnpm | 10.x |
| 语言 | TypeScript | 5.x |
| CLI 框架 | Commander.js | 12.x |
| 交互式提示 | @inquirer/prompts | 7.x |
| 构建工具 | tsup | 8.x |
| 终端样式 | picocolors | 1.x |

## 项目结构

```
fastcli/
├── src/
│   ├── commands/                # 子命令
│   │   ├── run.ts              # 运行别名/工作流（默认命令）
│   │   ├── alias/              # 别名管理
│   │   │   ├── add.ts
│   │   │   ├── remove.ts
│   │   │   └── list.ts
│   │   ├── workflow/           # 工作流管理
│   │   │   ├── list.ts
│   │   │   └── show.ts
│   │   └── config/             # 配置管理
│   │       ├── init.ts
│   │       ├── edit.ts
│   │       └── show.ts
│   ├── core/
│   │   ├── config-manager.ts   # 配置读写
│   │   ├── executor.ts         # 命令执行器
│   │   ├── workflow-runner.ts  # 工作流引擎
│   │   ├── template-engine.ts  # 变量模板引擎
│   │   └── name-resolver.ts    # 名称解析器
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── utils/
│   │   ├── logger.ts           # 日志输出（彩色）
│   │   └── path.ts             # 路径处理
│   └── index.ts                # CLI 入口
├── package.json
├── tsconfig.json
├── tsup.config.ts              # 构建配置
├── .eslintrc.cjs
└── README.md
```

## 配置文件

### 路径

`~/.fastcli/config.json`

### 格式

```json
{
  "aliases": {
    "gp": {
      "command": "git push",
      "description": "推送到远程仓库"
    },
    "cp": {
      "command": "claude --port 3000",
      "description": "启动 Claude 服务"
    }
  },
  "workflows": {
    "copilot": {
      "description": "Copilot 账号管理",
      "steps": [
        {
          "id": "select-account",
          "prompt": "选择账号",
          "options": [
            { "name": "账号1", "value": "account1", "next": "select-action" },
            { "name": "账号2", "value": "account2", "next": "select-action" },
            { "name": "账号3", "value": "account3", "next": "select-action-v2" }
          ]
        },
        {
          "id": "select-action",
          "prompt": "选择操作",
          "options": [
            { "name": "查看版本", "command": "copilot --account={{select-account}} --version" },
            { "name": "启动", "command": "copilot --account={{select-account}}" }
          ]
        },
        {
          "id": "select-action-v2",
          "prompt": "账号3专属操作",
          "options": [
            { "name": "特殊模式", "command": "copilot --account={{select-account}} --special" }
          ]
        }
      ]
    },
    "git-flow": {
      "description": "Git 提交流程",
      "steps": [
        {
          "id": "select-add",
          "prompt": "选择添加范围",
          "options": [
            { "name": "全部文件", "value": ".", "next": "select-commit" },
            { "name": "仅 src", "value": "src/", "next": "select-commit" }
          ]
        },
        {
          "id": "select-commit",
          "prompt": "选择提交类型",
          "options": [
            { "name": "功能", "command": "git add {{select-add}} && git commit -m \"feat: update\"" },
            { "name": "修复", "command": "git add {{select-add}} && git commit -m \"fix: update\"" },
            { "name": "仅添加", "command": "git add {{select-add}}" }
          ]
        }
      ]
    }
  }
}
```

### 工作流配置说明

| 字段 | 说明 |
|------|------|
| `steps[]` | 步骤数组，按 `id` 索引 |
| `step.id` | 步骤唯一标识，用于 `next` 跳转和变量引用 |
| `step.prompt` | 该步骤的提示文字 |
| `step.options[]` | 选项列表 |
| `option.name` | 选项显示名称 |
| `option.value` | 选项值，用于变量替换（可选，默认使用 name） |
| `option.next` | 下一步骤的 ID（分支跳转） |
| `option.command` | 最终执行的命令（有此字段表示终点） |
| `{{step-id}}` | 变量模板，替换为对应步骤选择的 value |

## 命令接口

### 运行命令（统一入口）

```bash
fastcli <名称>
```

- 如果是别名：显示完整命令 → 执行
- 如果是工作流：进入交互式步骤选择 → 逐步推进 → 执行最终命令

### 别名管理

```bash
fastcli alias add <name> <command> [-d, --description <desc>]
fastcli alias rm <name>
fastcli alias ls
```

### 工作流管理

```bash
fastcli workflow ls              # 列出所有工作流
fastcli workflow show <name>     # 显示工作流结构（树形展示）
```

> **注意**：工作流结构较复杂，建议直接编辑配置文件进行管理。
> 使用 `fastcli config edit` 打开配置文件进行编辑。

### 配置管理

```bash
fastcli config init    # 初始化配置文件
fastcli config edit    # 用默认编辑器打开配置
fastcli config show    # 显示当前配置
```

## 核心模块

### ConfigManager

负责配置文件的读、写、校验。

```typescript
interface ConfigManager {
  load(): Config;
  save(config: Config): void;
  validate(): ValidationResult;
  getConfigPath(): string;
  ensureConfigExists(): void;
}
```

### Executor

负责执行 shell 命令，处理输入输出。

```typescript
interface Executor {
  run(command: string): Promise<ExecResult>;
  preview(command: string): void;
}
```

### WorkflowRunner

负责工作流的交互式步骤执行。

```typescript
interface WorkflowRunner {
  start(workflow: Workflow): Promise<void>;
}
```

工作流执行流程：
1. 从第一个步骤开始（steps[0]）
2. 显示当前步骤的选项（带编号）
3. 用户通过箭头键或数字选择
4. 记录选择的 value 到上下文（用于变量替换）
5. 如果选项有 `next`：跳转到对应步骤，回到步骤 2
6. 如果选项有 `command`：替换变量，执行命令，工作流结束

### TemplateEngine

负责变量模板的解析和替换。

```typescript
interface TemplateEngine {
  parse(template: string, context: Record<string, string>): string;
}

// 示例
// template: "git add {{select-add}}"
// context: { "select-add": "src/" }
// result: "git add src/"
```

### NameResolver

负责解析用户输入的名称，判断类型。

```typescript
interface NameResolver {
  resolve(name: string): ResolveResult | null;
  isNameAvailable(name: string): boolean;
}

type ResolveResult = 
  | { type: 'alias'; data: Alias }
  | { type: 'workflow'; data: Workflow };
```

## 交互界面设计

### 工作流步骤选择

```
fastcli copilot

┌─ Copilot 账号管理 ─────────────────────┐
│                                        │
│  [步骤 1/2] 选择账号                    │
│                                        │
│  ❯ 1. 账号1                            │
│    2. 账号2                            │
│    3. 账号3                            │
│                                        │
│  [↑↓/数字] 选择  [Enter] 确认  [q] 退出 │
└────────────────────────────────────────┘

→ 选择: 账号2

┌─ Copilot 账号管理 ─────────────────────┐
│                                        │
│  [步骤 2/2] 选择操作                    │
│                                        │
│  ❯ 1. 查看版本                         │
│    2. 启动                             │
│                                        │
│  [↑↓/数字] 选择  [Enter] 确认  [q] 退出 │
└────────────────────────────────────────┘

→ 选择: 查看版本
→ 执行: copilot --account=account2 --version
✓ 执行完成
```

### 执行反馈

```
→ 执行: copilot --account=account2 --version

[命令输出内容...]

✓ 工作流完成
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 配置文件不存在 | 提示运行 `fastcli config init` |
| 别名/工作流不存在 | 友好提示，建议相似名称 |
| 名称冲突 | 拒绝添加，提示名称已被占用 |
| 命令执行失败 | 显示错误信息，工作流结束 |
| 配置格式错误 | 显示具体错误位置 |
| 工作流步骤缺失 | 启动时校验，提示缺失的 step ID |
| 变量未定义 | 执行时提示哪个变量未找到 |
| 用户中途退出 | 按 q 或 Ctrl+C 安全退出，不执行命令 |

## 类型定义

```typescript
interface Config {
  aliases: Record<string, Alias>;
  workflows: Record<string, Workflow>;
}

interface Alias {
  command: string;
  description?: string;
}

interface Workflow {
  description?: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  prompt: string;
  options: WorkflowOption[];
}

interface WorkflowOption {
  name: string;
  value?: string;       // 用于变量替换，默认使用 name
  next?: string;        // 下一步骤 ID（分支跳转）
  command?: string;     // 最终命令（终点）
}

// 运行时上下文
interface WorkflowContext {
  values: Record<string, string>;  // step.id → selected value
}
```

## 构建与发布

### package.json 关键字段

```json
{
  "name": "fastcli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "fastcli": "./dist/index.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 构建命令

```bash
pnpm build      # 构建
pnpm dev        # 开发模式（watch）
pnpm link -g    # 本地全局安装测试
```


## 未来扩展（不在本期范围）

- 命令历史记录
- 命令执行统计
- 导入/导出配置
- Shell 补全脚本

# Copilot 交互式终端工作流设计（2026-03-25 增补）

## 1. 目标

为 fastcli 的交互式终端 workflow 提供通用启动能力，适用于 claude code、opencode、codex、copilot 等同类 CLI，核心体验如下：
- 选择账号或凭据上下文（按配置注入环境变量）
- 选择启动模式（如 new-session 或 resume，具体以目标 CLI 参数为准）
- 在当前 shell 直接进入目标 CLI 的原生交互终端

fastcli 的职责边界是 workflow 编排与环境注入。命令执行阶段采用子进程 I/O 透明透传（stdin/stdout/stderr），不做业务语义包装、不改写输入输出。

## 2. 交互流程与数据流

1. fastcli 读取 workflow、provider 与 credentials 配置，prompt 用户选择账号或凭据上下文
2. fastcli 将步骤选择值视为 credentialId，按 envMapping 把对应凭据字段映射到目标环境变量，并合并到子进程 env
3. prompt 用户选择启动模式（可选），并按 provider.modeArgs 解析为参数片段
4. fastcli 组装最终 command 字符串（provider.command + modeArgs + workflow 上下文变量），并通过 child_process.spawn 启动目标 CLI
5. fastcli 以 stdio='inherit' 透传 stdin/stdout/stderr，用户直接与目标 CLI 交互
6. 目标 CLI 退出后，fastcli 以相同退出码结束

数据流：
- 用户输入 -> fastcli prompt -> workflow/provider 解析 -> env 注入 -> 组装 command -> spawn 子进程（继承 env）-> 用户与目标 CLI 原生交互

## 3. 关键实现要点

- 命令模型统一为 command（字符串），由 workflow/provider 共同决定最终启动参数
- 兼容路径：保留现有 WorkflowOption.command 与 Executor.run(command: string) 契约；provider 模型仅负责产出或补全 command，最终仍走单字符串执行链路
- 命令决策顺序：优先使用 option.command；当 option.command 缺失时回退到 provider.command + modeArgs 组装
- 执行语义沿用现有 Executor 的 shell 执行模型（含转义与跨平台差异处理），避免 provider 层自行拼接平台特化逻辑
- resume/new-session 属于可选模式，不作为核心协议，不同 CLI 可通过 modeArgs 扩展不同参数形态
- 环境变量注入采用可配置 envMapping，不绑定单一变量名（如不固定为 COPILOT_GITHUB_TOKEN）
- 执行前命令预览与透明透传并存：预览仅展示将执行的 command 及非敏感参数；进程启动后保持 stdin/stdout/stderr 原样透传
- 通过 Node.js child_process.spawn 执行外部 CLI，stdio 使用 'inherit' 保证 I/O 透明透传
- fastcli 仅负责流程编排与进程拉起，不对业务语义、提示词或输出内容做二次封装

## 4. 兼容性与扩展性

- 引入 provider 配置层，建议最小字段如下：
  - providerId
  - command
  - modeArgs
  - envMapping
- provider 配置落点：增补到 config 根结构的 providers（例如 providers.<providerId>）
- workflow 与 provider 绑定：在 workflow 增加可选扩展字段 provider（默认使用 workflow.provider，允许 option.provider 覆盖）
- 新增或替换 CLI 时，仅需新增 provider 配置与 workflow 绑定关系，无需改动 fastcli 核心逻辑
- 该模型适用于以命令行为主、支持交互式终端的同类工具

配置扩展示意（增补字段，向后兼容）：

```ts
interface Config {
  aliases: Record<string, Alias>;
  workflows: Record<string, Workflow>;
  credentials?: Record<string, CredentialConfig>; // 新增：凭据池（按 id 引用）
  providers?: Record<string, ProviderConfig>; // 新增
}

interface CredentialConfig {
  label?: string;
  values: Record<string, string>; // 例如 { token: 'xxx', endpoint: 'yyy' }
}

interface Workflow {
  description?: string;
  provider?: string; // 新增：workflow 级绑定
  steps: WorkflowStep[];
}

interface WorkflowOption {
  name: string;
  value?: string;
  next?: string;
  command?: string;
  provider?: string; // 新增：option 级覆盖
}

interface ProviderConfig {
  providerId: string;
  command: string;
  modeArgs?: Record<string, string[]>; // 例如 { resume: ['--resume'], 'new-session': ['--new'] }
  envMapping?: Record<string, string>; // 例如 { COPILOT_GITHUB_TOKEN: 'token' }
}

字段绑定规则（增补约定）：
- workflow 步骤中用于“选择账号/凭据”的 option.value 应为 credentialId
- 运行时按 credentialId 读取 credentials[credentialId].values
- provider.envMapping 采用“目标环境变量名 -> 凭据字段名”映射，缺失字段按第 5 节策略处理
```

## 5. 典型异常与错误处理

- CLI 未安装或不在 PATH：捕获 spawn ENOENT，输出可诊断提示并返回非 0
- 命令参数不兼容：目标 CLI 返回参数错误时，fastcli 原样透传 stderr 与退出码
- credentialId 无效或不存在：启动前立即失败并提示可选 credentialId，不进入子进程执行
- 必要 env 缺失：在启动前做最小校验并提示缺失项；若放行，则由目标 CLI 报错且 fastcli 透传
- 命令预览信息安全：预览阶段不回显敏感 env 实值，仅展示变量名或脱敏占位（如 `***`）
- 凭据存储安全边界：配置层应避免在日志中输出凭据明文；推荐通过文件权限限制读取范围
- 用户 Ctrl+C：将中断信号传递给子进程，并按子进程最终状态退出
- 子进程异常退出：fastcli 透传退出码（或信号语义），保证上层脚本可判定执行结果

---

本设计方案经用户确认后进入实现计划编写环节。
