# fastcli

[![npm version](https://img.shields.io/npm/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)

**一个入口，启动和管理常用 AI CLI。**

不必记住每个工具的全权限参数和 npm 包名。在项目目录运行 `fastcli claude` 即可启动 Claude Code；输入 `fastcli`，从本机已安装的工具中选择，或安装、卸载支持的工具（已安装时再次安装即更新）。

```bash
fastcli claude
fastcli codex
fastcli install gemini
fastcli
```

## 安装与环境

需要 **Node.js ≥22.19.0**。支持 macOS、Linux、Windows；各 AI CLI 自身的系统要求仍适用。

```bash
npm install -g @namewta/fastcli
fastcli --help
```

安装 Claude Code 需要 npm ≥11.16.0，以支持其包级安装脚本授权。fastcli 不自动升级 Node/npm，不使用 sudo，不修改全局 npm 配置。

## 快捷启动

| 命令 | 启动方式 |
|---|---|
| `fastcli claude` | `claude --dangerously-skip-permissions` |
| `fastcli codex` | `codex --dangerously-bypass-approvals-and-sandbox` |
| `fastcli gemini` | `gemini --yolo` |
| `fastcli grok` | `grok --yolo --sandbox off` |
| `fastcli opencode` | `opencode --auto` |
| `fastcli pi` | `pi`（默认不逐次审批工具） |

这些入口调用各工具的自动审批模式；交互终端会先检查 fastcli 自身更新，完成选择后启动目标工具。工具自己的显式禁止规则、组织策略或登录要求仍由工具处理。OpenCode 使用 `opencode-ai` 的交互式 `--auto`，旧版本如不支持该参数，需要升级。

工具名之后的参数全部原样传递：

```bash
fastcli claude --resume
fastcli codex --model your-model
fastcli gemini --version
fastcli claude -p "解释当前项目"
```

当前目录、环境变量和终端输入输出保留，退出码与目标程序一致。`fastcli --version` 显示 fastcli 版本，`fastcli codex --version` 则属于 Codex。

直接启动只查找指定工具，不先扫描全部版本。找不到工具时给出安装命令，不会自动下载。

## 启动检查与自身升级

在交互终端启动时，fastcli 会查询自身 npm 最新稳定版本，包括 `fastcli codex` 等快捷命令。每次请求最多等待 2 秒；断网、超时或查询失败时继续使用当前版本，不影响启动。此检查不查询其他 AI CLI 的远端版本。

发现新版本时，先分行明确显示「当前版本号」和「最新版本号」，使用 ↑↓ 移动、Enter 选择：

- **立即更新**：核验当前安装方式，显示并执行对应更新命令，验证成功后用新版继续原命令，保留参数、当前目录和环境。
- **下次更新**：立即继续原本交互，下次启动仍有新版时再次提醒。

自动更新支持核验通过的当前 npm 全局安装和 Volta 安装。npm 安装执行 `npm install -g @namewta/fastcli@<最新版本> --prefix <已核验位置>`；Volta 安装通过 `volta run --node <当前 Node.js 版本> --bundled-npm npm install --global @namewta/fastcli@<最新版本>` 更新，保留当前 Node.js 运行版本。源码、链接、npx 或其他无法核验的安装同样先显示两个选项；选择立即更新后会提示按原安装方式处理并结束本次调用。更新失败或取消后不执行原命令；按提示修复后重新运行。更新不会自动使用 sudo 或更新 Node.js。

非交互调用、CI、帮助、本地版本号、`config` 的 JSON 输出及管理命令 `--dry-run` 不触发自动检查。工具名后的参数始终属于目标工具，例如 `fastcli codex --version` 仍按快捷启动处理。设置 `FASTCLI_NO_UPDATE_CHECK=1` 可关闭自动检查。

「下次更新」只影响本次启动，不写入忽略记录；旧版 `~/.fastcli/update-state.json` 中的忽略记录不再屏蔽提醒。

## 按行为组织的菜单

```text
fastcli
├─ Yolo 启动
│  └─ 本机已安装工具（版本、位置）
├─ 安装 / 卸载
│  ├─ 选择操作
│  └─ 选择支持的工具
├─ 设置
│  └─ English / 简体中文
└─ 退出
```

菜单使用方向键与 Enter 操作，适配终端大小和中文显示宽度。青色表示主要操作，绿色表示成功，黄色表示提醒，红色表示错误；`NO_COLOR=1` 可关闭颜色。子菜单可返回，工具退出和管理操作结束后回到菜单。安装直接执行，已安装时更新到最新版；卸载会展示目标位置并要求确认。Ctrl+C 取消菜单。

Yolo 列表只显示发现可执行入口的工具。版本读取失败时显示“版本未知”及原因，仍可尝试启动；没有已安装工具时可以转入安装管理。

## 安装与卸载

```bash
fastcli install claude
fastcli install codex
fastcli uninstall gemini
fastcli uninstall gemini --yes
fastcli install opencode --dry-run
```

`--dry-run` 仅预览命令，不运行 npm、不修改配置，也不验证当前环境。脚本中卸载必须使用 `--yes`。

| 工具 ID | 官方 npm 包 |
|---|---|
| `claude` | `@anthropic-ai/claude-code` |
| `codex` | `@openai/codex` |
| `gemini` | `@google/gemini-cli` |
| `grok` | `@xai-official/grok` |
| `opencode` | `opencode-ai` |
| `pi` | `@earendil-works/pi-coding-agent` |

`install` 统一用于首次安装和更新，使用 `npm i -g <包名>@latest`；卸载使用 `npm uninstall -g <包名>`。Claude 保留以下参数：

```bash
npm i -g @anthropic-ai/claude-code@latest --ignore-scripts=false --include=optional --allow-scripts=@anthropic-ai/claude-code
```

OpenCode 同样显式启用本次安装所需的脚本与可选依赖，npm ≥11.16 时追加 `--allow-scripts=opencode-ai`。这使需要 postinstall 的安装能兼容 npm 12 的包级脚本授权。Pi 使用原始 npm 安装命令，不增加项目信任设置。

**管理只作用于当前 npm 全局环境。** 原生安装器、Homebrew、Volta 或其他 Node 环境中的工具可以被发现和启动，但不会被当前 npm 升级或卸载。列表会说明无法执行的管理操作。

fastcli 始终通过 npm 管理已核验的当前全局环境，并显式固定该次操作的 prefix；不接管用户的 Volta 等 Node 管理配置。安装其他来源已存在的工具会新增 npm 安装，PATH 默认入口可能仍指向旧位置。卸载仅删除当前 npm 包，不删除 AI 工具的账号、配置、会话，其他来源的安装可能继续存在。

每次操作结束后重新检查目标：安装验证 npm 对应的可执行入口，卸载验证目标包已移除。安装成功后还会分别显示 npm 可执行入口和 PATH 默认启动入口及其版本；若默认入口不同，即使版本号相同也会提示无法确认归属，不会宣称该入口已经更新。没有 PATH 默认入口或版本读取失败时也会说明。失败或取消后报告实际状态，不自动重试，也不宣称已回滚。如果无法确认进程树已终止，会明确提示观察到的安装状态仍可能变化。

如果 npm 安装成功但仍启动旧版，运行 `fastcli info codex`（或其他工具 ID），对照 PATH 默认入口与 npm 可执行入口。调整 PATH 使用 npm 对应的 bin 目录，或用原安装器/管理工具更新默认入口。fastcli 不自动修改 PATH、切换入口或删除其他安装。

## 查看安装位置与版本

```bash
fastcli list
fastcli info claude
```

检测优先采用 PATH，并补查标准系统目录、用户安装目录、npm 全局目录及 nvm、fnm、Volta、mise 等常见布局。仅存在配置目录不算安装。

- PATH 中已有默认入口时，即使版本检测异常，也不会偷偷改用另一份安装。
- PATH 中没有入口、只有一个候选时，直接使用该位置。
- 无 PATH 默认且存在多个候选时，在交互终端选择本次使用的位置；非交互调用报错并列出路径，可通过调整 PATH 选择。
- 版本探测每项最多 3 秒、最多同时运行 4 个，输出有上限；菜单检测不查询远程最新版本。

## 配置与旧版迁移

配置位于 `~/.fastcli/config.json`：

```json
{
  "version": "2",
  "packageManager": "npm",
  "language": "en"
}
```

```bash
fastcli config
fastcli config --language zh-CN
fastcli config --language en
```

首次使用直接进入菜单，不再选择包管理器。无配置时使用英文默认值；修改设置时才创建配置。

旧配置首次加载时先保存 `config.json.bak.<时间>.<唯一标识>` 原始备份，再原子迁移到 npm 并保留语言。POSIX 配置与备份权限为 `0600`。损坏配置或未来 schema 版本不会被覆盖。

本次重构属于破坏性接口调整：

| 旧用法 | 新用法 |
|---|---|
| `fastcli run claude danger` | `fastcli claude` |
| `fastcli run claude install` | `fastcli install claude` |
| `fastcli run claude uninstall` | `fastcli uninstall claude` |
| `pi-coding-agent` 工具 ID | `pi` |
| `fastcli config edit` | `fastcli config --language zh-CN` 或直接编辑配置 |
| `add/edit/remove/view/web`、自定义操作 | 已移除 |
| `list --source/--tag/--category` | `fastcli list` 或 `fastcli info <tool>` |

旧 `~/.fastcli/tools.json` 原样保留，新版不读取、不覆盖其中的工具。Web 编辑器、自定义命令链、通用工具及 Copilot、CodeBuddy、Cursor 内置条目已移除。需要回到旧版时，可安装指定旧版 fastcli 并恢复配置备份；工具本身的安装变更不会随 fastcli 降级而撤销。

## 开发

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm typecheck
pnpm dev
```

`src/builtin` 维护工具目录，`src/core` 负责检测、进程与 npm 管理，`src/cli` 负责命令和菜单，`src/config` 负责配置迁移和原子写入。构建仅生成 CLI。

测试通过临时目录、伪 AI CLI 和伪 npm 验证真实进程/文件系统边界，不安装真实 AI 工具。CI 配置覆盖 Linux、macOS、Windows，先构建再测试。

发布由 `v*` tag 驱动：构建、测试通过后执行 `npm stage publish --access public --tag latest`，核对暂存版本后创建 GitHub Release，并在 Actions Summary 中给出 Stage ID。

GitHub Actions 使用仓库 Secret `NPM_TOKEN`，可使用本包的 **Read and write (stage only)** 权限，无需开启 Bypass 2FA。维护者在 npmjs.com 的 **Staged Packages** 中审核并使用 2FA 确认后，版本才公开上架。GitHub Release 和 CI 成功仅表示暂存完成，不表示 npm 已发布。详见 [npm 暂存发布说明](https://docs.npmjs.com/staged-publishing/)。

已存在标签但 npm 尚未暂存时，可在 Actions → Release → Run workflow 中选择 `master` 并填写原标签（例如 `v3.2.8`）补交。补交构建原标签对应内容，不修改标签或已有 GitHub Release；缺失的 Release 会创建。已有暂存或公开版本不能重复上传，恢复前先核对 `npm stage list @namewta/fastcli` 和 registry。

项目协作约束见 [AGENTS.md](AGENTS.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
