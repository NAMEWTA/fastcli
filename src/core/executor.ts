/**
 * 子进程执行器：把命令字符串交给系统 shell 执行，统一封装退出状态、信号、
 * 底层错误为 {@link ExecResult}。
 *
 * 内部结构：
 *
 * - `spawnOnce`（私有原语）——唯一接触 `node:child_process.spawn` 的模块，
 *   封装 spawn + promise + 信号转发 + error/exit 事件处理
 * - `executeCommandChain`（唯一公共入口）——按命令数量分支：
 *   n=0 直接返回、n=1 无 trap 开销、n>1 POSIX 拼接追踪链、
 *   n>1 Windows 逐条执行
 *
 * 职责边界：
 *
 * - **不修改命令字符串**：执行与展示一致的字节序（Requirement 7.3）
 * - **不决定父进程退出码**：仅返回 {@link ExecResult}，由上层 CLI 决定
 * - **不向上抛异常**：所有失败映射为 ExecResult 字段，调用方无需 try/catch
 *
 * 命令打印（Requirement 7.1）
 * ----------------------------
 * 打印由 executor 自己负责——n=1 打印 `$ <command>`，n>1 打印 `[i/N] $ <command>`。
 * 所有 spawn 路径都先打印后执行，不可绕过。
 *
 * 信号转发（Requirement 7.5）
 * ----------------------------
 * spawn 期间挂载 SIGINT/SIGTERM 转发器，子进程退出后立即卸载。
 *
 * Validates: Requirements 6.5, 7.1, 7.3, 7.5
 */

import { spawn as nodeSpawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ExecResult } from '../config/schema.js';
import { t, type Language } from '../i18n.js';

/**
 * {@link executeCommandChain} 的可选项。
 *
 * - `dryRun`：仅打印命令、不真正调用 spawn；返回 `{ success: true, code: 0 }`。
 *   即便如此 Requirement 7.1 的命令打印仍会发生
 * - `spawnImpl`：注入用的 spawn 实现，类型与 `node:child_process.spawn` 完全
 *   兼容。仅用于测试；生产代码不应使用
 */
export interface ExecuteOptions {
  /** 仅打印不执行，默认 false。 */
  dryRun?: boolean;
  /** 注入 spawn 实现以便测试。默认使用 node:child_process.spawn。 */
  spawnImpl?: typeof nodeSpawn;
  /** UI language for executor diagnostics. */
  language?: Language;
}

export interface ExecuteChainResult extends ExecResult {
  /** 失败发生的命令序号（1-based）。成功时为 undefined。 */
  failedStep?: number;
  /** 命令链总步数。 */
  totalSteps: number;
}

/**
 * 父进程需要转发给子进程的信号集合。
 *
 * 仅 SIGINT 与 SIGTERM —— 前者对应终端 Ctrl+C，后者对应常规终止请求。
 * 其它信号（SIGHUP / SIGQUIT 等）按平台默认行为处理，避免越权。
 */
const FORWARDED_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

/**
 * 把信号名换算为「128 + signal number」风格的退出码。
 *
 * 这里只显式枚举常用的两种；其它信号回退到 128，与 POSIX shell 约定一致。
 * 不依赖 `os.constants.signals` 是为了在 Windows 上也能稳定返回数值。
 */
function signalToExitCode(signal: NodeJS.Signals): number {
  if (signal === 'SIGINT') return 130;
  if (signal === 'SIGTERM') return 143;
  return 128;
}

/**
 * 取命令字符串的第一个空白分隔 token，作为 ENOENT 时的提示文案。
 *
 * 命令前缀可能含路径（`/usr/local/bin/foo`），这里不做截断或剥离；保持
 * 原样有助于用户精确定位是哪一个可执行文件没找到。空命令返回空串，
 * 上层会得到 `命令未找到：` 这样的退化提示——但这已经在更上游被
 * resolver / add 校验拦下，正常路径下不会到达。
 */
function extractBinary(command: string): string {
  const trimmed = command.trim();
  if (trimmed.length === 0) return '';
  return trimmed.split(/\s+/)[0] ?? '';
}

/**
 * 构造 spawn 调用所需的 shell 与参数列表，按当前平台分支。
 *
 * - POSIX：`/bin/sh -c <command>`
 * - Windows：`cmd.exe /d /s /c <command>`（优先取 `process.env.ComSpec`）
 *
 * 这里只处理「壳」的差异，不对 command 做任何转义：命令字符串作为单个
 * 参数原样传入，由 shell 自行解析（Requirement 7.3）。
 */
