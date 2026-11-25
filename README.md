# fastcli

[![npm version](https://img.shields.io/npm/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)

fastcli 在当前项目目录启动 Claude Code、Codex、Gemini CLI、Grok Build、OpenCode 或 Pi，省去记忆各工具的 Yolo 参数和 npm 包名。用同一个菜单管理 AI CLI，也可以保存、搜索和批量运行常用终端命令。

## 安装与上手

需要 **Node.js ≥22.19.0**，支持 Windows、macOS 和 Linux。目标 AI CLI 的登录、组织策略和平台要求由各工具处理。

```bash
npm install -g @namewta/fastcli
fastcli --help
fastcli install codex
fastcli codex
```

已经安装所需 AI CLI 时，直接在项目目录运行 `fastcli <工具 ID>`。运行 `fastcli` 打开交互菜单。

## 启动 AI CLI

快捷启动会加入工具的 Yolo 参数。按工具实现，这些模式允许执行工具操作而无需逐次审批，Grok 和 Codex 的快捷入口也会关闭各自的沙箱。

| 工具 ID | 启动命令 | npm 包 |
| --- | --- | --- |
| `claude` | `claude --dangerously-skip-permissions` | `@anthropic-ai/claude-code` |
| `codex` | `codex --dangerously-bypass-approvals-and-sandbox` | `@openai/codex` |
| `gemini` | `gemini --yolo` | `@google/gemini-cli` |
| `grok` | `grok --yolo --sandbox off` | `@xai-official/grok` |
| `opencode` | `opencode --auto` | `opencode-ai` |
| `pi` | `pi`（使用工具默认审批行为） | `@earendil-works/pi-coding-agent` |

工具 ID 后的参数原样传递。例如 `fastcli claude -p "解释当前项目"` 将提示词作为一个参数传给 Claude Code。`fastcli --version` 显示 fastcli 版本，`fastcli codex --version` 则由 Codex 处理。目标进程沿用当前目录和终端，fastcli 返回其退出码。旧版 OpenCode 若缺少交互式 `--auto`，可通过 `fastcli install opencode` 更新当前 npm 安装。

直接启动只查找指定工具。找不到入口时会提示安装命令。要检查本机的入口、版本和来源，运行以下命令。

```bash
fastcli list
fastcli info codex
```

fastcli 优先使用 PATH 中的第一个可执行入口，也会查找标准系统目录、用户安装目录、npm 全局目录和 nvm、fnm、Volta、mise 等常见位置。没有 PATH 默认入口时，只有一个候选就直接使用。若有多个候选，交互终端会让你选择本次入口，非交互调用会报错并列出候选路径。

版本探测失败会显示“版本未知”及原因，仍可尝试启动该入口。每个版本探测最多等待 3 秒，同时最多运行 4 个。

## 使用交互菜单

打开 `fastcli` 后，用方向键移动，Enter 确认，Esc 返回。多选列表用空格勾选，Enter 执行。

| 菜单 | 可执行的操作 |
| --- | --- |
| Yolo 启动 | 查看并启动本机已检测到的工具 |
| 安装 / 更新 / 卸载 | 批量安装、更新或卸载，卸载整批确认一次 |
| 自定义命令 | 添加、编辑、删除命令，搜索后单选或多选运行 |
| 设置 | 切换 English 或简体中文 |

多选按列表原顺序逐项执行。某项失败后继续执行其余选项，结束时显示结果。Ctrl+C 取消当前操作和批次剩余项。`NO_COLOR=1` 可以关闭菜单颜色。

### 保存常用命令

在「自定义命令 → 添加命令」输入名称，选择解释器，再粘贴整行命令。例如将 `pnpm test` 保存为「项目测试」。Windows 支持 CMD 和本机可用的 PowerShell，macOS 与 Linux 使用 `sh`。引号、管道和重定向按所选解释器的语法处理。

在「运行命令」直接输入文字，按名称或命令内容模糊搜索。例如 `pnpmts` 可匹配 `pnpm test`。改变筛选条件时会保留已勾选的条目。每项在启动 fastcli 的目录中执行。原始命令行保存在 `~/.fastcli/custom-commands.json`。

## 安装、更新和卸载 AI CLI

```bash
fastcli install codex
fastcli install opencode --dry-run
fastcli uninstall gemini
fastcli uninstall gemini --yes
```

`install` 将当前 npm 全局环境中的目标包装到最新版，适用于首次安装和更新。`uninstall` 删除该环境中经核验的目标包，保留其他来源的安装和 AI CLI 的账号、配置与会话。非交互卸载须传入 `--yes`。两条命令都支持 `--dry-run`，预览时不会运行 npm、核验当前 npm 环境或迁移配置。

安装 Claude Code 需要 **npm ≥11.16.0**。fastcli 为本次调用显式启用安装脚本和可选依赖，并添加 `--allow-scripts=@anthropic-ai/claude-code`。OpenCode 的安装同样显式启用脚本与可选依赖，npm ≥11.16.0 时添加 `--allow-scripts=opencode-ai`。`--dry-run` 可查看命令预览。fastcli 不会更改全局 npm 配置、提升权限或自动升级 Node.js 和 npm。

安装后 fastcli 会核验 npm 可执行入口，并单独检查 PATH 默认入口。即使两个入口显示同一个版本，也要核实它们指向同一个位置。安装成功后仍启动旧版时，运行 `fastcli info <工具 ID>` 对照两处路径。可调整 PATH，或用默认入口对应的原安装方式升级。原生安装器、Homebrew、Volta 或其他 Node 环境安装的工具仍可启动。

失败或取消时，fastcli 会报告当前观测到的安装状态。若无法确认子进程已终止，实际状态仍可能变化。

## 更新 fastcli 自身

打开交互菜单或在交互终端执行快捷启动等命令时，fastcli 会用最多 2 秒查询 npm 上的自身稳定版本。查询失败时继续原命令。发现新版会显示当前版本和最新版本，并提供两个选项。

- **立即更新**用于经核验的 npm 全局安装或 Volta 安装。验证新版成功后，fastcli 会保留参数、工作目录和环境，用新版继续原命令。Volta 更新沿用当前 Node.js 版本。无法核验的安装会提示用原安装方式更新，随后结束本次调用。更新失败或取消也会结束本次调用。
- **下次更新**会继续本次命令，下次检查发现较新版本时再次提醒。

非交互调用、CI、fastcli 自身的帮助和版本输出、`fastcli config` 的 JSON 输出以及管理 `--dry-run` 跳过检查。可设置 `FASTCLI_NO_UPDATE_CHECK=1` 关闭自动检查。旧版 `~/.fastcli/update-state.json` 中的忽略记录不再屏蔽提示。

## 设置与旧版迁移

```bash
fastcli config
fastcli config --language zh-CN
fastcli config --language en
```

`fastcli config` 显示当前配置。默认语言为英文，保存设置时写入 `~/.fastcli/config.json`，schema 为 `"2"`，包管理器固定为 npm。旧配置迁移时保留语言，并先保存原始备份 `config.json.bak.<时间>.<唯一标识>`。损坏配置和高于当前 schema 的版本保留原样。

| 旧用法 | 当前用法 |
| --- | --- |
| `fastcli run claude danger` | `fastcli claude` |
| `fastcli run claude install` 或 `fastcli upgrade claude` | `fastcli install claude` |
| `fastcli run claude uninstall` | `fastcli uninstall claude` |
| `pi-coding-agent` 工具 ID | `pi` |
| `fastcli config edit` | `fastcli config --language zh-CN` 或直接编辑配置 |
| `list --source/--tag/--category` | `fastcli list` 或 `fastcli info <工具 ID>` |
| `add/edit/remove/view/web`、旧通用操作 | 已移除 |

旧 `~/.fastcli/tools.json` 保留原样，新版不读取其中的工具或命令链。要在新版运行常用命令，可在自定义命令菜单重新保存整行命令。需要回到旧版时，可以安装指定旧版并恢复配置备份。AI CLI 自身的安装变更需要单独处理。

## 参与开发

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm typecheck
```

构建产物位于 `dist/`。可用 `pnpm dev` 监听改动。CI 在 Windows、macOS 和 Linux 上先构建再测试。测试使用临时目录、伪 AI CLI 和伪 npm，Windows 上的符号链接用例需要创建文件符号链接的权限。模块入口和开发约束见 [AGENTS.md](AGENTS.md)，版本变化见 [CHANGELOG.md](CHANGELOG.md)。

`v*` 标签触发 GitHub Actions 构建、测试并暂存 npm 包。维护者在 npm 的 Staged Packages 中通过 2FA 批准后，版本才会公开上架。补交及核验步骤见 [npm 发布手册](.agents/dev/deploy/npm/runbook.md)。
