import { describe, it, expect } from 'vitest';
import {
  resolveProviderId,
  getProvider,
  getCredentialValues,
  resolveModeArgs,
  buildProviderCommand,
  buildInjectedEnv,
} from '../../src/core/provider-runtime.js';
import type { Config } from '../../src/types/index.js';

const mockConfig: Config = {
  aliases: {},
  workflows: {},
  providers: {
    codex: {
      providerId: 'codex',
      command: 'codex',
      modeArgs: {
        resume: ['--resume'],
        'new-session': ['--new'],
      },
      envMapping: {
        OPENAI_API_KEY: 'token',
      },
    },
  },
  credentials: {
    work: {
      values: {
        token: 'sk-live',
        endpoint: 'https://api.example.com',
      },
    },
  },
};

describe('provider-runtime', () => {
  describe('resolveProviderId', () => {
    it('option.provider 应覆盖 workflow.provider', () => {
      expect(resolveProviderId('claude', 'codex')).toBe('claude');
      expect(resolveProviderId(undefined, 'codex')).toBe('codex');
      expect(resolveProviderId(undefined, undefined)).toBeUndefined();
    });
  });

  describe('getProvider', () => {
    it('应返回 provider 配置', () => {
      const provider = getProvider(mockConfig, 'codex');
      expect(provider.command).toBe('codex');
    });

    it('provider 不存在时应抛错', () => {
      expect(() => getProvider(mockConfig, 'missing')).toThrow(/provider/i);
    });
  });

  describe('getCredentialValues', () => {
    it('应返回凭据 values', () => {
      const values = getCredentialValues(mockConfig, 'work');
      expect(values.token).toBe('sk-live');
    });

    it('credentialId 不存在时应抛错', () => {
      expect(() => getCredentialValues(mockConfig, 'missing')).toThrow(/credentialId/i);
    });
  });

  describe('resolveModeArgs', () => {
    it('应按 mode 返回参数', () => {
      const provider = getProvider(mockConfig, 'codex');
      expect(resolveModeArgs(provider, 'resume')).toEqual(['--resume']);
      expect(resolveModeArgs(provider, 'new-session')).toEqual(['--new']);
      expect(resolveModeArgs(provider, undefined)).toEqual([]);
    });
  });

  describe('buildProviderCommand', () => {
    it('应拼接 command 与 modeArgs', () => {
      expect(buildProviderCommand('codex', ['--resume'])).toBe('codex --resume');
      expect(buildProviderCommand('codex', [])).toBe('codex');
    });
  });

  describe('buildInjectedEnv', () => {
    it('应按 envMapping 注入环境变量', () => {
      const env = buildInjectedEnv(
        { EXISTING: '1' },
        { OPENAI_API_KEY: 'token' },
        { token: 'sk-live' }
      );

      expect(env.EXISTING).toBe('1');
      expect(env.OPENAI_API_KEY).toBe('sk-live');
    });

    it('映射字段缺失时应抛错', () => {
      expect(() =>
        buildInjectedEnv(
          {},
          { OPENAI_API_KEY: 'token' },
          { endpoint: 'https://api.example.com' }
        )
      ).toThrow(/token/);
    });
  });
});
