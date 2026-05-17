---
name: command-creator
type: workflow-step
description: >-
  创建、改造、丰富 SpecForge command 模板（workflow-command 与 tool-command）的方法论技能。
  涵盖两种工作模式：
  (A) Create 模式 —— 从零开始创建新命令模板，含 frontmatter、preamble、Iron Law、Steps、产物清单、handoff、错误字典引用、反规避提醒、渐进式披露拆分；
  (B) Enrich 模式 —— 深度内化用户提供的参考资料（书籍章节、链接、文档、最佳实践等），把其中的模式/清单/陷阱/脚本抽取并按 Level 1/2/3 编织进现有命令，绝不破坏模板骨架。
  触发场景：“新增命令/补齐 templates 命令内容/添加 tools command/改造 command 生成器/specforge add-command”、
  “把这份资料内化进 X 命令”、“丰富 Y command 的步骤/清单/反规避”、“这个 command 是空壳，帮我补厚”、
  “author/optimize/enrich/review a command template”。
version: "2.0.0"
author: "wta"
---

# Command Creator（命令模板创建与丰富）

> 目标：让 command 模板成为“可直接指导执行”的可复用资产，而不是一页空壳 Markdown。
> 本技能同样擅长把用户提供的参考资料深度内化，反哺到指定命令的结构化升级中。

## Iron Law

> **禁止创建或留存没有 Iron Law、产物清单、handoff 的命令模板。** 空壳命令不是资产，是债务。
> **禁止把参考资料整段粘贴进命令正文。** 必须按结构抽取（模式/清单/陷阱/脚本）并按 Level 1/2/3 分层安置。

---

## 关于 Command（为什么需要它）

Command 是 SpecForge 在某个阶段触发的**可执行指令模板**。
- **workflow-command**：对应 8 阶段生命周期（foundation / requirements / design / planning / implementation / quality / release / evolution）。
- **tool-command**：跨阶段的独立能力（debugging、review、worktree 等）。

一个合格的 command 必须同时做到：**可被 AI 发现（frontmatter 描述）、可被 AI 执行（Steps 具体化）、可被 AI 验证（产物清单 + 错误引用）、可被 AI 接力（handoff）**。

---

## 核心原则

### 1. Concise is Key（上下文是公共资源）

Command 正文会被 AI 在阶段触发时整页加载。**默认假设 AI 已经很聪明**——只补充 AI 不可能凭空知道的“项目/团队/阶段专属的程序性知识”。
- 例如“Git 是什么”不必解释，但“本命令完成后必须把产物写到 `specforge/changes/<id>/` 而不是 `.specforge/`”必须明说。
- 优先用简洁示例替代大段解释；超过 500 行必须拆分到 `references/`。

### 2. 合理设置自由度（Degrees of Freedom）

按命令的脆弱度与变化度选择约束强度：
- **高自由度（文字指令）**：有多种合理做法、需要根据上下文判断时使用（如 “进行多视角审查”）。
- **中等自由度（伪代码 / 可参数化脚本）**：存在推荐范式、允许变体时使用（如 preamble 的触发词模板）。
- **低自由度（固定脚本）**：操作脆弱、必须顺序执行、一致性至关重要时使用（如 `scripts/add-diagnostic-logs.sh`）。

像在悬崖边的栈道，需要护栏（低自由度）；开阔地则可以放任选路（高自由度）。

### 3. 渐进式披露（三级显式契约）

与 `.specforge/config.yaml` 的 `rules.global.progressiveDisclosure` 一致：
- **Level 1 — 始终加载**：frontmatter（name/type/description），description 必含触发场景与关键词，长度 ≤ 200 字符。
- **Level 2 — 命中触发后加载**：command.md 主体（Iron Law、Steps、产物、handoff、反规避），建议 ≤ 500 行。
- **Level 3 — 按需加载**：`references/`、`scripts/`、`assets/`，从主体显式链接进入，不允许深层嵌套依赖。

详细规则与反例见 `references/progressive-disclosure.md`。

---

## Command 模板解剖（目录结构）

```
<command-name>/
├── <command-name>.md (required)
│   ├── YAML frontmatter (required)
│   │   ├── name         (required, 与目录名一致)
│   │   ├── type         (required, workflow-command | tool-command)
│   │   ├── description  (required, 含触发场景)
│   │   ├── version      (required, 语义化版本)
│   │   └── author       (required)
│   ├── <!-- preamble:bash ... -->  (推荐)
│   ├── # <标题>
│   ├── ## Iron Law                 (必须，HARD-GATE)
│   ├── ## Step 1..N                (必须，可执行步骤)
│   ├── ## 产物清单                  (必须，路径 + 最小章节)
│   ├── ## 完成衔接（handoff）        (必须，引用 config.yaml)
│   ├── ## 常见阻断与纠偏             (必须，引用 E00X 错误字典)
│   └── ## 反规避提醒                 (推荐，借口 vs 现实 表格)
└── Bundled Resources (optional)
    ├── scripts/        可执行脚本（确定性操作）
    ├── references/     长文档、清单库、案例库（按需加载）
    └── assets/         输出用资产（模板、图标、样板等）
```

