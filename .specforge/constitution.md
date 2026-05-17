---
name: 'specforge-cli-constitution'
type: 'constitution'
version: '1.1.0'
author: 'wta'
description: '@namewta/specforge 本仓库的治理宪法；列出所有后续阶段（requirements → evolution）必须通过的硬门禁原则。'
---

# SpecForge CLI 宪法（Constitution）

> 本文件是框架资产（`.specforge/`），但其内容由本项目**显式**声明，`specforge update` 不应覆盖本文件（若发生覆盖，以 `specforge/constitution.md` 的用户副本为准；如未来迁移到用户资产，这里将降级为机器源索引）。
>
> 适用范围：`@namewta/specforge` 本仓库自举场景。下游被初始化项目的宪法由其自行制定。
>
> 语义：每条原则都是**不可协商的硬约束**。任何阶段（requirements / design / planning / implementation / quality / release / evolution）的产物、提交、PR、发布均须通过这些原则的检查；违反必须阻断推进。

## 版本

- **当前版本**：`1.1.0`
- **语义化版本规则**：
  - MAJOR：移除或根本性重定义原则
  - MINOR：新增原则或实质性扩展
  - PATCH：澄清措辞、修正错别字
- **修改流程**：修改时必须在本文件底部追加 Sync Impact Report（日期 / 版本 / 变更摘要 / 影响范围）。

## 原则

### P1 — 双目录边界不可跨越

- **statement**：业务事实（spec / brainstorming / context / changes / archive / project.md / 项目级 config.yaml）一律写入 `specforge/`；框架资产（commands / skills / templates / 框架级 config.yaml / extensions.yaml）一律写入 `.specforge/`。`specforge update` 只能触碰 `.specforge/`。
- **rationale**：跨越边界意味着下一次框架升级会清掉用户数据，或让框架资产无法重生成。这是 SpecForge 自举的根基。
- **source**：OpenSpec 双目录模型；AGENTS.md §2.1；本仓库长期运营经验。

### P2 — 元数据统一 5 字段

- **statement**：所有 command 与 skill 的 frontmatter 必须且仅必须使用五字段：`name / type / description / version / author`。command 的 `type` 以 `-command` 结尾；skill 的 `type` 不以 `-command` 结尾。
- **rationale**：统一元数据是 `specforge list` / `specforge doctor` / 三级渐进披露的所有自动化的前提；类型后缀即契约，直接决定路由。
- **source**：AGENTS.md §2.4；`src/core/type-values.ts`；`src/core/metadata-schema.ts`。

### P3 — 三级渐进披露契约

- **statement**：
  - L1 Always（frontmatter）：`description ≤ 200 字符`
  - L2 On Trigger（正文）：`≤ 500 行`
  - L3 On Demand（`references/` / `scripts/` / `templates/`）：**必须从 L2 被引用**
- **rationale**：AI 代理的上下文窗口是稀缺资源；超契约就会让命中率和成本同时恶化。违例由 `specforge doctor --check-disclosure` 捕获并抛 `E005_contextOverload`。
- **source**：Anthropic skills 渐进披露方法；AGENTS.md §2.5。

### P4 — `src/` 与 `templates/` 语义双写

- **statement**：修改 `templates/` 下任何模板必须同步更新 `src/services/scaffold-service.ts` 与相关集成测试（`tests/integration/scaffold-templates.test.ts`）；修改 CLI 行为必须同步更新对应 `commands` / `services` / 单元测试。缺一不可合并。
- **rationale**：本仓库的核心价值在于"模板机器源与 CLI 行为严格一致"；双写不一致会让用户看到假文档或得到坏脚手架。
- **source**：AGENTS.md §7.2；仓库历史事故。

### P5 — ESM + NodeNext 合规

- **statement**：源码所有相对 import 路径必须显式带 `.js` 后缀；`tsconfig.json` 的 strict 与 NodeNext 设置禁止任何局部 downgrade；异步统一 `async/await`，禁用 `.then` 链。
- **rationale**：NodeNext 不带 `.js` 会直接在运行时报错；strict 的局部放开会让类型错误泄漏到 CLI 用户。
- **source**：AGENTS.md §7.3；`tsconfig.json`；Node 官方 ESM 规范。

