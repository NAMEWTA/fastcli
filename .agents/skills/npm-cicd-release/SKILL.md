---
name: npm-cicd-release
type: tool-command
description: >-
  npm 包 CI/CD 全流程：commit → docs-sync → bump → tag → release workflow → 三端验证 → state 推进。
  release.yml 含 npm publish 走三端校验，否则只校验 GitHub Release 与 workflow。
  触发词：npm release / publish / 一键发布 / 发版 / cicd。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 链式加载本命令依赖的三个 workflow-step skill
specforge list --skills --triggers=git-commit,提交,commit,粒度 --format=json
specforge list --skills --triggers=docs-sync,文档同步,changelog,update-docs --format=json
specforge list --skills --triggers=github-ops,release,publish,tag,npm --format=json

# 环境检测 — 工具链与依赖
specforge doctor --check-node --check-deps --quiet

# 仓库前置检测 — 在 main / 工作区干净 / 远端可达
git status --porcelain
git rev-parse --abbrev-ref HEAD
git ls-remote --exit-code origin >/dev/null 2>&1 && echo "REMOTE_OK" || echo "REMOTE_UNREACHABLE"

# Release workflow 形态检测 — 决定后续是否做 npm 端校验
RELEASE_YML=".github/workflows/release.yml"
if [ -f "$RELEASE_YML" ]; then
  if grep -Eq 'npm[[:space:]]+publish|run:[[:space:]]*pnpm[[:space:]]+publish|run:[[:space:]]*yarn[[:space:]]+publish|JS-DevTools/npm-publish' "$RELEASE_YML"; then
    echo "PUBLISH_TO_NPM=true"
  else
    echo "PUBLISH_TO_NPM=false"
  fi
else
  echo "RELEASE_YML_MISSING=true"
fi

# docs-sync 基线状态
test -f .docs-sync-state.json && jq -r '{last_sync_sha,last_sync_short,total_syncs}' .docs-sync-state.json
-->

# npm CI/CD 全流程编排（npm-cicd-release）

把 SpecForge 三个 workflow-step skill —— `git-commit-template`、`docs-sync`、`github-ops` —— 串成一条单向流水线，从一组未提交的代码改动一直跑到「npm + GitHub Release + workflow 三端全绿 + docs-sync 基线推进」。
**不发明新流程**，每一步严格调用对应 skill 的 SOP 与铁律。

> 关于「检测 npm publish 是否成功」：本命令在 Phase 0 嗅探 `.github/workflows/release.yml`，**含 `npm publish` 才做 npm 端校验**；不含（如 release-only 流水线）则只做 GitHub Release 与 workflow 校验，避免对未发包的仓库报伪阳性。

## Iron Law

> **禁止跳过任何一个 skill 的 Iron Law。**
> - `git-commit-template`：禁止提交破坏构建的代码 —— Phase 1 必须 lint + test 全绿。
> - `docs-sync`：禁止在不读取 `last_sync_sha` 与 `HEAD` 之间 diff 的情况下修改任何对外文档 —— Phase 2 必须先收集 git 差异。
> - `github-ops`：tag 必须精确指向 **release commit**（含 `package.json` 与 `CHANGELOGS.md` bump 的那个 commit），不允许指向后续 docs / state commit。
> 任何一项缺失视为残次品，禁止合入主干。

## 快速开始

```bash
# 标准全流程（推荐）
specforge npm-cicd-release --version 0.0.12

# 仅核对前置条件，不实际推进任何步骤
specforge npm-cicd-release --dry-run

# 仅做 docs-sync + commit，不发版（用于阶段性合入）
specforge npm-cicd-release --no-release
```

参数：

| 标志 | 作用 |
|------|------|
| `--version <X.Y.Z>` | 显式指定本次发布版本，缺省则在 Phase 3 交互询问 |
| `--dry-run` | 仅跑 Phase 0 检测 + 给出 Phase 1–6 计划，不写任何文件、不 push |
| `--no-release` | 在 Phase 2 docs-sync 完成后停止；不 bump、不打 tag |
| `--commit-message <msg>` | 覆盖 Phase 1 自动生成的 commit message |
| `--skip-check` | 跳过 `pnpm check`（不推荐；仅在已外部预演时使用） |

---

## 流水线总览

