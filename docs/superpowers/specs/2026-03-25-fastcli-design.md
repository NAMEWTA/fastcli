# FastCLI 设计规格说明

## 概述

FastCLI 是一个全局安装的 npm CLI 工具，用于简化终端命令的使用。它提供两个核心功能：

1. **命令别名** - 将复杂的终端命令简化为短指令
2. **交互式命令组** - 配置一组相关命令，通过交互界面循环选择执行

## 目标用户

- 频繁使用终端的开发者
- 需要记忆大量命令参数的用户
- 希望提高命令行效率的用户

## 核心需求

- 主命令名称：`fastcli`
- 统一入口：`fastcli <名称>` 自动识别是别名还是命令组
- 名称唯一性：别名和命令组共用命名空间，不允许重名
- 命令预览：执行前显示完整命令
- 工作流模式：命令组执行后返回选择界面，支持连续操作

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
│   │   ├── run.ts              # 运行别名/命令组（默认命令）
│   │   ├── alias/              # 别名管理
│   │   │   ├── add.ts
│   │   │   ├── remove.ts
│   │   │   └── list.ts
│   │   ├── group/              # 命令组管理
│   │   │   ├── add.ts
│   │   │   ├── remove.ts
│   │   │   └── list.ts
│   │   └── config/             # 配置管理
│   │       ├── init.ts
│   │       ├── edit.ts
│   │       └── show.ts
│   ├── core/
│   │   ├── config-manager.ts   # 配置读写
│   │   ├── executor.ts         # 命令执行器
│   │   ├── interactive-runner.ts # 交互式选择器
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
  "groups": {
    "git-flow": {
      "description": "Git 工作流命令",
      "commands": [
        { "name": "add all", "command": "git add ." },
        { "name": "add src", "command": "git add src/" },
        { "name": "commit", "command": "git commit -m \"update\"" },
        { "name": "push", "command": "git push" }
      ]
    }
  }
}
```

## 命令接口

### 运行命令（统一入口）

```bash
fastcli <名称>
```

- 如果是别名：显示完整命令 → 执行
- 如果是命令组：进入交互选择界面 → 循环执行

### 别名管理

```bash
fastcli alias add <name> <command> [-d, --description <desc>]
fastcli alias rm <name>
fastcli alias ls
```

### 命令组管理

```bash
fastcli group add <groupName> <cmdName> <command> [-d, --description <desc>]
fastcli group rm <groupName> [cmdName]  # 省略 cmdName 则删除整个组
fastcli group ls [groupName]            # 省略则列出所有组
```

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

### InteractiveRunner

负责命令组的交互式循环选择。

```typescript
interface InteractiveRunner {
  start(group: CommandGroup): Promise<void>;
}
```

交互流程：
1. 显示命令组中的所有命令（带编号）
2. 用户通过箭头键或数字选择
3. 执行选中的命令
4. 显示执行结果
5. 返回步骤 1（直到用户按 q 或 Ctrl+C 退出）

### NameResolver

负责解析用户输入的名称，判断类型。

```typescript
interface NameResolver {
  resolve(name: string): ResolveResult | null;
  isNameAvailable(name: string): boolean;
}

type ResolveResult = 
  | { type: 'alias'; data: Alias }
  | { type: 'group'; data: CommandGroup };
```

## 交互界面设计

### 命令组选择界面

```
┌─────────────────────────────────────────┐
│  Git 工作流命令                          │
├─────────────────────────────────────────┤
│ ❯ 1. add all     → git add .            │
│   2. add src     → git add src/         │
│   3. commit      → git commit -m "..."  │
│   4. push        → git push             │
├─────────────────────────────────────────┤
│  [↑↓/数字] 选择  [Enter] 执行  [q] 退出  │
└─────────────────────────────────────────┘
```

### 执行反馈

```
→ 执行: git add .
✓ 执行完成

? 继续选择命令:
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 配置文件不存在 | 提示运行 `fastcli config init` |
| 别名/命令组不存在 | 友好提示，建议相似名称 |
| 名称冲突 | 拒绝添加，提示名称已被占用 |
| 命令执行失败 | 显示错误，不中断交互循环 |
| 配置格式错误 | 显示具体错误位置 |

## 类型定义

```typescript
interface Config {
  aliases: Record<string, Alias>;
  groups: Record<string, CommandGroup>;
}

interface Alias {
  command: string;
  description?: string;
}

interface CommandGroup {
  description?: string;
  commands: GroupCommand[];
}

interface GroupCommand {
  name: string;
  command: string;
  description?: string;
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
