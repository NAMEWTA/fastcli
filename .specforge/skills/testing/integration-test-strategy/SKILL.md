---
name: integration-test-strategy
type: testing-strategy
description: >-
  集成测试策略——测试范围界定、测试替身选择、数据准备、外部依赖治理、并发与稳定性。当跨模块协作、依赖数据库 / 消息队列 / 外部 API 时触发。
  触发词：集成测试、integration test、contract test、test containers、外部依赖、数据库测试、mock vs real。
version: '1.0.0'
author: 'specforge'
---

# 集成测试策略

## Iron Law

> **集成测试的价值来自「真实依赖」，不是「更多断言」。** 如果把依赖全 mock，就退化成慢版本的单元测试，失去跨边界正确性验证的意义。

## 什么是集成测试（本文边界）

本文讨论的「集成测试」指**模块与外部组件交互**的测试：

- 模块 ↔ 数据库
- 模块 ↔ 消息队列 / 缓存
- 模块 ↔ 文件系统
- 模块 ↔ 第三方 HTTP API
- 多个内部模块组合工作（无 UI）

不包含端到端（E2E）测试——那是用户视角的黑盒流程验证。

## 测试金字塔定位

```
       ┌─────────┐
       │  E2E    │   5-10%
       ├─────────┤
       │  集成   │   20-30%
       ├─────────┤
       │  单元   │   60-70%
       └─────────┘
```

- 集成测试介于单元与 E2E 之间：比单元慢，但比 E2E 可控、稳定、可调试。
- 目标：**验证模块边界契约与外部依赖的真实行为**（如 SQL 方言、消息顺序、API 错误格式）。

## 测试范围选择

### ✅ 适合集成测试

| 场景                              | 原因                                   |
| --------------------------------- | -------------------------------------- |
| SQL 查询 / 索引 / 事务语义        | 单元 mock 无法发现 SQL 方言差异        |
| 消息队列的分区、顺序、重试语义    | broker 行为需真实环境                  |
| 缓存的 TTL、序列化、并发冲突      | 需验证 Redis/Memcached 实际行为        |
| 第三方 API 的错误码、限流、鉴权   | contract test + wiremock 回放          |
| 迁移脚本对真实 schema 的影响      | 直接跑 migration                       |

### ❌ 不适合集成测试（应下沉或上移）

| 场景                              | 处理方式                           |
| --------------------------------- | ---------------------------------- |
| 纯业务规则                        | 下沉到单元测试                     |
| UI 交互、浏览器行为               | 上移到 E2E                         |
| 跨多个微服务的完整用户旅程        | 上移到 E2E 或契约测试              |

## 测试替身选择

| 类型        | 说明                               | 何时使用                               |
| ----------- | ---------------------------------- | -------------------------------------- |
| **真实依赖**    | 容器化（Testcontainers）启动真实组件 | 默认选择，尤其是 DB / 消息队列         |
| **Fake**    | 轻量等价实现（如内存数据库）       | 真实依赖启动代价过高且行为可等价       |
| **Stub**    | 返回预设响应                       | 第三方 API 不可达、无沙箱环境         |
| **Mock**    | 验证交互次数 / 参数                | 仅在需要断言「怎么调用」而非「调用什么」时 |
| **Wiremock / MSW** | 录制回放 HTTP 依赖               | 外部 API 集成测试                      |

**默认倾向**：优先使用 Testcontainers 起真实的 PostgreSQL/Redis/Kafka，而不是内存替身。替身偏差带来的假阳性比测试慢一点的代价大得多。

## 数据准备与隔离

### 隔离策略

- **事务回滚**：每个测试开事务，结束回滚。简单但对跨事务行为不适用。
- **Schema 级隔离**：每个测试一个 schema；结束 drop。
- **容器级隔离**：每套测试独立容器；最慢但最干净，适合并行测试。
- **应用层清理**：测试后删除业务数据；简单但易漏。

### 数据填充

- **Factory / Builder 模式**：用代码构造测试数据，避免 fixture 文件漂移。
- **最小有效数据集（MVDS）**：每个测试只准备它真正需要的数据。
- **确定性**：避免依赖当前时间、随机 UUID；用注入的 clock / id 生成器。

