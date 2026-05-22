import { describe, expect, it } from 'vitest';

import { toSlug, uniqueSlug } from '../../src/utils/slug.js';

/**
 * Slug 工具（`src/utils/slug.ts`）的测试。
 *
 * 覆盖 PBT Property 9 的三条断言：
 * - 产物只含 [a-z0-9-]
 * - 首字符为 [a-z0-9]（由「修剪首尾连字符」保证）
 * - uniqueSlug 在冲突时追加 -2、-3...
 *
 * Validates: Requirements 2.4
 * PBT: Property 9
 */

describe('toSlug - 基本归一化', () => {
  it('英文带空格 → 小写连字符分隔', () => {
    expect(toSlug('Claude Code')).toBe('claude-code');
  });

  it('混合大小写 + 下划线 + 数字', () => {
    expect(toSlug('Claude_Code v2')).toBe('claude-code-v2');
  });

  it('多余的连字符被合并', () => {
    expect(toSlug('foo---bar')).toBe('foo-bar');
  });

  it('修剪首尾连字符', () => {
    expect(toSlug('---hello---')).toBe('hello');
    expect(toSlug('  ---hello---  ')).toBe('hello');
  });
});

describe('toSlug - 极端输入回退到 "tool"', () => {
  it('空字符串', () => {
    expect(toSlug('')).toBe('tool');
  });

  it('纯中文', () => {
    expect(toSlug('中文工具')).toBe('tool');
  });

  it('纯标点', () => {
    expect(toSlug('!!!@@@###')).toBe('tool');
  });

  it('纯连字符', () => {
    expect(toSlug('-----')).toBe('tool');
  });
});

describe('toSlug - 产物字符集与首字符（Property 9）', () => {
  const cases = [
    'Claude Code',
    'Claude_Code v2',
    'foo bar baz',
    '123abc',
    'abc 123',
    '   spaces   ',
  ];

  for (const input of cases) {
    it(`"${input}" 产物只含 [a-z0-9-] 且首字符为 [a-z0-9]`, () => {
      const result = toSlug(input);
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).toMatch(/^[a-z0-9]/);
    });
  }
});

describe('toSlug - 稳定性', () => {
  it('同输入多次调用结果稳定', () => {
    const a = toSlug('Claude Code');
    const b = toSlug('Claude Code');
    const c = toSlug('Claude Code');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('uniqueSlug - 不冲突时返回原值', () => {
  it('base 不在 existing 中时直接返回', () => {
    expect(uniqueSlug('claude', new Set())).toBe('claude');
    expect(uniqueSlug('claude', new Set(['codex']))).toBe('claude');
  });
});

describe('uniqueSlug - 冲突时追加 -2、-3...', () => {
  it('一次冲突 → -2', () => {
    expect(uniqueSlug('claude', new Set(['claude']))).toBe('claude-2');
  });

  it('两次冲突 → -3', () => {
    expect(uniqueSlug('claude', new Set(['claude', 'claude-2']))).toBe(
      'claude-3',
    );
  });

  it('多次冲突', () => {
    expect(
      uniqueSlug(
        'claude',
        new Set(['claude', 'claude-2', 'claude-3', 'claude-4']),
      ),
    ).toBe('claude-5');
  });
});

describe('uniqueSlug - 入参类型', () => {
  it('接受 Array<string>', () => {
    expect(uniqueSlug('claude', ['claude'])).toBe('claude-2');
  });

  it('接受 Iterable<string>', () => {
    function* iter(): Iterable<string> {
      yield 'claude';
    }
    expect(uniqueSlug('claude', iter())).toBe('claude-2');
  });
});
