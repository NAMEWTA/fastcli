# Databricks 分析与系统表

## 这个来源包含什么

Databricks 是产品分析、数据管道和仓库遥测层。它与 Datadog 互补。Datadog 提供*基础设施／运行时*视角，Databricks 提供*产品／数据*视角（用户做了什么、运行过哪些实验、功能使用如何演变、某个阈值常量从何而来）。

- **产品分析事件。** `your_warehouse.events.analytics_track_event`（原始表），以及 `<your_analytics_db>.<schema>.<table>` 中按事件划分、带类型且去重的 dbt 模型。用户行为包括功能调用、点击、接受／拒绝、提交、客户端报告的错误。
- **用量与计费事件。** `your_warehouse.events.usage_event` / `<your_analytics_db>.<schema>.stg_usage_events`，以及 `your_warehouse.events.raw_model_event` / `<your_analytics_db>.<schema>.stg_raw_model_events`。用于调查由成本或规模推动的决定。
- **实验／功能开关数据。** 曝光与结果表。**Schema 因公司而异。** 假定名称前先用 `SHOW TABLES` 探查。
- **系统表。** `system.query.history`、`system.compute.warehouses`、`system.billing.*`、`system.access.audit`。回答“这条查询是否昂贵？”“有人多频繁地运行它？”“仓库负载何时突增？”
- **dbt 血缘。** `<your_analytics_db>.<schema>` 中的模型揭示哪些管道依赖某个表／字段。上游变化经常促成消费方代码的修改。
- **Databricks 笔记本。** 工程师在代码变更之前编写的探索性分析。**无法通过 SQL MCP 查询。** 如果怀疑理由存在于笔记本中，应将它列为缺口。

## 如何搜索

已连接分析仓库时，使用其实际提供的只读查询工具。下文表名、列名、dbt 命名、去重与刷新方式是一套示例数据布局，不代表所有仓库。先查当前模型定义、表注释和元数据，必要时使用 `SHOW TABLES`／`DESCRIBE TABLE`，核实真实名称、类型、时间列、去重规则与可用历史，再改写查询。不能因为示例给出了字段就跳过核实。如果工具返回查询标识，使用实际状态查询接口轮询，不重复执行。

**查询前先确认环境。** Schema 因公司而异。在相信某个表名之前先探查：

```sql
SHOW TABLES IN <your_analytics_db>.<schema> LIKE '*<keyword>*';
DESCRIBE TABLE <your_analytics_db>.<schema>.stg_<event>;
```

**每条查询都限定时间。** 这些表很大，无约束扫描会超时。使用已核实的时间列筛选覆盖上线日期的窗口；本示例分别使用 `_timestamp`（事件）或 `start_time`（`system.query.history`），通常为前后各约 30 天，仅在有充分理由时扩大。

**优先使用已经核实语义的带类型 dbt 模型，而非直接读原始表。** 在本示例布局中，`<your_analytics_db>.<schema>.<table>` 已去重、带类型，并采用液态聚簇；原始 `your_warehouse.events.analytics_track_event` 有重复项，`properties_json` 未展开为带类型列。这些是需要核实的模型属性，不能从“使用 dbt”推断它们自动成立。示例命名模式为 `stg_<source>_<event_name_with_underscores>`，其中 `<source>` 是 `app`、`backend`、`website` 或 `cli`；使用当前模型文件与 `SHOW TABLES` 确认实际名称。没有适合的模型，或需要查询实际刷新延迟窗口内的事件时，才退回原始表，并按当前数据契约处理重复项。

**示例布局的列约定**（先依据当前模型或 `DESCRIBE TABLE` 核实，不能把它们当作所有 dbt 模型的标准列）：

- `_timestamp`、`_id`、`_auth_id`、`_request_id`、`event_name`。本示例模型共享的列。
- `properties_<name>`。带类型、下划线命名的事件属性（`properties_entrypoint`、`properties_size_bytes` 等）。
- `context_team_id`、`context_client_version`、`context_country`、`context_client_os`。预先提取的客户端背景。

