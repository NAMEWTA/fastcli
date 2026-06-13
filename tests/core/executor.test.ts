import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  executeCommand,
  executeCommandChain,
  printCommandList,
} from '../../src/core/executor.js';

/**
 * 子进程执行器（`src/core/executor.ts`）的测试。
 *
 * 全部用例通过 `spawnImpl` 注入 mock,不真正 spawn 子进程。覆盖：
 *
 * - dryRun=true 时不调用 spawn，返回 success: true / code: 0
 * - 退出码透传：子进程退出 0 → success true；非 0 → success false
 * - 子进程被信号终止时 code = 128 + signal_number 风格
 * - ENOENT 时输出「命令未找到：<bin>」并返回 code 127
 * - POSIX 平台 shell 调用：/bin/sh -c <command>
 * - 命令打印（Requirement 7.1）：spawn 前 stdout 至少打印一次完整命令
 *
 * Validates: Requirements 6.5, 7.1, 7.3, 7.5
 * PBT: Property 7, Property 8
 */

class FakeChild extends EventEmitter {
  killed = false;
  kill(signal?: NodeJS.Signals): boolean {
    this.killed = true;
    // 立刻把信号当作子进程退出原因抛出，模拟 OS 行为
    setImmediate(() => this.emit('exit', null, signal ?? 'SIGTERM'));
    return true;
  }
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('executeCommand - dryRun', () => {
  it('dryRun=true 时不调用 spawn，返回 success/code 0', async () => {
    const spawnMock = vi.fn();
    const result = await executeCommand('echo hello', {
      dryRun: true,
      spawnImpl: spawnMock as never,
    });
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, code: 0 });
  });

  it('dryRun 也会打印命令（Requirement 7.1）', async () => {
    await executeCommand('echo hello', { dryRun: true });
    const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('echo hello');
  });
});

describe('executeCommand - 平台分支与命令打印', () => {
  it('POSIX 上使用 /bin/sh -c <command> 且 stdio 继承', async () => {
    if (process.platform === 'win32') return; // 在 Windows 上跳过
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);

    const promise = executeCommand('echo hello', {
      spawnImpl: spawnMock as never,
    });
    // 触发 child exit 让 promise resolve
    setImmediate(() => child.emit('exit', 0, null));
    await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [file, args, options] = spawnMock.mock.calls[0]!;
    expect(file).toBe('/bin/sh');
    expect(args).toEqual(['-c', 'echo hello']);
    expect((options as { stdio?: string }).stdio).toBe('inherit');
  });

  it('spawn 之前会在 stdout 打印完整命令（Requirement 7.1）', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('volta install foo', {
      spawnImpl: spawnMock as never,
    });
    setImmediate(() => child.emit('exit', 0, null));
    await promise;

    const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('volta install foo');
  });
});

describe('executeCommand - 退出码透传', () => {
  it('子进程退出 0 → success: true / code: 0', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('exit', 0, null));
    const result = await promise;
    expect(result).toEqual({ success: true, code: 0, signal: null });
  });

  it('子进程退出 1 → success: false / code: 1', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('exit', 1, null));
    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.code).toBe(1);
  });

  it('子进程被 SIGINT 终止 → code: 130', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('exit', null, 'SIGINT'));
    const result = await promise;
    expect(result.code).toBe(130);
    expect(result.signal).toBe('SIGINT');
    expect(result.success).toBe(false);
  });

  it('子进程被 SIGTERM 终止 → code: 143', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('exit', null, 'SIGTERM'));
    const result = await promise;
    expect(result.code).toBe(143);
    expect(result.signal).toBe('SIGTERM');
  });

  it('子进程退出码为 null 且无信号 → 回退到 1', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('exit', null, null));
    const result = await promise;
    expect(result.code).toBe(1);
  });
});

describe('executeCommand - ENOENT 友好错误', () => {
  it('spawn 抛 ENOENT → 输出 command not found 并返回 code 127', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('volta install foo', {
      spawnImpl: spawnMock as never,
    });
    const enoent = Object.assign(new Error('not found'), { code: 'ENOENT' });
    setImmediate(() => child.emit('error', enoent));
    const result = await promise;

    expect(result).toEqual({ success: false, code: 127, signal: null });
    const errored = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(errored).toContain('Command not found: volta');
  });

  it('其它 spawn error → 返回 code 1 且打印错误', async () => {
    const child = new FakeChild();
    const spawnMock = vi.fn(() => child as never);
    const promise = executeCommand('foo', { spawnImpl: spawnMock as never });
    setImmediate(() => child.emit('error', new Error('boom')));
    const result = await promise;
    expect(result.code).toBe(1);
    expect(result.success).toBe(false);
  });
});

describe('executeCommandChain - 命令链语义', () => {
  it('printCommandList 使用 [i/N] 格式打印完整清单', () => {
    printCommandList(['echo a', 'echo b']);
    const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[1/2] $ echo a');
    expect(logged).toContain('[2/2] $ echo b');
  });

  it('dryRun=true 时不调用 spawn', async () => {
    const spawnMock = vi.fn();
    const result = await executeCommandChain(['echo a', 'echo b'], {
      dryRun: true,
      spawnImpl: spawnMock as never,
    });
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, code: 0, totalSteps: 2 });
  });

  it('在同一个 shell 会话中执行并保留 shell 变量', async () => {
    if (process.platform === 'win32') return;
    const result = await executeCommandChain([
      'fastcli_chain_var=ok',
      'test "$fastcli_chain_var" = ok',
    ]);
    expect(result).toMatchObject({ success: true, code: 0, totalSteps: 2 });
  });

  it('中途失败时返回失败步骤和退出码', async () => {
    if (process.platform === 'win32') return;
    const result = await executeCommandChain(['true', 'false', 'echo skipped']);
    expect(result.success).toBe(false);
    expect(result.code).toBe(1);
    expect(result.failedStep).toBe(2);
    expect(result.totalSteps).toBe(3);
  });

  it('在 Windows 上顺序执行并在中途失败时返回步骤信息', async () => {
    if (process.platform !== 'win32') return;
    const result = await executeCommandChain([
      'echo step1',
      'exit /b 1',
      'echo skipped',
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe(1);
    expect(result.failedStep).toBe(2);
    expect(result.totalSteps).toBe(3);
  });

  it('在 Windows 上顺序执行全部成功时返回 success', async () => {
    if (process.platform !== 'win32') return;
    const result = await executeCommandChain([
      'echo step1',
      'echo step2',
    ]);
    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
    expect(result.failedStep).toBeUndefined();
    expect(result.totalSteps).toBe(2);
  });

  it('顺序执行时在失败的步骤处停止并报告正确的步骤号（mock）', async () => {
    if (process.platform !== 'win32') return;
    let callCount = 0;
    const spawnMock = vi.fn(() => {
      const child = new FakeChild();
      if (callCount === 0) {
        // Step 1 succeeds
        setImmediate(() => child.emit('exit', 0, null));
      } else {
        // Step 2 fails
        setImmediate(() => child.emit('exit', 2, null));
      }
      callCount += 1;
      return child as never;
    });

    const result = await executeCommandChain(
      ['cmd-a', 'cmd-b', 'cmd-c'],
      { spawnImpl: spawnMock as never },
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe(2);
    expect(result.failedStep).toBe(2);
    expect(result.totalSteps).toBe(3);
    expect(callCount).toBe(2); // only steps 1 and 2 were attempted
  });
});
