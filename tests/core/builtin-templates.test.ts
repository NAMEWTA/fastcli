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
const EXPECTED_BUILTINS: ReadonlyArray<{ id: string; npmPackage: string }> = [
  { id: 'claude', npmPackage: '@anthropic-ai/claude-code' },
  { id: 'codex', npmPackage: '@openai/codex' },
  { id: 'gemini', npmPackage: '@google/gemini-cli' },
  { id: 'copilot', npmPackage: '@github/copilot' },
  { id: 'opencode', npmPackage: 'opencode' },
  { id: 'pi-coding-agent', npmPackage: '@earendil-works/pi-coding-agent' },
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
    expect(BUILTIN_TOOLS).toHaveLength(EXPECTED_BUILTINS.length);
  });

  it('内置工具的 id 集合等于期望清单', () => {
    const actualIds = new Set(BUILTIN_TOOLS.map((t) => t.id));
    const expectedIds = new Set(EXPECTED_BUILTINS.map((t) => t.id));
    expect(actualIds).toEqual(expectedIds);
  });

  it('每个内置工具的 npmPackage 与 PRD §3.1.1 表格一致', () => {
    const actual = new Map(BUILTIN_TOOLS.map((t) => [t.id, t.npmPackage]));
    for (const { id, npmPackage } of EXPECTED_BUILTINS) {
      expect(actual.get(id)).toBe(npmPackage);
    }
  });
});

describe('buildBuiltinCommands - volta 模板', () => {
  for (const { id, npmPackage } of EXPECTED_BUILTINS) {
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
  for (const { id, npmPackage } of EXPECTED_BUILTINS) {
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