### 往往有效的调查模式

选择与目标相符的表和列组合：

1. **事件使用轨迹。** 在 PR 合并前后各 30 天内，对相关 `stg_*` 模型按日计数。如果合并后一两天内从零阶跃为稳定数量，这是 PR 发布了该功能的强情境证据。逐渐降至零则暗示弃用或删除。
2. **保护限制／防御检查的来源。** 查看 PR *之前* 14 天内相关 `properties_<name>` 列的分布（中位数／p99／最大值）。如果 p99 与目标阈值常量一致，暗示该数值可能根据数据选定。
3. **实验／功能开关查询。** 使用 `SHOW TABLES ... LIKE '*experiment*'` 查找曝光表，再按变体提取 PR 日期附近相关开关键的曝光计数。
4. **迁移、回填或性能重写的查询历史证据。** 在狭窄的 `start_time` 窗口内，用 `statement_text ILIKE '%<table_or_symbol>%'` 筛选 `system.query.history`，找出很可能促成变更的昂贵查询（按 `total_duration_ms` 排序，或聚合 `SUM(read_bytes)`、`COUNT(*)`）。
5. **dbt 血缘。** 如果目标读取或写入 `<your_analytics_db>.<schema>` 模型，模型自身在本仓库的 git 历史通常记录了理由。把这条线索交回 git 调查者，而不是自行追查。

## 这里的好证据是什么样

除了上述模式形态：

- 在防御性代码 PR 之后的几天，某类错误事件的计数降至接近零。暗示 PR 解决了这类错误。
- 曝光表中的某一行提到目标功能开关键，并在 PR 上线日期附近记录“已发布”／“已结束”的决定。

## 常见陷阱

- **有埋点 ≠ 因果关系。** 某个事件存在，只能说明有人认为它值得记录，不能说明目标代码*因为*它而存在。在声称因果关系之前，与 git 调查者提供的 PR／提交引证配对。
- **无声的埋点变化。** 事件数量阶跃可能表示开始记录了一个新事件，而不是用户行为变化。把上升解读为功能发布信号前，先检查同一窗口内的埋点 PR。
- **Schema 漂移。** 事件属性会演变。今天带类型 dbt 模型上的列，在目标代码编写时可能还不存在。旧数据可能只在原始 `properties_json` 内携带这个属性。
- **dbt 刷新延迟。** 先核实 `<your_analytics_db>.<schema>.*` 的实际更新计划、增量方式与延迟；每小时或每天重建只是示例。需要覆盖尚未刷新窗口时，可查询已确认的原始表；本示例为 `your_warehouse.events.*` 并按 `_id` 去重，实际去重键和规则以数据契约为准。
- **公司特有的表。** 实验、功能开关、计费和用量表各不相同。对从未确认存在的表报告结果，是典型失败方式。先用 `SHOW TABLES`／`DESCRIBE TABLE` 探查。
- **保留期限断点。** 如果相关时间早于表的数据保留范围或 dbt 模型创建日期，这是*缺口*，不是空结果。明确指出，避免综合者把“没有结果”当成“没有活动”。
- **笔记本不可查询。** SQL MCP 看不到 Databricks 笔记本。如果怀疑理由在其中，返回一项缺口。

## 返回什么

对每项相关发现：
- 类型（产品事件／实验曝光／用量或计费事件／系统表行／dbt 模型）
- 完全限定的表名，以及实际运行的精确查询
- 查询的时间窗口
- 简洁的数值摘要（计数、分位数、首次／最后出现时间）。**不要倾倒原始行。**
- 与目标上线日期的时间关联（例如“首行日期 2024-08-15，PR #49074 于 2024-08-14 合并”）
- 相关性与强度：直接／情境／弱
