import { execFile } from 'node:child_process';
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
  tmpDir = path.join(os.tmpdir(), `fastcli-config-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(
    path.join(tmpDir, 'config.json'),
    JSON.stringify(
      {
        version: '2',
        packageManager: 'volta',
        editor: '',
        confirmBeforeRun: false,
        firstRun: false,
        language: 'en',
      },
      null,
      2,
    ),
    'utf8',
  );
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('fastcli config', () => {
  it('stdout 保持纯 JSON，stderr 输出配置路径', async () => {
    const { stdout, stderr } = await execFileP('node', [DIST, 'config'], {
      env: { ...process.env, FASTCLI_HOME: tmpDir },
    });

    expect(JSON.parse(stdout)).toMatchObject({
      version: '2',
      packageManager: 'volta',
      language: 'en',
    });
    expect(stderr).toContain(`Config directory: ${tmpDir}`);
    expect(stderr).toContain(`config.json: ${path.join(tmpDir, 'config.json')}`);
    expect(stderr).toContain(`tools.json: ${path.join(tmpDir, 'tools.json')}`);
  });

  it('language=zh-CN 时 stderr 输出中文配置路径', async () => {
    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, 'config.json'), 'utf8'));
    raw.language = 'zh-CN';
    await fs.writeFile(path.join(tmpDir, 'config.json'), JSON.stringify(raw, null, 2), 'utf8');

    const { stdout, stderr } = await execFileP('node', [DIST, 'config'], {
      env: { ...process.env, FASTCLI_HOME: tmpDir },
    });

    expect(JSON.parse(stdout)).toMatchObject({ language: 'zh-CN' });
    expect(stderr).toContain(`配置目录：${tmpDir}`);
  });
});
