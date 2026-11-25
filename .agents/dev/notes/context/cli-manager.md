# CLI 模块背景

## 启动和 npm 管理路径

`runCli` 优先识别内置工具 ID，然后把该 ID 后的 argv 交给 `launchTool`。后者发现入口并附加目录中的固定参数，交给结构化进程执行。菜单复用同一启动和管理动作。快捷启动无需探测目标版本，支持自更新的 TTY 路径会先检查 fastcli 自身的公开稳定版。 [命令分派](../../../../src/cli/app.ts) · [公共动作](../../../../src/cli/actions.ts) · [工具目录](../../../../src/builtin/tools.ts) · [执行器](../../../../src/core/executor.ts)

发现入口和探测版本分开。PATH 第一项保持优先，补充候选按实际路径去重。非 PATH 入口启动时可在子进程环境前置其目录以定位相邻运行时。列表以每项 3 秒、64 KiB 和最多 4 项并发为限，超时或输出溢出负责清理探测进程。 [安装检测](../../../../src/core/detection.ts) · [进程执行](../../../../src/core/executor.ts)

工具管理先解析实际 npm 及其全局环境，校验包、bin 与目标 prefix 的归属，再执行变更并核对结果。`install` 覆盖首次安装与更新。安装成功后单独报告 npm 入口及 PATH 默认入口，避免两个入口恰好同版本时把另一个安装当成本次更新目标。包级脚本兼容参数仅用于对应调用。 [npm 管理](../../../../src/core/npm-manager.ts) · [归属决定](../decisions/2026-10-16-launch-and-npm-ownership.md)

自身更新有独立的归属检查。npm 全局安装固定已核验的 prefix，Volta 更新沿用当前 Node 版本，并以已验证的包内 JavaScript 入口续跑，避免把 Windows `.cmd` shim 当成 JavaScript。 [npm 自身更新](../../../../src/core/self-update.ts) · [Volta 自身更新](../../../../src/core/volta-update.ts)

## 存储与菜单

`config.json` 的 schema 保持 `"2"`，包管理器固定 npm。迁移先用独占方式保存原始字节，再检查源文件未变并原子替换。POSIX 新写文件为 `0600`。旧 `tools.json` 原样保留。 [配置 schema](../../../../src/config/schema.ts) · [迁移](../../../../src/config/reader.ts) · [原子写入](../../../../src/config/atomic.ts)

独立的 `custom-commands.json` 保存整行命令。写入时持锁重新读取，编辑或删除时检查选中的记录是否已被其他进程改动。运行时仅由所选解释器处理整行。工具启动参数仍走结构化进程。批量菜单按列表顺序执行，错误继续，取消中止。 [自定义命令存储](../../../../src/config/custom-commands.ts) · [解释器](../../../../src/core/command-shell.ts) · [批处理](../../../../src/cli/batch.ts)

当前行为依据为提交 `b7080c7` 的源码。重构时的 [13 项设计决定](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/design-tree.json) 和[原规格](../../archive/changes/implemented/refactor_2026-10-16-ai-cli-manager/spec.md) 用于溯源。其中独立 `upgrade` 命令、快捷启动不联网和当时的菜单结构已被后续行为更新。