function buildShellInvocation(
  command: string,
): { file: string; args: string[] } {
  if (process.platform === 'win32') {
    const file = process.env.ComSpec ?? 'cmd.exe';
    return { file, args: ['/d', '/s', '/c', command] };
  }
  return { file: '/bin/sh', args: ['-c', command] };
}

function quoteSh(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function buildTrackedCommandChain(commands: string[], statePath: string): string {
  const parts: string[] = [
    `__fastcli_step_file=${quoteSh(statePath)}`,
    '__fastcli_step=1',
    'trap \'__fastcli_code=$?; printf "%s:%s\\n" "$__fastcli_step" "$__fastcli_code" > "$__fastcli_step_file"; exit "$__fastcli_code"\' EXIT',
  ];

  for (let i = 0; i < commands.length; i += 1) {
    if (i === 0) {
      parts.push(commands[i]!);
    } else {
      parts.push(`__fastcli_step=${i + 1}`);
      parts.push(commands[i]!);
    }
  }

  return parts.join(' && ');
}

async function readFailedStep(
  statePath: string,
  fallbackStep: number,
): Promise<number> {
  try {
    const raw = await readFile(statePath, 'utf8');
    const [stepRaw] = raw.trim().split(':');
    const step = Number.parseInt(stepRaw ?? '', 10);
    if (Number.isInteger(step) && step >= 1) {
      return step;
    }
  } catch {
    // 状态文件缺失时回退到第一步，避免掩盖真实退出码。
  }
  return fallbackStep;
}

/**
 * 在父进程上注册 SIGINT / SIGTERM 转发器，并返回卸载函数。
 *
 * 行为：当父进程收到这两类信号时，调用 `child.kill(signal)` 把同名信号
 * 投递给子进程；父进程自己不退出，由 executor 等子进程的 `exit` 事件回收
 * ExecResult，再交给 CLI 决定是否 `process.exit`。
 *
 * 关键点：
 *
 * - 仅在 spawn 生命周期内挂载这些处理器；子进程退出（或失败）后立即卸载，
 *   避免在 TUI 主菜单循环里堆积处理器
 * - 不调用 `process.exit`：父进程退出码由 CLI 上层根据 ExecResult 决定
 * - `child.kill` 在子进程已经退出时会返回 false 或抛错，这里 best-effort
 *   地忽略——本来就没什么可补救的
 *
 * 注：当 `stdio: 'inherit'` 时，终端 Ctrl+C 实际上会被内核同时送到父进程
 * 与子进程（共享同一个前台进程组）。即便如此显式转发也不冗余：它兜底
 * 处理「父进程通过编程方式收到 SIGTERM、子进程未在同进程组」之类的场景。
 */
function attachSignalForwarders(child: ChildProcess): () => void {
  const registered: Array<{
    signal: NodeJS.Signals;
    handler: (signal: NodeJS.Signals) => void;
  }> = [];

  for (const signal of FORWARDED_SIGNALS) {
    const handler = (received: NodeJS.Signals): void => {
      try {
        child.kill(received);
      } catch {
        // 子进程已经消失或权限不足；信号转发是 best-effort，吞掉即可。
      }
    };
    registered.push({ signal, handler });
    process.on(signal, handler);
  }

  return () => {
    for (const { signal, handler } of registered) {
      process.off(signal, handler);
    }
  };
}

/**
 * spawnOnce — 私有原语，唯一接触 `node:child_process.spawn` 的模块。
 *
 * 调用方负责在调用前打印命令（Requirement 7.1）；本函数只管 spawn、
 * promise 包装、信号转发、error/exit 事件处理。始终 resolve，绝不 reject。
 *
 * @param command   完整的、已经做过变量替换的命令字符串
 * @param spawnImpl spawn 实现（生产用 nodeSpawn，测试用 mock）
 * @param language  UI 语言
 */
function spawnOnce(
  command: string,
  spawnImpl: typeof nodeSpawn,
  language: Language,
): Promise<ExecResult> {
  const { file, args } = buildShellInvocation(command);

  return new Promise<ExecResult>((resolve) => {
    const child = spawnImpl(file, args, { stdio: 'inherit' });
    const detachSignals = attachSignalForwarders(child);

    // exit 与 error 可能都触发（例如 spawn 失败时只触发 error，而某些
    // 平台上某些情况二者都会触发）。settled 闸门确保 resolve 只发生一次。
    let settled = false;
    const settle = (result: ExecResult): void => {
      if (settled) return;
      settled = true;
      detachSignals();
      resolve(result);
    };

    child.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        const bin = extractBinary(command);
        console.error(t('executor.commandNotFound', { bin }, language));
        settle({ success: false, code: 127, signal: null });
        return;
      }
      console.error(t('executor.failed', { message: err.message }, language));
      settle({ success: false, code: 1, signal: null });
    });

    child.on('exit', (code, signal) => {
      if (signal !== null) {
        settle({
          success: false,
          code: signalToExitCode(signal),
          signal,
        });
        return;
      }
      const exitCode = code ?? 1;
      settle({
        success: exitCode === 0,
        code: exitCode,
        signal: null,
      });
    });
  });
}

