---
name: "project-metadata"
type: "project"
version: "0.2.0"
---

# fastcli 项目元数据

## 项目概述

- **项目名称**：fastcli
- **npm 包名**：`@namewta/fastcli`
- **命令入口**：`fastcli`
- **一句话定位**：用一个交互式入口统一管理常用 AI CLI 工具的安装/更新、卸载、运行和自定义工作流。
- **核心价值**：把分散在多个 CLI 工具、包管理器、shell alias 和临时脚本中的重复操作沉淀为统一模型：`tool + operation + command chain`。
- **目标用户**：日常使用多个 AI CLI 工具的开发者、技术团队、自动化脚本维护者和需要统一分发命令工作流的个人用户。
- **当前阶段**：生产可用，已发布到 npm，发布由 tag `v*` 驱动。

## 产品能力

| 能力 | 当前状态 | 关键路径 |
|------|----------|----------|
| 交互式工具菜单 | 已实现 | `src/cli/menu.ts` |
| 脚本化执行 | 已实现 | `src/cli/commands/run.ts` |
| 内置 AI CLI 工具 | 已实现，当前 6 个 | `src/builtin/tools.ts` |
| 自定义工具 | 已实现 | `src/cli/commands/add.ts`, `edit.ts`, `remove.ts` |
| 命令链 | 已实现 | `src/core/executor.ts` |
| 变量替换 | 已实现，支持 `{{name}}` / `{{version}}` | `src/core/resolver.ts` |
| 本地可视化编辑器 | 已实现 | `src/cli/commands/view.ts`, `src/web-server/server.ts`, `packages/web` |
| 双语界面 | 已实现，支持 `en` / `zh-CN` | `src/i18n.ts`, `packages/web/src/i18n.ts` |
| docs-sync | 已纳入仓库文档流程 | `.agents/docs-sync` |

## 技术栈

- **语言与运行时**：TypeScript + Node.js >= 18
- **模块系统**：ESM，`package.json` 使用 `"type": "module"`
- **CLI 框架**：`citty`
- **交互提示**：`@clack/prompts`
- **Web API**：Express 5
- **Web 前端**：Vite + React + Tailwind CSS + lucide-react
- **包管理**：pnpm workspace
- **构建工具**：tsup（CLI）、Vite（Web）
- **测试框架**：Vitest
- **CI/CD**：GitHub Actions，CI 覆盖 Node.js 20 / 22，release 使用 Node.js 22

## 架构约束

- **分层**：`src/cli`（入口与交互） -> `src/core`（领域逻辑） -> `src/config`（持久化） -> `src/utils`（通用工具）。
- **内置工具来源**：只允许在 `src/builtin/tools.ts` 定义；命令模板由 `src/core/builtin-templates.ts` 生成。
- **用户工具来源**：只允许写入 `~/.fastcli/tools.json`，运行时 registry 强制标记为 `source: "user"`。
- **配置 schema**：`config.json` 与 `tools.json` 固定为 `version: "2"`。
- **Web 安全边界**：服务只能绑定 `127.0.0.1`，API 必须 token 鉴权。
- **并发写入**：Web API 写入必须基于 ETag + `If-Match`；后端写入队列串行化。
- **文档同步**：对外文档由 `.docs-sync-state.json` 记录同步基线，docs-sync 只能基于 git diff 更新。

## 领域术语

| 术语 | 定义 | 备注 |
|------|------|------|
| Tool Entry | 一个可被 fastcli 管理的工具定义，包含 id、名称、描述、标签、命令集合和来源。 | 来源为 `builtin` 或 `user`。 |
| Operation | 工具上的一个可执行动作，例如 `install`、`danger`、`docs`。 | operation 名称由用户自定义；内置工具使用 `install` 表示安装/更新。 |
| Command Chain | 一个 operation 对应的顺序命令数组。 | 失败时返回失败步骤索引。 |
| Registry | 运行时合并后的工具注册表视图。 | user 可覆盖同 id builtin。 |
| Resolver | 把 tool operation 解析成最终命令链并做变量替换。 | 未配置 operation 时返回结构化结果。 |
| Executor | 把命令链交给系统 shell 顺序执行并返回退出状态。 | dry-run 只打印不执行。 |
| Docs Sync State | 文档同步基线状态文件。 | `.docs-sync-state.json`。 |

## 关键非功能需求

- **安全性**：命令执行前必须打印完整命令；可视化编辑器仅本地回环访问；配置写入使用严格权限。
- **可靠性**：配置写入必须原子化；命令链失败必须保留失败步骤和退出码。
- **可维护性**：CLI、core、config、web-server 变更应有对应测试。
- **兼容性**：Node.js >= 18；相对 import 必须带 `.js` 后缀。
- **可扩展性**：用户可定义任意工具和 operation；内置工具列表由源码扩展。
- **可用性**：README 必须作为清晰的用户入口和推广文档，突出 fastcli 的实际优势。
- **国际化**：CLI 与 Web 的 `en` / `zh-CN` 文案保持语义一致。

## 仓库约定

- **主分支**：`master`
- **提交风格**：Conventional Commits
- **发布方式**：推送 `v*` tag 触发 release workflow
- **发布顺序**：`pnpm build` -> `pnpm test` -> `pnpm publish` -> GitHub Release
- **文档入口**：用户文档为 `README.md`，AI 代理手册为 `AGENTS.md`，变更历史为 `CHANGELOG.md`
- **文档同步**：每轮 docs-sync 完成后必须推进 `.docs-sync-state.json.last_sync_sha`

## 相关文档

- 用户入口：`README.md`
- AI 代理手册：`AGENTS.md`
- 变更记录：`CHANGELOG.md`
- 项目规则：`specforge/context/context.md`
- 架构知识：`specforge/context/architecture.md`
- 失败经验：`specforge/context/lessons.md`
