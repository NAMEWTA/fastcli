# fastcli

[![npm version](https://img.shields.io/npm/v/@namewta/fastcli)](https://www.npmjs.com/package/@namewta/fastcli)

**一个入口，启动和管理常用 AI CLI。**

不必记住每个工具的全权限参数和 npm 包名。在项目目录运行 `fastcli claude` 即可启动 Claude Code；输入 `fastcli`，从本机已安装的工具中选择，或安装、升级、卸载支持的工具。

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

这些入口调用各工具的自动审批模式，直接启动；工具自己的显式禁止规则、组织策略或登录要求仍由工具处理。OpenCode 使用 `opencode-ai` 的交互式 `--auto`，旧版本如不支持该参数，需要升级。

工具名之后的参数全部原样传递：

```bash
fastcli claude --resume
fastcli codex --model your-model
fastcli gemini --version
fastcli claude -p "解释当前项目"
```

当前目录、环境变量和终端输入输出保留，退出码与目标程序一致。`fastcli --version` 显示 fastcli 版本，`fastcli codex --version` 则属于 Codex。

直接启动只查找指定工具，不先扫描全部版本。找不到工具时给出安装命令，不会自动下载。

## 按行为组织的菜单

```text
fastcli
├─ Yolo 启动
│  └─ 本机已安装工具（版本、位置）
├─ 安装 / 卸载 / 升级
│  ├─ 选择操作
│  └─ 选择支持的工具
├─ 设置
│  └─ English / 简体中文
└─ 退出
```

子菜单可返回，工具退出和管理操作结束后回到菜单。安装、升级直接执行；卸载会展示目标位置并要求确认。Ctrl+C 取消菜单。

Yolo 列表只显示发现可执行入口的工具。版本读取失败时显示“版本未知”及原因，仍可尝试启动；没有已安装工具时可以转入安装管理。

## 安装、升级、卸载

```bash
fastcli install claude
fastcli upgrade codex
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

安装与升级使用 `npm i -g <包名>@latest`；卸载使用 `npm uninstall -g <包名>`。Claude 保留以下参数：

```bash
npm i -g @anthropic-ai/claude-code@latest --ignore-scripts=false --include=optional --allow-scripts=@anthropic-ai/claude-code
```

OpenCode 同样显式启用本次安装所需的脚本与可选依赖，npm ≥11.16 时追加 `--allow-scripts=opencode-ai`。这使需要 postinstall 的安装能兼容 npm 12 的包级脚本授权。Pi 使用原始 npm 安装命令，不增加项目信任设置。

**管理只作用于当前 npm 全局环境。** 原生安装器、Homebrew、Volta 或其他 Node 环境中的工具可以被发现和启动，但不会被当前 npm 升级或卸载。列表会说明无法执行的管理操作。

安装其他来源已存在的工具会新增 npm 安装，PATH 默认入口可能仍指向旧位置。卸载仅删除当前 npm 包，不删除 AI 工具的账号、配置、会话，其他来源的安装可能继续存在。

每次操作结束后重新检查目标：安装与升级验证 npm 对应的可执行入口，卸载验证目标包已移除。失败或取消后报告实际状态，不自动重试，也不宣称已回滚。如果无法确认进程树已终止，会明确提示观察到的安装状态仍可能变化。

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

发布由 `v*` tag 驱动：构建、测试通过后直接执行 `npm publish --access public --tag latest`，核对 npm registry 后创建 GitHub Release。

GitHub Actions 使用仓库 Secret `NPM_TOKEN`。该 Token 需要包含本包的 **Read and write (publish and stage)** 权限并开启 **Bypass two-factor authentication**；包设置必须允许 Token 发布。账号本身可以保留 2FA，正常自动发布无需逐次人工批准。权限不足时工作流会失败，不会自动退回暂存发布。

已存在标签但 npm 尚未上架时，可在 Actions → Release → Run workflow 中选择 `master` 并填写原标签（例如 `v3.2.7`）补发。补发构建原标签对应内容，不修改标签或已有 GitHub Release。已上架版本不能重复发布，恢复前先核对 registry。

项目协作约束见 [AGENTS.md](AGENTS.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
