import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  saveConfig,
  ensureConfigExists,
  validateConfig,
} from '../../src/core/config-manager.js';
import type { Config } from '../../src/types/index.js';

// 使用临时目录进行测试
const TEST_DIR = join(tmpdir(), 'fastcli-test-' + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, 'config.json');

describe('ConfigManager', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('ensureConfigExists', () => {
    it('应该创建默认配置文件', () => {
      ensureConfigExists(TEST_CONFIG_PATH);
      expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
    });

    it('不应覆盖已存在的配置', () => {
      const existingConfig: Config = {
        aliases: { test: { command: 'echo test' } },
        workflows: {},
      };
      saveConfig(existingConfig, TEST_CONFIG_PATH);
      ensureConfigExists(TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.aliases.test).toBeDefined();
    });
  });

  describe('loadConfig', () => {
    it('应该加载有效的配置文件', () => {
      const config: Config = {
        aliases: { gp: { command: 'git push' } },
        workflows: {},
      };
      saveConfig(config, TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.aliases.gp.command).toBe('git push');
    });

    it('应该在文件不存在时抛出错误', () => {
      expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow();
    });
  });

  describe('saveConfig', () => {
    it('应该保存配置并格式化 JSON', () => {
      const config: Config = {
        aliases: { test: { command: 'echo' } },
        workflows: {},
      };
      saveConfig(config, TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded).toEqual(config);
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config: Config = {
        aliases: { gp: { command: 'git push' } },
        workflows: {
          test: {
            steps: [
              {
                id: 'step1',
                prompt: 'Select',
                options: [{ name: 'opt1', command: 'echo' }],
              },
            ],
          },
        },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测名称冲突', () => {
      const config: Config = {
        aliases: { test: { command: 'echo' } },
        workflows: { test: { steps: [] } },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('test');
    });

    it('应该在 workflow.provider 引用不存在时报错', () => {
      const config: Config = {
        aliases: {},
        workflows: {
          chat: {
            provider: 'codex',
            steps: [
              {
                id: 'step1',
                prompt: 'Select mode',
                options: [{ name: 'Start', command: 'echo start' }],
              },
            ],
          },
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('provider'))).toBe(true);
    });

    it('应该允许无 providers/credentials 的旧配置', () => {
      const config: Config = {
        aliases: { gp: { command: 'git push' } },
        workflows: {
          simple: {
            steps: [
              {
                id: 'step1',
                prompt: 'Select',
                options: [{ name: 'Run', command: 'echo ok' }],
              },
            ],
          },
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('应该在 option.provider 引用不存在时报错', () => {
      const config: Config = {
        aliases: {},
        workflows: {
          chat: {
            steps: [
              {
                id: 'step1',
                prompt: 'Select',
                options: [{ name: 'Run', provider: 'missing' }],
              },
            ],
          },
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('missing'))).toBe(true);
    });

    it('应该在 provider.envMapping 键值为空时报错', () => {
      const config: Config = {
        aliases: {},
        workflows: {},
        providers: {
          codex: {
            providerId: 'codex',
            command: 'codex',
            envMapping: {
              '': 'token',
              OPENAI_API_KEY: '',
            },
          },
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('envMapping'))).toBe(true);
    });
  });
});
