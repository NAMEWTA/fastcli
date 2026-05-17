---
name: release-deploy
type: workflow-command
description: >-
  发布、部署与归档——发布前验证、版本号管理、CHANGELOG 生成、Git 标签、分支收尾、变更归档。
  触发场景："发布上线"、"部署到生产"、"创建一个发布"、"ship it"、"deploy"、"push to main"。
version: "2.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配发布/部署相关技能
specforge list --skills --triggers=release,deploy,ship,publish --format=json

# 前置产物检测
specforge status --phase=release --check-requires

# 环境检测
specforge doctor --check-deps --quiet

# 分支与平台检测
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo 'unknown')"
git remote get-url origin 2>/dev/null || echo "REMOTE: none"

# 平台检测
if git remote get-url origin 2>/dev/null | grep -q "github.com"; then
  echo "PLATFORM: github"
  gh auth status 2>/dev/null && echo "GH_CLI: authenticated" || echo "GH_CLI: not_authenticated"
elif git remote get-url origin 2>/dev/null | grep -q "gitlab"; then
  echo "PLATFORM: gitlab"
  glab auth status 2>/dev/null && echo "GLAB_CLI: authenticated" || echo "GLAB_CLI: not_authenticated"
else
  echo "PLATFORM: unknown"
fi

# 基分支检测
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
[ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git rev-parse --verify origin/main 2>/dev/null && echo "main")
[ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git rev-parse --verify origin/master 2>/dev/null && echo "master")
[ -z "$BASE_BRANCH" ] && BASE_BRANCH="main"
echo "BASE_BRANCH: $BASE_BRANCH"

# Git 状态
git status --porcelain 2>/dev/null | head -20
echo "DIRTY: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
-->

<!-- route-statement
路由：release-deploy
Change-ID：{{changeId}}
已加载：
  - release-deploy.md (本文件)
  - QUALITY-REPORT.md (质量门禁结果)
未加载（后续按需）：
  - references/version-management-guide.md（预算 40 行）
  - references/changelog-voice-guide.md（预算 30 行）
  - references/pr-body-template.md（预算 25 行）
  - references/archive-patterns.md（预算 20 行）
第一动作：检查质量门禁状态，验证发布就绪条件
Token 预算估算：约 4500 tokens
-->

# 发布、部署与归档

## Iron Law

> **绝对阻断规则 —— 以下情况禁止发布，无例外：**
>
> 1. **质量门禁非 PASS**：QUALITY-REPORT.md 中 Gate Decision 不是 PASS → 回到 quality-verify
> 2. **测试失败未修复**：任何测试命令有失败输出 → 修复前禁止发布
> 3. **基分支未合并**：未合并最新基分支 → 合并前禁止发布
> 4. **版本号不一致**：VERSION 与 package.json 版本号不同 → 修复前禁止发布
> 5. **CHANGELOG 未更新**：CHANGELOG.md 未包含本分支所有 commit → 补充前禁止发布
> 6. **无新鲜验证证据**：未运行验证命令或输出不支持"可发布"结论 → 禁止宣称发布完成
>
> **跳过任何一步验证 = 说谎，不是发布。**

门禁引用：`.specforge/config.yaml` 的 `rules.release.hardGates`

---

## Step 1: 发布前验证

### 1.1 质量门禁检查

读取 `QUALITY-REPORT.md`，确认：
- [ ] Gate Decision = PASS
- [ ] 无残留 Critical 反馈
- [ ] 所有 Important 反馈已处理或有明确处理计划
- [ ] 测试结果全部通过

**未通过则阻断**，返回 `quality-verify` 阶段。

### 1.2 发布就绪检查清单

- [ ] 所有代码已提交
- [ ] 工作目录干净（无未提交变更）
- [ ] 基分支已合并（如适用）
- [ ] CI/CD 流水线通过（如适用）

### 1.3 验证门控函数

**在宣称发布完成之前，必须执行以下门控：**

