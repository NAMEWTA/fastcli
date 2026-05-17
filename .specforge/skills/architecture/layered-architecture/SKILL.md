---
name: layered-architecture
type: architecture-rule
description: >-
  分层架构约束——展示层 / 应用层 / 领域层 / 基础设施层的职责边界与单向依赖规则。当新增模块、评审分层越界、或拆分 monolith 时触发。
  触发词：分层架构、依赖倒置、干净架构、六边形架构、hexagonal、层级约束、依赖方向。
version: '1.0.0'
author: 'specforge'
---

# 分层架构约束

## Iron Law

> **依赖方向只能向内。** 外层依赖内层，内层**绝不**依赖外层。违反这一条，分层架构就退化成「命名好看的大泥球」。

## 四层模型

| 层级                   | 职责                                                | 典型产物                              |
| ---------------------- | --------------------------------------------------- | ------------------------------------- |
| **展示层 (Presentation)** | 适配外部世界：HTTP 路由、CLI、UI、RPC 入口          | Controller、Route、CLI Command        |
| **应用层 (Application)**  | 用例编排：事务边界、跨领域对象协调、权限/审计       | Service、UseCase、CommandHandler      |
| **领域层 (Domain)**       | 业务核心：实体、值对象、领域服务、领域事件          | Entity、ValueObject、DomainService    |
| **基础设施层 (Infrastructure)** | 外部依赖实现：数据库、消息队列、第三方 API、文件系统 | Repository 实现、Adapter              |

## 依赖规则

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                 (接口在 Domain 声明，实现在 Infrastructure 注入)
```

- **单向依赖**：箭头方向严禁逆转。
- **领域层是同心圆的中心**：它不知道外部世界存在。
- **基础设施通过接口注入**：领域层声明接口（Repository / Port），基础设施提供实现（Adapter），通过 DI 组装。

## 禁区清单

| 动作                                       | 判定   | 说明                                       |
| ------------------------------------------ | ------ | ------------------------------------------ |
| Controller 调用 Repository                 | ❌ 越界 | 必须经过 Application 层编排               |
| Domain 实体直接调用 HTTP Client            | ❌ 越界 | 通过 Port + Adapter 注入                   |
| Domain 引用 ORM 注解（如 JPA `@Entity`）   | ⚠️ 妥协 | 如必须，限定在仓储映射对象，不污染聚合根   |
| Application 返回数据库实体                 | ❌ 越界 | 返回 DTO / VO，隔离领域模型                |
| Infrastructure 调用 Application Service    | ❌ 越界 | 反向依赖，改为事件发布或领域事件订阅       |
| 横向层间引用（同层模块互相污染）           | ⚠️ 慎用 | 优先通过领域事件或抽象接口解耦             |

## 六边形（端口-适配器）映射

若采用六边形架构，对应关系：

| 四层模型       | 六边形       |
| -------------- | ------------ |
| Presentation   | Driving Adapter（驱动适配器） |
| Application    | Application Core 用例        |
| Domain         | Application Core 实体/聚合   |
| Infrastructure | Driven Adapter（被驱动适配器）|

端口（Port）就是 Domain / Application 定义的接口；适配器（Adapter）是 Infrastructure / Presentation 实现。

## 模块组织建议

### 按层垂直分包（易上手）

```
src/
  presentation/
  application/
  domain/
  infrastructure/
```

### 按领域水平分包（大型系统）

```
src/
  order/
    presentation/
    application/
    domain/
    infrastructure/
  payment/
    presentation/
    application/
    domain/
    infrastructure/
```

**经验**：超过 5 个领域时改为水平分包；单领域用垂直分包避免早期过度设计。

## 多语言落地参考

| 能力 / 实现        | Java (Spring Boot)                     | Python                           | Go                               | Node.js (NestJS)                   |
| ------------------ | -------------------------------------- | -------------------------------- | -------------------------------- | ---------------------------------- |
| 依赖注入           | Spring `@Service` / `@Repository`      | `dependency-injector` / 手动注入 | 手动注入 / wire                  | `@Injectable()` + DI 容器          |
| 展示层             | `@RestController`                      | FastAPI `APIRouter`              | `net/http` + chi/gin             | `@Controller`                      |
| 应用层             | `@Service` + `@Transactional`          | 纯类 + unit-of-work              | 纯函数 / struct                  | `Service` + `@Transactional`       |
| 领域层             | Entity/VO POJO                         | dataclass / pydantic             | struct                           | class + pure function              |
| 基础设施层         | JPA Repository / Feign                 | SQLAlchemy / httpx               | GORM / sqlc                      | TypeORM / Prisma / undici          |
| 依赖倒置           | Interface + `@Component`               | Protocol / ABC                   | interface                        | Interface + DI Token               |

## 代码评审自检

- [ ] 没有控制器直接访问数据库或第三方 API。
- [ ] Domain 层没有 import 基础设施包或框架注解（框架侵入降至最低）。
- [ ] Repository 接口定义在 Domain 层，实现在 Infrastructure 层。
- [ ] Application Service 方法是以**用例**命名（`placeOrder` 而非 `insertOrder`）。
- [ ] 跨层返回值经过 DTO 转换，未泄漏领域对象到展示层。
- [ ] 事务边界在 Application 层明确标注。
- [ ] 新增模块目录结构与现有层级约定一致。

## 反模式

| 反模式              | 问题                             | 修正                                       |
| ------------------- | -------------------------------- | ------------------------------------------ |
| 贫血领域模型        | 领域层只有 getter/setter，逻辑散落 | 把与实体相关的不变量与行为归还 Domain        |
| Service 胖得像神    | 所有业务都往 Service 塞           | 按用例拆分；把规则归还领域对象              |
| 跨层大实体          | Entity 同时带持久化 + 序列化注解  | 区分领域实体与持久化对象 / DTO             |
| Utility 类反噬      | 各种 Helper 静态类横跨层级        | 改为领域服务或应用服务，明确所属层         |
| 直接使用框架异常    | Domain 抛出 HTTP 异常             | Domain 抛业务异常，Presentation 层做映射   |

## 进一步阅读

- 《Clean Architecture》— Robert C. Martin
- 《Implementing Domain-Driven Design》— Vaughn Vernon
- 《Hexagonal Architecture》— Alistair Cockburn（原始论文）
