---
schema_version: 3
artifact: spec
change: 2026-10-16-ai-cli-manager
status: ready
ready_for_tickets: true
sources:
  - USER-DECISION:2026-10-16-approved-plan
---

# AI CLI 专用管理器

## 问题与目标

将 fastcli 从通用命令链/用户工具/Web 编辑器重构为六个 AI CLI 的直接 Yolo 启动、本地检测与当前 npm 环境管理工具。用户已确认全部 13 个访谈决定，随后明确要求实施计划。唯一外部行为合同为本 Spec；LOG 记录来源。

## 解决方案与外部行为

支持列表顺序与 ID 固定：claude、codex、gemini、grok、opencode、pi。

| ID | npm 包 | 启动参数 | 版本参数 |
|---|---|---|---|
| claude | @anthropic-ai/claude-code | --dangerously-skip-permissions | --version |
| codex | @openai/codex | --dangerously-bypass-approvals-and-sandbox | --version |
| gemini | @google/gemini-cli | --yolo | --version |
| grok | @xai-official/grok | --yolo --sandbox off | version |
| opencode | opencode-ai | --auto | --version |
| pi | @earendil-works/pi-coding-agent | 无 | --version |

`fastcli <tool> [args...]` 原样追加工具后全部 argv（含 --、--help、--version），无需确认，继承 cwd/env/stdio，打印到 stderr 并返回子进程退出码。SIGINT/SIGTERM 为 130/143。不存在入口为 127，未知/退役命令为 1。

`fastcli` 主菜单：Yolo 启动、安装 / 卸载 / 升级、设置、退出。管理先选操作，再展示六工具状态；不适用的升级/卸载标明原因。Yolo 只显示已发现入口（版本失败仍可选），空列表提供安装导航；子菜单返回，操作后刷新并回菜单，Ctrl+C 退出 130。无首次包管理器向导。设置只切换 en/zh-CN。

命令：install/upgrade/uninstall <tool> [--dry-run]，仅 uninstall 要确认，--yes 跳过；非 TTY 无 --yes 报错。list 显示六工具，info <tool> 显示路径/来源/版本/错误/npm 目标。config 展示配置；config --language en|zh-CN 设置语言。根 --help/--version 属于 fastcli。

检测：PATH 优先，失败不偷偷换入口；无 PATH 时探测标准系统/用户目录、当前 npm prefix、nvm/fnm/Volta/mise。只检测文件系统入口，不以配置文件证明安装。真实路径去重，保留可执行入口。无 PATH 单候选直接用，多候选 TTY 询问本次选择，非 TTY 报歧义。非 PATH 启动 prepend 入口目录到子进程 PATH。直接启动只定位目标，不探版本、不联网；列表进入时重查。版本进程限时 3 秒、最大并发 4、输出 64 KiB，超时终止本探测进程树并清理。版本未知仍可尝试启动。

管理：只操作当前 npm 全局 root/prefix 中经包元数据确认的目标；所有来源可启动。install/upgrade 均 npm i -g <pkg>@latest，uninstall 为 npm uninstall -g <pkg>。Claude 完整保留 --ignore-scripts=false --include=optional --allow-scripts=@anthropic-ai/claude-code，要求 npm >=11.16。OpenCode 加 --ignore-scripts=false --include=optional，npm >=11.16 增加 --allow-scripts=opencode-ai。Pi 无额外参数。npm 不存在/版本或 Node 不足时报错，不自动升级依赖、改 .npmrc 或 sudo。dry-run 仅显示计划命令，完全不调用 npm，不改配置。安装允许重复/并存，升级卸载要求当前 npm 中存在包，打印管理目标及并存提示。安装升级后探测 npm 对应入口（非任意 PATH 入口），卸载确认当前包消失并说明其他来源仍在。失败取消后重查真实状态，不自动重试/回滚。版本后置验证失败返回非零并明确包是否存在。

配置：保留 version "2"，新结构仅 version/packageManager 固定 npm/language。现有旧配置先独占创建字节备份，再原子替换；POSIX 0600；损坏/未来版本仍拒绝。旧 tools.json 原样保留且完全不读取。无配置默认 en，不自动写入；首次写配置走原子流程。移除 confirmBeforeRun/editor/firstRun，旧语言保留。

