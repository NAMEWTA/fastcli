import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

import { executeCommand } from '../../src/core/executor.js';

class MockStream extends EventEmitter {
  write(_text: string): void {
    // no-op
  }
}

function createMockChild(): {
  child: EventEmitter & { stdout: MockStream; stderr: MockStream };
  stdout: MockStream;
  stderr: MockStream;
} {
  const child = new EventEmitter() as EventEmitter & {
    stdout: MockStream;
    stderr: MockStream;
  };
  const stdout = new MockStream();
  const stderr = new MockStream();
  child.stdout = stdout;
  child.stderr = stderr;
  return { child, stdout, stderr };
}

describe('executor', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('interactive=false 时应使用输出采集 stdio', async () => {
    const { child } = createMockChild();
    spawnMock.mockReturnValue(child);

    const resultPromise = executeCommand('echo ok', { interactive: false });
    child.emit('close', 0);
    const result = await resultPromise;

    expect(spawnMock).toHaveBeenCalled();
    const options = spawnMock.mock.calls[0][2];
    expect(options.stdio).toEqual(['inherit', 'pipe', 'pipe']);
    expect(result.success).toBe(true);
  });

  it('interactive=true 时应使用 stdio=inherit', async () => {
    const { child } = createMockChild();
    spawnMock.mockReturnValue(child);

    const resultPromise = executeCommand('codex', { interactive: true });
    child.emit('close', 0);
    await resultPromise;

    const options = spawnMock.mock.calls[0][2];
    expect(options.stdio).toBe('inherit');
  });

  it('非0退出码时应返回 success=false', async () => {
    const { child } = createMockChild();
    spawnMock.mockReturnValue(child);

    const resultPromise = executeCommand('bad command');
    child.emit('close', 2);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.code).toBe(2);
  });

  it('error 事件时应返回失败并带错误信息', async () => {
    const { child } = createMockChild();
    spawnMock.mockReturnValue(child);

    const resultPromise = executeCommand('bad command');
    child.emit('error', new Error('spawn failed'));
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('spawn failed');
  });
});
