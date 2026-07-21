import { describe, expect, it } from 'vitest';

import { BUILTIN_TOOLS } from '../../src/builtin/tools.js';
import { buildBuiltinCommands } from '../../src/core/builtin-templates.js';

/**
 * 内置工具元数据 + 命令模板生成器的字面量比对测试。
 *
 * 覆盖：
 * - `BUILTIN_TOOLS` 长度与 id/npmPackage 严格匹配 PRD §3.1.1
 * - `buildBuiltinCommands('volta', pkg)` 输出合并后的 install/uninstall 模板
 * - `buildBuiltinCommands('npm', pkg)` 输出合并后的 install/uninstall 模板
 * - 指定内置工具额外生成 danger 全权限启动命令
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 * PBT: Property 1（命令模板）、Property 2（内置工具数量与 id 集稳定）
 */

/** PRD §3.1.1 钉死的 id → npmPackage 表，独立于实现以避免互相验证。 */
const EXPECTED_NPM_BUILTINS: ReadonlyArray<{ id: string; npmPackage: string }> = [
  { id: 'claude', npmPackage: '@anthropic-ai/claude-code' },
  { id: 'codex', npmPackage: '@openai/codex' },
  { id: 'gemini', npmPackage: '@google/gemini-cli' },
  { id: 'copilot', npmPackage: '@github/copilot' },
  { id: 'opencode', npmPackage: 'opencode-ai' },
  { id: 'pi-coding-agent', npmPackage: '@earendil-works/pi-coding-agent' },
  { id: 'codebuddy', npmPackage: '@tencent-ai/codebuddy-code' },
  { id: 'speculo', npmPackage: '@namewta/speculo' },
];

/** curl-based 内置工具：commands 硬编码在 BuiltinSpec 中，不通过 buildBuiltinCommands 生成。 */
const EXPECTED_CURL_BUILTINS: ReadonlyArray<{ id: string }> = [
  { id: 'grok' },
  { id: 'cursor' },
];

const EXPECTED_DANGER: Readonly<Partial<Record<string, string>>> = {
  claude: 'claude --dangerously-skip-permissions',
  codex: 'codex --dangerously-bypass-approvals-and-sandbox',
  copilot: 'copilot --autopilot --yolo',
  gemini: 'gemini --yolo',
  opencode: 'opencode run --dangerously-skip-permissions',
};

describe('BUILTIN_TOOLS 元数据', () => {
  it('内置工具数量与期望清单一致', () => {
    expect(BUILTIN_TOOLS).toHaveLength(
      EXPECTED_NPM_BUILTINS.length + EXPECTED_CURL_BUILTINS.length,
    );
  });

  it('内置工具的 id 集合等于期望清单', () => {
    const actualIds = new Set(BUILTIN_TOOLS.map((t) => t.id));
    const expectedIds = new Set([
      ...EXPECTED_NPM_BUILTINS.map((t) => t.id),
      ...EXPECTED_CURL_BUILTINS.map((t) => t.id),
    ]);
    expect(actualIds).toEqual(expectedIds);
  });

  it('每个 npm 内置工具的 npmPackage 与期望清单一致', () => {
    const actual = new Map(BUILTIN_TOOLS.map((t) => [t.id, t.npmPackage]));
    for (const { id, npmPackage } of EXPECTED_NPM_BUILTINS) {
      expect(actual.get(id)).toBe(npmPackage);
    }
  });

  it('grok / cursor 不依赖 npmPackage，有直接 commands', () => {
    for (const { id } of EXPECTED_CURL_BUILTINS) {
      const tool = BUILTIN_TOOLS.find((t) => t.id === id);
      expect(tool?.commands).toBeDefined();
      expect(tool?.npmPackage).toBeUndefined();
      expect(tool?.category).toBe('coding');
    }
  });

  it('所有内置工具都有 category', () => {
    for (const tool of BUILTIN_TOOLS) {
      expect(tool.category).toMatch(/^(coding|tool)$/);
    }
  });

  it('coding 分类包含 9 个工具，tool 分类包含 speculo', () => {
    const coding = BUILTIN_TOOLS.filter((t) => t.category === 'coding');
    const tool = BUILTIN_TOOLS.filter((t) => t.category === 'tool');
    expect(coding).toHaveLength(9);
    expect(tool.map((t) => t.id)).toEqual(['speculo']);
  });
});

describe('buildBuiltinCommands - volta 模板', () => {
  for (const { id, npmPackage } of EXPECTED_NPM_BUILTINS) {
    it(`为 ${id}（${npmPackage}）生成 volta 命令字符串`, () => {
      const commands = buildBuiltinCommands('volta', npmPackage);

      expect(commands).toEqual({
        install: [`volta install ${npmPackage}@latest`],
        uninstall: [`volta uninstall ${npmPackage}`],
        ...(EXPECTED_DANGER[id] === undefined
          ? {}
          : { danger: [EXPECTED_DANGER[id]] }),
      });
      expect(commands.update).toBeUndefined();
    });
  }
});

describe('buildBuiltinCommands - npm 模板', () => {
  for (const { id, npmPackage } of EXPECTED_NPM_BUILTINS) {
    it(`为 ${id}（${npmPackage}）生成 npm 命令字符串`, () => {
      const commands = buildBuiltinCommands('npm', npmPackage);

      expect(commands).toEqual({
        install: [`npm install -g ${npmPackage}`],
        uninstall: [`npm uninstall -g ${npmPackage}`],
        ...(EXPECTED_DANGER[id] === undefined
          ? {}
          : { danger: [EXPECTED_DANGER[id]] }),
      });
      expect(commands.update).toBeUndefined();
    });
  }
});
