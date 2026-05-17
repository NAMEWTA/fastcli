---
name: git-commit-template
type: workflow-step
description: >-
  Git 提交工作流辅助——提交前检查、提交粒度控制、WIP 提交处理、分支管理。当进行 Git 操作时自动触发。
  触发词：git commit、提交、暂存、stash、分支管理。
version: "1.0.0"
author: "wta"
---

# Git 提交工作流辅助

## Iron Law

> **禁止提交破坏构建的代码。** 每次提交后项目必须处于可工作状态（编译通过、测试通过）。

## 提交前检查清单

在 `git commit` 之前，确认：
- [ ] 代码通过 lint 检查
- [ ] 相关测试通过
- [ ] 无调试代码残留（console.log、debugger、临时注释）
- [ ] 无敏感信息（密码、Token、API Key）
- [ ] 提交范围合理（一组合适的变更 = 一个 commit）

## 提交粒度控制

### 一个好 Commit 的特征
- **原子性**：一个 commit 做一件事（可独立 revert）
- **完整性**：commit 后项目处于可工作状态（不破坏构建）
- **可理解**：commit message 清晰说明做了什么和为什么

### 需要拆分的信号
- commit message 中出现 "和"/"及"/"以及" 等并列词
- commit 涉及 5 个以上不相关的文件
- commit diff 超过 200 行且包含不同类型变更

### 需要合并的信号
- 多个 WIP commit 属于同一逻辑变更
- 修复 commit 是对上一个 commit 中错误的修正

## WIP 提交处理

当开发过程中使用了 `WIP: <描述>` 格式的临时提交：
1. 识别所有 WIP 提交
2. 将它们 squash 成有意义的逻辑提交
3. 每个最终提交遵循 Conventional Commits 规范

```bash
# 查看 WIP 提交
git log --oneline --grep="WIP:"

# Squash WIP 提交
git rebase -i HEAD~N
```

## 分支管理

### 分支命名
- `feature/<功能名>` — 新功能开发
- `fix/<问题描述>` — 问题修复
- `refactor/<模块名>` — 重构
- `docs/<内容>` — 文档变更

### 分支生命周期
1. 从最新的 main/master 创建分支
2. 在分支上开发和提交
3. 定期 rebase 基分支（保持同步）
4. 完成后：合并 → 推送 → 删除本地分支

## 提交后检查
- [ ] `git log --oneline -5` — 确认提交历史清晰
- [ ] `git diff main...HEAD` — 确认差异范围正确
- [ ] 未推送的提交可以 amend/rebase，已推送的不建议改历史

## 提交完成自检列表

- [ ] 提交遵循 Conventional Commits 格式？
- [ ] 提交粒度合理（原子性、完整性、可理解）？
- [ ] 无 WIP 提交残留（已 squash 为有意义的提交）？
- [ ] 分支命名规范（feature/fix/refactor/docs）？
- [ ] 提交后项目可正常工作（构建通过、测试通过）？
