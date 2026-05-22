import { describe, expect, it } from 'vitest';

import { suggestOp, suggestToolId } from '../../src/utils/fuzzy.js';

/**
 * Fuzzy 建议工具（`src/utils/fuzzy.ts`）的测试。
 *
 * 覆盖：
 * - 相似输入返回最佳匹配
 * - 完全相等的输入不建议（Property 10）
 * - 完全不相似（超阈值）不建议
 * - 边界：空输入 / 空候选
 *
 * Validates: Requirements 6.3
 * PBT: Property 10
 */

const TOOL_IDS = ['claude', 'codex', 'gemini', 'copilot', 'opencode'];
const OPS = ['install', 'update', 'uninstall', 'docs'];

describe('suggestToolId - 相似输入', () => {
  it('"clade" 应建议 "claude"', () => {
    expect(suggestToolId('clade', TOOL_IDS)).toBe('claude');
  });

  it('"cdex" 应建议 "codex"', () => {
    expect(suggestToolId('cdex', TOOL_IDS)).toBe('codex');
  });

  it('"copilt" 应建议 "copilot"', () => {
    expect(suggestToolId('copilt', TOOL_IDS)).toBe('copilot');
  });
});

describe('suggestToolId - 完全相等输入不建议', () => {
  it('输入与候选某项完全相等时返回 undefined', () => {
    expect(suggestToolId('claude', TOOL_IDS)).toBeUndefined();
    expect(suggestToolId('codex', TOOL_IDS)).toBeUndefined();
  });
});

describe('suggestToolId - 完全不相似不建议', () => {
  it('与所有候选都不相似时返回 undefined', () => {
    expect(suggestToolId('xyz', TOOL_IDS)).toBeUndefined();
    expect(suggestToolId('hello-world', TOOL_IDS)).toBeUndefined();
  });
});

describe('suggestToolId - 边界', () => {
  it('空输入返回 undefined', () => {
    expect(suggestToolId('', TOOL_IDS)).toBeUndefined();
  });

  it('空候选返回 undefined', () => {
    expect(suggestToolId('claude', [])).toBeUndefined();
  });
});

describe('suggestOp - 相似输入', () => {
  it('"instal" 应建议 "install"', () => {
    expect(suggestOp('instal', OPS)).toBe('install');
  });

  it('"updat" 应建议 "update"', () => {
    expect(suggestOp('updat', OPS)).toBe('update');
  });
});

describe('suggestOp - 完全相等输入不建议', () => {
  it('"install" 完全等于候选时返回 undefined', () => {
    expect(suggestOp('install', OPS)).toBeUndefined();
  });
});

describe('suggestOp - 不相似不建议', () => {
  it('"foobar" 与任何 op 都不相似', () => {
    expect(suggestOp('foobar', OPS)).toBeUndefined();
  });
});