```
npm-cicd-release
  │
  ├─ Phase 0: 前置检测（工具链 / 仓库 / release.yml 形态）
  │
  ├─ Phase 1: Commit ⟵ git-commit-template skill
  │   └─ lint + test → 暂存 → conventional commit
  │
  ├─ Phase 2: Docs Sync ⟵ docs-sync skill
  │   └─ last_sync_sha..HEAD diff → 映射对外文档 → [Unreleased]
  │
  ├─ Phase 3: 版本 bump + tag ⟵ github-ops skill
  │   ├─ 迁移 [Unreleased] → [X.Y.Z]
  │   ├─ bump package.json
  │   ├─ pnpm check（lint + test + build）
  │   ├─ release commit
  │   └─ tag <release-commit-sha> + push
  │
  ├─ Phase 4: 监控 release workflow
  │   └─ gh run watch；关注 Extract release notes / publish / Create Release 步骤
  │
  ├─ Phase 5: 三端验证（条件分支）
  │   ├─ PUBLISH_TO_NPM=true  → npm view + gh release view + workflow
  │   └─ PUBLISH_TO_NPM=false → gh release view + workflow（跳过 npm view）
  │
  └─ Phase 6: 推进 docs-sync 基线
      └─ .docs-sync-state.json#last_sync_sha → release commit SHA + push
```

---

## Phase 0 — 前置检测

→ **详细清单：** 读取 [references/preflight-checklist.md](references/preflight-checklist.md)

固定执行：

- [ ] 当前分支是 `main`（或仓库声明的发布分支）
- [ ] `git status --porcelain` 为空（除被 `--commit-message` 显式纳管的改动）
- [ ] `git ls-remote origin` 可达
- [ ] `gh auth status` 已登录、有 repo 权限
- [ ] 本仓库的发布工具链可用：`pnpm --version` / `node --version` ≥ 仓库 `engines.node`
- [ ] **嗅探 `.github/workflows/release.yml`**：
  - 文件不存在 → 报 `RELEASE_YML_MISSING`，提示用户先运行 `github-ops` skill 落 `release.yml`，本命令终止
  - 含 `npm publish` / `pnpm publish` / `yarn publish` / `JS-DevTools/npm-publish@*` → 标记 `PUBLISH_TO_NPM=true`
  - 否则 → 标记 `PUBLISH_TO_NPM=false`，并在 Phase 5 跳过 npm view
- [ ] 读取 `.docs-sync-state.json`（不存在 → 走 docs-sync 首次运行流程，本命令转交）

任一项不通过 → 终止流水线，输出修复建议；不要试图自动跳过。

---

## Phase 1 — Commit（git-commit-template skill）

→ **依据：** `templates/.specforge/skills/workflow-steps/git-commit-template/SKILL.md`

执行步骤：

- [ ] **提交前自检**：`pnpm lint` + `pnpm test`（或仓库声明的等价命令）必须全绿
- [ ] **粒度审查**：本次改动是否符合「一组合适的变更 = 一个 commit」？
  - 出现「和 / 及 / 以及」并列词 → 拆分
  - 涉及 ≥ 5 个不相关文件 → 拆分
