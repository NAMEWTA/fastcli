# npm 发布手册

发布 `@namewta/fastcli` 到 npm 的 `latest`。GitHub Actions 使用仓库 Secret `NPM_TOKEN`，可配置本包的 **Read and write (stage only)** 权限。暂存阶段无需 Bypass 2FA，维护者审批时使用 2FA。 [发布工作流](../../../../.github/workflows/release.yml) · [npm 暂存发布](https://docs.npmjs.com/staged-publishing/)

## 发布新版本

1. 确认 `package.json` 版本、CHANGELOG 与准备发布的提交一致，核对该提交的 CI。发布标签为 `v<版本>`。
2. 推送标签后跟踪 GitHub Actions 的 Release run。工作流从该标签构建并测试，执行 `npm stage publish --access public --tag latest`，按包名、版本和标签核对 Stage ID，然后创建缺失的同标签 GitHub Release。
3. 核对 run 的标签、提交和 Actions Summary 中的 Stage ID。在 npmjs.com 的 **Staged Packages** 审核该记录后用 2FA 批准，再核对公开版本与 `latest`。

```bash
npm view @namewta/fastcli@<版本> version --registry=https://registry.npmjs.org
npm view @namewta/fastcli dist-tags.latest --registry=https://registry.npmjs.org
```

保留 GitHub Actions、Stage ID、GitHub Release 和公开 registry 的各项回执。 [发布记录](releases/README.md)

## 恢复已有标签的发布

先核对公开版本与有权限账号可见的暂存列表。可运行 `npm stage list @namewta/fastcli --registry=https://registry.npmjs.org`，也可通过 npm 的 Staged Packages 查看。

- 已公开时记录 registry 回执，结束该版本的 npm 上传。
- 已暂存时审核原 Stage ID 并继续审批。
- 两处均无该版本时，可在 GitHub Actions 的 Release 中选择 **Run workflow**，从当前工作流所在的 `master` 填入原标签。工作流检出该标签并核对版本，沿用原构件来源和已有标签。仅在缺失时创建 GitHub Release。

同一包版本共享暂存与公开版本索引。回执或权限不足时先确认原阶段状态。 [npm stage 文档](https://docs.npmjs.com/cli/v11/commands/npm-stage/) · [发布策略的历史决定](../../notes/decisions/2026-10-17-staged-npm-publishing.md)
