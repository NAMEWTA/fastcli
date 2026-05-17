---
name: docs-sync
type: workflow-step
description: 基于 git 差异增量同步项目对外文档。每次触发读取项目根目录的 state 文件中的上次同步 SHA，汇总该 SHA 到当前 HEAD 之间的所有变动（提交记录 + 文件改动），按项目约定把变动写回相应文档，完成后把最新 HEAD SHA 持久化回 state 文件。通用适用于任何 git 仓库与任意一组对外文档（README / CHANGELOG / AGENTS / CONTRIBUTING / API docs 等）。触发词：`update docs`、`sync docs`、`docs-sync`、`refresh documentation`、`文档同步`、`更新文档`、`更新 README`、`更新 CHANGELOG`、"看一下最近改了什么然后更新文档"、"基于 git 变更刷新对外文档"。适用场景：仓库累积了一批 commit 后需要把源码、模板、CI、依赖、命令等变动反映到对外文档里；不适用于从零创建文档或一次性大改版。
version: "1.0.0"
author: "wta"
---

# Docs Sync — 基于 Git 差异的项目文档同步工作流

这是一个**通用**的项目文档同步技能。它的唯一目标：让仓库的一组对外文档始终与仓库实际代码、模板、CI、依赖状态**最小一致**，且每一次同步都是**基于 git 差异的增量更新**，不做整体重写。

本技能不绑定任何特定项目或语言栈。具体同步哪些文档、每份文档写什么、如何分类，都由项目自身的 state 文件与对外文档的现有结构决定。

## Iron Law（硬性约束）

> **禁止在不读取项目 state 文件的 `last_sync_sha` 和当前 `HEAD` 之间 diff 的情况下修改任何对外文档。**
>
> 如果 diff 为空（`last_sync_sha == HEAD`）或只有文档自身的变动，直接报告"无需同步"并退出，**不要**触碰任何文档。

## State 文件位置与定位

- **默认路径**：仓库根目录的 `.docs-sync-state.json`
- **可配置**：如果项目在 `package.json` / `pyproject.toml` / 其他项目配置中声明了自定义路径，优先用该路径
- **模板**：首次创建时复制 [templates/state.json.tmpl](templates/state.json.tmpl) 作为骨架
- **入 git**：state 文件必须随仓库提交，作为同步基线的唯一事实来源
- **不放进本技能目录**：本技能是只读知识资产，不承载项目状态

## 同步哪些文档

由 state 文件的 `tracked_docs` 数组决定，典型候选（按项目选用）：

| 文件 | 常见内容 |
|------|---------|
| `README.md` / `README-<lang>.md` | 项目介绍、Quick Start、CLI/API 参考 |
| `CHANGELOG.md` / `CHANGELOGS.md` | 版本变更记录（Keep a Changelog 格式） |
| `AGENTS.md` / `.cursorrules` / `CLAUDE.md` | 给 AI 代理的工作手册 |
| `CONTRIBUTING.md` | 贡献指南 |
| `docs/**/*.md` | 详细文档站 |
| OpenAPI / GraphQL schema 生成物 | API 契约 |

如果 `tracked_docs` 为空，首次运行时**不要擅自猜测**；向用户列出仓库中的候选文档请其确认后写入 state。

## 核心工作流（每次触发必须完整执行）

### Step 0 — 读取状态

```bash
# 读取状态文件（路径来自项目约定，默认 .docs-sync-state.json）
STATE_FILE=".docs-sync-state.json"
test -f "$STATE_FILE" || echo "FIRST_RUN"

LAST_SYNC_SHA=$(jq -r .last_sync_sha "$STATE_FILE")
HEAD_SHA=$(git rev-parse HEAD)
git log -1 --format="%H%n%ai%n%s"
```

分支处理：

- `state 文件不存在` 或 `last_sync_sha == null` → 首次运行：用 `templates/state.json.tmpl` 初始化，把 `last_sync_sha` 置为当前 `HEAD`，让用户确认 `tracked_docs`，**本次不做文档修改**
- `last_sync_sha === HEAD` → 直接报告"Docs 已与 HEAD（<短 SHA>）同步，无需操作"并退出
- 其他 → 进入 Step 1

