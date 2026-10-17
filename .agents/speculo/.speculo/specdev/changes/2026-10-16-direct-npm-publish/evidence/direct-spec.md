# Direct Spec implementation evidence

用户授权和 AC：README.md#scope、README.md#acceptance。当前 workspace：README.md#execution-context。实施者 native:/root。

基线：0e8cd1abbb9d9625fa558a72e2d8dd0df5fe4847。原 .gitignore 和未跟踪 Speculo 资产不在交付写集；工作区无冲突、index 清洁。没有相关永久 ADR/context；轻量任务无 Ticket/Map/Goal、无 UI。

设计：在既有 Release 工作流增加 workflow_dispatch，复用 tag 内容构建；版本检查阻止错包，concurrency 防止同 tag 并发，直接发布后 registry 核验。GitHub Release 自动创建仅对 push 执行，手动恢复不覆盖已有正文。现有 NPM_TOKEN 有效性/直接发布权限不凭 Secret 名称推断。

红灯事实：Release run 38877736085 仅 staged，package@3.2.7 查询 E404、latest 3.2.6；原工作流没有直接发布与按标签补发入口。


## Verification

- 经官方 release checksum 核验的 actionlint v1.7.12 检查 release.yml：退出 0。
- pnpm build / pnpm test / pnpm typecheck / git diff --check 全部 0；91 passed、5 Windows-only skipped。产品代码不变。
- 直接提取 workflow run 脚本执行：v3.2.7、v3.2.8-beta.1 接受；master、refs/heads/master、含分号或换行输入拒绝；package@3.2.7 对 v3.2.7 接受、对 v3.2.8 拒绝。
- Verify npm publication 对真实公共 registry 的 3.2.6 fixture 通过；npm 外部边界返回错误版本或非零失败均正确退出非零。
- 验证 harness 首次被本机 Volta node 包装器重写 PATH，导致 fake npm 未命中，负例断言失败；改用 process.execPath 后实际运行相同 workflow JS，两个负例通过。生产 workflow 未为测试修改。
- 真实 Token 发布能力尚待 GitHub Actions，本地 dry-run 不冒充认证验证。

## Independent Review

Input: evidence/review-final.md#review-input
Implementers: native:/root
Mode: native
Verified-By: native:/root
Verification: evidence/review-final.md#review-receipt

| Axis | Reviewer | Result | Report |
|---|---|---|---|
| standards | native:/root/independent_review | pass | evidence/review-final.md#standards-output |
| specification | native:/root/independent_review | pass | evidence/review-final.md#specification-output |


<a id="owner"></a>
## Remote verification and checkpoint

Owner: native:/root

提交并推送 17c28f7c6319aa88f7df761eb1caf5f03ebd200b，只有四个授权文件。原 tag 不动。独立审查提交后再次核对同字节范围，最终输入 44942153813b31dd5fb303ced871ca025447565f3c66fbdbae7d42bdb58a80bb。CI 38881135910 第一次 Windows 并发探测版本断言失败（产品代码无变化），原失败日志保留；第二次只重跑失败/取消任务，在新 runner 全部通过，根因未进一步确定，不更改测试。

Release workflow_dispatch 38881577847 实际检出原 v3.2.7，版本检查、build/test 通过，执行 npm publish 并得到服务器 E_STAGE_REQUIRED：现有 Token 仅可暂存。失败如实向上传递，后置核验和 Release 创建跳过；用户已收到更新 Secret 的具体请求，恢复在原 TRI-001。没有宣称上架成功。

<a id="verification"></a>
## Integration Verification

Result: passed
Command: pnpm build && pnpm test && pnpm typecheck
Exit: 0
Observed: 91 passed / 5 Windows-only skipped；actionlint 通过，workflow tag/version 脚本正反例和 registry 成功/错版本/读取失败检查通过。远程 CI 最终六项成功。

<a id="acceptance-observations"></a>
## Acceptance observations

Method: source, workflow scripts and remote Actions
Source: .github/workflows/release.yml; README.md; AGENTS.md; CHANGELOG.md
Result: passed
Observed: AC-001 直接 npm publish 在实际 Actions 执行、无暂存 fallback；AC-002 原版本标签检出并核对版本，非法输入本地验证拒绝，tag 未变、手动 Release 跳过；AC-003 本地 registry 成功/不一致/错误负例成立，实际认证失败阻止后续步骤；AC-004 README/AGENTS/Unreleased 发布说明一致，本地链接核对通过。成功上架仍受外部 Token 权限阻塞，由 TRI-001 负责，不属于已完成事实。

## Workspace Execution Record

```json
{
  "schema_version": 1,
  "purpose": "direct-spec",
  "change": "2026-10-16-direct-npm-publish",
  "workspace_context": "README.md#execution-context",
  "implementation_owners": ["native:/root"],
  "status": "verified",
  "checkpoint": "evidence/review-final.md#review-input",
  "verification": {
    "status": "passed",
    "evidence": "evidence/direct-spec.md#verification",
    "e2e": {"required": false, "status": "not-required", "reason": "仅发布工作流及说明变更；实际run脚本与远程Actions验证由Lead完成，npm正式上架归独立TRI-001，当前因外部stage-only Token阻塞。", "evidence": null}
  },
  "attempts": 2
}
```