- [ ] **暂存**：`git add <显式路径>`，**禁止** `git add .`（避免误纳 untracked 噪声）
- [ ] **commit**：遵循 Conventional Commits
  - `feat(<scope>): <summary>` / `fix(<scope>): <summary>` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:`
  - body 用中文，描述「做了什么 / 为什么」
- [ ] **WIP 处理**：若历史含 `WIP:` 前缀 → 先 `git rebase -i` squash 成有意义的 commit，再继续

> ⚠️ 此 Phase 完成后**项目必须处于可工作状态**（构建通过、测试通过）。否则视为违反 git-commit-template Iron Law，回滚后重做。

---

## Phase 2 — Docs Sync（docs-sync skill）

→ **依据：** `templates/.specforge/skills/workflow-steps/docs-sync/SKILL.md`

严格按 docs-sync 的 6 步执行，**不要跳过 Step 1 的 git 差异收集**：

- [ ] **Step 0**：读 `.docs-sync-state.json`，取 `LAST_SYNC_SHA` 与当前 `HEAD_SHA`；若 `LAST_SYNC_SHA == HEAD_SHA` → 跳过 Phase 2 直接进 Phase 3
- [ ] **Step 1**：固定四条 `git log/diff` 收集差异（`--no-merges` log / `--name-status` / `--shortstat` / 路径分组）
- [ ] **Step 2**：把变更按「对外可见性」映射到 `tracked_docs`（默认表见 docs-sync skill §Step 2）
- [ ] **Step 3**：按各类文档契约写入差量
  - README 类：多语言镜像结构对等
  - CHANGELOG 类：仅写入 `[Unreleased]`，**保留** `[Unreleased]` 占位段落
  - AGENTS 类：新增 / 删除顶层目录或文件时同步「仓库布局」
- [ ] **Step 4**：跑项目级校验（`pnpm lint` 等），确保改动未引入语法或格式问题
- [ ] **Step 5**：**不要在此 Phase 推进** `last_sync_sha` —— 推进延后到 Phase 6（避免在 release commit 之前 lock 基线）
- [ ] **Step 6**：用 docs-sync 模板向用户汇报本次 diff 量级与改动文档

> ⚠️ 若本区间所有差异都是文档自身或测试，仍需如实判断；此时 `--no-release` 是合理选项。

---

## Phase 3 — 版本 bump + tag（github-ops skill）

→ **依据：** `templates/.specforge/skills/workflow-steps/github-ops/SKILL.md` 第 5.2 / 5.3 节

子步骤：

### 3.1 迁移 CHANGELOG
- [ ] 把 `[Unreleased]` 段落内容整体移入新版本 `[X.Y.Z] — YYYY-MM-DD`（日期使用 UTC）
- [ ] **保留** `[Unreleased]` 空占位段落与分隔线
- [ ] 校验顶部结构：`head -30 CHANGELOGS.md | grep -q '\[Unreleased\]' && echo OK`

### 3.2 bump 版本号
- [ ] `package.json` 的 `version` 改成 `X.Y.Z`，与即将打的 tag `vX.Y.Z` 严格对齐
- [ ] **不要**手动改 `package-lock.json` / `pnpm-lock.yaml`，由后续 `pnpm install` 在 CI 自然刷新

### 3.3 发布前预演（Iron Law 强约束）
- [ ] 跑 `pnpm check`（= `pnpm lint && pnpm test && pnpm build`），**不要**绕过
- [ ] `--skip-check` 仅允许在外部已预演场景下使用，并向用户写明为何跳过

### 3.4 落 release commit
- [ ] `git add package.json CHANGELOGS.md`（仅这两文件）
- [ ] `git commit -m "chore(release): vX.Y.Z"`
- [ ] 记录 release commit SHA → `RELEASE_COMMIT_SHA`

### 3.5 push main + 打 tag（指向 release commit）
```bash
git push origin main
git tag vX.Y.Z $RELEASE_COMMIT_SHA   # 精确指向 release commit
git push origin vX.Y.Z
```

> ⚠️ 必须先 push main 再 push tag，且 tag 精确指向 `RELEASE_COMMIT_SHA`。
> 若先打 tag 后又落了 docs / state commit，**不要**让 tag 跟着 HEAD 移动。

---

## Phase 4 — 监控 release workflow

```bash
WORKFLOW_RUN_ID=$(gh run list --workflow release.yml --limit 1 --json databaseId,headSha \
  | jq -r ".[0] | select(.headSha == \"$RELEASE_COMMIT_SHA\") | .databaseId")
gh run watch "$WORKFLOW_RUN_ID" --exit-status
```

关注步骤（按 github-ops v1.1.0 的 release.yml 形态）：
- `Verify tag matches package version`
- `Run lint` / `Run tests` / `Build` / `Verify bin entry`
- `Extract release notes from CHANGELOGS.md`（若仓库已采纳 v1.1.0 注入方案）
- `Publish to npm`（仅当 `PUBLISH_TO_NPM=true`）
- `Create GitHub Release`

任一步骤 fail → 进入 [references/failure-recovery.md](references/failure-recovery.md) 的对应分支：

| 失败位置 | 是否可重试同 tag | 恢复手段 |
|---------|-----------------|---------|
| publish 之前任何步骤 | ✅ 可 | 删 tag + 修代码 + 重打同 tag |
| publish 之后步骤 fail（如 Create Release）| ❌ 不重发 npm | 手动 `gh release create` 补 Release |
| `Publish to npm` 本身上传失败 | ✅ 可 | 删 tag + 修代码 + 重打同 tag |
| npm 已成功上传后任何失败 | ❌ 永久不可重发同版本号 | bump 到 `X.Y.(Z+1)` 重走 |

---

## Phase 5 — 三端验证（条件分支）

`PUBLISH_TO_NPM` 由 Phase 0 嗅探得出。**仅当为 true 时**做 npm view 校验。

### 5.1 GitHub Release 与 workflow（始终执行）

```bash
gh release view "vX.Y.Z" --json name,tagName,isDraft,isPrerelease,body
gh run list --workflow release.yml --limit 1 --json conclusion,headSha
```

判定：
- `isDraft == false` 且 `isPrerelease == false`
- `body` 非空且包含来自 CHANGELOG 的 `### Added` / `### Changed` 等小节
  - 仅 `Full Changelog: ...` 一行视为残次品 → 走 github-ops skill §5.3 的事后回填命令
