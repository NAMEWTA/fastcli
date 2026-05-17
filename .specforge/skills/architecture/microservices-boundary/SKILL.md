---
name: microservices-boundary
type: architecture-rule
description: >-
  微服务边界与架构决策记录模板——定义服务边界、接口契约、数据归属、通信方式。当进行架构设计或服务拆分时自动触发。
  触发词：微服务、服务拆分、架构设计、服务边界、ADR。
version: "1.0.0"
author: "wta"
---

# 微服务边界与架构决策

## Iron Law

> **禁止未定义接口契约就开始开发。** 没有契约的微服务开发 = 集成时必定返工。

## 服务边界定义原则

### 单一职责
- 每个服务只负责一个业务领域
- 边界清晰：什么在此服务内？什么明确不在？
- 变更原因单一：一个服务只因为一个业务原因而变更

### 数据归属
- 每个数据实体只有一个"归属服务"（Owner Service）
- 其他服务通过归属服务的 API 访问该数据
- 不做跨服务的数据库直接访问

### 接口契约
- 服务间通信仅通过明确定义的 API/事件
- API 版本化管理（向后兼容为默认要求）
- 错误码统一规范

## 架构决策记录（ADR）模板

每当做出影响系统架构的决策时，创建以下格式的 ADR：

```markdown
# ADR-<序号>: <决策标题>

## 状态
提议 / 已接受 / 已废弃 / 已取代

## 背景
为什么需要做这个决策？技术或业务驱动力？

## 决策
具体做出了什么决策？

## 理由
为什么选择这个方案？

## 替代方案
考虑过哪些替代方案？为什么不选它们？

## 后果
### 正面影响
- ...

### 负面影响
- ...

### 注意事项
- ...
```

## 服务通信方式选择

| 场景 | 推荐方式 | 理由 |
|------|---------|------|
| 同步查询（需要立即响应） | HTTP/gRPC | 请求-响应模型，简单直接 |
| 异步通知（无需响应） | 消息队列 | 解耦、削峰、重试 |
| 数据同步（跨服务数据一致） | 事件溯源 / CDC | 最终一致性、可审计 |
| 高频低延迟 | gRPC + Protobuf | 二进制协议、强类型 |

## 多语言落地参考

| 通信形态 | Spring Cloud (Java) | Python (FastAPI / asyncio) | Go (chi/grpc-go) | Node (NestJS/Fastify) |
|---------|---------------------|----------------------------|------------------|----------------------|
| 同步 REST | `@FeignClient` / WebClient | `httpx.AsyncClient` | `net/http` + retryablehttp | NestJS `HttpModule` / undici |
| gRPC | `grpc-spring-boot-starter` | `grpcio` + `grpcio-tools` | `google.golang.org/grpc` | `@grpc/grpc-js` |
| 消息队列 | Spring Cloud Stream / RabbitTemplate | `aio-pika` / `aiokafka` | `confluent-kafka-go` / `nats.go` | `bullmq` / `kafkajs` |
| 服务注册/发现 | Spring Cloud Eureka / Nacos | 通常依赖 K8s Service / Consul | 同左 | 同左 |
| 配置中心 | Spring Cloud Config / Nacos | Vault / AWS Parameter Store | 同左 | 同左 |
| 链路追踪 | Spring Boot Actuator + Micrometer + OpenTelemetry | OpenTelemetry SDK Python | OpenTelemetry SDK Go | OpenTelemetry SDK Node |
| 熔断/限流 | Resilience4j | `aiobreaker` / 自实现 | `gobreaker` | `opossum` |

**约定**：跨语言项目优先使用 OpenTelemetry + Protobuf（gRPC 或 messaging schema），保持线缆格式一致；架构决策记录中应明确选择并附 ADR。

## 宪法合规自检

在制定架构决策后，对照项目宪法检查：
- [ ] 是否符合“复用优先”原则？（未重复造轮子）
- [ ] 是否符合“契约先行”原则？（接口已定义再开发）
- [ ] 服务边界是否合理？（可在白板上画出并解释）

## 反模式

| 反模式 | 说明 | 改进 |
|--------|------|------|
| 跨服务直接数据库访问 | 破坏了服务封装和数据归属 | 通过 API 或事件访问其他服务数据 |
| 分布式单体 | 服务间高度耦合，必须同时部署 | 重新划分服务边界，明确单一职责 |
| 共享数据库 | 多个服务共用同一个数据库 schema | 每个服务拥有独立的数据库，通过 API 通信 |
| 没有版本管理 | API 变更导致下游服务崩溃 | 实施 API 版本化，保持向后兼容 |
