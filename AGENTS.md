# fastcli

> AI CLI Manager — 一站式管理常用 AI 命令行工具的安装、升级、卸载、运行和自定义命令。

## Repository Layout

- `src/cli`：命令入口、参数解析、交互流程。
- `src/core`：工具注册、命令解析、执行器和模板逻辑。
- `src/config`：`config.json` / `tools.json` 的读写、迁移与校验。
- `src/web-server`：本地 Web API 服务。
- `packages/web`：Vite 构建的浏览器编辑器前端。
- `src/builtin`：内置工具模板。
- `specforge`：项目元数据、规则、架构和长期知识。

## Common Commands

- `pnpm build`：构建 CLI 和 Web 产物。
- `pnpm test`：运行 Vitest 测试套件。
- `pnpm dev`：监听构建 CLI。
- `pnpm link`：本地构建后链接到全局。
- `pnpm unlink`：取消全局链接。

## Hard Rules

- 所有相对 import 必须显式带 `.js` 后缀。
- `config.json` 与 `tools.json` 的 schema 版本固定为 `2`。
- 内置工具只允许在源码里定义；用户工具只写 `~/.fastcli/tools.json`。
- 本地 Web 编辑器只能绑定到 `127.0.0.1`，并使用 token 鉴权。
- 发布由 tag `v*` 驱动，CI 必须先 `pnpm build`，再 `pnpm test`，然后发布 npm 并创建 GitHub Release。

## Documentation

- 用户文档以 [README.md](README.md) 为主。
- 发布历史记录在 [CHANGELOG.md](CHANGELOG.md) 中。
- SpecForge 项目记忆在 [specforge/project.md](specforge/project.md)、[specforge/context/context.md](specforge/context/context.md)、[specforge/context/architecture.md](specforge/context/architecture.md) 和 [specforge/context/lessons.md](specforge/context/lessons.md)。
- docs-sync 状态文件位于 `.docs-sync-state.json`，应与这些公开文档保持一致。
