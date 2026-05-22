import { describe, expect, it } from 'vitest';

import { resolveCommand } from '../../src/core/resolver.js';
import type { ToolEntry } from '../../src/config/schema.js';

/**
 * 命令解析器（`src/core/resolver.ts`）的测试。
 *
 * 覆盖：
 * - 操作存在 → kind 'ok'，并替换 {{name}} / {{version}}
 * - 未提供 version → {{version}} 保持字面量
 * - 操作不存在 → kind 'unconfigured'，availableOps 按字母序
 * - 未知占位符 {{xxx}} 保持字面量不被吞掉
 *
 * Validates: Requirements 2.2, 2.3, 2.5
 * PBT: Property 4
 */

const TOOL: ToolEntry = {
  id: 'aider',
  name: 'Aider',
  commands: {
    install: ['pip install aider-chat=={{version}}'],
    update: ['pip install --upgrade aider-chat'],
    uninstall: ['pip uninstall aider-chat'],
    docs: ['open docs for {{name}} {{version}}'],
    weird: ['echo {{name}} {{unknown}} {{version}}'],
    deploy: ['cd app', 'npm run deploy {{version}}'],
  },
  source: 'user',
};

describe('resolveCommand - 操作存在', () => {
  it('返回 kind: "ok" 并完成 {{name}} 替换', () => {
    const result = resolveCommand(TOOL, 'docs', { version: '1.0.0' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['open docs for Aider 1.0.0']);
    }
  });

  it('未提供 version 时 {{version}} 保持字面量', () => {
    const result = resolveCommand(TOOL, 'install');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['pip install aider-chat=={{version}}']);
    }
  });

  it('提供 version 时正确替换', () => {
    const result = resolveCommand(TOOL, 'install', { version: '0.50.0' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['pip install aider-chat==0.50.0']);
    }
  });

  it('未知占位符 {{xxx}} 不被吞掉', () => {
    const result = resolveCommand(TOOL, 'weird', { version: '1.0' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['echo Aider {{unknown}} 1.0']);
    }
  });

  it('命令字符串不含变量时原样返回', () => {
    const result = resolveCommand(TOOL, 'update');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['pip install --upgrade aider-chat']);
    }
  });

  it('命令链中的每条命令都会独立替换变量', () => {
    const result = resolveCommand(TOOL, 'deploy', { version: '2.0.0' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['cd app', 'npm run deploy 2.0.0']);
    }
  });
});

describe('resolveCommand - 操作不存在', () => {
  it('返回 kind: "unconfigured" 且 availableOps 按字母序', () => {
    const result = resolveCommand(TOOL, 'login');
    expect(result.kind).toBe('unconfigured');
    if (result.kind === 'unconfigured') {
      // 按字母序：docs, install, uninstall, update, weird
      expect(result.availableOps).toEqual([
        'deploy',
        'docs',
        'install',
        'uninstall',
        'update',
        'weird',
      ]);
    }
  });

  it('availableOps 不包含值为 undefined 的键', () => {
    const tool: ToolEntry = {
      id: 'x',
      name: 'X',
      commands: {
        install: ['echo a'],
        update: undefined,
        uninstall: ['echo c'],
      },
      source: 'user',
    };
    const result = resolveCommand(tool, 'login');
    expect(result.kind).toBe('unconfigured');
    if (result.kind === 'unconfigured') {
      expect(result.availableOps).toEqual(['install', 'uninstall']);
    }
  });

  it('空 commands 对象时 availableOps 为空', () => {
    const tool: ToolEntry = {
      id: 'x',
      name: 'X',
      commands: {},
      source: 'user',
    };
    const result = resolveCommand(tool, 'install');
    expect(result.kind).toBe('unconfigured');
    if (result.kind === 'unconfigured') {
      expect(result.availableOps).toEqual([]);
    }
  });
});

describe('resolveCommand - 多次替换', () => {
  it('同一个变量出现多次时全部替换', () => {
    const tool: ToolEntry = {
      id: 'multi',
      name: 'Multi',
      commands: {
        repeat: ['{{name}} and {{name}} again, {{version}}/{{version}}'],
      },
      source: 'user',
    };
    const result = resolveCommand(tool, 'repeat', { version: 'v1' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.commands).toEqual(['Multi and Multi again, v1/v1']);
    }
  });
});
