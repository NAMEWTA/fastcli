# 文档加载与回报（Phase 1 配方）

> 在 Phase 1 加载本文件。本文件给出"激活后自动引入项目参考文档"的具体操作清单——按存在性、按优先级、显式回报、显式 grep。

## 1. 加载优先级（按顺序）

下表从上到下扫描；存在即加载，不存在跳过。**所有加载结果必须在 Phase 1 末尾显式回报**。

| 序 | 路径（相对仓库根） | 角色 | 注入到 goal 的位置 |
|---|------------------|------|------------------|
| 1 | `AGENTS.md` | AI 协作手册（项目铁律 / 风格 / 测试要求） | Constraints + Stop if |
| 2 | `CLAUDE.md` | Claude 项目铁律（旧约定，仍常见） | Constraints |
| 3 | `.cursor/rules/*.mdc` `.cursorrules` | Cursor 规则 | Constraints |
| 4 | `.kiro/steering/*.md` | Kiro steering（含 inclusion 头） | Constraints；`inclusion: manual` 仅在用户显式 `#` 引用时才载入 |
| 5 | 当前 spec / change | 当前任务的 SDD 上下文 | First action（场景 B）、Done when（SHALL → 测试映射） |
| 6 | `specforge/context/context.md` | Rules 层（技术栈 / 命名 / 禁动清单） | Constraints |
| 7 | `specforge/context/architecture.md` | Structure 层（模块图 / ADR / 跨模块契约） | Constraints + Scope |
| 8 | `specforge/context/lessons.md` | LESSONS 层（status: active 历史教训） | Constraints（差异声明） |
| 9 | `README.md` / `README-ZH.md` | 项目入口（构建 / 测试 / 运行命令） | Constraints / Scope 备查 |
| 10 | 项目类型默认值（`references/project-types.md`） | 编程语言 / 构建工具默认 | Constraints + Stop if |

## 2. 当前 spec / change 探测路径

按以下顺序扫描；**第一个匹配到的视为活跃 change**：

```
.kiro/specs/<active>/                         （Kiro 当前 spec）
specforge/changes/<NNN-name>/                  （SpecForge 活跃 change，按编号倒序取最新）
openspec/changes/<name>/                       （OpenSpec 活跃 change）
docs/specs/<active>/  /  spec/<active>/        （自定义结构，仅在用户提示后扫描）
```

匹配后必读：`proposal.md`、`design.md`、`tasks.md`、`specs/<capability>/spec.md`（若存在）。

## 3. 显式回报模板

Phase 1 加载完成后，用户应当看到**类似这样**的一段回复：

```
我检测到这是一个 Node / TypeScript 项目（package.json + pnpm-lock.yaml），
并加载了以下文档：

✅ AGENTS.md (132 行) — 注入：§ 2.5 P9 反重复、§ 7.1-7.4 改代码必查 / 必做、§ 7.7 路由六要素
✅ specforge/context/context.md (47 行) — 注入：技术栈 / 禁动清单
✅ specforge/context/lessons.md (58 行) — grep 关键词 [auth, middleware, refactor] 命中 1 条：
   L-007（status: active）— 改 auth 中间件时漏改 e2e 测试桩
🔘 CLAUDE.md — 不存在，跳过
🔘 .cursor/rules/ — 不存在，跳过
✅ specforge/changes/0042-add-rate-limit/proposal.md (74 行) — 当前活跃 change
✅ specforge/changes/0042-add-rate-limit/design.md (191 行) — MUST NOT modify 清单 6 项
🔘 README-ZH.md — 不存在，跳过

我会把以下作为 Constraints 注入：
  - AGENTS.md § 7.3 写代码风格（TS strict / .js 后缀 / 中文注释）
  - lessons.md L-007 差异声明（"本次会同步修改 e2e 测试桩"）
  - design.md MUST NOT modify 清单 6 项

如果有遗漏文档需要我加载（例如 ADR、API 契约、内部 wiki 摘要），现在告诉我。
```

**回报必含**：行数、注入点、跳过项、grep 命中详情、补漏邀请。**不含**："我看了大概的内容"这种泛泛之辞。

## 4. lessons.md grep 义务

对齐仓库 `AGENTS.md § 7.8`：每次进 Phase 1 都必须 grep `lessons.md`，规则：

- 仅匹配 `status: active` 条目（其他状态视作已 archive）
- grep 关键词 = 用户 Objective 中的名词 + 动词词干（去掉虚词）
- 命中后两选一处理：
  1. **声明差异**："本次与 L-NNN 的差异是 X" → 写进 Constraints
  2. **声明仍适用**："L-NNN 仍适用，所以本 goal 不采取该路径" → 写进 Stop if

未声明差异 = 违反 P9 = 触发 `E010_repeatedFailurePattern`。

## 5. AGENTS.md / CLAUDE.md 摘录策略

不要全文复制到 goal 里；按以下规则**摘录**到 Constraints：

| AGENTS.md 段落 | 摘录到 goal 的形式 |
|---------------|------------------|
| 包管理器约定（pnpm / npm / yarn） | 一行："使用 \<pnpm\>，禁用 \<npm/yarn\>" |
| 提交规范 | 一行："commit message 遵循 conventional commits" |
| 测试要求 | Done when 中复用："`pnpm test` 退出码 0" |
| 风格铁律（如 TS strict / 中文注释 / .js 后缀） | 摘 1-3 条最相关的 |
| 禁动清单（"在 .specforge/ 写业务数据"等） | 整段进 Constraints |
| P9 反重复 | 进健康守则块 |

**只摘与本次 goal 直接相关的部分**——AGENTS.md 132 行全塞进 Constraints 是反模式。

## 6. 边界情况

| 情况 | 处理 |
|------|------|
| 仓库无 AGENTS.md / CLAUDE.md | Phase 1 仍要回报"未发现"；并在 Phase 0 追问"项目最忌讳改什么文件" |
| `specforge/context/` 不存在 | 这通常是未初始化的项目，跳过；建议用户 `specforge init`，但不阻塞 |
| 当前 spec 有多个候选（多个 change 在跑） | 列出所有候选，让用户选 |
| 用户给的是 GitHub URL 而非本地路径 | 用 web 工具拉 README + 探测 config 文件；显式标注"基于 README 推断，本地实情可能不同" |
| 文档冲突（README 与 AGENTS.md 不一致） | 不要自行决定优先级，回 Phase 0 追问"以哪个为准" |
