# 本地运行环境与复现

## 必要组件

主状态图命令包含 TLA+ / TLC 解析、规则判定、图投影、状态不变量最短路径、时序反例与报告代码，仅使用运行时标准库。入口接受 `.tla` 模型及配置，不能直接读取 JavaScript 模型或其他验证器的结果；执行命令会运行 TLC。运行要求如下：

| 组件 | 要求 | 用途 |
| --- | --- | --- |
| 操作系统 | Linux、macOS 或 Windows | Node 启动器与临时目录回收；Windows 进程树清理使用系统自带的 `taskkill` |
| JavaScript 运行时 | Node.js 22.14 或更高版本 | 直接运行本技能的 `.mjs` 文件，无需编译器或其他脚本解释器 |
| Java | 11 或更高版本，按所选 TLC 版本要求核实 | 执行语法分析与模型检查 |
| TLC | 本地 `tla2tools.jar`，兼容性基线为 1.7.4 | SANY 与 TLC |
| Pele | 仅生成 SVG 时需要 `pele@1.9.0` | 本地 Mermaid 渲染 |

主命令不会下载、升级或替换这些工具。使用宿主已配置的包管理器或用户认可的安装渠道准备缺失依赖；工具安装需要网络时如实说明。核心文本报告不依赖 Pele。各平台仍须核实实际 Java、TLC 与进程终止权限；录制输出的回放通过不能代替真实 TLC 执行或进程中断验证。

TLC 1.7.4 对应 JAR 的 SHA-256 为 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。通过实际文件摘要核验，不因为文件名相同就视为同一版本。其他 TLC 版本可能改变消息协议、状态枚举或 SANY 输出，使用前运行代表性模型并记录差异。

## 命令

`SKILL_DIR` 指本技能 `SKILL.md` 所在目录。把 `RUN_DIR` 设为目标项目根 `temp/dev/` 下的本次绝对路径，不能按输入文件位置推导。下方模型与工具路径换成实际值。

```sh
export TLA2TOOLS=/absolute/tools/tla2tools.jar
export JAVA=/absolute/java/bin/java
node "$SKILL_DIR/scripts/statechart.mjs" --help
"$JAVA" -version
"$JAVA" -cp "$TLA2TOOLS" tlc2.TLC -help
node "$SKILL_DIR/scripts/statechart.mjs" /absolute/models/Reservation.tla \
  --config /absolute/models/Reservation.cfg \
  --view /absolute/models/view.mjs \
  --out "$RUN_DIR/chart"
```

`JAVA` 未设置时使用当前 PATH 中的 `java`。确认解释器与 JAR 为本次项目允许的本地工具。配置和视图文件都应可信；视图是执行的 JavaScript 模块，并非被动数据。

在 PowerShell 中以 `$env:TLA2TOOLS`、`$env:JAVA` 设置环境变量，再运行 `node "$SKILL_DIR/scripts/statechart.mjs" ...`。参数中的目录始终加引号；不需要 Bash 或 WSL。

## SVG 可选依赖

本技能[依赖清单](../scripts/package.json)固定使用 Pele 1.9.0。已授权准备依赖且环境允许联网时，可以在 scripts 目录安装；安装结果留在当前技能目录的 `node_modules` 中，不提交到本项目源码仓库。

```sh
npm --prefix "$SKILL_DIR/scripts" install --omit=dev --ignore-scripts --no-audit --no-fund
node "$SKILL_DIR/scripts/render.mjs" "$RUN_DIR/chart/chart.mmd" --out "$RUN_DIR/chart/chart.svg"
```

环境不允许获取依赖时，明确阻塞项并提供 Mermaid 文本；不要切换到未授权远程服务传送模型。已有兼容模块可以通过 `STATECHART_PELE_MODULE` 复用。

## 输出和退出码

| 结果 | 退出码 | 文件与解释 |
| --- | --- | --- |
| 原样配置的规则成立 | 0 | 写出报告与适用的图表；只说明本次模型与边界 |
| 至少一条规则被违反 | 1 | 写出报告、反例及适用图表；这是有效发现，不等于工具失败 |
| 工具错误或无法执行 | 2 | 不发布结果目录，说明实际错误 |
| 用户中断 | 130 / 143 | 不发布部分结果目录 |

报告中的“未完成检查”必须单独保留；首轮结束之后的规则重跑可能被 100,000 状态边界截断。500 状态限制只控制图的展示规模，不是系统安全标准。输出文件 `tlc.out` 和 `tlc-RULE.out` 保留 TLC 原始可复核内容。

运行使用新目录，避免覆盖已有证据。每次记录工作目录、模型和配置摘要、依赖版本、命令与结果，不保存凭据。检查结束后再清理本次任务创建的临时内容。
