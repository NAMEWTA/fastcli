# 开发技能 帮助

回答用户关于本项目技能的问题，给出一个可直接使用的提示词，并链接到包内完整材料。独立的“怎么做”问题只需解释；用户已经要求执行时继续已授权目标，不要求其再发一遍相同请求。既有任务中的提问也不自动暂停原任务。

要求执行工作，例如“用 本项目技能 修复这个 bug”，不是帮助问题。阶段明确时直接读取负责技能，如故障诊断与修复使用 `dev-debug`；需要跨阶段协调或阶段不明时读取 `dev-workflow`，并按实际宿主能力说明如何让约定持续生效。

本文将问题映射到包含答案的技能与指南页；细节由这些文件负责。在引用前读取对应文件，与本映射冲突时核对并修正导航。向用户提供当前安装包内可打开的指南路径；执行方法由对应技能唯一维护，按名称读取其入口，不用外部页面代替内容。

## 查明他们需要什么

根据消息和对话推断需求。有明确场景，例如“哪个技能审查 PR”，就直接进入对应章节。仍不清楚时，用以下选项问一个选择题，然后只回答所选部分：

- 完成配置
- 用 `$dev-workflow` 开始任务
- 为某种场景选择技能
- 修正偏离目标的执行
- 将 本项目技能 变成自己的工作方式

检查会改变答案的状态，只在确有影响时提及：

- 问题涉及运行环境、机器容量或并发安排时，复用 `.agents/dev/context/environment.md` 中适用的内容；缺失或已失效的部分，按本次任务所需的实际运行条件核对。
- 项目中没有 `dev-verify-<app>` 技能时，先核对既有脚本、应用驱动框架与 CI，不能仅凭缺少技能判断没有操作方法。问题涉及真实入口证据或维护应用验证方法时，提及 `$dev-verify`。
- 项目没有形式化验证技能时，还要检查既有模型、验证代码与 CI；仅缺少技能入口不能证明没有属性检查。问题涉及竞态、不变量或测试难以覆盖的情况时，提及 `$dev-formal-verify`。已有技能且覆盖代码在其记录的最后同步提交之后发生变化时，若问题涉及这些代码，提及 `$dev-formal-verify`。

## 完成配置

1. 从本项目安装器选择 dev 领域或具体技能，安装目标固定为当前项目的 `.agents/skills/`。宿主如何发现技能，以实际支持情况为准。
2. 按首个任务的实际负载核对必要运行条件。已有环境记录仍有效时直接复用；缺失或不适用时依据当前执行主机及用户指定远端的实际资源安排并发与工作树。项目确需长期验证方法时，按真实入口验证或形式属性检查分别调用 `dev-verify`、`dev-formal-verify`。
3. 使用 `$dev-workflow`、一个目标以及一个能通过或失败的检查，开始真实任务。

安装不等于宿主已经加载。显式名称调用与自然语言发现取决于宿主；检查实际结果，不保证某个技能一定自动触发。详细说明见 [README](guide-index.md) 和[指南第 1 页](guide-setup.md)。按 [`references/prompting.md`](prompting.md) 提议一起组织第一条提示词。

用户担心成本时，说明 token 花在哪里、怎样减少。选用委派和多视角审查会增加 token 用量，可按需要减少重复上下文、无效评审或调用次数。调用成本与本机内存、磁盘预算分别核对。

本项目技能统一安装到当前项目的 `.agents/skills/`。按[宿主能力适配](harness-adapter.md)确认当前环境如何发现技能和提供工具；不使用改名后的插件命令。缺少专用审查、后台调度或其他必要能力时，明确未完成范围，先完成能够可靠交付的部分。

技能使用标准 `SKILL.md` 与包内资源。委派、持续加载和后台执行是否可用，以当前宿主实际能力为准。无子智能体时顺序完成相应调查视角；无后台调度时在当前会话执行并保存恢复点，不伪称关机会继续。

## 用 `$dev-workflow` 开始任务

`$dev-workflow` 按目标与当前阶段选择所需方法，沿用已有规格和证据。复杂任务把适用步骤列入清单，只有影响交付或审计的省略才记录原因。好的提示词说明目标及完成判据，不列技能清单，因为手工序列容易丢失或重排流程会保留的步骤。帮助组织提示词前先读 [`references/prompting.md`](prompting.md)。例子见[指南第 2 页](guide-routing.md)。

`$dev-workflow` 如何保持可见，要核对当前宿主的真实机制：