```
1. 确定：什么命令能证明发布就绪？
   - 测试命令：<test-command>（参见 skills/workflow-steps/language-adapters 第 1 节）
   - Lint 命令：<lint-command>
   - 构建命令：<build-command>

2. 运行：执行完整命令（重新运行，完整执行）
   - 不要用之前的运行结果
   - 不要跳过任何步骤

3. 阅读：完整输出，检查退出码，统计失败数
   - 测试：0 failures
   - Lint：0 errors
   - Build：exit 0

4. 验证：输出是否支持"可发布"结论？
   - 如果否：用证据说明实际状态
   - 如果是：带证据陈述结论

5. 只有这时：才能宣称发布完成
```

**跳过任何一步 = 说谎，不是验证**

### 1.4 常见失败模式

| 结论 | 需要 | 不够格 |
|------|------|--------|
| 测试通过 | 测试命令输出：0 failures | 之前的运行结果、"应该会通过" |
| Lint 无报错 | Lint 输出：0 errors | 部分检查、推断 |
| 构建成功 | 构建命令：exit 0 | linter 通过、日志看起来没问题 |
| Bug 已修复 | 测试原始症状：通过 | 代码改了，假设已修复 |

### 1.5 红线——停下来

- 使用"应该"、"大概"、"似乎"
- 验证前就表达满意（"太好了！"、"完美！"、"搞定！"）
- 即将提交/推送/创建 PR 却没有验证
- 依赖部分验证
- 想着"就这一次"
- **任何暗示成功但实际未运行验证的措辞**

---

## Step 2: 发布准备（版本管理）

### 2.1 版本状态检测

> SpecForge 以 `VERSION` 文件作为**语言无关的主版本源**，同时需同步到本语言生态的版本字段（`package.json` / `pyproject.toml` / `pom.xml` / `Cargo.toml` / `*.csproj` 等）。具体请参见 `skills/workflow-steps/language-adapters` 第 2 节。

```bash
# 读取主版本源与基线
BASE_VERSION=$(git show origin/<base>:VERSION 2>/dev/null | tr -d '\r\n[:space:]' || echo "0.0.0.0")
CURRENT_VERSION=$(cat VERSION 2>/dev/null | tr -d '\r\n[:space:]' || echo "0.0.0.0")

# 语言生态版本（示例代码，请按本项目技术栈选一表达）
# Node:    LANG_VERSION=$(node -e 'console.log(require("./package.json").version||"")' 2>/dev/null)
# Python:  LANG_VERSION=$(python -c 'import tomllib;print(tomllib.load(open("pyproject.toml","rb"))["project"]["version"])' 2>/dev/null)
# Maven:   LANG_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args='${project.version}' --non-recursive exec:exec 2>/dev/null)
# Gradle:  LANG_VERSION=$(gradle -q properties | awk '/^version:/ {print $2}')
# Go:      LANG_VERSION=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//')
# Rust:    LANG_VERSION=$(awk -F '\"' '/^version/ {print $2; exit}' Cargo.toml)

echo "BASE: $BASE_VERSION  VERSION: $CURRENT_VERSION  LANG: ${LANG_VERSION:-<none>}"
```

**四种状态（适用于任何语言）：**
- **FRESH**：`CURRENT_VERSION == BASE_VERSION` → 需要 bump
- **ALREADY_BUMPED**：`CURRENT_VERSION != BASE_VERSION` 且 `LANG_VERSION == CURRENT_VERSION` → 跳过 bump
- **DRIFT_STALE_PKG**：`CURRENT_VERSION != BASE_VERSION` 但 `LANG_VERSION != CURRENT_VERSION` → 仅同步语言生态的版本字段
- **DRIFT_UNEXPECTED**：版本号混乱 → 停止并询问用户

### 2.2 自动判断版本级别

基于 diff 内容自动判断：

```bash
# 统计变更行数
DIFF_LINES=$(git diff origin/<base>...HEAD --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")

# 检测功能信号
HAS_FEATURE=$(git diff origin/<base>...HEAD --name-only | grep -E '(page\.|route\.|migration\.|schema\.)' | wc -l)
```