## 外部 HTTP 依赖

### 本地策略

1. **契约测试（Consumer-Driven Contract）**：用 Pact / Spring Cloud Contract 在双方独立演进时保持兼容。
2. **Wiremock / MSW**：在 CI 回放预先录制的响应。
3. **沙箱环境**：第三方官方提供的 staging endpoint；注意速率限制与凭证管理。

### 失败模拟

真实世界的失败多样，集成测试必须覆盖：

- 超时 / 慢响应
- 429 限流 / 503 不可用
- 不合法 JSON / 半包响应
- DNS 解析失败
- 中途断连（断点续传）

工具：`toxiproxy`、`wiremock` fault injection、本地 chaos proxy。

## 并发与稳定性

- **禁止依赖执行顺序**：测试必须可单独、可乱序运行。
- **禁止共享可变状态**：全局单例、静态变量、共享连接池需在每个测试重置。
- **避免 Sleep**：用条件等待（poll until）而非 `Thread.sleep(1000)`。
- **控制 flakiness**：同一测试连跑 100 次都不应偶然红。CI 上用 `--repeat-each` 抽查。

## 运行与分层

- 单独的 `integration-test` 任务与 CI stage，与单元测试区分。
- 标签化（`@IntegrationTest` / `-tags=integration` / `describe.concurrent`）区别执行。
- 本地默认跑单元，CI 必跑单元+集成，`pre-merge` 门禁包含集成。

## 多语言落地参考

| 能力              | Java                            | Python                    | Go                              | Node.js                      |
| ----------------- | ------------------------------- | ------------------------- | ------------------------------- | ---------------------------- |
| 容器化依赖        | Testcontainers-Java             | `testcontainers-python`   | `testcontainers-go`             | `testcontainers`             |
| HTTP Mock         | Wiremock / MockWebServer        | `responses` / `pytest-httpx` | `httptest` / `gock`          | MSW / nock                   |
| 契约测试          | Pact-JVM / Spring Cloud Contract | `pact-python`            | `pact-go`                       | `@pact-foundation/pact`      |
| 数据库迁移验证    | Flyway / Liquibase + Testcontainers | Alembic + testcontainers | `golang-migrate` + testcontainers | `knex` / Prisma migrate + testcontainers |
| 消息队列          | EmbeddedKafka / Kafka testcontainer | `aiokafka` + testcontainer | `confluent-kafka-go` + testcontainer | `kafkajs` + testcontainer    |

## 常见反模式

| 反模式                         | 问题                                       | 修正                                       |
| ------------------------------ | ------------------------------------------ | ------------------------------------------ |
| 所有依赖都 mock                | 集成测试退化为慢速单元测试                 | 关键依赖用真实或 testcontainer 版本        |
| 共享单一数据库不清理           | 测试互相污染，失败难复现                   | 事务回滚或 schema 隔离                     |
| 依赖网络到 staging 环境         | CI 不稳定，凭证外泄风险                    | 本地容器化或契约测试                       |
| 没有超时 / 失败路径测试        | 只有 happy path，生产事故频发              | 显式覆盖超时、5xx、限流等                  |
| 用 `sleep` 等待异步结果        | 不稳定、慢                                 | 使用条件等待与超时组合                     |
| 集成测试混杂在单元测试套件     | 本地跑测试慢，开发者跳过                   | 分层、分标签、独立 CI stage                |

## 自检清单

- [ ] 关键外部依赖（DB / MQ / 缓存 / 第三方 API）使用真实或 testcontainer 版本。
- [ ] 每个测试独立准备与清理数据，互不影响。
- [ ] 覆盖成功路径与关键失败路径（超时、限流、错误码）。
- [ ] 无 `sleep`；异步验证使用条件等待。
- [ ] 第三方 API 依赖有契约测试或录制回放。
- [ ] 集成测试在独立 CI 阶段运行，失败不与单元失败混淆。
- [ ] 测试可重复运行，不依赖执行顺序，不依赖当前时间。