- 宿主支持显式技能名称时，可以点名本技能；不把一种界面的 Enter 行为推广到所有环境。
- 宿主实际提供持续模式时，使用已观察到的设置并核对生效范围；没有时按需读取本地文件。
- 项目约定和恢复记录用于保留目标，不要求每轮重新发送同一提示词。

具体映射见[宿主适配](harness-adapter.md)。切换目标时清楚说是新任务即可，不需要神奇关键词。子智能体只有在当前工具确实可用时启动，使用实际支持的类型和参数；否则由当前智能体依次完成。

## 选择技能

跨阶段目标或当前阶段不明时使用 `$dev-workflow`；已有明确阶段时直接推荐对应入口，例如写可认领 Issue 用 `$dev-issue`、按规格与有效体验基线实施用 `$dev-build`、将完整文档转成交互 HTML 让用户确认用 `$dev-prototype`、复现或修复普通故障用 `$dev-debug`。推荐前先读取该技能，并给一个示例提示词。

| 用户想做什么 | 技能 |
|---|---|
| 协调跨阶段目标、接续后阶段未明的任务或完成约定交付 | `dev-workflow`（`$dev-workflow`） |
| 保存开发上下文、交给新会话、接手具体旧任务或明确暂停 | [`$dev-handoff`](capabilities.md) |
| 将想法、Bug 或优化写成可认领 Issue，更新正文或追加评论 | [`$dev-issue`](capabilities.md)；按授权发布或交付草稿 |
| 把聊天、Issue、截图或日志整理成目标、事实、范围与缺口 | [`$dev-intake`](capabilities.md)（需求整理） |
| 产品规则尚未决定，需要按依赖逐层做选择 | [`$dev-grill`](capabilities.md)（决策访谈） |
| 共识已明确，补齐可实施、可验收的行为约定 | [`$dev-spec`](capabilities.md)（行为规格） |
| 对报告分类、查重与分流，不要求复现 | [`$dev-issue-triage`](capabilities.md) |
| 发送前深化提示词而不扩大范围：专业人士会增加什么、原始材料与方法是什么、外部如何核验；只返回提示词而不执行 | [`$dev-sharpen`](capabilities.md) |
| 理解代码现在如何工作、新代码应放在哪里 | `dev-learn`（`$dev-learn`） |
| 理解代码为何如此组织、某个数字从哪里来 | `dev-why`（`$dev-why`） |
| 用简单语言理解改动或子系统 | [`$dev-learn`](capabilities.md) |
| 回顾自己指定时间或话题的工作进展 | [`$dev-status`](capabilities.md)，跨会话资料按`dev-learn`（背景恢复方法）核对 |
| 用通俗文字与小图回顾本对话自上条消息以来的变化，列全等待自己决定的事项，并让回复本身足以决策 | [`$dev-status`](capabilities.md) |
| 将 `$dev-status` 回顾做成短字幕幻灯视频，并在下方用文字列出等待决定的事项 | [`$dev-status`](capabilities.md) |
| 知道一个小 diff 可能在自身之外破坏什么 | `dev-review`（`$dev-review`） |
| 写跨函数边界代码前确定类型与模块形状 | `dev-architecture`（`$dev-architecture`） |
| 对同一简报尝试多种方案，融合成最佳结果 | [`$dev-parallel`](capabilities.md) |
| 为多个已有 Change 安排先后、准备 Goal 目标或推进整批交付 | [`$dev-program`](capabilities.md) |
| 通过实际可用的隔离执行者并行检查切片，或让执行者竞速 | `dev-parallel`（`$dev-parallel`） |
| 让独立审查者审查 diff 并尝试破坏它 | `dev-review`（`$dev-review`） |
| 存在廉价本地测试时，测试先行修复 bug | [`$dev-tdd`](capabilities.md) |
| 为 `.ts` 或 `.tsx` 工作应用 TypeScript 规则 | `dev-guardrails`（`$dev-guardrails`） |
| 用户要求、项目规范或具体注释问题需要独立评估 | `dev-guardrails`（注释审查） |
| 去除文字中的 AI 痕迹 | `dev-writing`（`$dev-writing`） |
| 按标准写文档、RFC、README、PR 描述或提交信息 | [`$dev-writing`](capabilities.md) |
| 用通俗语言重新听一遍上条回复 | [`$dev-learn`](capabilities.md) |
| 给代理脚本化操作应用并证明行为的方法 | `dev-verify`（`$dev-verify`） |
| 让验证技能及其功能图重新符合应用 | `dev-verify`（`$dev-verify`） |
| 形式化验证竞态、不变量及测试难以触达的属性 | [`$dev-formal-verify`](capabilities.md) |
| 覆盖代码变化后同步形式化验证，并判断失败属于漂移还是缺陷 | [`$dev-formal-verify`](capabilities.md) |
| 展示经 TLA+/TLC 检查的用户行为图、不变量违规最短图路径或含循环的时序反例 | [`$dev-statechart`](capabilities.md) |
| 报告或依据性能数字行动前审查它 | `dev-benchmark`（`$dev-benchmark`） |
| 执行大型、跨领域或需要事后审计的变更 | `dev-workflow`（`$dev-workflow`），无合适现成流程时用`dev-workflow`（定制执行） |
| 执行中保存决定日志，随后复核 | `dev-workflow`（`$dev-workflow`）；性能实验记录由 `$dev-benchmark` 负责 |
| 编写或修改项目技能，包括触发、方法与场景检查 | [`$dev-personalize`](capabilities.md)（技能编写分支） |
| 将自己的工作习惯变成个人模式技能 | [`$dev-personalize`](capabilities.md) |
| 创建 PR、跟进 CI/审查或合并已验证改动 | [`$dev-deploy`](capabilities.md)（PR 交付分支） |
| 将指定版本发布到指定环境 | [`$dev-deploy`](capabilities.md)（环境部署分支） |
| 从完成任务中提炼经验 | `dev-archive`（完整反思方法）；项目知识归 `$dev-archive`，个人方式归 `$dev-personalize`，结构约束归 `$dev-guardrails` |
| 阻止代理在本仓库重复同样错误 | `dev-guardrails`（`$dev-guardrails`） |
| 构建按钮连接已支持 webhook 的操作页面 | `$dev-build`，使用`dev-build`（操作界面方法） |
| 熟悉 本项目技能 的使用方式 | `$dev-help` |

