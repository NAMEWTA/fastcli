# fastcli

> AI CLI Manager：用一个命令统一管理常用 AI 命令行工具的安装、升级、卸载、运行和自定义工作流。

[![npm version](https://img.shields.io/npm/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)
[![Node.js](https://img.shields.io/node/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

`fastcli` 面向同时使用 Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、OpenCode、PI Coding Agent 等 AI CLI 的开发者。它把分散的安装、升级、卸载、运行和自定义命令统一成一个稳定模型：`tool + operation + command chain`。

不用记住每个工具的 npm 包名、安装方式、更新命令和临时脚本，也不用在多个 README、shell alias、笔记和历史命令之间来回查找。你可以在交互式菜单里选择工具和操作，也可以用 `fastcli run <tool-id> <op>` 写进自动化脚本。

## 为什么选择 fastcli

| 优势 | 说明 |
|------|------|
| 一个入口管理多个 AI CLI | 内置主流 AI CLI 的 `install`（安装/更新）/ `uninstall` / `danger`，并可继续扩展任意自定义工具。 |
| 交互式与脚本化兼具 | 直接运行 `fastcli` 进入菜单；在 CI、本地脚本或 alias 中使用 `fastcli run` 精确执行。 |
| 支持命令链 | 一个 operation 可以包含多条 shell 命令，适合把安装、登录、构建、发布、打开文档等步骤封装成工作流。 |
| 安全可预览 | 执行前打印完整命令，支持 `--dry-run`，默认二次确认；子进程退出码会透传。 |
| 包管理器模板 | 内置工具命令按 `packageManager` 自动生成，支持 `volta` 和 `npm`。 |
| 本地可视化编辑器 | `fastcli view` 提供浏览器编辑体验，仅绑定 `127.0.0.1`，使用 token 鉴权和 ETag 冲突保护。 |
| 双语界面 | CLI 与 Web 统一支持 `en` / `zh-CN`，由 `config.json` 的 `language` 控制。 |
| JSON 可迁移 | 配置文件简单透明，schema 固定为 `2`，旧格式会自动迁移或给出明确错误。 |

## 安装

```bash
# 使用 npm
npm install -g @namewta/fastcli

# 或使用 volta，推荐用于锁定全局工具版本
volta install @namewta/fastcli
```

要求 Node.js >= 18。安装完成后，命令行入口为：

```bash
fastcli
```

## 快速开始

第一次运行会引导选择包管理器，并在 `~/.fastcli/` 下创建配置文件：

```bash
fastcli
```

之后会进入主菜单：

```text
fastcli
└── Choose a section / 选择分类
    ├── System builtin / 系统内置
    │   ├── Claude Code
    │   ├── OpenAI Codex
    │   ├── Gemini CLI
    │   ├── GitHub Copilot
    │   ├── OpenCode
    │   └── PI Coding Agent
    ├── Custom / 自定义
    │   └── ...
    └── Visual config / 可视化配置
```

常用方式：

```bash
# 查看所有工具
fastcli list

# 安装 Claude Code
fastcli run claude install

# 只预览将要执行的命令
fastcli run claude install --dry-run

# 打开本地可视化编辑器
fastcli view
```

## 命令参考

| 命令 | 作用 |
|------|------|
| `fastcli` | 进入交互式菜单。 |
| `fastcli run <tool-id> <op>` | 执行某工具的某个 operation。 |
| `fastcli list` | 列出内置工具和自定义工具。 |
| `fastcli info <tool-id>` | 查看工具详情、标签、来源和命令链。 |
| `fastcli add` | 交互式添加自定义工具。 |
| `fastcli edit <tool-id>` | 编辑自定义工具，仅允许 `source: "user"`。 |
| `fastcli remove <tool-id>` | 删除自定义工具，仅允许 `source: "user"`。 |
| `fastcli view` | 启动本地可视化编辑器。 |
| `fastcli config` | 打印当前 `config.json`。 |
| `fastcli config edit` | 用编辑器打开 `config.json`。 |

### `fastcli run`

```bash
# 通过当前 packageManager 安装 Claude Code
fastcli run claude install

# 仅打印命令，不执行
fastcli run claude install --dry-run

# 透传 {{version}} 占位符
fastcli run aider install --version=0.50.0
```

执行流程：

1. 加载注册中心，按 tool id 查找工具；找不到时给出 fuzzy 建议。
2. 解析 operation；如果未配置，列出可用 operation 后退出。
3. 替换 `{{name}}` 和 `{{version}}`；非 TTY 缺少必需 `--version` 时直接报错。
4. 打印完整命令链；`--dry-run` 到这里结束。
5. 如果 `confirmBeforeRun: true`，执行前二次确认。
6. 顺序执行命令链，失败时报告失败步骤并透传退出码。

### `fastcli list`

```bash
fastcli list
fastcli list --source=builtin
fastcli list --source=user
fastcli list --tag=coding
```

`--source` 支持 `builtin` / `user`，`--tag` 用于筛选包含某个标签的工具。

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

工具 ID 会从名称自动生成并自动避开冲突，无需手动填写；工具名称不可与已有内置或自定义工具重复。至少要配置一个 operation。

### `fastcli edit` / `fastcli remove`

```bash
fastcli edit aider
fastcli remove aider
fastcli remove aider --yes
```

这两个命令只允许修改自定义工具。内置工具来自源码，不能被编辑或删除。如果确实要覆盖内置工具，可以在 `~/.fastcli/tools.json` 中定义同 id 的用户工具，运行时注册中心会让用户工具覆盖内置工具并打印警告。

### `fastcli view`

```bash
fastcli view
fastcli view --port=3001
fastcli view --no-open
```

可视化编辑器适合批量维护自定义工具、operation 和命令链：

- 默认从 `3000` 开始寻找可用端口，最多尝试到 `3100`。
- 只绑定 `127.0.0.1`，拒绝非本地回环访问。
- URL 内携带一次性 token，也支持 `Authorization: Bearer <token>`。
- 写入 `tools.json` / `config.json` 时使用 ETag + `If-Match` 防止覆盖外部改动。
- 支持预览 operation 解析后的命令，不会直接执行。

## 配置文件

fastcli 使用 `~/.fastcli/` 作为默认配置目录。测试或自动化场景可通过 `FASTCLI_HOME` 指向临时目录。

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
| `version` | `"2"` | schema 版本，不要手动改为其他值。 |
| `packageManager` | `"volta" \| "npm"` | 决定内置工具的安装、升级、卸载命令模板。 |
| `editor` | `string` | `config edit` 优先使用的编辑器；为空时回退到 `$EDITOR`，再回退到 `vi`。 |
| `confirmBeforeRun` | `boolean` | 执行命令链前是否二次确认。 |
| `firstRun` | `boolean` | 首次运行引导完成后置为 `false`。 |
| `language` | `"en" \| "zh-CN"` | CLI 与 Web 的界面语言。 |

### `~/.fastcli/tools.json`

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

`commands` 中每个 operation 都是 `string[]`，即使只有一条命令也使用数组。POSIX 平台上配置文件会以 `0o600` 权限写入，配置目录会以 `0o700` 创建。

## 内置工具

fastcli 当前内置 6 个 AI CLI 工具。内置条目只在源码中定义，不写入用户的 `tools.json`。

| ID | 名称 | npm 包名 | 标签 |
|----|------|----------|------|
| `claude` | Claude Code | `@anthropic-ai/claude-code` | `anthropic`, `coding` |
| `codex` | OpenAI Codex | `@openai/codex` | `openai`, `coding` |
| `gemini` | Gemini CLI | `@google/gemini-cli` | `google`, `coding` |
| `copilot` | GitHub Copilot | `@github/copilot` | `github`, `coding` |
| `opencode` | OpenCode | `opencode` | `opensource`, `coding` |
| `pi-coding-agent` | PI Coding Agent | `@earendil-works/pi-coding-agent` | `pi`, `coding` |

当 `packageManager` 为 `volta` 时，`claude install` 展开为：

```bash
volta install @anthropic-ai/claude-code@latest
```

当 `packageManager` 为 `npm` 时，`claude install` 展开为：

```bash
npm install -g @anthropic-ai/claude-code
```

支持全权限快捷启动的内置工具会额外提供 `danger` operation，例如：

```bash
fastcli run claude danger --dry-run
claude --dangerously-skip-permissions
```

## 自定义工作流示例

添加一个 `aider` 工具：

```bash
fastcli add
```

填写内容示例：

- 工具名称：`Aider`
- 工具 ID：无需填写，自动生成 `aider`
- 描述：`AI pair programming in terminal`
- operation：`install`
  - 命令：`pip install aider-chat`
- operation：`docs`
  - 命令：`open https://aider.chat`

之后即可运行：

```bash
fastcli run aider install
fastcli run aider docs
```

### 变量替换

命令字符串支持两个变量：

- `{{name}}`：工具显示名，即 `tool.name`
- `{{version}}`：运行时输入的版本号

未知占位符会保留字面量，方便你把 fastcli 嵌入更复杂的模板系统。

`{{version}}` 的处理规则：

- TTY + 未提供 `--version`：交互式询问版本号。
- 非 TTY + 未提供：报错退出。
- 已提供 `--version=<v>`：直接替换。

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

## 性能

fastcli 的常见路径保持轻量：

- 冷启动到 TUI 主菜单首次绘制通常低于 200 ms，取决于机器和磁盘状态。
- `node dist/index.js list` 在 macOS Apple Silicon SSD 上约 30-40 ms。
- 配置读取是按需加载，Web 写入通过队列串行化，避免并发写导致文件损坏。

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

测试隔离：用例通过 `os.tmpdir()` + 唯一目录 + `FASTCLI_HOME` 隔离，不会读写真实的 `~/.fastcli/`。

## 仓库结构

```text
src/cli          CLI 入口、参数解析和交互流程
src/core         工具注册、命令解析、执行器和模板逻辑
src/config       config.json / tools.json 的读写、迁移与校验
src/web-server   本地 Web API 服务
src/builtin      内置工具模板
packages/web     Vite 构建的浏览器编辑器前端
tests            Vitest 单元测试与集成测试
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

## 与 PRD 的差异

实现刻意保留了两个历史兼容点：

- bin 名为 `fastcli`，不是早期 PRD 中的 `aicli`。
- 配置目录为 `~/.fastcli/`，不是早期 PRD 中的 `~/.config/aicli/`。

如果以后准备改名，需要同步更新 `package.json.bin`、文档、默认配置目录和迁移逻辑。

## 相关文档

- [CHANGELOG.md](CHANGELOG.md)：版本变更记录。
- [AGENTS.md](AGENTS.md)：AI 代理协作手册。
- [.agents/skills/docs-sync/SKILL.md](.agents/skills/docs-sync/SKILL.md)：基于 git diff 的文档同步技能。
- [.agents/skills/npm-cicd-release/SKILL.md](.agents/skills/npm-cicd-release/SKILL.md)：commit / docs-sync / release / tag 编排技能。

## License

MIT © namewta