**判断规则：**
- **MICRO**（第4位）：< 50 行变更，琐碎修复、拼写错误、配置
- **PATCH**（第3位）：50+ 行变更，无功能信号
- **MINOR**（第2位）：检测到功能信号（新路由/迁移/测试文件）→ **询问用户**
- **MAJOR**（第1位）：破坏性变更 → **询问用户**

### 2.3 版本号验证与同步

**版本格式**：`MAJOR.MINOR.PATCH.MICRO`（4-digit）

```bash
# 验证版本号格式
if ! printf '%s' "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "ERROR: 版本号格式错误，应为 MAJOR.MINOR.PATCH.MICRO"
  exit 1
fi

# 同步到主版本源
echo "$NEW_VERSION" > VERSION

# 同步到本语言生态版本字段（选一，参见 language-adapters 第 2 节）：
# Node:    npm version --no-git-tag-version "$NEW_VERSION"  # 或 pnpm version
# Python:  poetry version "$NEW_VERSION"                    # 或手改 pyproject.toml
# Maven:   mvn versions:set -DnewVersion="$NEW_VERSION" -DgenerateBackupPoms=false
# Gradle:  sed -i.bak 's/^version = .*/version = "'$NEW_VERSION'"/' build.gradle.kts
# Go:      git tag "v$NEW_VERSION"                          # Go 以 tag 作为版本
# Rust:    cargo set-version "$NEW_VERSION"                 # 需 cargo-edit
```

**详细版本管理指南**：[references/version-management-guide.md](references/version-management-guide.md)

---

## Step 3: CHANGELOG 生成

### 3.1 完整流程

1. **读取 CHANGELOG.md 头部**了解现有格式
2. **枚举所有 commit**：
   ```bash
   git log <base>..HEAD --oneline
   ```
3. **读取完整 diff**：
   ```bash
   git diff <base>...HEAD
   ```
4. **按主题分组 commit**：
   - Added：新功能/能力
   - Changed：现有功能变更
   - Fixed：Bug 修复
   - Removed：移除的功能
   - Performance：性能优化
   - Infrastructure：基础设施/工具/测试

5. **生成 CHANGELOG 条目**，覆盖所有主题
6. **交叉检查**：每个 commit 必须映射到至少一个 bullet point

### 3.2 Voice 规范

- **以用户现在能做什么开头**，而非实现细节
- 使用通俗语言，开发者能理解
- **绝不提及**：TODOS.md、内部跟踪、贡献者细节
- 日期格式：`YYYY-MM-DD`

**格式示例：**
```markdown
## [X.Y.Z.W] - YYYY-MM-DD

### Added
- 用户现在可以导出报表为 PDF 格式

### Changed
- 优化了搜索性能，响应时间从 2s 降至 200ms

### Fixed
- 修复了时区切换时的日期显示错误
```

### 3.3 交叉检查规则

**绝不遗漏任何 commit**：
- 如果分支有 N 个 commit 跨越 K 个主题，CHANGELOG 必须反映所有 K 个主题
- 不要询问用户描述变更——从 diff 和 commit 历史推断

**CHANGELOG 写作详细指南**：[references/changelog-voice-guide.md](references/changelog-voice-guide.md)

---

## Step 4: 执行发布

### 4.1 可 Bisect 的提交拆分

**目标**：创建小的、逻辑的提交，每个提交独立有效，支持 `git bisect`

**提交顺序**（从先到后，适用于任何技术栈）：
1. **基础设施 / Schema 变更**：DB migration、配置变更、路由添加、Bean 定义调整
2. **领域与服务层**：entity/model、service、use case（及其单元测试）
3. **接入层与表示层**：Controller/Handler/REST API、CLI、前端组件（及其集成测试）
4. **VERSION + CHANGELOG**：始终在最终提交

**拆分规则：**
- 模型与其测试文件在同一提交
- 服务与其测试文件在同一提交
- 迁移独立提交（或与支持模型的提交一起）
- 如果总 diff 很小（< 50 行，< 4 文件），可以单个提交

**每个提交必须**：
- 独立可编译/运行
- 无断开的导入
- 无不存在的代码引用

