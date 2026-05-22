# fastcli

> AI CLI Manager — 一站式管理常用 AI 命令行工具的安装、升级、卸载和自定义命令。

`fastcli` 把 Claude Code、Codex、Gemini CLI、GitHub Copilot CLI、OpenCode 等 AI CLI 工具的常用操作收编到一个交互式菜单里，并支持把任何 shell 命令包装成「工具的某个操作」统一管理。

## 安装

```bash
# 使用 npm
npm install -g @namewta/fastcli

# 或 volta（推荐，避免污染全局 npm 前缀）
volta install @namewta/fastcli
```

要求 Node.js ≥ 18。

安装完成后，命令行入口为 `fastcli`。

## 首次运行

直接运行 `fastcli` 即可：

```bash
fastcli
```

第一次启动会引导你选择常用的包管理器（volta 或 npm），然后在 `~/.fastcli/` 下生成两个 JSON 文件：

- `~/.fastcli/config.json` — 全局配置
- `~/.fastcli/tools.json` — 用户自定义工具

之后再次运行 `fastcli` 会直接进入主交互菜单：

```
fastcli
└── 选择工具
    ├── ── 内置工具 ──
    │   ├── Claude Code（claude）
    │   ├── OpenAI Codex（codex）
    │   ├── Gemini CLI（gemini）
    │   ├── GitHub Copilot（copilot）
    │   └── OpenCode（opencode）
    └── ── 自定义工具 ──
        └── ...
```

## 命令参考

```text
fastcli                           进入交互菜单
fastcli run <tool-id> <op>        直接执行某工具的某个操作
fastcli list                      列出所有工具
fastcli info <tool-id>            查看某工具的详细信息
fastcli add                       交互式添加自定义工具
fastcli edit <tool-id>            编辑自定义工具（仅 user）
fastcli remove <tool-id>          删除自定义工具（仅 user）
fastcli config                    打印当前配置
fastcli config edit               用编辑器打开 config.json
```

### `fastcli run`

```bash
# 通过 volta 安装 Claude Code
fastcli run claude install

# 仅打印将要执行的命令而不实际执行
fastcli run claude install --dry-run

# 透传 {{version}} 占位符
fastcli run aider install --version=0.50.0
```

执行流程：
1. 加载注册中心，查找工具 id；找不到时给出 fuzzy 建议。
2. 解析操作；若 `op` 未配置，列出该工具已配置的操作名后退出。
3. 解析变量（`{{name}}` `{{version}}`），打印完整命令。
4. 若 `confirmBeforeRun: true` 且非 dry-run → 二次确认。
5. 调用系统 shell 执行，退出码透传给父进程。

### `fastcli list`

```bash
fastcli list                  # 全部
fastcli list --source=builtin # 只看内置
fastcli list --source=user    # 只看自定义
fastcli list --tag=anthropic  # 按 tag 过滤
```

### `fastcli info`

```bash
fastcli info claude
```

输出工具的 id / name / description / source / tags 以及所有已配置操作的命令明细。

### `fastcli add`

完全交互式：依次询问名称、ID（留空则自动从名称生成）、描述、install / update / uninstall 命令、以及任意自定义操作。

ID 必须满足 `^[a-z0-9][a-z0-9-]*$`，长度 1–64，且不与已有工具冲突。

至少要配置一个命令字段，否则会被拒绝。

### `fastcli edit` / `fastcli remove`

仅对 `source: 'user'` 的工具生效；内置工具拒绝编辑或删除。

`fastcli remove --yes` 跳过二次确认。

### `fastcli config`

```bash
fastcli config        # 打印当前 config.json（JSON 格式化）
fastcli config edit   # 用编辑器打开
```

`config edit` 优先级：`config.editor` → `$EDITOR` → `vi`。

## 配置文件

### `~/.fastcli/config.json`

```json
{
  "version": "2",
  "packageManager": "volta",
  "editor": "",
  "confirmBeforeRun": true,
  "language": "en",
  "firstRun": false
}
```

| 字段              | 类型              | 说明                                              |
|-------------------|-------------------|---------------------------------------------------|
| version           | `'2'`             | schema 版本，不要手动修改                         |
| packageManager    | `'volta' \| 'npm'` | 决定内置工具命令模板的生成方式                    |
| editor            | string            | `config edit` 优先使用的编辑器；为空则回退 $EDITOR |
| confirmBeforeRun  | boolean           | 执行命令前是否需要二次确认                        |
| language          | `'en' \| 'zh-CN'` | CLI 与 Web 界面语言                               |
| firstRun          | boolean           | 是否首次运行；引导完成后置为 false                |