其他已安装技能不在表中时，读取其 frontmatter 并按 description 选择。完整原则见本包[原则指南](guide-principles.md)。

容易混淆的选择：

- `$dev-intake` 整理需求材料，`$dev-grill` 解决未决产品选择，`$dev-spec` 补全行为契约，`$dev-sharpen` 改写请求表达。按真实缺口调用，已有充分结果直接复用。
- 按预期产物区分 Issue 相关请求：完整正文的撰写与维护、增量评论由 `$dev-issue` 负责，来源、目标与缺口整理用 `$dev-intake`，分类、查重与分流用 `$dev-issue-triage`。要求复现或修复时才交 `$dev-debug` 或满足报告流程前提的 `$dev-issue-fix`；材料来自 Issue 不决定路线。
- `$dev-deploy` 可单独完成 PR 交付，无需环境部署；`$dev-personalize` 可单独编写项目技能，无需个人历史。
- `$dev-formal-verify` 按属性选择工具；只有 TLA+/TLC 模型与结果交 `$dev-statechart`，JS 模型采用兼容展示。应用验证生成 `dev-verify-<app>`，形式属性验证生成 `dev-formal-verify-<area>`。
- `$dev-learn` 解释当前机制与修改入口，教学中按需要补充已有历史依据；独立追查历史决定由 `$dev-why` 负责。
- `$dev-parallel` 给每个执行者同一简报并融合优点；`$dev-parallel` 划分切片或竞速，返回一份报告。
- `$dev-architecture` 按用户范围设计或实施；只要求设计时交付设计，明确要求执行时继续。要保留人审节点，可以直接说“实施前让我看设计”，不需要专有口令。
- `$dev-review` 审查 diff；`$dev-review` 查找 diff 以外的破坏，并证明让改动安全的关键事实。
- `$dev-status` 给人读的进展报告，默认本轮，也可按用户指定时间或主题核对；`$dev-handoff` 保存交接、核对具体旧任务的恢复点或执行明确暂停，随后返回原执行阶段。阶段不明的跨阶段工作由 `$dev-workflow` 协调；仅保存不停止工作。
- `$dev-sharpen` 深化待执行请求；`$dev-workflow` 在无合适现成流程时定制执行，多个已有 Change 用 `dev-program`，多日并行协作用 `dev-parallel`，单任务持续推进使用自主执行。

技能包不自动提供宿主能力：

