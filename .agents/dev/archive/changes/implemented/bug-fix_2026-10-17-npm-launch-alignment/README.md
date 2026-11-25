# npm 安装与默认启动一致性

<a id="scope"></a>
## Scope
用户批准最后一版计划并要求 Implement the plan。保持 npm 单一后端、当前 prefix 所有权和 PATH 启动规则；安装后分开报告 npm 目标与默认入口，未确认归属时不得因版本相同宣称一致。info 展示 npm 可执行目标。不得修改本机工具链、清理其他安装或发布。build/test/typecheck 与真实临时 CLI/npm 回归验证。

<a id="acceptance"></a>
## Acceptance

AC-1 固定 npm 变更目标。AC-2 安装后核对默认入口并保留真实 npm 状态。AC-3 info 显示目标。AC-4 保留 PATH 启动和安装所有权边界。AC-5 验证与独立审查。详细合同见 evidence/approved-plan.md。

<a id="verification"></a>
## Verification

| AC | Result | Evidence |
|---|---|---|
| AC-1 | passed | evidence/direct-spec.md#ac-1 |
| AC-2 | passed | evidence/direct-spec.md#ac-2 |
| AC-3 | passed | evidence/direct-spec.md#ac-3 |
| AC-4 | passed | evidence/direct-spec.md#ac-4 |
| AC-5 | passed | evidence/direct-spec.md#ac-5 |

## Ownership

Owner: native:/root
Evidence: evidence/direct-spec.md#session

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-17-npm-launch-alignment",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "master",
  "base_sha": "d78bc053263e957066b466b70a80c5f48c5c0638",
  "owner": "native:/root",
  "ticket_execution": "auto"
}
```

初始 git status 干净。无 Ticket/Goal，独立 reviewer 审查冻结的全部实现。

Outcome: completed

证据见 evidence/direct-spec.md。

## Checklist

- [x] 实现批准范围、回归验证、独立双轴审查。

## Next Step

本地交付完成，等待用户另行指定 Git 或发布动作；不修改本机工具安装。

## Independent Review
Input: evidence/direct-spec.md#review-input
Implementers: native:/root
Mode: native
Verified-By: native:/root
Verification: evidence/direct-spec.md#review-receipt

| Axis | Reviewer | Result | Report |
|---|---|---|---|
| standards | native:/root/review_npm_alignment | pass | evidence/direct-spec.md#standards-output |
| specification | native:/root/review_npm_alignment | pass | evidence/direct-spec.md#specification-output |
