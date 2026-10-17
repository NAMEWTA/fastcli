# npm 直接发布

Outcome: active

<a id="scope"></a>
## Scope

用户明确要求“我都给了key了，如果可以请你帮我改动，改成直接发布”。沿用已授权 commit/push/release 交付，修改 release.yml 为现有 NPM_TOKEN 直接 npm publish，并更新 README、AGENTS、CHANGELOG。增加手动选择已有 tag 的补发入口，用原 v3.2.7 包内容恢复尚未上架版本。账号 2FA 和 Token 不自动修改，不移动已有 tag、不重新 bump 版本、不修改产品代码或依赖、不覆盖原有 .gitignore/本地 Speculo 资产。当前用户决定替代 AGENTS 旧暂存发布要求。发布远程回执仍写 TRI-001。

<a id="acceptance"></a>
## Acceptance

- AC-001：tag 发布构建/测试后直接 npm publish，使用现有 Secret；没有人工 staging 审批或静默暂存 fallback。
- AC-002：手动补发仅检出指定的版本标签；拒绝非版本输入，核对 tag 与 package.json version 相符；不修改已有 tag 或 GitHub Release。
- AC-003：发布后读取明确 package@version 与 latest；认证或 registry 核验失败如实失败，GitHub Release 只在验证成功后创建。
- AC-004：文档说明直接发布所需 Token 权限、保留账号 2FA、补发方法；原始历史发布记录不重写。

<a id="verification"></a>
## Verification

对原工作流和远程回执核验：旧 npm stage publish 成功但 3.2.7 仍 E404，是当前缺失的直接发布行为。使用 actionlint、实际 tag/version 验证代码正反例及 build/test/typecheck 进行验证；独立 Agent 双轴审查。真实权限只有 GitHub Actions 发布可确认；若服务器拒绝，记录精确失败和用户需配置的权限，不能宣称直接发布成功。

| AC | Result | Evidence |
|---|---|---|
| AC-001 | passed | evidence/direct-spec.md#acceptance-observations |
| AC-002 | passed | evidence/direct-spec.md#acceptance-observations |
| AC-003 | passed | evidence/direct-spec.md#acceptance-observations |
| AC-004 | passed | evidence/direct-spec.md#acceptance-observations |

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-16-direct-npm-publish",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "master",
  "base_sha": "0e8cd1abbb9d9625fa558a72e2d8dd0df5fe4847",
  "owner": "native:/root",
  "ticket_execution": "auto"
}
```

## Ownership

Owner: native:/root
Evidence: evidence/direct-spec.md#owner

当前：工作流修改已提交推送；用户已更新 Secret，第二次发布不再报 stage-only，但仍被 npm 的 2FA 条件拒绝。等待核对 Token 的 Bypass 2FA 与包级发布访问设置，恢复见 TRI-001。


## Checklist

- [x] 直接发布与按 tag 补发工作流、文档同步。
- [x] 本地检查、独立双轴审查、commit/push、远程 CI。
- [x] 实际执行直接发布并确认 stage-only Token 的服务器拒绝原因。
- [ ] 外部发布恢复：用户更新 NPM_TOKEN 后由 TRI-001 恢复并核验 npm 上架。

## Next Step

已确认 Secret 于 2026-10-16T14:16:48Z 更新。用户截图已确认原 3.2.7 暂存仍占用版本且 SHASUM 一致；此版应由维护者批准原暂存，再核对 registry。未来直接发布仍需解决 Bypass 2FA/包级访问策略，具体证据和恢复沿 TRI-001；保持现有 tag/版本/发布说明，不盲目重试。
