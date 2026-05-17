# PR/MR Body 完整模板

> 本指南提供 release-deploy 命令创建 PR/MR 时的完整 body 模板（Step 5.3）

## 模板结构

```markdown
## Summary

<总结所有变更，按主题分组。运行 `git log <base>..HEAD --oneline` 枚举每个 commit。
排除 VERSION/CHANGELOG 元数据 commit（这是发布流程的簿记，不是实质性变更）。
将其余 commit 按逻辑分组（如"**性能优化**"、"**死代码清理**"、"**基础设施**"）。
每个实质性 commit 必须出现在至少一个分组中。如果 commit 的工作未反映在摘要中，说明遗漏了。>

## Test Coverage

<测试覆盖率信息>
- 如果运行了覆盖率审计：`Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.`
- 如果所有新代码路径已有测试：`All new code paths have test coverage.`
- 如果有新测试文件：`Tests: {before} → {after} (+{delta} new)`

## Pre-Landing Review

<代码审查发现>
- 如果运行了审查且无问题：`No issues found.`
- 如果发现问题：列出关键发现和修复状态
- 示例：`3 findings: 2 auto-fixed, 1 requires manual review`

## Verification Results

<验证结果摘要>
- 格式：`N PASS, M FAIL, K SKIPPED`
- 如果全部通过：`All verifications PASS`
- 如果有失败：**禁止创建 PR**，先修复

## TODOS

<已完成的 TODO 项>
- 如果有条目完成：bullet list of completed items with version
- 如果无条目完成：`No TODO items completed in this PR.`
- 如果 TODOS.md 是新创建的：`TODOS.md: Created.`
- 如果 TODOS.md 未存在且用户跳过：省略此章节

## Documentation

<文档更新摘要>
- 如果更新了文档：列出更新的文件和变更摘要
- 如果无文档更新：省略此章节

## Test plan

- [x] 所有测试通过（N 次运行，0 失败）
- [x] Lint 无报错
- [x] 构建成功

---

🤖 Generated with SpecForge
```

## 各章节详细说明

### Summary

**目的**：让审查者快速理解这个 PR 做了什么

**编写规则**：
1. 运行 `git log <base>..HEAD --oneline` 获取所有 commit
2. 排除 VERSION/CHANGELOG commit
3. 按主题分组其余 commit
4. 每个组一个段落，包含该组的所有 commit

**示例**：

```markdown
## Summary

这个 PR 实现了报表导出功能和性能优化：

**报表导出**
- 新增 PDF 导出功能（commit: abc1234）
- 新增 CSV 导出功能（commit: def5678）
- 添加导出权限控制（commit: ghi9012）

**性能优化**
- 搜索查询添加 Redis 缓存（commit: jkl3456）
- 优化数据库索引（commit: mno7890）

**Bug 修复**
- 修复时区切换时的日期显示错误（commit: pqr1234）
- 修复并发编辑数据丢失（commit: stu5678）
```

**常见错误**：
- ❌ 只写"实现了一些功能"
- ❌ 遗漏某些 commit
- ❌ 包含 VERSION/CHANGELOG commit

### Test Coverage

**目的**：证明代码有足够的测试覆盖

**内容来源**：
- 覆盖率审计工具输出
- 测试文件数量变化
- 新增测试用例数量

**示例 1：有覆盖率审计**

```markdown
## Test Coverage

Test Coverage Audit: 15 new code paths. 13 covered (87%). 5 tests generated, 3 committed.
Tests: 120 → 125 (+5 new)
```

**示例 2：无覆盖率工具**

```markdown
## Test Coverage

All new code paths have test coverage.
Tests: 120 → 125 (+5 new)
```

**示例 3：测试只有变更**

```markdown
## Test Coverage

No new application code paths to audit (test-only changes).
Tests: 120 → 128 (+8 new)
```

### Pre-Landing Review

**目的**：展示代码审查结果，增强审查者信心

**内容来源**：
- 自动审查工具
- 人工审查发现
- 安全扫描结果

**示例 1：无问题**

```markdown
## Pre-Landing Review

No issues found.
```

**示例 2：有问题但已修复**

```markdown
## Pre-Landing Review

5 findings: 3 auto-fixed, 2 manually addressed
- [FIXED] N+1 query in user list endpoint
- [FIXED] Missing input validation on export API
- [FIXED] Stale comment in UserService
- [FIXED] Potential null pointer in date parser
- [FIXED] Unused import in ReportController
```

