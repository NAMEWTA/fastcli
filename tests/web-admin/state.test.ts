import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/types/index.js';
import {
  createInitialAppState,
  resolveLoginState,
} from '../../src/web-admin/App.js';
import { confirmImportBeforeApply } from '../../src/web-admin/components/AdminShell.js';
import { createAdminStateStore } from '../../src/web-admin/lib/state.js';

const EMPTY_CONFIG: Config = {
  aliases: {},
  workflows: {},
};

const FULL_CONFIG: Config = {
  aliases: {
    gs: {
      command: 'git status',
      description: '查看状态',
    },
  },
  providers: {
    codex: {
      providerId: 'codex',
      command: 'codex',
      modeArgs: {
        resume: ['--resume'],
      },
      envMapping: {
        OPENAI_API_KEY: 'token',
      },
    },
  },
  credentials: {
    work: {
      label: '工作账号',
      values: {
        token: 'sk-work',
      },
    },
  },
  workflows: {
    chat: {
      description: '聊天工作流',
      steps: [
        {
          id: 'account',
          prompt: '选择账号',
          options: [
            {
              name: '工作',
              value: 'work',
            },
          ],
        },
      ],
    },
  },
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

describe('WebAdmin admin working copy state', () => {
  it('更新任一字段后 dirty=true', () => {
    const store = createAdminStateStore(FULL_CONFIG);

    store.updateField('aliases', 'gs', {
      command: 'git diff',
      description: '查看差异',
    });

    expect(store.getState().dirty).toBe(true);
    expect(store.getState().workingCopy.aliases.gs.command).toBe('git diff');
  });

  it('每个模块最近更新时间独立维护', () => {
    const timestamps = [
      '2026-03-26T09:00:00.000Z',
      '2026-03-26T09:05:00.000Z',
    ];
    let index = 0;

    const store = createAdminStateStore(FULL_CONFIG, {
      now: () => timestamps[index++] ?? timestamps[timestamps.length - 1],
    });

    store.updateField('aliases', 'gs', {
      command: 'git diff',
      description: '查看差异',
    });
    store.updateField('providers', 'codex', {
      providerId: 'codex',
      command: 'codex --new',
      modeArgs: {
        resume: ['--resume'],
      },
      envMapping: {
        OPENAI_API_KEY: 'token',
      },
    });

    expect(store.getState().lastUpdated).toEqual({
      aliases: timestamps[0],
      providers: timestamps[1],
      credentials: null,
      workflows: null,
    });
  });

  it('JSON 模式校验返回统一错误列表', async () => {
    const validateConfig = vi.fn().mockResolvedValue({
      valid: false,
      errors: [
        '名称冲突: same 同时存在于 aliases 和 workflows 中',
        '工作流 "chat" 引用了不存在的步骤 "missing"',
      ],
    });
    const store = createAdminStateStore(FULL_CONFIG, {
      validateConfig,
    });

    const result = await store.updateJsonEntry(
      'workflows',
      'chat',
      JSON.stringify(
        {
          description: '聊天工作流',
          steps: [],
        },
        null,
        2,
      ),
    );

    expect(validateConfig).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      valid: false,
      errors: [
        '名称冲突: same 同时存在于 aliases 和 workflows 中',
        '工作流 "chat" 引用了不存在的步骤 "missing"',
      ],
    });
    expect(store.getState().validation.errors).toEqual(result.errors);
  });

  it('有错误时 saveAll 被阻断', async () => {
    const validateConfig = vi.fn().mockResolvedValue({
      valid: false,
      errors: ['名称冲突: same 同时存在于 aliases 和 workflows 中'],
    });
    const saveConfig = vi.fn();
    const store = createAdminStateStore(FULL_CONFIG, {
      validateConfig,
      saveConfig,
    });

    await expect(store.saveAll()).rejects.toThrow(/校验失败/);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('点击保存全部若遇到 IO 或权限错误，dirty 仍为 true 且编辑内容保持', async () => {
    const validateConfig = vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
    });
    const saveConfig = vi.fn().mockRejectedValue(new Error('保存失败：权限不足'));
    const store = createAdminStateStore(FULL_CONFIG, {
      validateConfig,
      saveConfig,
    });

    store.updateField('aliases', 'gs', {
      command: 'git diff',
      description: '查看差异',
    });
    const beforeSave = store.getState().workingCopy;

    await expect(store.saveAll()).rejects.toThrow(/保存失败/);
    expect(store.getState().dirty).toBe(true);
    expect(store.getState().workingCopy).toEqual(beforeSave);
  });

  it('导入时必须先经过二次确认', async () => {
    const importAll = vi.fn();

    const applied = await confirmImportBeforeApply('{"aliases":{}}', {
      confirmReplace: () => false,
      importAll,
    });

    expect(applied).toBe(false);
    expect(importAll).not.toHaveBeenCalled();
  });

  it('导入后工作态被全量覆盖', async () => {
    const validateConfig = vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
    });
    const store = createAdminStateStore(FULL_CONFIG, {
      validateConfig,
    });

    await store.importAll(
      JSON.stringify({
        aliases: {
          gp: {
            command: 'git push',
          },
        },
        providers: {},
        credentials: {},
        workflows: {},
      }),
    );

    expect(store.getState().workingCopy).toEqual({
      aliases: {
        gp: {
          command: 'git push',
        },
      },
      providers: {},
      credentials: {},
      workflows: {},
    });
  });

  it('导出返回当前工作态 JSON', () => {
    const store = createAdminStateStore(FULL_CONFIG);

    store.updateField('aliases', 'gs', {
      command: 'git diff',
      description: '查看差异',
    });

    expect(JSON.parse(store.exportAll())).toEqual(store.getState().workingCopy);
  });
});
