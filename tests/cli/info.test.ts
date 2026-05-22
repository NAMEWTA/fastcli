import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileP = promisify(execFile);

/**
 * `fastcli info` 的端到端测试。
 *
 * 覆盖：
 * - 工具存在 → 输出 id / name / 操作明细
 * - 工具不存在 → 退出码 1，给出 fuzzy 建议
 *
 * Validates: Requirements 3.5, 6.3
 */

const DIST = path.resolve(__dirname, '../../dist/index.js');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-cli-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const cfg = {
    version: '2',
    packageManager: 'volta',
    editor: '',
    confirmBeforeRun: false,
    firstRun: false,
    language: 'en',
  };
  await fs.writeFile(
    path.join(tmpDir, 'config.json'),
    JSON.stringify(cfg, null, 2),
    'utf8',
  );
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function runCli(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileP('node', [DIST, ...args], {
      env: { ...process.env, FASTCLI_HOME: tmpDir },
    });
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number | null };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      code: typeof e.code === 'number' ? e.code : 1,
    };
  }
}

describe('fastcli info - 工具存在', () => {
  it('claude → 输出 id / name / 操作明细', async () => {
    const r = await runCli(['info', 'claude']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('claude');
    expect(r.stdout).toContain('Claude Code');
    expect(r.stdout).toContain('install');
    expect(r.stdout).toContain('volta install @anthropic-ai/claude-code');
  });
});

describe('fastcli info - 工具不存在', () => {
  it('退出码 1，stderr 含 fuzzy 建议', async () => {
    const r = await runCli(['info', 'clade']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('not found');
    expect(r.stderr).toContain('claude');
  });

  it('完全不相似时仅有 not-found 提示', async () => {
    const r = await runCli(['info', 'xyzzy']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('not found');
  });
});