## 验收合同

| ID | 前置条件与动作 | 可观察结果 | 验证接缝 |
|---|---|---|---|
| AC-001 | 启动六个伪工具并传复杂参数 | 固定映射、字面 argv/cwd/stdio/退出状态正确，无确认 | built CLI 子进程 |
| AC-002 | PATH/常见目录/多安装/失效路径 | 默认优先、去重、缺失与异常分离、歧义处理 | 临时真实文件系统 + 检测 API |
| AC-003 | 版本异常、超时、巨大输出 | 有界完成、保留已安装、无残留探测进程 | 真实伪 CLI |
| AC-004 | install/upgrade/uninstall | 包、参数、当前 prefix 所有权、确认、dry-run、后置验证正确 | 伪 npm 外部边界 + CLI |
| AC-005 | npm 失败/部分变更/取消 | 重查可见状态，不谎报回滚成功 | 管理 API + 伪 npm |
| AC-006 | 旧配置迁移/损坏/未来版本/写失败 | 原件可恢复、原子权限、语言保留、不读 tools.json | 真实临时配置目录 |
| AC-007 | 菜单选择/空态/返回/设置/退出 | 顺序正确、无首次向导、仅卸载确认、状态刷新 | 注入提示器 + PTY |
| AC-008 | 旧接口及已移除工具 | 明确迁移提示，用户文件不变 | built CLI |
| AC-009 | 构建测试与文档 | Node >=22.19，三平台 CI，CLI-only 构建，README/规则/Skill 一致 | build/test/typecheck/链接检查 |

## 范围

- IN：src、tests、packages/web 删除、package/lock/workspace/build/CI、README/CHANGELOG/AGENTS、内置工具登记 Skill、本 change 工件。
- REUSE：TypeScript ESM .js imports、clack 交互、双语、配置原子写/错误语义、tag 发布审批流程。
- OUT：真实 AI 工具安装、用户主目录变更、提交/tag/push/发布、云服务、永久 Speculo 知识改写。

## 验证策略

定向 Vitest 对外行为红绿；最终 pnpm build 后 pnpm test，pnpm exec tsc --noEmit。Linux 主机实际执行，Windows/macOS CI 定义；不能将未运行平台说成已验证。旧测试退役随旧能力删除；配置/进程/诊断风险由新测试承接。

## 实现接缝与所有权

Lead 拥有入口/菜单/配置/i18n/执行器/types/工具目录/文档/依赖与正式工件。检测协作者仅 src/core/detection.ts 与 tests/core/detection.test.ts；管理协作者仅 src/core/npm-manager.ts 与 tests/core/npm-manager.test.ts。独立审查不写源码。

公共进程接口：runProcess(invocation): Promise<ProcessResult>（继承 stdio，信号转发）；probeProcess(invocation,{timeoutMs?,maxOutput?}): Promise<ProbeResult>（捕获输出，默认 3000ms/65536 bytes）。统一 ProcessInvocation={file,args,env?,cwd?}。

检测接口：discoverTool(tool, options?): Promise<ToolDetection>；detectTools(tools, options?): Promise<ToolDetection[]>；probeInstallation(tool, installation, options?): Promise<DetectedInstallation>；installationEnv(installation, env?): ProcessEnv。options 注入 env/home/platform/fallbackDirs/npmPrefix（显式 fallbackDirs 替代默认搜索便于隔离）；discoverTool 不探版本；detectTools 限并发调用探测。

管理接口：getNpmContext(env?): Promise<NpmContext>；inspectNpmPackage(tool,context): Promise<NpmPackageState>；buildNpmInvocation(tool,action,context?): ProcessInvocation；manageTool(tool,action,context): Promise<ManagementResult>。NpmContext={file,version,prefix,root,env}；NpmPackageState={installed,entryPath?}；ManagementResult={code,message,installed,version?}。管理模块返回可翻译结果，CLI 负责提示与确认。

### 未决问题

无。
