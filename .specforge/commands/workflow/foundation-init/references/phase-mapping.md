# 8 阶段 ↔ 核心机制/技能映射

> 展示每个阶段对应的核心机制与技能映射。

## 阶段映射表

| 阶段 | 命令 | 核心机制 | 关键技能 |
|------|------|---------|---------|
| **Foundation** | foundation-init | 双目录结构、宪法治理、Preamble 初始化 | 项目上下文采集、双目录结构、宪法制定、Profile 选择 |
| **Requirements** | requirements-clarify | 多维分类、多视角提问、方案对比 | 6维度分类法、12视角提问、方案探索对比矩阵、HARD-GATE 批准 |
| **Design** | design-explore | 多视角审查、宪法合规、接口契约 | CEO/工程/设计/DevEx 四视角审查（0-10分）、接口契约、宪法合规检查 |
| **Planning** | planning-breakdown | 文件结构先行、小步骤拆解、DAG 编排 | 文件结构先行、小步骤拆解（2-5分钟）、复杂度分析、DAG 依赖编排、禁止占位符 |
| **Implementation** | implementation-build | 子代理驱动、TDD 红绿重构、分层审查 | 三层子代理审查（implementer→spec-reviewer→code-quality-reviewer）、TDD 红绿重构、反馈修复循环 |
| **Quality** | quality-verify | 分层测试、三维验证、并行审查 | 分层测试（Quick/Standard/Exhaustive）、三维验证（Completeness/Correctness/Coherence）、7专家并行审查 |
| **Release** | release-deploy | 发布验证、语义化版本、运维移交 | 发布前验证、语义化版本、CHANGELOG、Git 标签、runbook/监控/告警/回滚移交、归档 |
| **Evolution** | evolution-retrospect | 流程回顾、经验沉淀、TDD 迭代优化 | 流程回顾、经验沉淀、TDD 迭代技能优化、项目调优、复盘报告 |

## 核心机制详解

### 1. 6 维度需求分类法（requirements-clarify）

- **功能范围**（Functional Scope）：核心功能边界、用户角色、优先级
- **领域与数据模型**（Domain & Data Model）：核心实体、数据流向、一致性要求
- **交互与用户体验**（Interaction & UX）：交互方式、关键流程、错误状态
- **非功能质量属性**（Non-Functional Quality）：性能、安全、可用性
- **集成与依赖**（Integration & Dependencies）：外部系统、接口协议、降级策略
- **边界情况**（Edge Cases）：极端输入、并发冲突、失败模式

### 2. 12 视角提问框架（requirements-clarify）

**核心视角（必问）**：
- 第一性原理：不考虑现有方案，最直接的解决方式？
- 意图与期望结果：用户真正想要达成什么？
- 约束暴露：有哪些已知但未言明的约束？

**风险视角（选问 2-3 个）**：
- 隐藏假设挖掘：方案建立在哪些未验证的假设上？
- 事前验尸（Pre-mortem）：假设项目失败，最可能的原因？
- 钢铁人反论（Steel-manning）：反对这个方案的最强论点？
- 边界测试：在什么条件下这个方案会崩溃？

**扩展视角（按需）**：
- 第二选择、受众视角、可逆性、可持续性

### 3. 三视角技术审查（design-explore）

| 视角 | 维度 | 目标分数 |
|------|------|---------|
| **工程视角** | 架构合理性、数据流设计、边界与接口、性能考量、错误处理 | >= 8/10 |
| **设计视角** | 组件设计、交互一致性、抽象层级、可测试性 | >= 8/10 |
| **开发者体验** | API 易用性、调试友好度、文档完整度 | >= 8/10 |

### 4. 任务复杂度分析（planning-breakdown）

| 级别 | 标准 | 处理 |
|------|------|------|
| **S（简单）** | 单一文件、单一关注点、无外部依赖 | 正常执行 |
| **M（中等）** | 多文件、单一模块、有外部依赖 | 注意审查 |
| **L（复杂）** | 跨模块、多依赖、需数据迁移 | 标注 [COMPLEX]，建议拆解 |
| **XL（极复杂）** | 跨系统、架构变更、多团队协作 | 必须拆解为 2+ 个子任务 |

### 5. 三层子代理审查（implementation-build）

```
implementer → spec-reviewer → code-quality-reviewer
     ↓              ↓                  ↓
  TDD 实现      规格对照审查        风格/安全/性能审查
     ↓              ↓                  ↓
  返回实现      PASS/NEEDS_FIX      Critical/Important/Minor
```

### 6. 7 专家并行审查（quality-verify）

| 专家 | 审查范围 | 关注点 |
|------|---------|--------|
| security | 安全审查 | SQL 注入、XSS、权限绕过、敏感数据泄露 |
| testing | 测试审查 | 测试覆盖、边界用例、Mock 合理性 |
| performance | 性能审查 | N+1 查询、内存泄漏、算法复杂度 |
| api-contract | API 契约审查 | 接口一致性、向后兼容、错误码规范 |
| data-migration | 数据迁移审查 | Schema 变更安全、回滚方案 |
| maintainability | 可维护性审查 | 代码重复、命名清晰度、模块耦合 |
| red-team | 红队审查 | 对抗性测试、异常输入、故障注入 |

### 7. TDD 迭代技能优化（evolution-retrospect）

1. **基线测试**：观察 Agent 在没有该技能时的失败模式
2. **编写/修改技能**：针对差距编写或改进 SKILL.md
3. **压力测试**：在极端条件下测试（时间压力、范围压力、风险场景）
4. **堵漏洞**：发现并反驳 AI 可能用来绕过技能规则的借口
5. **重新验证**：更新后在相同场景下复测，确认改进有效

## 错误字典引用

| 错误编号 | 错误名称 | 触发场景 | 处理方式 |
|---------|---------|---------|---------|
| E001 | missingPrerequisiteArtifact | 缺少前置产物 | 回到对应上游阶段补齐 |
| E002 | unapprovedSolution | 方案未批准/验收标准不可度量 | 禁止进入 design-explore |
| E003 | contractMissing | 缺少接口契约/错误策略 | 必须补齐后才能进入下一阶段 |
| E004 | noVerificationEvidence | 未提供亲自运行的测试 PASS 输出 | 禁止进入下一阶段 |
| E005 | contextOverload | 文档膨胀导致上下文过载 | 移动到 references/，保持渐进式披露 |