**提交消息格式**：
```
<type>: <summary>

<body: brief description>
```

类型：feat/fix/chore/refactor/docs

### 4.2 创建 Git 标签

```bash
git tag -a "v<version>" -m "发布 v<version> — <简短描述>"
```

### 4.3 推送（幂等检查）

```bash
# 检查是否已推送
git fetch origin <branch> 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/<branch> 2>/dev/null || echo "none")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "ALREADY_PUSHED"
else
  git push -u origin <branch>
fi

# 推送标签
git push origin "v<version>"
```

**绝对禁止**：`git push --force`

---

## Step 5: 创建 PR/MR

### 5.1 幂等检查

**GitHub**：
```bash
gh pr view --json url,number,state -q 'if .state == "OPEN" then "PR_EXISTS" else "NO_PR" end' 2>/dev/null
```

**GitLab**：
```bash
glab mr view -F json 2>/dev/null | jq -r 'if .state == "opened" then "MR_EXISTS" else "NO_MR" end'
```

- 如果 PR/MR 已存在：**更新 body**（不创建新 PR）
- 如果不存在：**创建新 PR/MR**

### 5.2 PR/MR 标题格式

**强制格式**：`v<VERSION> <type>: <summary>`

版本必须在最前，无例外。

### 5.3 PR/MR Body 必需章节

```markdown
## Summary
<总结所有变更，按主题分组>

## Test Coverage
<测试覆盖率信息，或"所有新代码路径已有测试覆盖">

## Pre-Landing Review
<代码审查发现，或"未发现问题">

## Verification Results
<验证结果摘要：N PASS, M FAIL, K SKIPPED>

## TODOS
<已完成的 TODO 项列表，或"无 TODO 项完成">

## Documentation
<文档更新摘要，如无更新则省略此章节>

## Test plan
- [x] 所有测试通过（N 次运行，0 失败）
- [x] Lint 无报错
- [x] 构建成功
```

**PR Body 完整模板**：[references/pr-body-template.md](references/pr-body-template.md)

### 5.4 创建命令

**GitHub**：
```bash
gh pr create --base <base> --title "v$VERSION <type>: <summary>" --body "<body>"
```

**GitLab**：
```bash
glab mr create -b <base> -t "v$VERSION <type>: <summary>" -d "<body>"
```

---

## Step 6: 分支收尾

**目标**：提供 4 种分支收尾选项

### 6.1 展示选项

在发布完成后，展示以下 4 个选项：

```
发布已完成。你想如何处理这个分支？

1. 在本地合并回 <base-branch>
2. 推送并创建 Pull Request（已在 Step 5 完成）
3. 保持分支现状（我稍后处理）
4. 丢弃这项工作

选哪个？
```

### 6.2 执行选择

| 选项 | 合并 | 推送 | 保留工作树 | 清理分支 |
|------|------|------|-----------|---------|
| **1. 本地合并** | ✓ | - | - | ✓ |
| **2. 创建 PR** | - | ✓ | ✓ | - |
| **3. 保持现状** | - | - | ✓ | - |
| **4. 丢弃** | - | - | - | ✓（强制）|

**选项 1：本地合并**
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
# 验证测试（请使用本语言生态的测试命令，参见 language-adapters）
<test-command>
git branch -d <feature-branch>
```

**选项 2：推送并创建 PR**
- 已在 Step 5 完成
- 报告 PR URL

**选项 3：保持现状**
- 报告："保留分支 <name>。工作树保留在 <path>。"
- **不要清理工作树**

**选项 4：丢弃**
**必须先确认**：
```
这将永久删除：
- 分支 <name>
- 所有提交：<commit-list>
- 工作树 <path>

输入 'discard' 确认。
```

等待精确的 'discard' 确认后才能执行。

### 6.3 工作树清理

**仅对选项 1 和 4 执行**：
```bash
# 检查是否在工作树中
git worktree list | grep $(git branch --show-current)