**示例 3：有待审查者关注的问题**

```markdown
## Pre-Landing Review

2 findings require manual review:
- [REVIEW] Complex retry logic in export service — verify correctness
- [REVIEW] Cache invalidation strategy — confirm with team

3 findings auto-fixed:
- [FIXED] N+1 query
- [FIXED] Missing validation
- [FIXED] Unused import
```

### Verification Results

**目的**：证明发布前验证已通过

**必须包含**：
- 测试运行结果
- Lint 结果
- 构建结果

**示例 1：全部通过**

```markdown
## Verification Results

All verifications PASS:
- Tests: 125/125 pass (0 failures)
- Lint: 0 errors, 0 warnings
- Build: exit 0
```

**示例 2：有跳过项**

```markdown
## Verification Results

5 PASS, 0 FAIL, 1 SKIPPED:
- Tests: 125/125 pass
- Lint: 0 errors
- Build: exit 0
- E2E: SKIPPED (no E2E suite configured)
```

**禁止**：如果有 FAIL，不得创建 PR

### TODOS

**目的**：追踪项目待办事项的完成情况

**自动检测规则**：
1. 读取 TODOS.md
2. 对比 `git diff <base>...HEAD`
3. 如果 diff 完成了某个 TODO 描述的工作，自动标记为完成
4. 移动完成项到 `## Completed` 章节
5. 添加完成标记：`**Completed:** vX.Y.Z (YYYY-MM-DD)`

**示例 1：有完成项**

```markdown
## TODOS

3 items marked complete:
- [x] 实现 PDF 导出功能 — Completed: v1.3.0.0 (2026-05-07)
- [x] 添加导出权限控制 — Completed: v1.3.0.0 (2026-05-07)
- [x] 优化搜索性能 — Completed: v1.3.0.0 (2026-05-07)

12 items remaining.
```

**示例 2：无完成项**

```markdown
## TODOS

No TODO items completed in this PR.
15 items remaining.
```

### Documentation

**目的**：展示文档更新情况

**仅在有文档更新时包含此章节**

**示例**：

```markdown
## Documentation

3 files updated:
- `README.md`: 新增报表导出功能说明
- `docs/api.md`: 新增 /export 端点文档
- `docs/migration.md`: 新增 v1.3.0.0 迁移指南
```

### Test plan

**目的**：提供审查者的验证清单

**必须包含**：
- 测试运行结果
- Lint 结果
- 构建结果

**可选包含**：
- 手动测试步骤
- 特定功能验证步骤

**示例**：

```markdown
## Test plan

- [x] 所有测试通过（125 次运行，0 失败）
- [x] Lint 无报错
- [x] 构建成功

手动验证：
- [ ] 测试 PDF 导出功能（登录 → 报表页面 → 导出 PDF）
- [ ] 测试 CSV 导出功能（登录 → 报表页面 → 导出 CSV）
- [ ] 验证时区切换后的日期显示
```

## PR/MR 创建命令

### GitHub

```bash
gh pr create \
  --base <base> \
  --title "v$VERSION <type>: <summary>" \
  --body "$(cat <<'EOF'
<完整的 PR body>
EOF
)"
```

### GitLab

```bash
glab mr create \
  -b <base> \
  -t "v$VERSION <type>: <summary>" \
  -d "$(cat <<'EOF'
<完整的 MR body>
EOF
)"
```

## 幂等更新

如果 PR/MR 已存在，**更新 body 而非创建新 PR**：

### GitHub

```bash
gh pr edit --body "<new body>"
```

### GitLab

```bash
glab mr update -d "<new description>"
```

**规则**：
- 始终从头生成 body，不重用旧内容
- 使用当前运行的最新结果（测试输出、审查发现等）
- 不要使用之前运行的过时内容

## 最佳实践

1. **完整性**：每个章节都要填写或明确省略
2. **准确性**：所有数据来自实际运行结果，不估算
3. **简洁性**：保持简洁，但不要遗漏关键信息
4. **可验证性**：所有声明都应有证据支撑
5. **一致性**：遵循团队约定的格式和风格

## 参考

- GitHub PR 最佳实践：https://docs.github.com/en/pull-requests
- GitLab MR 最佳实践：https://docs.gitlab.com/ee/user/project/merge_requests/
