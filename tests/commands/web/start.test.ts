import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../src/utils/logger.js';
import { webStart } from '../../../src/commands/web/start.js';

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

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('http://127.0.0.1:'));
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('一次性口令'));
    expect(openBrowserSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
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
