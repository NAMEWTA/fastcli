---
name: tdd-workflow
type: testing-strategy
description: >-
  测试驱动开发（TDD）流程规范——Red / Green / Refactor 三步循环、测试先行铁律、测试粒度与命名约定。当实现新功能、修复 bug 或重构时触发。
  触发词：TDD、测试驱动、Red-Green-Refactor、测试先行、failing test、kata。
version: '1.0.0'
author: 'specforge'
---

# TDD 流程规范

## Iron Law

> **先有一个失败的测试，才能写生产代码。** 每次写生产代码前，必须能指出「我正在让哪个测试变绿」。

TDD 不是测试技术，是**设计技术**。它用测试的视角逼迫你先想清楚「输入 / 输出 / 可观测行为」，再决定如何实现。

## 三步循环

### 🔴 Red：写一个失败的测试

1. 从最小的行为增量出发（能在 5-10 行测试代码里验证）。
2. 只测试**期望的行为**，不测试实现细节。
3. 运行测试，确认它**因为正确的原因**失败（例如：方法不存在、返回值错误，而非编译错误）。

### 🟢 Green：用最少的代码让测试通过

1. 写**刚好够**让这个测试通过的代码，不多不少。
2. 允许「丑陋」的实现（硬编码、重复）——还没到重构阶段。
3. 运行所有测试，确认刚才那个红的变绿，其他的仍然绿。

### 🔵 Refactor：在绿灯下清理

1. 只有所有测试都通过时才进入 refactor。
2. 每次小步重构后立即重跑测试。
3. 可以重构生产代码，也可以重构测试代码（去重、命名、结构）。
4. 重构不引入新行为；如果想到新行为，回到 Red 阶段。

> **循环周期**：一次 Red→Green→Refactor 建议 5-15 分钟。超过 30 分钟仍没到 Green，说明步子迈太大，回退。

## 测试粒度

| 层级         | 特征                                     | 占比      | 执行时间   |
| ------------ | ---------------------------------------- | --------- | ---------- |
| 单元测试     | 纯函数 / 单一模块；无 I/O 依赖           | 60-70%    | 毫秒级     |
| 集成测试     | 跨模块 / 含真实数据库或消息队列          | 20-30%    | 秒级       |
| 端到端测试   | 完整流程通过公开入口调用                 | 5-10%     | 数十秒级   |

**经验法则**：TDD 主要在单元和集成层面展开。E2E 测试更适合用作已完成功能的回归保险，而非驱动设计。

## 测试命名约定

### 结构化命名：`given_when_then` 或 `should_when`

- `should_returnEmptyList_whenInventoryIsEmpty`
- `given_expiredToken_when_authenticate_then_throwUnauthorized`

### Arrange-Act-Assert（AAA）组织

```ts
it('should calculate total with tax when cart has items', () => {
  // Arrange
  const cart = new Cart();
  cart.add({ price: 100, qty: 2 });

  // Act
  const total = cart.totalWithTax(0.1);

  // Assert
  expect(total).toBe(220);
});
```

**原则**：一个测试只断言一个行为。如果需要多个 `expect`，它们应当描述同一事实的不同侧面。

## 测试先行的豁免情境

TDD 铁律在以下情境可放宽（但必须记录）：

| 情境                          | 替代做法                                 |
| ----------------------------- | ---------------------------------------- |
| 原型 / spike / 可行性验证     | 丢弃代码后重新用 TDD 实现                |
| 已有大量遗留代码              | 用「Characterization Test」锁定当前行为后再改 |
| UI 像素级微调 / CSS 样式      | 可视化验证为主                           |
| 纯配置 / 静态模板             | 集成测试覆盖即可                         |

**禁止豁免**：「我很熟这块」「赶时间」「先写完再补」——这些不是理由，是后悔的开始。

## 与渐进式披露的结合

在 SpecForge 流程中，TDD 对应 `implementation` 阶段的硬门禁：
- `rules.implementation.hardGates` 要求「禁止在测试之前编写生产代码」。
- 验证证据（`rules.quality.verification`）必须来自真实运行的测试命令输出。

## 多语言落地参考

| 能力           | Java                       | Python                  | Go                | Node.js          |
| -------------- | -------------------------- | ----------------------- | ----------------- | ---------------- |
| 单元测试框架   | JUnit 5 + AssertJ          | pytest                  | 内置 `testing`    | Vitest / Jest    |
| Mock / Stub    | Mockito                    | `unittest.mock` / `pytest-mock` | `gomock` / `testify/mock` | `vi.mock` / `jest.mock` |
| 参数化         | `@ParameterizedTest`       | `@pytest.mark.parametrize` | Table-driven test | `it.each()`      |
| 覆盖率         | JaCoCo                     | `coverage.py`           | 内置 `-cover`     | c8 / istanbul    |
| 断言风格       | AssertJ fluent             | 内置 assert             | `testify/assert`  | Vitest expect    |

具体运行命令见 `skills/workflow-steps/language-adapters/` 中对应语言的适配器。

## 常见反模式

| 反模式                            | 问题                             | 修正                                 |
| --------------------------------- | -------------------------------- | ------------------------------------ |
| 先写生产代码再补测试              | 测试对齐实现而非需求，设计反馈丢失 | 回到 Red 阶段，先写测试再重做实现    |
| 一个测试断言太多行为              | 失败信息难以定位原因               | 按行为拆分多个测试                   |
| 过度使用 mock                     | 测试锁定实现，重构就崩             | 用真实依赖或轻量 fake，减少对 mock 依赖 |
| 忽略 refactor 阶段                | 技术债持续累积                     | Green 后立即执行 refactor 步骤       |
| 测试互相依赖顺序                  | 并行化或跳过单个测试就全红         | 每个测试独立建立 / 清理状态          |
| 测试套件几十秒运行                | 反馈周期长，TDD 难以为继            | 单元测试控制在秒级，集成测试另行标签 |

## 自检清单

- [ ] 本次变更的每个生产代码行都能指向一个驱动它出现的失败测试。
- [ ] 所有测试都通过（`pnpm test` 或语言适配器对应命令）。
- [ ] 近期运行过重构步骤，消除了明显重复。
- [ ] 测试命名清晰表达行为而非实现。
- [ ] 单元测试无外部 I/O；需要 I/O 的放入集成测试层。
- [ ] 覆盖率达到项目阈值，新增公共 API 均有测试。
