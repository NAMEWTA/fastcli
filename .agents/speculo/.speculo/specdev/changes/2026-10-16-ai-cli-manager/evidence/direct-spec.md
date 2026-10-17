# Direct Spec implementation evidence

Change: 2026-10-16-ai-cli-manager
Spec: [spec.md](../spec.md)
Lead: native:/root
Workspace: [README.md#execution-context](../README.md#execution-context)
Status: done

## Implementation and ownership

用户已批准完整访谈计划，并明确要求 “Implement the plan.”。实际实现复用 current workspace，未创建提交、tag、PR 或发布；没有安装真实 AI 工具。预先保留的 tracked 文件原件在本会话临时归档 `/tmp/fastcli-before-ai-manager.tar.gz`；基线状态见 [baseline-status.txt](baseline-status.txt)。原有 `.gitignore` 字节及 AGENTS 中 Speculo bootstrap/persistent-knowledge 后缀已与原件核对一致。

- native:/root：CLI/菜单/执行器/配置/目录/依赖/CI/文档/Skill、集成测试和后续修复；唯一正式状态 writer。
- native:/root/implement_detection：`src/core/detection.ts`、`tests/core/detection.test.ts`。返回时 16 passed / 1 Windows-only skipped；停止写入。
- native:/root/implement_npm：`src/core/npm-manager.ts`、`tests/core/npm-manager.test.ts`。返回时 24 passed、tsc passed；停止写入。Lead 后续维护集成修复。

原生 collaboration 派遣与返回使用上述真实任务 ID；两个实现者均返回授权写集、检查、限制及源文件摘要。Lead 实际回读两模块和测试并执行整体构建/测试，未仅采用协作者结论。登记 Skill 已按新 AI CLI/npm 专用范围重写，skill-creator quick_validate（隔离 venv/PyYAML）实际返回 `Skill is valid!`。

## Implemented behavior

六工具固定启动参数加字面 argv，实际继承 cwd/env/stdio；行为优先的 Yolo/管理/语言菜单；PATH 和常见安装目录检测、版本有界探测；仅管理当前 npm root/prefix 并验证包和入口所有权；旧配置原字节备份后原子迁移，不读取 tools.json；退役通用命令/Web/多包管理器。README、CHANGELOG、AGENTS、登记 Skill 与 CLI-only 构建和三平台 CI 同步。

## Verification observations

Linux, Node v26.11.1, pnpm 10.29.2。真实 Windows/macOS 执行不属于本机可验证范围；已定义 Node 22.19.0 / 24、Linux/macOS/Windows CI 矩阵，尚未运行远程 CI。

- `pnpm build`：CLI ESM 与 DTS 成功。
- `pnpm test`（限制项目 tests 目录后）：8 files，87 passed / 1 Windows-only skipped。
- `pnpm typecheck`：退出 0。
- `pnpm install --frozen-lockfile --offline`：退出 0，lockfile up to date。
- `git diff --check`：退出 0。
- 本地 Markdown 链接检查：README/AGENTS/CHANGELOG/登记 Skill 的相对目标均存在。
- 额外 built CLI 迁移场景：原配置含非 UTF-8 旧字段字节，备份逐字节相等；损坏 tools.json 字节不变；备份/config 均 0600。

<a id="pty"></a>
### Terminal E2E

Owner: native:/root
Result: passed
Command: python3 /tmp/fastcli-pty-check.py
Exit: 0
Observed: 使用临时 HOME/npm/AI 可执行文件及真实 120×30 PTY。Yolo→Claude 实际 argv 为 [--dangerously-skip-permissions]、stdin TTY=true，子进程退出返回菜单；Settings 切换 zh-CN 后主菜单中文，退出 0；独立 Ctrl+C 场景退出 130。原始终端输出保存在 [pty-transcript.txt](pty-transcript.txt)。安装/卸载确认由注入提示器结合真实临时 npm 的集成测试覆盖。无浏览器页面；旧 Web 删除，故不存在生产浏览器验收。

## Failure history and recovery

1. 最初行为红灯：旧入口没有正确返回 Claude 子进程 23；旧配置仍返回 Volta/旧字段。新实现后通过。
2. 检测协作者并发红灯峰值 5，调整为 4 个 worker 后通过；npm 协作者记录参数、所有权和后验等真实红灯后通过。
3. 新增信号 E2E 红灯：list 收到 SIGTERM 后被系统直接终止（code null），探测树可能残留。探测注册信号、清理树并传播取消后，三项信号测试通过。
4. 非 PATH 多安装红灯：有本地候选时未扫描 npm prefix，错误启动单候选返回 0。补查 npm prefix 后非 TTY 返回歧义 1，测试通过。
5. 首次完整 `pnpm test` 误扫用户预置 Speculo 的 node:test/Playwright 测试，5 个非项目 suite 失败。新增 Vitest include=`tests/**/*.test.ts`，保留所有项目测试，完整 suite 通过。
6. PTY harness 首次使用宿主 node 包装脚本导致临时 HOME 下配置找不到；改用 process.execPath。第二次 PTY 无窗口尺寸导致每字换行；设置真实终端尺寸后两场景通过。二者是验收 harness 修正，没有放宽产品断言。

## Test retirement and retained risks

旧 Web、用户工具、命令链和通用工具测试随获批删除能力退役。新测试承接：CLI argv/退出码/stdio/旧接口提示；配置损坏/未来版本/迁移/权限/原子失败；入口优先级/realpath 去重/路径源/失败版本/限时限流；npm 范围、链接越界、foreign bin、后验与部分失败；真实信号和菜单恢复。不保留已退役 API 的伪兼容逻辑。

## Workspace Execution Record

```json
{
  "schema_version": 1,
  "purpose": "direct-spec",
  "change": "2026-10-16-ai-cli-manager",
  "workspace_context": "README.md#execution-context",
  "implementation_owners": ["native:/root", "native:/root/implement_detection", "native:/root/implement_npm"],
  "status": "verified",
  "checkpoint": "evidence/review-final.md#review-input",
  "verification": {
    "status": "passed",
    "evidence": "evidence/direct-spec.md#verification",
    "e2e": {"required": true, "status": "passed", "reason": null, "evidence": "evidence/direct-spec.md#pty"}
  },
  "attempts": 3
}
```

记录在本轮实现与首批检查后回填，未伪造启动时已存在的执行证据。最终审查输入与真实检查已在下方闭合；原失败历史保留。


## Final fixes and verification

首轮独立审查的 ST-01/02/03/04、SP-01/02/03/04 与第二轮 ST/SP-05 全部由 Lead 修复并经同一独立 reviewer 复审关闭，原结论分别保存在 review-round-1.md、review-round-2.md。不是覆写旧失败记录：

- 包目录缺失也核验 global bin；Windows cmd/bare/ps1 共同保护；force=true 的 core 与 built CLI 实际证明没有调用变更且原入口字节不变。
- Windows runProcess 等待 taskkill /T /F 与 close；非零清理单独报告未知状态。新增 Windows 真实 cmd→Node→child 取消测试，本机跳过。
- npm 复用 PATH 引号/PATHEXT；菜单/确认前/核心共用操作可用性，不能管理原因在确认前可见。
- npm fixture realpath；symlink TMPDIR 下独立复现环境重跑通过。Windows 路径断言按平台大小写语义，PATH 顺序和入口身份不变；同 npm 入口不再误报并存。
- 新边界测试最初失败（foreign 安装进入 npm、菜单错误进入确认），修复后通过。旧测试的“其他包但同 claude executable”断言从 missing 改为 foreign-entry，另加真正 codex executable 缺失断言；没有放宽错误保护。

<a id="verification"></a>
## Integration Verification

Result: passed
Owner: native:/root
Command: pnpm build && pnpm test && pnpm typecheck
Exit: 0
Observed: 最终 round 3 输入下，ESM/DTS 构建成功；8 个项目测试文件，91 passed / 5 Windows-only skipped，共 96 cases；tsc --noEmit 成功。随后同一输入重跑真实 PTY 两场景，退出码分别 0 和 130。本地文档链接、原用户修改保全及 git diff --check 通过。独立 reviewer 对最终输入另跑三文件 47 passed / 4 Windows-only skipped。

E2E: required；Lead-owned built CLI 临时文件系统/外部进程边界与 [Terminal E2E](#pty) 实际执行通过。没有使用真实 npm 安装 AI 包，没有变更用户主目录。跨平台原生执行仅 Linux；Windows/macOS CI 为已配置但未执行的后续平台验证，不虚构 CI receipt。

## Design Conformance

本次终端菜单采用已批准 Spec AC-007 的行为顺序和现有 clack 组件，无浏览器页面或新视觉稿；Web 整体退役。真实 PTY 和菜单集成测试覆盖主菜单顺序、仅已发现入口、版本未知可启动、空态安装导航、返回、语言立即切换与 Ctrl+C。未使用原型截图替代生产验证。

## Independent Review

Input: evidence/review-final.md#review-input
Implementers: native:/root, native:/root/implement_detection, native:/root/implement_npm
Mode: native
Verified-By: native:/root
Verification: evidence/review-final.md#review-receipt

| Axis | Reviewer | Result | Report |
|---|---|---|---|
| standards | native:/root/independent_review | pass | evidence/review-final.md#standards-output |
| specification | native:/root/independent_review | pass | evidence/review-final.md#specification-output |

## Acceptance Verification

```json
[
  {
    "id": "AC-001",
    "result": "passed",
    "method": "command and source",
    "source": "tests/cli/launch.test.ts",
    "observed": "六工具固定 argv、字面参数/原生帮助版本、cwd、stdio、退出23，以及真实 SIGINT/SIGTERM 130/143 通过。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-002",
    "result": "passed",
    "method": "command and source",
    "source": "tests/core/detection.test.ts",
    "observed": "PATH 优先、去重与入口保留、npm/nvm/fnm/Volta/mise、失效版本和非 PATH 多候选拒绝通过。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-003",
    "result": "passed",
    "method": "command and source",
    "source": "tests/core/process.test.ts",
    "observed": "3秒版本超时、64KiB输出上限与并发4，Linux取消清理实际探测树，未知版本仍保留安装通过。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-004",
    "result": "passed",
    "method": "command and source",
    "source": "tests/cli/management.test.ts",
    "observed": "安装升级卸载实际伪npm边界、仅当前prefix、foreign/link保护、仅卸载确认及dry-run无调用/迁移通过。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-005",
    "result": "passed",
    "method": "command and source",
    "source": "tests/core/npm-manager.test.ts",
    "observed": "失败23/取消130模拟退出后实际包已存在，重查状态无重试；真实SIGINT/SIGTERM执行边界通过，清理失败有明确未知状态分支。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-006",
    "result": "passed",
    "method": "command and source",
    "source": "tests/config/migration.test.ts",
    "observed": "原字节备份、语言保留、tools.json不读取、损坏/未来版本拒绝、0600及原子写失败清理通过。额外built CLI验证非UTF8旧字段原字节备份。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-007",
    "result": "passed",
    "method": "command and source",
    "source": "tests/cli/menu.test.ts",
    "observed": "菜单动作优先、已安装筛选/未知版本、空态导航、返回、安装后刷新、不可管理原因在确认前可见、语言/Ctrl+C及真实PTY通过。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-008",
    "result": "passed",
    "method": "command and source",
    "source": "tests/cli/launch.test.ts",
    "observed": "12个退役命令/ID给迁移说明，旧tools.json保留；旧过滤/配置入口退役按源码与CLI路由核对。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  },
  {
    "id": "AC-009",
    "result": "passed",
    "method": "command and source",
    "source": "README.md",
    "observed": "CLI-only构建、Node>=22.19、三OS×两Node版本CI配置、完整测试/类型、文档链接和Skill结构验证通过；未声称已执行Windows/macOS CI。",
    "command": "pnpm build && pnpm test && pnpm typecheck",
    "exit": 0
  }
]
```

## Skill Execution Records

```json
[]
```

Direct Spec 无 Ticket 绑定契约；实际运行 I 实施/双轴审查/Evidence 流程，新增工具登记 Skill 按新架构维护并通过 skill-creator 结构检查，不把阅读参考等同运行检查。

## Engineering Evidence

```json specdev-engineering-evidence
{
  "version": 1,
  "kind": "documentation",
  "checkpoint": "working-tree:bb86f20c75345e7d48b73ad551e410a3d47240d848bff7f92353609ab8f34631",
  "evidence": [
    "evidence/direct-spec.md#verification",
    "evidence/direct-spec.md#pty"
  ],
  "owner_paths": [
    "src/cli/app.ts",
    "src/cli/menu.ts",
    "src/core/detection.ts",
    "src/core/npm-manager.ts",
    "src/config/reader.ts",
    "package.json",
    ".github/workflows/ci.yml"
  ],
  "outcome": "verified",
  "visible_behavior_changed": true,
  "behavior_verification": "passed",
  "claims": [
    {
      "subject": "README/AGENTS/Skill 的快捷启动、npm边界、迁移及菜单说明与实际实现一致",
      "method": "command",
      "state": "verified",
      "evidence": [
        "evidence/direct-spec.md#verification"
      ],
      "command": "pnpm build && pnpm test && pnpm typecheck",
      "executed": true,
      "exit_code": 0,
      "output": [
        "ESM/DTS build success",
        "91 passed, 5 Windows-only skipped",
        "tsc --noEmit exited 0"
      ]
    },
    {
      "subject": "本地Markdown链接、未授权用户修改保全、CI声明覆盖三OS与两Node版本",
      "method": "source",
      "state": "verified",
      "evidence": [
        "README.md; AGENTS.md; .github/workflows/ci.yml; evidence/direct-spec.md#verification"
      ]
    }
  ]
}
```

## Delivery and remaining limits

最终交付为当前工作副本及 review-round-3 的完整 SHA-256 快照，无 commit/merge/push/tag/publish。用户入口 README 和 CHANGELOG 已更新；原 ~/.fastcli 数据未触及。Windows/macOS 原生测试、真实六个第三方 AI CLI 最新版的安装/登录与远程发布未执行，属于 Spec 明确的平台限制/OUT，不宣称已验证。当前没有未关闭的本地实现 finding、偏差或活动 writer。

最终 Evidence 结构校验要求 exclusions 为 string；原 round 3 报告与输入保留，review-final 仅规范化该元数据类型，代码 scope、来源摘要和实际验证不变。reviewer 单独核对并绑定规范化输入，未把格式校验当独立审查。

## Speculo completion checks

实际执行 `validate-specdev.mjs --stage implement --engineering documentation --repo /home/wta/projects/fastcli <change>`：退出 0，0 errors / 0 warnings。随后原 owner 原子更新 README 唯一 Outcome 为 completed，回读成功；`--stage complete`：退出 0，0 errors / 0 warnings。范围内代码与最终独立审查快照一致，未因记录完成而修改规范或实现。
