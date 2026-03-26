import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/types/index.js';
import {
  createInitialAppState,
  resolveLoginState,
} from '../../src/web-admin/App.js';

const EMPTY_CONFIG: Config = {
  aliases: {},
  workflows: {},
};

describe('WebAdmin app state', () => {
  it('未认证状态显示 login 模式', () => {
    expect(createInitialAppState()).toEqual({
      mode: 'login',
      authError: null,
      config: null,
      submitting: false,
    });
  });

  it('验证成功后进入 admin 模式', async () => {
    const verifyToken = vi.fn().mockResolvedValue({ ok: true });
    const fetchConfig = vi.fn().mockResolvedValue(EMPTY_CONFIG);

    const state = await resolveLoginState(
      { verifyToken, fetchConfig },
      'one-time-token',
    );

    expect(verifyToken).toHaveBeenCalledWith('one-time-token');
    expect(fetchConfig).toHaveBeenCalledTimes(1);
    expect(state).toEqual({
      mode: 'admin',
      authError: null,
      config: EMPTY_CONFIG,
      submitting: false,
    });
  });

  it('验证失败保留登录页并记录错误', async () => {
    const verifyToken = vi.fn().mockResolvedValue({
      ok: false,
      message: '认证失败：口令无效或已过期',
    });
    const fetchConfig = vi.fn();

    const state = await resolveLoginState(
      { verifyToken, fetchConfig },
      'bad-token',
    );

    expect(verifyToken).toHaveBeenCalledWith('bad-token');
    expect(fetchConfig).not.toHaveBeenCalled();
    expect(state).toEqual({
      mode: 'login',
      authError: '认证失败：口令无效或已过期',
      config: null,
      submitting: false,
    });
  });
});
