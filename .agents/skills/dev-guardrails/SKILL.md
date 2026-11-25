---
name: dev-guardrails
description: 将已经识别的重复工程错误或容易被绕过的关键约束，落实为类型、接口、状态所有权、lint、CI 或其他可执行检查，并证明它能拦住真实问题。用于“避免反复犯错”“把这条约束落到代码”或明确要求的工程原则、TypeScript 规则与注释策略审查。
---

# 让工程约束落在真实结构上

先理解已经识别的问题、受影响代码、已有约定和用户授权，再选择成本相称的约束。交付保护机制及其行为证据；一般设计、缺陷修复和代码审查仍由各自任务负责，可按需要使用本包原则，不重启整套工作。

用原则名称引导智能体、查看全部 24 条原则的分组与实际提示示例，见`dev-help`（原则使用指南）。指南按名称指向本技能维护的完整规则；说明规则实际改变了哪个决定，不只报名称。

## 使用顺序

1. **明确保护对象。** 找出行为契约、数据与状态所有者、失败边界、兼容要求和实际证据。已有结构适用就复用，不为原则重写项目。
2. **选择相关原则。** 围绕保护对象从下表读取完整方法，说明它改变了哪个选择、依据是什么。下表是实现约束时的资料导航，不要求每次修改运行全部检查。
3. **实施或审查。** 尊重请求是否允许改代码。结构、测试时机和工具方式服从任务，不预设单一开发方法。无独立代理时直接执行，说明复核独立性限制。
4. **验证实际行为。** 核验契约与关键失败，不把类型检查、lint 或自述当作全部证明。只为具体剩余风险扩大检查；范围外发现单独报告。
5. **保留有用约束。** 已有记录负责同一规则时更新它。代码能表达的规则尽量由类型、结构或检查负责；背景理由放项目文档，指向源码与版本。可使用[约束记录](assets/constraint.md)。

## 结构、边界与并发

| 问题 | 完整方法 |
| --- | --- |
| 布尔量、分支、数据形状散落 | [领域结构](references/domain-structure.md) |
| 类型不能阻止非法组合 | [类型纪律](references/type-discipline.md) |
| TypeScript 规则与全部代码示例 | [TypeScript 方法](references/typescript-method.md)、[完整模式](references/typescript-patterns.md) |
| 校验与框架代码深入业务内部 | [边界纪律](references/boundary-discipline.md) |
| 崩溃、重试、部分执行改变结果 | [操作幂等](references/idempotence.md) |
| 多个执行者写同一个对象 | [共享状态隔离](references/shared-state.md) |
| 迁移内部 API | [迁移调用者](references/migrate-callers.md) |
| 基础结构与功能的顺序 | [基础性思考](references/foundations.md) |

## 判断、简化与工作组织

| 问题 | 完整方法 |
| --- | --- |
| 同一前提下连续修复失败 | [质疑前提](references/question-premise.md) |
| 只在症状位置加防护 | [修复根因](references/root-causes.md) |
| 新需求硬接到旧设计 | [重新设计](references/redesign.md) |
| 包装层与隐藏状态难追踪 | [减少读者负担](references/reader-load.md) |
| 差异和抽象膨胀 | [最小改动](references/minimal-change.md)、[先删后加](references/subtract-first.md) |
| 重复工作或结论无法复查 | [可重跑工具](references/repeatable-tools.md) |
| 同样指令反复出现 | [经验进入结构](references/structural-learning.md) |
| 相同错误反复被纠正 | [错误分型与约束证明](references/recurring-corrections.md) |
| 新交互或结构无先例 | [设计比选](references/design-alternatives.md)、[体验优先](references/experience-first.md) |
| 迁移有明确阶段边界 | [面向结果执行](references/outcome-execution.md) |
| 工作拆分缺少可靠检查点 | [可验证单元](references/verifiable-units.md) |
| 可逆工作反复等待继续口令 | [授权内推进](references/authorized-progress.md) |
| 上下文被大量资料挤满 | [上下文预算](references/context-budget.md) |

## 证明与注释

| 问题 | 完整方法 |
| --- | --- |
| 只靠自述或替代指标 | [真实证据](references/real-evidence.md) |
| 测试锁死实现或没有辨别力 | [行为验证](references/behavior-tests.md) |
| 数字更好但原因不明 | [解释数字](references/explain-numbers.md)、`dev-benchmark`（测量检查） |
| 项目要求清理冗余注释或抑制项 | [可选注释审查](references/comment-review.md)、[独立审查任务书](references/comment-reviewer.md) |

注释审查是可选项目策略，不默认删除全部注释。保留法律许可、公共 API 契约、无法从代码重建的理由、真实外部限制和仍未被结构保证的安全约束。不能因为暂时不懂就删除，也不能为消除注释扩大重构范围。

“经验进入结构”不等于每个缺陷新增 lint。先确认规则稳定、可机械判断、能捕获真实问题，评估误报与维护成本。判断性经验仍可用简短文字和反例保存。

## 交付

说明适用原则、保护对象、实际改动或发现、验证证据，以及未解决约束。不输出与本次任务无关的完整清单。新增项目资料统一以 `.agents/dev/` 为根：当次记录放 `.agents/dev/changes/<日期-主题>/`，长期理由放 `.agents/dev/notes/`。不把目标项目事实写入技能安装目录。
