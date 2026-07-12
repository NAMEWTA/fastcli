# 问题跟踪器：GitHub

该仓库的 Issues 和 PRD 以 GitHub issues 形式存在。所有操作使用 `gh` CLI。
仓库：`NAMEWTA/fastcli`

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **阅读 issue**：`gh issue view <number> --comments`，通过 `jq` 过滤评论并获取标签。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤器。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **应用 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

从 `git remote -v` 推断仓库 — 在 clone 仓库内运行时 `gh` 会自动推断。

## 将 Pull requests 作为分类处理面

**PR 作为请求处理面：否。** `/triage` 读取此标志。

## 当 skill 说"发布到问题跟踪器"时

创建一个 GitHub issue。

## 当 skill 说"获取相关工单"时

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图**是一个包含**子** issue 作为工单的单个 issue。

- **地图**：一个标记为 `wayfinder:map` 的单个 issue，包含 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **子工单**：作为 GitHub 子 issue 链接到地图的 issue（在子 issue 端点上使用 `gh api`）。在子 issue 不可用的地方，将子工单添加到地图正文的任务列表中，并在子工单正文顶部放置 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。一旦认领，工单分配给驱动开发者。
- **阻塞**：GitHub 的**原生 issue 依赖**。通过 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边。在依赖不可用的地方，回退到子工单正文顶部的 `Blocked by: #<n>, #<n>` 行。
- **前沿查询**：列出地图的开放子工单，排除任何有开放阻塞者或被分配的；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me` — 会话的首次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，然后将上下文指针追加到地图的 Decisions-so-far 中。