- `conclusion == success`，`headSha == RELEASE_COMMIT_SHA`

### 5.2 npm 端校验（仅 PUBLISH_TO_NPM=true）

```bash
# CDN 传播 30–60 秒；首次查询失败可再等 30s 重试一次
npm view "<package-name>" version
npm view "<package-name>" dist-tags
```

判定：`version == X.Y.Z`，`dist-tags.latest == X.Y.Z`。

### 5.3 PUBLISH_TO_NPM=false 的处理

仅做 5.1 的两项校验；显式向用户输出：

```
本仓库 release.yml 不含 npm publish 步骤；本次仅校验 GitHub Release 与 workflow。
若期望发包到 npm，请先用 github-ops skill 在 release.yml 中加入 npm publish 步骤后重试。
```

---

## Phase 6 — 推进 docs-sync 基线

仅当 Phase 1–5 全绿时执行。

- [ ] 用 `RELEASE_COMMIT_SHA` 推进 `.docs-sync-state.json`：
  - `last_sync_sha` ← `RELEASE_COMMIT_SHA`
  - `last_sync_short` ← 前 7 位
  - `last_sync_commit_subject` ← `chore(release): vX.Y.Z`
  - `last_sync_commit_date` ← release commit 的 `git log -1 --format=%aI`
  - `last_sync_run_at` ← 当前 UTC ISO 时间
  - `previous_sync_sha` ← 推进前的 `last_sync_sha`
  - `total_syncs` ← +1
  - `synced_docs` ← Phase 2 实际改动的文档列表
- [ ] **原子写入**：先写 `.docs-sync-state.json.tmp` 再 `mv`
- [ ] commit + push：`docs: 推进 docs-sync 基线至 vX.Y.Z release commit`

> ⚠️ 此 commit **晚于** tag。tag 已锚定在 release commit，state commit 漂浮在 main HEAD 上属正常形态。

---

## 完成检查清单

- [ ] Phase 0 检测全部通过，且 `PUBLISH_TO_NPM` 已确定
- [ ] Phase 1 commit 后 `pnpm lint && pnpm test` 全绿
- [ ] Phase 2 仅修改对外可见文档；`[Unreleased]` 段落保留
- [ ] Phase 3 release commit 单文件清单 = `package.json` + `CHANGELOGS.md`
- [ ] Phase 3 `pnpm check` 全绿（除非用户明确 `--skip-check`）
- [ ] Phase 3 tag 严格指向 release commit SHA
- [ ] Phase 4 workflow `conclusion == success`
- [ ] Phase 5 GitHub Release `body` 非空 + 非 draft + 非 prerelease
- [ ] Phase 5（仅 npm 分支）`npm view` 版本与 tag 严格一致
- [ ] Phase 6 `.docs-sync-state.json` 已原子写入并推送

---

## 产物清单

| 产物 | 路径 / 位置 | 说明 |
|------|-------------|------|
| 普通改动 commit | git history | Phase 1 产出，Conventional Commits |
| 文档同步差量 | `tracked_docs` 各文件 | Phase 2 在 `[Unreleased]` 与对外文档落差量 |
| Release commit | git history | Phase 3，仅含 `package.json` + `CHANGELOGS.md` |
| 版本 tag | `refs/tags/vX.Y.Z` | Phase 3，精确指向 release commit |
| GitHub Release | `gh release view vX.Y.Z` | Phase 4 由 `softprops/action-gh-release` 落地 |
| npm 包 | `npm view <pkg> version`（仅 `PUBLISH_TO_NPM=true`） | Phase 4 由 `npm publish --provenance` 落地 |
| docs-sync state 推进 | `.docs-sync-state.json` | Phase 6，提交日志 `docs: 推进 docs-sync 基线至 vX.Y.Z release commit` |

---

## 完成衔接（handoff）

本命令是 tool-command，跨阶段使用。完成后默认建议：

