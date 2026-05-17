---
name: github-ops
type: workflow-step
description: >-
  GitHub 仓库运营 + npm 包 tag 触发发布的一体化工作流。覆盖 issue/PR 分诊、CI 排障、
  安全告警，以及 npm publish（provenance / scoped）+ 自动 GitHub Release（CHANGELOG 段落注入）。
  触发词：github、gh、release、publish、tag、npm、provenance、changelog、triage、ci broken、版本发布。
version: "1.1.0"
author: "wta"
---

# GitHub 运营与 npm 发布工作流

把仓库当成一个持续运转的系统:**入口**是 issue / PR 流入,**出口**是带 provenance 签名的 npm 包 + 内容完整的 GitHub Release。中间是 CI/CD 与安全监控。

本技能给出端到端 SOP,具体细节按主题下沉到 [references/](references/),按需加载。

## 1. 何时激活

**日常治理**

- 分诊 issue、清理 stale、回复社区
- 审查 PR、查 CI 状态、合并或驳回
- 排查失败的 CI 任务(区分真实失败与 flaky)
- 监控 Dependabot / secret scanning 告警

**npm 发布上线**

- 为 npm 包搭建 tag 触发的 release pipeline
- 排查失败的 `Release` workflow(E403 / E404 / E422 / EUSAGE / provenance 错误)
- 首次发布 scoped 包 `@scope/name`
- 从手动 `npm publish` 迁移到 tag 驱动的 CI 发布
- 切新版本 tag(`vX.Y.Z`)并跟踪上线
- **GitHub Release 正文为空 / 没有 changelog 内容**(本技能的标准注入模式)
- 事后补全 / 修订已发布版本的 Release notes

## 2. 前置工具

- 已安装并登录 `gh`(`gh auth login`)
- 仓库目标分支有 Actions 权限,能读写 secrets
- 发布类任务额外需要:npm 账号 + Granular Access Token(详见 [references/setup-npm-token.md](references/setup-npm-token.md))

## 3. 两条核心流

### 流 1:日常治理

```
issue/PR 流入
  → 分诊(类型 + 优先级 + 标签)
  → 审查(CI 状态 + 变更质量 + 测试)
  → 合并 / 清理 stale
  → 安全告警每周巡检
```

详细 SOP:
- [references/issue-pr-triage.md](references/issue-pr-triage.md) — 标签体系 + 社区 PR 标准
- [references/ci-and-security-ops.md](references/ci-and-security-ops.md) — CI 排障 + 安全告警巡检

### 流 2:npm 发布上线

```
package.json 就绪 (name / version / repository / bin / files)
  → CHANGELOGS.md [Unreleased] 段落已写
  → .github/workflows/release.yml 包含 release-notes 注入步骤
  → NPM_TOKEN secret 配置(Granular + bypass 2FA)
  → 版本 bump → release commit → 打 tag(指向 release commit)→ push
  → Release workflow:verify-tag → lint → test → build → verify-bin
                    → extract-changelog → npm publish --provenance
                    → Create GitHub Release(body_path = release-notes.md)
  → 三端验证:npm view / gh release view / gh run view
```

每个阶段对应一份 reference,**按需加载**:

| 阶段 | 参考 |
|------|------|
| package.json 字段 | [references/package-json-checklist.md](references/package-json-checklist.md) |
| NPM_TOKEN 配置 | [references/setup-npm-token.md](references/setup-npm-token.md) |
| release.yml 完整模板 + 注解 | [references/workflow-yaml-reference.md](references/workflow-yaml-reference.md) |
| **CHANGELOG → Release notes 注入** | [references/release-notes-injection.md](references/release-notes-injection.md) |
| 版本 bump → tag → push 完整流程 | [references/version-bump-flow.md](references/version-bump-flow.md) |
| 失败排查手册 | [references/troubleshooting-playbook.md](references/troubleshooting-playbook.md) |

## 4. 日常治理快查

### Issue 分诊

