# AGENTS.md 同步骨架与差量策略

> 本参考文档供 `foundation-init` Step 4 加载。规则与 `skills/workflow-steps/docs-sync/references/agents-contract.md` 对齐：AGENTS.md 是给 AI 代理（Claude / Cursor / Codex / Kiro / Gemini 等）看的**事实手册**，不是给用户看的营销页。

## 1. 文档定位（一句话）

`AGENTS.md` = 项目根目录上的**高信息密度工作手册**：项目身份 + 目录布局 + 关键命令 + 扩展机制 + 行为规约 + 常见陷阱。

不是：用户教程、营销文、版本历史、Quick Start。

## 2. 最小骨架（greenfield 新建用）

新建时直接生成下列章节骨架，**禁止**留 `[TODO]` 占位符进库；缺事实就交互问用户，问到再写。

```markdown
# AGENTS.md — <ProjectName> 项目 AI 协作指南

> 本文件是给 AI 代理（Claude、Cursor、Kiro、Codex、GPT、Gemini 等）阅读的项目工作手册。
> 编码铁律见 `CLAUDE.md`；项目级技术栈与命名约定见 `specforge/context/context.md`。

## 1. 项目身份
- 包名 / 项目名
- 定位（一句话）
- 语言 / 运行时 / 包管理器
- 分发形式
- 许可证
- SpecForge Profile（minimal / standard / custom，从 `specforge/config.yaml` 读取）

## 2. 核心架构
- 双目录模型（`.specforge/` 框架资产 vs `specforge/` 用户资产）
- 关键抽象 / 领域模型（指向 `src/` 或对应目录）
- 8 阶段生命周期（如启用 standard profile）

## 3. 仓库布局
（顶层目录树 + 一行注释，最多两层）

## 4. 开发命令
| 场景 | 命令 |
|------|------|
| ... | ... |
（命令必须来自真实入口：package.json#scripts / Makefile / justfile / Cargo.toml）

## 5. 代理行为规约
### 5.1 改代码前必查
### 5.2 改代码时必做
### 5.3 写代码风格
### 5.4 测试要求

## 6. 常见陷阱
（项目实际踩过的坑，每条 1-2 行；空白时留 1 条占位"暂无"也比 [TODO] 强）

## 7. 相关文档
- 编码铁律：`CLAUDE.md`
- 项目级上下文：`specforge/context/context.md`
- 架构沉淀：`specforge/context/architecture.md`
- 失败知识库：`specforge/context/lessons.md`
- 用户文档：`README.md` / `README-<lang>.md`
- 版本历史：`CHANGELOG.md`
```

## 3. brownfield 差量补齐（已存在 AGENTS.md 时用）

**核心原则**：保留既有结构与措辞，只做**差量追加**，禁止整页重写。

差量追加清单（按优先级）：

1. **SpecForge 双目录段落**：在"核心架构"或紧邻位置加一段说明 `.specforge/` 与 `specforge/` 的语义边界，引用 `specforge update` 行为
2. **Profile 标记**：在"项目身份"末尾加一行 `SpecForge Profile: <minimal|standard|custom>`
3. **错误字典引用**：在"代理行为规约"或"常见陷阱"末尾加一行 `错误字典：见 .specforge/config.yaml#errors`
4. **宪法引用（如有）**：在 P-原则相关章节加 `项目宪法：.specforge/constitution.md（版本 X.Y.Z）`
5. **CLAUDE.md 引用**：在文档顶部"前言"或末尾"相关文档"中追加指向 `CLAUDE.md`
6. **lessons.md grep 义务**（仅当用户启用了 lessons 工作流）：在"代理行为规约"加一行说明每次 implementation-build 前必须 grep `specforge/context/lessons.md`

**禁止**的差量动作：

- ❌ 删除既有的项目铁律（如"不改 pbxproj"、"零第三方依赖"）
- ❌ 改写既有章节标题或重排顺序
- ❌ 翻译既有内容（中文项目就保持中文，英文项目保持英文）
- ❌ 把 `specforge/context/context.md` 的栈级常识灌进 AGENTS.md（会让文件膨胀）

## 4. 与 `docs-sync` 技能的协同

如项目登记了 `.docs-sync-state.json` 且 `tracked_docs` 包含 `AGENTS.md`，后续每次 `docs-sync` 触发都会自动同步以下章节：

| 触发条件 | 同步章节 |
|---------|---------|
| 顶层目录新增 / 删除 / 重命名 | 仓库布局 |
| `package.json#scripts` / Makefile 变化 | 开发命令 |
| `package.json` 元信息变化（name / version / runtime） | 项目身份 |
| 新增 / 删除顶层文档（CONTRIBUTING / CHANGELOG 等） | 相关文档 |
| 反复出现的 CI 失败模式 | 常见陷阱 |

foundation-init **不需要也不应该**把"自动同步"逻辑写进 AGENTS.md 正文——那是 `docs-sync` 的工作。foundation-init 的责任就是确保骨架存在且首次落地正确。

## 5. 长度与渐进披露

- 主体目标长度：≤ 500 行（与渐进披露 L2 阈值一致）
- 超过 500 行时把"项目类型详细说明 / 长清单 / 长 SOP"下沉到 `specforge/context/architecture.md` 或 `references/`，AGENTS.md 只保留导航
- 骨架第一版通常 80-150 行就够；超过 250 行时考虑 review 是否在重复 README 内容

## 6. 自检清单（每次创建或差量补齐后必走）

- [ ] 7 个最小章节齐全（项目身份 / 核心架构 / 仓库布局 / 开发命令 / 代理行为规约 / 常见陷阱 / 相关文档）
- [ ] 仓库布局与 `ls -la` 顶层结果一致
- [ ] 开发命令全部能在仓库根目录执行（来自真实入口，不是猜的）
- [ ] 包管理器约定明确（pnpm / npm / yarn / cargo / pip / go mod 之一）
- [ ] 没有 `[TODO]` / `占位` / `<待补>` 标记
- [ ] brownfield 场景：既有项目铁律一字未删
- [ ] 末尾"相关文档"指向 `CLAUDE.md`
- [ ] 全文 ≤ 500 行

未通过任一项 = 残次品，不得离开 Step 4。
