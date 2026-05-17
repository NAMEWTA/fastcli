---
name: event-driven-design
type: architecture-rule
description: >-
  事件驱动架构（EDA）设计模式——事件定义、发布/订阅、事件溯源、幂等性、顺序保证。当系统需要异步解耦、跨服务协同或行为审计时触发。
  触发词：事件驱动、EDA、消息队列、pub/sub、事件溯源、CQRS、异步。
version: '1.0.0'
author: 'specforge'
---

# 事件驱动架构设计

## Iron Law

> **事件是事实，不是命令。** 事件描述「已经发生」的业务事实；命令描述「希望发生」的动作。混淆二者会把耦合偷偷塞回来。

## 什么时候用 EDA

| 场景 | 是否适合 |
| ---- | -------- |
| 跨服务的状态变更通知（下单 → 库存/支付/通知） | ✅ 非常适合 |
| 需要行为审计 / 回放 / 复原的业务 | ✅ 考虑事件溯源 |
| 读写模式严重分离（写少读多 + 复杂视图） | ✅ 考虑 CQRS |
| 强一致性 + 低延迟事务 | ❌ 用同步调用 + 本地事务 |
| 简单 CRUD 系统，无跨边界协同 | ❌ 引入复杂度不划算 |

## 事件定义规范

### 命名

- 使用**过去时 + 领域词汇**：`OrderPlaced`、`PaymentConfirmed`、`UserDeactivated`。
- 禁止命令式命名：`CreateOrder`（这是命令）、`ProcessPayment`（这是 RPC）。
- 包含业务语义：`InventoryDeducted` 优于 `StockChanged`。

### 必备字段

每个事件必须包含：

| 字段           | 说明                                           |
| -------------- | ---------------------------------------------- |
| `eventId`      | 全局唯一 ID（UUID），用于去重                  |
| `eventType`    | 事件类型（如 `OrderPlaced`）                   |
| `eventVersion` | 事件 schema 版本（语义化版本）                 |
| `occurredAt`   | 事件发生时间（ISO 8601，带时区）               |
| `aggregateId`  | 所属聚合根 ID（如订单号）                      |
| `payload`      | 业务数据（仅包含事件发生时的不变事实，非指针） |
| `metadata`     | 追踪信息（correlationId、causationId、userId） |

### 版本化

- **兼容性优先**：新增字段默认 optional；删除/重命名字段必须升级 `eventVersion`。
- **多版本共存**：消费者应能读取旧版本事件，直至所有生产者迁移完成。

## 发布 / 订阅模式

### 选择传输层

| 需求                 | 推荐                 |
| -------------------- | -------------------- |
| 高吞吐、持久化、回放 | Kafka / Pulsar       |
| 低延迟、轻量         | NATS / Redis Streams |
| 简单队列 + 重试      | RabbitMQ / SQS       |
| 云原生托管           | SNS+SQS / EventBridge / Pub/Sub |

### 消费语义

- **At-least-once**（默认）：消费者必须实现**幂等性**。
- **At-most-once**：极少数容许丢失的审计流场景。
- **Exactly-once**：通常是幻觉，多数基于事务性 outbox + 幂等消费模拟。

### 幂等性实现

1. 使用 `eventId` 作为幂等键，消费前查重。
2. 乐观锁 / 版本号控制聚合状态更新。
3. 副作用（发邮件、调用外部 API）前先写入「已处理」状态。

## 事件溯源（Event Sourcing）

### 什么时候考虑

- 需要审计完整历史
- 需要时点回放或「what-if」分析
- 业务流程复杂，状态推导规则多变

### 核心约束

- **事件不可变**：一旦写入，不得修改。纠错通过补偿事件（`OrderRefunded`）。
- **聚合通过重放构建**：从 0 重放所有事件还原当前状态；用快照优化性能。
- **投影（Projection）**解耦读模型：多个视图独立订阅并构建自己的查询结构。

## 顺序与一致性

- **同一聚合内有序**：通过分区键（`aggregateId`）保证单一分区。
- **跨聚合无序**：接受最终一致性；需要强顺序时回归单体事务。
- **Outbox 模式**：业务事务 + 事件写入同一数据库事务，后台 relay 投递到 broker，避免双写不一致。

## 多语言落地参考

| 能力                 | Java                              | Python                 | Go                 | Node.js               |
| -------------------- | --------------------------------- | ---------------------- | ------------------ | --------------------- |
| Kafka 客户端         | `spring-kafka` / `kafka-clients`  | `aiokafka` / `confluent-kafka` | `franz-go` / `sarama` | `kafkajs`             |
| Outbox 模式          | Debezium CDC                      | Debezium CDC           | Debezium CDC       | Debezium CDC          |
| Schema Registry      | Confluent Avro / Protobuf         | 同左                   | 同左               | 同左                  |
| 事件存储（ES）       | `axon-framework` / EventStoreDB   | `eventsourcing`        | 自实现 + PG        | `node-eventstore`     |

## 反模式

| 反模式                           | 问题                                   | 修正                                         |
| -------------------------------- | -------------------------------------- | -------------------------------------------- |
| 事件承载「指令」                 | 生产者跨边界支配消费者                 | 重命名为过去时，仅描述事实                   |
| 把事件当 RPC 返回值              | 消费者等待「响应事件」                 | 用同步接口或 saga/流程管理器                 |
| 事件 payload 引用外部可变状态    | 回放时读到错误数据                     | 事件中固化事实快照                           |
| 单分区瓶颈                       | 为保证全局有序导致吞吐失败             | 按聚合分区，放弃跨聚合全局有序               |
| 无 Schema Registry               | 生产者改字段，消费者崩溃               | 引入 schema 注册与兼容性校验                 |
| 忽视死信队列（DLQ）              | 坏消息反复重试拖死消费者               | DLQ + 告警 + 人工处置工具                    |

## 设计自检清单

- [ ] 每个事件都是「已发生」的事实，命名为过去时。
- [ ] 定义了 `eventId` / `eventVersion` / `occurredAt` / `aggregateId`。
- [ ] 分区键策略与顺序需求匹配。
- [ ] 消费者实现了幂等性。
- [ ] 关键路径采用 Outbox 或 CDC 避免双写。
- [ ] Schema 注册 + 向后兼容规则明确。
- [ ] 死信队列 + 监控告警就位。
- [ ] ADR 中记录了传输层、消费语义、回放策略的选择理由。