| 触发条件 | 建议下一步 | 理由 |
|---------|------------|------|
| 发布顺利、本次属于一个完整 change 的尾声 | `evolution-retrospect` | 进入复盘沉淀，把摩擦点 / lessons 抽取到 `specforge/context/lessons.md` |
| 发布顺利、紧接下一个迭代 | `requirements-clarify` | 在新分支 / 新 change 启动新一轮需求澄清 |
| Phase 4–5 出现失败被回滚 | 重跑 `npm-cicd-release` 或转 `debugging` | 见 `references/failure-recovery.md` 选择路径 |

handoff 不在 `.specforge/config.yaml#handoffs` 硬绑（tool-command 跨阶段），但**必须**在终端输出中明确给出 1–2 个建议下一步，避免选择瘫痪。

---

## 常见阻断与纠偏

| 信号 | 错误码 | 修复 |
|------|--------|------|
| Phase 0 嗅探到 `RELEASE_YML_MISSING` | `E001_missingPrerequisiteArtifact` | 转 `github-ops` skill，先用 `references/workflow-yaml-reference.md` 落 `release.yml`，再回到本命令 |
| Phase 1 lint / test 失败仍试图 commit | `E004_noVerificationEvidence` | 修代码或修测试，禁止用 `--skip-check` 绕过 git-commit-template Iron Law |
| Phase 2 跳过 git diff 直接改文档 | `docs-sync` Iron Law 违反（无配套 E 编号，记 `E005_contextOverload` 派生） | 回滚改动，从 Step 0/1 重做 |
| Phase 3 tag 指向了 docs / state commit | github-ops Iron Law 违反 | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`，重新 `git tag vX.Y.Z $RELEASE_COMMIT_SHA` |
| Phase 4 同一 tag 第 ≥ 2 次失败、根因未声明差异 | `E010_repeatedFailurePattern`（违反 P9） | 先停手，书面声明本次重试与上次的差异，再继续 |
| Phase 5 `body` 仅 `Full Changelog: ...` 一行 | github-ops §5.3 触发 | 用 skill 文档中的 `gh release edit --notes-file` 命令事后回填 |
| 已 `npm publish` 后想改同版本 | github-ops 「铁律：npm 不允许重发相同 version」 | bump 到 `X.Y.(Z+1)` 重走整个流水线 |

完整失败案例库见 [references/failure-recovery.md](references/failure-recovery.md)。

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "本地已经跑过测试，CI 没必要再跑" | release.yml 是发布前**最后一道**统一标准；本地环境无法替代 `pnpm check` 的预演意义 |
| "tag 指向 docs commit 也能发出去" | tag 锚定 release commit 是**可追溯性**约束；后续 hotfix / 回滚 / 二次发布会因此错位 |
| "`[Unreleased]` 顶部空着没事" | docs-sync skill 强约束保留 `[Unreleased]` 占位段落，便于下次增量；移除会让下一次同步失去落点 |
| "Release body 只有 Full Changelog 也算成功" | 那是 `softprops/action-gh-release` 在 PR 流程外的退化输出；用户从 GitHub Releases 页看不到任何信息，等同发布残次品 |
| "publish 失败了，我直接改下版本号重发" | 仅当 npm 真的接收过 tarball 才需要 bump；publish **之前** fail 的 tag 可删可重打，盲目 bump 会污染版本空间 |
| "工作区有点未提交改动，但和这次发布无关，直接发吧" | 未提交改动会导致后续 `git tag $SHA` 锚点漂移；先 stash 或显式 commit 再发 |

---

## References 导航（按需加载）

| 场景 | 参考文档 | 核心内容 |
|------|---------|---------|
| 想看 Phase 0 完整前置清单（不止表面 5 项） | [references/preflight-checklist.md](references/preflight-checklist.md) | 11 项前置探测 + 失败建议 |
| 想看 release.yml 是否含 npm publish 的判定脚本细节 | [references/publish-detection.md](references/publish-detection.md) | grep 模式集合、第三方 action 清单、误判排除 |
| Phase 4–5 任何步骤失败 | [references/failure-recovery.md](references/failure-recovery.md) | 4 类失败场景的回滚剧本 + 错误码映射 |

**渐进式披露原则：**
- 命令正文（≤ 350 行）保留三 skill 的关键链路与 Iron Law 引用
- 长清单 / 失败剧本 / 探测脚本均在 `references/` 按需加载
- 命令本身**不复刻** `git-commit-template` / `docs-sync` / `github-ops` 的内容，只在 Phase 1/2/3 引用对应 SKILL.md 的章节锚点
