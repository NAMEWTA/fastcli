# FastCLI Superpowers 使用总览

本文基于 `.agents/skills/*/SKILL.md` 的实际内容整理，覆盖当前仓库中的 19 个本地技能：
- 流程主线技能
- 质量与验证技能
- 并发与协作技能
- 中国团队适配技能
- 专项领域技能

目标是两件事：
1. 完整描述每个技能的用途、触发时机、核心做法与产出。
2. 给出一套可执行的技能工作流顺序（含分支场景）。

---

## 一、技能完整说明（19 项）

## 1) using-superpowers
- 定位：所有会话的入口路由技能。
- 何时用：开始任何响应之前（包括澄清问题前）。
- 核心规则：只要有 1% 可能适用某技能，就必须先调用对应技能；流程技能优先于实现技能。
- 关键补充：支持“中式技能路由”（中文审查、中文文档、中文提交、国内 Git 平台、MCP 构建）。
- 产出：确定后续应该调用的技能集合与顺序。

## 2) brainstorming
- 定位：创造性任务的前置设计技能。
- 何时用：新增功能、改行为、搭组件等任何“要做设计”的任务，在实现前必须使用。
- 核心步骤：探索上下文 → 单问题澄清 → 提供 2-3 方案并权衡 → 分段确认设计 → 写设计文档 → 规格审查循环 → 用户确认。
- 硬门禁：未完成设计并得到批准前，不得进入实现。
- 产出：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` 规格文档，并过审。

## 3) writing-plans
- 定位：把规格转成可执行实现计划。
- 何时用：已有规格或明确需求、准备动手编码前。
- 核心步骤：先定义文件职责与边界，再把任务拆到 2-5 分钟粒度，且每步包含 TDD 动作与验证命令。
- 强调原则：DRY、YAGNI、TDD、频繁 commit。
- 产出：`docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`，并经计划审查循环。

## 4) using-git-worktrees
- 定位：实现前的隔离工作区管理。
- 何时用：开始功能开发或执行计划之前。
- 核心步骤：目录优先级选择（`.worktrees` > `worktrees` > CLAUDE.md > 询问用户）→ 忽略校验 → 创建工作树 → 安装依赖 → 基线测试。
- 风险控制：若项目本地工作树目录未被 ignore，必须先修复 `.gitignore`。
- 产出：隔离分支 + 干净基线环境。

## 5) subagent-driven-development
- 定位：同一会话内的“任务级子智能体执行框架”（推荐）。
- 何时用：已有实现计划，且任务相对独立。
- 核心机制：每任务一个新子智能体 + 两阶段审查（先规格合规，再代码质量）+ 问题闭环重审。
- 约束：规格审查未通过前不得做代码质量审查；任一审查不过不得进入下任务。
- 产出：按任务稳定推进的高质量实现与审查记录。

## 6) executing-plans
- 定位：在当前会话按书面计划批量执行（子智能体不可用时的替代）。
- 何时用：有现成计划，需要按任务推进并设置检查点。
- 核心步骤：先批判性审查计划，再逐任务实现/验证/提交，遇阻塞即停并回报。
- 检查点：每完成约 3 个任务做一次整体回顾。
- 产出：任务完成报告，并移交分支收尾。

## 7) finishing-a-development-branch
- 定位：开发完成后的分支收尾决策。
- 何时用：实现完成且测试通过后，准备合并/提 PR/保留/丢弃。
- 核心步骤：先跑测试门禁，再给 4 选项（本地合并、推送建 PR、保持现状、丢弃工作），按选择执行并清理。
- 高风险动作：丢弃必须二次确认（输入 `discard`）。
- 产出：可追踪的集成结论与工作树清理状态。

## 8) test-driven-development
- 定位：实现与修复的编码纪律。
- 何时用：功能、修复、重构、行为变更。
- 核心规则：没有失败测试，不写生产代码；红-绿-重构循环严格执行。
- 禁止项：先写代码后补测（需删除重来）。
- 产出：可证明行为正确且可回归的测试资产。

## 9) systematic-debugging
- 定位：问题排查方法论。
- 何时用：任何 bug、异常、测试失败、构建失败、性能问题。
- 核心阶段：根因调查 → 模式比对 → 假设验证 → 单点修复（结合 TDD）。
- 关键门槛：未完成根因调查前，不提修复方案；连续失败 3 次以上要质疑架构。
- 产出：基于证据的根因与修复，而非猜测补丁。

## 10) verification-before-completion
- 定位：完成声明前的证据门禁。
- 何时用：宣称“完成/通过/修复”之前，提交/PR/推进任务前。
- 核心动作：确定命令 → 实际运行 → 读完整输出/退出码 → 证据支持结论。
- 原则：无新鲜验证证据，不得宣称成功。
- 产出：可审计的完成证据链。

## 11) requesting-code-review
- 定位：主动请求代码审查的流程技能。
- 何时用：任务完成后、重要功能后、合并前。
- 核心动作：确定 base/head SHA，分派 code-reviewer，按严重级别处理反馈。
- 融合场景：可嵌入子智能体开发或计划执行节奏中。
- 产出：结构化审查意见与修复闭环。

## 12) receiving-code-review
- 定位：接收审查意见后的处理纪律。
- 何时用：收到 review 反馈后、实施前。
- 核心动作：先理解与验证，再逐项实施；不明确先澄清；外部反馈要技术性核实。
- 行为要求：拒绝敷衍附和，允许基于证据反驳。
- 产出：高质量反馈落地与误审查纠偏。

## 13) dispatching-parallel-agents
- 定位：独立问题并行分派策略。
- 何时用：存在 2 个以上独立问题域、无共享状态、可并发。
- 核心动作：按问题域拆分、给每个智能体自包含上下文、并发执行后统一集成验证。
- 不适用：问题强耦合或共享状态重。
- 产出：并行提速且冲突可控的问题修复结果。

## 14) mcp-builder
- 定位：MCP 服务器构建专项方法论。
- 何时用：设计、实现、测试、部署 MCP 服务时。
- 覆盖内容：Tools/Resources/Prompts 选型、参数与描述规范、错误处理、安全、测试、发布与调试。
- 关键约束：stdio 协议下避免 `console.log` 污染通信；强调可操作错误信息与 `isError: true`。
- 产出：生产级 MCP 服务设计与交付清单。

## 15) chinese-code-review
- 定位：中文团队代码审查表达规范。
- 何时用：中文语境的 code review。
- 核心做法：建议式表达 + 分级标签（必须修复/建议修改/仅供参考/问题）+ 聚焦逻辑安全性能。
- 额外规范：中英混排注释、中文 commit 场景建议。
- 产出：专业且可被接受的审查反馈。

## 16) chinese-commit-conventions
- 定位：中文团队提交规范与自动化约束。
- 何时用：中文项目编写 commit message。
- 核心内容：Conventional Commits 中文适配、Body/Breaking Change/Issue 关联、commitlint + husky + lint-staged。
- 强调：type 英文，scope/description 可中文，支持 changelog 自动生成。
- 产出：可机器解析且可读性高的提交历史。

## 17) chinese-documentation
- 定位：中文技术文档写作规范。
- 何时用：编写中文 README、接口文档、技术方案、说明文档。
- 核心内容：中英数字空格、全半角标点、术语保留与翻译边界、API 双语模板、结构化写作。
- 目标：消除“机翻味”和欧化长句，提升可读性。
- 产出：统一且专业的中文技术文档。

## 18) chinese-git-workflow
- 定位：国内平台与团队习惯的 Git 工作流规范。
- 何时用：使用 Gitee/Coding/极狐 GitLab 等国内环境时。
- 核心内容：平台适配、分支模型（主干开发/Git Flow/简化流）、分支命名、PR 模板、CI 映射。
- 配套：国内网络与工具链配置建议。
- 产出：适配国内团队协作的稳定 Git 流程。

## 19) writing-skills
- 定位：编写/修改技能文档本身的方法论。
- 何时用：创建新技能、改进技能、发布前验证技能有效性。
- 核心思想：把 TDD 应用于技能文档，先做失败场景再写技能，再迭代堵漏洞。
- 关键要求：frontmatter 规范、CSO（技能可发现性）、反合理化设计、部署前必须测试。
- 产出：可被稳定触发并有效执行的技能资产。

---

## 二、技能工作流顺序（推荐主线）

下面是“从接需求到收尾”的默认顺序。若某步骤不适用可跳过，但门禁类技能不能跳。

1. `using-superpowers`
- 会话入口，先做技能路由判断。

2. `brainstorming`（有创造性/需求不明确时）
- 输出并确认规格文档。

3. `writing-plans`
- 把规格转成可执行计划。

4. `using-git-worktrees`
- 建立隔离工作区，跑基线测试。

5. 选择执行模式（二选一）
- 推荐：`subagent-driven-development`
- 替代：`executing-plans`

6. 执行期横切技能（按场景插入）
- 开发实现：`test-driven-development`
- 遇到问题：`systematic-debugging`
- 多问题可并发：`dispatching-parallel-agents`
- 阶段审查：`requesting-code-review`
- 接收反馈落地：`receiving-code-review`

7. 完成声明前
- `verification-before-completion`

8. 分支收尾
- `finishing-a-development-branch`

---

## 三、场景化分支顺序

## A. 中文团队协作分支
在主线任意阶段叠加：
1. 中文审查阶段：`chinese-code-review`
2. 提交阶段：`chinese-commit-conventions`
3. 文档阶段：`chinese-documentation`
4. 平台/流程阶段：`chinese-git-workflow`

说明：这些是“风格与协作层”技能，通常和主线流程技能叠加，而不是替代主线。

## B. MCP 开发分支
在设计/实现 MCP 服务时叠加：
1. 先走主线（`brainstorming` → `writing-plans` → 执行模式）
2. 在实现阶段启用 `mcp-builder`
3. 继续走验证与收尾（`verification-before-completion` → `finishing-a-development-branch`）

## C. 技能体系建设分支
当目标是“编写技能”时：
1. `using-superpowers`
2. `writing-skills`
3. 仍执行 `verification-before-completion`
4. 最后 `finishing-a-development-branch`

---

## 四、门禁规则（必须遵守）

- 设计门禁：`brainstorming` 未完成批准前，不进入实现。
- 测试门禁：`test-driven-development` 要求先红后绿，禁止先码后测。
- 调试门禁：`systematic-debugging` 未做根因分析前，不提修复方案。
- 完成门禁：`verification-before-completion` 无新鲜证据不得宣称完成。
- 收尾门禁：`finishing-a-development-branch` 展示选项前需测试通过。

---

## 五、最简执行清单（可直接照做）

1. 会话开始：`using-superpowers`
2. 需求/功能变更：`brainstorming`
3. 设计确认后：`writing-plans`
4. 开发前：`using-git-worktrees`
5. 执行计划：优先 `subagent-driven-development`，否则 `executing-plans`
6. 执行中：`test-driven-development` +（若出问题）`systematic-debugging`
7. 多独立问题：`dispatching-parallel-agents`
8. 阶段质检：`requesting-code-review` + `receiving-code-review`
9. 宣称完成前：`verification-before-completion`
10. 合并/PR/保留/丢弃：`finishing-a-development-branch`

中文团队请在对应环节叠加：`chinese-code-review`、`chinese-commit-conventions`、`chinese-documentation`、`chinese-git-workflow`。

MCP 项目请在实现环节叠加：`mcp-builder`。
