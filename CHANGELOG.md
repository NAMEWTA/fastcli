# Changelog

fastcli 的变更记录遵循 [Keep a Changelog](https://keepachangelog.com/) 和 [Semantic Versioning](https://semver.org/)。

---

## [Unreleased]

---

## [3.2.2] - 2026-07-21

### 新增

- **Builtin**：新增 OpenWiki（`openwiki`）内置工具。

---

## [3.2.1] - 2026-07-21

### 修复

- **Builtin**：更新 OpenCode 的 npm 包名从 `opencode` 改为 `opencode-ai`。

---

## [3.2.0] - 2026-07-11

### 新增

- **Builtin**：新增 CodeBuddy Code、Grok CLI（curl 安装）、Cursor CLI（curl 安装）、Speculo（npm 安装）四个内置工具。
- **Builtin**：`BuiltinSpec` 新增 `category` 字段（coding/tool）和 `commands` 字段，支持非 npm 安装方式的工具直写命令。
- **CLI**：`fastcli list` 新增 `--category=coding|tool` 过滤选项。
- **CLI**：交互式菜单重构为「AI 编程工具 / 通用工具 / 自定义 / 可视化配置」四入口，按 category 分组。
- **Docs**：新增 `CLAUDE.md`，为 Claude Code 提供仓库架构、构建命令和设计决策参考。

### 变更

- **Registry**：`list()` 方法新增 `category` 过滤支持；`buildBuiltinEntries` 兼容 `commands` 直写，不再强制依赖 `npmPackage`。

---

## [3.1.0] - 2026-07-10

### 修复

- **CI**：build 步骤移至 test 之前，修复 e2e 测试在首次 checkout 时找不到 `dist/index.js` 的问题。
- **Config**：v1 配置迁移与旧 schema 默认值重写改用原子写（临时文件 + rename + chmod 0o600），防止写盘中途崩溃导致配置文件损坏。
- **CLI**：`fastcli run` 在非 TTY 环境下检测 `confirmBeforeRun` 并报错退出（避免交互式确认挂起）；新增 `--yes` 标志跳过二次确认。
- **Web API**：`POST /api/tools` 添加 `If-Match` 乐观锁，与 PUT/DELETE 端点保持一致，防止 CLI 与 Web 并发写盘时丢改。

### 新增

- **CLI**：`fastcli run <tool> <op>` 操作名输错时提供模糊匹配建议（suggestOp），与工具名找不到时的行为对齐。
- **Config**：启动时校验 `packageManager`、`confirmBeforeRun`、`firstRun` 字段类型，无效值自动回退默认并打印告警。

---

## [3.0.2] - 2026-06-13

### 修复

- **Windows**：修复命令链在 Windows 上因 POSIX shell 脚本语法不兼容而立即失败的问题（`'__fastcli_step_file' 不是内部或外部命令`）。Windows 上现改为逐条顺序执行命令，不再生成 POSIX 专用脚本。

---

## [3.0.1] - 2026-05-23

### 变更

- **Docs**：重写 `README.md`，补充 fastcli 的核心痛点、项目重点、典型场景和推广摘要。

---

## [3.0.0] - 2026-05-22

### 新增

- **docs-sync**：新增文档同步技能、README / CHANGELOG / AGENTS 契约和 state schema 说明，用于基于 git diff 同步公开文档。
- **CLI**：交互式主菜单新增「系统内置 / 自定义 / 可视化配置」三入口，并为 Claude Code、OpenAI Codex、GitHub Copilot、Gemini、OpenCode 增加 `danger` 全权限快捷启动 operation。

### 变更

- **CLI**：本地可视化编辑器入口由 `fastcli web` 改为 `fastcli view`，不保留旧 `web` 子命令。
- **Builtin tools**：内置工具的 `install` 与 `update` 合并为 `install`，不再单独生成 `update` operation。
- **Custom tools**：新增自定义工具时不再填写 id，改为根据唯一 name 自动生成；CLI 与 Web API 会拒绝重复工具名称。
- **Docs**：重写 `README.md` 为推广型用户文档，突出 fastcli 的统一入口、内置 AI CLI、自定义命令链、本地可视化编辑器、双语界面和安全执行特性。
- **Docs**：同步 `AGENTS.md`，移除 `specforge` 项目记忆文档并将代理技能迁移到 `.agents/skills/`。

---

## [2.0.0] - 2026-05-22

### 新增

- **CLI / Web**：新增 `en` / `zh-CN` 双语界面，CLI 提示、本地 Web 编辑器和配置读取统一跟随 `language`。
- **Config**：`~/.fastcli/config.json` 新增 `language` 配置项，默认值为 `en`。

### 变更

- **Release**：`.github/workflows/release.yml` 现在先执行 `pnpm build`，再执行 `pnpm test`，以保证 clean checkout 下的 CLI 集成测试有 `dist/index.js`。

---

## 版本链接

- [Unreleased](https://github.com/namewta/fastcli/compare/v3.2.0...HEAD)
- [3.2.0](https://github.com/namewta/fastcli/releases/tag/v3.2.0)
- [3.1.0](https://github.com/namewta/fastcli/releases/tag/v3.1.0)
- [3.0.2](https://github.com/namewta/fastcli/releases/tag/v3.0.2)
- [3.0.1](https://github.com/namewta/fastcli/releases/tag/v3.0.1)
- [3.0.0](https://github.com/namewta/fastcli/releases/tag/v3.0.0)
- [2.0.0](https://github.com/namewta/fastcli/releases/tag/v2.0.0)
- [1.0.5](https://github.com/namewta/fastcli/releases/tag/v1.0.5)
- [1.0.4](https://github.com/namewta/fastcli/releases/tag/v1.0.4)
- [1.0.3](https://github.com/namewta/fastcli/releases/tag/v1.0.3)
- [1.0.2](https://github.com/namewta/fastcli/releases/tag/v1.0.2)
