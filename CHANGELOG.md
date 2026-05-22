# Changelog

fastcli 的变更记录遵循 [Keep a Changelog](https://keepachangelog.com/) 和 [Semantic Versioning](https://semver.org/)。

---

## [Unreleased]

### 新增

- **docs-sync**：新增 `.agents/docs-sync/` 文档同步技能、README / CHANGELOG / AGENTS 契约和 state schema 说明，用于基于 `last_sync_sha..HEAD` 的 git diff 同步公开文档。
- **CLI**：交互式主菜单新增「系统内置 / 自定义 / 可视化配置」三入口，并为 Claude Code、OpenAI Codex、GitHub Copilot、Gemini、OpenCode 增加 `danger` 全权限快捷启动 operation。

### 变更

- **CLI**：本地可视化编辑器入口由 `fastcli web` 改为 `fastcli view`，不保留旧 `web` 子命令。
- **Builtin tools**：内置工具的 `install` 与 `update` 合并为 `install`，不再单独生成 `update` operation。
- **Custom tools**：新增自定义工具时不再填写 id，改为根据唯一 name 自动生成；CLI 与 Web API 会拒绝重复工具名称。
- **Docs**：重写 `README.md` 为推广型用户文档，突出 fastcli 的统一入口、内置 AI CLI、自定义命令链、本地可视化编辑器、双语界面和安全执行特性。
- **Docs**：同步 `AGENTS.md`、`specforge` 项目记忆和 `.docs-sync-state.json`，修复 tracked docs 与实际文档结构不一致的问题。

---

## [2.0.0] - 2026-05-22

### 新增

- **CLI / Web**：新增 `en` / `zh-CN` 双语界面，CLI 提示、本地 Web 编辑器和配置读取统一跟随 `language`。
- **Config**：`~/.fastcli/config.json` 新增 `language` 配置项，默认值为 `en`。

### 变更

- **Release**：`.github/workflows/release.yml` 现在先执行 `pnpm build`，再执行 `pnpm test`，以保证 clean checkout 下的 CLI 集成测试有 `dist/index.js`。

---

## 版本链接

- [Unreleased](https://github.com/NAMEWTA/fastcli/compare/v2.0.0...HEAD)
- [2.0.0](https://github.com/NAMEWTA/fastcli/releases/tag/v2.0.0)
- [1.0.5](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.5)
- [1.0.4](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.4)
- [1.0.3](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.3)
- [1.0.2](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.2)