# 如果是，移除
git worktree remove <worktree-path>
```

**选项 2 和 3 不清理工作树**

---

## Step 7: 运维移交（runbook）

> 运维（runbook/监控/告警/回滚）语义已合并进 release，不再单独存在 operations 阶段。
> 在归档之前，必须确保运维移交文档已就绪，否则视为发布未完成。

### 7.1 必须产出的运维移交内容

在 change 目录创建/更新 `OPS-RUNBOOK.md`，至少覆盖以下章节：

- **部署步骤**：从基线环境到生产环境的可重复执行步骤（命令请参见 `skills/workflow-steps/language-adapters` 的"部署/打包"映射）
- **回滚方案**：精确到命令/版本号/数据迁移逆操作；规定多长时间内必须能完成回滚
- **监控指标**：核心 SLI（成功率/延迟/QPS/错误率/资源占用），各自的告警阈值与告警通道
- **告警响应**：每条告警对应的初步排查步骤、责任人、升级路径
- **依赖与外部接口**：上游/下游系统、第三方服务、密钥与凭证位置（不写明文）
- **已知风险与限制**：本次发布引入的运行时风险，对应的缓解或观察窗口

### 7.2 自检清单

- [ ] 部署步骤可被另一名工程师独立完成（无团队隐性知识依赖）
- [ ] 回滚命令已在预发环境演练过一次
- [ ] 至少 1 条监控指标对应至少 1 条告警
- [ ] 文档语言与具体命令通过"参见 language-adapters"引用，不绑定单一技术栈
- [ ] OPS-RUNBOOK.md 已与 PR/MR 一同评审

未通过任意一条：**禁止进入 Step 8 归档**，回到本步骤补齐。

---

## Step 8: 归档

**目标**：系统化归档已完成的变更

### 8.1 检查产物完成状态

读取 change 目录元数据，检查：
- [ ] 所有必需产物已生成（proposal/design/tasks/quality-report）
- [ ] 产物内容完整且符合规范

**如有未完成产物**：
- 显示警告，列出不完整的产物
- 询问用户是否继续归档
- 用户确认后才继续

### 8.2 检查任务完成状态

读取 tasks 文件，统计：
```bash
# 统计未完成 vs 已完成任务
INCOMPLETE=$(grep -c '\- \[ \]' tasks.md 2>/dev/null || echo "0")
COMPLETE=$(grep -c '\- \[x\]' tasks.md 2>/dev/null || echo "0")
echo "任务完成：$COMPLETE/$((INCOMPLETE + COMPLETE))"
```

**如有未完成任务**：
- 显示警告，显示未完成任务数量
- 询问用户是否继续归档
- 用户确认后才继续

### 8.3 执行归档

```bash
# 创建归档目录
mkdir -p specforge/archive

# 生成归档名：YYYY-MM-DD-<change-name>
ARCHIVE_NAME="$(date +%Y-%m-%d)-<change-name>"

# 检查目标是否已存在
if [ -d "specforge/archive/$ARCHIVE_NAME" ]; then
  echo "ERROR: 归档目标已存在：specforge/archive/$ARCHIVE_NAME"
  echo "建议：重命名现有归档或使用不同日期"
  exit 1
fi

# 移动 change 目录到归档
mv specforge/changes/<name> specforge/archive/$ARCHIVE_NAME
```

### 8.4 更新元数据

更新 `.specforge.json`：
- `status` → `completed`
- `timestamps.completedAt` → 当前时间戳（ISO 8601）
- `archive.location` → `specforge/archive/$ARCHIVE_NAME`

### 8.5 显示归档摘要

```markdown
## Archive Complete

