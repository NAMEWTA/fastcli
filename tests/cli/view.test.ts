import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileP = promisify(execFile);
const DIST = path.resolve(__dirname, '../../dist/index.js');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-view-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
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

describe('fastcli view', () => {
  it('view 启动本地可视化编辑器并可通过 SIGINT 关闭', async () => {
    const result = await new Promise<{ output: string; code: number | null }>((resolve, reject) => {
      const child = spawn('node', [DIST, 'view', '--no-open'], {
        env: { ...process.env, FASTCLI_HOME: tmpDir },
      });
      let output = '';
      let shutdownRequested = false;
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`view did not start in time. Output:\n${output}`));
      }, 5000);

      const onData = (chunk: Buffer): void => {
        output += chunk.toString('utf8');
        if (!shutdownRequested && output.includes('Visual editor started')) {
          shutdownRequested = true;
          setTimeout(() => child.kill('SIGINT'), 50);
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ output, code });
      });
    });

    expect(result.code).toBe(0);
    expect(result.output).toContain('Visual editor started');
  });

  it('web 不再是有效子命令', async () => {
    const r = await runCli(['web', '--help']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Unknown command `web`');
  });
});
