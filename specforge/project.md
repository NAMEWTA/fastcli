---
name: 'project-metadata'
type: 'project'
version: '0.1.0'
---

# fastcli 项目元数据

> 本文件是用户资产（`specforge/`），`specforge update` 不会覆盖本文件。请根据项目实际情况填写并持续维护。

## 项目概述

- **项目名称**：fastcli
- **一句话定位**：用一个交互式入口统一管理常用 AI CLI 工具的安装、升级、卸载和运行操作。
- **核心价值**：把分散在多个 CLI 工具和包管理器中的重复操作沉淀为统一模型（tool + operation），降低日常使用和维护成本。
- **目标用户**：日常使用多个 AI CLI 工具的开发者、技术团队与自动化脚本维护者。
- **当前阶段**：生产（已发布到 npm，并由 tag 驱动发布流水线）。

## 技术栈

- **语言与运行时**：TypeScript + Node.js >= 18
- **主要框架 / 库**：citty（CLI 命令定义）、@clack/prompts（交互式提示）、express（本地 Web API）
- **包管理**：pnpm（workspace）
- **构建工具**：tsup（CLI 构建）、Vite（Web 编辑器构建）
- **测试框架**：Vitest
- **代码规范工具**：TypeScript strict 模式 + 测试门禁（当前无单独 linter 脚本）
- **CI/CD 平台**：GitHub Actions（tag `v*` 触发 release workflow）

> 具体命令（如 test / lint / build）请参考 `.specforge/skills/workflow-steps/language-adapters/` 中对应语言的适配器。

## 架构约束

列出对架构设计有强约束的原则、历史决策或外部要求。

- **分层**：`src/cli`（命令入口）→ `src/core`（领域逻辑）→ `src/config`（配置读写）→ `src/utils`（通用工具），保持单向依赖。
- **模块边界**：内置工具定义只在 `src/builtin/tools.ts`；用户工具只存放于 `~/.fastcli/tools.json`。
- **数据流原则**：所有运行时状态从配置文件加载，命令执行前完成解析和变量替换，不在进程内维持长期可变全局状态。
- **接口风格**：CLI + 本地 HTTP API（仅 `127.0.0.1`）双入口。
- **持久化策略**：配置和工具数据持久化为 JSON 文件，原子写入并在 POSIX 下设置严格权限。
- **并发模型**：单进程命令执行，Web API 通过 ETag + If-Match 控制并发写冲突。
- **不可违反的硬约束**：
	- 相对 import 必须显式带 `.js` 后缀。
	- `config.json` 与 `tools.json` schema 版本固定为 `2`。
	- 发布流程必须先 `pnpm build` 再 `pnpm test`，最后执行 npm 发布与 GitHub Release。

## 领域术语（Glossary）

记录本项目的领域词汇，保持团队与 AI 对同一概念的一致理解。

| 术语 | 定义 | 同义词 / 旧称 | 备注 |
| ---- | ---- | ------------- | ---- |
| Tool Entry | 一个可被 fastcli 管理的工具定义，包含 id、名称、标签与命令集合 | tool | 分 `builtin` 与 `user` 两类来源 |
| Operation | 工具上的一个可执行动作（如 install、update、docs） | op | 每个操作映射为命令链 `string[]` |
| Command Chain | 单个 operation 对应的一组顺序执行命令 | commands | 运行失败时返回失败步骤索引 |
| Registry | 运行时聚合后的工具注册表视图 | tool registry | 支持 user 覆盖同 id 的 builtin |
| Docs Sync State | 文档同步基线状态文件 | .docs-sync-state.json | 记录 last_sync_sha 与 tracked_docs |

## 关键非功能需求（Non-functional Requirements）

可度量的质量目标，作为设计与验收的参照。

- **性能**：CLI 常见路径（如 `list`）应保持亚秒级响应；构建命令在 CI 环境稳定完成。
- **可用性**：tag 发布流水线（build/test/publish/release）必须可重试且可追溯。
- **可扩展性**：支持通过 `tools.json` 增加任意用户工具和任意 operation 名称。
- **安全性**：Web 编辑器仅允许本地回环访问并基于 token 鉴权；用户配置文件默认最小权限。
- **可维护性**：新增 CLI/API 行为必须补对应测试；对外文档通过 docs-sync 状态持续维护。
- **可观测性**：命令执行路径返回明确 exit code；发布状态通过 GitHub Actions run 可追溯。
- **国际化 / 本地化**：CLI 与 Web 统一支持 `en` / `zh-CN`，配置项为 `language`。

## 仓库约定

- **目录布局**：参见 `README.md` 与 `AGENTS.md`。
- **分支策略**：trunk-based（`master` 主干，发布从主干打 tag）。
- **提交规范**：Conventional Commits。
- **代码评审规则**：主干改动需至少通过本地测试与构建，发布改动需通过 GitHub Actions release workflow。
- **发布流程**：`v*` tag 驱动自动发布（npm publish + GitHub Release）。
- **文档更新规则**：对外可见能力变化必须同步 `README.md` / `CHANGELOG.md` / `AGENTS.md`，并推进 `.docs-sync-state.json`。
- **AI 协作约定**：参见 `AGENTS.md`；本仓库使用 SpecForge 规格驱动开发工作流。

## 相关文档

- 用户视角介绍：`README.md`
- AI 代理指引：`AGENTS.md`
- 当前规格：`specforge/spec/`
- 活跃变更：`specforge/changes/`
- 已归档变更：`specforge/archive/`
