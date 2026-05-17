# 8 阶段 ↔ 命令 ↔ 参考机制映射

> 使用场景：写某个阶段的 command 时，想知道“该阶段常见产物 / 门禁 / 触发词 / 参考机制”都有哪些。
> 本文件是导航表，不是细节书。细节回到 `.specforge/config.yaml` 的 `rules.<phase>` 与 `handoffs.<command>`。

---

## 映射总览

| Phase | 典型命令 | 主要产物 | HARD-GATE | 参考机制 |
| ----- | -------- | -------- | ---------- | -------- |
| foundation | `foundation-init` | `project.md`、宪法、Profile | 宪法条款必须可执行 | 宪法治理（spec-kit）、初始化模式（OpenSpec） |
| requirements | `requirements-clarify` | proposal（目标/范围/验收） | 方案未批准禁止 design | 多视角提问（grill-me）、brainstorming（OpenSpec） |
| design | `design-explore` | 架构设计、接口契约、错误策略 | 无契约禁止 planning | 多维评审（gstack）、多视角审查 |
| planning | `planning-breakdown` | tasks.md（依赖、验收、并行） | 无依赖/验收禁止 impl | 小步骤拆解、复杂度分析（claude-task-master） |
| implementation | `implementation-build` | 源码、测试 | 不先写测试禁止写生产代码 | 子代理 + TDD（superpowers-zh）、三层审查 |
| quality | `quality-verify` | 测试报告、审查记录 | 无新验证证据禁止声称完成 | qa / review / verify 并行（superpowers-zh） |
| release | `release-deploy` | 发布说明、runbook、监控配置 | 无 runbook 禁止上线 | ship / archive / runbook（superpowers-zh） |
| evolution | `evolution-retrospect` | 复盘记录、改进项、知识沉淀 | 复盘需落点（context/rules/skills） | plan-tune / skillify / writing-skills |

---

## 阶段关键问题清单

写某阶段命令前，先回答这些问题（答不上 → 先读 `.specforge/config.yaml` 对应 `rules.<phase>`）：

### foundation
- 本命令要不要生成双目录结构？
- 是否需要引导用户制定宪法？
- Profile 选择流程放在哪步？

### requirements
- 如何收集利益相关者？
- 验收标准怎么写才算“可度量”？
- `[NEEDS CLARIFICATION]` 如何闭环？

### design
- 接口契约要包含哪些字段（输入/输出/错误/约束）？
- 错误分类与错误码策略？
- 数据流 / 状态机什么时候必要？
- 测试策略怎么分层（单元 / 集成 / E2E）？

### planning
- 任务依赖如何表达？
- 哪些任务可以 `[P]` 并行？前提条件是什么？
- 复杂度拆分的阈值（如单任务 > 2 小时强制拆）？

### implementation
- TDD 的豁免条件？如何记录豁免理由？
- 子代理何时介入？
- “三层审查”指的是哪三层？

### quality
- 验证证据的最低可信形式？
- 何时必须跑完整测试套件？
- 如何区分 linter 通过 / 手动验证 / 真实验证？

### release
- runbook 必备章节？
- 监控与告警应覆盖哪些信号？
- 回滚阈值如何写？

### evolution
- 复盘如何避免流水账？
- 改进项如何落位（commands / skills / context / rules）？

---

## 何时读取该映射

- 写新命令不确定该放哪些 Section 时。
- Enrich 模式下，要把外部资料归入某阶段前核对“本阶段真正需要什么”。
- review 模式下，判断某命令是否偏离其 Phase 定位。

---

## 与机器源的关系

| 信息 | 权威来源 |
| ---- | -------- |
| HARD-GATE 阻断条件 | `.specforge/config.yaml → rules.<phase>.hardGates` |
| 产物必需章节 | `.specforge/config.yaml → rules.<phase>.artifacts` |
| 下一步命令 | `.specforge/config.yaml → handoffs.<command>.next` |
| 错误码 | `.specforge/config.yaml → errors.E00X_*` |

**原则**：命令正文里的阶段门禁必须与 config.yaml 对齐；不要在两处维护两套事实。

---

## 需要补充新阶段？

SpecForge 当前只支持 8 阶段；`operations` 已合并进 `release`。**不要私自新增阶段**。
如果用户诉求需要新阶段，先评估能否拆解到现有阶段的 Step 或 tool-command，再决定是否发起升级讨论。
