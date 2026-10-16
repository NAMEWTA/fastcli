---
name: add-builtin-tool
description: 向 fastcli 添加或调整内置 AI CLI，核验官方 npm 分发、启动参数和本地检测，扩展固定工具目录及行为测试。
---

fastcli 是专用 AI CLI 管理器，当前支持六个工具。新增支持项须来自用户请求；本 Skill 不把发现外部 CLI 自动视为扩充产品范围。

## 核验并登记

先核验官方 npm 包、可执行文件名、版本命令、交互式自动审批参数、Node/平台要求。使用一手文档或对应发布版本源码，不把同名社区包或非交互 run 子命令当作官方交互启动。工具默认无逐次审批时无需虚构 Yolo flag。

在 `src/builtin/tools.ts` 的 `BUILTIN_TOOLS` 中登记 `ToolDefinition`：id、name、npmPackage、executable、launchArgs、versionArgs，以及适用的 minimumNode。ID 唯一且不能与 install/upgrade/uninstall/list/info/config 冲突。

- 安装/升级由 `src/core/npm-manager.ts` 生成 `npm i -g <pkg>@latest`，卸载使用 `npm uninstall -g <pkg>`。
- 需要安装脚本或 optional 平台包时，仅添加该工具所需的单次 npm 参数；不改全局 .npmrc、不自动升级 npm。
- 没有官方 npm 分发的工具不能通过添加 curl/brew 命令绕过当前产品合同，需先明确支持范围。
- `src/core/detection.ts` 的 PATH 与常见目录策略通常可复用。特殊布局只新增有一手依据的路径，不以配置目录作为安装证明。
- 执行使用 executable/args 数组，工具后的原始参数保留。禁止 shell 字符串拼接。
- 发现与管理所有权不同：可启动外部安装，不可用当前 npm 卸载另一来源。

## 验收

新增对应快捷启动映射、版本读取、npm 参数及 PATH/非 PATH 发现测试。使用临时目录和伪 CLI/npm，不安装真实工具。检查入口帮助和未知工具提示中的名单、双语文案、README 工具表和 CHANGELOG。

依次运行 `pnpm build`、`pnpm test`、`pnpm typecheck`。不通过修改工具计数代替行为验收；不为本次登记提交 tag 或发布。