**Change:** <change-name>
**Archived to:** specforge/archive/YYYY-MM-DD-<name>/
**Tasks:** $COMPLETE/$TOTAL complete
**Specs:** ✓ Synced to main specs
```

**归档模式与最佳实践**：[references/archive-patterns.md](references/archive-patterns.md)

---

## Step 9: 完成状态协议

### 9.1 状态报告

使用以下状态之一报告发布结果：

- **DONE**：完成并提供证据（测试输出/验证日志）
- **DONE_WITH_CONCERNS**：完成，但列出担忧
- **BLOCKED**：无法继续，说明阻塞点和已尝试的解决方法
- **NEEDS_CONTEXT**：缺少信息，明确说明需要什么

### 9.2 升级规则

在以下情况必须升级：
- 3 次失败尝试后
- 安全敏感变更（认证、授权、数据泄露）
- 无法验证的范围

**升级格式**：
```
STATUS: <状态>
REASON: <原因>
ATTEMPTED: <已尝试的操作>
RECOMMENDATION: <建议>
```

---

## 产物清单

本命令必须生成/更新以下文件：

- `VERSION` — 版本号文件（语言无关的主版本源，具体同步到 package.json/pom.xml/pyproject.toml/Cargo.toml/go.mod 请参见 language-adapters）
- `CHANGELOG.md` — 新增版本条目，覆盖分支上所有 commit
- Git Tag：`v<version>` — 版本标签
- PR/MR — 包含完整测试/审查/验证报告
- `OPS-RUNBOOK.md` — 运维移交文档（部署/回滚/监控/告警/依赖/风险，operations 语义合并后的必需产物）
- `specforge/archive/YYYY-MM-DD-<name>/` — 归档目录
- `.specforge.json` — status: completed, completedAt 时间戳

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：缺少 QUALITY-REPORT 或 Gate 非 PASS → 回到 quality-verify
- **E004_noVerificationEvidence**：发布前未提供完整测试/检查 PASS 输出 → 禁止发布
- **E006_versionMismatch**：VERSION 与 package.json 版本号不一致 → 修复前禁止发布
- **E007_changelogIncomplete**：CHANGELOG 未覆盖分支上所有 commit → 补充前禁止发布
- **E008_archiveExists**：归档目标已存在 → 重命名现有归档或使用不同日期

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "应该能行了" | 运行验证命令 |
| "我有信心" | 信心 ≠ 证据 |
| "就这一次" | 没有例外 |
| "Linter 通过了" | Linter ≠ 编译器 ≠ 测试 |
| "版本号随便给" | 错误版本号会误导依赖方，触发不兼容升级 |
| "不用 CHANGELOG，看 commit 就行" | CHANGELOG 是写给用户的，commit 是写给开发者的 |
| "部分验证就够了" | 部分验证什么也证明不了 |
| "不用归档，留着 change 目录就行" | 不归档会导致 changes/ 堆满已完成变更 |
| "直接合并到 main，不需要 tag" | 没有 tag 就无法快速定位版本代码状态 |

---

## 发布自检列表

完成发布流程后，检查：

- [ ] 所有测试通过（有新鲜验证证据）？
- [ ] 版本号格式正确且与本语言生态的版本源已同步（参见 language-adapters）？
- [ ] CHANGELOG 覆盖分支上所有 commit？
- [ ] 每个提交都是可 bisect 的逻辑单元？
- [ ] Git tag 已创建并推送？
- [ ] PR/MR 已创建且 body 包含所有必需章节？
- [ ] 分支收尾选项已执行？
- [ ] OPS-RUNBOOK.md 已生成并通过自检（部署/回滚/监控/告警/依赖/风险）？
- [ ] change 目录已归档？
- [ ] 元数据已更新（status: completed）？
- [ ] 工作树已清理（如适用）？

---

## 下一步

- 发布完成后统一进入 → 执行 `evolution-retrospect` 命令
- 上线观察、监控告警、运维迭代等工作在 evolution 阶段配合 runbook 统一处理（runbook 已作为本阶段必需产物）

Handoff 引用：`.specforge/config.yaml` 的 `handoffs.release-deploy`

---

## References 导航（按需读取）

- [references/version-management-guide.md](references/version-management-guide.md) — 版本管理详细指南
- [references/changelog-voice-guide.md](references/changelog-voice-guide.md) — CHANGELOG 写作规范
- [references/pr-body-template.md](references/pr-body-template.md) — PR body 完整模板
- [references/archive-patterns.md](references/archive-patterns.md) — 归档模式与最佳实践
