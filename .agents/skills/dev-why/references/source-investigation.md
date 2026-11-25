# 来源调查手册

按当前实际能力为各证据类别安排独立或顺序调查，每个调查简报只附下面对应来源的实际手册。手册中的产品名、工具名、参数与命令是具体能力示例，不是环境保证。先检查已提供工具的元数据与参数，再将查询意图映射到实际可用且获授权的读取操作；没有对应能力时记录缺口，不调用不存在的工具。版本控制可使用真实可用的本地命令或仓库连接器；同类别的其他连接器按相同证据目标适配。

| 类别 | 手册 | 文档中的 MCP 示例 |
|---|---|---|
| 版本控制历史 | [source-code-history.md](source-code-history.md) | git、`gh` |
| 问题／工单系统 | [source-issues.md](source-issues.md) | Linear（适配 Jira、GitHub Issues、Plane、Shortcut） |
| 长篇文档 | [source-documents.md](source-documents.md) | Notion（适配 Confluence、Google Docs、Coda） |
| 团队即时聊天 | [source-conversations.md](source-conversations.md) | Slack（适配 Discord、Microsoft Teams、Mattermost） |
| 基础设施可观测性 | [source-telemetry.md](source-telemetry.md) | Datadog（适配 New Relic、Honeycomb、Grafana、Splunk） |
| 错误／异常追踪 | [source-errors.md](source-errors.md) | Sentry（适配 Rollbar、Bugsnag、Airbrake） |
| 产品分析仓库 | [source-analytics.md](source-analytics.md) | Databricks SQL（适配 Snowflake、BigQuery、ClickHouse、dbt） |

跨类别补充：

- [incident-investigation.md](incident-investigation.md)。当目标代码看起来具有防御性时加入（空值检查、重试、超时、限流、功能开关、出站访问保护、OOM 处理器）。
