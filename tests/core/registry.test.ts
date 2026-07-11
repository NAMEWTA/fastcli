import { describe, expect, it, vi, afterEach } from 'vitest';

import { loadRegistry } from '../../src/core/registry.js';
import type {
  AppConfig,
  ToolEntry,
  ToolsFile,
} from '../../src/config/schema.js';

/**
 * 注册中心（`src/core/registry.ts`）的测试。
 *
 * 全部用例都通过 `loadRegistry({ appConfig, toolsFile })` 注入内存配置,
 * 不触发文件系统。覆盖 PBT Property 3 的四条断言：
 *
 * 1. `list()` 同时包含 builtin 与 user 工具
 * 2. user 中存在与 builtin 同 id 时,`findById(id)` 返回 user 条目并 warn
 * 3. `list({ source: 'builtin' })` / `list({ source: 'user' })` 仅返回对应来源
 * 4. `list({ tag: T })` 返回所有 `tags?.includes(T)` 的工具
 *
 * Validates: Requirements 1.5, 3.2, 3.3, 3.4
 * PBT: Property 3
 */

const APP_CONFIG_VOLTA: AppConfig = {
  version: '2',
  packageManager: 'volta',
  editor: '',
  confirmBeforeRun: true,
  firstRun: false,
  language: 'en',
};

const APP_CONFIG_NPM: AppConfig = {
  ...APP_CONFIG_VOLTA,
  packageManager: 'npm',
};

const EMPTY_TOOLS: ToolsFile = { version: '2', tools: [] };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadRegistry - 合并语义', () => {
  it('list() 同时包含 builtin（9 个）与 user 工具', async () => {
    const userTool: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      description: 'Aider CLI',
      tags: ['python'],
      commands: { install: ['pip install aider-chat'] },
      source: 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [userTool] },
    });

    const all = registry.list();
    // 9 个 builtin + 1 个 user = 10
    expect(all).toHaveLength(10);
    expect(all.map((t) => t.id).sort()).toEqual(
      [
        'aider',
        'claude',
        'codex',
        'copilot',
        'cursor',
        'gemini',
        'grok',
        'opencode',
        'pi-coding-agent',
        'speculo',
      ].sort(),
    );
  });

  it('builtin 工具的 commands 由 packageManager 决定', async () => {
    const registryVolta = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const claudeVolta = registryVolta.findById('claude');
    expect(claudeVolta?.commands.install).toEqual([
      'volta install @anthropic-ai/claude-code@latest',
    ]);
    expect(claudeVolta?.commands.update).toBeUndefined();
    expect(claudeVolta?.commands.danger).toEqual([
      'claude --dangerously-skip-permissions',
    ]);

    const registryNpm = await loadRegistry({
      appConfig: APP_CONFIG_NPM,
      toolsFile: EMPTY_TOOLS,
    });
    const claudeNpm = registryNpm.findById('claude');
    expect(claudeNpm?.commands.install).toEqual([
      'npm install -g @anthropic-ai/claude-code',
    ]);
  });
});

describe('loadRegistry - id 冲突时 user 覆盖 builtin', () => {
  it('user 工具与 builtin 同 id 时 findById 返回 user 条目', async () => {
    const overridden: ToolEntry = {
      id: 'claude',
      name: 'My Claude',
      description: '用户自定义的 claude',
      commands: { install: ['echo override'] },
      source: 'user',
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [overridden] },
    });

    const claude = registry.findById('claude');
    expect(claude?.source).toBe('user');
    expect(claude?.name).toBe('My Claude');
    expect(claude?.commands.install).toEqual(['echo override']);

    // 至少打印过一次 warn,提示用户覆盖了内置工具
    expect(warnSpy).toHaveBeenCalled();
    const warnArgs = warnSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(warnArgs).toContain('claude');
  });
});

describe('loadRegistry - source 过滤', () => {
  it('list({ source: "builtin" }) 仅返回 builtin', async () => {
    const userTool: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      commands: { install: ['pip install aider-chat'] },
      source: 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [userTool] },
    });

    const builtin = registry.list({ source: 'builtin' });
    expect(builtin).toHaveLength(9);
    expect(builtin.every((t) => t.source === 'builtin')).toBe(true);
  });

  it('list({ source: "user" }) 仅返回 user', async () => {
    const userTool: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      commands: { install: ['pip install aider-chat'] },
      source: 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [userTool] },
    });

    const userOnly = registry.list({ source: 'user' });
    expect(userOnly).toHaveLength(1);
    expect(userOnly[0]?.id).toBe('aider');
  });
});

