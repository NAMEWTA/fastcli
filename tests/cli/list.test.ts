import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileP = promisify(execFile);

/**
 * `fastcli list` 的端到端测试。
 *
 * 覆盖：
 * - 默认输出包含 10 个 builtin 工具
 * - --source=builtin 仅输出 builtin
 * - --source=user 仅输出 user
 * - --tag=anthropic 仅输出含该 tag 的工具
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */

const DIST = path.resolve(__dirname, '../../dist/index.js');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-cli-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  // 用户工具：1 个 aider
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
  const tools = {
    version: '2',
    tools: [
      {
        id: 'aider',
        name: 'Aider',
        description: 'Aider CLI',
        tags: ['python'],
        commands: { install: ['pip install aider-chat'] },
        source: 'user',
      },
    ],
  };
  await fs.writeFile(
    path.join(tmpDir, 'tools.json'),
    JSON.stringify(tools, null, 2),
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

describe('fastcli list - 默认输出', () => {
  it('包含全部 10 个 builtin 与 1 个 user', async () => {
    const r = await runCli(['list']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Builtin tools');
    expect(r.stdout).toContain('claude');
    expect(r.stdout).toContain('codebuddy');
    expect(r.stdout).toContain('codex');
    expect(r.stdout).toContain('gemini');
    expect(r.stdout).toContain('copilot');
    expect(r.stdout).toContain('opencode');
    expect(r.stdout).toContain('pi-coding-agent');
    expect(r.stdout).toContain('grok');
    expect(r.stdout).toContain('cursor');
    expect(r.stdout).toContain('speculo');
    expect(r.stdout).toContain('Custom tools');
    expect(r.stdout).toContain('aider');
  });

  it('language=zh-CN 时输出中文分组', async () => {
    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, 'config.json'), 'utf8'));
    raw.language = 'zh-CN';
    await fs.writeFile(path.join(tmpDir, 'config.json'), JSON.stringify(raw, null, 2), 'utf8');

    const r = await runCli(['list']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('内置工具');
    expect(r.stdout).toContain('自定义工具');
  });
});

describe('fastcli list --source', () => {
  it('--source=builtin 不含 user 工具', async () => {
    const r = await runCli(['list', '--source=builtin']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('claude');
    expect(r.stdout).not.toContain('aider');
  });

  it('--source=user 不含 builtin 工具', async () => {
    const r = await runCli(['list', '--source=user']);
    expect(r.code).toBe(0);
    expect(r.stdout).not.toContain('claude');
    expect(r.stdout).toContain('aider');
  });
});

describe('fastcli list --tag', () => {
  it('--tag=anthropic 仅含 claude', async () => {
    const r = await runCli(['list', '--tag=anthropic']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('claude');
    expect(r.stdout).not.toContain('codex');
  });

  it('--tag=python 仅含 aider', async () => {
    const r = await runCli(['list', '--tag=python']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('aider');
    expect(r.stdout).not.toContain('claude');
  });
});

describe('fastcli list --category', () => {
  it('--category=coding 仅含 coding 分类工具，不含 speculo 和 user', async () => {
    const r = await runCli(['list', '--category=coding']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('claude');
    expect(r.stdout).toContain('grok');
    expect(r.stdout).toContain('cursor');
    expect(r.stdout).not.toContain('speculo');
    expect(r.stdout).not.toContain('aider');
  });

  it('--category=tool 仅含 speculo', async () => {
    const r = await runCli(['list', '--category=tool']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('speculo');
    expect(r.stdout).not.toContain('claude');
    expect(r.stdout).not.toContain('aider');
  });
});