export function printCommandList(commands: readonly string[]): void {
  const total = commands.length;
  commands.forEach((command, index) => {
    console.log(`[${index + 1}/${total}] $ ${command}`);
  });
}

/**
 * 执行一条或多条 shell 命令，返回退出状态与步骤信息。
 *
 * 这是 executor 模块的唯一公共入口。内部按命令数量分支：
 *
 * - n=0：直接返回成功
 * - n=1：打印 `$ <command>`（无 [1/1] 前缀），调用 spawnOnce
 * - n>1 (POSIX)：打印 [i/N] 清单，拼接为带 trap 的追踪命令链，调用 spawnOnce
 * - n>1 (Windows)：打印 [i/N] 清单，逐条调用 spawnOnce
 *
 * 单命令路径不创建临时 statePath 文件（无 trap 开销）。
 *
 * @example
 *   const result = await executeCommandChain(['volta install foo']);
 *   if (!result.success) process.exit(result.code);
 */
export async function executeCommandChain(
  commands: string[],
  opts: ExecuteOptions = {},
): Promise<ExecuteChainResult> {
  const language = opts.language ?? 'en';
  const spawnImpl = opts.spawnImpl ?? nodeSpawn;

  // n=0：空命令链视为成功。
  if (commands.length === 0) {
    return { success: true, code: 0, signal: null, totalSteps: 0 };
  }

  // n=1：单命令路径，不创建 trap/statePath，打印格式无 [1/1] 前缀。
  if (commands.length === 1) {
    const cmd = commands[0]!;
    console.log(`$ ${cmd}`);

    if (opts.dryRun === true) {
      return { success: true, code: 0, signal: null, totalSteps: 1 };
    }

    const result = await spawnOnce(cmd, spawnImpl, language);
    return {
      ...result,
      failedStep: result.success ? undefined : 1,
      totalSteps: 1,
    };
  }

  // n>1：打印带编号的命令清单（Requirement 7.1）。
  printCommandList(commands);

  if (opts.dryRun === true) {
    return { success: true, code: 0, signal: null, totalSteps: commands.length };
  }

  // Windows 回退路径：cmd.exe 不支持 POSIX trap / shell 变量，因此逐条执行。
  if (process.platform === 'win32') {
    for (let i = 0; i < commands.length; i += 1) {
      const result = await spawnOnce(commands[i]!, spawnImpl, language);
      if (!result.success) {
        return {
          ...result,
          failedStep: i + 1,
          totalSteps: commands.length,
        };
      }
    }
    return { success: true, code: 0, signal: null, totalSteps: commands.length };
  }

  // POSIX：拼接为带 trap 的追踪命令链，单次 spawnOnce。
  const statePath = join(
    tmpdir(),
    `fastcli-chain-${process.pid}-${Date.now()}-${randomUUID()}`,
  );
  const command = buildTrackedCommandChain(commands, statePath);
  const result = await spawnOnce(command, spawnImpl, language);

  let failedStep: number | undefined;
  if (!result.success) {
    failedStep = await readFailedStep(statePath, 1);
  }

  try {
    await unlink(statePath);
  } catch {
    // 临时状态文件可能未创建；无需影响命令退出码。
  }

  return {
    ...result,
    failedStep,
    totalSteps: commands.length,
  };
}
