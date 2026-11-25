# 本地 PR 观察

PR 观察器读取真实 GitHub 状态，返回可核对的阻塞与观察结果。交付裁决仍按任务授权和实际验证确定。

`SKILL_DIR` 表示本技能 `SKILL.md` 所在目录，本文件的上一级目录。下面的目标仓库、PR 编号和目录需要换成当前任务的真实值。

## 运行条件

| 工具 | 必需条件 | 未满足时 |
|---|---|---|
| PR 观察器 | Node.js 22.14 或更高版本；真实查询需要已认证的 `gh` 和对应仓库读取权限。 | 没有 `gh` 或读取权限时明确报告查询失败。 |

运行时要求记录在[工具包声明](../scripts/local-tools/package.json)中。脚本仅使用 Node 标准库，无需 `npm install` 或编译；文件统计、JSON 解析与文本检索也在 Node 内完成。工具不会自行创建循环任务、安装运行时、登录账户或读取其他项目上下文。

## PR 观察器

[启动器](../scripts/local-tools/watch-pr/watch-pr.mjs)使用[命令行入口](../scripts/local-tools/watch-pr/cli.mjs)、[GitHub 读取器](../scripts/local-tools/watch-pr/github.mjs)、[判定与队列逻辑](../scripts/local-tools/watch-pr/policy.mjs)、[输出格式](../scripts/local-tools/watch-pr/render.mjs)和[值校验辅助](../scripts/local-tools/watch-pr/types.mjs)。全部功能在本包内。

先看帮助，或只读取一次状态：

```bash
node "$SKILL_DIR/scripts/local-tools/watch-pr/watch-pr.mjs" --help
node "$SKILL_DIR/scripts/local-tools/watch-pr/watch-pr.mjs" --owner OWNER --repo REPO --pr 123 --status-only --pretty
```

PR 观察器只支持 GitHub。Origin 的 PR 状态应使用其实际 CLI 直接读取，不把这个 GitHub 观察器的结论套到其他托管平台。

### 三种观察方式

| 参数 | 范围与停止含义 |
|---|---|
| `--pr 123` | 观察单个 PR，遇到阻塞、就绪、查询错误预算耗尽或超时后退出。 |
| `--pr 123 --stack` | 根据同仓库的基础分支关系发现相连的打开堆叠，按问题层级检查整个堆叠。 |
| `--queued-stack --stack-prs 123,124,125` | 使用固定的自底向上列表，保持队列快照；不会自行合并。全部已合并时才返回 `COMPLETE`。 |

队列例子：

```bash
node "$SKILL_DIR/scripts/local-tools/watch-pr/watch-pr.mjs" --owner OWNER --repo REPO --queued-stack --stack-prs 123,124,125 --interval 60 --sweep-interval 300 --timeout 1800
```

`--interval` 默认 60 秒，`--sweep-interval` 默认 300 秒，`--timeout` 默认 0，表示没有截止时间。`--max-query-errors` 默认 5，连续错误的重试间隔从至少 60 秒开始，指数退避，上限 300 秒，且不越过设定的截止时间。查询恢复后连续错误计数归零。

`--status-only` 只输出一次状态，并以 0 退出，包括队列模式；这表示查询完成，**不表示 PR 可合并**。`--allow-draft` 只是使观察器不把草稿视为阻塞，不会把 PR 标记为就绪，也不授权这样做。

### 证据与协议

检查首先读取 `gh pr checks`。结果为空或无法使用时，分页读取 GraphQL 汇总。审查讨论也逐页读取；无法读取必要证据时返回查询问题，不用空列表宣称通过。派生仓库中的同名分支不参与当前仓库父项匹配。

默认输出 JSON，轮询中逐行输出 NDJSON。`schemaVersion`、`sequence`、`observedAt`、`kind`、`terminal`、`exitCode` 等字段与判定名称保留英文，便于机器读取；`--pretty` 提供中文说明。GitHub 地址在代码中仅用于验证仓库与 PR 地址，以及构造结果中的真实 PR 链接，不是文档依赖。

| 输出或退出码 | 含义 |
|---|---|
| `QUEUE`、`STATUS` | 记录队列，或报告观察到的快照。 |
| `WAITING` | 检查仍在运行，或没有当前阻塞的前沿正在等待合并队列；队列等待不是可自动合并的许可。 |
| `ADVANCE` | 已观察到前沿合并，继续下一项。 |
| `RETRY` | 查询暂时失败，按预算重试。 |
| 0，`READY` | 观察器自身规则下没有冲突、未解决讨论、失败或待完成检查。它不代表所有平台审批均已满足，也不代表实际行为已被独立验证。 |
| 0，`COMPLETE` | 固定队列中的 PR 均已被观察为合并；不等于已部署。 |
| 2 | 合并冲突。 |
| 3 | 未解决的审查讨论。 |
| 4 | 检查失败，或 GitHub 汇总明确拒绝。 |
| 5 | 超时。 |
| 6 | 草稿、要求修改或关闭未合并等门槛。 |
| 7 | 查询证据不可用，或错误预算耗尽。 |
| 64 | 命令用法错误。 |

名为 `Code Review Gate` 的检查会单独归类，不作为普通失败或待完成检查等待人处理。依照[PR 跟进](babysit.md)区分需要人批准的事项，并在实际合并前按[交付方法](verified-landing.md)检查平台当前门槛、当前补丁证据和授权。`READY` 不能越过这些要求。