### P6 — 发布走 tag，不走本地

- **statement**：npm 发布只能通过打 `v*` tag 触发 `.github/workflows/release.yml`，该流水线执行 setup → lint → test → build → verify-bin → `pnpm publish --provenance --access public` → GitHub Release。`package.json#version` 必须与 tag 对齐。**禁止**任何本地 `npm publish` / `pnpm publish`。
- **rationale**：`prepublishOnly = pnpm check` 是硬门禁，但本地绕过风险太高；`--provenance` 发布链需要 CI 身份。tag 是审计线。
- **source**：`.github/workflows/release.yml`；`package.json`；AGENTS.md §7.5。

### P7 — Conventional Commits + 中文描述

- **statement**：提交 type 前缀使用英文（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:`），描述体使用中文。禁止直接推 `main`。涉及模板或 CLI 对外行为的改动必须同步更新 `CHANGELOGS.md` 的 `[Unreleased]` 段。
- **rationale**：前缀英文驱动自动化（changelog、PR 标签、release notes）；描述中文匹配团队与用户习惯。changelog 是外部用户与 AI 代理理解版本差异的唯一事实来源。
- **source**：AGENTS.md §7.5 与"语言与本地化"小节；`.github/workflows/label-pr.yml`。

### P8 — 产物 DAG 即硬门禁

- **statement**：阶段推进必须满足产物 DAG 的依赖（`proposal → design → tasks → quality-report → archive → retrospective`；`tasks` 同时依赖 `proposal` 与 `design`）。缺前置产物时 `specforge status --check-requires` 必须阻断，AI 代理不得绕过。
- **rationale**：绕过 DAG 等于回到"聊天窗口跳步"的旧模式，SpecForge 失去意义。`BLOCKED / READY / DONE` 是方法论的齿轮。
- **source**：`src/core/artifact-graph.ts`；AGENTS.md §2.2 与 §6.3。

### P9 — 反重复与验证前置（antiRepetitionAndEvidence）

- **statement**：对同一根因的重试，AI 代理必须书面回答「本次尝试与第 N 次失败的差异是 X」；
  若无法回答差异，必须停下并反问用户。清窗 / 重启前必须落盘 PROGRESS
  （`specforge/changes/<change-id>/progress/<task-id>-PROGRESS.md`），
  恢复后第一动作为读取 PROGRESS 的「已排除方案」段。
  验证前置 Iron Law 适用于所有阶段（requirements / design / planning / implementation /
  quality / release / evolution）——无新验证证据禁止声称完成。
- **rationale**：反重复与验证前置是 AI 协作的底线纪律；放在 rules 层会被"时间紧急"借口绕开。
  升为宪法原则后，任何阶段推进都不得绕开。
- **source**：flow-kit R1.1 / R1.5 / R1.6 / R6.1 / R6.3；AGENTS.md §7.4；
  本仓库 2026-05-11 flow-kit-integration change。

## Sync Impact Report

| 日期 | 版本 | 变更摘要 | 影响范围 |
| ---- | ---- | -------- | -------- |
| 2026-05-10 | 1.0.0 | 首次制定：从 AGENTS.md 抽取 8 条不可协商原则（P1–P8），作为后续阶段的硬门禁。 | 所有 workflow command；`specforge doctor`；CI（后续可加 constitution 校验） |
| 2026-05-11 | 1.1.0 | 新增 P9（反重复与验证前置） | implementation-build / quality-verify / context-reset-protocol skill / 全阶段验证前置 |

## 引用与沉淀

- 可执行条款已同步沉淀到 `specforge/config.yaml#rules.project`，供 AI 代理与自动化检查引用。
- 相关错误沉淀见 `specforge/config.yaml#errors` 与 `.specforge/config.yaml#errors`。
- 本宪法由 `foundation-init` 命令生成并可由 `evolution-retrospect` 提议变更。
