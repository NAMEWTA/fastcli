import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileP = promisify(execFile);

/**
 * `fastcli run` 的端到端测试：通过 `node dist/index.js` 启动子进程,
 * 用 `FASTCLI_HOME` 隔离配置目录。
 *
 * 覆盖：
 * - 找不到 tool → 退出码 1，stderr 含「找不到工具」+ fuzzy 建议
 * - op 未配置 → 退出码 1，stderr 含「未配置」+ 已配置操作列表
 * - 正常路径 + --dry-run → 退出码 0，stdout 含完整命令
 *
 * Validates: Requirements 3.1
 */

const DIST = path.resolve(__dirname, '../../dist/index.js');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-cli-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  // 写入一个最小可用的 config.json（关掉 confirmBeforeRun 便于自动化）
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
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number | null;
    };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      code: typeof e.code === 'number' ? e.code : 1,
    };
  }
}

describe('fastcli run - 找不到工具', () => {
  it('退出码 1，stderr 含英文 not-found 与 fuzzy 建议', async () => {
    const r = await runCli(['run', 'clade', 'install', '--dry-run']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('not found');
    expect(r.stderr).toContain('claude'); // fuzzy 建议
  });

  it('language=zh-CN 时 stderr 含中文 not-found', async () => {
    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, 'config.json'), 'utf8'));
    raw.language = 'zh-CN';
    await fs.writeFile(path.join(tmpDir, 'config.json'), JSON.stringify(raw, null, 2), 'utf8');

    const r = await runCli(['run', 'clade', 'install', '--dry-run']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('找不到工具');
  });
});

describe('fastcli run - op 未配置', () => {
  it('退出码 1，stderr 含英文 unconfigured 提示', async () => {
    const r = await runCli(['run', 'claude', 'login', '--dry-run']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('has no');
    // 列出已有操作
    expect(r.stderr).toContain('install');
  });
});

describe('fastcli run - dry-run 正常路径', () => {
  it('退出码 0，stdout 含完整命令', async () => {
    const r = await runCli(['run', 'claude', 'install', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('volta install @anthropic-ai/claude-code');
  });
});