```bash
gh issue list --search "关键词" --state all --limit 20
gh issue edit <number> --add-label "bug,high-priority"
gh issue comment <number> --body "感谢反馈,能否补充复现步骤?"
```

类型维度:bug / feature-request / question / documentation / enhancement / duplicate / good-first-issue。
优先级:critical / high / medium / low。
完整流程见 [issue-pr-triage.md](references/issue-pr-triage.md)。

### PR 审查

```bash
gh pr checks <N>                              # CI 状态
gh pr view <N> --json mergeable               # 可合并性
gh pr list --json number,title,updatedAt      # 活跃度盘点
```

### CI 排障

```bash
gh run list --status failure --limit 10
gh run view <run-id> --log-failed
gh run rerun <run-id> --failed
```

区分真实失败与 flaky:能稳定复现 = 真实,先定位根因再 rerun。

### 安全告警

```bash
gh api repos/{owner}/{repo}/dependabot/alerts \
  --jq '.[].security_advisory.summary'
gh api repos/{owner}/{repo}/secret-scanning/alerts --jq '.[].state'
```

每周一次巡检;critical / high 立即处理。

## 5. npm 发布快查

### 5.1 发布前自检

**package.json 关键字段**

- `name` — scoped 包必须匹配你拥有的 npm scope
- `version` — 严格等于即将打的 tag(`v0.0.10` ↔ `"0.0.10"`)
- `repository.url` — **provenance 强制要求**,严格匹配 GitHub repo
- `bin` 路径以 `./` 开头
- `files` — 显式白名单,防止源码 / 测试发到 npm
- `prepublishOnly` 跑完整质量闸(`lint && test && build`)

完整字段说明见 [package-json-checklist.md](references/package-json-checklist.md)。

**GitHub 仓库关键配置**

- `NPM_TOKEN` 是 **Granular Access Token**,bypass 2FA 已开
- Workflow 声明 `id-token: write` + `contents: write`
- `release.yml` 包含 **release-notes 注入步骤**(见下文 5.3)

### 5.2 完整发布流程(标准 SOP)

```bash
# 1. 把 [Unreleased] 内容迁移到新版本段落
#    详见 references/version-bump-flow.md 的 CHANGELOG 维护契约

# 2. bump 版本 + 落 release commit
#    package.json + CHANGELOGS.md 一并提交
git add package.json CHANGELOGS.md
git commit -m "chore(release): vX.Y.Z"

# 3. 推 main
git push origin main

# 4. tag 精确指向 release commit(后续若有 docs commit 不应被 tag)
git tag vX.Y.Z <release-commit-sha>
git push origin vX.Y.Z

# 5. 盯 workflow
gh run watch
```

完整端到端流程(含 docs-sync state 推进、`pnpm check` 预演、tag 指向策略)见 [version-bump-flow.md](references/version-bump-flow.md)。

### 5.3 Release notes 不能为空 ← 本技能强约束

**问题**:`softprops/action-gh-release@v2` 仅设 `generate_release_notes: true` 时,GitHub 自动生成器从 PR 标题 + label 抽取分类条目。**直 push main 流程**下没有 PR 流量,生成器只剩 `Full Changelog: vX...vY` 一行,Release 正文几乎是空的。

**标准修复**:从 `CHANGELOGS.md` 抽取当前 tag 对应的版本段落,通过 `body_path` 注入 Release 正文。