describe('loadRegistry - tag 过滤', () => {
  it('list({ tag: T }) 仅返回包含该 tag 的工具', async () => {
    const userTool: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      tags: ['python', 'coding'],
      commands: { install: ['pip install aider-chat'] },
      source: 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [userTool] },
    });

    // 'coding' 是所有 8 个 coding builtin + aider 都拥有的 tag（speculo 属于 tool 分类不含此 tag）
    const coding = registry.list({ tag: 'coding' });
    expect(coding).toHaveLength(9);

    // 'python' 仅 aider 拥有
    const python = registry.list({ tag: 'python' });
    expect(python.map((t) => t.id)).toEqual(['aider']);

    // 不存在的 tag 应得到空集
    const missing = registry.list({ tag: 'nonexistent-tag' });
    expect(missing).toEqual([]);
  });

  it('source + tag 同时存在时取交集', async () => {
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const result = registry.list({ source: 'builtin', tag: 'openai' });
    expect(result.map((t) => t.id)).toEqual(['codex']);
  });
});

describe('loadRegistry - findById', () => {
  it('找不到时返回 undefined', async () => {
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    expect(registry.findById('does-not-exist')).toBeUndefined();
  });
});

describe('loadRegistry - user 条目 source 强制覆盖', () => {
  it('即使 tools.json 中 source 写错也会被强制为 user', async () => {
    const malformed: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      commands: { install: ['pip install aider-chat'] },
      // 故意写错 source 字段
      source: 'builtin' as 'builtin' | 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [malformed] },
    });
    const aider = registry.findById('aider');
    expect(aider?.source).toBe('user');
  });
});

describe('loadRegistry - category 过滤', () => {
  it('list({ category: "coding" }) 返回所有 coding 分类的 builtin 工具', async () => {
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const coding = registry.list({ category: 'coding' });
    expect(coding).toHaveLength(8);
    expect(coding.every((t) => t.source === 'builtin')).toBe(true);
    expect(coding.every((t) => t.category === 'coding')).toBe(true);
  });

  it('list({ category: "tool" }) 仅返回 speculo', async () => {
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const tool = registry.list({ category: 'tool' });
    expect(tool.map((t) => t.id)).toEqual(['speculo']);
  });

  it('category + source 组合过滤 user 工具无 category 时为空', async () => {
    const userTool: ToolEntry = {
      id: 'aider',
      name: 'Aider',
      commands: { install: ['pip install aider-chat'] },
      source: 'user',
    };
    const registry = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: { version: '2', tools: [userTool] },
    });
    const result = registry.list({ source: 'user', category: 'coding' });
    expect(result).toEqual([]);
  });
});

describe('loadRegistry - curl-based builtin commands', () => {
  it('grok / cursor 的 commands 不随 packageManager 改变', async () => {
    const registryVolta = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const registryNpm = await loadRegistry({
      appConfig: APP_CONFIG_NPM,
      toolsFile: EMPTY_TOOLS,
    });

    const grokVolta = registryVolta.findById('grok');
    const grokNpm = registryNpm.findById('grok');
    expect(grokVolta?.commands.install).toEqual([
      'curl -fsSL https://x.ai/cli/install.sh | bash',
    ]);
    expect(grokNpm?.commands.install).toEqual(grokVolta?.commands.install);
    expect(grokVolta?.commands.uninstall).toBeUndefined();

    const cursorVolta = registryVolta.findById('cursor');
    const cursorNpm = registryNpm.findById('cursor');
    expect(cursorVolta?.commands.install).toEqual([
      'curl https://cursor.com/install -fsS | bash',
    ]);
    expect(cursorNpm?.commands.install).toEqual(cursorVolta?.commands.install);
  });

  it('speculo 的 commands 随 packageManager 改变', async () => {
    const registryVolta = await loadRegistry({
      appConfig: APP_CONFIG_VOLTA,
      toolsFile: EMPTY_TOOLS,
    });
    const registryNpm = await loadRegistry({
      appConfig: APP_CONFIG_NPM,
      toolsFile: EMPTY_TOOLS,
    });
    const speculoVolta = registryVolta.findById('speculo');
    const speculoNpm = registryNpm.findById('speculo');
    expect(speculoVolta?.commands.install).toEqual([
      'volta install @namewta/speculo@latest',
    ]);
    expect(speculoNpm?.commands.install).toEqual([
      'npm install -g @namewta/speculo',
    ]);
  });
});
