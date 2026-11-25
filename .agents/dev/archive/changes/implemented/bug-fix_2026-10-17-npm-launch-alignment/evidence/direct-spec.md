# Direct Spec Evidence

批准来源：会话最后一版 proposed_plan 与 Implement the plan。执行上下文见 ../README.md#execution-context。

设计：保留 core/npm-manager 的 npm 所有权边界，在 CLI 安装后组合单工具发现和有界默认入口探测；仅真实路径一致证明同一入口。无法证明的 shim/wrapper 即使版本相同也报告未确认。CLI 输出不改变 npm 成功退出码，信号和清理失败仍传播。

验证已完成，独立审查两轴通过。

<a id="session"></a>
## Session
Owner: native:/root
Observed: 用户 Implement the plan 授权会话；Lead 自行实现，按 I skill 派独立 reviewer /root/review_npm_alignment。

<a id="verification"></a>
## Workspace Verification
Result: passed
Method: build、CLI 集成、core 临时 npm 行为测试、类型检查及 diff 检查。
Source: tests/cli/management.test.ts、tests/core/npm-manager.test.ts、tests/core/update.test.ts
Observed: pnpm build exit 0；临时 Node 副本运行 Vitest，11 files passed，114 passed，5 skipped；pnpm typecheck exit 0；git diff --check exit 0。复制 Node 仅为避免同目录真实 Codex 污染空环境夹具。

## Failure History
- 原 CLI 回归先 red：缺少 npm 与默认入口分开报告；实现后 green。
- prefix 回归先 red：缺少显式 --prefix；实现后 green。
- 首次整体测试 1 fail：self-update 假 npm 严格 argv 仍是旧合同；同步预期显式 prefix 后定向 9 tests 与全套通过。
- change 工件初稿缺 Outcome/Execution Context/Ownership 显式格式，已按实际上下文补齐，不影响产品字节。

<a id="ac-1"></a>
## AC-1 Evidence
Result: passed
Method: CLI/core 行为验证及独立审查
Source: evidence/approved-plan.md
Observed: 工具 install/uninstall 与 self-update 使用显式 prefix；假 npm 要求 argv 与环境目标一致，含空格 prefix 回归通过。

<a id="ac-2"></a>
## AC-2 Evidence
Result: passed
Method: CLI/core 行为验证及独立审查
Source: evidence/approved-plan.md
Observed: 旧 PATH 版本、同版本不同入口、失败版本探测、无默认入口、正常 npm 默认、POSIX 别名均验证通过；npm 成功码保留，未更改其他安装。

<a id="ac-3"></a>
## AC-3 Evidence
Result: passed
Method: CLI/core 行为验证及独立审查
Source: evidence/approved-plan.md
Observed: info codex 集成断言 PATH default 和 npm executable，输出两个目标。

<a id="ac-4"></a>
## AC-4 Evidence
Result: passed
Method: CLI/core 行为验证及独立审查
Source: evidence/approved-plan.md
Observed: launch 路径逻辑未改；真实临时 argv/退出码/信号/超时/所有权测试全套通过；未执行本机工具变更。

<a id="ac-5"></a>
## AC-5 Evidence
Result: passed
Method: CLI/core 行为验证及独立审查
Source: evidence/approved-plan.md
Observed: build/typecheck/diff check 通过；全套114 passed、5平台跳过；独立标准/规范轴 pass，Windows 运行未在本机验证。