```yaml
# .github/workflows/release.yml(关键步骤,完整文件见 workflow-yaml-reference.md)
- name: Extract release notes from CHANGELOGS.md
  run: |
    VERSION="${GITHUB_REF_NAME#v}"
    awk -v v="$VERSION" '
      $0 ~ "^## \\["v"\\]" { found=1; print; next }
      found && /^## \[/ { exit }
      found && /^---[[:space:]]*$/ { next }
      found { print }
    ' CHANGELOGS.md > release-notes.md

    if [ ! -s release-notes.md ]; then
      echo "::warning::CHANGELOGS.md 中未找到 [$VERSION] 段落,回退到自动生成。"
      echo "See [CHANGELOGS.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOGS.md) for details." > release-notes.md
    fi

- name: Create GitHub Release
  uses: softprops/action-gh-release@v2
  if: success()
  with:
    tag_name: ${{ github.ref_name }}
    name: Release ${{ github.ref_name }}
    body_path: release-notes.md          # ← 关键:CHANGELOG 段落注入
    generate_release_notes: true         # ← 与 body_path 共存:CHANGELOG 在前,自动 What's Changed 在后
    draft: false
    prerelease: false
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**事后修复历史 Release**(workflow 改造之前发的版本):

```bash
# 抽取 + 回填一次性命令
awk -v v="X.Y.Z" '
  $0 ~ "^## \\["v"\\]" { found=1; print; next }
  found && /^## \[/ { exit }
  found && /^---[[:space:]]*$/ { next }
  found { print }
' CHANGELOGS.md > /tmp/notes.md && \
gh release edit vX.Y.Z --notes-file /tmp/notes.md
```

完整模式(含多语言 CHANGELOG、PR 流程下的 `.github/release.yml` 配置、awk 边界用例)见 [release-notes-injection.md](references/release-notes-injection.md)。

### 5.4 重试失败的发布

Workflow 在 `npm publish` 之前都是幂等的:

- publish 前失败:删旧 tag 重推同一版本号
- publish 已成功但后续失败(创建 Release 出错):**不要**改版本号,手动补 `gh release create`
- publish 本身失败(tarball 未上传):删 tag、改代码、重打同 tag

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag vX.Y.Z
git push origin vX.Y.Z
```

> **铁律**:npm 不允许重发相同 `version`——unpublish 过也不行。若 publish 真的上传成功,只能 bump 到下一个补丁。

完整失败案例库见 [troubleshooting-playbook.md](references/troubleshooting-playbook.md)。

## 6. 质量闸门

任务完成前按下面清单自检:

**治理类**

- 分诊的 issue 都有合适标签
- 没有超过 7 天未 review / comment 的 PR
- CI 失败做了根因分析(不只是 rerun)
- 安全告警已确认或登记跟进

**发布类**(三端必须全绿)

```bash
# 1. npm 包已上线(CDN 传播 30–60 秒)
npm view @scope/pkg version
npm view @scope/pkg dist-tags

# 2. GitHub Release 存在 / 标记为 Latest / 正文非空
gh release list --limit 3
gh release view vX.Y.Z --json name,tagName,isDraft,isPrerelease,body

# 3. Workflow 最终状态为 success,所有步骤都执行(尤其是 extract-changelog)
gh run list --workflow release.yml --limit 1 --json conclusion
gh run view <id> --json jobs --jq '.jobs[].steps[] | {name, conclusion}'
```

**Release 正文检查**:`gh release view` 的 `body` 字段必须包含来自 CHANGELOG 的 `### Changed` / `### Added` 等小节。仅 `Full Changelog: ...` 一行视为发布残次品,需走 5.3 的事后修复。

## 7. 相关资料

按需加载,**不要一次性全读**:

- [setup-npm-token.md](references/setup-npm-token.md) — Granular Access Token 生成 + GitHub Secret 绑定
- [package-json-checklist.md](references/package-json-checklist.md) — 发布前 package.json 逐字段检查
- [workflow-yaml-reference.md](references/workflow-yaml-reference.md) — `release.yml` 完整 YAML 注解 + 变体
- [release-notes-injection.md](references/release-notes-injection.md) — **CHANGELOG → Release notes 注入完整方案**(本技能 v1.1.0 新增)
- [version-bump-flow.md](references/version-bump-flow.md) — **版本 bump → tag → push 端到端 SOP**(本技能 v1.1.0 新增)
- [troubleshooting-playbook.md](references/troubleshooting-playbook.md) — 真实失败案例 + 排错清单
- [issue-pr-triage.md](references/issue-pr-triage.md) — Issue / PR 分诊标签体系 + 社区 PR 标准
- [ci-and-security-ops.md](references/ci-and-security-ops.md) — CI 排障 + 安全告警巡检模板
