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
