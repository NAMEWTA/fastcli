# 把参考资料深度内化进命令（六步法）

> 使用场景：用户给你一份外部资料（书籍章节、英文博客、最佳实践、另一个工具的文档等），
> 希望你“把它吃透，反哺到某个已有 command 中”。
>
> **核心原则：素材不是内容。** 直接搬运会污染 Level 2 主体；必须先**抽取 → 分类 → 分级 → 编织**。

---

## 第 0 步：确认目标

在动手之前明确三件事，任何一件不清楚都要先问用户：

- [ ] **目标命令是谁**？路径是？（如 `templates/.specforge/commands/workflow/design-explore/design-explore.md`）
- [ ] **资料的核心价值是什么**？（一句话总结，用来排除噪声）
- [ ] **内化的成功标准**？（“让命令更完整”太模糊。更好：“补齐多视角审查的具体模板”“增加反模式清单”“提供可执行的脚本”）

---

## 第 1 步：现状盘点

对目标命令跑一遍体检：

```bash
python scripts/quick_validate_command.py <command-directory>
```

再用文件读取工具快速扫一遍，回答：

- [ ] 七块骨架（见 `command-anatomy.md`）缺哪几块？
- [ ] 现有主体是多少行？离 500 行上限还有多少预算？
- [ ] 现有 `references/` 有哪些文件？哪些空壳哪些有内容？
- [ ] 现有 Iron Law / handoff / 错误引用 是否已与 `.specforge/config.yaml` 对齐？

把结果写成一张“缺口表”，作为后续工作的锚点。

---

## 第 2 步：把参考资料解构成原子

通读资料，边读边把内容拆成五类**原子**（atom），每个原子是一条独立、可复用的知识：

| 原子类型 | 形态 | 将来落到哪 |
| -------- | ---- | ---------- |
| 🔎 触发词/场景用例 | 一个词或短句 | Level 1 — frontmatter.description |
| 🛑 Iron Law / HARD-GATE | "什么情况下必须停" | Level 2 — Iron Law 块 |
| ▶️ 可执行步骤 / 检查点 | 带动词的 checklist 条目 | Level 2 — Steps |
| 📚 长清单 / 模式库 / 反模式库 / 陷阱集 | 成组知识，超 10 条或篇幅长 | Level 3 — `references/<topic>.md` |
| 🤖 可脚本化的确定性操作 | 有明确输入/输出的重复操作 | Level 3 — `scripts/<task>.sh|.py` |

**实操技巧：**
- 每个原子配一行来源（原始章节号 / 链接锚点），方便后续核对。
- 遇到“看起来很聪明但无法落地”的段落，标记 `SKIP`——这是噪声。
- 遇到与 SpecForge 既有机制冲突的建议（如另一种生命周期模型），标记 `CONFLICT`，不直接采纳。

---

## 第 3 步：映射到骨架（决定每个原子的归宿）

建立一张映射表：

| 原子 ID | 类型 | 原文摘要（≤ 30 字） | 目标位置 | Level | 操作 |
| ------- | ---- | ------------------- | -------- | ----- | ---- |
| A1 | 🔎 | "brainstorm, specify" | frontmatter.description | L1 | 追加关键词 |
| A2 | 🛑 | "契约未定禁止 implement" | Iron Law | L2 | 合并进现有 Iron Law |
| A3 | ▶️ | "四视角并行审查" | Step 2 子步骤 | L2 | 新增 checklist |
| A4 | 📚 | "12 种常见反模式" | `references/anti-patterns.md` | L3 | 新建文件 |
| A5 | 🤖 | "运行 bench 收集基线" | `scripts/collect-baseline.sh` | L3 | 新建脚本 |

**判定规则：**
- 单条 ≤ 3 行的箴言或 Iron Law，留在 Level 2。
- 超过 10 条的清单、任何分类学（taxonomy）、任何成组的模式/反模式 → Level 3。
- 需要脆弱精确执行的操作 → Level 3 脚本，Level 2 只留一行 `bash scripts/xxx.sh`。

---

## 第 4 步：编织入文（最小差量原则）

真正开始修改文件时守三条底线：

1. **补齐而非重写**：保留现有 Section 和语气；新增条目用“追加”，不用“覆盖”。
2. **不复制原文**：哪怕 Level 3 也要用自己的话重述 + 结构化；外部资料若有版权，给链接而非全文搬运。
3. **立即建立链接**：每新增一个 `references/<x>.md`，同一次提交里必须从 Level 2 主体的“References 导航”表里加一条。

典型的编织动作：

```markdown
## Step 2: 多视角审查

- [ ] 从 CEO / 工程 / 设计 / DevEx 四个视角给出评审（新增：并行使用 sub-agent 执行，避免串行耗时）。
- [ ] 参考 `references/review-dimensions.md` 的视角清单（新增：从资料内化而来）。
```

---

## 第 5 步：去重、瘦身、校验

- [ ] 合并重复条款（Iron Law 只留一条最强的）。
- [ ] 主体行数复核：超过 500 行 → 继续拆到 Level 3。
- [ ] 遍历新增的 Level 3 文件，确认每个文件都有主体链接，没有“孤岛文档”。
- [ ] 跑 `python scripts/quick_validate_command.py <command-directory>` 过结构校验。
- [ ] 跑 SKILL.md 末尾的“命令模板自检清单”，任何一项未过都视为未完成。
- [ ] 如果资料里有 SpecForge 没有对应错误码的阻断点，提醒用户补充到 `.specforge/config.yaml` 的 `errors`，不要私自造新错误码。

---

## 常见反模式（请勿如此内化）

| 反模式 | 为什么糟糕 | 正确做法 |
| ------ | --------- | -------- |
| 把资料整章 Ctrl-V 进 Level 2 | 主体瞬间爆炸，污染加载上下文 | 抽成原子 → 分级落位 |
| 把每句金句都做成 Iron Law | 稀释阻断性，AI 实际不会阻断 | 只留 1 条最强 Iron Law |
| 新建 `references/` 文件但不从主体链接 | 成为孤岛，AI 永远不会按需加载 | 新建文件立即补导航表 |
| 把跨语言 CLI 命令硬编码进本命令 | 违反语言无关原则 | 引用 `skills/workflow-steps/language-adapters/` |
| 改 Iron Law / handoff 但不动 `config.yaml` | 机器源与文档分叉 | 同步更新 `.specforge/config.yaml` |

---

## 小抄：常用提问

当你拿不准时，问自己：

- 这条内容**三个月后** AI 在执行时真的会用到吗？（否 → 删）
- 这条内容属于“项目程序性知识”还是“通用常识”？（后者 → 删）
- 这条内容应该在 Level 1 描述里被触发词命中吗？（是 → 加到 description）
- 这条内容如果换个技术栈还成立吗？（否 → 考虑放到 language-adapters 而非本命令）