Web 编辑器会跟随 `config.json` 里的 `language` 自动切换界面语言。

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
        "install":   ["pip install aider-chat"],
        "update":    ["pip install --upgrade aider-chat"],
        "uninstall": ["pip uninstall aider-chat"],
        "docs":      ["open https://aider.chat"],
        "deploy":    ["npm run build", "npm run deploy"]
      },
      "source": "user"
    }
  ]
}
```

文件权限：POSIX 平台上为 `0o600`，避免外部用户读到自定义命令。

## 内置工具

`fastcli` 内置了下列 5 个常用 AI CLI 的 install / update / uninstall 命令，命令字符串按 `packageManager` 自动生成：

| ID       | 名称           | npm 包名                    |
|----------|----------------|-----------------------------|
| claude   | Claude Code    | @anthropic-ai/claude-code   |
| codex    | OpenAI Codex   | @openai/codex               |
| gemini   | Gemini CLI     | @google/gemini-cli          |
| copilot  | GitHub Copilot | @github/copilot             |
| opencode | OpenCode       | opencode                    |

例如，`packageManager: 'volta'` 时 `claude install` 会展开为：

```
volta install @anthropic-ai/claude-code
```

`packageManager: 'npm'` 时则是：

```
npm install -g @anthropic-ai/claude-code
```

## 自定义工具示例

```bash
fastcli add
```

按提示填入：

- 工具名称：`Aider`
- 工具 ID：（留空 → 自动生成 `aider`）
- 描述：`AI pair programming in terminal`
- 添加操作：`install`
  - 命令：`pip install aider-chat`
- 添加操作：`docs`
  - 命令：`open https://aider.chat`
  - 继续添加？否

之后即可：

```bash
fastcli run aider install
fastcli run aider docs
```

### 变量替换

命令字符串支持两个变量：

- `{{name}}` — 工具的显示名（`tool.name`）
- `{{version}}` — 运行时输入的版本号

未知占位符（例如 `{{xxx}}`）会保留字面量，不会被吞掉，方便嵌套使用。

`{{version}}` 的处理：

- TTY + 未提供 `--version` → 通过 clack 提示输入
- 非 TTY + 未提供 → 报错退出
- 其它情况 → 直接替换

## 错误处理与排错

- **找不到工具**：输出 `找不到工具 "X"`，附 fuzzy 建议；运行 `fastcli list` 查看全部
- **操作未配置**：输出 `工具 "X" 未配置 "Y" 操作`，并列出该工具已配置的操作
- **配置文件损坏**：拒绝继续，不覆盖原文件；运行 `fastcli config edit` 修复
- **配置版本过新**：可能你升级了 fastcli 又回退；运行 `npm i -g @namewta/fastcli@latest` 升级
- **命令未找到（ENOENT）**：执行器输出 `命令未找到：<bin>`；多半是包管理器未安装，请先装 volta 或 npm
- **Ctrl+C / Esc**：在交互菜单中取消会以退出码 130 退出，不会留下脏文件

## 性能

冷启动到 TUI 主菜单首次绘制一般 < 200 ms（macOS SSD，配置目录已初始化）。

实测：在 macOS（Apple Silicon SSD）上 `time node dist/index.js list` 约 30–40 ms，远低于 200 ms 预算。允许 ±50 ms 波动。

## 开发流程

```bash
git clone https://github.com/namewta/fastcli.git
cd fastcli
pnpm install
pnpm build         # 用 tsup 打包到 dist/
pnpm test          # vitest 运行单元 + E2E 测试
pnpm dev           # tsup --watch
pnpm link          # 把当前仓库链接到全局，便于本地调试
pnpm unlink        # 取消链接
```

测试隔离：所有用例都通过 `os.tmpdir()` + 唯一目录 + `FASTCLI_HOME` 环境变量隔离，不会读写真实的 `~/.fastcli/`。

## 与 PRD 的差异

实现刻意保留了若干「与 PRD 不同」的细节，原因是 npm 上的包名与历史用户已经习惯了：

- bin 名为 `fastcli`（PRD 写的是 `aicli`）
- 配置目录为 `~/.fastcli/`（PRD 写的是 `~/.config/aicli/`）

如果以后准备改名，需要同步更新 `package.json.bin`、文档和默认配置目录。

## License

MIT © namewta
