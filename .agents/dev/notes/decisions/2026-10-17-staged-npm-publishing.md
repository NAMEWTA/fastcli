# npm 发布采用暂存与维护者审批

2026-10-17 恢复暂存。提交 `17c28f7` 曾将工作流切到直接发布，但已有 Token 首先收到 `E_STAGE_REQUIRED`，更新 Token 后仍收到 npm 的 2FA 拒绝。回执证明直接发布在当时环境中未完成，第二次错误未定位到某一项账户设置。原版本已暂存，且 npm 的暂存与公开版本共享版本唯一索引。 [直接发布历史](../../archive/changes/rejected/process_2026-10-16-direct-npm-publish/closure.md) · [TRI-001](../../deploy/npm/releases/TRI-001-v3.2.7.md) · [npm stage 文档](https://docs.npmjs.com/cli/v11/commands/npm-stage/)

提交 `37085bd` 恢复 `npm stage publish` 和 Stage ID 核验。GitHub Actions 使用仓库 Secret `NPM_TOKEN` 暂存，维护者用 2FA 批准公开发布。GitHub Release、npm 暂存和 registry 上架需要各自的回执。恢复旧标签时先核对暂存和公开 registry，沿用原版本与构件。 [当前工作流](../../../../.github/workflows/release.yml) · [操作与恢复](../../deploy/npm/runbook.md)
