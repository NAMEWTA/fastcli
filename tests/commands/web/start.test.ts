import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../src/utils/logger.js';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

import { openBrowser, webStart } from '../../../src/commands/web/start.js';

class MockChildProcess extends EventEmitter {
  unref = vi.fn();
}

describe('openBrowser', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('resolves only after child emits spawn', async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);

    let settled = false;
    const promise = openBrowser('http://127.0.0.1:9527').then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    child.emit('spawn');
    await promise;

    expect(settled).toBe(true);
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('rejects when child emits error before spawn', async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);

    const promise = openBrowser('http://127.0.0.1:9527');
    const error = new Error('spawn failed');

    child.emit('error', error);

    await expect(promise).rejects.toThrow('spawn failed');
    expect(child.unref).not.toHaveBeenCalled();
  });

  it('rejects when neither spawn nor error is emitted within timeout', async () => {
    vi.useFakeTimers();
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);

    const rejection = expect(openBrowser('http://127.0.0.1:9527')).rejects.toThrow('openBrowser timeout');

    await vi.advanceTimersByTimeAsync(1500);

    await rejection;
    expect(child.unref).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('webStart', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prints URL and one-time token, and opens browser once', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const openBrowserSpy = vi.fn().mockResolvedValue(undefined);

    await webStart({
      startServer: vi.fn().mockResolvedValue({
        url: 'http://127.0.0.1:9527',
        token: 'abc123',
      }),
      openBrowser: openBrowserSpy,
    });

    expect(infoSpy).toHaveBeenCalledWith('Web 管理后台已启动: http://127.0.0.1:9527');
    expect(infoSpy).toHaveBeenCalledWith('一次性口令: abc123');
    expect(openBrowserSpy).toHaveBeenCalledTimes(1);
    expect(openBrowserSpy).toHaveBeenCalledWith('http://127.0.0.1:9527');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps process alive when browser open fails', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      webStart({
        startServer: vi.fn().mockResolvedValue({
          url: 'http://127.0.0.1:9527',
          token: 'abc123',
        }),
        openBrowser: vi.fn().mockRejectedValue(new Error('open failed')),
      }),
    ).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledWith('Web 管理后台已启动: http://127.0.0.1:9527');
    expect(infoSpy).toHaveBeenCalledWith('一次性口令: abc123');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('自动打开浏览器失败'));
  });

  it('still resolves and logs warning when default openBrowser times out', async () => {
    vi.useFakeTimers();
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const promise = webStart({
      startServer: vi.fn().mockResolvedValue({
        url: 'http://127.0.0.1:9527',
        token: 'abc123',
      }),
    });

    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toBeUndefined();
    expect(infoSpy).toHaveBeenCalledWith('Web 管理后台已启动: http://127.0.0.1:9527');
    expect(infoSpy).toHaveBeenCalledWith('一次性口令: abc123');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('自动打开浏览器失败'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('openBrowser timeout'));
    expect(errorSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('prints error and exits safely when startup fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    await expect(
      webStart({
        startServer: vi.fn().mockRejectedValue(new Error('boom')),
        openBrowser: vi.fn(),
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('启动 Web 管理后台失败'));
  });
});