<a id="review-input"></a>
## Review Input
```json
{
  "scope": {
    "version": 1,
    "mode": "working-tree",
    "review_mode": "working-tree",
    "outcome": "changes",
    "base_sha": "d78bc053263e957066b466b70a80c5f48c5c0638",
    "observed_head": "d78bc053263e957066b466b70a80c5f48c5c0638",
    "selection": "explicit-files",
    "scope_paths": [
      "CHANGELOG.md",
      "README.md",
      "src/cli/actions.ts",
      "src/core/npm-manager.ts",
      "src/core/self-update.ts",
      "src/i18n.ts",
      "tests/cli/management.test.ts",
      "tests/core/npm-manager.test.ts",
      "tests/core/update.test.ts",
      "tests/helpers.ts"
    ],
    "changed_paths": [
      "CHANGELOG.md",
      "README.md",
      "src/cli/actions.ts",
      "src/core/npm-manager.ts",
      "src/core/self-update.ts",
      "src/i18n.ts",
      "tests/cli/management.test.ts",
      "tests/core/npm-manager.test.ts",
      "tests/core/update.test.ts",
      "tests/helpers.ts"
    ],
    "excluded_paths": [
      ".agents/speculo/.speculo/specdev/changes/2026-10-17-npm-launch-alignment/README.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-17-npm-launch-alignment/evidence/direct-spec.md"
    ],
    "working_snapshot": [
      {
        "path": "CHANGELOG.md",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "dc6450f4f9d90c5e0ed1ecc7100f0c54053b304b",
          "sha256": "1ab0dd4bb1f8e466b89839765707ce80fc3b957bbeaf0e403bc059bc8afc1ffd"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "341486da2c2086d225e3f06fa27fd3d083bb96149a93c8131f6fc646235361fc",
          "bytes": 8722
        }
      },
      {
        "path": "README.md",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "b104991ca8d868e06ad427f303618e8a323a5757",
          "sha256": "f33c89837e9739e2706e65fb04f9a9f8a1cb197d20fe94701b455b79628f2dc9"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "40bf1bff188e96b1084f3eb1569d19dce64e47e046faf5053c766aa716a82895",
          "bytes": 10724
        }
      },
      {
        "path": "src/cli/actions.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "326d630dd4082aebfaba87fce1bb7588f7c4e81d",
          "sha256": "264a91c56ff23fff19d2aa168d73bc225eccc0563b9831cebb8a3d541e4baaa9"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "7cdfaa040c70bcbafc6dbd9257a4d2bbb59963cd543f59dda6133084e7062faa",
          "bytes": 9390
        }
      },
      {
        "path": "src/core/npm-manager.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "6b142fb579c080fd06eea5e7fa8e7b815292db99",
          "sha256": "06726904b34def1c3115b88417602fef95b7a7bf69d03e07f299cda8b4f0bd9a"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "c9b5606450161b3b8619a9f71e9b296c639ca83b7d0a316b4f3f8980b0ef2a76",
          "bytes": 12847
        }
      },
      {
        "path": "src/core/self-update.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "f2da1492254297e189b3b1a9fe891458cbde56e7",
          "sha256": "e0d63040b7f852c4e09d8f29321a7af7c93c321ba27fe2bf6e20dc661add0222"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "7b4c54b3cf0157ae9040bf968af211f1c85edc142f18ce2dd093df17fafc6c0b",
          "bytes": 2868
        }
      },
      {
        "path": "src/i18n.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "dac7f339e4d1a7dcf1efdcee5f003c46a0bdb16b",
          "sha256": "791832ffad6b3e44bd6354c08531db1d7d151c9506a640374c29962d43015187"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "4ef4afbef952584661e238d2ae441c6ae3aed3626e854cc4139be4c0ed69a217",
          "bytes": 7173
        }
      },
      {
        "path": "tests/cli/management.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "4badb29a5fbdeb3fcebe5bb369bd89c716a1112d",
          "sha256": "22af0d2f9e360fa11875315ebaa57ce9703db1e5afeac0c09d30faee3a328d81"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "06b4a4d8dddbee2f1dc09d9d3dd02d1a55d814d4a502250dbc34fd63f7b07c16",
          "bytes": 8462
        }
      },
      {
        "path": "tests/core/npm-manager.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "a431fcc8eb1aaf92b940ad7b9920e075a1ab2375",
          "sha256": "4ff2ce523ddc224e719f47f9a2c6ddca4af7c6ca7a059d0f6757aac88af0b6e0"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "2ad9976291421c6bcffa389e8e9b8468e5c8d5b669d1fca4a3732adfe39ab28e",
          "bytes": 18169
        }
      },
      {
        "path": "tests/core/update.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "6ed37e8fc87c150bc2e482706ed434a01abe906d",
          "sha256": "a29a2e050d40158b0d5fe15b397ccbd822295aedf9931fcb344238f8dad27941"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "4a9ad25614933d18b58a0f0c164ff9fda515e2e9ef087d05d206e56b489a46a1",
          "bytes": 14967
        }
      },
      {
        "path": "tests/helpers.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "3c378fd1f106a47dd4fb29ced8eeeb1d9c847a40",
          "sha256": "46325cf8883ddfd3c7cfdfdaab72a65e37d3707d5084da156d030e0ef42a09f0"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "88cd9780c439c03eba1d5dacfe70ad0840fc657000a9ecc044e570779c26ecdf",
          "bytes": 4514
        }
      }
    ],
    "index_sha256": "b620650adf35e9291efcbf547acd073b7b4dbb5c237122365849c187d2ec3c6f",
    "inventory_sha256": "cac33f6be4ba5dd6802f0ce00f10aeea427100f35b54e247b536f41f71567624",
    "tracked_diff_sha256": "f41ffe3ef84348dbc2e4d556828b9f37859c456078fe80027d0574376f82b0f1",
    "tracked_diff_command": [
      "git",
      "diff",
      "--no-color",
      "--no-ext-diff",
      "--no-textconv",
      "--binary",
      "--no-renames",
      "d78bc053263e957066b466b70a80c5f48c5c0638",
      "--",
      ":(literal)CHANGELOG.md",
      ":(literal)README.md",
      ":(literal)src/cli/actions.ts",
      ":(literal)src/core/npm-manager.ts",
      ":(literal)src/core/self-update.ts",
      ":(literal)src/i18n.ts",
      ":(literal)tests/cli/management.test.ts",
      ":(literal)tests/core/npm-manager.test.ts",
      ":(literal)tests/core/update.test.ts",
      ":(literal)tests/helpers.ts"
    ],
    "input_sha256": "7ff6eb6531fd444e5e570d8349d710d03a6d8e2de0f6f2470bc5631f5f95a57d"
  },
  "sources": [
    {
      "kind": "instructions",
      "locator": "AGENTS.md",
      "sha256": "e9aa5fb7bc48c16540ba2025c2ae440ec5aa9946e531ec6043dfb77895054650"
    },
    {
      "kind": "standards",
      "locator": "AGENTS.md",
      "sha256": "e9aa5fb7bc48c16540ba2025c2ae440ec5aa9946e531ec6043dfb77895054650"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-17-npm-launch-alignment/evidence/approved-plan.md",
      "sha256": "454c2471eaf2f6c1b057fba82550b4c80d84fe9dca108447bab5f72d6334b4d0"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-17-npm-launch-alignment/README.md#scope",
      "sha256": "249c5271ed75c8f1c728d4dd2c66a26b7dd2001996f008d0ed9bfb1027093241"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-17-npm-launch-alignment/README.md#acceptance",
      "sha256": "95528173ee1efa42226ae6c5bf6980fa1b4f9890ac367125919a8b89777e8353"
    }
  ],
  "exclusions": "Only change documentation/evidence excluded; all implementation, tests, user docs and i18n included."
}
```