### Step 1 — 收集 git 差异

固定跑以下命令，把输出作为分析素材：

```bash
RANGE="$LAST_SYNC_SHA..HEAD"

# 1) 提交流水（按主题分类用）
git log --oneline --no-merges "$RANGE"

# 2) 变更文件一览（按路径分类）
git diff --name-status "$RANGE"

# 3) 变更统计（看量级）
git diff --shortstat "$RANGE"

# 4) 按路径分组的文件变更数（用来决定每份文档写什么）
git diff --name-only "$RANGE" | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn
```

有疑问的具体改动再跑：

```bash
git log -p "$RANGE" -- <specific-path>
git show <sha> -- <specific-file>
```

### Step 2 — 把变更映射到各份文档

这是项目相关性最强的一步。决策原则（**通用规则**）：

| 变更性质 | 默认映射 |
|---------|---------|
| 对外可见能力（CLI 命令、公共 API、环境变量、配置键）新增/删除/签名变化 | README 类 + CHANGELOG |
| 内部实现重构但行为未变 | 视情况写 CHANGELOG "变更" 节；AGENTS 类更新行为规约 |
| 依赖升级（Dependabot 等） | CHANGELOG 聚合为一条"依赖周更"；安全 CVE 进"安全"节 |
| CI/CD 流水线变动 | CHANGELOG + AGENTS / CONTRIBUTING 的"发布约定"节 |
| 文档自身 | 仅 CHANGELOG 的"文档"节，且仅当对外可见时 |
| 测试 / 开发工具链 | 通常不进 CHANGELOG；AGENTS 的"测试要求"节酌情更新 |
| 新增顶层目录 / 新增顶级文件 | 如 AGENTS 类存在"仓库布局"章节则必须同步 |

**规则可由项目扩展**：如果项目有专属的映射表（例如某路径变更必须同步某文档），把规则沉淀到 `references/` 下的项目特定章节，或在 state 文件中加 `path_doc_map` 字段。本技能本身不预设任何路径-文档映射。

同一条变更可能同时触发多份文档的更新；以**对外可见性**为第一判据。

### Step 3 — 按各自契约更新文档

每类文档的通用契约见 references：

- README 类：[references/readme-contract.md](references/readme-contract.md)
- AGENTS / 代理手册类：[references/agents-contract.md](references/agents-contract.md)
- CHANGELOG 类：[references/changelog-contract.md](references/changelog-contract.md)

**通用硬约束**：

1. 多语言镜像文档（如 `README.md` + `README-<lang>.md`）必须**结构对等**（同样的章节标题数、同样的表格列数、同样的小节顺序）
2. 代码实体（CLI 命令、命令行标志、路径、文件名、版本号、配置键）在所有语言版本中**原样保留，不翻译**
3. CHANGELOG 顶部必须保持 `[Unreleased]` 段落；只有检测到版本 tag 发生才把条目移入新版本段落
4. AI 代理手册中的"仓库布局 / 目录树"类小节是结构性真实来源 —— 新增/删除顶层目录或文件时必须同步
5. 所有改动只做**差量**修改，不要整页重写；已有小节的语气、行文、字段保持连贯

### Step 4 — 验证

```bash
# 1) 多语言镜像结构对等（示例：README 两语言版本二级标题数相等）
# 根据项目实际情况调整
# grep -c '^##\s' README.md
# grep -c '^##\s' README-ZH.md

# 2) CHANGELOG 顶部仍有 [Unreleased]
# head -30 CHANGELOG.md | grep -q '\[Unreleased\]' && echo OK || echo MISSING

# 3) 代理手册中的仓库布局小节反映实际目录
# ls -1 <top-level-dirs>

# 4) 跑一次项目级校验（根据项目实际命令）
# pnpm lint / npm run build / make check / cargo check ...
```

