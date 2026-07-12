# fastcli

AI CLI 工具的统一命令行管家——安装、运行、管理所有 AI 编程工具和开发工具。

## Language

**Tool（工具）**：
由 fastcli 管理的一个 CLI 工具，可通过命令行安装、运行、卸载。
_Avoid_: package, app, program

**Builtin Tool（内置工具）**：
随 fastcli 二进制发布的工具规格，仅包含元数据（id、name、npmPackage），不写入 `~/.fastcli/tools.json`。命令字符串在运行时根据包管理器动态生成。
_Avoid_: system tool, default tool

**User Tool（用户工具）**：
由用户通过 `fastcli add` 创建或手动编辑 `tools.json` 自定义的工具。source 字段强制为 `'user'`。
_Avoid_: custom tool, local tool

**Operation / op（操作）**：
工具上可执行的命名动作，例如 `install`、`uninstall`、`danger`、`docs`。每个操作映射到一条命令链；值为 `undefined` 表示该操作未配置。
_Avoid_: action, command（命令是操作的下层概念）

**Command Chain（命令链）**：
一个操作对应的有序 shell 命令序列，类型为 `string[]`。单条命令使用单元素数组表示，绝不使用裸字符串。
_Avoid_: script, command list

**Registry（注册中心）**：
内置工具与用户工具的合并集合（`Map<id, ToolEntry>`）。用户条目与内置条目 id 冲突时，用户条目覆盖内置条目并打印一次性 warn。
_Avoid_: tool store, tool list

**Package Manager（包管理器）**：
决定内置工具命令模板生成方式的配置项（`volta` 或 `npm`）。切换后重新启动即生效，无需修改源码或 tools.json。
_Avoid_: pm（仅在代码内部使用）

**Resolver（解析器）**：
纯函数。输入 ToolEntry + 操作名，执行 `{{name}}` / `{{version}}` 白名单变量替换，返回判别联合 `{ kind: 'ok', commands }` | `{ kind: 'unconfigured', availableOps }`。无 I/O，无副作用。
_Avoid_: command builder, command generator

**Executor（执行器）**：
将命令字符串交给系统 shell（`/bin/sh -c` 或 `cmd.exe`）执行。职责：打印 `$ <command>`（不可绕过）、spawn 子进程、信号转发（SIGINT/SIGTERM）。始终返回 `ExecResult`，绝不抛异常。
_Avoid_: runner, launcher, shell wrapper
