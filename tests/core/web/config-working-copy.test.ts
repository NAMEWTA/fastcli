import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createConfigWorkingCopyStore,
} from '../../../src/core/web/config-working-copy.js';
import type { Config } from '../../../src/types/index.js';

const TEST_ROOT = join(tmpdir(), `fastcli-web-config-${Date.now()}`);
const TEST_CONFIG_PATH = join(TEST_ROOT, 'config.json');

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('ConfigWorkingCopyStore', () => {
  it('should initialize working copy from ~/.fastcli/config.json', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const initial: Config = {
      aliases: { gp: { command: 'git push' } },
      workflows: {},
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(initial), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });

    expect(store.getConfig()).toEqual(initial);
    expect(store.isDirty()).toBe(false);
  });

  it('should provide explicit guidance when config file does not exist', () => {
    expect(() => {
      createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    }).toThrow('请先运行 fastcli config init');
  });

  it('should provide repair guidance when config json is malformed', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(TEST_CONFIG_PATH, '{ malformed json }', 'utf-8');

    expect(() => {
      createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    }).toThrow('配置文件格式错误');
  });

  it('should set dirty=true after patching config', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const initial: Config = {
      aliases: {},
      workflows: {},
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(initial), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    const next: Config = {
      aliases: { gs: { command: 'git status' } },
      workflows: {},
    };

    store.patchConfig(next);

    expect(store.isDirty()).toBe(true);
    expect(store.getConfig()).toEqual(next);
  });

  it('should return structured validation errors', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const initial: Config = {
      aliases: {},
      workflows: {},
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(initial), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    store.patchConfig({
      aliases: { same: { command: 'echo alias' } },
      workflows: { same: { steps: [] } },
    });

    const result = store.validate();

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((err) => err.includes('aliases.same'))).toBe(true);
    expect(result.errors.some((err) => err.includes('workflows.same'))).toBe(true);
  });

  it('should block save when validation fails', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ aliases: {}, workflows: {} }), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    store.patchConfig({
      aliases: { same: { command: 'echo alias' } },
      workflows: { same: { steps: [] } },
    });

    expect(() => store.save()).toThrow('保存已阻断');
    expect(store.isDirty()).toBe(true);
  });

  it('should keep working copy and dirty state when save hits io/permission error', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ aliases: {}, workflows: {} }), 'utf-8');

    const store = createConfigWorkingCopyStore({
      configPath: TEST_CONFIG_PATH,
      saveConfigFn: () => {
        throw new Error('EACCES: permission denied');
      },
    });
    const next: Config = {
      aliases: { gl: { command: 'git log --oneline' } },
      workflows: {},
    };
    store.patchConfig(next);

    expect(() => store.save()).toThrow('保存失败');
    expect(store.isDirty()).toBe(true);
    expect(store.getConfig()).toEqual(next);
  });

  it('should reset dirty=false and persist working copy after successful save', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ aliases: {}, workflows: {} }), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    const next: Config = {
      aliases: { gs: { command: 'git status' } },
      workflows: {
        review: {
          steps: [
            {
              id: 'start',
              options: [{ name: 'ok', command: 'echo ok' }],
            },
          ],
        },
      },
    };

    store.patchConfig(next);
    store.save();

    expect(store.isDirty()).toBe(false);
    const persisted = JSON.parse(readFileSync(TEST_CONFIG_PATH, 'utf-8')) as Config;
    expect(persisted).toEqual(next);
    expect(store.getConfig()).toEqual(next);
  });

  it('should replace working copy entirely via importFromJson', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const initial: Config = {
      aliases: { gp: { command: 'git push' } },
      workflows: {},
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(initial), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    const raw = JSON.stringify({
      aliases: { gs: { command: 'git status' } },
      workflows: {
        review: {
          steps: [
            {
              id: 'start',
              prompt: 'choose',
              options: [{ name: 'ok', command: 'echo ok' }],
            },
          ],
        },
      },
    });

    const result = store.importFromJson(raw);

    expect(result.valid).toBe(true);
    expect(store.getConfig()).toEqual(JSON.parse(raw));
    expect(store.isDirty()).toBe(true);
  });

  it('should return validation errors instead of throwing on invalid envMapping value types', () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ aliases: {}, workflows: {} }), 'utf-8');

    const store = createConfigWorkingCopyStore({ configPath: TEST_CONFIG_PATH });
    const raw = JSON.stringify({
      aliases: {},
      workflows: {},
      providers: {
        openai: {
          envMapping: {
            API_KEY: 123,
          },
        },
      },
    });

    const act = () => store.importFromJson(raw);

    expect(act).not.toThrow();
    const result = act();
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) => err.includes('providers.openai.envMapping.API_KEY')),
    ).toBe(true);
    expect(result.errors.some((err) => err.includes('映射值必须是字符串'))).toBe(true);
  });
});