具体命令由项目实际工具链决定；本技能不硬编码任何语言栈。

### Step 5 — 写回 state 文件

全部验证通过后，把当前 HEAD 写回 state 文件：

```bash
NEW_SHA=$(git rev-parse HEAD)
NEW_SUBJECT=$(git log -1 --format=%s)
NEW_DATE=$(git log -1 --format=%aI)
PREV_SHA=$(jq -r .last_sync_sha "$STATE_FILE")
TOTAL_SYNCS=$(jq -r '.total_syncs // 0' "$STATE_FILE")
```

然后**原子化**写入（先写到 `.tmp` 再 rename）。完整字段见 [references/state-json-schema.md](references/state-json-schema.md)。

**只有在真正改动了文档之后才更新 `last_sync_sha`。** 如果本次检查 diff 后判定"所有文档都无需改动"，仍要把 `last_sync_sha` 推进到当前 HEAD（避免下次重复扫描同一区间），但把 `synced_docs` 置为 `[]` 表示这次是"空同步"。

### Step 6 — 向用户报告

按以下模板汇报：

```
Docs 同步完成
  范围：<PREV_SHORT>..<NEW_SHORT>（N commits, M files, +X/-Y）
  改动的文档：
    - <doc_a>：<一句话说明改了哪里>
    - <doc_b>：<一句话>
    - ...
  state：last_sync_sha 已更新 → <NEW_SHORT>（写入 <STATE_FILE>）
```

## 边界情况处理

| 情形 | 处理 |
|------|------|
| 仓库处于 detached HEAD 或 rebase 中 | 报错并退出：`git status` 有未完成操作时禁止同步 |
| 工作区有未提交改动 | 警告用户"工作区有未提交改动，同步只基于已提交的 HEAD"，允许继续但不 stash |
| `last_sync_sha` 不在当前分支历史中（被 rebase 丢了） | 回退到 `git merge-base HEAD <last_sync_sha>`，基于这个 merge-base 做 diff；如找不到则退回"首次运行"流程并提示用户 |
| 区间内有 merge commit | `git log --oneline --no-merges` 已跳过；如需看合并带入的文件，用 `git diff $LAST..HEAD`（不加 `--no-merges`） |
| 区间内跨越了版本 tag（发布发生过） | CHANGELOG 类要把相应变更从 `[Unreleased]` 移入对应版本段落，并更新底部 compare 链接 |
| 变更全部是文档自身 | 判为"空同步"；`last_sync_sha` 推进，`synced_docs: []` |
| 变更极多（100+ files, 跨多个主题） | 不要一次性硬塞进 Unreleased；按主题聚合为 3~5 个条目；冗长细节放到项目自身的详细文档中 |
| state 文件被并行改动产生冲突 | 保留 `last_sync_sha` 值在 git 历史中更靠后的那个；`total_syncs` 取较大值 |

## state 文件契约

快速参考（完整定义见 [references/state-json-schema.md](references/state-json-schema.md)）：

- `schema_version`：整数，当前为 `1`
- `state_path`：state 文件相对仓库根的路径（自描述字段，便于协作者定位）
- `tracked_docs`：本项目纳入同步的文档列表（相对路径）
- `last_sync_sha`：上次同步基线（40 字符 SHA），首次运行前为 `null`
- `previous_sync_sha`：上上次基线（用于故障回滚），首次为 `null`
- `total_syncs`：累计触发次数（含空同步）
- `synced_docs`：本次实际被修改的文档文件名数组

## 相关资料

- [templates/state.json.tmpl](templates/state.json.tmpl) — 首次运行时用作 state 骨架
- [references/readme-contract.md](references/readme-contract.md) — README 类文档的通用结构契约与多语言对等规则
- [references/agents-contract.md](references/agents-contract.md) — AI 代理手册类文档的通用契约与写作风格
- [references/changelog-contract.md](references/changelog-contract.md) — Keep a Changelog 约定与 tag 迁移流程
- [references/state-json-schema.md](references/state-json-schema.md) — state 文件完整字段定义与版本演进规则