Input-SHA256: 67c9915e72e48b00836fb2904b66570b5bab7a9180e6a849025b7edf5608493c

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

<a id="standards-output"></a>
## standards Output
Reviewer: native:/root/review_npm_alignment
Axis: standards
Result: pass
Input-SHA256: 67c9915e72e48b00836fb2904b66570b5bab7a9180e6a849025b7edf5608493c
Observed: 独立 reviewer 已读 AGENTS 和批准规格，核对10文件 SHA256 与冻结快照一致，未发现需修复问题。实际运行 pnpm exec vitest run tests/cli/management.test.ts tests/core/npm-manager.test.ts tests/core/update.test.ts：47 passed、3 skipped。Windows .cmd 仅静态审查。

<a id="specification-output"></a>
## specification Output
Reviewer: native:/root/review_npm_alignment
Axis: specification
Result: pass
Input-SHA256: 67c9915e72e48b00836fb2904b66570b5bab7a9180e6a849025b7edf5608493c
Observed: 独立 reviewer 已读 AGENTS 和批准规格，核对10文件 SHA256 与冻结快照一致，未发现需修复问题。实际运行 pnpm exec vitest run tests/cli/management.test.ts tests/core/npm-manager.test.ts tests/core/update.test.ts：47 passed、3 skipped。Windows .cmd 仅静态审查。

<a id="review-receipt"></a>
## Review Receipt
Verified-By: native:/root
Mode: native
Reviewers: native:/root/review_npm_alignment
Input-SHA256: 67c9915e72e48b00836fb2904b66570b5bab7a9180e6a849025b7edf5608493c
Result: verified
Observed: collaboration.spawn_agent review_npm_alignment 及 followup_task 的真实返回确认两轴 PASS、独立只读身份和固定合同摘要；未参与实现；Lead 回读测试与快照，代码范围无漂移。
