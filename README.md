# fastcli

> AI CLI Manager：把常用 AI 命令行工具的安装、更新、卸载、运行和自定义工作流统一到一个入口。

[![npm version](https://img.shields.io/npm/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)
[![Node.js](https://img.shields.io/node/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

`fastcli` 是一个面向 AI 工具重度用户和开发者团队的终端效率工具。它解决的问题很直接：当你同时使用 Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、OpenCode、PI Coding Agent，以及未来更多 AI CLI 时，不应该再把安装命令、更新方式、危险模式、临时脚本和团队约定散落在不同 README、shell alias、笔记、群消息和历史命令里。

fastcli 用一个稳定模型整理这些工具：

```text
tool + operation + command chain
```

你可以把每一个 AI CLI 看成一个 `tool`，把安装、卸载、打开文档、登录、构建、发布、全权限启动等动作看成 `operation`，再把每个动作背后的单条或多条 shell 命令保存成可预览、可复用、可迁移的 `command chain`。

一句话概括：**fastcli 不是另一个 AI 编程助手，而是管理所有 AI CLI 助手的入口。**

## 为什么需要 fastcli

AI CLI 正在快速增加，但它们的使用方式并不统一。

一个开发者的机器里可能同时存在这些问题：

- Claude Code 用一个 npm 包安装，Codex 用另一个包名，Gemini、Copilot、OpenCode 又各有自己的启动方式。
- 有的工具支持全权限模式，有的叫 `--yolo`，有的叫 `--dangerously-skip-permissions`，参数名难记，也容易误用。
- 今天在 npm 全局安装，明天又想用 Volta 管版本，切换包管理器后所有命令都要重新查。
- 常用动作分散在 `.zshrc`、团队文档、项目 README、聊天记录和个人笔记里，新机器和新成员很难复刻同样环境。
- 一些工作流不是一条命令，而是多条命令的组合，例如安装后登录、构建后发布、打开文档后启动本地服务。
- 自定义脚本很方便，但缺少统一的列表、预览、确认、错误提示和退出码处理。
- 团队想共享“我们常用哪些 AI CLI、每个工具有哪些动作”，但又不想把用户私有配置和全局工具写死在项目代码里。

fastcli 的目标就是把这些零散动作收束成一个清晰入口：

```bash
fastcli
fastcli list
fastcli info claude
fastcli run claude install
fastcli run codex danger --dry-run
fastcli view
```

它保留命令行的直接、高效和可脚本化，同时提供交互式菜单和本地可视化编辑器，让常用 AI CLI 的管理方式变得统一、可解释、可维护。

## fastcli 解决的核心痛点

| 痛点 | fastcli 的处理方式 |
|------|-------------------|
| AI CLI 太多，命令难记 | 内置主流 AI CLI 元数据，通过 `fastcli list`、`fastcli info`、交互式菜单统一查看和运行。 |
| 安装和更新方式分散 | 内置工具的安装命令由 `packageManager` 自动生成，当前支持 `volta` 和 `npm`。 |
| 全权限启动参数危险且难记 | 为支持的内置工具提供 `danger` operation，执行前打印完整命令，并可用 `--dry-run` 预览。 |
| 常用流程散落在 alias 和笔记里 | 用户工具保存在 `~/.fastcli/tools.json`，每个 operation 都可以配置多条命令链。 |
| 脚本化和人工操作割裂 | `fastcli` 进入交互式菜单，`fastcli run <tool-id> <op>` 可写入脚本或自动化流程。 |
| 配置手写 JSON 容易出错 | 提供 `fastcli add`、`fastcli edit` 和 `fastcli view`，既能交互维护，也能可视化编辑。 |
| 团队协作怕覆盖本地改动 | Web API 在保存配置、编辑和删除已有工具时使用 ETag + `If-Match`，防止覆盖外部已经修改过的内容。 |
| 本地 Web 管理工具有暴露风险 | `fastcli view` 只绑定 `127.0.0.1`，并使用 token 鉴权。 |
| 多语言用户体验割裂 | CLI 和 Web 编辑器统一支持 `en` / `zh-CN`，由 `config.json` 的 `language` 控制。 |

## 项目重点

fastcli 当前重点不是“做一个更复杂的脚本系统”，而是围绕 AI CLI 的日常管理建立一个足够简单、稳定、可迁移的抽象。

### 1. 一个入口管理多个 AI CLI

fastcli 内置常用 AI CLI 工具，包括：

- Claude Code
- OpenAI Codex
- Gemini CLI
- GitHub Copilot
- OpenCode
- PI Coding Agent
- Grok CLI
- Cursor CLI
- Speculo

这些内置工具不会写入用户的 `tools.json`，也不会要求用户手动维护 npm 包名。fastcli 在运行时根据全局配置生成安装和卸载命令。你只需要记住统一入口：

```bash
fastcli run claude install
fastcli run codex install
fastcli run gemini install
```

### 2. 用 operation 表达常用动作

fastcli 不把工具操作限制成固定的 `install`、`uninstall`。内置工具提供标准动作，自定义工具可以添加任意 operation：

```text
install
update
uninstall
danger
login
docs
serve
build
deploy
release
```

这让 fastcli 不只是“AI CLI 安装器”，也可以作为个人或团队的命令工作流目录。

### 3. 命令链，而不是只能执行单条命令

现实中的工作流经常不是一条命令。例如：

```json
{
  "commands": {
    "deploy": [
      "pnpm build",
      "pnpm test",
      "pnpm publish"
    ]
  }
}
```

fastcli 的 `commands` 每个 operation 都是 `string[]`。即使只有一条命令，也保持数组结构。这个设计避免了配置格式在单命令和多命令之间摇摆，也让未来扩展更稳定。

### 4. 交互式菜单和脚本化入口并存

有些时候你只想打开终端选一个工具执行：

```bash
fastcli
```

有些时候你需要把命令写进脚本、README 或 CI：

```bash
fastcli run claude install --dry-run
fastcli run aider docs
```

fastcli 同时覆盖这两种使用方式。交互式入口适合探索和日常操作，显式命令适合自动化和可复制说明。

### 5. 本地可视化编辑器

当自定义工具和 operation 变多之后，纯手写 JSON 会变得低效。`fastcli view` 提供本地浏览器编辑体验，用来维护工具列表、operation 和命令链：

```bash
fastcli view
```

它的边界很明确：

- 只绑定 `127.0.0.1`。
- URL 携带 token，也支持 `Authorization: Bearer <token>`。
- 保存配置、编辑和删除已有工具时使用 ETag + `If-Match`。
- 可以预览 operation 解析后的命令，不会在 Web UI 里直接执行命令。

### 6. 安全执行体验

fastcli 执行命令前会打印完整命令链。你可以先 dry-run：

```bash
fastcli run claude danger --dry-run
```

默认配置里 `confirmBeforeRun` 为 `true`，也就是执行前会二次确认。命令链中任一步失败时，fastcli 会报告失败步骤，并透传子进程退出码，方便脚本和上层自动化判断结果。

## 适合谁使用

fastcli 特别适合这些场景：

| 人群 / 场景 | 价值 |
|-------------|------|
| 同时使用多个 AI CLI 的开发者 | 不再记忆每个工具的包名、安装命令和特殊启动参数。 |
| 经常换机器或重装环境的人 | 用统一入口恢复常用 AI CLI 和自定义工作流。 |
| 需要管理团队工具约定的技术负责人 | 把“推荐工具”和“常用动作”抽象成清晰的 tool / operation 模型。 |
| AI 编程工作流重度用户 | 把登录、文档、启动、构建、发布等动作沉淀为可运行的命令链。 |
| 喜欢命令行但不想手写所有 JSON 的用户 | CLI、交互式菜单、本地 Web 编辑器三种方式都可用。 |
| 需要脚本化的自动化场景 | `fastcli run <tool-id> <op>` 结构稳定，适合写进脚本。 |

## 典型使用场景

### 场景一：统一安装 AI CLI

你不需要分别查每个工具的 npm 包名：

```bash
fastcli run claude install
fastcli run codex install
fastcli run gemini install
fastcli run copilot install
```

当 `packageManager` 为 `volta` 时，内置工具会生成类似命令：

```bash
volta install @anthropic-ai/claude-code@latest
```

当 `packageManager` 为 `npm` 时，会生成：

```bash
npm install -g @anthropic-ai/claude-code
```

### 场景二：预览危险模式命令

一些 AI CLI 的全权限模式参数很长，也不应该凭记忆直接执行。你可以先预览：

```bash
fastcli run claude danger --dry-run
fastcli run codex danger --dry-run
fastcli run gemini danger --dry-run
```

支持 `danger` 的内置工具会展开各自真实命令。执行前仍会展示命令链，并受 `confirmBeforeRun` 控制。

### 场景三：把自定义工具加入统一入口

比如你经常使用 Aider：

```bash
fastcli add
```

可以添加这些 operation：

```text
install  -> pip install aider-chat
update   -> pip install --upgrade aider-chat
docs     -> open https://aider.chat
```

之后运行：

```bash
fastcli run aider install
fastcli run aider docs
```

### 场景四：沉淀项目级常用流程

你可以把一个常用流程做成多命令 operation：

```json
{
  "commands": {
    "release": [
      "pnpm build",
      "pnpm test",
      "pnpm publish --access public"
    ]
  }
}
```

之后只需要：

```bash
fastcli run my-package release
```

这类能力适合个人自动化，也适合把团队约定转化为可执行入口。

### 场景五：用浏览器维护工具库

当你已经配置了很多自定义工具，用浏览器维护会更直观：

```bash
fastcli view
```

你可以搜索工具、编辑描述和标签、增删 operation、维护多条命令链，并预览解析后的命令。

## 安装

要求：

- Node.js >= 18
- npm 或 Volta

使用 npm 安装：

```bash
npm install -g @namewta/fastcli
```

使用 Volta 安装：

```bash
volta install @namewta/fastcli
```

安装完成后，全局命令为：

```bash
fastcli
```

## 快速开始

第一次运行：

```bash
fastcli
```

fastcli 会引导你选择包管理器，并在 `~/.fastcli/` 下创建配置文件。完成后进入交互式菜单：

```text
fastcli
├── AI 编程工具 / AI Coding Tools
│   ├── Claude Code
│   ├── OpenAI Codex
│   ├── Gemini CLI
│   ├── GitHub Copilot
│   ├── OpenCode
│   ├── PI Coding Agent
│   ├── Grok CLI
│   └── Cursor CLI
├── 通用工具 / General Tools
│   ├── OpenWiki
│   └── Speculo
├── 自定义 / Custom
└── 可视化配置 / Visual Config
```

常用命令：

```bash
# 查看所有工具
fastcli list

# 查看某个工具详情
fastcli info claude

# 安装 Claude Code
fastcli run claude install

# 只预览命令，不执行
fastcli run claude install --dry-run

# 打开本地可视化编辑器
fastcli view
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `fastcli` | 进入交互式菜单。 |
| `fastcli run <tool-id> <op>` | 执行某工具的某个 operation。 |
| `fastcli list [--source=builtin\|user] [--tag=<tag>] [--category=coding\|tool]` | 列出工具，可按来源、标签和分类过滤。 |
| `fastcli info <tool-id>` | 查看工具详情、标签、来源和命令链。 |
| `fastcli add` | 交互式添加自定义工具。 |
| `fastcli edit <tool-id>` | 编辑自定义工具；内置工具只读。 |
| `fastcli remove <tool-id> [--yes]` | 删除自定义工具；内置工具只读。 |
| `fastcli view [--port=<N>] [--no-open]` | 启动本地可视化编辑器。 |
| `fastcli config` | 打印当前全局配置。 |
| `fastcli config edit` | 用编辑器打开 `config.json`。 |

### `fastcli run`

```bash
fastcli run <tool-id> <op>
fastcli run <tool-id> <op> --dry-run
fastcli run <tool-id> <op> --version=<version>
```

示例：

```bash
fastcli run claude install
fastcli run codex danger --dry-run
fastcli run aider install --version=0.50.0
```

执行流程：

1. 加载注册中心，合并内置工具和用户工具。
2. 按 tool id 查找工具；找不到时给出 fuzzy 建议。
3. 解析 operation；如果未配置，列出该工具已有 operation。
4. 替换 `{{name}}` 和 `{{version}}`。
5. 打印完整命令链。
6. `--dry-run` 直接结束，不执行命令。
7. 如果 `confirmBeforeRun: true`，执行前二次确认。
8. 顺序执行命令链，失败时报告失败步骤并透传退出码。

### `fastcli list`

```bash
fastcli list
fastcli list --source=builtin
fastcli list --source=user
fastcli list --tag=coding
fastcli list --category=coding
```

`--source` 支持 `builtin` / `user`。`--tag` 用于筛选包含某个标签的工具。`--category` 支持 `coding`（AI 编程工具）/ `tool`（通用开发工具）。

### `fastcli info`

```bash
fastcli info claude
```

输出工具的 `id`、`name`、`description`、`source`、`tags`，并列出每个 operation 的命令链。

### `fastcli add`

```bash
fastcli add
```

按提示填写：

- 工具名称
- 描述
- 一个或多个 operation
- 每个 operation 下的一条或多条命令

工具 ID 会从名称自动生成，并自动避开冲突。工具名称不可与已有内置或自定义工具重复。至少需要配置一个 operation。

### `fastcli edit` / `fastcli remove`

```bash
fastcli edit aider
fastcli remove aider
fastcli remove aider --yes
```

这两个命令只允许修改自定义工具。内置工具来自源码，不能被编辑或删除。

如果确实要覆盖同 id 的内置工具，可以在 `~/.fastcli/tools.json` 中定义用户工具。运行时注册中心会让用户工具覆盖内置工具，并打印 warn。

### `fastcli view`

```bash
fastcli view
fastcli view --port=3001
fastcli view --no-open
```

可视化编辑器适合批量维护自定义工具、operation 和命令链：

- 默认从 `3000` 开始寻找可用端口，最多尝试到 `3100`。
- 只绑定 `127.0.0.1`。
- 使用 token 鉴权。
- 保存配置、编辑和删除已有工具时使用 ETag + `If-Match` 防止覆盖外部改动。
- 支持预览 operation 解析后的命令。

## 内置工具

fastcli 当前内置 11 个工具。内置条目只在源码中定义，不写入用户的 `tools.json`。

| ID | 名称 | 安装方式 | 分类 | 标签 |
|----|------|----------|------|------|
| `claude` | Claude Code | npm (`@anthropic-ai/claude-code`) | coding | `anthropic`, `coding` |
| `codex` | OpenAI Codex | npm (`@openai/codex`) | coding | `openai`, `coding` |
| `gemini` | Gemini CLI | npm (`@google/gemini-cli`) | coding | `google`, `coding` |
| `copilot` | GitHub Copilot | npm (`@github/copilot`) | coding | `github`, `coding` |
| `opencode` | OpenCode | npm (`opencode-ai`) | coding | `opensource`, `coding` |
| `openwiki` | OpenWiki | npm (`openwiki`) | tool | `opensource`, `tool` |
| `pi-coding-agent` | PI Coding Agent | npm (`@earendil-works/pi-coding-agent`) | coding | `pi`, `coding` |
| `codebuddy` | CodeBuddy Code | npm (`@tencent-ai/codebuddy-code`) | coding | `tencent`, `coding` |
| `grok` | Grok CLI | curl 脚本 | coding | `xai`, `coding` |
| `cursor` | Cursor CLI | curl 脚本 | coding | `cursor`, `coding` |
| `speculo` | Speculo | npm (`@namewta/speculo`) | tool | `spec`, `tool` |

内置工具默认提供：

- `install`
- `uninstall`
- `danger`，仅支持全权限快捷启动的工具提供

当 `packageManager` 为 `volta` 时，`claude install` 展开为：

```bash
volta install @anthropic-ai/claude-code@latest
```

当 `packageManager` 为 `npm` 时，`claude install` 展开为：

```bash
npm install -g @anthropic-ai/claude-code
```

支持全权限快捷启动的内置工具示例：

```bash
fastcli run claude danger --dry-run
fastcli run codex danger --dry-run
fastcli run gemini danger --dry-run
fastcli run copilot danger --dry-run
fastcli run opencode danger --dry-run
```

## 自定义工具与工作流

自定义工具保存在 `~/.fastcli/tools.json`，结构透明，便于备份和迁移。

示例：

```json
{
  "version": "2",
  "tools": [
    {
      "id": "aider",
      "name": "Aider",
      "description": "AI pair programming in terminal",
      "tags": ["python", "coding"],
      "commands": {
        "install": ["pip install aider-chat"],
        "update": ["pip install --upgrade aider-chat"],
        "uninstall": ["pip uninstall aider-chat"],
        "docs": ["open https://aider.chat"],
        "deploy": ["npm run build", "npm run deploy"]
      },
      "source": "user"
    }
  ]
}
```

运行：

```bash
fastcli run aider install
fastcli run aider docs
fastcli run aider deploy --dry-run
```

### 变量替换

命令字符串支持两个变量：

- `{{name}}`：工具显示名，即 `tool.name`。
- `{{version}}`：运行时输入的版本号。

示例：

```json
{
  "commands": {
    "print-version": ["echo \"{{name}} -> {{version}}\""]
  }
}
```

运行：

```bash
fastcli run my-tool print-version --version=1.2.3
```

`{{version}}` 的处理规则：

- TTY + 未提供 `--version`：交互式询问版本号。
- 非 TTY + 未提供：报错退出。
- 已提供 `--version=<v>`：直接替换。

未知占位符会保留字面量，方便你把 fastcli 嵌入更复杂的模板系统。

## 配置文件

fastcli 使用 `~/.fastcli/` 作为默认配置目录。

### `~/.fastcli/config.json`

```json
{
  "version": "2",
  "packageManager": "volta",
  "editor": "",
  "confirmBeforeRun": true,
  "firstRun": false,
  "language": "en"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | `"2"` | schema 版本。 |
| `packageManager` | `"volta" \| "npm"` | 决定内置工具的安装和卸载命令模板。 |
| `editor` | `string` | `config edit` 优先使用的编辑器；为空时回退到 `$EDITOR`，再回退到 `vi`。 |
| `confirmBeforeRun` | `boolean` | 执行命令链前是否二次确认。 |
| `firstRun` | `boolean` | 首次运行引导完成后置为 `false`。 |
| `language` | `"en" \| "zh-CN"` | CLI 与 Web 的界面语言。 |

### `~/.fastcli/tools.json`

```json
{
  "version": "2",
  "tools": []
}
```

约束：

- `version` 固定为 `"2"`。
- `commands` 的 operation 值必须是 `string[]`。
- 内置工具不会写入此文件。
- POSIX 平台上配置文件以 `0o600` 权限写入。
- 配置目录以 `0o700` 权限创建。

`FASTCLI_HOME` 仅用于测试隔离和自动化场景，不建议作为日常配置方式。

## 安全与可靠性设计

fastcli 的定位是执行本地命令，因此安全边界必须清晰。

### 命令执行

- 执行前打印完整命令链。
- 支持 `--dry-run`。
- 默认执行前二次确认。
- 命令链按顺序执行。
- 任一步失败都会停止并报告失败步骤。
- 子进程退出码会透传给 fastcli。

### 配置写入

- `config.json` 和 `tools.json` 写入走原子写入流程。
- POSIX 平台文件权限为 `0o600`。
- 旧 schema 会迁移到 schema `2`。
- 配置 JSON 损坏时拒绝覆盖原文件，并提示用户修复。
- 配置版本过新时拒绝启动，并提示升级 fastcli。

### 本地 Web 编辑器

- 只绑定 `127.0.0.1`。
- 只允许本地回环访问。
- 使用 token 鉴权。
- Web API 在保存配置、编辑和删除已有工具时使用 ETag + `If-Match`。
- 预览命令不等于执行命令。

## 错误处理与排错

| 场景 | 行为 |
|------|------|
| 找不到工具 | 输出 `Tool "X" not found` / `找不到工具 "X"`，附 fuzzy 建议。 |
| operation 未配置 | 输出该工具已配置的 operation 列表。 |
| 配置 JSON 损坏 | 拒绝覆盖原文件，并提示运行 `fastcli config edit` 修复。 |
| 配置版本过新 | 拒绝启动，并提示升级 fastcli。 |
| 旧 schema | `config.json` / `tools.json` 会自动迁移到 schema `2`，必要时备份旧文件。 |
| 命令不存在 | 输出 `Command not found: <bin>` / `命令未找到：<bin>`，退出码为 `127`。 |
| Ctrl+C / Esc | 交互式流程以退出码 `130` 退出，不留下半写入配置。 |
| 命令链失败 | 报告失败发生在第几步，并透传子进程退出码。 |

## 和普通 alias / shell 脚本有什么区别

shell alias 很适合个人临时快捷方式，但当 AI CLI 变多、动作变复杂之后，alias 会出现几个问题：

- 很难统一展示“我有哪些工具和动作”。
- 很难给每个工具附带描述、标签和来源。
- 很难把单命令和多命令工作流整理成同一种结构。
- 很难做执行前预览和统一确认。
- 很难提供本地可视化编辑体验。
- 很难让新机器、新用户、新团队成员复刻同样的工具目录。

fastcli 不替代 shell，而是把那些已经变成稳定习惯的命令沉淀成结构化工具库。临时命令仍然留在终端里，长期复用的 AI CLI 工作流交给 fastcli。

## 推广摘要

你可以在不同平台介绍 fastcli 时直接复用下面内容。

### 一句话版本

fastcli 是一个 AI CLI Manager，用一个命令统一管理 Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、OpenCode 等常用 AI 命令行工具的安装、卸载、运行和自定义工作流。

### 短介绍版本

如果你同时使用多个 AI CLI，fastcli 可以帮你把分散的安装命令、危险模式参数、自定义脚本和常用工作流整理成一个统一入口。它支持交互式菜单、脚本化命令、本地可视化编辑器、命令链、dry-run、执行前确认、双语界面和透明 JSON 配置。你只需要记住 `fastcli`，剩下的工具和动作都可以用 `tool + operation + command chain` 管起来。

### 长介绍版本

AI CLI 工具越来越多，但每个工具的包名、安装方式、更新命令、全权限启动参数和常用工作流都不一样。fastcli 想解决的正是这个碎片化问题：它把常用 AI CLI 抽象成工具，把安装、卸载、文档、登录、构建、发布、危险模式等动作抽象成 operation，再用命令链保存每个动作背后的真实 shell 命令。

这样一来，你既可以通过 `fastcli` 进入交互式菜单，也可以用 `fastcli run <tool-id> <op>` 写进脚本；既可以使用内置的 Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、OpenCode、PI Coding Agent，也可以添加任意自定义工具；既可以手写透明 JSON 配置，也可以用 `fastcli view` 在本地浏览器里维护工具库。

fastcli 的价值不是替代某个 AI CLI，而是让所有 AI CLI 的管理方式更统一、更可预览、更容易迁移，也更适合沉淀个人和团队的长期工作流。

## 开发

```bash
git clone https://github.com/namewta/fastcli.git
cd fastcli
pnpm install
pnpm build
pnpm test
pnpm dev
pnpm link
pnpm unlink
```

| 命令 | 说明 |
|------|------|
| `pnpm build` | 使用 tsup 构建 CLI，并构建 `packages/web`。 |
| `pnpm test` | 运行 Vitest 测试套件。 |
| `pnpm test:watch` | 以 watch 模式运行 Vitest。 |
| `pnpm dev` | 监听构建 CLI。 |
| `pnpm link` | 构建后链接到全局，便于本地调试。 |
| `pnpm unlink` | 取消全局链接。 |

测试隔离使用 `os.tmpdir()` + 唯一目录 + `FASTCLI_HOME`，不会读写真实的 `~/.fastcli/`。

## 仓库结构

```text
src/cli          CLI 入口、参数解析和交互流程
src/core         工具注册、命令解析、执行器和模板逻辑
src/config       config.json / tools.json 的读写、迁移与校验
src/web-server   本地 Web API 服务
src/builtin      内置工具模板
src/utils        fuzzy 建议、slug 生成等通用工具
packages/web     Vite + React 构建的浏览器编辑器前端
tests            Vitest 单元测试与集成测试
.github/workflows CI 与 tag 发布流水线
.agents/skills   AI 代理技能与发布编排
```

## 发布

发布由 tag `v*` 驱动：

1. GitHub Actions checkout。
2. 安装 pnpm 与 Node.js 22。
3. `pnpm install --frozen-lockfile`。
4. `pnpm build`。
5. `pnpm test`。
6. `pnpm publish --access public --no-git-checks`。
7. 创建 GitHub Release。

## 相关文档

- [CHANGELOG.md](CHANGELOG.md)：版本变更记录。
- [AGENTS.md](AGENTS.md)：AI 代理协作手册。
- [CLAUDE.md](CLAUDE.md)：Claude Code 仓库导航与设计决策参考。
- [.agents/skills/add-builtin-tool/SKILL.md](.agents/skills/add-builtin-tool/SKILL.md)：向 fastcli 添加新内置工具的登记流程。
- [speculo/](speculo/)：基于 Speculo 的 AI 工作流编排与文档同步。

## License

MIT © namewta