完整骨架、字段含义与真实范例见 `references/command-anatomy.md`。

---

## 双模工作流

### 模式 A：Create（从零创建命令模板）

适用：用户说“新增命令”“specforge add-command”“搭一个 tools command”。

1. **理解命令意图**：触发场景（用户会怎么说？）、前置产物、输出产物、下一步 handoff。
2. **规划捆绑资源**：有哪些重复性工作需要 `scripts/`？哪些长清单需要 `references/`？哪些样板需要 `assets/`？
3. **初始化目录**：`python scripts/init_command.py <name> --path <父目录> --type <workflow-command|tool-command> [--resources references,scripts]`
4. **填充正文**：依 `references/command-anatomy.md` 的七块骨架落笔；Iron Law 必须具体可阻断，Step 必须可执行。
5. **渐进式披露切分**：主体接近 500 行时，把长清单移入 `references/`，在正文保留导航表。
6. **校验与收尾**：`python scripts/quick_validate_command.py <命令目录>`，修正报错后纳入仓库。

详细映射（阶段 ↔ 触发词 ↔ 前置产物）见 `references/phase-mapping.md`。

### 模式 B：Enrich（内化参考资料并丰富现有命令）

适用：用户说“把这份资料内化进 X 命令”“帮我把 Y command 补厚”“这个 command 是空壳”。

> **核心哲学**：参考资料不是内容，是素材。必须先抽取、再分类、再编织；禁止原文搬运。

六步工作流（完整步骤见 `references/internalize-references.md`）：
1. **现状盘点**：用 `quick_validate_command.py` 检查目标命令；用文件读取工具比较现有 Section 与骨架差距。
2. **素材解构**：把参考资料拆成五类原子——
   - 触发词 / 场景用例（→ Level 1 description）
   - Iron Law / HARD-GATE 候选（→ Level 2 Iron Law）
   - 可执行步骤与门禁检查（→ Level 2 Steps）
   - 长清单 / 模式库 / 反模式库（→ Level 3 references）
   - 可脚本化的确定性操作（→ Level 3 scripts）
3. **映射到骨架**：逐条回答“这条原子该落到命令的哪一块？Level 1/2/3 哪一级？”
4. **编织入文**：用“补齐而非重写”的最小差量策略，保留现有风格；新增 Level 3 文件要从主体加链接。
5. **去重与瘦身**：合并重复条款；主体超 500 行强制拆分；删除参考资料里与当前命令无关的噪声。
6. **校验与反规避自检**：再次跑 `quick_validate_command.py`，核对自检表（本文件末尾）。

### 两种模式都必须遵守的铁律

- Iron Law、产物清单、handoff 任何一项缺失即为残次品。
- 描述 description 必须包含**触发场景 + 关键词**（中英混合），否则无法被 `specforge list --triggers` 发现。
- 主体禁止出现 `TODO:` / `[TODO]` 等占位符进入版本库（`init_command.py` 生成的占位符是起点，不是终点）。

---

## 命令命名规范

- kebab-case，必须匹配 `^[a-z][a-z0-9-]*$`，与目录名一致。
- `workflow-command` 推荐格式：`<phase>-<verb>`，如 `requirements-clarify`、`release-deploy`。
- `tool-command` 推荐格式：单词能力名或动词，如 `debugging`、`review`、`worktree`。
- 不以数字开头；名称 ≤ 64 字符。

---

## Frontmatter 规范（最小字段）

```yaml
---
name: <与目录名一致>
type: <workflow-command|tool-command>
description: >-
  一句话说明做什么，并点明触发场景/关键词（用户可能说的话 + 英文关键词）。
version: "1.0.0"
author: "wta"
---
```

常见错误、进阶字段（`depends-on`、`hands-off-to`）与写作反例见 `references/frontmatter-spec.md`。

---

## preamble 规范（推荐）

若命令依赖技能注入 / 前置产物 / 环境检查，在正文开头加入可执行块：

```markdown
<!-- preamble:bash
# 技能注入（按命令特性调整触发词）
specforge list --skills --triggers=<逗号分隔触发词> --format=json

# 前置产物检测（如适用）
specforge status --phase=<phase> --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->
```