- 差异整理使用实际 diff 与项目检查；UI 或终端操作使用当前可用驱动，不要求某个专有插件名。
- 持续唤醒和技能创建使用环境真正提供的工具；没有时使用本地执行、恢复记录和`dev-personalize`（技能结构规则）。
- 多 Change 批次可直接使用 `dev-program`，Goal 中可给出成员清单或现有批次文档。菜单里的其他命令应读取实际说明后再用。

## 操作流程与原则

操作流程是 `$dev-workflow` 内部的步骤列表，不是技能，因此没有斜杠命令。在 `$dev-workflow` 中，描述任务即可选中流程，以下表达也能直接指定：

- “babysit this pr”或“check on pr 123”运行 Babysit，将 PR 推到可合并并停在那里。除非用户要求 merge、land 或 ship，否则不合并。
- “land the stack”运行 Shipping。
- “take over this branch”运行 Session pickup。
- “pause safely”运行 Pause safely。
- “full autopilot on this queue”运行 Autopilot-full；“autopilot, don't merge”运行 Autopilot-stack。
- “run the eval playbook”运行 Eval。

相近名称可能被宿主匹配到其他技能，执行前应读取实际内容并核对目标。`dev-workflow`（`dev-workflow`） 的 Playbooks 部分列出全部流程及适用条件。[指南第 6 页](guide-verification.md) 说明开启、跟进和落地 PR。

本项目有按任务选择的规格、计划与实施方法，宿主提供的计划模式可配合使用。`$dev-workflow` 通过 `dev-plan` 保存实施票据并汇总 DAG；跨阶段或堆叠 PR 再按实际交付分组。只要求计划时交付票据和计划。已授权持续实施时，核对后交给 `dev-build`。设计问题按实际缺口通过研究、Prototype 流程或 `$dev-architecture` 厘清，沿用有效的决定。

原则全文由 `dev-guardrails` 维护，按任务需要调用；在它改变决定时说明实际作用，不要求每轮机械引用全部原则。用户通常用名称引导，例如“apply prove it works. show me the real output.”，执行者再读取该原则的完整方法。[指南第 8 页](guide-principles.md) 列出了这些原则。

## 修正偏离目标的执行

| 症状 | 处理 |
|---|---|
| 几轮之后约定不再可见 | 核对当前宿主的加载和上下文行为；重新读取所需本地入口，实际支持持续模式时再配置。 |
| 一个问题被当成上个任务的下一步 | 说“new task”，或明确这一轮不需要该模式。 |
| 执行成本超出预期 | 查看配置章节中的成本段落。 |
| 技能没有自行加载 | 按宿主实际发现机制和描述触发；可明确给出技能名称。总流程只按需选择，不会默认运行全部技能。 |
| 并行代理相互覆盖 | 给每个代理独立 worktree，或使用各有独立机器的云代理。 |
| 并行运行导致内存或磁盘不足 | 暂停新增负载，复测执行主机资源并核对已有预留，按当前可用名额排队；已完成检出由 `dev-worktree` 回收。 |
| 夜间执行一直有动作却没完成任何事 | 持续执行需要可通过或失败的完成判据，并遵守实际运行能力和预算。见[指南第 7 页](guide-autonomous.md)。 |
| 回复凭绿色构建宣称成功 | 要求真实命令、流程、存储值或 profile。这就是 prove-it-works 原则。 |

偏离目标时，[`references/prompting.md`](prompting.md) 有一句话引导例子。[指南第 10 页](guide-recipes.md) 还有更多常见问题及可复制用法。

## 将 本项目技能 变成自己的工作方式

- [`$dev-personalize`](capabilities.md) 从用户明确提供或授权的项目记录起草个人模式技能，与 `$dev-workflow` 一起使用。
- 一次会话后按`dev-archive`（反思方法）提炼有证据的经验，按项目知识、个人方式或结构约束选择归属；只有已授权修改的对象才实际编辑。
- `$dev-workflow write a skill for <workflow>` 运行技能编写流程；eval 流程盲测技能变化。
- 技能修正与产品功能的范围分别说明；只有项目流程或用户目标需要时开 PR，直接推送授权不强制改成 PR。

[指南第 9 页](guide-personal.md) 逐项介绍这些方法。

## 回复

先回答问题。最多给一个代码块示例提示词，有合适场景时改写自 [`references/recipes.md`](recipes.md)，随后链接到对应文件。用户没要求完整地图时保持简短。