触发词矩阵、阶段钩子示例见 `references/preamble-patterns.md`。

---

## Handoff 规范

- handoff 必须可执行：明确“下一步命令”与“为什么”。
- handoff 必须引用机器源：优先从 `.specforge/config.yaml` 的 `handoffs` 读取，不要硬编码下一步。
- 推荐 1-2 个默认下一步，避免选择瘫痪。

实战写法与配置层示例见 `references/handoffs.md`。

---

## 渐进式披露（主体超 300–500 行必须拆分）

当命令正文膨胀时，把以下内容移入 `references/`，主体只保留导航表：
- 长清单库 / 模式库 / 案例库
- 跨语言适配表
- 长 prompt / 长 SOP
- 外部标准说明

从主体用表格链接：

```markdown
## References 导航（按需读取）

| 场景 | 参考文档 | 核心内容 |
| ---- | -------- | -------- |
| 调用栈深处报错 | `references/root-cause-tracing.md` | 反向追踪技术 |
| 修复后担心回归 | `references/defense-in-depth.md` | 四层防御 |
```

拆分原则、反例与检查脚本见 `references/progressive-disclosure.md`。

---

## 写作约定

- 使用祈使/动词原形（“先读取…，再写入…”）。
- 步骤用 `- [ ]` 复选框，便于 AI 逐步打勾。
- “借口 vs 现实”放在命令末尾，直接面对规避行为。
- 错误引用始终写成 `E00X_<camelCaseKey>`，对齐 `.specforge/config.yaml` 的 `errors`。
- 不要在模板里硬编码单一技术栈命令；需要具体 CLI 时引用 `skills/workflow-steps/language-adapters/`。

详细反模式清单见 `references/anti-patterns.md`。

---

## 工具清单（本技能自带）

| 脚本 | 用途 | 典型命令 |
| ---- | ---- | -------- |
| `scripts/init_command.py` | 初始化命令目录与骨架文件 | `python scripts/init_command.py requirements-clarify --path templates/.specforge/commands/workflow --type workflow-command --resources references` |
| `scripts/quick_validate_command.py` | 快速结构校验（frontmatter + 必需章节 + 行数） | `python scripts/quick_validate_command.py templates/.specforge/commands/workflow/requirements-clarify` |

脚本要求 Python ≥ 3.10；如未安装 PyYAML，校验脚本会降级为简易解析。

---

## References 导航（按需加载）

| 场景 | 参考文档 | 核心内容 |
| ---- | -------- | -------- |
| 需要完整骨架与字段语义 | `references/command-anatomy.md` | 七块骨架、真实范例、最小/标准/完整模板 |
| 把用户资料内化进现有命令 | `references/internalize-references.md` | 六步内化流程、素材分类矩阵、反模式 |
| 不确定内容该放哪一级 | `references/progressive-disclosure.md` | Level 1/2/3 拆分判定、拆分前后对比 |
| 写空壳模板的常见错误 | `references/anti-patterns.md` | 典型反模式与重构思路 |
| 写 frontmatter | `references/frontmatter-spec.md` | 字段规范、错误示例、进阶字段 |
| 写 preamble | `references/preamble-patterns.md` | 触发词矩阵、阶段钩子示例 |
| 写 handoff | `references/handoffs.md` | 配置层 + 文字层写法、示例 |
| 阶段职责不清 | `references/phase-mapping.md` | 8 阶段 ↔ 参考机制映射 |

---

## 命令模板自检清单（创建或丰富后必走）

- [ ] frontmatter 含五个必需字段（name/type/description/version/author）？
- [ ] description 同时包含 **触发场景** + **英文关键词** + **中文关键词**？
- [ ] name 与目录名一致，且为 kebab-case？
- [ ] preamble 覆盖 技能注入 / 前置产物 / 环境检测 三点？
- [ ] Iron Law 表述**具体、可阻断**（而非“要认真做事”这类口号）？
- [ ] 每个 Step 都是可执行动作，而非描述性陈述？
- [ ] 产物清单给出**完整路径 + 最小章节 / 字段**？
- [ ] handoff 引用 `.specforge/config.yaml` 的 `handoffs.<command>.next`，而非硬编码？
- [ ] “常见阻断与纠偏” 至少引用 1 条 `E00X_` 错误？
- [ ] 正文 ≤ 500 行，超出部分已拆入 `references/`？
- [ ] 新增的 `references/*.md` 已从正文显式链接？
- [ ] 无 `[TODO]` / `TODO:` / `占位` 等未填充标记？
- [ ] `python scripts/quick_validate_command.py <目录>` 通过？

> 任何一项未通过，视为残次品，不得入库。
